import { SpotifyApi, PlaybackState as SpotifyPlaybackState } from '@spotify/web-api-ts-sdk';
import MusicPlayerPlugin from '../../main';
import { PlayerAction, PlaybackState, MediaPlayerService, PlayerStateOptions, PlayerState } from '../player/MediaPlayerService';
import { Notice } from 'obsidian';
import { SpotifyAuthHandler } from './SpotifyAuthHandler';

export class SpotifyLinkHandler implements MediaPlayerService {
	plugin: MusicPlayerPlugin;

	constructor(plugin: MusicPlayerPlugin) {
		this.plugin = plugin;
	}

	get name() {
		return 'Spotify';
	}

	isEnabled() {
		return this.plugin.settings.integrations.spotify.enabled;
	}

	isLinkSupported(url: string): boolean {
		return url.startsWith('https://open.spotify.com');
	}

	async performAuthorization(options: { silent: boolean }): Promise<void> {
		await this.auth.performAuthorization(options);
	}

	async openLink(url: string): Promise<void> {
		new Notice(`Recognized spotify link: ${url}`);

		await this.auth.withAuthentication({
			silent: false,
			onAuthenticated: async sdk => await sdk.player.startResumePlayback('', undefined, [url]),
			onFailure: async () => { }
		});
	}

	get auth() {
		return this.plugin.authManager.get(SpotifyAuthHandler);
	}

	async performAction(action: PlayerAction) {
		await this.auth.withAuthentication({
			silent: false,
			onAuthenticated: async sdk => {
				switch (action) {
					case PlayerAction.SkipToPrevious:
						new Notice('Previous track');
						await sdk.player.skipToPrevious('');
						break;
					case PlayerAction.SkipToNext:
						new Notice('Next track');
						await sdk.player.skipToNext('');
						break;
					case PlayerAction.Pause:
						new Notice('Pausing playback');
						await sdk.player.pausePlayback('');
						break;
					case PlayerAction.Resume:
						new Notice('Resuming playback');
						await sdk.player.startResumePlayback('');
						break;
					case PlayerAction.AddToFavorites:
						const targetPlaylist = this.plugin.settings.integrations.spotify.saveToPlaylistId;
						if (!targetPlaylist || targetPlaylist.length == 0) {
							new Notice('Cannot add to favorites: No target Spotify playlist defined in settings')
							break;
						}
						const result = await sdk.player.getPlaybackState();
						if (!result.item?.uri || result.item.uri == '') {
							break;
						}
						console.log(`Add track ${result.item.uri} to ${targetPlaylist}`);
						await sdk.playlists.addItemsToPlaylist(targetPlaylist, [result.item.uri]);
						new Notice('Song added to favorites');
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
				const result = await sdk.player.getPlaybackState();
				const state = this.determinePlaybackState(result);
				const trackInfo = await this.getTrackInfo(sdk, result, options ?? null);
				const libraryInfo = await this.getLibraryInfo(sdk, result, options ?? null);
				return {
					state: state,
					source: this.name,
					track: {
						source: this.name,
						url: result?.item.external_urls.spotify,
						title: result?.item.name,
						duration_ms: result?.item.duration_ms,
						artists: trackInfo?.artists,
						album: trackInfo?.album,
						release_date: trackInfo?.release_date,
						is_in_library: libraryInfo?.is_in_library,
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

	async getTrackInfo(sdk: SpotifyApi, result: SpotifyPlaybackState, options: PlayerStateOptions | null): Promise<{ title?: string, artists?: string[], album?: string, release_date?: string } | null> {
		if (!result || !(options?.include.track?.artists || options?.include.track?.album)) {
			return null;
		}
		const track = await sdk.tracks.get(result?.item?.id);
		return {
			title: track.name,
			artists: track.artists.map(a => a.name),
			album: track.album.name,
			release_date: track.album.release_date,
		};
	}

	async getLibraryInfo(sdk: SpotifyApi, result: SpotifyPlaybackState, options: PlayerStateOptions | null): Promise<{ is_in_library: boolean } | null> {
		if (!result || !options?.include.track?.is_in_library) {
			return null;
		}
		const isSaved = await sdk.currentUser.tracks.hasSavedTracks([result.item.id]);
		if (isSaved[0]) {
			return { is_in_library: true };
		}
		return { is_in_library: false };
	}
}
