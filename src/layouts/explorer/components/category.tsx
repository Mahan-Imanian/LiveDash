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
export function ExplorerCategory({
	category,
	categoryRefs,
	activeCategory,
}: Prop) {
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
			className={`${childLength && 'hidden'} relative overflow-hidden border scroll-mt-4 bg-content bg-glass border-base-300/70 rounded-3xl transition-all duration-300 min-h-[255px]
			${category.id === activeCategory ? 'outline-2 outline-offset-2 outline-primary/70 shadow-xl shadow-primary/10' : 'shadow-sm'}
			${category.banner ? 'before:absolute before:inset-x-0 before:top-0 before:h-14 before:bg-cover before:bg-center before:bg-no-repeat before:brightness-75 before:contrast-110 before:pointer-events-none' : ''}
			`}
		>
			{category.banner && (
				<style>
					{`#${category.id}::before {
						content: "";
						background-image: var(--banner-url);
						mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
						-webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
					}`}
				</style>
			)}
			<div className="relative z-10 flex h-full flex-col p-4">
				{!category.hideName && (
					<div className="flex items-center justify-between gap-4 mb-4">
						<div className="flex items-center min-w-0 gap-2.5">
							{category.icon ? (
								<div className="flex items-center justify-center w-8 h-8 rounded-2xl bg-base-100/80 ring-1 ring-base-300/80 shadow-sm shrink-0">
									<img
										src={category.icon}
										className="object-contain w-5 h-5 opacity-90"
										alt=""
									/>
								</div>
							) : (
								<div className="w-1 h-5 rounded-full bg-primary" />
							)}
							<h3
								className={`text-xs font-black tracking-[0.16em] uppercase truncate ${category.banner ? 'text-base-content/90' : 'text-base-content/75'}`}
							>
								{category.category}
							</h3>
						</div>

						{category.badges?.length ? (
							<div className="flex flex-row gap-1 shrink-0">
								{category.badges?.map((badge, i) => (
									<CategoryBadge badge={badge} key={`badge-${i}`} />
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

interface HandleCatalogsProp {
	category: CategoryItem
}

function HandleCatalogs({ category }: HandleCatalogsProp) {
	return (
		<div className="grid flex-1 grid-cols-4 gap-x-3 gap-y-5 content-start">
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
interface BadgeProp {
	badge: ExplorerCategoryBadge
}
function CategoryBadge({ badge }: BadgeProp) {
	const render = (
		<div
			className="flex h-5 gap-1 px-1.5 py-0.5 items-center rounded-lg w-fit text-[10px] font-black"
			key={badge.label}
			style={{
				background: badge.bgColor,
				color: badge.textColor || '#fff',
			}}
		>
			{badge.label}
			{badge.iconSrc && <img src={badge.iconSrc} className="w-4 h-4" />}
		</div>
	)

	if (badge.url) {
		return (
			<a
				className="hover:scale-95"
				target="_blank"
				rel="noopener noreferrer"
				href={badge.url}
			>
				{render}
			</a>
		)
	}

	return render
}
