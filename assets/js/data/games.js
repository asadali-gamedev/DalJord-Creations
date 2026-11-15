/* ==========================================================================
   PUBLISHED GAMES
   Add a game by copying one block. "color" tints its card and glow.
   Images live in assets/images/games/ (square, 512 x 512 works best).
   ========================================================================== */
window.DJ = window.DJ || {};

DJ.games = [
  {
    id: "farm-tycoon",
    title: "Idle Farm Tycoon: Empire Farm",
    short: "Idle Farm Tycoon",
    genre: "Idle tycoon",
    platform: "Android",
    status: "Out now",
    summary: "Build and manage your own farming business in this mobile tycoon game.",
    image: "assets/images/games/farm-tycoon.webp",
    imageAlt: "Idle Farm Tycoon: Empire Farm app icon",
    color: "#ffb23d",
    store: { name: "Google Play", url: "https://play.google.com/store/apps/details?id=com.daljord.idle.farm.tycoon" }
  },
  {
    id: "pizza-tycoon",
    title: "Pizza Tycoon: Idle Empire",
    short: "Pizza Tycoon",
    genre: "Idle tycoon",
    platform: "Android",
    status: "Out now",
    summary: "Manage and grow a pizza business in this mobile idle tycoon game.",
    image: "assets/images/games/pizza-tycoon.webp",
    imageAlt: "Pizza Tycoon: Idle Empire app icon",
    color: "#ff5a3d",
    store: { name: "Google Play", url: "https://play.google.com/store/apps/details?id=com.daljord.pizzatycoonidleempire" }
  },
  {
    id: "chain-reactor",
    title: "Chain Reactor: Tap Puzzle",
    short: "Chain Reactor",
    genre: "Tap puzzle",
    platform: "Android",
    status: "Out now",
    summary: "A tap puzzle game built around chain reactions.",
    image: "assets/images/games/chain-reactor.webp",
    imageAlt: "Chain Reactor: Tap Puzzle app icon",
    color: "#9b6bff",
    store: { name: "Google Play", url: "https://play.google.com/store/apps/details?id=com.daljord.chainreactor" }
  }
];
