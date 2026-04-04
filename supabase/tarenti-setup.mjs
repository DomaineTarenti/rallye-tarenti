/**
 * Rallye Tarenti — Setup complet Supabase
 *
 * Ce script :
 *   1. Vide les anciennes données (via client Supabase)
 *   2. Insère session + 7 animaux + questions + 15 équipes
 *
 * ⚠️  Le schéma SQL doit être appliqué AVANT via le SQL Editor :
 *      Dashboard Supabase → SQL Editor → coller tarenti-schema.sql
 *
 * Usage :
 *   node supabase/tarenti-setup.mjs
 *
 * Requis dans .env.local :
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Charger .env.local ───────────────────────────────────────
const envPath = resolve(__dirname, "..", ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL manquant dans .env.local");
  process.exit(1);
}
if (!SERVICE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local");
  console.error("   → Ajoute : SUPABASE_SERVICE_ROLE_KEY=eyJ...");
  console.error("   → Trouve-le sur : dashboard.supabase.com → Settings → API");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ─── IDs fixes ────────────────────────────────────────────────
const SESSION_ID = "a0000000-0000-4000-8000-000000000001";

const OBJECTS = {
  chevres:  "b0000000-0001-4000-8000-000000000001",
  vaches:   "b0000000-0002-4000-8000-000000000001",
  ane:      "b0000000-0003-4000-8000-000000000001",
  cochons:  "b0000000-0004-4000-8000-000000000001",
  champ:    "b0000000-0005-4000-8000-000000000001",
  poules:   "b0000000-0006-4000-8000-000000000001",
  lapin:    "b0000000-0007-4000-8000-000000000001",
};

const STEPS = {
  chevres:  "c0000000-0001-4000-8000-000000000001",
  vaches:   "c0000000-0002-4000-8000-000000000001",
  ane:      "c0000000-0003-4000-8000-000000000001",
  cochons:  "c0000000-0004-4000-8000-000000000001",
  champ:    "c0000000-0005-4000-8000-000000000001",
  poules:   "c0000000-0006-4000-8000-000000000001",
  lapin:    "c0000000-0007-4000-8000-000000000001",
};

// ─── Helpers ──────────────────────────────────────────────────
async function upsert(table, rows, conflictCol = "id") {
  const data = Array.isArray(rows) ? rows : [rows];
  const { error } = await sb.from(table).upsert(data, { onConflict: conflictCol });
  if (error) {
    console.error(`  ❌ ${table}: ${error.message}`);
    return false;
  }
  console.log(`  ✅ ${table}: ${data.length} ligne(s)`);
  return true;
}

async function del(table, filter) {
  const [col, val] = Object.entries(filter)[0];
  const { error } = await sb.from(table).delete().eq(col, val);
  if (error && !error.message.includes("does not exist")) {
    console.error(`  ⚠️  delete ${table}: ${error.message}`);
  }
}

// ─── Programme principal ──────────────────────────────────────
async function run() {
  console.log(`\n🌿 Rallye Tarenti — Setup Supabase`);
  console.log(`   URL: ${SUPABASE_URL}\n`);

  // ── 0. Nettoyage ───────────────────────────────────────────
  console.log("🧹 Nettoyage des anciennes données...");
  await del("team_progress", { team_id: SESSION_ID }); // via cascade sur teams
  await del("photos", { team_id: SESSION_ID });
  await del("team_messages", { session_id: SESSION_ID });
  await del("teams", { session_id: SESSION_ID });
  await del("steps", { object_id: OBJECTS.lapin }); // via cascade sur objects
  await del("objects", { session_id: SESSION_ID });
  await del("sessions", { id: SESSION_ID });
  console.log("  ✅ Nettoyage terminé\n");

  // ── 1. Session ─────────────────────────────────────────────
  console.log("1️⃣  Session");
  await upsert("sessions", {
    id: SESSION_ID,
    name: "Rallye Tarenti 2025",
    code: "TARENTI25",
    status: "active",
    primary_color: "#2D7D46",
    started_at: new Date().toISOString(),
  });

  // ── 2. Objets (7 animaux, ordre fixe) ──────────────────────
  console.log("\n2️⃣  Animaux (7)");
  await upsert("objects", [
    {
      id: OBJECTS.chevres, session_id: SESSION_ID,
      name: "Les Chèvres", emoji: "🐐", order: 1,
      description: "Suivez le chemin vers l'enclos des chèvres. Ces curieuses vont adorer votre visite !",
      latitude: 36.68653492692563, longitude: 10.210360935921443, is_final: false,
    },
    {
      id: OBJECTS.vaches, session_id: SESSION_ID,
      name: "Les Vaches", emoji: "🐄", order: 2,
      description: "Direction les vaches ! Ces douces bovines passent leur journée à brouter tranquillement.",
      latitude: 36.68790732639046, longitude: 10.209060248513682, is_final: false,
    },
    {
      id: OBJECTS.ane, session_id: SESSION_ID,
      name: "L'Âne", emoji: "🫏", order: 3,
      description: "Un visiteur très patient vous attend... il a de grandes oreilles pour bien vous entendre !",
      latitude: 36.68630912674403, longitude: 10.208415150340297, is_final: false,
    },
    {
      id: OBJECTS.cochons, session_id: SESSION_ID,
      name: "Les Cochons", emoji: "🐷", order: 4,
      description: "Les cochons fouinent et grognent... ils vous ont sûrement déjà entendu arriver !",
      latitude: 36.68614330997645, longitude: 10.208318093945488, is_final: false,
    },
    {
      id: OBJECTS.champ, session_id: SESSION_ID,
      name: "Le Champ Aromatique", emoji: "🌿", order: 5,
      description: "Fermez les yeux et respirez... le champ aromatique du Domaine Tarenti vous attend.",
      latitude: 36.68417968248825, longitude: 10.207979379717381, is_final: false,
    },
    {
      id: OBJECTS.poules, session_id: SESSION_ID,
      name: "Les Poules", emoji: "🐔", order: 6,
      description: "Cot cot cot... les poules caquètent pour vous accueillir dans leur enclos !",
      latitude: 36.68608903628465, longitude: 10.209727428427485, is_final: false,
    },
    {
      id: OBJECTS.lapin, session_id: SESSION_ID,
      name: "Le Lapin", emoji: "🐇", order: 7,
      description: "Cherchez bien... le lapin est peut-être caché dans son terrier ou dans les fourrés !",
      latitude: 36.68610785682307, longitude: 10.209897078132796, is_final: false,
    },
  ]);

  // ── 3. Steps (1 question par animal) ───────────────────────
  console.log("\n3️⃣  Questions (7)");
  await upsert("steps", [
    {
      id: STEPS.chevres, object_id: OBJECTS.chevres,
      intro_text: "Vous avez trouvé les chèvres du Domaine Tarenti ! Observez-les bien avant de répondre.",
      question: "De quelle forme sont les pupilles d'une chèvre ?",
      answer: "rectangulaire",
      hint: "Regardez attentivement dans leurs yeux... ce n'est pas une forme ronde !",
      fun_fact: "Les chèvres ont des pupilles rectangulaires ! Cette forme leur permet de voir à presque 340° autour d'elles sans bouger la tête. Très pratique pour repérer les prédateurs !",
      order: 1,
    },
    {
      id: STEPS.vaches, object_id: OBJECTS.vaches,
      intro_text: "Bienvenue chez les vaches du Domaine Tarenti ! Ces grandes dames passent leur temps à brouter et ruminer.",
      question: "Combien d'estomacs a une vache ?",
      answer: "4",
      hint: "C'est plus d'un seul... les vaches sont des ruminants !",
      fun_fact: "Les vaches ont 4 estomacs ! Elles avalent l'herbe, la régurgitent pour la mâcher à nouveau — c'est ce qu'on appelle ruminer. Elles passent jusqu'à 8 heures par jour à mâcher !",
      order: 1,
    },
    {
      id: STEPS.ane, object_id: OBJECTS.ane,
      intro_text: "L'âne du Domaine vous attend avec sa bonne humeur légendaire ! Un animal fidèle et très intelligent.",
      question: "Comment s'appelle le cri de l'âne ?",
      answer: "braiment",
      hint: "L'âne fait \"hi-han\"... ce son porte un nom précis !",
      fun_fact: "Le cri de l'âne s'appelle le braiment ! Un hi-han peut s'entendre jusqu'à 3 km de distance. Les ânes s'expriment pour communiquer avec leurs amis ou exprimer leurs émotions !",
      order: 1,
    },
    {
      id: STEPS.cochons, object_id: OBJECTS.cochons,
      intro_text: "Les cochons du Domaine grognent pour vous dire bonjour ! Des animaux bien plus intelligents qu'on ne le croit.",
      question: "Quel est le nom du bébé cochon ?",
      answer: "porcelet",
      hint: "C'est un mot qui ressemble à \"cochon\"... en version miniature !",
      fun_fact: "Le bébé cochon s'appelle le porcelet ! Les cochons sont parmi les animaux les plus intelligents de la ferme — plus que les chiens selon certaines études. Ils peuvent reconnaître leur prénom !",
      order: 1,
    },
    {
      id: STEPS.champ, object_id: OBJECTS.champ,
      intro_text: "Bienvenue dans le champ aromatique du Domaine ! Fermez les yeux un instant et respirez profondément.",
      question: "Pour préparer une tisane à la menthe, quelle partie de la plante utilise-t-on ?",
      answer: "feuilles",
      hint: "C'est la partie verte et parfumée de la plante !",
      fun_fact: "On utilise les feuilles de menthe pour faire la tisane ! La menthe est au cœur de la culture tunisienne : le thé à la menthe est une boisson traditionnelle incontournable !",
      order: 1,
    },
    {
      id: STEPS.poules, object_id: OBJECTS.poules,
      intro_text: "Les poules caquettent pour vous accueillir ! Ces dames pondeuses travaillent dur chaque jour.",
      question: "Combien de jours met un œuf de poule pour éclore ?",
      answer: "21",
      hint: "C'est environ 3 semaines... comptez les jours !",
      fun_fact: "Un œuf de poule met exactement 21 jours pour éclore ! La poule retourne ses œufs plusieurs fois par jour. Une poule pond environ 250 à 300 œufs par an. Merci les poules !",
      order: 1,
    },
    {
      id: STEPS.lapin, object_id: OBJECTS.lapin,
      intro_text: "Cherchez bien... le lapin est peut-être tapi dans son coin. Un animal vif et adorable !",
      question: "Comment s'appelle le bébé lapin ?",
      answer: "lapereau",
      hint: "C'est un mot proche de \"lapin\"... en version bébé !",
      fun_fact: "Le bébé lapin s'appelle le lapereau ! Leurs grandes oreilles servent à détecter les prédateurs... et aussi à réguler leur température en faisant circuler le sang. Pratique sous le soleil tunisien !",
      order: 1,
    },
  ]);

  // ── 4. Équipes pré-créées (FAM01 à FAM15) ──────────────────
  console.log("\n4️⃣  Équipes (FAM01–FAM15)");
  const teams = Array.from({ length: 15 }, (_, i) => {
    const num = String(i + 1).padStart(2, "0");
    return {
      id: `d0000000-00${num.padStart(2, "0")}-4000-8000-000000000001`.replace("000-", `${num}-`),
      session_id: SESSION_ID,
      name: `Famille ${num}`,
      status: "waiting",
      access_code: `FAM${num}`,
      is_precreated: true,
      locked: false,
    };
  });
  // Générer des IDs propres
  const teamsWithIds = Array.from({ length: 15 }, (_, i) => {
    const num = String(i + 1).padStart(2, "0");
    const hexNum = (i + 1).toString(16).padStart(4, "0");
    return {
      id: `d0000000-${hexNum}-4000-8000-000000000001`,
      session_id: SESSION_ID,
      name: `Famille ${num}`,
      status: "waiting",
      access_code: `FAM${num}`,
      is_precreated: true,
      locked: false,
    };
  });
  await upsert("teams", teamsWithIds);

  // ── 5. Vérification ────────────────────────────────────────
  console.log("\n🔍 Vérification...");
  for (const t of ["sessions", "objects", "steps", "teams"]) {
    const { data, error } = await sb.from(t).select("id").limit(100);
    if (error) {
      console.log(`  ❌ ${t}: ${error.message}`);
    } else {
      console.log(`  ✅ ${t}: ${data?.length ?? 0} ligne(s)`);
    }
  }

  console.log(`
╔════════════════════════════════════════╗
║   🌿 Setup Rallye Tarenti terminé !    ║
╠════════════════════════════════════════╣
║  Session  : TARENTI25 (active)         ║
║  Animaux  : 7 (Chèvres → Lapin)       ║
║  Équipes  : FAM01 → FAM15             ║
╚════════════════════════════════════════╝

Rappel :
  - Créer le bucket Storage "team-photos" (public)
    dans : Dashboard → Storage → New bucket
  - Placer le cadre photo dans public/frames/tarenti-frame.png
`);
}

run().catch((err) => {
  console.error("\n💥 Erreur :", err.message);
  process.exit(1);
});
