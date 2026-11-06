# Image placeholders

- Companion art is in `companion/idle.svg`, `companion/walk-1.svg`, `companion/walk-2.svg`, and `companion/jump.svg`. `js/companion.js` and `js/runner.js` reference these files. Keep a transparent canvas and similar character framing so the position and collision size stay aligned.
- The supplied Chill scene is `chill_bg.jpg`. The interactive star canvas is layered over the window in `chill.html`; its position is in `css/style.css`. No cutout is needed for this image.
- Replace the runner scenery inside `js/runner.js`'s `drawBackground()`; the canvas element is `#rush-canvas` in `gaming.html`.
- Replace the homepage atmosphere in the `body` / `.sky` background rules in `css/style.css`.

The four companion SVGs are local artwork. No external image files are required to run the site.
