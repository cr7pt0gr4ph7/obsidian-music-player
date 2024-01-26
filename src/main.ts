import { Plugin, setIcon } from 'obsidian';
import { DEFAULT_SETTINGS, MusicPlayerPluginSettings, MusicPlayerSettingsTab } from './Settings';
import { SourceHandlerManager } from './backend/SourceHandlerManager';
import { SpotifyAuthHandler } from './backend/handlers/SpotifyAuthHandler';
import { SourceHandler } from './backend/SourceHandler';
import { PlayerState, SpotifyLinkHandler } from './backend/handlers/SpotifyLinkHandler';

export default class MusicPlayerPlugin extends Plugin {
	isLoaded: boolean;
	handlers: SpotifyLinkHandler;
	settings: MusicPlayerPluginSettings;
	auth: SpotifyAuthHandler;
	onUpdatePlayerState: () => void;

	async onload() {
		await this.loadSettings();

		this.handlers = new SpotifyLinkHandler(this);
		this.auth = new SpotifyAuthHandler(this);

		// Register a protocol handler to intercept the Spotify OAuth 2.0 authorization flow
		this.registerObsidianProtocolHandler('music-player-auth-flow', parameters => {
			this.auth.receiveObsidianProtocolAction(parameters);
		});

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('play-circle', 'Open music player', async (evt: MouseEvent) => {
			let state = await this.handlers.getPlayerState();
			switch (state) {
				case PlayerState.Playing:
					this.handlers.pausePlayback();
					setIcon(ribbonIconEl, 'pause-circle');
					break;
				case PlayerState.Paused:
					this.handlers.resumePlayback();
					setIcon(ribbonIconEl, 'play-circle');
					break;
				case PlayerState.Disconnected:
					setIcon(ribbonIconEl, 'circle');
					break;
			}
		});

		// Perform additional things with the ribbon
		ribbonIconEl.addClass('embedded-music-player-ribbon');

		this.onUpdatePlayerState = async () => {
			let state = await this.handlers.getPlayerState();
			switch (state) {
				case PlayerState.Playing:
					setIcon(ribbonIconEl, 'play-circle');
					break;
				case PlayerState.Paused:
					setIcon(ribbonIconEl, 'pause-circle');
					break;
				case PlayerState.Disconnected:
					setIcon(ribbonIconEl, 'circle');
					break;
			}
		};

		// Periodically update the player state
		this.registerInterval(window.setInterval(() => {
			this?.onUpdatePlayerState();
		}, 2000));

		// This adds a few simple commands that can be triggered anywhere
		this.addCommand({
			id: 'open-music-player',
			name: 'Open Music Player',
			callback: () => this.openMusicPlayer()
		});

		this.addCommand({
			id: 'resume-music',
			name: 'Resume Playback',
			callback: () => this.handlers.resumePlayback()
		});

		this.addCommand({
			id: 'pause-music',
			name: 'Pause Playback',
			callback: () => this.handlers.pausePlayback()
		});


		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new MusicPlayerSettingsTab(this.app, this));

		this.hookWindowOpen();
		this.isLoaded = true;
	}

	onunload() {
		this.isLoaded = false;
		this.unhookWindowOpen();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async openMusicPlayer() {
		await this.auth.performAuthorization();
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
