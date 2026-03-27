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
    duration_minutes: 90, primary_color: "#C4622D", secret_word: "LABYRINTH", started_at: new Date().toISOString(),
  });

  // 3. Scoring
  console.log("3️⃣  Scoring config");
  const { error: scErr } = await supabase.from("scoring_config").upsert({ session_id: SESSION_ID }, { onConflict: "session_id" }).select();
  if (scErr) console.error(`  ❌ scoring_config: ${scErr.message}`); else console.log("  ✅ scoring_config");

  // 4. Clean old objects
  console.log("4️⃣  Cleaning old objects...");
  await supabase.from("objects").delete().eq("session_id", SESSION_ID);

  // 5. Objects (9 permanent)
  console.log("5️⃣  Objects (9)");
  const objects = [
    { id: "c1000000-0001-4000-8000-000000000001", name: "La Fiole", qr_code_id: "QR-OBJ-01-KRTM", physical_id: "OBJ-01", order: 1, description: "Une petite fiole cylindrique en résine translucide", is_final: false, narrative_name: "La Fiole d'Huile Sacrée", hidden_letter: "L" },
    { id: "c1000000-0002-4000-8000-000000000002", name: "Le Fragment", qr_code_id: "QR-OBJ-02-WFNL", physical_id: "OBJ-02", order: 2, description: "Un fragment ancien en résine texturée", is_final: false, narrative_name: "Le Fragment de Mosaïque Brisée", hidden_letter: "A" },
    { id: "c1000000-0003-4000-8000-000000000003", name: "Le Sceau", qr_code_id: "QR-OBJ-03-PXVD", physical_id: "OBJ-03", order: 3, description: "Un sceau circulaire en résine avec motif gravé", is_final: false, narrative_name: "Le Sceau du Proconsul", hidden_letter: "B" },
    { id: "c1000000-0004-4000-8000-000000000004", name: "La Clé", qr_code_id: "QR-OBJ-04-HTJQ", physical_id: "OBJ-04", order: 4, description: "Une grande clé ancienne en résine avec anneau décoratif", is_final: false, narrative_name: "La Clé du Sanctuaire", hidden_letter: "Y" },
    { id: "c1000000-0005-4000-8000-000000000005", name: "Le Parchemin", qr_code_id: "QR-OBJ-05-BMGS", physical_id: "OBJ-05", order: 5, description: "Un rouleau miniature en résine, comme un parchemin ancien", is_final: false, narrative_name: "Le Parchemin du Géographe", hidden_letter: "R" },
    { id: "c1000000-0006-4000-8000-000000000006", name: "L'Amulette", qr_code_id: "QR-OBJ-06-RLZN", physical_id: "OBJ-06", order: 6, description: "Une amulette ovale en résine texturée", is_final: false, narrative_name: "L'Amulette de la Déesse Tanit", hidden_letter: "I" },
    { id: "c1000000-0007-4000-8000-000000000007", name: "L'Urne", qr_code_id: "QR-OBJ-07-YCAK", physical_id: "OBJ-07", order: 7, description: "Une petite urne grecque en résine avec motifs en relief", is_final: false, narrative_name: "L'Urne des Cendres Oubliées", hidden_letter: "N" },
    { id: "c1000000-0008-4000-8000-000000000008", name: "Le Médaillon", qr_code_id: "QR-OBJ-08-DXFP", physical_id: "OBJ-08", order: 8, description: "Un médaillon circulaire en résine dorée", is_final: false, narrative_name: "Le Médaillon du Dernier Gardien", hidden_letter: "T" },
    { id: "c1000000-0009-4000-8000-000000000009", name: "Le Coffret", qr_code_id: "QR-OBJ-09-MNQT", physical_id: "OBJ-09", order: 9, description: "Un coffret ancien en résine ornementée — le trésor ultime", is_final: true, narrative_name: "Le Coffret des Secrets de Tarenti", hidden_letter: "H" },
  ];
  for (const obj of objects) {
    await upsert("objects", { ...obj, session_id: SESSION_ID });
  }

  // 6. Steps
  console.log("6️⃣  Steps (9)");
  const steps = [
    { id: "d1000000-0001-4000-8000-000000000001", object_id: objects[0].id, type: "enigme", order: 1, answer: "olivier",
      text_narratif: "Un scarabée de bronze gît dans la terre ocre. L'inscription dit: écoute l'arbre qui nourrit cette terre.",
      enigme: "Je suis l'arbre sacré de la Méditerranée. Mon fruit donne une huile d'or. Quel est mon nom ?" },
    { id: "d1000000-0002-4000-8000-000000000002", object_id: objects[1].id, type: "enigme", order: 2, answer: "pierre",
      text_narratif: "Une fiole ambrée sur un socle de marbre. Un bâtisseur oublié érigea les premiers murs de Tarenti.",
      enigme: "Les Romains m'ont taillée pour bâtir leurs temples. Que suis-je ?" },
    { id: "d1000000-0003-4000-8000-000000000003", object_id: objects[2].id, type: "enigme", order: 3, answer: "source",
      text_narratif: "Le parchemin dit: là où l'eau murmure les secrets que la terre a oubliés.",
      enigme: "Je jaillis de la roche. Je suis le commencement de tout fleuve. Que suis-je ?" },
    { id: "d1000000-0004-4000-8000-000000000004", object_id: objects[3].id, type: "enigme", order: 4, answer: "sel",
      text_narratif: "L'amulette d'argile pulse sous la lumière. Blanc comme la neige mais né de la mer.",
      enigme: "Je suis blanc mais né de la mer. Mon nom ne contient que trois lettres. Qui suis-je ?" },
    { id: "d1000000-0005-4000-8000-000000000005", object_id: objects[4].id, type: "epreuve", order: 5, answer: null,
      text_narratif: "La clé attend devant une porte. Le Gardien dit: prouvez votre vaillance.",
      enigme: "Le Premier Gardien vous met à l'épreuve physique." },
    { id: "d1000000-0006-4000-8000-000000000006", object_id: objects[5].id, type: "epreuve", order: 6, answer: null,
      text_narratif: "Le sceau de l'olivier brille. Le Second Gardien attend votre épreuve de cohésion.",
      enigme: "Le Second Gardien vous attend. Votre fellowship entière doit participer." },
    { id: "d1000000-0007-4000-8000-000000000007", object_id: objects[6].id, type: "enigme", order: 7, answer: "Les Grecs de Sparte",
      text_narratif: "Un fragment de carte sur peau de chèvre. Les chemins convergent vers une étoile.",
      enigme: "Quelle civilisation a fondé Tarente au VIIIe siècle av. J.-C. ?|Les Grecs de Sparte|Les Romains|Les Phéniciens|Les Étrusques" },
    { id: "d1000000-0008-4000-8000-000000000008", object_id: objects[7].id, type: "enigme", order: 8, answer: "feu",
      text_narratif: "Les ruines d'un four noirci. Les potiers vénéraient cet élément sacré.",
      enigme: "Je danse sans jambes, je dévore sans bouche. Quel est mon nom ?" },
    { id: "d1000000-0009-4000-8000-000000000009", object_id: objects[8].id, type: "enigme", order: 9, answer: "tarenti",
      text_narratif: "Au fond d'une vasque moussue, un médaillon de cuivre. La dernière inscription: le nom de cette terre.",
      enigme: "Je suis le domaine, le mystère, la réponse finale. Prononcez mon nom." },
  ];
  for (const step of steps) {
    await upsert("steps", step);
  }

  // 7. Staff
  console.log("7️⃣  Staff");
  await supabase.from("staff_members").delete().eq("session_id", SESSION_ID);
  await supabase.from("staff_members").insert([
    { session_id: SESSION_ID, name: "Le Premier Gardien", role: "gardien", assigned_step_id: steps[4].id, validation_code: "4721" },
    { session_id: SESSION_ID, name: "Le Second Gardien", role: "gardien", assigned_step_id: steps[5].id, validation_code: "8356" },
  ]);
  console.log("  ✅ staff_members: 2 rows");

  // Verify
  console.log("\n🔍 Verifying...\n");
  for (const t of ["organizations", "sessions", "scoring_config", "objects", "steps", "staff_members"]) {
    const { data } = await supabase.from(t).select("id").limit(100);
    console.log(`  ✅ ${t}: ${data?.length ?? 0} row(s)`);
  }

  console.log("\n🎉 Seed complete! Access Key: TARENTI24 (9 stages)\n");
}

run().catch(console.error);
