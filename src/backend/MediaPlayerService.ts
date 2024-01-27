export enum PlaybackState {
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

export interface PlayerState {
	state: PlaybackState,
	track?: {
		title?: string,
		artists?: string[],
		album?: string;
	}
}

export interface PlayerStateOptions {
	/**
	 * Specifies which fields should be retrieved.
	 */
	include: Omit<FieldSelector<PlayerState>, 'state'>
}

type FieldSelector<Type> =
	Type extends string ? boolean
	: Type extends string[] ? boolean
	: { [Property in keyof Type]?: FieldSelector<Type[Property]> };

export interface MediaPlayerService {
	isLinkSupported(url: string): boolean;
	openLink(url: string): Promise<void>;
	performAction(action: PlayerAction): Promise<void>;
	getPlayerState(options?: PlayerStateOptions): Promise<PlayerState>;
}
