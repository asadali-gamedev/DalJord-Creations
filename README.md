# Daljord Creations website

A multi-page, 3D animated studio website. Plain HTML, CSS and JavaScript with no build step: edit a file, refresh, done.

## Open it

Double-click `index.html`. Everything works straight from disk, including the 3D scene and all content, because the data files are JavaScript rather than JSON.

Or run a local server from this folder:

```
python -m http.server 8765
```

Then open http://127.0.0.1:8765.

## Deploy

Upload the whole `daljord-website` folder to any static host: Netlify (drag and drop), Vercel, Cloudflare Pages, GitHub Pages or your own server. There is nothing to install or compile.

Set `404.html` as the not-found page if your host asks. Netlify and GitHub Pages pick it up automatically.

## File structure

```
daljord-website/
├── index.html                 Home: 3D shield, games, demo, workshop, update, studio
├── games/index.html           3D coverflow, all games, playable demo
├── projects/index.html        Pipeline board and project cards ("Workshop" in the nav)
├── updates/index.html         Studio log timeline
├── studio/index.html          About, manifesto, process loop, values
├── contact/index.html         Email, copy button, enquiry topics
├── 404.html                   Not-found page
└── assets/
    ├── css/
    │   ├── base.css           Colours, fonts, buttons, chips   ← change the brand here
    │   ├── layout.css         Nav, menu, loader, page transitions, cursor, footer, heroes
    │   ├── components.css     Cards, coverflow, demo, projects, board, timeline, contact
    │   └── pages.css          Page-specific layout
    ├── js/
    │   ├── data/              ← EDIT CONTENT HERE
    │   │   ├── site.js        Studio name, email, navigation, footer links
    │   │   ├── games.js       Published games and store links
    │   │   ├── projects.js    Workshop projects and pipeline stages
    │   │   ├── updates.js     Studio news
    │   │   └── brand-texture.js   Logo for the 3D scene (embedded image)
    │   ├── core/
    │   │   ├── performance.js Device hints and rendering budgets for desktop and phones
    │   │   ├── layout.js      Builds header and footer, boot loader, page transitions
    │   │   └── motion.js      All animation: word reveals, marquees,
    │   │                      magnetic buttons, tilt, scroll-lit words, card stacks, cursor
    │   ├── components/
    │   │   ├── render.js      Turns data files into cards, coverflow, board and timeline
    │   │   └── chain-demo.js  The playable chain reaction game
    │   ├── scene/
    │   │   └── world.js       The 3D world: sky, mountains, grid, particles, shield, warp
    │   ├── vendor/three/      three.js r128 (MIT licence), bundled so no CDN is needed
    │   └── main.js            Starts everything on each page
    └── images/
        ├── brand/             Logo, shield, icons, social sharing image
        ├── games/             Game icons (512 × 512)
        ├── projects/          Project artwork
        └── scenes/            Studio sign and sunset fallback art
```

## Common edits

**Add a game:** open `assets/js/data/games.js`, copy one block, change the fields, and put a 512 × 512 image in `assets/images/games/`. It appears on the home page, the games page coverflow, the pipeline board and the footer automatically.

**Add an update:** add a block to the top of `assets/js/data/updates.js`.

**Move a project to a new stage:** change `stage` in `assets/js/data/projects.js` to `concept`, `early`, `development` or `released`. The board and progress bar update themselves. Give an unannounced project an empty `image` and it shows as a locked "Classified" card.

**Change the email or nav:** `assets/js/data/site.js`.

**Add privacy or terms pages:** create e.g. `privacy/index.html` (copy `contact/index.html` as a starting point), then add it to `legal` in `site.js` so it appears in the footer.

**Change colours or fonts:** the variables at the top of `assets/css/base.css`.

**Change the particle word on a page:** the `data-word` attribute on that page's `<body>`.

**Change the logo in 3D:** replace the image data in `brand-texture.js` with your new logo as a base64 WebP or PNG (a square crop of just the shield works best). It is embedded rather than linked because browsers block reading image pixels from disk, and the particles are built from those pixels.

## Animation opt-in attributes

Add these to any element in any page:

| Attribute | Effect |
|---|---|
| `data-split` | Hero words rise into place with a subtle depth transition |
| `data-text-reveal` | Complete words reveal from a mask when scrolled into view |
| `data-reveal` | Fades up; `="clip"` wipes an image in; `="zoom"` scales in |
| `data-magnetic` | Button leans toward the cursor |
| `data-tilt` | Card tilts in 3D under the cursor |
| `data-words="a,b"` | Paragraph lights up word by word on scroll, listed words glow cyan |
| `data-marquee` | Scrolling band that speeds up and skews with scroll speed |
| `data-render="…"` | Inserts data-driven content: `game-cards`, `coverflow`, `project-stack`, `board`, `timeline` |
| `data-chain-demo` | Inserts the playable demo |
| `data-hero` | Clicking inside it explodes and rebuilds the 3D particles |

## Performance and accessibility

- Device budgets live in `assets/js/core/performance.js`. Desktop starts with 9,000 hero particles and bloom; phones use 2,800 particles without the bloom passes. Devices reporting 4 GB RAM or fewer, four CPU cores or fewer, or Data Saver start with 1,400 particles and a smaller pixel budget. Missing hardware hints are handled normally.
- Resolution is capped by both pixel density and a total pixel budget. Sustained slow frames lower resolution and particle count further, then cap 3D at 30 fps if necessary. This aims for 60 fps when the device can sustain it; real results depend on the GPU, battery settings, and temperature.
- On phones, the background renders at up to 30 fps below the hero, leaving more time for scrolling and the playable demo. Off-screen effects and hidden-tab animation stop; the demo renders only while visible and playing.
- Phones skip the artificial startup loader and use lighter navigation, image reveals, and card effects. Text animates complete words with transforms and opacity; it never substitutes random characters.
- With "reduce motion" turned on before loading, text appears immediately and the 3D scene renders on demand as you scroll or resize.
- Without WebGL, or while the graphics context is lost, the page shows the industrial sunset artwork. The scene resumes if the context is restored.
- Keyboard: every control is reachable; the demo is playable with arrow keys and Enter; the coverflow responds to arrow keys.

### Mobile verification

Serve the site locally and check 320–430 px phones, tablet portrait/landscape, and desktop. Scroll through every section, use the mobile menu, swipe the games, start/replay the demo, rotate the screen, and switch tabs. Repeat with reduced motion and with WebGL disabled. Check a real low-end Android phone as well: desktop emulation cannot reproduce its GPU, thermal throttling, or battery saver.

The optional browser regression check is in `tests/mobile.cjs`. It needs Node.js and Playwright, but the website itself still has no build step:

```powershell
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node tests/mobile.cjs
```

## Requirements

Only Google Fonts (Unbounded and Instrument Sans) loads from the internet. Without a connection, the site falls back to system fonts and everything else still works.
