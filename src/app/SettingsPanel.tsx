import { useCallback, useEffect, useRef, useState } from 'react'
import { browser } from 'wxt/browser'
import { ENGINES, type EngineId } from '@/lib/engines'
import { type Stats, stats } from '@/memory/db'
import { siteOf } from '@/memory/privacy'
import { type Message, ORIGINS, type Settings, saveSettings } from '@/memory/settings'
import { CloseIcon } from './Icons'
import { turnOn } from './NewTab'
import { PHOTOS, photoUrl } from './photos'
import { formatBytes } from './use'

const send = (m: Message) => browser.runtime.sendMessage(m).catch(() => null)

interface Props {
	settings: Settings
	access: boolean
	onClose: () => void
	onToast: (m: string) => void
}

export function SettingsPanel({ settings: s, access, onClose, onToast }: Props) {
	const dialog = useRef<HTMLDialogElement>(null)
	const [info, setInfo] = useState<Stats | null>(null)
	const [site, setSite] = useState('')
	const [forgetSiteText, setForgetSiteText] = useState('')
	const [sure, setSure] = useState(false)
	const on = s.remember && access

	useEffect(() => {
		dialog.current?.showModal()
	}, [])

	// Closing goes through here rather than the dialog's close event, which a
	// background tab may deliver late.
	const close = () => {
		dialog.current?.close()
		onClose()
	}

	const reload = useCallback(
		() =>
			stats()
				.then(setInfo)
				.catch(() => setInfo(null)),
		[],
	)
	useEffect(() => {
		reload()
	}, [reload])

	const toggle = async (next: boolean) => {
		if (next) {
			if (!(await turnOn())) onToast('Site access was not granted, so nothing is remembered.')
			return
		}
		await saveSettings({ remember: false })
		await browser.permissions.remove({ origins: ORIGINS }).catch(() => false)
		onToast('Remembering is off. Pages already kept stay until you forget them.')
	}

	const pause = async () => {
		const host = siteOf(site.includes('://') ? site : `https://${site.trim()}`)
		if (!host) return
		if (!s.paused.includes(host)) await saveSettings({ paused: [...s.paused, host].sort() })
		setSite('')
		onToast(`${host} is paused. Pages already kept from it stay until you forget them.`)
	}

	const forget = async (scope: 'hour' | 'day' | 'site' | 'all', value?: string) => {
		await send({ type: 'ld-forget', scope, value })
		const label = {
			hour: 'the last hour',
			day: 'the last day',
			site: value ?? '',
			all: 'everything',
		}[scope]
		onToast(`Forgot ${label}.`)
		setSure(false)
		reload()
	}

	return (
		<dialog
			ref={dialog}
			className="panel"
			aria-labelledby="settings-title"
			onCancel={(e) => {
				e.preventDefault()
				close()
			}}
			onClick={(e) => e.target === dialog.current && close()}
		>
			<header>
				<h2 id="settings-title">Settings</h2>
				<button type="button" className="icon-btn" aria-label="Close settings" onClick={close}>
					<CloseIcon />
				</button>
			</header>

			<section aria-labelledby="h-remember">
				<h3 id="h-remember">Remembering</h3>
				<label className="switch">
					Remember pages I read
					<input type="checkbox" checked={on} onChange={(e) => toggle(e.target.checked)} />
				</label>
				<p>
					{info
						? info.pages
							? `${info.pages.toLocaleString()} pages from ${info.sites.toLocaleString()} sites, ${formatBytes(info.bytes)}, on this device${info.since ? ` since ${new Date(info.since).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}.`
							: 'Nothing remembered yet.'
						: ' '}
				</p>
				<p>
					Never kept: banking and payments, health, mail and chat, sign-in and account pages,
					incognito windows, and any page with a password field.
				</p>
			</section>

			<section aria-labelledby="h-paused">
				<h3 id="h-paused">Paused sites</h3>
				{s.paused.length > 0 && (
					<ul className="chips">
						{s.paused.map((h) => (
							<li key={h}>
								{h}
								<button
									type="button"
									aria-label={`Resume ${h}`}
									onClick={() => saveSettings({ paused: s.paused.filter((x) => x !== h) })}
								>
									<CloseIcon />
								</button>
							</li>
						))}
					</ul>
				)}
				<form
					className="inline"
					onSubmit={(e) => {
						e.preventDefault()
						pause()
					}}
				>
					<label htmlFor="pause" className="sr-only">
						Site to pause
					</label>
					<input
						id="pause"
						placeholder="example.com"
						value={site}
						onChange={(e) => setSite(e.target.value)}
					/>
					<button type="submit" className="btn small" disabled={!site.trim()}>
						Pause
					</button>
				</form>
			</section>

			<section aria-labelledby="h-forget">
				<h3 id="h-forget">Forget</h3>
				<div className="forget">
					<button type="button" className="btn small" onClick={() => forget('hour')}>
						Last hour
					</button>
					<button type="button" className="btn small" onClick={() => forget('day')}>
						Last day
					</button>
					<button
						type="button"
						className="btn danger"
						onClick={() => (sure ? forget('all') : setSure(true))}
					>
						{sure ? 'Click again to forget everything' : 'Everything'}
					</button>
				</div>
				<form
					className="inline"
					style={{ marginTop: 10 }}
					onSubmit={(e) => {
						e.preventDefault()
						const host = siteOf(`https://${forgetSiteText.trim().replace(/^https?:\/\//, '')}`)
						if (host) forget('site', host)
						setForgetSiteText('')
					}}
				>
					<label htmlFor="forget-site" className="sr-only">
						Site to forget
					</label>
					<input
						id="forget-site"
						placeholder="Forget one site"
						value={forgetSiteText}
						onChange={(e) => setForgetSiteText(e.target.value)}
					/>
					<button type="submit" className="btn small" disabled={!forgetSiteText.trim()}>
						Forget
					</button>
				</form>
			</section>

			<section aria-labelledby="h-look">
				<h3 id="h-look">New tab</h3>
				<label className="switch">
					Show a sentence from something I read
					<input
						type="checkbox"
						checked={s.resurface}
						onChange={(e) => saveSettings({ resurface: e.target.checked })}
					/>
				</label>
				<div className="thumbs" role="group" aria-label="Picture">
					<button
						type="button"
						className="rotate"
						aria-pressed={s.photo === 'rotate'}
						onClick={() => saveSettings({ photo: 'rotate' })}
					>
						New each day
					</button>
					{PHOTOS.map((p) => (
						<button
							key={p.id}
							type="button"
							aria-pressed={s.photo === p.id}
							aria-label={p.title}
							style={{ backgroundImage: `url(${photoUrl(p)})` }}
							onClick={() => saveSettings({ photo: p.id })}
						/>
					))}
				</div>
				<div className="field-row">
					<label htmlFor="clock">Clock</label>
					<select
						id="clock"
						value={s.hourCycle}
						onChange={(e) => saveSettings({ hourCycle: e.target.value as Settings['hourCycle'] })}
					>
						<option value="auto">Like this computer</option>
						<option value="h12">12-hour</option>
						<option value="h23">24-hour</option>
					</select>
				</div>
				<div className="field-row">
					<label htmlFor="engine">Web search</label>
					<select
						id="engine"
						value={s.engine}
						onChange={(e) => saveSettings({ engine: e.target.value as EngineId })}
					>
						{ENGINES.map((e) => (
							<option key={e.id} value={e.id}>
								{e.name}
							</option>
						))}
					</select>
				</div>
				{s.engine === 'custom' && (
					<div className="field-row">
						<label htmlFor="custom">Address, with %s for the words</label>
						<input
							id="custom"
							className="inline"
							value={s.customEngine}
							placeholder="https://example.com/?q=%s"
							onChange={(e) => saveSettings({ customEngine: e.target.value })}
						/>
					</div>
				)}
			</section>

			<section aria-labelledby="h-keys">
				<h3 id="h-keys">Keys</h3>
				<dl className="keylist">
					<dt>
						<kbd>/</kbd>
					</dt>
					<dd>Search</dd>
					<dt>
						<kbd>↑</kbd> <kbd>↓</kbd>
					</dt>
					<dd>Move through results</dd>
					<dt>
						<kbd>Enter</kbd>
					</dt>
					<dd>Open at the sentence, or switch to the open tab</dd>
					<dt>
						<kbd>Ctrl</kbd> <kbd>Enter</kbd>
					</dt>
					<dd>Open in a new tab</dd>
					<dt>
						<kbd>Shift</kbd> <kbd>Delete</kbd>
					</dt>
					<dd>Forget the selected page</dd>
					<dt>
						<kbd>Esc</kbd>
					</dt>
					<dd>Clear the search</dd>
				</dl>
			</section>

			<section>
				<p>Nothing leaves this device. No account, no server, no analytics.</p>
			</section>
		</dialog>
	)
}
