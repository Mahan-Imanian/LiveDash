import { defineConfig } from 'wxt'

const testBuild = process.env.LD_TEST === '1'

export default defineConfig({
	modules: ['@wxt-dev/module-react'],
	srcDir: 'src',
	entrypointsDir: '../entrypoints',
	publicDir: 'public',
	outDir: testBuild ? '.output-test' : '.output',
	vite: () => ({
		define: { __LD_TEST__: JSON.stringify(testBuild) },
		build: {
			sourcemap: false,
			target: 'chrome120',
		},
		plugins: [
			{
				// The faces are font-display: block, so text waits for them. Preloading
				// the bundled files lets them load alongside the CSS instead of after it.
				name: 'livedash-preload-fonts',
				transformIndexHtml: {
					order: 'post',
					handler(_html, ctx) {
						const fonts = Object.keys(ctx.bundle ?? {}).filter((f) => f.endsWith('.woff2'))
						return fonts.map((f) => ({
							tag: 'link',
							attrs: {
								rel: 'preload',
								as: 'font',
								type: 'font/woff2',
								href: `/${f}`,
								crossorigin: '',
							},
							injectTo: 'head-prepend' as const,
						}))
					},
				},
			},
		],
	}),
	manifest: {
		name: 'LiveDash',
		short_name: 'LiveDash',
		description:
			'A new tab that finds any page you have read by a sentence you remember. Kept on your device, never uploaded.',
		minimum_chrome_version: '120',
		permissions: ['storage', 'scripting', 'search'],
		optional_host_permissions: ['https://*/*'],
		...(testBuild ? { host_permissions: ['https://*/*'] } : {}),
		action: {
			default_title: 'LiveDash: this page',
		},
		commands: {
			_execute_action: {
				suggested_key: {
					default: 'Alt+Shift+L',
					mac: 'Alt+Shift+L',
				},
				description: 'Show what LiveDash does with this page',
			},
		},
		icons: {
			16: 'icon/16.png',
			32: 'icon/32.png',
			48: 'icon/48.png',
			128: 'icon/128.png',
		},
	},
})
