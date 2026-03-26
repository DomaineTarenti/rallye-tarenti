/**
 * Seed runner — inserts test data into Supabase
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=your-key node supabase/run-seed.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
const envPath = resolve(__dirname, "..", ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function upsert(table, data) {
  const { data: result, error } = await supabase.from(table).upsert(data, { onConflict: "id" }).select();
  if (error) {
    if (error.code === "23505") { console.log(`  ⏭️  ${table}: exists`); return; }
    console.error(`  ❌ ${table}: ${error.message}`);
    return;
  }
  console.log(`  ✅ ${table}: ${Array.isArray(result) ? result.length : 1} row(s)`);
}

async function run() {
  console.log(`\n🌱 Seeding ${SUPABASE_URL}...\n`);

  const SESSION_ID = "b1b2c3d4-0001-4000-8000-000000000001";
  const ORG_ID = "a1b2c3d4-0001-4000-8000-000000000001";

  // 1. Org
  console.log("1️⃣  Organization");
  await upsert("organizations", { id: ORG_ID, name: "Domaine Tarenti", slug: "tarenti", primary_color: "#C4622D" });

  // 2. Session
  console.log("2️⃣  Session");
  await upsert("sessions", {
    id: SESSION_ID, org_id: ORG_ID, name: "Tarenti Mysteria", code: "TARENTI24",
    status: "active", theme: "An ancient Mediterranean mystery among olive groves and sun-bleached ruins",
    duration_minutes: 90, primary_color: "#C4622D", started_at: new Date().toISOString(),
  });

  // 3. Scoring
  console.log("3️⃣  Scoring config");
  const { error: scErr } = await supabase.from("scoring_config").upsert({ session_id: SESSION_ID }, { onConflict: "session_id" }).select();
  if (scErr) console.error(`  ❌ scoring_config: ${scErr.message}`); else console.log("  ✅ scoring_config");

  // 4. Clean old objects
  console.log("4️⃣  Cleaning old objects...");
  await supabase.from("objects").delete().eq("session_id", SESSION_ID);

  // 5. Objects
  console.log("5️⃣  Objects (10)");
  const objects = [
    { id: "c1000000-0001-4000-8000-000000000001", name: "Le Scarabée de Bronze", qr_code_id: "QR-TAR-001", order: 1, description: "Un scarabée en bronze patiné" },
    { id: "c1000000-0002-4000-8000-000000000002", name: "La Fiole Ambrée", qr_code_id: "QR-TAR-002", order: 2, description: "Une fiole de verre ambré" },
    { id: "c1000000-0003-4000-8000-000000000003", name: "Le Parchemin Scellé", qr_code_id: "QR-TAR-003", order: 3, description: "Un parchemin scellé à la cire rouge" },
    { id: "c1000000-0004-4000-8000-000000000004", name: "L'Amulette d'Argile", qr_code_id: "QR-TAR-004", order: 4, description: "Une amulette d'argile en spirale" },
    { id: "c1000000-0005-4000-8000-000000000005", name: "Le Miroir de Sel", qr_code_id: "QR-TAR-005", order: 5, description: "Un disque de sel cristallisé" },
    { id: "c1000000-0006-4000-8000-000000000006", name: "La Clé de Cuivre", qr_code_id: "QR-TAR-006", order: 6, description: "Une clé ornementale en cuivre" },
    { id: "c1000000-0007-4000-8000-000000000007", name: "Le Sceau du Gardien", qr_code_id: "QR-TAR-007", order: 7, description: "Un sceau de cire à l'olivier" },
    { id: "c1000000-0008-4000-8000-000000000008", name: "La Carte Déchirée", qr_code_id: "QR-TAR-008", order: 8, description: "Un fragment de carte ancienne" },
    { id: "c1000000-0009-4000-8000-000000000009", name: "L'Urne Brisée", qr_code_id: "QR-TAR-009", order: 9, description: "Fragments d'urne noircie par le feu" },
    { id: "c1000000-0010-4000-8000-000000000010", name: "Le Médaillon Final", qr_code_id: "QR-TAR-010", order: 10, description: "Un médaillon de cuivre au soleil levant" },
  ];
  for (const obj of objects) {
    await upsert("objects", { ...obj, session_id: SESSION_ID });
  }

  // 6. Steps
  console.log("6️⃣  Steps (10)");
  const steps = [
    { id: "d1000000-0001-4000-8000-000000000001", object_id: objects[0].id, type: "enigme", order: 1, answer: "olivier",
      text_narratif: "Les dernières lueurs du crépuscule embrasent les collines du Domaine Tarenti...",
      enigme: "Je suis l'arbre sacré de la Méditerranée. Mon fruit donne une huile d'or. Quel est mon nom ?" },
    { id: "d1000000-0002-4000-8000-000000000002", object_id: objects[1].id, type: "enigme", order: 2, answer: "pierre",
      text_narratif: "L'huile de l'olivier ancien vous a guidé jusqu'à une alcôve dissimulée...",
      enigme: "Les Romains m'ont taillée pour bâtir leurs temples. Je suis le socle de toute civilisation. Que suis-je ?" },
    { id: "d1000000-0003-4000-8000-000000000003", object_id: objects[2].id, type: "epreuve", order: 3, answer: null,
      text_narratif: "Le parchemin craque sous vos doigts...",
      enigme: "Le Gardien de Tarenti vous met à l'épreuve physique." },
    { id: "d1000000-0004-4000-8000-000000000004", object_id: objects[3].id, type: "enigme", order: 4, answer: "source",
      text_narratif: "Le Gardien hoche la tête avec un sourire grave...",
      enigme: "Je jaillis de la roche. Je suis le commencement de tout fleuve. Que suis-je ?" },
    { id: "d1000000-0005-4000-8000-000000000005", object_id: objects[4].id, type: "enigme", order: 5, answer: "sel",
      text_narratif: "La source vous a conduit vers la côte...",
      enigme: "Je suis blanc mais né de la mer. Mon nom ne contient que trois lettres. Qui suis-je ?" },
    { id: "d1000000-0006-4000-8000-000000000006", object_id: objects[5].id, type: "enigme", order: 6, answer: "1453",
      text_narratif: "Le sel vous a mené vers une porte de bois vermoulu...",
      enigme: "Entrez l'année de la chute de Constantinople." },
    { id: "d1000000-0007-4000-8000-000000000007", object_id: objects[6].id, type: "epreuve", order: 7, answer: null,
      text_narratif: "La porte s'ouvre sur une salle voûtée baignée de lumière dorée...",
      enigme: "Le Second Gardien attend votre fellowship pour une épreuve de cohésion." },
    { id: "d1000000-0008-4000-8000-000000000008", object_id: objects[7].id, type: "enigme", order: 8, answer: "Les Grecs de Sparte",
      text_narratif: "Le Gardien vous remet un fragment de carte ancienne...",
      enigme: "Quelle civilisation a fondé Tarente au VIIIe siècle av. J.-C. ?|Les Grecs de Sparte|Les Romains|Les Phéniciens|Les Étrusques" },
    { id: "d1000000-0009-4000-8000-000000000009", object_id: objects[8].id, type: "enigme", order: 9, answer: "feu",
      text_narratif: "La carte vous guide vers les ruines d'un ancien four à céramique...",
      enigme: "Je danse sans jambes, je dévore sans bouche. Les potiers me vénéraient. Quel est mon nom ?" },
    { id: "d1000000-0010-4000-8000-000000000010", object_id: objects[9].id, type: "enigme", order: 10, answer: "tarenti",
      text_narratif: "Le feu vous a montré le chemin vers le cœur même du domaine...",
      enigme: "Je suis le domaine, le mystère, la réponse finale. Prononcez mon nom." },
  ];
  for (const step of steps) {
    await upsert("steps", step);
  }

  // 7. Staff
  console.log("7️⃣  Staff");
  await supabase.from("staff_members").delete().eq("session_id", SESSION_ID);
  await supabase.from("staff_members").insert([
    { session_id: SESSION_ID, name: "Le Premier Gardien", role: "gardien", assigned_step_id: steps[2].id },
    { session_id: SESSION_ID, name: "Le Second Gardien", role: "gardien", assigned_step_id: steps[6].id },
  ]);
  console.log("  ✅ staff_members: 2 rows");

  // Verify
  console.log("\n🔍 Verifying...\n");
  for (const t of ["organizations", "sessions", "scoring_config", "objects", "steps", "staff_members"]) {
    const { data } = await supabase.from(t).select("id").limit(100);
    console.log(`  ✅ ${t}: ${data?.length ?? 0} row(s)`);
  }

  console.log("\n🎉 Seed complete! Access Key: TARENTI24 (10 stages)\n");
}

run().catch(console.error);
