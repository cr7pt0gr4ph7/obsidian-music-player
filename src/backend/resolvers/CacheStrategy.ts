export interface CacheStrategy<K, V> {
	get(key: K): V | undefined;
	getOrCreate(key: K, create: (key: K) => V | undefined): V;
	getOrCreateAsync(key: K, create: (key: K) => Promise<V | null>): Promise<V | undefined>;
	remove(key: K): void;
	set(key: K, value: V): void;
}

export class InMemoryCache<K, V> implements CacheStrategy<K, V> {
	readonly map: Map<K, V> = new Map();

	get(key: K): V | undefined {
		return this.map.get(key);
	}

	getOrCreate(key: K, create: (key: K) => V): V {
		const existingOrUndefined = this.map.get(key);
		if (typeof (existingOrUndefined) !== 'undefined') {
			return existingOrUndefined;
		}
		else {
			const newValue = create(key);
			if (typeof (newValue) !== 'undefined') {
				this.map.set(key, newValue);
			}
			return newValue;
		}
	}

	async getOrCreateAsync(key: K, create: (key: K) => Promise<V>): Promise<V> {
		const existingOrUndefined = this.map.get(key);
		if (typeof (existingOrUndefined) !== 'undefined') {
			return existingOrUndefined;
		}
		else {
			// TODO: Concurrent resolution attempts are handled by running multiple
			//       create functions concurrently - this may not be what we want.
			const newValue = await create(key);
			if (typeof (newValue) !== 'undefined') {
				this.map.set(key, newValue);
			}
			return newValue;
		}
	}

	remove(key: K): void {
		this.map.delete(key);
	}

	set(key: K, value: V): void {
		this.map.set(key, value);
	}
}
