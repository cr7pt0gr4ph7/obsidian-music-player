import MusicPlayerPlugin from "../../main";
import { PlayerAction, PlayerState, SourceHandler } from "../SourceHandler";
import { Notice } from "obsidian";

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
			await this.sdk.player.startResumePlayback("", undefined, [url]);
		} catch (e: any) {
			new Notice(e.toString());
			if (e instanceof Error && e.message.contains("Bad or expired token.")) {
				console.log("Token has expired");
				this.sdk.logOut();
				await this.plugin.auth.performAuthorization();
			}
		}
	}

	get sdk() {
		return this.plugin.auth.sdk;
	}

	async performAction(action: PlayerAction) {
		await this.plugin.auth.performAuthorization();
		try {
			switch (action) {
				case PlayerAction.SkipToPrevious:
					new Notice("Previous track");
					await this.sdk.player.skipToPrevious("");
					break;
				case PlayerAction.SkipToNext:
					new Notice("Next track");
					await this.sdk.player.skipToNext("");
					break;
				case PlayerAction.Pause:
					new Notice("Pausing playback");
					await this.sdk.player.pausePlayback("");
					break;
				case PlayerAction.Resume:
					new Notice("Resuming playback");
					await this.sdk.player.startResumePlayback("");
					break;
			}
		} catch (e: any) {
			new Notice(e.toString());
		}
	}

	async getPlayerTrack(): Promise<{ title: string, artists: string[] } | null> {
		// Do not request the user to authenticate if not authenticated here already.
		// This function is called from a periodic notification hook, and it would
		// be really annoying for the Spotify login screen to pop up every 5 seconds...
		if (!await this.sdk?.getAccessToken()) {
			return null;
		}

		try {
			const state = await this.sdk.player.getCurrentlyPlayingTrack();
			if (!state) {
				return null;
			}
			const track = await this.sdk.tracks.get(state?.item?.id);
			return {
				title: track.name,
				artists: track.artists.map(a => a.name)
			};
		} catch (e: any) {
			new Notice(e.toString());
			if (e instanceof Error) {
				// This is a total hack. It exists to invalidate a token that has expired,
				// to avoid retrying an infinite number of times with an expired token.
				// We should replace this logic with a custom SdkConfig.responseValidator.
				if (e.message.contains("Bad or expired token.")) {
					new Notice("Invalidating token");
					this.sdk.logOut();
				}
			}
			return null;
		}
	}

	async getPlayerState(): Promise<PlayerState> {
		// Do not request the user to authenticate if not authenticated here already.
		// This function is called from a periodic notification hook, and it would
		// be really annoying for the Spotify login screen to pop up every 5 seconds...
		if (!await this.sdk?.getAccessToken()) {
			return PlayerState.Disconnected;
		}

		try {
			const state = await this.sdk.player.getPlaybackState();
			if (state == null) {
				return PlayerState.Disconnected;
			}
			if (state.is_playing) {
				return PlayerState.Playing;
				// @ts-expect-error
			} else if (true || !state.actions?.disallows?.resuming) {
				return PlayerState.Paused;
			}
		} catch (e: any) {
			new Notice(e.toString());
			if (e instanceof Error) {
				// This is a total hack. It exists to invalidate a token that has expired,
				// to avoid retrying an infinite number of times with an expired token.
				// We should replace this logic with a custom SdkConfig.responseValidator.
				if (e.message.contains("Bad or expired token.")) {
					new Notice("Invalidating token");
					this.sdk.logOut();
				}
			}
		}

		// We are connected to the Spotify API, but there is no active/available
		// playback device connected to it, so we can't play any music.
		return PlayerState.Disconnected;
	}
}
