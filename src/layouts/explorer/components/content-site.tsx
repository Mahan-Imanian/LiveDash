import { NewBadge } from '@/components/badges/new.badge'
import type { CatalogItem } from '../interfaces/catalog-item.interface'

interface SiteProp {
	link: CatalogItem
}
const ANIMATES = {
	bounce: 'bounce 1.5s infinite',
	pulse: 'pulse 2s infinite',
	spin: 'spin 2s linear infinite',
}

function getUrl(url: string) {
	return url.startsWith('http') ? url : `https://${url}`
}

export function RenderContentSite({ link }: SiteProp) {
	const animate = link.badgeAnimate || null
	const badge = link.badge?.trim()
	const col = link?.span?.col
	const row = link?.span?.row
	const pos = row && row >= 2 ? 'justify-center' : ''

	return (
		<a
			href={getUrl(link.url)}
			target="_blank"
			rel="noopener noreferrer"
			className={`relative flex flex-col items-center gap-2 transition-all duration-300 group active:scale-95 ${pos} rounded-2xl hover:bg-base-200/50 p-1.5 ${link.hasBorder ? 'border border-base-300' : ''}`}
			style={{
				gridColumn: col ? `span ${col} / span ${col}` : undefined,
				gridRow: row ? `span ${row} / span ${row}` : undefined,
			}}
		>
			{link.isNew && <NewBadge className="top-2 right-1" />}

			{badge && (
				<span
					className="absolute top-0 -left-1 rounded-r-lg text-center z-20 truncate px-1 rounded text-[10px] font-light max-w-20 border border-white/10 shadow-lg"
					style={{
						backgroundColor: link.badgeColor,
						color: '#fff',
						animation: animate ? ANIMATES[animate] : 'none',
					}}
				>
					{badge}
				</span>
			)}
			<img
				src={link.icon}
				className="object-contain transition-all duration-300 w-9 h-9 group-hover:scale-110 drop-shadow-sm"
				alt={link.name || link.url}
			/>

			<span className="w-full text-[10px] font-bold leading-tight text-center truncate opacity-85 transition-all duration-300 group-hover:opacity-100 group-hover:text-primary">
				{link.name}
			</span>
		</a>
	)
}
