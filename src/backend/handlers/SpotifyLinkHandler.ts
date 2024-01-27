import { PlaybackState as SpotifyPlaybackState } from "@spotify/web-api-ts-sdk";
import MusicPlayerPlugin from "../../main";
import { PlayerAction, PlaybackState, MediaPlayerService, PlayerStateOptions, PlayerState } from "../MediaPlayerService";
import { Notice } from "obsidian";

export class SpotifyLinkHandler implements MediaPlayerService {
	plugin: MusicPlayerPlugin;

	constructor(plugin: MusicPlayerPlugin) {
		this.plugin = plugin;
	}

	get name() {
		return "Spotify";
	}

	isLinkSupported(url: string): boolean {
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

	async getPlayerState(options?: PlayerStateOptions): Promise<PlayerState> {
		// Do not request the user to authenticate if not authenticated here already.
		// This function is called from a periodic notification hook, and it would
		// be really annoying for the Spotify login screen to pop up every 5 seconds...
		if (!await this.sdk?.getAccessToken()) {
			return { state: PlaybackState.Disconnected, source: this.name };
		}

		try {
			const result = await this.sdk.player.getPlaybackState();
			const state = this.determinePlaybackState(result);
			const trackInfo = await this.getTrackInfo(result, options ?? null);
			return {
				state: state,
				source: this.name,
				track: {
					title: result?.item.name,
					artists: trackInfo?.artists,
					album: trackInfo?.album,
				}
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
		return { state: PlaybackState.Disconnected, source: this.name };
	}

	private determinePlaybackState(state: SpotifyPlaybackState | null) {
		if (state == null) {
			return PlaybackState.Disconnected;
		}
		if (state.is_playing) {
			return PlaybackState.Playing;
			// @ts-expect-error
		} else if (true || !state.actions?.disallows?.resuming) {
			return PlaybackState.Paused;
		}
	}

	async getTrackInfo(result: SpotifyPlaybackState, options: PlayerStateOptions | null): Promise<{ title?: string, artists?: string[], album?: string } | null> {
		if (!result || !(options?.include.track?.artists || options?.include.track?.album)) {
			return null;
		}
		const track = await this.sdk.tracks.get(result?.item?.id);
		return {
			title: track.name,
			artists: track.artists.map(a => a.name),
			album: track.album.name,
		};
	}
}
