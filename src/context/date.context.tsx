import type React from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import {
	convertGregorianToHijri,
	getCurrentDate,
	type LiveDashDate,
} from '@/layouts/widgets/calendar/utils'
import { useGeneralSetting } from './general-setting.context'

interface DateContextType {
	currentDate: LiveDashDate
	selectedDate: LiveDashDate
	today: LiveDashDate
	todayIsHoliday: boolean
	setCurrentDate: (date: LiveDashDate) => void
	setSelectedDate: (date: LiveDashDate) => void
	goToToday: () => void
	isToday: (date: LiveDashDate) => boolean
	getHijriDate: (date: LiveDashDate) => string
}

const DateContext = createContext<DateContextType | undefined>(undefined)

export const DateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const { selected_timezone: timezone } = useGeneralSetting()
	const activeDate = getCurrentDate(timezone.value)

	const [currentDate, setCurrentDate] = useState<LiveDashDate>(activeDate)
	const [selectedDate, setSelectedDate] = useState<LiveDashDate>(activeDate)
	const [today, setToday] = useState<LiveDashDate>(activeDate)

	// Update today date every minute to ensure it stays current
	useEffect(() => {
		const interval = setInterval(() => {
			setToday(getCurrentDate(timezone.value))
		}, 60000)

		return () => clearInterval(interval)
	}, [timezone])

	useEffect(() => {
		const newToday = getCurrentDate(timezone.value)
		setToday(newToday)
		setCurrentDate(newToday.clone())
		setSelectedDate(newToday.clone())
	}, [timezone])

	const goToToday = () => {
		const newToday = getCurrentDate(timezone.value)
		setCurrentDate(newToday.clone())
		setSelectedDate(newToday.clone())
	}

	const isToday = (date: LiveDashDate): boolean => {
		return (
			date.date() === today.date() &&
			date.month() === today.month() &&
			date.year() === today.year()
		)
	}

	const getHijriDate = (date: LiveDashDate): string => {
		const hijriDate = convertGregorianToHijri(date)
		return `${hijriDate.iYear()}/${hijriDate.iMonth() + 1}/${hijriDate.iDate()}`
	}

	const todayIsHoliday = activeDate.day() === 0 || activeDate.day() === 6

	return (
		<DateContext.Provider
			value={{
				currentDate,
				selectedDate,
				todayIsHoliday,
				today,
				setCurrentDate,
				setSelectedDate,
				goToToday,
				isToday,
				getHijriDate,
			}}
		>
			{children}
		</DateContext.Provider>
	)
}

export const useDate = (): DateContextType => {
	const context = useContext(DateContext)

	if (!context) {
		throw new Error('useDate must be used within a DateProvider')
	}

	return context
}
