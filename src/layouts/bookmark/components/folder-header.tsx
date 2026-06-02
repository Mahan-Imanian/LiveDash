import { useState, useEffect } from 'react'
import { IoMdHelp } from 'react-icons/io'
import Analytics from '@/analytics'
import { Button } from '@/components/button/button'
import Modal from '@/components/modal'
import Tooltip from '@/components/toolTip'
import type { FolderPathItem } from '../types/bookmark.types'
import { FolderPath } from './folder-path'
import { IoHome } from 'react-icons/io5'
import { LuX } from 'react-icons/lu'

interface FolderHeaderProps {
	folderPath: FolderPathItem[]
	onNavigate: (folderId: string | null, depth: number) => void
}

export function FolderHeader({ folderPath, onNavigate }: FolderHeaderProps) {
	const [isOpen, setIsOpen] = useState(false)
	useEffect(() => {
		if (isOpen) {
			Analytics.event('bookmark_help_opened')
		}
	}, [isOpen])
	return (
		<>
			<div className="flex flex-row justify-between p-1 border-b border-content mb-0.5 bg-glass">
				<FolderPath
					folderPath={folderPath}
					onNavigate={onNavigate}
					className="w-full "
				/>
				<Tooltip content={'Guide'}>
					<Button
						onClick={() => setIsOpen(true)}
						size="xs"
						className={`h-7 w-7 text-xs font-medium rounded-[0.55rem] transition-colors border-none shadow-none text-muted hover:bg-base-300`}
					>
						<IoMdHelp size={12} />
					</Button>
				</Tooltip>
				<Tooltip content={'Close'}>
					<Button
						onClick={() => onNavigate(null, -1)}
						size="xs"
						className={`h-7 w-7 mr-1 text-xs font-medium rounded-[0.55rem] transition-colors border-none shadow-none text-muted hover:bg-base-300`}
					>
						<LuX size={12} />
					</Button>
				</Tooltip>
			</div>

			<Modal
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				closeOnBackdropClick={true}
				direction="ltr"
				title="Bookmark guide"
			>
				<div className="p-4 space-y-6">
					<div>
						<h3 className="mb-3 text-base font-semibold text-primary">
							💡 Folder features
						</h3>
						<ul className="space-y-3 text-sm leading-relaxed text-muted">
							<li className="flex items-start gap-2">
								<span className="text-success mt-0.5">•</span>
								<span>
									<strong>Unlimited bookmarks:</strong> you can add
									unlimited bookmarks to folders
								</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-success mt-0.5">•</span>
								<span>
									<strong>Automatic scrolling:</strong> when you have more than 10 items,
									the list becomes scrollable
								</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-success mt-0.5">•</span>
								<span>
									<strong>Better organization:</strong> place similar bookmarks
									in separate folders
								</span>
							</li>
						</ul>
					</div>

					<div>
						<h3 className="mb-3 text-base font-semibold text-primary">
							🎯 How to use
						</h3>
						<ul className="space-y-3 text-sm leading-relaxed text-muted">
							<li className="flex items-start gap-2">
								<span className="text-info mt-0.5">1.</span>
								<span>
									<strong>Regular click:</strong> to open a folder
								</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-info mt-0.5">2.</span>
								<span>
									<strong>Ctrl + click:</strong> to open all
									folder bookmarks
								</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-info mt-0.5">3.</span>
								<span>
									<strong>Middle click:</strong> to open all
									bookmarks in new tabs
								</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-info mt-0.5">4.</span>
								<span>
									<strong>Drag and drop:</strong> to reorder
									Bookmarks
								</span>
							</li>
						</ul>
					</div>

					<div>
						<h3 className="mb-3 text-base font-semibold text-primary">
							⚡ Useful tips
						</h3>
						<ul className="space-y-3 text-sm leading-relaxed text-muted">
							<li className="flex items-start gap-2">
								<span className="text-warning mt-0.5">💡</span>
								<span>
									Use descriptive folder names (such as "Work",
									"Entertainment")
								</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-warning mt-0.5">💡</span>
								<span>Create nested folders for better organization</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-warning mt-0.5">💡</span>
								<span>
									Use the path at the top for quick navigation
								</span>
							</li>
						</ul>
					</div>
				</div>
			</Modal>
		</>
	)
}
