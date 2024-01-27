import { Plugin, setIcon } from 'obsidian';
import { DEFAULT_SETTINGS, MusicPlayerPluginSettings, MusicPlayerSettingsTab } from './Settings';
import { SpotifyAuthHandler } from './backend/handlers/SpotifyAuthHandler';
import { PlayerAction, PlaybackState, MediaPlayerService } from './backend/MediaPlayerService';
import { MediaPlayerManager } from './backend/MediaPlayerManager';

export default class MusicPlayerPlugin extends Plugin {
	isLoaded: boolean;
	handlers: MediaPlayerService;
	settings: MusicPlayerPluginSettings;
	auth: SpotifyAuthHandler;
	onUpdatePlayerState: () => void;

	async onload() {
		await this.loadSettings();

		this.handlers = new MediaPlayerManager(this);
		this.auth = new SpotifyAuthHandler(this);

		// Register a protocol handler to intercept the Spotify OAuth 2.0 authorization flow
		this.registerObsidianProtocolHandler('music-player-auth-flow', parameters => {
			this.auth.receiveObsidianProtocolAction(parameters);
		});

		// Click handler for the icons
		const onIconClicked = async (evt: MouseEvent) => {
			if (evt.ctrlKey) {
				await this.handlers.performAction(PlayerAction.SkipToPrevious);
			} else if (evt.shiftKey) {
				await this.handlers.performAction(PlayerAction.SkipToNext);
			} else {
				const playerState = await this.handlers.getPlayerState();
				switch (playerState.state) {
					case PlaybackState.Playing:
						await this.handlers.performAction(PlayerAction.Pause);
						// Immediately update the icon so the user quickly gets visual feedback.
						// If the state change fails for whatever reason, the icon will be "wrong"
						// for a short period, until the next periodic update takes place.
						setPlayerStateIcon(PlaybackState.Paused);
						break;
					case PlaybackState.Paused:
						await this.handlers.performAction(PlayerAction.Resume);
						// See note above on quick visual feedback & failure handling.
						setPlayerStateIcon(PlaybackState.Playing);
						break;
					case PlaybackState.Disconnected:
						await this.auth.performAuthorization();
						setPlayerStateIcon(playerState.state);
						break;
					default:
						setPlayerStateIcon(playerState.state);
						break;
				}
			}
		};

		// Add status bar items (not available on mobile)
		const statusBarPlayIcon = this.addStatusBarItem();
		statusBarPlayIcon.addClass('mod-clickable');
		setIcon(statusBarPlayIcon, 'play');
		statusBarPlayIcon.addEventListener('click', onIconClicked);

		const statusBarTextEl = this.addStatusBarItem();
		statusBarTextEl.addClass('mod-clickable');
		statusBarTextEl.addEventListener('click', onIconClicked);

		const statusBarPrevIcon = this.addStatusBarItem();
		statusBarPrevIcon.addClass('mod-clickable');
		setIcon(statusBarPrevIcon, 'skip-back');
		statusBarPrevIcon.addEventListener('click', () => this.handlers.performAction(PlayerAction.SkipToPrevious));

		const statusBarNextIcon = this.addStatusBarItem();
		statusBarNextIcon.addClass('mod-clickable');
		setIcon(statusBarNextIcon, 'skip-forward');
		statusBarNextIcon.addEventListener('click', () => this.handlers.performAction(PlayerAction.SkipToNext));

		// Create an icon in the left ribbon
		const defaultIconLabel = 'Pause / Resume music\n(Ctrl: Prev. Track / Shift: Next Track)';
		const ribbonIconEl = this.addRibbonIcon('play-circle', defaultIconLabel, onIconClicked);

		const setPlayerStateIcon = (state: PlaybackState) => {
			ribbonIconEl.removeClasses([
				'music-player-ribbon-playing',
				'music-player-ribbon-paused',
				'music-player-ribbon-disconnected',
			]);

			if (!this.settings.showPlayStateInIcon) {
				setIcon(ribbonIconEl, 'play-circle');
				setIcon(statusBarPlayIcon, 'play');
				ribbonIconEl.setCssProps({ 'color': '' });
				return;
			}

			var color: string | null = null;

			switch (state) {
				case PlaybackState.Playing:
					setIcon(ribbonIconEl, 'play-circle');
					setIcon(statusBarPlayIcon, 'play');
					ribbonIconEl.addClass('music-player-ribbon-playing');
					color = 'green';
					break;
				case PlaybackState.Paused:
					setIcon(ribbonIconEl, 'pause-circle');
					setIcon(statusBarPlayIcon, 'pause');
					ribbonIconEl.addClass('music-player-ribbon-paused');
					color = 'orange';
					break;
				case PlaybackState.Stopped:
					setIcon(ribbonIconEl, 'stop-circle');
					setIcon(statusBarPlayIcon, 'play');
					ribbonIconEl.addClass('music-player-ribbon-disconnected');
					break;
				case PlaybackState.Disconnected:
					setIcon(ribbonIconEl, 'stop-circle');
					setIcon(statusBarPlayIcon, 'play');
					ribbonIconEl.addClass('music-player-ribbon-disconnected');
					break;
			}

			if (!this.settings.changeIconColor) {
				color = null;
			}

			ribbonIconEl.setCssProps({ 'color': color ?? '' });
		}

		const setPlayerLabel = (label: string | null) => {
			if (!label || label.length === 0) {
				label = null;
			}

			if (label && this.settings.showTrackInStatusBar) {
				statusBarTextEl.show();
			} else {
				statusBarTextEl.hide();
			}

			ribbonIconEl.setAttribute("aria-label", label ?? defaultIconLabel);
			statusBarTextEl.setText(label ?? "");
		}

		// Perform additional things with the ribbon
		ribbonIconEl.addClass('embedded-music-player-ribbon');

		// Periodically update the player state
		this.onUpdatePlayerState = async () => {
			const playerState = await this.handlers.getPlayerState({ include: { track: { title: true, album: true } } });
			setPlayerStateIcon(playerState.state);
			const track = playerState.track;
			setPlayerLabel(track ? `${playerState.track?.artists?.join(', ')} – ${track.title}` : null);
		};

		this.registerInterval(window.setInterval(() => {
			this?.onUpdatePlayerState();
		}, 2000));

		// This adds a few simple commands that can be triggered anywhere
		this.addCommand({
			id: 'resume-music',
			name: 'Resume Playback',
			callback: () => this.handlers.performAction(PlayerAction.Resume)
		});

		this.addCommand({
			id: 'pause-music',
			name: 'Pause Playback',
			callback: () => this.handlers.performAction(PlayerAction.Pause)
		});

		this.addCommand({
			id: 'skip-to-previous-track',
			name: 'Previous Track',
			callback: () => this.handlers.performAction(PlayerAction.SkipToPrevious)
		});

		this.addCommand({
			id: 'skip-to-next-track',
			name: 'Next Track',
			callback: () => this.handlers.performAction(PlayerAction.SkipToNext)
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
		if (this.isLoaded && url && this.handlers.isLinkSupported(url.toString())) {
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
