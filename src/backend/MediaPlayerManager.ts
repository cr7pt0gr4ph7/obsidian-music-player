import MusicPlayerPlugin from "../main";
import { PlayerAction, PlaybackState, MediaPlayerService, PlayerStateOptions, PlayerState } from "./MediaPlayerService";
import { SpotifyLinkHandler } from "./handlers/SpotifyLinkHandler";

export class MediaPlayerManager implements MediaPlayerService {
	plugin: MusicPlayerPlugin;
	handlers: MediaPlayerService[];
	activeHandler: MediaPlayerService;

	constructor(plugin: MusicPlayerPlugin) {
		this.handlers = [
			new SpotifyLinkHandler(plugin)
		]
	}

	isLinkSupported(url: string): boolean {
		return this.handlers.some(h => h.isLinkSupported(url));
	}

	async openLink(url: string): Promise<void> {
		for (const h of this.handlers) {
			if (h.isLinkSupported(url)) {
				this.activeHandler = h;
				return await h.openLink(url);
			}
		}
	}

	async getPlayerState(options?: PlayerStateOptions): Promise<PlayerState> {
		// We have to decide which player's state should actually be returned.
		// Case 1: If the user has recently interacted with a player, we consider that one active.
		if (this.activeHandler) {
			return await this.activeHandler.getPlayerState(options);
		}

		// Case 2: Otherwise, look for the first player that is currently playing something.
		//         The result depends on the order of the handlers when multiple players
		//         are currently active, but at least its better than nothing. 
		for (const h of this.handlers) {
			const playerState = await h.getPlayerState(options);
			if (playerState.state === PlaybackState.Playing) {
				// Remember this player as the active player
				this.activeHandler = h;
				return playerState;
			}
		}

		// Case 3: There is no obviously active player, so we just wait
		//         until the user activates a player, or until one of the
		//         monitored players changes its state to "playing".
		return { state: PlaybackState.Disconnected };
	}

	async determineActiveHandler(): Promise<MediaPlayerService | null> {
		if (this.activeHandler) {
			return this.activeHandler;
		}

		for (const h of this.handlers) {
			const playerState = await h.getPlayerState();
			if (playerState.state === PlaybackState.Playing) {
				// Remember this player as the active player
				this.activeHandler = h;
				return h
			}
		}

		return null;
	}

	async performAction(action: PlayerAction): Promise<void> {
		return await (await this.determineActiveHandler())?.performAction(action);
	}
}
