export interface TrackInfo {
	source: string;
	url?: string;
	title?: string;
	artists?: string[];
	album?: string;
	release_date?: string;
	duration_ms?: number;
	is_in_library?: boolean;
}
