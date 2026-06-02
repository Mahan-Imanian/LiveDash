import { SectionPanel } from '@/components/section-panel'
import { ToggleSwitch } from '@/components/toggle-switch.component'
import { useGeneralSetting } from '@/context/general-setting.context'

export function PrivacySettings() {
	const {
		analyticsEnabled,
		setAnalyticsEnabled,
		browserBookmarksEnabled,
		setBrowserBookmarksEnabled,
		browserTabsEnabled,
		setBrowserTabsEnabled,
	} = useGeneralSetting()

	return (
		<div className="w-full max-w-xl mx-auto">
			<SectionPanel title="Privacy" delay={0.1}>
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex-1 space-y-2">
							<h3 className="font-medium text-content">
								Extension usage analytics
							</h3>
							<p className="text-sm font-light leading-relaxed text-muted">
								When enabled, usage analytics are collected to improve
								performance. No personal data is sent.
							</p>
						</div>
						<div className="flex-shrink-0 ml-4">
							<ToggleSwitch
								enabled={analyticsEnabled}
								onToggle={() => setAnalyticsEnabled(!analyticsEnabled)}
							/>
						</div>
					</div>
					<div className="flex items-center justify-between">
						<div className="flex-1 space-y-2">
							<h3 className="font-medium text-content">
								Browser bookmark access
							</h3>
							<p className="text-sm font-light leading-relaxed text-muted">
								When enabled, the extension only accesses your browser bookmarks
								to display them. No data is saved or sent.
								Bookmarks are only shown inside the extension.
							</p>
						</div>
						<div className="flex-shrink-0 ml-4">
							<ToggleSwitch
								enabled={browserBookmarksEnabled}
								onToggle={() =>
									setBrowserBookmarksEnabled(!browserBookmarksEnabled)
								}
							/>
						</div>
					</div>
					<div className="flex items-center justify-between">
						<div className="flex-1 space-y-2">
							<h3 className="font-medium text-content">Tab access</h3>
							<p className="text-sm font-light leading-relaxed text-muted">
								When enabled, the extension can open and manage bookmarks inside
								folders in batches. No personal data
								is saved or sent.
							</p>
						</div>
						<div className="flex-shrink-0 ml-4">
							<ToggleSwitch
								enabled={browserTabsEnabled}
								onToggle={() =>
									setBrowserTabsEnabled(!browserTabsEnabled)
								}
							/>
						</div>
					</div>
				</div>
			</SectionPanel>
		</div>
	)
}
