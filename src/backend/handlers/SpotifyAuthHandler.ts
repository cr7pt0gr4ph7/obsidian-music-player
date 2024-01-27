import { AccessToken, AuthorizationCodeWithPKCEStrategy, LocalStorageCachingStrategy, SpotifyApi } from "@spotify/web-api-ts-sdk";
import MusicPlayerPlugin from "../../main";
import { Notice } from "obsidian";
import { AuthService } from "../AuthService";

interface SpotifyRedirectParameters {
    code: string;
}

export class SpotifyAuthHandler implements AuthService {
    plugin: MusicPlayerPlugin;
    sdk: SpotifyApi;

    // private readonly cache = new InMemoryCachingStrategy();
    private readonly cache = new LocalStorageCachingStrategy();

    constructor(plugin: MusicPlayerPlugin) {
        this.plugin = plugin;
    }

    async withAuthentication<T>(options: { silent: boolean, onAuthenticated: (sdk: SpotifyApi) => Promise<T>, onFailure: () => Promise<T> }): Promise<T> {
        if (options.silent) {
            // Do not request the user to authenticate if not authenticated here already.
            // This function is called from a periodic notification hook, and it would
            // be really annoying for the Spotify login screen to pop up every 5 seconds...
            if (!await this.sdk?.getAccessToken()) {
                return await options.onFailure();
            }
            try {
                await this.performAuthorization({ silent: true });
                return await options.onAuthenticated(this.sdk);
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
            return await options.onFailure();
        } else {
            await this.performAuthorization({ silent: false });

            try {
                return await options.onAuthenticated(this.sdk);
            } catch (e: any) {
                new Notice(e.toString());
                if (e instanceof Error && e.message.contains("Bad or expired token.")) {
                    console.log("Token has expired");
                    this.sdk.logOut();
                    await this.performAuthorization({ silent: false });
                }
            }

            return await options.onFailure();
        }
    }

    async performAuthorization(options: { silent: boolean }): Promise<void> {
        if (!this.sdk) {
            var clientId = 'e42b562de94244ab94dc08303fc2b23a';
            var redirectUri = 'obsidian://music-player-auth-flow?target=spotify';
            var scopes = ['user-modify-playback-state', 'user-read-playback-state'];
            this.sdk = SpotifyApi.withUserAuthorization(clientId, redirectUri, scopes, {
                cachingStrategy: this.cache
            });
        }

        if (!options.silent) {
            await this.sdk.currentUser.profile();
        }
    }

    receiveAuthFlow(parameters: any) {
        this.receiveRedirect(parameters as unknown as SpotifyRedirectParameters);
    }

    async receiveRedirect(parameters: SpotifyRedirectParameters) {
        console.debug(`Received auth flow parameters`);
        await this.verifyAndExchangeCode(parameters.code);
        new Notice("Spotify: Successfully authenticated");
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
