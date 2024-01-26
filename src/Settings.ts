import MusicPlayerPlugin from "./main";
import { PluginSettingTab, App, Setting } from "obsidian";

export interface MusicPlayerPluginSettings {
	spotifyEnabled: boolean;
	showPlayStateInIcon: boolean;
	changeIconColor: boolean;
	showTrackInStatusBar: boolean;
}

export const DEFAULT_SETTINGS: MusicPlayerPluginSettings = {
	spotifyEnabled: false,
	showPlayStateInIcon: true,
	changeIconColor: true,
	showTrackInStatusBar: true,
}

export class MusicPlayerSettingsTab extends PluginSettingTab {
	plugin: MusicPlayerPlugin;

	constructor(app: App, plugin: MusicPlayerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Spotify')
			.setDesc('Enable the Spotify integration.')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.spotifyEnabled).onChange(data => {
					this.plugin.settings.spotifyEnabled = data;
					this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Show playback state via icon')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.showPlayStateInIcon).onChange(data => {
					this.plugin.settings.showPlayStateInIcon = data;
					this.plugin.saveSettings();
				});
			});


		new Setting(containerEl)
			.setName('Show playback state via icon color')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.changeIconColor).onChange(data => {
					this.plugin.settings.changeIconColor = data;
					this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Show track title in status bar')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.showTrackInStatusBar).onChange(data => {
					this.plugin.settings.showTrackInStatusBar = data;
					this.plugin.saveSettings();
				});
			});
	}
}
