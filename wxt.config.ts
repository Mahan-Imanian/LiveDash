import { defineConfig } from 'wxt'

export default defineConfig({
	modules: ['@wxt-dev/module-react'],
	srcDir: 'src',
	entrypointsDir: '../entrypoints',
	publicDir: 'public',
	vite: () => ({
		build: {
			sourcemap: false,
			target: 'chrome120',
		},
	}),
	manifest: {
		name: 'LiveDash',
		short_name: 'LiveDash',
		description:
			'A fast, private, keyboard-first new tab. Capture tasks and notes, jump to any site, and see what is next.',
		minimum_chrome_version: '120',
		permissions: ['storage', 'alarms', 'contextMenus', 'favicon', 'activeTab', 'search'],
		optional_permissions: ['topSites', 'bookmarks', 'notifications'],
		optional_host_permissions: ['https://*/*'],
		action: {
			default_title: 'LiveDash quick capture',
		},
		commands: {
			_execute_action: {
				suggested_key: {
					default: 'Alt+Shift+L',
					mac: 'Alt+Shift+L',
				},
				description: 'Open quick capture',
			},
		},
		icons: {
			16: 'icon/16.png',
			32: 'icon/32.png',
			48: 'icon/48.png',
			128: 'icon/128.png',
		},
	},
})
