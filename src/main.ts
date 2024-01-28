import { Menu, Notice, Plugin, setIcon } from 'obsidian';
import { DEFAULT_SETTINGS, MusicPlayerPluginSettings, MusicPlayerSettingsTab } from './Settings';
import { SpotifyAuthHandler } from './backend/handlers/SpotifyAuthHandler';
import { PlayerAction, PlaybackState } from './backend/MediaPlayerService';
import { MediaPlayerManager } from './backend/MediaPlayerManager';
import { AuthManager } from './backend/AuthManager';
import { LinkInterceptor } from './LinkInterceptor';

const DEFAULT_ICON_LABEL = 'Pause / Resume music\n(Ctrl: Prev. Track / Shift: Next Track)';

export default class MusicPlayerPlugin extends Plugin {
	playerManager: MediaPlayerManager;
	settings: MusicPlayerPluginSettings;
	authManager: AuthManager;
	interceptor?: LinkInterceptor;
	ribbonIconEl?: HTMLElement;
	statusBarTextEl?: HTMLElement;
	statusBarPlayIcon?: HTMLElement;
	statusBarItems?: HTMLElement[];

	async onload() {
		await this.loadSettings();

		this.playerManager = new MediaPlayerManager(this);
		this.authManager = new AuthManager(this);
		this.authManager.register(SpotifyAuthHandler);
		this.registerProtocolHandlers();
		this.registerStatusBarItems();
		this.registerRibbonIcon();
		this.registerCommands();
		this.addSettingTab(new MusicPlayerSettingsTab(this.app, this));

		// Periodically update the player state
		this.registerInterval(window.setInterval(() => this?.onUpdatePlayerState(), 2000));

		// Intercept navigation to external links by hooking existing events
		this.interceptor = new LinkInterceptor({
			onOpeningLink: (url) => {
				if (this.playerManager.isLinkSupported(url)) {
					// TODO: openLink returns a promise, which we then ignore...
					this.playerManager.openLink(url);
					return true;
				}
				return false;
			}
		});
		this.interceptor.installHooks();

		// Attempt automatic login if enabled
		for (const p of this.playerManager.getAvailablePlayers()) {
			await p.performAuthorization({ silent: true });
		}

		// Initial update of the player state
		await this.onUpdatePlayerState();
	}

	onunload() {
		this.interceptor?.uninstallHooks();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Setup: Register a protocol handler to intercept the Spotify OAuth 2.0 authorization flow.
	 */
	private registerProtocolHandlers() {
		this.registerObsidianProtocolHandler('music-player-auth-flow', parameters => {
			this.authManager.receiveAuthFlow(parameters);
		});
	}

	/**
	 * Setup: Create an icon in the left ribbon.
	 */
	private registerRibbonIcon() {
		const ribbonIconEl = this.addRibbonIcon('play-circle', DEFAULT_ICON_LABEL, evt => this.onIconClicked(evt));
		ribbonIconEl.addClass('embedded-music-player-ribbon');
		ribbonIconEl.addEventListener('contextmenu', evt => this.onIconContextMenu(evt));
		this.ribbonIconEl = ribbonIconEl;
	}

	/**
	 * Setup: Add status bar items (Note: not available on mobile). 
	 */
	private registerStatusBarItems() {
		this.statusBarItems = this.statusBarItems ?? [];

		var items: Record<StatusBarItem, () => void> = {
			[StatusBarItem.None]: () => { },
			[StatusBarItem.Play]: () => {
				const item = this.addStatusBarItem();
				this.statusBarItems?.push(item);
				item.addEventListener('click', evt => this.onIconClicked(evt));
				item.addClass('mod-clickable');
				item.setAttribute('aria-label', 'Play / Pause');
				item.setAttribute('data-tooltip-position', 'top');
				setIcon(item, 'play');
				this.statusBarPlayIcon = item;
			},
			[StatusBarItem.Text]: () => {
				const item = this.addStatusBarItem();
				this.statusBarItems?.push(item);
				item.addEventListener('click', evt => this.onIconClicked(evt));
				item.addClass('mod-clickable');
				item.setAttribute('aria-label', 'Current track');
				item.setAttribute('data-tooltip-position', 'top');
				this.statusBarTextEl = item;
			},
			[StatusBarItem.Prev]: () => {
				const item = this.addStatusBarItem();
				this.statusBarItems?.push(item);
				item.addEventListener('click', () => this.playerManager.performAction(PlayerAction.SkipToPrevious));
				item.addClass('mod-clickable');
				item.setAttribute('aria-label', 'Previous track');
				item.setAttribute('data-tooltip-position', 'top');
				setIcon(item, 'skip-back');
			},
			[StatusBarItem.Next]: () => {
				const item = this.addStatusBarItem();
				this.statusBarItems?.push(item);
				item.addEventListener('click', () => this.playerManager.performAction(PlayerAction.SkipToNext));
				item.addClass('mod-clickable');
				item.setAttribute('aria-label', 'Next track');
				item.setAttribute('data-tooltip-position', 'top');
				setIcon(item, 'skip-forward');
			}
		};

		const added = new Set<StatusBarItem>();

		for (const key of this.settings.statusBarLayout) {
			if (added.has(key)) {
				console.warn(`Music Player | Duplicate uses of the '${key}' status item are not supported, and therefore ignored.`);
			} else {
				added.add(key);
		}
	}
	}

	updateStatusBar() {
		this.statusBarPlayIcon = undefined;
		this.statusBarTextEl = undefined;
		this.statusBarItems?.forEach(item => {
			item.remove();
		});
		this.registerStatusBarItems();
	}

	/**
	 * Click handler for the ribbon icons and status bar elements.
	 * 
	 * @param evt The mouse event.
	 */
	private async onIconClicked(evt: MouseEvent) {
		const SECONDARY_MOUSE_BUTTON = 2;
		if (evt.button == SECONDARY_MOUSE_BUTTON) {
			// Already handled by onIconContextMenu
			return;
		} else if (evt.ctrlKey) {
			await this.playerManager.performAction(PlayerAction.SkipToPrevious);
		} else if (evt.shiftKey) {
			await this.playerManager.performAction(PlayerAction.SkipToNext);
		} else {
			const playerState = await this.playerManager.getPlayerState();
			switch (playerState.state) {
				case PlaybackState.Playing:
					await this.playerManager.performAction(PlayerAction.Pause);
					// Immediately update the icon so the user quickly gets visual feedback.
					// If the state change fails for whatever reason, the icon will be "wrong"
					// for a short period, until the next periodic update takes place.
					this.setPlayerStateIcon(PlaybackState.Paused);
					break;
				case PlaybackState.Paused:
					await this.playerManager.performAction(PlayerAction.Resume);
					// See note above on quick visual feedback & failure handling.
					this.setPlayerStateIcon(PlaybackState.Playing);
					break;
				case PlaybackState.Disconnected:
					await this.playerManager.performAuthorization({ silent: false });
					this.setPlayerStateIcon(playerState.state);
					break;
				default:
					this.setPlayerStateIcon(playerState.state);
					break;
			}
		}
	};

	/**
	 * Context menu handler for the ribbon icon.
	 */
	private onIconContextMenu(evt: MouseEvent): void {
		if (!this.playerManager) {
			return;
		}

		const menu = new Menu();

		menu.addItem((item) =>
			item.setTitle("Current track URL")
				.setDisabled(true));

		menu.addItem((item) =>
			item
				.setTitle("Insert at cursor")
				.setIcon("link")
				.onClick(async () => {
					const playerState = await this.playerManager.getPlayerState({ include: { track: { url: true } } });
					const url = playerState.track?.url;
					if (url && url.length > 0) {
						this.app.workspace.activeEditor?.editor?.replaceSelection(url);
					}
				}));

		menu.addItem((item) =>
			item
				.setTitle("Copy to clipboard")
				.setIcon("copy")
				.onClick(async () => {
					const playerState = await this.playerManager.getPlayerState({ include: { track: { url: true } } });
					const url = playerState.track?.url;
					if (url && url.length > 0) {
						window.navigator.clipboard.writeText(url);
						new Notice(`Track URL copied to clipboard`);
					}
				}));

		menu.addSeparator();

		menu.addItem((item) =>
			item.setTitle("Select active media player")
				.setDisabled(true));

		for (const p of this.playerManager.getAvailablePlayers()) {
			(() => {
				const player = p;
				menu.addItem((item) =>
					item
						.setTitle(player.name)
						.setIcon('play-circle')
						.setChecked(this.playerManager.isActivePlayer(player))
						.onClick(() => {
							this.playerManager.selectPlayer(player);
							this.playerManager.performAuthorization({ silent: false });
							this.onUpdatePlayerState(); // Force an update of the UI
						}));
			})();
		}

		evt.preventDefault();
		menu.showAtMouseEvent(evt);
	}

	/**
	 * Query the current state of the player backends, and update the icons accordingly.
	 */
	private async onUpdatePlayerState() {
		const playerState = await this.playerManager.getPlayerState({ include: { track: { title: true, album: true } } });
		this.setPlayerStateIcon(playerState.state);
		const track = playerState.track;
		this.setPlayerLabel(track ? `${playerState.track?.artists?.join(', ')} – ${track.title}` : null, playerState.source ?? null);
	}

	private setPlayerLabel(label: string | null, source: string | null) {
		if (!label || label.length === 0) {
			label = null;
		}

		if (label && this.settings.showTrackInStatusBar) {
			this.statusBarTextEl?.show();
		} else {
			this.statusBarTextEl?.hide();
		}

		this.ribbonIconEl?.setAttribute('aria-label', label ?? DEFAULT_ICON_LABEL);
		this.statusBarTextEl?.setText(label ?? '');
		this.statusBarPlayIcon?.setAttribute('aria-label', 'Play / Pause');
		(this.statusBarTextEl || this.statusBarPlayIcon)?.setAttribute('aria-label', `Currently playing on ${source ?? '(Unknown)'}:\n${label ?? ''}`);
	}

	private setPlayerStateIcon(state: PlaybackState) {
		const ribbonIconEl = this.ribbonIconEl;
		const statusBarPlayIcon = this.statusBarPlayIcon;

		if (!ribbonIconEl || !statusBarPlayIcon) {
			return;
		}

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

	private registerCommands() {
		this.addCommand({
			id: 'resume-music',
			name: 'Resume Playback',
			callback: () => this.playerManager.performAction(PlayerAction.Resume)
		});

		this.addCommand({
			id: 'pause-music',
			name: 'Pause Playback',
			callback: () => this.playerManager.performAction(PlayerAction.Pause)
		});

		this.addCommand({
			id: 'skip-to-previous-track',
			name: 'Previous Track',
			callback: () => this.playerManager.performAction(PlayerAction.SkipToPrevious)
		});

		this.addCommand({
			id: 'skip-to-next-track',
			name: 'Next Track',
			callback: () => this.playerManager.performAction(PlayerAction.SkipToNext)
		});
	}
}
