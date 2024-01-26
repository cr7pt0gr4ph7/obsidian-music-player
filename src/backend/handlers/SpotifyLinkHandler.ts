import MusicPlayerPlugin from "../../main";
import { SourceHandler } from "../SourceHandler";
import { Notice } from "obsidian";
import { SpotifyApi, AccessToken } from "@spotify/web-api-ts-sdk";

export enum PlayerState {
	Disconnected = 'disconnected',
	Playing = 'playing',
	Paused = 'paused'
}

export class SpotifyLinkHandler implements SourceHandler {
	plugin: MusicPlayerPlugin;

	constructor(plugin: MusicPlayerPlugin) {
		this.plugin = plugin;
	}

	isSupported(url: string): boolean {
		return url.startsWith("https://open.spotify.com");
	}

	async openLink(url: string): Promise<void> {
		new Notice(`Recognized spotify link: ${url}`);
		await this.plugin.auth.performAuthorization();

		try {
			await this.plugin.auth.sdk.player.startResumePlayback("", undefined, [url]);
		} catch (e: any) {
			new Notice(e.toString());
		}
	}

	get sdk() {
		return this.plugin.auth.sdk;
	}

	async getPlayerState(): Promise<PlayerState> {
		const state = await this.sdk.player.getPlaybackState();
		if (state.actions.pausing) {
			return PlayerState.Playing;
		}
		if (state.actions.resuming) {
			return PlayerState.Paused;
		}
		return PlayerState.Disconnected;
	}
}
