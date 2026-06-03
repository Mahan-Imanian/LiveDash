import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import Joyride, { type Step } from 'react-joyride'
import Analytics from '@/analytics'
import { ConfigKey } from '@/common/constant/config.key'
import { getFromStorage, setToStorage } from '@/common/storage'
import { listenEvent } from '@/common/utils/call-event'
import type { StoredWallpaper } from '@/common/wallpaper.interface'
import { ExtensionInstalledModal } from '@/components/extension-installed-modal'
import { UpdateReleaseNotesModal } from '@/components/UpdateReleaseNotesModal'
import { GeneralSettingProvider } from '@/context/general-setting.context'
import { WidgetVisibilityProvider } from '@/context/widget-visibility.context'
import { NavbarLayout } from '@/layouts/navbar/navbar.layout'
import type { WidgetTabKeys } from '@/layouts/widgets-settings/constant/tab-keys'
import { WidgetSettingsModal } from '@/layouts/widgets-settings/widget-settings-modal'
import { getRandomWallpaper } from '@/services/hooks/wallpapers/getWallpaperCategories.hook'
import { ContentSection } from './home/content-section'
import { ExplorerContent } from '@/layouts/explorer/explorer'
import { usePage } from '@/context/page.context'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppearanceSetting } from '@/context/appearance.context'
import { HomeContentSimplify } from './home/home-content-simplify'

const steps: Step[] = [
	{
		target: '#chrome-footer',
		content: (
			<div className="flex flex-col gap-1 text-center">
				<h4 className="text-[14px] font-black text-primary italic">
					Declutter the browser
				</h4>

				<p className="text-[12px] leading-6 text-base-200 font-medium">
					To hide this bar,{' '}
					<span className="font-black text-error">right-click it</span> and choose:
					select this option:
				</p>

				<div className="relative group">
					<img
						src="/live-assets/how-to-disable-footer.svg"
						alt="How to hide the browser footer bar"
						className="object-cover w-full transition-transform duration-500 rounded-xl shadow-2xl border-2 border-primary/20 group-hover:scale-[1.02]"
					/>
					<div className="absolute inset-0 pointer-events-none rounded-xl bg-gradient-to-t from-black/20 to-transparent" />
				</div>

				<div className="p-2 border border-dashed rounded-lg bg-base-100/10 border-base-100/20">
					<code className="text-[11px] font-bold text-content/60">
						"Hide footer on New Tab page"
					</code>
				</div>
			</div>
		),
		disableBeacon: true,
		showSkipButton: true,
		styles: {
			options: {
				width: 320,
				zIndex: 10000,
			},
		},
	},
	{
		target: '#settings-button',
		content:
			'Use this button to access general settings and widget management.',
	},
	{
		target: '#profile-and-friends-list',
		content:
			'Use this section to access and manage your profile and friends list.',
	},
	{
		target: '#bookmarks',
		content:
			'This section lets you manage bookmarks: add new bookmarks, edit or delete existing bookmarks, and change each bookmark setting.',
	},
	{
		target: '#widgets',
		content:
			'This is the main widget area. You can use widgets freely, but to avoid clutter we recommend keeping at most four widgets active at once.',
	},
]
export function HomePage() {
	const { ui } = useAppearanceSetting()
	const [showWelcomeModal, setShowWelcomeModal] = useState(false)
	const [showReleaseNotes, setShowReleaseNotes] = useState(false)
	const [showWidgetSettings, setShowWidgetSettings] = useState(false)
	const [tab, setTab] = useState<string | null>(null)
	const [showTour, setShowTour] = useState(false)
	const { page } = usePage()

	useEffect(() => {
		async function displayModalIfNeeded() {
			const shouldShowWelcome = await getFromStorage('showWelcomeModal')

			if (shouldShowWelcome || shouldShowWelcome === null) {
				setShowWelcomeModal(true)
				return
			}

			const lastVersion = await getFromStorage('lastVersion')
			if (lastVersion !== ConfigKey.VERSION_NAME) {
				setShowReleaseNotes(true)
				return
			}
		}

		async function loadWallpaper() {
			const [wallpaper, browserTitle] = await Promise.all([
				getFromStorage('wallpaper'),
				getFromStorage('browserTitle'),
			])
			if (browserTitle) {
				document.title = browserTitle.template
			}

			if (wallpaper) {
				changeWallpaper(wallpaper)
			} else {
				const randomWallpaper = await getRandomWallpaper()
				if (randomWallpaper) {
					const defWallpaper: StoredWallpaper = {
						id: randomWallpaper.id,
						type: randomWallpaper.type,
						src: randomWallpaper.src,
						gradient: randomWallpaper.gradient,
					}
					changeWallpaper(defWallpaper)
					setToStorage('wallpaper', defWallpaper)
				} else {
					const defaultGradient: StoredWallpaper = {
						id: 'gradient-a1c4fd-c2e9fb',
						type: 'GRADIENT',
						src: '',
						gradient: {
							from: '#a1c4fd',
							to: '#c2e9fb',
							direction: 'to-r',
						},
					}
					changeWallpaper(defaultGradient)
					setToStorage('wallpaper', defaultGradient)
				}
			}
		}

		displayModalIfNeeded()
		loadWallpaper()

		const wallpaperChangedEvent = listenEvent(
			'wallpaperChanged',
			(wallpaper: StoredWallpaper) => {
				if (wallpaper) {
					changeWallpaper(wallpaper)
					setToStorage('wallpaper', wallpaper)
				}
			}
		)

		const openWidgetsSettingsEvent = listenEvent(
			'openWidgetsSettings',
			(data: { tab: WidgetTabKeys | null }) => {
				setShowWidgetSettings(true)
				if (data.tab) setTab(data.tab)
			}
		)

		Analytics.pageView('Home', '/')

		return () => {
			wallpaperChangedEvent()
			openWidgetsSettingsEvent()
		}
	}, [])

	const handleGetStarted = async () => {
		const [hasSeenTour] = await Promise.all([
			getFromStorage('hasSeenTour'),
			setToStorage('showWelcomeModal', false),
		])
		setShowWelcomeModal(false)
		if (!hasSeenTour) {
			setShowTour(true)
		}
	}

	const onCloseReleaseNotes = async () => {
		await setToStorage('lastVersion', ConfigKey.VERSION_NAME)
		setShowReleaseNotes(false)
	}

	function changeWallpaper(wallpaper: StoredWallpaper) {
		const existingVideo = document.getElementById('background-video')
		if (existingVideo) {
			existingVideo.remove()
		}

		if (wallpaper.type === 'IMAGE') {
			document.body.style.backgroundImage = `url(${wallpaper.src})`
			document.body.style.backgroundPosition = 'center'
			document.body.style.backgroundRepeat = 'no-repeat'
			document.body.style.backgroundSize = 'cover'
			document.body.style.backgroundColor = ''
		} else if (wallpaper.type === 'GRADIENT' && wallpaper.gradient) {
			const { from, to, direction } = wallpaper.gradient
			const cssDirection = direction
				.replace('to-r', 'to right')
				.replace('to-l', 'to left')
				.replace('to-t', 'to top')
				.replace('to-b', 'to bottom')
				.replace('to-tr', 'to top right')
				.replace('to-tl', 'to top left')
				.replace('to-br', 'to bottom right')
				.replace('to-bl', 'to bottom left')

			document.body.style.backgroundImage = `linear-gradient(${cssDirection}, ${from}, ${to})`
			document.body.style.backgroundColor = ''
			document.body.style.backdropFilter = ''
		} else if (wallpaper.type === 'VIDEO') {
			document.body.style.backgroundImage = ''
			document.body.style.backdropFilter = ''
			document.body.style.backgroundColor = '#000'

			const video = document.createElement('video')
			video.id = 'background-video'
			video.src = wallpaper.src
			video.autoplay = true
			video.loop = true
			video.muted = true
			video.playsInline = true

			Object.assign(video.style, {
				position: 'fixed',
				right: '0',
				bottom: '0',
				minWidth: '100%',
				minHeight: '100%',
				width: 'auto',
				height: 'auto',
				zIndex: '-1',
				objectFit: 'cover',
			})

			document.body.prepend(video)
		}
	}

	function onDoneTour(data: any) {
		if (data.status === 'finished' || data.status === 'skipped') {
			setToStorage('hasSeenTour', true)
			setShowTour(false)
			Analytics.event(`tour_${data.status}`)
		}
	}

	return (
		<div className="w-full min-h-screen mx-auto md:px-4 lg:px-0 max-w-[1080px] flex flex-col h-[100vh] overflow-y-auto scrollbar-none">
			<GeneralSettingProvider>
				<WidgetVisibilityProvider>
					<NavbarLayout />

					<AnimatePresence mode="wait">
						<motion.div
							key={page}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{
								duration: 0.15,
								ease: 'linear',
							}}
							className="flex w-full h-full"
						>
							{page === 'home' ? (
								ui === 'ADVANCED' ? (
									<ContentSection />
								) : (
									<HomeContentSimplify />
								)
							) : (
								<ExplorerContent />
							)}
						</motion.div>
					</AnimatePresence>
					<WidgetSettingsModal
						isOpen={showWidgetSettings}
						onClose={() => {
							setShowWidgetSettings(false)
							setTab(null)
						}}
						selectedTab={tab}
					/>
				</WidgetVisibilityProvider>
			</GeneralSettingProvider>
			<Joyride
				steps={steps}
				run={showTour}
				continuous
				showProgress
				showSkipButton
				locale={{
					next: 'Next',
					back: 'Back',
					skip: 'Skip',
					last: 'Finish',
					close: 'Close',
					nextLabelWithProgress: 'Next {step}/{steps}',
				}}
				callback={onDoneTour}
				styles={{
					options: {
						primaryColor: '#3b82f6',
					},
				}}
			/>
			<Toaster
				toastOptions={{
					error: {
						style: {
							backgroundColor: '#f8d7da',
							color: '#721c24',
						},
					},
					success: {
						style: {
							backgroundColor: '#d4edda',
							color: '#155724',
						},
					},
					duration: 5000,
				}}
			/>
			<ExtensionInstalledModal
				show={showWelcomeModal}
				onClose={() => handleGetStarted}
				onGetStarted={handleGetStarted}
			/>

			<UpdateReleaseNotesModal
				isOpen={showReleaseNotes}
				onClose={() => onCloseReleaseNotes()}
				counterValue={2}
			/>
		</div>
	)
}
