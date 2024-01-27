export enum PlayerState {
	Disconnected = 'disconnected',
	Playing = 'playing',
	Paused = 'paused',
	Stopped = 'stopped',
}

export enum PlayerAction {
	Pause = 'pause',
	Resume = 'resume',
	SkipToPrevious = 'previous',
	SkipToNext = 'next',
}

export interface MediaPlayerService {
	isSupported(url: string): boolean;
	openLink(url: string): Promise<void>;
	performAction(action: PlayerAction): Promise<void>;
	getPlayerState(): Promise<PlayerState>;
	getPlayerTrack(): Promise<{ title: string, artists: string[] } | null>;
}
