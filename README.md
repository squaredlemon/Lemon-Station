# Lemon Station

Static, GitHub Pages-ready build of Lemon Station v0.3. The AI assistant is marked **Coming soon**; no AI backend or API key is needed to host this version.

In the Electron desktop app, Home Base search switches to a dedicated full-screen browser workspace with tabs, address/search, back/forward, reload, home, and local bookmarks. The browser also includes searchable on-device history, recently closed tab recovery, four selectable search providers (Google, DuckDuckGo, Bing, and Brave), and keyboard shortcuts. History and browser preferences stay in local storage. The embedded browser requires Electron; static hosting cannot render arbitrary external sites inside the workspace.

Browser shortcuts: `⌘/Ctrl+L` focus the address bar, `⌘/Ctrl+T` open a Home Base tab, `⌘/Ctrl+W` close the current tab, `⌘/Ctrl+Shift+T` reopen a closed tab, `⌘/Ctrl+Y` open history, `⌘/Ctrl+1–9` switch tabs, `Ctrl+Tab` or `Ctrl+Shift+Tab` cycle tabs, and `Alt+←/→` go back or forward (except while editing the address field).

Lemon Station includes three independent workspaces—Default Hub, Development, and Entertainment. Each keeps its own shortcuts, tasks, and scratchpad notes in browser storage.

## Publish with GitHub Pages

1. Create a public repository under `Squaredlemon`, for example `Lemon-Station`.
2. Upload `index.html`, the `assets` folder, and the `src` folder to the repository root.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**, choose `main` and `/(root)`, then save.
5. Open the public URL shown in the Pages settings once deployment completes.

The browser profile image is in `assets/squaredlemon-profile.png`; keep the folder alongside `index.html`. The stylesheet and scripts in `src/css` and `src/js` are also required.
