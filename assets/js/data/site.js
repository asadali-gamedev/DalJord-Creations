/* ==========================================================================
   SITE SETTINGS
   Edit studio details, navigation and footer here. Every page reads this file.
   ========================================================================== */
window.DJ = window.DJ || {};

DJ.site = {
  name: "Daljord Creations",
  tagline: "Work hard Play harder",
  email: "daljordcreations@gmail.com",
  description: "An independent studio making mobile and PC games with depth, progression and character.",

  /* Main navigation. "page" must match the data-page value on each page's <body>. */
  nav: [
    { label: "Home",     page: "home",     href: "index.html" },
    { label: "Games",    page: "games",    href: "games/index.html" },
    { label: "Workshop", page: "projects", href: "projects/index.html" },
    { label: "Updates",  page: "updates",  href: "updates/index.html" },
    { label: "Studio",   page: "studio",   href: "studio/index.html" },
    { label: "Contact",  page: "contact",  href: "contact/index.html" }
  ],

  /* Extra footer links. Add privacy and terms pages here once they exist, e.g.
     { label: "Privacy policy", href: "privacy/index.html" } */
  legal: [],

  /* Optional social links, shown in the footer when filled in.
     e.g. { label: "YouTube", href: "https://youtube.com/@yourchannel" } */
  social: []
};
