import MusicPlayerPlugin from "./main";
import { PluginSettingTab, App, Setting } from "obsidian";

export interface MusicPlayerPluginSettings {
	spotifyEnabled: boolean;
}

export const DEFAULT_SETTINGS: MusicPlayerPluginSettings = {
	spotifyEnabled: false,
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
	}
}
