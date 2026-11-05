# Lemon Station product website

This folder is the separate product landing page for Lemon Station. It is plain HTML, CSS, and JavaScript with no build step.

## Preview locally

From this directory, run:

```sh
python3 -m http.server 8786
```

Then open `http://127.0.0.1:8786`.

## Deploy the site and app together with Cloudflare Pages

The Cloudflare Pages output is assembled in `docs/`: the marketing page is the domain root, and the current Lemon Station web app is copied to `docs/test/`. The public URLs are `https://lemonstation.app/` and `https://lemonstation.app/test/`.

Connect the repository to Cloudflare Pages with the project root set to the repository root, build command `sh scripts/build-pages-site.sh`, and build output directory `docs`. The app and marketing site are static; no framework or dependency install is needed. The generated `docs/` directory is also suitable for a direct Pages deploy with Wrangler.

In the Cloudflare Pages project, add `lemonstation.app` as a custom domain and point its Cloudflare DNS record to that Pages project (the Cloudflare dashboard provides the target). Use `https://lemonstation.app/` for the showcase and `https://lemonstation.app/test/` for the app preview.

## Download links

- **Try the app** opens the current public web app.
- **Download Lemon Station ZIP** points to `downloads/Lemon-Station.zip`, a ZIP packaged with this site. It contains the project files, not a native desktop installer.
- The native desktop app currently targets macOS only; a public Mac installer is not currently published. The hosted web app remains browser-based. Replace the download CTA with an installer when a distributable Mac build is available.

To rebuild the direct-download ZIP after updating the app source, run `scripts/build-download.sh` from the Lemon Station project root.

The feature descriptions intentionally call out optional setup and limitations: site embedding depends on the destination site's iframe policy, cloud sync requires user-configured Supabase, and Lemon AI requires a separately deployed Cloudflare Worker and Gemini API key.
