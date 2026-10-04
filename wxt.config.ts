import { defineConfig } from 'wxt'

const testBuild = process.env.LD_TEST === '1'

export default defineConfig({
	modules: ['@wxt-dev/module-react'],
	srcDir: 'src',
	entrypointsDir: '../entrypoints',
	publicDir: 'public',
	outDir: testBuild ? '.output-test' : '.output',
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
			'The front page of your browser: one box for the web, your tabs, history and bookmarks, shortcuts with groups, what to pick up, today, notes and focus. Private and local.',
		minimum_chrome_version: '120',
		permissions: [
			'storage',
			'alarms',
			'contextMenus',
			'favicon',
			'activeTab',
			'search',
			...(testBuild ? ['history', 'tabs', 'sessions', 'bookmarks', 'tabGroups', 'topSites'] : []),
		],
		optional_permissions: [
			'history',
			'tabs',
			'sessions',
			'bookmarks',
			'topSites',
			'tabGroups',
			'notifications',
		],
		optional_host_permissions: ['https://*/*'],
		...(testBuild
			? {
					host_permissions: [
						'https://api.open-meteo.com/*',
						'https://geocoding-api.open-meteo.com/*',
						'https://en.wikipedia.org/*',
						'https://upload.wikimedia.org/*',
					],
				}
			: {}),
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
