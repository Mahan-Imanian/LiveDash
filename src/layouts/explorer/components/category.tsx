import type React from 'react'
import type { ExplorerCategoryBadge } from '@/services/hooks/content/get-content.hook'
import type { CategoryItem } from '../interfaces/category.interface'
import { RenderContentBanner } from './content-banner'
import { RenderContentIframe } from './content-iframe'
import { RenderContentSite } from './content-site'

interface Prop {
	category: CategoryItem
	categoryRefs: any
	index: number
	contentLength: number
	activeCategory: string
}

export function ExplorerCategory({ category, categoryRefs, activeCategory }: Prop) {
	const childLength = !category.links?.length
	return (
		<div
			key={category.id}
			id={category.id}
			ref={(el) => {
				categoryRefs.current[category.id] = el
			}}
			style={
				category.banner
					? ({ '--banner-url': `url(${category.banner})` } as React.CSSProperties)
					: undefined
			}
			className={`${childLength && 'invisible'} relative overflow-hidden border scroll-mt-4 bg-base-100/75 backdrop-blur-xl border-base-300/70 rounded-3xl shadow-sm transition-all duration-300 ${
				category.id === activeCategory
					? 'outline outline-1 outline-offset-2 outline-primary/80 scale-[1.01]'
					: ''
			} ${category.banner ? 'before:absolute before:inset-x-0 before:top-0 before:h-12 before:bg-cover before:bg-center before:bg-no-repeat before:brightness-75 before:contrast-110 before:pointer-events-none' : ''}`}
		>
			{category.banner && (
				<style>
					{`#${category.id}::before { content: ""; background-image: var(--banner-url); mask-image: linear-gradient(to bottom, black 0%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 100%); }`}
				</style>
			)}
			<div className="relative z-10 p-4">
				{!category.hideName && (
					<div className="flex items-center justify-between gap-4 mb-4">
						<div className="flex items-center gap-3 min-w-0">
							{category.icon ? (
								<img src={category.icon} className="object-contain w-7 h-7 rounded shrink-0 drop-shadow-sm" alt="" />
							) : (
								<div className="w-1 h-5 rounded-full bg-primary" />
							)}
							<h3 className="text-xs font-black tracking-[0.12em] uppercase truncate text-base-content/75">
								{category.category}
							</h3>
						</div>

						{category.badges?.length ? (
							<div className="flex flex-row gap-1 shrink-0">
								{category.badges?.map((f, i) => (
									<CategoryBadge badge={f} key={`badge-${i}`} />
								))}
							</div>
						) : (
							<div className="flex-1 h-px bg-linear-to-r from-base-content/5 to-transparent" />
						)}
					</div>
				)}

				<HandleCatalogs category={category} />
			</div>
		</div>
	)
}

function HandleCatalogs({ category }: { category: CategoryItem }) {
	return (
		<div className="grid grid-cols-4 gap-x-2 gap-y-5">
			{category.links?.map((link) =>
				link.type === 'REMOTE_IFRAME' ? (
					<RenderContentIframe key={link.url} link={link} />
				) : link.type === 'SITE' ? (
					<RenderContentSite key={link.url} link={link} />
				) : link.type === 'BANNER' ? (
					<RenderContentBanner key={link.url} link={link} />
				) : null
			)}
		</div>
	)
}

function CategoryBadge({ badge }: { badge: ExplorerCategoryBadge }) {
	const render = (
		<div
			className="flex h-5 gap-1 px-2 py-0.5 items-center rounded-full w-fit text-[9px] font-black"
			key={badge.label}
			style={{ background: badge.bgColor, color: badge.textColor || '#fff' }}
		>
			{badge.label}
			{badge.iconSrc && <img src={badge.iconSrc} className="w-4 h-4" />}
		</div>
	)

	if (badge.url) {
		return (
			<a className="hover:scale-95" target="_blank" rel="noopener noreferrer" href={badge.url}>
				{render}
			</a>
		)
	}

	return render
}
