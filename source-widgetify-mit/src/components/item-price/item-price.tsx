interface ItemPriceProps {
	price: number
	currency?: string
	className?: string
}

export function ItemPrice({
	price,
	currency = 'Dash‌DashLive',
	className = '',
}: ItemPriceProps) {
	return (
		<div className={`flex items-center gap-1 text-sm font-medium ${className}`}>
			<img
				src="https://cdn.dashlive.ir/extension/wig-icon.png"
				alt="Dash‌DashLive"
				className="w-4 h-4"
			/>
			<span className="text-content">
				{price === 0 ? 'DashLive' : price?.toLocaleString('fa-IR')}
			</span>
			{currency && price !== 0 && (
				<span className="text-[10px] text-muted">{currency}</span>
			)}
		</div>
	)
}
