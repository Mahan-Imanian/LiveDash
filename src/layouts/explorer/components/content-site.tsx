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

	return (
		<a
			href={getUrl(link.url)}
			target="_blank"
			rel="noopener noreferrer"
			className="relative flex min-w-0 flex-col items-center gap-2 rounded-2xl p-2 transition-all duration-300 group active:scale-95 hover:bg-base-100/75 hover:shadow-sm"
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
				src={link.icon || '/live-assets/site-icons/fallback.svg'}
				className="object-contain w-10 h-10 transition-all duration-300 drop-shadow-sm group-hover:scale-110"
				alt={link.name || link.url}
				loading="lazy"
				onError={(event) => {
					event.currentTarget.src = '/live-assets/site-icons/fallback.svg'
				}}
			/>

			<span className="w-full text-[10px] font-bold leading-tight tracking-tight text-center truncate opacity-85 transition-all duration-300 group-hover:opacity-100 group-hover:text-primary">
				{link.name}
			</span>
		</a>
	)
}
