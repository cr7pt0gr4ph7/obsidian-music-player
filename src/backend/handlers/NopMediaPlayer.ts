import { MediaPlayerService, PlaybackState, PlayerAction, PlayerState, PlayerStateOptions } from "../MediaPlayerService";

export class NopMediaPlayer implements MediaPlayerService {
	get name() {
		return "No media player";
	}

	isLinkSupported(url: string): boolean {
		return false;
	}

	async openLink(url: string): Promise<void> {
	}

	async performAction(action: PlayerAction): Promise<void> {
	}

	async getPlayerState(options?: PlayerStateOptions | undefined): Promise<PlayerState> {
		return { state: PlaybackState.Disconnected, source: this.name };
	}
}
