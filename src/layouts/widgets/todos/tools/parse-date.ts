import moment from 'moment'

export const parseTodoDate = (dateString: string) => {
	const isGregorian = dateString.includes('T') || dateString.startsWith('20')

	if (isGregorian) {
		return moment(dateString)
	} else {
		return moment(dateString, 'YYYY-MM-DD')
	}
}
