import { Button } from '@/components/button/button'
import { ClickableTooltip } from '@/components/clickableTooltip'
import { useRef, useState, useEffect } from 'react'
import { FiCheck } from 'react-icons/fi'
import { LuCalendarDays, LuChevronRight } from 'react-icons/lu'

const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
]

interface GregorianDatePickerProps {
	id?: string
	label?: string
	value: string
	onChange: (value: string) => void
	enable: boolean
}

export default function GregorianDatePicker({
	value,
	onChange,
	enable,
}: GregorianDatePickerProps) {
	const currentYear = new Date().getFullYear()
	const [isOpen, setIsOpen] = useState(false)
	const triggerRef = useRef<any>(null)

	const [tempDate, setTempDate] = useState({ year: currentYear - 25, month: 1, day: 1 })

	const parseValue = (val: string) => {
		if (!val) return { year: currentYear - 25, month: 1, day: 1 }

		const parts = val.includes('-') ? val.split('-') : val.split('/')
		return {
			year: parseInt(parts[0], 10) || currentYear - 25,
			month: parseInt(parts[1], 10) || 1,
			day: parseInt(parts[2], 10) || 1,
		}
	}

	useEffect(() => {
		if (isOpen) {
			const parsed = parseValue(value)
			setTempDate(parsed)
		}
	}, [isOpen, value])

	const getDaysInMonth = (m: number, y: number) => {
		return new Date(y, m, 0).getDate()
	}

	const handleYearChange = (y: number) => {
		const maxDay = getDaysInMonth(tempDate.month, y)
		const validDay = Math.min(tempDate.day, maxDay)
		setTempDate({ ...tempDate, year: y, day: validDay })
	}

	const handleMonthChange = (m: number) => {
		const maxDay = getDaysInMonth(m, tempDate.year)
		const validDay = Math.min(tempDate.day, maxDay)
		setTempDate({ ...tempDate, month: m, day: validDay })
	}

	const handleDayChange = (d: number) => {
		setTempDate({ ...tempDate, day: d })
	}

	const handleConfirm = () => {
		const formattedDate = `${tempDate.year}-${tempDate.month.toString().padStart(2, '0')}-${tempDate.day.toString().padStart(2, '0')}`
		onChange(formattedDate)
		setIsOpen(false)
	}

	const handleCancel = () => {
		setIsOpen(false)
	}

	const onClickToOpen = () => {
		if (!enable) return
		setIsOpen(true)
	}

	return (
		<>
			<button
				ref={enable ? triggerRef : null}
				type="button"
				onClick={() => onClickToOpen()}
				className="flex items-center justify-between w-full p-3 text-left transition-colors hover:bg-content"
			>
				<div
					className={`flex items-center justify-between w-full h-12 p-3 transition-colors border  border-content rounded-xl  ${!enable ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50! cursor-pointer'}`}
				>
					<div className="flex items-center gap-3">
						<LuCalendarDays size={14} className="text-primary" />
						<span className={value ? 'text-content' : 'text-muted'}>
							{value || 'Select date'}
						</span>
					</div>
					<LuChevronRight size={18} className="text-muted" />
				</div>
			</button>

			<ClickableTooltip
				triggerRef={triggerRef}
				isOpen={isOpen}
				setIsOpen={setIsOpen}
				content={
					<div className="min-w-52">
						<div className="flex gap-3 mb-5">
							<ScrollWheel
								label="Day"
								value={tempDate.day}
								max={getDaysInMonth(tempDate.month, tempDate.year)}
								onChange={handleDayChange}
								type="number"
							/>
							<ScrollWheel
								label="Month"
								value={tempDate.month}
								max={12}
								onChange={handleMonthChange}
								type="month"
							/>
							<ScrollWheel
								label="Year"
								value={tempDate.year}
								max={100}
								onChange={handleYearChange}
								type="year"
								startYear={currentYear}
							/>
						</div>

						<div className="flex gap-2">
							<Button
								onClick={handleConfirm}
								size="sm"
								className={`flex-1 rounded-2xl bg-primary hover:bg-primary/90 text-white`}
							>
								<FiCheck size={16} className="ml-1" />
								Confirm
							</Button>
							<Button
								onClick={handleCancel}
								size="sm"
								className="w-20 rounded-2xl border-muted hover:bg-muted/50 text-content"
							>
								Cancel
							</Button>
						</div>
					</div>
				}
				position="bottom"
				offset={8}
				contentClassName="p-4 border shadow-xl bg-glass bg-content border-base-300/20 rounded-2xl max-w-none"
				closeOnClickOutside={true}
			/>
		</>
	)
}

interface ScrollWheelProps {
	label: string
	value: number
	max: number
	onChange: (value: number) => void
	type: 'number' | 'month' | 'year'
	startYear?: number
}

function ScrollWheel({ value, max, onChange, type, startYear }: ScrollWheelProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const scrollTimeoutRef = useRef<NodeJS.Timeout>(null)
	const ITEM_HEIGHT = 40

	const items: Array<string | number> =
		type === 'number'
			? Array.from({ length: max }, (_, i) => i + 1)
			: type === 'month'
				? MONTHS
				: Array.from({ length: max }, (_, i) => (startYear || new Date().getFullYear()) - i)

	useEffect(() => {
		if (!containerRef.current) return

		let index = 0
		if (type === 'number') {
			index = value - 1
		} else if (type === 'month') {
			index = value - 1
		} else if (type === 'year') {
			index = items.indexOf(value)
		}

		containerRef.current.scrollTop = index * ITEM_HEIGHT
	}, [value, type, items])

	const handleScroll = () => {
		if (!containerRef.current) return

		if (scrollTimeoutRef.current) {
			clearTimeout(scrollTimeoutRef.current)
		}

		scrollTimeoutRef.current = setTimeout(() => {
			if (!containerRef.current) return

			const scrollTop = containerRef.current.scrollTop
			const index = Math.round(scrollTop / ITEM_HEIGHT)
			const clampedIndex = Math.max(0, Math.min(index, items.length - 1))

			let newValue: number
			if (type === 'number' || type === 'month') {
				newValue = clampedIndex + 1
			} else {
				newValue = items[clampedIndex] as number
			}

			onChange(newValue)

			containerRef.current.scrollTo({
				top: clampedIndex * ITEM_HEIGHT,
				behavior: 'smooth',
			})
		}, 150)
	}

	const handleItemClick = (index: number) => {
		let newValue: number
		if (type === 'number' || type === 'month') {
			newValue = index + 1
		} else {
			newValue = items[index] as number
		}
		onChange(newValue)
	}

	return (
		<div className="flex flex-col items-center flex-1">
			<div className="mb-2 text-xs font-medium text-content">
				{type === 'number' ? 'Day' : type === 'month' ? 'Month' : 'Year'}
			</div>
			<div
				ref={containerRef}
				onScroll={handleScroll}
				className="relative h-32 overflow-y-auto scrollbar-none rounded-xl bg-base-200/50"
				style={{ scrollSnapType: 'y mandatory' }}
			>
				<div className="h-12" />
				{items.map((item, index) => (
					<div
						key={`${type}-${item}`}
						onClick={() => handleItemClick(index)}
						className={`flex items-center justify-center h-10 px-3 text-sm cursor-pointer transition-all rounded-lg mx-1 ${
							(type === 'number' || type === 'month' ? index + 1 === value : item === value)
								? 'text-primary font-bold bg-primary/10'
								: 'text-muted hover:text-content hover:bg-base-300/50'
						}`}
						style={{ scrollSnapAlign: 'center' }}
					>
						{type === 'month' ? MONTHS[index] : item}
					</div>
				))}
				<div className="h-12" />
				<div className="absolute left-0 right-0 h-10 border-y border-primary/20 pointer-events-none top-1/2 -translate-y-1/2 bg-primary/5" />
			</div>
		</div>
	)
}
