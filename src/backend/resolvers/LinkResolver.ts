import { TrackInfo } from "src/types/TrackInfo";
import { CacheStrategy, InMemoryCache } from "./CacheStrategy";

export interface LinkInfo extends TrackInfo {
	readonly type: string;
	readonly title: string;
}

export interface LinkResolver {
	resolveLink(url: string): Promise<LinkInfo | null>;
}

export class NopLinkResolver implements LinkResolver {
	async resolveLink(url: string): Promise<LinkInfo | null> {
		return null;
	}
}

export class MultiLinkResolver implements LinkResolver {
	readonly resolvers: LinkResolver[]

	constructor(resolvers: LinkResolver[]) {
		this.resolvers = resolvers;
	}

	async resolveLink(url: string): Promise<LinkInfo | null> {
		for (const resolver of this.resolvers) {
			const result = await resolver.resolveLink(url);
			if (result) {
				return result;
			}
		}
		return null;
	}

}

export class CachingLinkResolver implements LinkResolver {
	readonly cache: CacheStrategy<string, LinkInfo> = new InMemoryCache<string, LinkInfo>();
	readonly resolver: LinkResolver;

	constructor(resolver: LinkResolver) {
		this.resolver = resolver;
	}

	async resolveLink(url: string): Promise<LinkInfo | null> {
		return await this.cache.getOrCreateAsync(url, u => this.resolver.resolveLink(u) ?? undefined) ?? null;
	}
}
