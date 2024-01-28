import MusicPlayerPlugin from "src/main";
import { LinkInfo, LinkResolver } from "../resolvers/LinkResolver";
import { SpotifyAuthHandler } from "./SpotifyAuthHandler";

export class SpotifyLinkResolver implements LinkResolver {
	readonly plugin: MusicPlayerPlugin;

	constructor(plugin: MusicPlayerPlugin) {
		this.plugin = plugin;
	}

	async resolveLink(url: string): Promise<LinkInfo | null> {
		return await this.plugin.authManager.get(SpotifyAuthHandler).withAuthentication<LinkInfo | null>({
			silent: true,
			onAuthenticated: async sdk => {
				const regex = /https:\/\/open\.spotify\.com\/track\/(?<track_id>.*)($|\?)/;
				const trackId = url.match(regex)?.[1];
				if (trackId) {
					const result = await sdk.tracks.get(trackId);
					return {
						source: 'Spotify',
						type: 'track',
						url: result.external_urls.spotify,
						title: result.name,
						track: result.name,
						artists: result.artists.map(a => a.name),
						album: result.album.name,
					};
				} else {
					return null;
				}
			},
			onFailure: async () => {
				return null;
			}
		})
	}
}
