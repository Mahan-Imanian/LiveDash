interface ItemPriceProps {
	price: number
	currency?: string
	className?: string
}

export function ItemPrice({
	price,
	currency = 'LiveCoin',
	className = '',
}: ItemPriceProps) {
	return (
		<div className={`flex items-center gap-1 text-sm font-medium ${className}`}>
			<img
				src="/live-assets/livecoin.svg"
				alt="LiveCoin"
				className="w-4 h-4"
			/>
			<span className="text-content">
				{price === 0 ? 'Free' : price?.toLocaleString('en-US')}
			</span>
			{currency && price !== 0 && (
				<span className="text-[10px] text-muted">{currency}</span>
			)}
		</div>
	)
}
