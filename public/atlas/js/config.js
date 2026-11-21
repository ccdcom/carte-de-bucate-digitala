/* ==========================================================================
   Interactive Culinary Atlas of the World — CONFIGURATION (version 1)
   Created by Christian Coandă
   ========================================================================== */

window.ATLAS_CONFIG = {
  owner: "Christian Coandă",

  /* ---- Amazon page for "Europe on a Plate": replace this one line with the book's exact Amazon link ---- */
  amazonUrl: "https://www.amazon.com/dp/B0HJ97HVNC",

  links: {
    logo: "https://carte-de-bucate-digitala.vercel.app",
    europeOnAPlate: "https://carte-de-bucate-digitala.vercel.app/carte"
  },

  /* Point colours by number of Michelin stars */
  starColors: {
    3: "#ffd34d",   // gold
    2: "#ffffff",   // white
    1: "#b9bec7"    // grey-white
  },

  globe: {
    texture: (window.ATLAS_TEXTURES || {}).earth || "assets/img/earth-blue-marble.jpg",
    bump: (window.ATLAS_TEXTURES || {}).bump || "assets/img/earth-topology.png",
    stars: (window.ATLAS_TEXTURES || {}).stars || "assets/img/night-sky.png",
    atmosphereColor: "#7fb2ff",
    atmosphereAltitude: 0.2,
    autoRotateSpeed: 0.6,
    idleSeconds: 6,
    startView: { lat: 40, lng: 12, altitude: 2.35 }
  }
};
