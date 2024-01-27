import { AuthService } from "./AuthService";
import MusicPlayerPlugin from "src/main";

export class AuthManager {
	plugin: MusicPlayerPlugin;
	services: Map<any, AuthService>

	constructor(plugin: MusicPlayerPlugin) {
		this.plugin = plugin;
		this.services = new Map();
	}

	register<T extends AuthService>(type: new (plugin: MusicPlayerPlugin) => T) {
		this.services.set(type, new type(this.plugin));
	}

	get<T extends AuthService>(type: new (plugin: MusicPlayerPlugin) => T): T {
		return this.services.get(type as any) as T;
	}

	receiveAuthFlow(parameters: any): void {
		this.services.forEach((v, k) => {
			v.receiveAuthFlow(parameters);
		});
	}
}
