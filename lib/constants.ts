// ─── Coordonnées GPS des 7 animaux du Domaine Tarenti ─────────
export const TARENTI_ANIMALS = [
  {
    order: 1,
    name: "Les Chèvres",
    emoji: "🐐",
    lat: 36.68653492692563,
    lng: 10.210360935921443,
    description: "Suivez le chemin vers l'enclos des chèvres. Ces curieuses vont adorer votre visite !",
  },
  {
    order: 2,
    name: "Les Vaches",
    emoji: "🐄",
    lat: 36.68790732639046,
    lng: 10.209060248513682,
    description: "Direction les vaches ! Ces douces bovines passent leur journée à brouter tranquillement.",
  },
  {
    order: 3,
    name: "L'Âne",
    emoji: "🫏",
    lat: 36.68630912674403,
    lng: 10.208415150340297,
    description: "Un visiteur très patient vous attend... il a de grandes oreilles pour bien vous entendre !",
  },
  {
    order: 4,
    name: "Les Cochons",
    emoji: "🐷",
    lat: 36.68614330997645,
    lng: 10.208318093945488,
    description: "Les cochons fouinent et grognent... ils vous ont sûrement déjà entendu arriver !",
  },
  {
    order: 5,
    name: "Le Champ Aromatique",
    emoji: "🌿",
    lat: 36.68417968248825,
    lng: 10.207979379717381,
    description: "Fermez les yeux et respirez... le champ aromatique du Domaine Tarenti vous attend.",
  },
  {
    order: 6,
    name: "Les Poules",
    emoji: "🐔",
    lat: 36.68608903628465,
    lng: 10.209727428427485,
    description: "Cot cot cot... les poules caquètent pour vous accueillir dans leur enclos !",
  },
  {
    order: 7,
    name: "Le Lapin",
    emoji: "🐇",
    lat: 36.68610785682307,
    lng: 10.209897078132796,
    description: "Cherchez bien... le lapin est peut-être caché dans son terrier ou dans les fourrés !",
  },
] as const;

// Coordonnées de l'accueil (point de départ et d'arrivée)
export const TARENTI_ACCUEIL = {
  lat: 36.686447163459576,
  lng: 10.209693900804796,
};

// Rayon de geofencing pour déclencher l'arrivée (en mètres)
export const GEOFENCE_RADIUS_M = 25;
