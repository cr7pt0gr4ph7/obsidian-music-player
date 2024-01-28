import MusicPlayerPlugin from "../../main";
import { PlayerAction, PlaybackState, MediaPlayerInfo, MediaPlayerService, PlayerStateOptions, PlayerState } from "./MediaPlayerService";
import { NopMediaPlayer } from "./NopMediaPlayer";
import { SpotifyLinkHandler } from "../spotify/SpotifyLinkHandler";

export class MediaPlayerManager implements MediaPlayerService {
	plugin: MusicPlayerPlugin;
	allPlayers: MediaPlayerService[];
	availablePlayers: MediaPlayerService[];
	activePlayer: MediaPlayerService | null;

	constructor(plugin: MusicPlayerPlugin) {
		this.activePlayer = null;
		this.allPlayers = [
			new NopMediaPlayer(),
			new SpotifyLinkHandler(plugin)
		]
		this.updateAvailablePlayers();
	}

	updateAvailablePlayers() {
		this.availablePlayers = this.allPlayers.filter(player => player.isEnabled());
		if (this.activePlayer && !this.availablePlayers.contains(this.activePlayer)) {
			this.activePlayer = null;
		}
	}

	getAvailablePlayers(): MediaPlayerService[] {
		return this.availablePlayers;
	}

	selectPlayer(player: MediaPlayerInfo) {
		if (!this.availablePlayers.contains(player as MediaPlayerService)) {
			throw Error("The specified player does not belong to this MediaPlayerManager");
		}
		this.activePlayer = player as MediaPlayerService;
	}

	isActivePlayer(player: MediaPlayerInfo): boolean {
		if (!this.availablePlayers.contains(player as MediaPlayerService)) {
			throw Error("The specified player does not belong to this MediaPlayerManager");
		}
		return this.activePlayer === player;
	}

	get name(): string {
		return this.activePlayer?.name ?? "No player selected";
	}

	isEnabled(): boolean {
		return true;
	}

	isLinkSupported(url: string): boolean {
		return this.availablePlayers.some(h => h.isLinkSupported(url));
	}

	async openLink(url: string): Promise<void> {
		for (const h of this.availablePlayers) {
			if (h.isLinkSupported(url)) {
				this.activePlayer = h;
				return await h.openLink(url);
			}
		}
	}

	async getPlayerState(options?: PlayerStateOptions): Promise<PlayerState> {
		// We have to decide which player's state should actually be returned.
		// Case 1: If the user has recently interacted with a player, we consider that one active.
		if (this.activePlayer) {
			return await this.activePlayer.getPlayerState(options);
		}

		// Case 2: Otherwise, look for the first player that is currently playing something.
		//         The result depends on the order of the handlers when multiple players
		//         are currently active, but at least its better than nothing. 
		for (const h of this.availablePlayers) {
			const playerState = await h.getPlayerState(options);
			if (playerState.state === PlaybackState.Playing) {
				// Remember this player as the active player
				this.activePlayer = h;
				return playerState;
			}
		}

		// Case 3: There is no obviously active player, so we just wait
		//         until the user activates a player, or until one of the
		//         monitored players changes its state to "playing".
		return { state: PlaybackState.Disconnected };
	}

	async determineSelectedPlayer(): Promise<MediaPlayerService | null> {
		if (this.activePlayer) {
			return this.activePlayer;
		}

		for (const h of this.availablePlayers) {
			const playerState = await h.getPlayerState();
			if (playerState.state === PlaybackState.Playing) {
				// Remember this player as the active player
				this.activePlayer = h;
				return h
			}
		}

		return null;
	}

	async performAction(action: PlayerAction): Promise<void> {
		return await (await this.determineSelectedPlayer())?.performAction(action);
	}

	async performAuthorization(options: { silent: boolean }): Promise<void> {
		await this.activePlayer?.performAuthorization(options);
	}
}
