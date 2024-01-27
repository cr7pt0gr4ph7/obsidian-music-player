import { PlaybackState as SpotifyPlaybackState } from "@spotify/web-api-ts-sdk";
import MusicPlayerPlugin from "../../main";
import { PlayerAction, PlaybackState, MediaPlayerService, PlayerStateOptions, PlayerState } from "../MediaPlayerService";
import { Notice } from "obsidian";
import { SpotifyAuthHandler } from "./SpotifyAuthHandler";

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

		await this.auth.withAuthentication({
			silent: false,
			onAuthenticated: async sdk => await this.sdk.player.startResumePlayback("", undefined, [url]),
			onFailure: async () => { }
		});
	}


	get auth() {
		return this.plugin.auth.get(SpotifyAuthHandler);
	}

	get sdk() {
		return this.auth.sdk;
	}

	async performAction(action: PlayerAction) {
		await this.auth.withAuthentication({
			silent: false,
			onAuthenticated: async sdk => {
				switch (action) {
					case PlayerAction.SkipToPrevious:
						new Notice("Previous track");
						await sdk.player.skipToPrevious("");
						break;
					case PlayerAction.SkipToNext:
						new Notice("Next track");
						await sdk.player.skipToNext("");
						break;
					case PlayerAction.Pause:
						new Notice("Pausing playback");
						await sdk.player.pausePlayback("");
						break;
					case PlayerAction.Resume:
						new Notice("Resuming playback");
						await sdk.player.startResumePlayback("");
						break;
				}
			},
			onFailure: async () => { }
		});
	}

	async getPlayerState(options?: PlayerStateOptions): Promise<PlayerState> {
		return await this.auth.withAuthentication({
			silent: true,
			onAuthenticated: async sdk => {
				const result = await this.sdk.player.getPlaybackState();
				const state = this.determinePlaybackState(result);
				const trackInfo = await this.getTrackInfo(result, options ?? null);
				return {
					state: state,
					source: this.name,
					track: {
						url: result?.item.external_urls.spotify,
						title: result?.item.name,
						artists: trackInfo?.artists,
						album: trackInfo?.album,
					}
				} as PlayerState;
			},
			onFailure: async () => {
				return { state: PlaybackState.Disconnected, source: this.name } as PlayerState;
			}
		});
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
