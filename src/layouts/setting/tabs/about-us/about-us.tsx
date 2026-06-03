import { FaDonate, FaGithub, FaGlobe, FaHeart } from 'react-icons/fa'
import { MdFeedback } from 'react-icons/md'
import { SectionPanel } from '@/components/section-panel'
import { ConfigKey } from '../../../../common/constant/config.key'

export function AboutUsTab() {
	const getDonateCardStyle = () => {
		return 'bg-green-900/20 border-white/5 hover:border-green-400/20 hover:bg-green-900/30 hover:shadow-[0_0_15px_rgba(74,222,128,0.2)]'
	}

	const getGithubCardStyle = () => {
		return 'bg-gray-800/20 border-white/5 hover:border-white/20 hover:bg-gray-800/40 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'
	}

	const getFeedbackCardStyle = () => {
		return 'bg-blue-900/20 border-white/5 hover:border-blue-400/20 hover:bg-blue-900/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]'
	}

	const getWebsiteCardStyle = () => {
		return 'bg-indigo-900/20 border-white/5 hover:border-indigo-400/20 hover:bg-indigo-900/30 hover:shadow-[0_0_15px_rgba(129,140,248,0.2)]'
	}

	const getIconContainerStyle = (color: string) => {
		switch (color) {
			case 'green':
				return 'bg-green-800/50 text-green-200'
			case 'gray':
				return 'bg-gray-700/50 text-gray-200'
			case 'blue':
				return 'bg-blue-800/50 text-blue-200'
			case 'indigo':
				return 'bg-indigo-800/50 text-indigo-200'
			default:
				return 'bg-gray-700/50 text-gray-200'
		}
	}

	return (
		<div className="w-full max-w-2xl mx-auto" dir="ltr">
			<div className="flex flex-col items-center p-3 text-center">
				{/* App Name & Version */}
				<h1
					className={
						'mb-1 text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600'
					}
				>
					LiveDash
				</h1>
				<div
					className={
						'inline-flex items-center px-3 py-1 mb-2 text-xs font-medium border rounded-full backdrop-blur-sm text-primary/80'
					}
				>
					<span>Version "{ConfigKey.VERSION_NAME}"</span>
				</div>

				{/* Description */}
				<p className={'max-w-lg mb-2 text-sm leading-relaxed text-content'}>
					LiveDash is an open-source browser extension that turns your new tab into
					a productive, personalized workspace with useful tools and a polished style.
					
				</p>
			</div>

			{/* Links Section */}
			<SectionPanel title="Contact links" size="sm">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
					<a
						href="https://livedash.codersays.com/donate"
						target="_blank"
						rel="noopener noreferrer"
						className={`flex flex-col items-center justify-center p-4 transition-all duration-200 border rounded-xl backdrop-blur-sm hover:-translate-y-1 ${getDonateCardStyle()}`}
					>
						<div
							className={`flex items-center justify-center w-12 h-12 mb-3 rounded-full ${getIconContainerStyle('green')}`}
						>
							<FaDonate size={24} />
						</div>
						<h3 className={'text-sm font-medium text-content'}>Donate</h3>
						<p className={'mt-1 text-xs text-center text-content'}>
							Contribute to LiveDash
						</p>
					</a>

					<a
						href="https://github.com/Mahan-Imanian/LiveDash"
						target="_blank"
						rel="noopener noreferrer"
						className={`flex flex-col items-center justify-center p-4 transition-all duration-200 border rounded-xl backdrop-blur-sm hover:-translate-y-1 ${getGithubCardStyle()}`}
					>
						<div
							className={`flex items-center justify-center w-12 h-12 mb-3 rounded-full ${getIconContainerStyle('gray')}`}
						>
							<FaGithub size={24} />
						</div>
						<h3 className={'text-sm font-medium text-content'}>GitHub</h3>
						<p className={'mt-1 text-xs text-center text-content'}>
							View source code
						</p>
					</a>

					<a
						href="https://livedash.codersays.com/feedback"
						target="_blank"
						rel="noopener noreferrer"
						className={`flex flex-col items-center justify-center p-4 transition-all duration-200 border rounded-xl backdrop-blur-sm hover:-translate-y-1 ${getFeedbackCardStyle()}`}
					>
						<div
							className={`flex items-center justify-center w-12 h-12 mb-3 rounded-full ${getIconContainerStyle('blue')}`}
						>
							<MdFeedback size={24} />
						</div>
						<h3 className={'text-sm font-medium text-content'}>Feedback</h3>
						<p className={'mt-1 text-xs text-center text-content'}>
							Send feedback
						</p>
					</a>

					<a
						href="https://livedash.codersays.com"
						target="_blank"
						rel="noopener noreferrer"
						className={`flex flex-col items-center justify-center p-4 transition-all duration-200 border rounded-xl backdrop-blur-sm hover:-translate-y-1 ${getWebsiteCardStyle()}`}
					>
						<div
							className={`flex items-center justify-center w-12 h-12 mb-3 rounded-full ${getIconContainerStyle('indigo')}`}
						>
							<FaGlobe size={24} />
						</div>
						<h3 className={'text-sm font-medium text-content'}>Website</h3>
						<p className={'mt-1 text-xs text-center text-content'}>
							View official website
						</p>
					</a>
				</div>
			</SectionPanel>

			{/* Footer */}
			<div
				className={
					'flex items-center justify-center mt-8 space-x-1 space-x-reverse text-sm text-content opacity-75'
				}
			>
				<span>Made with</span>
				<FaHeart className="mx-1 text-red-500 animate-pulse" size={14} />
				<span>in Europe</span>
			</div>

			<div className={'mt-2 mb-4 text-xs text-center text-content opacity-55'}>
				© LiveDash - All rights reserved
			</div>
		</div>
	)
}
