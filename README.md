# STILL ALIVE.

A cozy static university stress-relief playground made with vanilla HTML, CSS, and JavaScript. No build step or account is needed. Progress and preferences live in browser `localStorage`.

## Pages

- `index.html` — the main hideout, editable comfort quotes, settings, time, and shared audio controls.
- `chill.html` — a full-screen lo-fi room with a capybara companion that wanders, runs, sleeps, and eats. Settings can show or hide the pet. Touch or click the companion to interact. It also works as a standalone page.
- `gaming.html` — Deadline Rush, a side-scrolling arcade runner. Beating 10,000 m with 10,000 points unlocks `secret.html`.
- `secret.html` — a small placeholder easter egg room with a CSS tree animation.

When opened from `index.html`, Chill and Game load inside the activity frame. This keeps the main music and rain controls alive while switching activities. Open `chill.html` or `gaming.html` directly for a standalone view.

## Run locally

From this folder, run `python -m http.server` and open `http://localhost:8000`. This serves the pages from one origin so navigation and saved settings work together. The time service needs an internet connection; it falls back to your device clock when unavailable.

## Publish with GitHub Pages

Push this folder to a GitHub repository, then open **Settings → Pages**, choose the branch and `/ (root)` folder, and save.

## Customize quotes

Open **Settings → Comfort quotes**. Add, edit, or remove quote lines; they rotate automatically every 12 seconds. Changes save in this browser. Edit `js/quotes.js` to change the starter set.

## Placeholder files and replacement points

- Rain ambience streams from the hosted `rain.mp3` URL set on the shared audio element in `js/site.js`. Rain controls are in Settings and are wired by `js/audio.js`.
- The companion sprites are in `assets/images/companion/`: `idle.svg`, `walk-1.svg`, `walk-2.svg`, and `jump.svg`. The capybara wanders and runs around the screen, pausing to sleep or eat. Movement speed is set in `js/companion.js`. Replace these files with final art using the same names and transparent canvas size.
- Homepage background colors are in `css/style.css` on `body` / `.sky`.
- Chill background: `assets/images/chill_bg.jpg`. The transparent star canvas is aligned over the window in `chill.html`; adjust its placement in `css/style.css` if you replace the image with a different size or crop.
- Runner background is drawn in `js/runner.js`'s `drawBackground()`; replace that function or use a CSS image on `#rush-canvas` in `css/style.css`.
- Runner character art uses the same companion jump/walk files. Deadline obstacles are drawn with canvas shapes and emoji as temporary art.

The `assets/images/README.md` and `assets/audio/README.md` files repeat the asset locations. The site works without any optional audio or image files.

## Other settings

- Automatic theme: dark/night is the default. Enable **Automatic day / night** to use day from 06:00–21:59 and night from 22:00–05:59.
- Clock: internet sync uses your device time zone through [UTCTime's keyless API](https://utctime.app/api), then refreshes periodically. The device clock is used if the service is unavailable. Set a deadline in Settings to use the home screen countdown.
- Music: choose a local audio file for audio-only playback, or load a YouTube video/playlist. The player has a close button; YouTube playback follows YouTube's controls. Hiding the Music shortcut does not stop playback. Add a permanent local track at `assets/audio/music.mp3`.
- Achievements and secret events are in `js/achievements.js`; global save defaults and migration are in `js/storage.js`.

## Current build

The clicker has been removed. The former Void is now a Desktop Companion with wandering, running, sleep, eating, reactions, and unlockable looks. Deadline Boss Rush is a jump-and-run game with coffee pickups and assignment bosses. Quotes rotate automatically, time sync runs by default with device-clock fallback, and the home page can show a saved deadline countdown.
