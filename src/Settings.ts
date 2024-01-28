import MusicPlayerPlugin from "./main";
import { PluginSettingTab, App, Setting, DropdownComponent, Menu } from "obsidian";

export enum StatusBarItem {
	None = '',
	Text = 'text',
	Play = 'play',
	Prev = 'prev',
	Next = 'next',
}

const statusBarItems: StatusBarItem[] = [
	StatusBarItem.Text,
	StatusBarItem.Play,
	StatusBarItem.Prev,
	StatusBarItem.Next,
]

export const STATUS_BAR_PRESETS: { name: string; icon?: string, layout: StatusBarItem[] }[] = [
	{ name: "Standard", icon: "music-3", layout: [StatusBarItem.Text, StatusBarItem.Prev, StatusBarItem.Play, StatusBarItem.Next] },
	{ name: "Compact", icon: "music", layout: [StatusBarItem.Play, StatusBarItem.Text] },
	{ name: "Ultra-compact", icon: "music-4", layout: [StatusBarItem.Play] },
	{ name: "---", layout: [] },
	{ name: "Controls only", icon: "skip-forward", layout: [StatusBarItem.Prev, StatusBarItem.Play, StatusBarItem.Next] },
	{ name: "Title & Artist only", icon: "list", layout: [StatusBarItem.Text] },
	{ name: "---", layout: [] },
	{ name: "Customize...", icon: "wrench", layout: [] },
];

export interface MusicPlayerPluginSettings {
	spotifyEnabled: boolean;
	autoLoginEnabled: boolean;
	showPlayStateInIcon: boolean;
	changeIconColor: boolean;
	showControlsInStatusBar: boolean;
	statusBarLayout: StatusBarItem[];
}

export const DEFAULT_SETTINGS: MusicPlayerPluginSettings = {
	spotifyEnabled: false,
	autoLoginEnabled: true,
	showPlayStateInIcon: true,
	changeIconColor: true,
	showControlsInStatusBar: true,
	statusBarLayout: [StatusBarItem.Text, StatusBarItem.Play, StatusBarItem.Prev, StatusBarItem.Next],
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
			.setName('Show playback state via icon image')
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
			.setName('Show controls in status bar')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.showControlsInStatusBar).onChange(data => {
					this.plugin.settings.showControlsInStatusBar = data;
					this.plugin.saveSettings();
				});
			});

		var reloadStatusBarLayout: () => void;

		new Setting(containerEl)
			.setName('Layout of the status bar')
			.setDesc("Customize the order of the controls in the status bar.")
			.then(setting => {
				const getLayout = () => {
					var layout = this.plugin.settings.statusBarLayout;
					if (layout.length != statusBarItems.length) {
						layout = Array.from(layout);
						layout.length = statusBarItems.length;
						for (const i of layout.keys()) {
							if (!layout[i]) {
								layout[i] = StatusBarItem.None;
							}
						}
					}
					return layout;
				}

				var layout = getLayout();
				const dropdowns: DropdownComponent[] = [];

				reloadStatusBarLayout = () => {
					layout = getLayout();
					dropdowns.forEach((cb, i) => cb.setValue(layout[i]));
					this.plugin.saveSettings();
				};

				for (const i of layout.keys()) {
					setting.addDropdown(cb => {
						dropdowns.push(cb);
						cb.addOptions({
							[StatusBarItem.None]: 'Disabled',
							[StatusBarItem.Text]: 'Artists - Title',
							[StatusBarItem.Play]: '\u25B6',
							[StatusBarItem.Prev]: '\u23EE',
							[StatusBarItem.Next]: '\u23ED',
						})
							.setValue(layout[i])
							.onChange(data => {
								layout[i] = data as StatusBarItem;
								this.plugin.settings.statusBarLayout = Array.from(layout);
								this.plugin.saveSettings();
							});
					});
				}

				setting.addExtraButton(cb =>
					cb.setIcon('rotate-ccw')
						.setTooltip('Reset to defaults')
						.onClick(() => {
							const setStatusBarLayout = (newLayout: StatusBarItem[]) => {
								// Reset to preset & update the dropdown controls
								this.plugin.settings.statusBarLayout = Array.from(newLayout);
								reloadStatusBarLayout();
							};

							const menu = new Menu();

							menu.addItem((item) =>
								item.setTitle('Choose a preset to use:')
									.setDisabled(true));

							STATUS_BAR_PRESETS.forEach(preset => {
								if (preset.name == '---') {
									menu.addSeparator();
								} else {
									menu.addItem((item) =>
										item.setTitle(preset.name)
											.setIcon(preset.icon ?? null)
											.onClick(() => setStatusBarLayout(preset.layout)));
								}
							});

							const br = cb.extraSettingsEl.getBoundingClientRect();
							menu.showAtPosition({
								x: br.x,
								y: br.y,
								width: br.width + 2,
							}, cb.extraSettingsEl.doc);
						})
				);
			});


		containerEl.createEl('h2', { text: 'Player Integrations' });

		new Setting(containerEl)
			.setName('Auto-login on startup')
			.setDesc('Enable automatic login on app startup.')
			.addToggle(cb => {
				cb.setValue(this.plugin.settings.autoLoginEnabled).onChange(data => {
					this.plugin.settings.autoLoginEnabled = data;
					this.plugin.saveSettings();
				});
			});

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
