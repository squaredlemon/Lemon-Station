# Lemon Station

The product website will be published at https://lemonstation.com/ and the Lemon Station web app at https://lemonstation.com/test/.

#NOTE: The app's website version can browse sites that allow iframe embedding. Sites with restrictive security headers must be opened in a new tab; use the browser's Open in new tab button.

Static, Cloudflare Pages-ready build of Lemon Station v0.3. Lemon AI uses an optional Gemini backend that you deploy as a Cloudflare Worker; its API key stays in Cloudflare and is never bundled into the website or desktop app.

The Cloudflare Pages build is assembled in `docs/`: `docs/index.html` is the product showcase and `docs/test/` is the app preview. Connect this repository to Cloudflare Pages, use `sh scripts/build-pages-site.sh` as the build command, and set `docs` as the build output directory. Add `lemonstation.com` in the Cloudflare Pages project's **Custom domains** settings and point its Cloudflare DNS record at the Pages project.

On wide screens, Lemon Station keeps its navigation visible beside a spacious workspace; compact windows switch to a slide-out menu so the content stays usable.

Home Base search opens a dedicated browser workspace with a tab strip above its navigation and address/search toolbar, similar to a conventional desktop browser. It includes back/forward, reload, home, local bookmarks, searchable on-device history, recently closed tab recovery, four selectable search providers (Google, DuckDuckGo, Bing, and Brave), and keyboard shortcuts. History and browser preferences stay in local storage. The Electron desktop app uses its embedded browser; the website version uses a sandboxed iframe and offers **Open in new tab** for sites that block embedding or do not work in an iframe. Because browser security rules restrict iframe access, some sites may not display, and website-mode address/history details can be limited. Browser page extensions that modify page styles require the Electron desktop app.

Browser shortcuts: `⌘/Ctrl+L` focus the address bar, `⌘/Ctrl+T` open a Home Base tab, `⌘/Ctrl+W` close the current tab, `⌘/Ctrl+Shift+T` reopen a closed tab, `⌘/Ctrl+Y` open history, `⌘/Ctrl+1–9` switch tabs, `Ctrl+Tab` or `Ctrl+Shift+Tab` cycle tabs, and `Alt+←/→` go back or forward (except while editing the address field).

Lemon Station includes three independent workspaces—Default Hub, Development, and Entertainment. Each keeps its own shortcuts, tasks, and scratchpad notes in browser storage.

Use **Jump to anything** in the sidebar or press **⌘K / Ctrl+K** to find and open any page, tool, installed browser extension, or sidebar app. Open **Browser Store** in the sidebar to install Reader Mode, Focus Mode, or Dark Page; installed extensions appear beside your browser tabs and can be toggled for the current page. The Apps tab adds built-in tools such as Water Breaks, Daily Reflection, and Quick Converter to the sidebar. Add-ons are built into Lemon Station and do not download code.

## Accounts and cloud sync

To turn on account sync, open **Theme Config → Accounts & sync** and expand **First time? Set up sync**. Follow the four short steps there: make a free Supabase project, copy the provided database setup into **SQL Editor → New query** and click **Run**, paste your Project URL and Publishable key from **Project Settings → API**, then create your Lemon Station account. If sign-in says the cloud table is missing, run the database setup and sign in again; it is safe to run more than once. Never use a secret or service-role key. Local data stays on your device while signed out; signing in merges it with cloud data and keeps conflicting versions in `lemon_sync_conflicts`.

The Supabase JavaScript client is loaded from jsDelivr, so account sign-in and sync require an internet connection. Set the Supabase Auth site's URL and redirect allowlist to the hosted Lemon Station site for email confirmation. The public website uses browser-local storage; its users need to sign in to sync across browsers or devices.

Use **Theme Config → Backup & restore** to export or restore a JSON copy of local app data. Backups exclude the Supabase connection settings and authentication session.

## Lemon AI

Lemon AI can help plan a day, break a task into smaller steps, and suggest focus resets. To enable it, deploy the Cloudflare Worker in [`ai-worker/`](ai-worker/README.md), set your Gemini API key and a private access code as Worker secrets, then enter the Worker URL and access code in **Lemon AI**. The access code is kept in the current browser session and is not included in account sync or backups. The Worker restricts allowed site origins, validates and rate-limits requests, and does not store chats. Google Gemini usage limits and any applicable charges are controlled by your Google account.

The assistant sends the current conversation to Gemini. Open task titles are sent only when you check **Include my open tasks with this chat**; notes, clipboard history, and other account/workspace data are not sent. Chat transcripts remain in the current tab and are cleared when the page is reloaded.

## Desktop availability

The native desktop app is currently supported on macOS only. The hosted web app is browser-based and can be used on other platforms with a compatible browser. No public Mac installer is available yet; the ZIP download contains project files, not a ready-made installer.

To run the desktop app locally on macOS, install Node.js, open a terminal in this folder, and run:

```sh
npm install
npm start
```

The repository includes an experimental Windows packaging helper, but Windows is not a supported desktop release platform.