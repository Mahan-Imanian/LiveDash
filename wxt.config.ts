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
			'A new tab that learns where you go and gets you there in one keystroke. Switches to open tabs, reopens closed ones, saves things for later. Private and local.',
		minimum_chrome_version: '120',
		permissions: [
			'storage',
			'alarms',
			'contextMenus',
			'favicon',
			'activeTab',
			'search',
			...(testBuild ? ['history', 'tabs', 'sessions', 'bookmarks'] : []),
		],
		optional_permissions: ['history', 'tabs', 'sessions', 'bookmarks', 'notifications'],
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
