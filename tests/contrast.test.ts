import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const AA = 4.5
const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8').replace(
	/\/\*[\s\S]*?\*\//g,
	'',
)

interface Rule {
	selector: string
	media: string | null
	decls: Record<string, string>
	order: number
}

function parse(text: string, media: string | null = null, out: Rule[] = []): Rule[] {
	let i = 0
	while (i < text.length) {
		const open = text.indexOf('{', i)
		if (open < 0) break
		const head = text.slice(i, open).trim()
		let depth = 1
		let j = open + 1
		while (depth > 0 && j < text.length) {
			if (text[j] === '{') depth++
			else if (text[j] === '}') depth--
			j++
		}
		const body = text.slice(open + 1, j - 1)
		if (head.startsWith('@media')) parse(body, head.slice(6).trim(), out)
		else {
			const decls: Record<string, string> = {}
			for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) decls[m[1]] = m[2].trim()
			out.push({ selector: head, media, decls, order: out.length })
		}
		i = j
	}
	return out
}

function splitTop(s: string): string[] {
	const parts: string[] = []
	let depth = 0
	let start = 0
	for (let i = 0; i < s.length; i++) {
		if (s[i] === '(') depth++
		else if (s[i] === ')') depth--
		else if (s[i] === ',' && depth === 0) {
			parts.push(s.slice(start, i).trim())
			start = i + 1
		}
	}
	parts.push(s.slice(start).trim())
	return parts
}

type Attrs = Record<string, string | undefined>

function matchAttr(a: string, attrs: Attrs): boolean {
	const m = /^\[([\w-]+)="([^"]*)"\]$/.exec(a.trim())
	if (!m) throw new Error(`Unsupported attribute selector ${a}`)
	return attrs[m[1]] === m[2]
}

function matchSelector(sel: string, attrs: Attrs): number | null {
	if (!sel.startsWith(':root')) throw new Error(`Unsupported selector ${sel}`)
	let rest = sel.slice(5)
	let specificity = 1
	while (rest) {
		const fn = /^:(not|is)\(/.exec(rest)
		if (fn) {
			let depth = 1
			let k = fn[0].length
			while (depth > 0) {
				if (rest[k] === '(') depth++
				else if (rest[k] === ')') depth--
				k++
			}
			const args = splitTop(rest.slice(fn[0].length, k - 1))
			const hit = args.some((a) => matchAttr(a, attrs))
			if (fn[1] === 'not' ? hit : !hit) return null
			specificity++
			rest = rest.slice(k)
			continue
		}
		const attr = /^\[[^\]]+\]/.exec(rest)
		if (!attr) throw new Error(`Unsupported selector ${sel}`)
		if (!matchAttr(attr[0], attrs)) return null
		specificity++
		rest = rest.slice(attr[0].length)
	}
	return specificity
}

const rules = parse(css)

function resolve(attrs: Attrs, systemDark: boolean): Record<string, string> {
	const hits: { spec: number; order: number; decls: Record<string, string> }[] = []
	for (const r of rules) {
		if (r.media && !(r.media.includes('prefers-color-scheme: dark') && systemDark)) continue
		const specs = splitTop(r.selector)
			.map((s) => matchSelector(s, attrs))
			.filter((s): s is number => s !== null)
		if (specs.length) hits.push({ spec: Math.max(...specs), order: r.order, decls: r.decls })
	}
	hits.sort((a, b) => a.spec - b.spec || a.order - b.order)
	return Object.assign({}, ...hits.map((h) => h.decls))
}

function luminance(hex: string): number {
	const m = /^#([0-9a-f]{6})$/i.exec(hex)
	if (!m) throw new Error(`Not a hex colour: ${hex}`)
	const [r, g, b] = [0, 2, 4].map((i) => {
		const c = Number.parseInt(m[1].slice(i, i + 2), 16) / 255
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
	})
	return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function ratio(a: string, b: string): number {
	const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
	return (x + 0.05) / (y + 0.05)
}

const THEMES = [undefined, 'light', 'dark']
const TONES = [undefined, 'stone', 'sage', 'mist', 'clay', 'night']
const ACCENTS = [undefined, 'cobalt', 'moss', 'iris', 'graphite']
const PAIRS: [string, string][] = [
	['--ink-1', '--bg'],
	['--ink-2', '--bg'],
	['--ink-3', '--bg'],
	['--accent', '--bg'],
	['--danger', '--bg'],
	['--ink-1', '--surface'],
	['--ink-2', '--surface'],
	['--ink-3', '--surface'],
	['--accent', '--surface'],
	['--danger', '--surface'],
	['--accent-ink', '--accent'],
]

const cases = THEMES.flatMap((theme) =>
	TONES.flatMap((tone) =>
		ACCENTS.flatMap((accent) =>
			[false, true].map((systemDark) => ({
				name: `system ${systemDark ? 'dark' : 'light'}, theme ${theme ?? 'auto'}, tone ${tone ?? 'sand'}, accent ${accent ?? 'ember'}`,
				tokens: resolve(
					{ 'data-theme': theme, 'data-tone': tone, 'data-accent': accent },
					systemDark,
				),
			})),
		),
	),
)

test('text tokens meet WCAG AA on every theme, tone and accent', (t) => {
	let lowest = { value: Number.POSITIVE_INFINITY, where: '' }
	const failures: string[] = []
	for (const c of cases) {
		for (const [fg, bg] of PAIRS) {
			const r = ratio(c.tokens[fg], c.tokens[bg])
			if (r < lowest.value) lowest = { value: r, where: `${fg} on ${bg}, ${c.name}` }
			if (r < AA) failures.push(`${fg} on ${bg} = ${r.toFixed(2)} (${c.name})`)
		}
	}
	t.diagnostic(
		`${cases.length} combinations, lowest ${lowest.value.toFixed(2)}:1 (${lowest.where})`,
	)
	assert.deepEqual(failures, [])
})

test('the chosen accent applies on every tone', () => {
	for (const systemDark of [false, true])
		for (const theme of THEMES)
			for (const tone of TONES) {
				const accents = ACCENTS.map(
					(accent) =>
						resolve({ 'data-theme': theme, 'data-tone': tone, 'data-accent': accent }, systemDark)[
							'--accent'
						],
				)
				assert.equal(
					new Set(accents).size,
					ACCENTS.length,
					`theme ${theme ?? 'auto'}, tone ${tone ?? 'sand'}, system ${systemDark ? 'dark' : 'light'}: ${accents.join(' ')}`,
				)
			}
})

test('the forced dark theme matches the system dark theme', () => {
	for (const tone of TONES)
		for (const accent of ACCENTS) {
			const forced = resolve(
				{ 'data-theme': 'dark', 'data-tone': tone, 'data-accent': accent },
				false,
			)
			const system = resolve({ 'data-tone': tone, 'data-accent': accent }, true)
			assert.deepEqual(forced, system, `tone ${tone ?? 'sand'}, accent ${accent ?? 'ember'}`)
		}
})
