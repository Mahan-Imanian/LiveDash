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
	| 'bookmark'
	| 'folder'
	| 'device'
	| 'plus'
	| 'more'
	| 'edit'
	| 'trash'
	| 'focus'
	| 'gear'
	| 'brush'
	| 'chevron'
	| 'back'
	| 'tabs'
	| 'sun'
	| 'moon'
	| 'partly'
	| 'cloud'
	| 'fog'
	| 'rain'
	| 'snow'
	| 'storm'
	| 'repeat'
	| 'drag'
	| 'keyboard'
	| 'link'

const PATHS: Record<GlyphName, string> = {
	search: 'M7 12.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11ZM11 11l3.5 3.5',
	go: 'M3 8h9.5M9 4.5 12.5 8 9 11.5',
	later: 'M8 4.5V8l2.5 1.5M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z',
	note: 'M4 2.5h6l2.5 2.5v8.5h-8.5ZM6 7h4.5M6 9.5h4.5M6 12h2.5',
	restore: 'M3 3.5v3.5h3.5M3.4 7A5.5 5.5 0 1 1 4.6 11.4',
	command: 'M5 4.5 9 8l-4 3.5M9.5 12.5H13',
	switch: 'M3 5.5h9.5M10 3l2.5 2.5L10 8M13 10.5H3.5M6 8l-2.5 2.5L6 13',
	check: 'M3.5 8.5 6.5 11.5 12.5 4.5',
	close: 'M4 4l8 8M12 4l-8 8',
	pin: 'M8 9.5V14M5 9.5h6M6 2.5h4l-.5 4 2 3h-7l2-3Z',
	join: 'M2.5 5h7.5v6H2.5ZM10 7.5 13.5 5.5v5L10 8.5',
	bookmark: 'M4.5 2.5h7v11L8 10.5l-3.5 3Z',
	folder: 'M2 4.5h4.5L8 6h6v7H2Z',
	device: 'M4 2.5h8v11H4ZM7 11.5h2',
	plus: 'M8 3v10M3 8h10',
	more: 'M3.5 8h.01M8 8h.01M12.5 8h.01',
	edit: 'M3 13l.6-2.6 7.2-7.2 2 2-7.2 7.2ZM9.6 4.4l2 2',
	trash: 'M3.5 4.5h9M6.5 4.5V3h3v1.5M4.5 4.5l.7 9h5.6l.7-9',
	focus: 'M8 2v2M8 12v2M2 8h2M12 8h2M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
	gear: 'M8 10.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4ZM8 1.8v1.6M8 12.6v1.6M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M1.8 8h1.6M12.6 8h1.6M3.6 12.4l1.1-1.1M11.3 4.7l1.1-1.1',
	brush: 'M9.5 3.5 12.5 6.5 7 12H4v-3ZM8.5 4.5l3 3',
	chevron: 'M6 3.5 10.5 8 6 12.5',
	back: 'M10 3.5 5.5 8 10 12.5',
	tabs: 'M2 5h12v8.5H2ZM2 5V3h5l1 2',
	sun: 'M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1',
	moon: 'M12.5 9.5A5 5 0 0 1 6.5 3.5a5 5 0 1 0 6 6Z',
	partly:
		'M5.5 5.5a2.5 2.5 0 0 1 4.6-1.3M5 13h6.5a2.5 2.5 0 0 0 0-5 3.5 3.5 0 0 0-6.6 1A2 2 0 0 0 5 13Z',
	cloud: 'M4.5 12.5h7a2.5 2.5 0 0 0 0-5 3.5 3.5 0 0 0-6.7 1A2 2 0 0 0 4.5 12.5Z',
	fog: 'M2.5 6h11M3.5 8.5h9M2.5 11h11',
	rain: 'M4.5 9.5h7a2.5 2.5 0 0 0 0-5 3.5 3.5 0 0 0-6.7 1A2 2 0 0 0 4.5 9.5ZM5.5 11.5l-.7 2M8.5 11.5l-.7 2M11.5 11.5l-.7 2',
	snow: 'M4.5 9.5h7a2.5 2.5 0 0 0 0-5 3.5 3.5 0 0 0-6.7 1A2 2 0 0 0 4.5 9.5ZM5.5 12h.01M8 13h.01M10.5 12h.01',
	storm: 'M4.5 9h7a2.5 2.5 0 0 0 0-5 3.5 3.5 0 0 0-6.7 1A2 2 0 0 0 4.5 9ZM8.5 9.5 7 12h2l-1.5 2.5',
	repeat: 'M3 7V5.5h9l-2-2M13 9v1.5H4l2 2',
	drag: 'M6 4h.01M10 4h.01M6 8h.01M10 8h.01M6 12h.01M10 12h.01',
	keyboard: 'M1.5 4.5h13v7h-13ZM4 7h.01M6.5 7h.01M9 7h.01M11.5 7h.01M5 9.5h6',
	link: 'M7 9a2.5 2.5 0 0 0 3.5 0l2-2A2.5 2.5 0 0 0 9 3.5l-.8.8M9 7a2.5 2.5 0 0 0-3.5 0l-2 2A2.5 2.5 0 0 0 7 12.5l.8-.8',
}

export function Glyph({ name, size = 16 }: { name: GlyphName; size?: number }) {
	return (
		<svg
			className="glyph"
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
