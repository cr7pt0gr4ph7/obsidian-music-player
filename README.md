# Music Player

This is a plugin for Obsidian (https://obsidian.md) that allows you to control various music streaming services from within Obsidian (At least in the future - currently only Spotify is supported. Contributions are welcome!).

This project uses Typescript to provide type checking and documentation, and depends on the Obsidian plugin API.

## Supported Services

The following streaming services and local players are currently supported:

| Player Service                     | Can display track info for links? | Can control a remote player? | Can play locally without an external player?                                                                                                                |
| ---------------------------------- | --------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Spotify](https://www.spotify.com) | *Yes*                             | *Yes*                        | *No* (Due to issues with DRM &mdash; Obsidian is running within a stripped-down version of chrome that does not support the DRM codecs required by Spotify) |

## Contributing

Contributions via bug reports, bug fixes, documentation, and general improvements are always welcome.

### Local development

This plugin uses the standard Obsidian plugin build setup with `npm` and `esbuild`.
For a first time set up, all you should need to do is:

- Clone this repo to a local development folder. For convenience, you can place this folder in the `.obsidian/plugins/obsidian-music-player` folder of your vault.
- Make sure your NodeJS is at least v16 (`node --version`).
- `npm install` to install dependencies.
- `npm run dev` to start compilation in watch mode.

### Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.

### Releasing new releases

- Update `manifest.json` with your new version number, such as `1.0.1`, and the minimum Obsidian version required for your latest release.
- Update `versions.json` file with `"new-plugin-version": "minimum-obsidian-version"` so older versions of Obsidian can download an older version of your plugin that's compatible.
- Create new GitHub release using your new version number as the "Tag version". Use the exact version number, don't include a prefix `v`. See here for an example: https://github.com/obsidianmd/obsidian-sample-plugin/releases
- Upload the files `manifest.json`, `main.js`, `styles.css` as binary attachments. Note: The manifest.json file must be in two places, first the root path of your repository and also in the release.
- Publish the release.

> You can simplify the version bump process by running `npm version patch`, `npm version minor` or `npm version major` after updating `minAppVersion` manually in `manifest.json`.
> The command will bump version in `manifest.json` and `package.json`, and add the entry for the new version to `versions.json`

### Plugin API Documentation for Obsidian

See https://github.com/obsidianmd/obsidian-api
