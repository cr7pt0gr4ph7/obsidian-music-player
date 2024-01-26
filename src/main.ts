import { App, MarkdownView, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, MusicPlayerPluginSettings, MusicPlayerSettingsTab } from './Settings';
import { SourceHandlerManager } from './backend/SourceHandlerManager';
import { getLinkUrlFromElement, getLinkUrlFromLivePreview } from './utils/LinkUtils';

export default class MusicPlayerPlugin extends Plugin {
	handlers: SourceHandlerManager;
	settings: MusicPlayerPluginSettings;

	async onload() {
		await this.loadSettings();

		this.handlers = new SourceHandlerManager(this);

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

		// This is a click event handler
		const clickEvt = async (evt: MouseEvent) => {
			const el = evt.target as HTMLElement;

			var href = getLinkUrlFromElement(el) ?? getLinkUrlFromLivePreview(this.app, evt);
			if (href && this.handlers.isSupported(href)) {
				evt.preventDefault();
				await this.handlers.openLink(href);
			}
		};

		// This registers a click event
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			return clickEvt(evt);
		});
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	openMusicPlayer() {

	}
}
