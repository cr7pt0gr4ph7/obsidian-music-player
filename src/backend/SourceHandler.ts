export interface SourceHandler {
	isSupported(url: string): boolean
	openLink(url: string): Promise<void>
}
