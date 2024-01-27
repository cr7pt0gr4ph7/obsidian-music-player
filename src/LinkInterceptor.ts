class LinkInterceptor {
	private isLoaded: boolean = false;
	private onOpeningLink: (url: string) => boolean;

	constructor(options: { onOpeningLink: (url: string) => boolean }) {
		this.onOpeningLink = options.onOpeningLink;
	}

	installHooks() {
		console.debug("Music Player | Installing hook for window.open()");

		// This is very hacky, but until Obsidian provides a native extension point
		// for intercepting link navigations that works in all cases (live preview, reading view, source view...),
		// monkey-patching window.open is actually the best we can do.
		// @ts-expect-error
		if (!window.__original_open) {
			// @ts-expect-error
			window.__original_open = window.open;
		}

		window.open = this.onWindowOpenCalled.bind(this);
		this.isLoaded = true;
	}

	private onWindowOpenCalled(url?: string | URL, target?: string, features?: string): WindowProxy | null {
		if (this.isLoaded && url && this.onOpeningLink(url?.toString())) {
			// Link has been handled by us => Prevent default handling by returning early.
			return null;
		}

		// @ts-expect-error
		return window.__original_open(url, target, features);
	}

	uninstallHooks() {
		console.debug("Music Player | Uninstalling hook for window.open()");
		this.isLoaded = false;

		// @ts-expect-error
		if (window.__original_open) {
			// @ts-expect-error
			window.open = window.__original_open;
		}
	}
}
