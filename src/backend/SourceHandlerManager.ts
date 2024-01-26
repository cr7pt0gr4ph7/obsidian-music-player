import MusicPlayerPlugin from "../main";
import { PlayerAction, PlayerState, SourceHandler } from "./SourceHandler";
import { SpotifyLinkHandler } from "./handlers/SpotifyLinkHandler";

export class SourceHandlerManager implements SourceHandler {
	plugin: MusicPlayerPlugin;
	handlers: SourceHandler[];
	activeHandler: SourceHandler;

	constructor(plugin: MusicPlayerPlugin) {
		this.handlers = [
			new SpotifyLinkHandler(plugin)
		]
	}

	isSupported(url: string): boolean {
		return this.handlers.some(h => h.isSupported(url));
	}

	async openLink(url: string): Promise<void> {
		for (const h of this.handlers) {
			if (h.isSupported(url)) {
				this.activeHandler = h;
				return await h.openLink(url);
			}
		}
	}

	async getPlayerState(): Promise<PlayerState> {
		// We have to decide which player's state should actually be returned.
		// Case 1: If the user has recently interacted with a player, we consider that one active.
		if (this.activeHandler) {
			return await this.activeHandler.getPlayerState();
		}

		// Case 2: Otherwise, look for the first player that is currently playing something.
		//         The result depends on the order of the handlers when multiple players
		//         are currently active, but at least its better than nothing. 
		for (const h of this.handlers) {
			const state = await h.getPlayerState();
			if (state === PlayerState.Playing) {
				// Remember this player as the active player,
				// until the user 
				this.activeHandler = h;
				return state;
			}
		}

		// Case 3: There is no obviously active player, so we just wait
		//         until the user activates a player, or until one of the
		//         monitored players changes its state to "playing".
		return PlayerState.Disconnected;
	}

	async getPlayerTrack(): Promise<{ title: string; artists: string[]; } | null> {
		// TODO: determineActivePlayer()
		return await this.activeHandler?.getPlayerTrack(); 
	}

	async performAction(action: PlayerAction): Promise<void> {
		// TODO: determineActivePlayer()
		return await this.activeHandler?.performAction(action);
	}
}
