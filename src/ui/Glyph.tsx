export type GlyphName =
	| 'search'
	| 'go'
	| 'later'
	| 'note'
	| 'restore'
	| 'command'
	| 'switch'
	| 'check'
	| 'close'
	| 'pin'
	| 'join'

const PATHS: Record<GlyphName, string> = {
	search: 'M7 12.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11ZM11 11l3.5 3.5',
	go: 'M3 8h9.5M9 4.5 12.5 8 9 11.5',
	later: 'M8 2.5v5.5l3 2M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z',
	note: 'M3.5 4h9M3.5 8h9M3.5 12h5.5',
	restore: 'M3 3.5v3.5h3.5M3.4 7A5.5 5.5 0 1 1 4.6 11.4',
	command: 'M5 4.5 9 8l-4 3.5M9.5 12.5H13',
	switch: 'M3 5.5h9.5M10 3l2.5 2.5L10 8M13 10.5H3.5M6 8l-2.5 2.5L6 13',
	check: 'M3.5 8.5 6.5 11.5 12.5 4.5',
	close: 'M4 4l8 8M12 4l-8 8',
	pin: 'M8 9.5V14M5 9.5h6M6 2.5h4l-.5 4 2 3h-7l2-3Z',
	join: 'M2.5 5.5h7v5h-7ZM9.5 7.5l4-2v5l-4-2',
}

export function Glyph({ name, size = 16 }: { name: GlyphName; size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			focusable="false"
		>
			<path d={PATHS[name]} />
		</svg>
	)
}
