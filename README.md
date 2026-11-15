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
    │   │   ├── layout.js      Builds header and footer, boot loader, page transitions
    │   │   └── motion.js      All animation: letters, decode text, reveals, marquees,
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
| `data-split` | Headline letters fly in |
| `data-scramble` | Text decodes like a terminal when scrolled into view |
| `data-reveal` | Fades up; `="clip"` wipes an image in; `="zoom"` scales in |
| `data-magnetic` | Button leans toward the cursor |
| `data-tilt` | Card tilts in 3D under the cursor |
| `data-words="a,b"` | Paragraph lights up word by word on scroll, listed words glow cyan |
| `data-marquee` | Scrolling band that speeds up and skews with scroll speed |
| `data-render="…"` | Inserts data-driven content: `game-cards`, `coverflow`, `project-stack`, `board`, `timeline` |
| `data-chain-demo` | Inserts the playable demo |
| `data-hero` | Clicking inside it explodes and rebuilds the 3D particles |

## Performance and accessibility

- The 3D scene pauses when the tab is hidden, caps pixel density on phones, and uses fewer particles on small screens.
- With "reduce motion" turned on in the operating system, the camera, particles, curtains and text effects calm down or switch off.
- Without WebGL, the page shows the industrial sunset artwork instead of the 3D scene.
- Keyboard: every control is reachable; the demo is playable with arrow keys and Enter; the coverflow responds to arrow keys.

## Requirements

Only Google Fonts (Unbounded and Instrument Sans) loads from the internet. Without a connection, the site falls back to system fonts and everything else still works.
