import { useEffect, useState } from 'react'
import { FiShoppingBag } from 'react-icons/fi'
import Analytics from '@/analytics'
import { callEvent } from '@/common/utils/call-event'
import { ItemSelector } from '@/components/item-selector'
import { SectionPanel } from '@/components/section-panel'
import { useAppearanceSetting } from '@/context/appearance.context'
import type { UserInventoryItem } from '@/services/hooks/market/market.interface'

interface FontItem {
	label: string
	value: string
	description?: string
}

const defaultFonts: FontItem[] = [
	{
		value: 'Inter',
		label: 'Inter',
		description: 'Clean and readable display font.',
	},
	{
		value: 'Arial',
		label: 'System',
		description: 'Clean and readable display font.',
	},
	{
		value: 'Helvetica',
		label: 'Rounded',
		description: 'Clean and readable display font.',
	},
	{
		value: 'Georgia',
		label: 'Serif',
		description: 'Clean and readable display font.',
	},
]

interface FontSelectorProps {
	fetched_fonts: UserInventoryItem[]
}

export function FontSelector({ fetched_fonts }: FontSelectorProps) {
	const { fontFamily, setFontFamily } = useAppearanceSetting()

	const [fonts, setFonts] = useState<FontItem[]>(defaultFonts)

	useEffect(() => {
		if (fetched_fonts.length) {
			const mapped: FontItem[] = fetched_fonts.map((item) => ({
				value: item.value,
				label: item.name ?? 'Untitled',
				description: item?.description || 'Purchased font',
			}))
			setFonts([...defaultFonts, ...mapped])
		}
	}, [fetched_fonts])

	const handleMoreClick = () => {
		Analytics.event('font_market_opened')
		callEvent('openMarketModal')
	}

	const renderFontPreview = ({ value }: FontItem) => (
		<span className="text-lg truncate" style={{ fontFamily: value }}>
			A calm display style
		</span>
	)
	return (
		<SectionPanel title="Extension font" delay={0.15} size="sm">
			<div className="space-y-3">
				<p className={'text-xs text-muted'}>
					Choose the font used throughout the extension:
				</p>
				<div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
					{fonts.map((font) => (
						<ItemSelector
							isActive={fontFamily === font.value}
							onClick={() => setFontFamily(font.value)}
							key={font.value}
							className="w-full !h-20 !max-h-20 !min-h-20"
							label={font.label}
							description={renderFontPreview(font)}
							style={{ fontFamily: font.value }}
						/>
					))}
					<div
						className="flex items-center justify-center w-full h-20 text-xs border border-content border-muted gap-0.5 text-muted hover:!text-primary cursor-pointer hover:!border-primary transition-all duration-200 rounded-xl"
						onClick={() => handleMoreClick()}
					>
						<FiShoppingBag size={18} />
						<span>Store</span>
					</div>
				</div>
			</div>
		</SectionPanel>
	)
}
