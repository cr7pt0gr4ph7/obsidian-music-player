import { App, MarkdownView } from "obsidian";

export function getLinkUrlFromElement(el: HTMLElement): string | null {
	if (el.classList.contains("external-link") || el.matches(".cm-url *") || el.matches(".cm-link *")) {
		const href = el.getAttribute("href");
		if (href) {
			return href;
		}
	}
	return null;
}

export function getLinkUrlFromLivePreview(app: App, e: MouseEvent) {
	var mv = app.workspace.getActiveViewOfType(MarkdownView);
	// @ts-expect-error
	var editor = mv?.currentMode?.editor;
	var t;
	try {
		t = editor.getClickableTokenAt(editor.posAtMouse(e));
	} catch {
		t = null;
	}
	return t.text;
}
