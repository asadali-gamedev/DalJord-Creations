/* ==========================================================================
   WORKSHOP PROJECTS
   stage must be one of: "concept", "early", "development", "released".
   Leave image empty ("") for projects you don't want to show yet;
   they appear as locked cards.
   ========================================================================== */
window.DJ = window.DJ || {};

DJ.stages = [
  { id: "concept",     label: "Concept",        text: "An idea with a clear hook, being shaped on paper." },
  { id: "early",       label: "Early stage",    text: "First builds, testing whether the core idea is fun." },
  { id: "development", label: "In development", text: "Systems, content and polish coming together." },
  { id: "released",    label: "Released",       text: "Out in players’ hands and still improving." }
];

DJ.projects = [
  {
    id: "beyond-yonder",
    title: "Beyond Yonder",
    stage: "development",
    statusLabel: "In early development",
    genre: "Sci-fi survival RPG",
    summary: "A futuristic, story-driven survival RPG combining exploration, survival and narrative in a science-fiction setting.",
    pillars: ["Exploration", "Survival", "Story"],
    image: "assets/images/projects/beyond-yonder.webp",
    imageAlt: "Beyond Yonder concept art: a futuristic workshop hall lit in violet",
    color: "#9b6bff"
  },
  {
    id: "carve",
    title: "Carve",
    stage: "concept",
    statusLabel: "Concept",
    genre: "Snowboarding",
    summary: "A snowboarding game about downhill momentum, jumps and aerial tricks, built around simple controls and the thrill of mastering each run.",
    pillars: ["Momentum", "Tricks", "Mastery"],
    image: "assets/images/projects/carve.webp",
    imageAlt: "Carve title art: a snowboarder carving down a mountain at sunset",
    color: "#36e6ff"
  },
  {
    id: "platformer-project",
    title: "Untitled platform adventure",
    stage: "early",
    statusLabel: "Unannounced",
    genre: "Side-scrolling platformer",
    summary: "An early-stage side-scrolling adventure exploring platforming, environmental challenges and varied locations.",
    pillars: ["Platforming", "Environments", "Adventure"],
    image: "",
    imageAlt: "",
    color: "#ff8a2a"
  }
];
