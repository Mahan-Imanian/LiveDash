type infoAlarmType = 'success' | 'done_todo'
let alarms: Record<infoAlarmType, string> = {
	success: '/live-assets/alarm-success.wav',
	done_todo:
		'/live-assets/alarm-todo.wav',
}
let audioCache: Partial<Record<infoAlarmType, HTMLAudioElement>> = {}

export async function playAlarm(type: infoAlarmType) {
	if (!audioCache[type]) {
		const alarm = alarms[type]
		const audio = new Audio(alarm)
		audio.preload = 'auto'
		audioCache[type] = audio
		await new Promise((resolve) => {
			audio.addEventListener('canplaythrough', resolve, { once: true })
			audio.addEventListener('error', resolve, { once: true })
		})
	}
	const audio = audioCache[type]
	audio.currentTime = 0
	await audio.play()
}
