import { Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, MusicPlayerPluginSettings, MusicPlayerSettingsTab } from './Settings';
import { SourceHandlerManager } from './backend/SourceHandlerManager';
import { SpotifyPlayer } from './player/Spotify';

export default class MusicPlayerPlugin extends Plugin {
	isLoaded: boolean;
	player: SpotifyPlayer;
	handlers: SourceHandlerManager;
	settings: MusicPlayerPluginSettings;

	async onload() {
		await this.loadSettings();

		this.handlers = new SourceHandlerManager(this);
		this.player = new SpotifyPlayer();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('play-circle', 'Open music player', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});

		// Perform additional things with the ribbon
		ribbonIconEl.addClass('embedded-music-player-ribbon');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-music-player',
			name: 'Open Music Player',
			callback: () => this.openMusicPlayer()
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new MusicPlayerSettingsTab(this.app, this));

		this.hookWindowOpen();
		this.isLoaded = true;
		this.player.load();
	}

	onunload() {
		this.player.unload();
		this.isLoaded = false;
		this.unhookWindowOpen();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	openMusicPlayer() {

	}

	private hookWindowOpen() {
		console.debug("Music Player | Installing hook for window.open()");

		// This is very hacky, but until Obsidian provides a native extension point
		// for intercepting link navigations that works in all cases (live preview, reading view, source view...),
		// this is actually the best we can do.
		// @ts-expect-error
		if (!window.__original_open) {
			// @ts-expect-error
			window.__original_open = window.open;
		}
		window.open = this.onWindowOpenCalled.bind(this);
	}

	private onWindowOpenCalled(url?: string | URL, target?: string, features?: string): WindowProxy | null {
		if (this.isLoaded && url && this.handlers.isSupported(url.toString())) {
			// TODO: openLink returns a promise, which we then ignore...
			this.handlers.openLink(url.toString());
			return null;
		}

		// @ts-expect-error
		return window.__original_open(url, target, features);
	}

	private unhookWindowOpen() {
		console.debug("Music Player | Uninstalling hook for window.open()");

		// @ts-expect-error
		if (window.__original_open) {
			// @ts-expect-error
			window.open = window.__original_open;
		}
	}
}
