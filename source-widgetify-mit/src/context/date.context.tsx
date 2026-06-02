import type React from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import {
	convertShamsiToHijri,
	getCurrentDate,
	type DashLiveDate,
} from '@/layouts/widgets/calendar/utils'
import { useGeneralSetting } from './general-setting.context'

interface DateContextType {
	currentDate: DashLiveDate
	selectedDate: DashLiveDate
	today: DashLiveDate
	todayIsHoliday: boolean
	setCurrentDate: (date: DashLiveDate) => void
	setSelectedDate: (date: DashLiveDate) => void
	goToToday: () => void
	isToday: (date: DashLiveDate) => boolean
	getHijriDate: (date: DashLiveDate) => string
}

const DateContext = createContext<DateContextType | undefined>(undefined)

export const DateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const { selected_timezone: timezone } = useGeneralSetting()
	const activeDate = getCurrentDate(timezone.value)

	const [currentDate, setCurrentDate] = useState<DashLiveDate>(activeDate)
	const [selectedDate, setSelectedDate] = useState<DashLiveDate>(activeDate)
	const [today, setToday] = useState<DashLiveDate>(activeDate)

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

	const isToday = (date: DashLiveDate): boolean => {
		return (
			date.jDate() === today.jDate() &&
			date.jMonth() === today.jMonth() &&
			date.jYear() === today.jYear()
		)
	}

	const getHijriDate = (date: DashLiveDate): string => {
		const hijriDate = convertShamsiToHijri(date)
		return `${hijriDate.iYear()}/${hijriDate.iMonth() + 1}/${hijriDate.iDate()}`
	}

	const todayIsHoliday = activeDate.day() === 5

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
