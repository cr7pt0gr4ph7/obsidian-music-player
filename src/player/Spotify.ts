import { loadSpotifyWebPlaybackSdk } from './spotify-player'

export class SpotifyPlayer {
    player: Spotify.Player;

    load() {
        window.onSpotifyWebPlaybackSDKReady = () => {

            const token = '[your token]';

            console.log("Music Player | Spotify: Initializing Playback SDK");

            const player = new window.Spotify.Player({
                name: 'Obsidian',
                getOAuthToken: (cb: (token: string) => void) => {
                    console.log("Music Player | Spotify: Access token requested");
                    cb(token);
                },
                volume: 1
            });

            this.player = player;

            player.addListener('ready', ({ device_id }) => {
                console.log('Music Player | Spotify: Ready with Device ID', device_id);
            });

            player.addListener('not_ready', ({ device_id }) => {
                console.log('Music Player | Spotify: Device ID has gone offline', device_id);
            });

            player.connect();
        };

        loadSpotifyWebPlaybackSdk();
    }

    unload() {
        this.player?.disconnect();
    }
}
