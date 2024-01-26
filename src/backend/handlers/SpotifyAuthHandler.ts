import { AccessToken, AuthorizationCodeWithPKCEStrategy, ICachable, InMemoryCachingStrategy, LocalStorageCachingStrategy, SpotifyApi } from "@spotify/web-api-ts-sdk";
import MusicPlayerPlugin from "../../main";
import { ObsidianProtocolData } from "obsidian";

interface SpotifyRedirectParameters {
    code: string;
}

export class SpotifyAuthHandler {
    plugin: MusicPlayerPlugin;
    sdk: SpotifyApi;

    // private readonly cache = new InMemoryCachingStrategy();
    private readonly cache = new LocalStorageCachingStrategy();

    constructor(plugin: MusicPlayerPlugin) {
        this.plugin = plugin;
    }

    async performAuthorization(): Promise<void> {
        if (!this.sdk) {
            var clientId = 'e42b562de94244ab94dc08303fc2b23a';
            var redirectUri = 'obsidian://music-player-auth-flow';
            var scopes = ['user-modify-playback-state'];
            this.sdk = SpotifyApi.withUserAuthorization(clientId, redirectUri, scopes, {
                cachingStrategy: this.cache
            });
        }
    }

    receiveObsidianProtocolAction(parameters: ObsidianProtocolData) {
        this.receiveRedirect(parameters as unknown as SpotifyRedirectParameters);
    }

    async receiveRedirect(parameters: SpotifyRedirectParameters) {
        console.debug(`Received auth flow parameters`);
        await this.verifyAndExchangeCode(parameters.code);;
    }

    private async verifyAndExchangeCode(code: string) {
        // The Spotify SDK normally expects to directly receive the code as an URL parameter
        // on window.location, so we have to poke around its internals a bit to make it work regardless.
        //
        // The alternative would basically be to reimplement the authorization strategy,
        // so its "more boilerplate code" vs. "hacking around internals"...
        // The internal interface is quite well defined, so we go with this for now. 

        // @ts-expect-error
        const strategy = this.sdk.authenticationStrategy as AuthorizationCodeWithPKCEStrategy;
        // @ts-expect-error
        const token = await strategy.verifyAndExchangeCode(code) as AccessToken;
        this.cache.set('spotify-sdk:AuthorizationCodeWithPKCEStrategy:token', token, SpotifyAuthHandler.calculateExpiry(token));
    }

    static calculateExpiry(item: AccessToken): number {
        return Date.now() + (item.expires_in * 1000);
    }
}
