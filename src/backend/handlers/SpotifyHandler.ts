import MusicPlayerPlugin from "src/main";
import { SourceHandler } from "../SourceHandler";
import { Notice } from "obsidian";

export class SpotifyHandler implements SourceHandler {
	plugin: MusicPlayerPlugin;

	constructor(plugin: MusicPlayerPlugin) {
		this.plugin = plugin;
	}

	isSupported(url: string): boolean {
		return url.startsWith("https://open.spotify.com");
	}

	async openLink(url: string): Promise<void> {
		new Notice(`Recognized spotify link: ${url}`);
	}
}
