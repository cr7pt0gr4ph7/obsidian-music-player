import MusicPlayerPlugin from "../main";
import { SourceHandler } from "./SourceHandler";
import { SpotifyHandler } from "./handlers/SpotifyHandler";

export class SourceHandlerManager implements SourceHandler {
	plugin: MusicPlayerPlugin;
	handlers: SourceHandler[];

	constructor(plugin: MusicPlayerPlugin) {
		this.handlers = [
			new SpotifyHandler(plugin)
		]
	}

	isSupported(url: string): boolean {
		return this.handlers.some(h => h.isSupported(url));
	}

	async openLink(url: string): Promise<void> {
		for(const h of this.handlers) {
			if(h.isSupported(url)){
				return await h.openLink(url);
			}
		}
	}
}