import { useGetContents } from '@/services/hooks/content/get-content.hook'
import { useRef, useState, useEffect } from 'react'
import Analytics from '@/analytics'
import type { CategoryItem } from './interfaces/category.interface'
import { ExplorerCategory } from './components/category'

function ExplorerSkeleton() {
	return (
		<div className="grid w-full grid-cols-1 gap-4 mx-auto md:grid-cols-2 xl:grid-cols-3">
			{[1, 2, 3, 4, 5, 6].map((i) => (
				<div
					key={i}
					className="flex flex-col gap-4 p-5 rounded-3xl bg-base-100/70 border border-base-300/50 shadow-sm"
				>
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 rounded-2xl skeleton opacity-40"></div>
						<div className="h-3 skeleton w-28 opacity-40"></div>
					</div>
					<div className="grid grid-cols-4 gap-4 mt-2">
						{Array.from({ length: 12 }).map((_, j) => (
							<div key={j} className="flex flex-col items-center gap-2">
								<div className="w-10 h-10 skeleton rounded-2xl opacity-30"></div>
								<div className="skeleton h-1.5 w-full opacity-20"></div>
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	)
}

export function ExplorerContent() {
	const { data: catalogData, isLoading } = useGetContents()
	const [activeCategory, setActiveCategory] = useState<string | null>(null)
	const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
	const scrollContainerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!catalogData?.contents || !scrollContainerRef.current) return

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) setActiveCategory(entry.target.id)
				})
			},
			{
				root: scrollContainerRef.current,
				rootMargin: '0px 0px -45% 0px',
				threshold: 0.1,
			}
		)

		const currentRefs = categoryRefs.current
		Object.values(currentRefs).forEach((div) => {
			if (div) observer.observe(div)
		})

		return () => observer.disconnect()
	}, [catalogData?.contents])

	const scrollToCategory = (id: string) => {
		setActiveCategory(id)
		categoryRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
		Analytics.event('explorer_click_category')
	}

	const contents = catalogData?.contents || []
	const categories = contents.filter((f) => !f.hideName && f.links.length)

	return (
		<div className="flex flex-row w-full h-screen overflow-hidden">
			<div className="flex flex-col w-full h-full gap-2 px-2 py-2 overflow-hidden">
				{isLoading ? (
					<div className="sticky top-0 z-50 flex items-center w-full mx-auto gap-2 p-1.5 overflow-x-auto bg-base-100/85 backdrop-blur-xl rounded-3xl border border-white/10 shadow-lg no-scrollbar flex-nowrap overflow-y-hidden">
						{[1, 2, 3, 4].map((i) => (
							<div key={i} className="w-28 skeleton h-10 shrink-0 rounded-2xl opacity-30"></div>
						))}
					</div>
				) : (
					<div className="sticky top-0 z-50">
						<div className="flex items-center w-full mx-auto gap-2 p-1.5 overflow-x-auto bg-base-100/85 backdrop-blur-xl rounded-3xl border border-white/10 shadow-lg no-scrollbar flex-nowrap overflow-y-hidden">
							{categories.map((cat: CategoryItem) => (
								<button
									key={cat.id}
									onClick={() => scrollToCategory(cat.id)}
									className={`flex items-center gap-2 px-4 py-2.5 cursor-pointer text-[10px] font-black whitespace-nowrap rounded-2xl transition-all shrink-0 ${
										activeCategory === cat.id
											? 'bg-primary text-white shadow-md scale-105'
											: 'bg-base-200/60 hover:bg-primary/10 hover:text-primary'
									}`}
								>
									{cat.icon && <img src={cat.icon} className="w-4 h-4 rounded" alt="" />}
									{cat.category}
								</button>
							))}
						</div>
					</div>
				)}
				<div ref={scrollContainerRef} className="flex-1 pb-10 pr-1 overflow-y-auto scrollbar-none scroll-smooth">
					{isLoading ? (
						<ExplorerSkeleton />
					) : (
						<div className="grid grid-cols-1 gap-4 pb-[50vh] md:grid-cols-2 xl:grid-cols-3 py-2">
							{contents.map((category: CategoryItem, index: number) => (
								<ExplorerCategory
									activeCategory={activeCategory || ''}
									category={category}
									categoryRefs={categoryRefs}
									contentLength={contents.length}
									index={index}
									key={category.category || index}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
