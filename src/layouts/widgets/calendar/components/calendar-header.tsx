import type moment from 'moment'
import { useGeneralSetting } from '@/context/general-setting.context'
import type React from 'react'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6'
import { TfiBackRight } from 'react-icons/tfi'
import { type LiveDashDate, getCurrentDate } from '../utils'

interface CalendarHeaderProps {
	currentDate: LiveDashDate
	selectedDate: LiveDashDate
	setCurrentDate: (date: LiveDashDate) => void
	goToToday: () => void
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
	currentDate,
	selectedDate,
	setCurrentDate,
	goToToday,
}) => {
	const { selected_timezone: timezone } = useGeneralSetting()

	const isCurrentMonthToday = () => {
		const realToday = getCurrentDate(timezone.value)
		return (
			currentDate.month() === realToday.month() &&
			currentDate.year() === realToday.year()
		)
	}

	const isTodaySelected = () => {
		const realToday = getCurrentDate(timezone.value)
		return (
			selectedDate.date() === realToday.date() &&
			selectedDate.month() === realToday.month() &&
			selectedDate.year() === realToday.year()
		)
	}

	const showTodayButton = !isCurrentMonthToday() || !isTodaySelected()

	const changeMonth = (delta: number) => {
		// @ts-ignore
		setCurrentDate((prev: moment.Moment) => prev.clone().add(delta, 'month'))
	}

	return (
		<div className="flex items-center justify-between">
			<h3 className={'font-medium text-xs text-content'}>
				{currentDate.format('dddd, D MMMM YYYY')}
			</h3>{' '}
			<div className="flex gap-0.5">
				{showTodayButton && (
					<button
						onClick={goToToday}
						className={
							'h-7 w-7 flex items-center justify-center rounded-full cursor-pointer transition-colors text-muted opacity-70 text-muted hover:bg-base-300 duration-300 hover:opacity-100 animate-in fade-in-0 zoom-in-95'
						}
					>
						<TfiBackRight size={12} strokeWidth={1} />
					</button>
				)}

				<button
					onClick={() => changeMonth(-1)}
					className={
						'h-7 w-7 flex items-center justify-center rounded-full cursor-pointer transition-colors text-muted opacity-70 hover:bg-base-300 hover:opacity-100 duration-300'
					}
				>
					<FaChevronRight size={12} strokeWidth={1} />
				</button>

				<button
					onClick={() => changeMonth(1)}
					className={
						'h-7 w-7 flex items-center justify-center rounded-full cursor-pointer transition-colors text-muted opacity-70 hover:bg-base-300 hover:opacity-100 duration-300'
					}
				>
					<FaChevronLeft size={12} strokeWidth={1} />
				</button>
			</div>
		</div>
	)
}
