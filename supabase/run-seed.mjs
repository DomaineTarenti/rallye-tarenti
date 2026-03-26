/**
 * Seed runner — executes seed.sql against Supabase
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=your-key node supabase/run-seed.mjs
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL from .env.local
 * Requires SUPABASE_SERVICE_ROLE_KEY env var (bypasses RLS)
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually
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
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL not found in .env.local");
  process.exit(1);
}
if (!SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY not provided.");
  console.error(
    "   Run: SUPABASE_SERVICE_ROLE_KEY=your-key node supabase/run-seed.mjs"
  );
  console.error(
    "   Find it in: Supabase Dashboard → Settings → API → service_role (secret)"
  );
  process.exit(1);
}

// Extract project ref from URL
const projectRef = SUPABASE_URL.replace("https://", "").replace(
  ".supabase.co",
  ""
);

console.log(`📦 Project: ${projectRef}`);
console.log(`🔗 URL: ${SUPABASE_URL}`);

// Read seed SQL
const seedPath = resolve(__dirname, "seed.sql");
const seedSQL = readFileSync(seedPath, "utf-8");

// Split into individual statements
const statements = seedSQL
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s && !s.startsWith("--"));

console.log(`\n📄 Found ${statements.length} SQL statements\n`);

// Execute each statement via PostgREST RPC or REST SQL endpoint
// Using the Supabase Management API pg endpoint
async function executeSql(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  return res;
}

// Alternative: use supabase-js with service_role to insert via REST
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function insertRow(table, data) {
  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select();
  if (error) {
    // Check if it's a duplicate key error (already seeded)
    if (error.code === "23505") {
      console.log(`  ⏭️  ${table}: already exists, skipping`);
      return true;
    }
    console.error(`  ❌ ${table}: ${error.message}`);
    return false;
  }
  console.log(`  ✅ ${table}: inserted ${result.length} row(s)`);
  return true;
}

async function runSeed() {
  console.log("🌱 Running seed...\n");

  // 1. Organization
  console.log("1️⃣  Organization");
  await insertRow("organizations", {
    id: "a1b2c3d4-0001-4000-8000-000000000001",
    name: "Domaine Tarenti",
    slug: "tarenti",
    primary_color: "#C4622D",
  });

  // 2. Session
  console.log("2️⃣  Session");
  await insertRow("sessions", {
    id: "b1b2c3d4-0001-4000-8000-000000000001",
    org_id: "a1b2c3d4-0001-4000-8000-000000000001",
    name: "Tarenti Mysteria",
    code: "TARENTI24",
    status: "active",
    theme: "Mystère méditerranéen antique",
    duration_minutes: 90,
    primary_color: "#C4622D",
    started_at: new Date().toISOString(),
  });

  // 3. Scoring config
  console.log("3️⃣  Scoring config");
  await insertRow("scoring_config", {
    session_id: "b1b2c3d4-0001-4000-8000-000000000001",
  });

  // 4. Objects
  console.log("4️⃣  Objects");
  const objects = [
    {
      id: "c1b2c3d4-0001-4000-8000-000000000001",
      session_id: "b1b2c3d4-0001-4000-8000-000000000001",
      name: "Le Scarabée de Bronze",
      qr_code_id: "QR-TARENTI-001",
      order: 1,
      description:
        "Un scarabée en bronze patiné, gravé de symboles anciens",
    },
    {
      id: "c1b2c3d4-0002-4000-8000-000000000002",
      session_id: "b1b2c3d4-0001-4000-8000-000000000001",
      name: "La Fiole Ambrée",
      qr_code_id: "QR-TARENTI-002",
      order: 2,
      description:
        "Une fiole de verre ambré contenant une huile parfumée millénaire",
    },
    {
      id: "c1b2c3d4-0003-4000-8000-000000000003",
      session_id: "b1b2c3d4-0001-4000-8000-000000000001",
      name: "Le Parchemin Scellé",
      qr_code_id: "QR-TARENTI-003",
      order: 3,
      description:
        "Un rouleau de parchemin scellé à la cire rouge, portant le sceau du Gardien",
    },
    {
      id: "c1b2c3d4-0004-4000-8000-000000000004",
      session_id: "b1b2c3d4-0001-4000-8000-000000000001",
      name: "L'Amulette d'Argile",
      qr_code_id: "QR-TARENTI-004",
      order: 4,
      description:
        "Une amulette d'argile cuite au soleil, ornée d'un motif en spirale",
    },
    {
      id: "c1b2c3d4-0005-4000-8000-000000000005",
      session_id: "b1b2c3d4-0001-4000-8000-000000000001",
      name: "Le Médaillon Final",
      qr_code_id: "QR-TARENTI-005",
      order: 5,
      description:
        "Un médaillon de cuivre frappé d'un soleil levant sur les collines de Tarenti",
    },
  ];
  for (const obj of objects) {
    await insertRow("objects", obj);
  }

  // 5. Steps
  console.log("5️⃣  Steps");
  const steps = [
    {
      id: "d1b2c3d4-0001-4000-8000-000000000001",
      object_id: "c1b2c3d4-0001-4000-8000-000000000001",
      text_narratif:
        "Les dernières lueurs du crépuscule embrasent les collines du Domaine Tarenti. Sous vos pieds, un sentier de pierres usées serpente entre les murets séculaires. Un scarabée de bronze gît là, à demi enfoui dans la terre ocre, comme s'il vous attendait depuis des siècles. Sur son dos, une inscription presque effacée murmure les mots d'Aristide, le dernier gardien du domaine : « Celui qui cherche la vérité doit d'abord écouter l'arbre qui nourrit cette terre depuis mille ans. »",
      enigme:
        "Je suis l'arbre sacré de la Méditerranée. Mon fruit donne une huile d'or, mes branches sont symbole de paix, et mes racines plongent dans la mémoire des civilisations. Quel est mon nom ?",
      answer: "olivier",
      type: "enigme",
      order: 1,
    },
    {
      id: "d1b2c3d4-0002-4000-8000-000000000002",
      object_id: "c1b2c3d4-0002-4000-8000-000000000002",
      text_narratif:
        "L'huile de l'olivier ancien vous a guidé jusqu'à une alcôve dissimulée derrière un rideau de lierre. Là, posée sur un socle de marbre veiné, une fiole ambrée capte les derniers rayons du soleil. Son contenu scintille comme de l'or liquide. En la soulevant, vous découvrez un message gravé dans le socle — les mots d'un bâtisseur oublié qui érigea les premiers murs de Tarenti avec la sueur de son front et la sagesse de ses mains.",
      enigme:
        "Je suis née du feu de la terre, façonnée par le temps et la pluie. Les Romains m'ont taillée pour bâtir leurs temples, les bergers m'ont empilée pour tracer leurs chemins. Je suis le socle de toute civilisation méditerranéenne. Que suis-je ?",
      answer: "pierre",
      type: "enigme",
      order: 2,
    },
    {
      id: "d1b2c3d4-0003-4000-8000-000000000003",
      object_id: "c1b2c3d4-0003-4000-8000-000000000003",
      text_narratif:
        "Le parchemin craque sous vos doigts tandis que vous brisez le sceau de cire rouge. L'écriture, fine et tremblante, est celle du Gardien de Tarenti — le dernier d'une lignée qui veille sur ces terres depuis l'époque des colonies grecques. « Vous avez prouvé votre sagesse, voyageurs, mais la connaissance seule ne suffit pas. Il est temps de prouver votre vaillance. Trouvez mon héritier, celui qui porte le manteau couleur de terre, et accomplissez l'épreuve qu'il vous réserve. »",
      enigme:
        "Le Gardien de Tarenti vous met à l'épreuve. Trouvez-le dans le domaine — il porte un signe distinctif couleur terre cuite. Accomplissez le défi physique qu'il vous proposera pour prouver que vous êtes dignes de poursuivre la quête.",
      answer: null,
      type: "epreuve",
      order: 3,
    },
    {
      id: "d1b2c3d4-0004-4000-8000-000000000004",
      object_id: "c1b2c3d4-0004-4000-8000-000000000004",
      text_narratif:
        "Le Gardien hoche la tête avec un sourire grave. Vous avez passé l'épreuve. De sa besace, il sort une amulette d'argile et la dépose dans votre paume. Le motif en spirale semble pulser doucement sous la lumière rasante. « Ceci est la clef du cœur de Tarenti », souffle-t-il. « Là où tout commence, là où l'eau murmure les secrets que la terre a oubliés. Écoutez bien — elle vous dira où trouver le dernier fragment. »",
      enigme:
        "Je jaillis de la roche sans que personne ne m'appelle. Je suis le commencement de tout fleuve et la fin de toute soif. Les anciens bâtissaient leurs cités autour de moi, et les voyageurs me cherchent avant toute chose. Que suis-je ?",
      answer: "source",
      type: "enigme",
      order: 4,
    },
    {
      id: "d1b2c3d4-0005-4000-8000-000000000005",
      object_id: "c1b2c3d4-0005-4000-8000-000000000005",
      text_narratif:
        "La source vous a mené ici — au cœur même du domaine, là où un vieux figuier étend ses branches au-dessus d'une vasque de pierre moussue. L'eau chante. Le vent porte l'odeur du thym et du romarin sauvage. Au fond de la vasque, à demi submergé, un médaillon de cuivre attend celui qui a traversé toutes les épreuves. En le retournant, vous découvrez une dernière inscription, la plus simple de toutes, celle qui contient la réponse à tout : le nom de cette terre, le nom de cette quête, le nom gravé dans chaque pierre et chaque racine de ce lieu sacré.",
      enigme:
        "Je suis le nom que porte cette terre depuis que les premiers hommes ont foulé ses collines. Je suis le domaine, le mystère, et la réponse finale. Prononcez mon nom pour achever la quête.",
      answer: "tarenti",
      type: "enigme",
      order: 5,
    },
  ];
  for (const step of steps) {
    await insertRow("steps", step);
  }

  // 6. Staff member
  console.log("6️⃣  Staff member");
  await insertRow("staff_members", {
    session_id: "b1b2c3d4-0001-4000-8000-000000000001",
    name: "Le Gardien",
    role: "gardien",
    assigned_step_id: "d1b2c3d4-0003-4000-8000-000000000003",
  });

  // ─── Verify ───
  console.log("\n🔍 Verifying...\n");

  const tables = [
    "organizations",
    "sessions",
    "scoring_config",
    "objects",
    "steps",
    "staff_members",
  ];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("id").limit(100);
    if (error) {
      console.log(`  ❌ ${table}: ${error.message}`);
    } else {
      console.log(`  ✅ ${table}: ${data.length} row(s)`);
    }
  }

  console.log("\n🎉 Seed complete! Access Key: TARENTI24\n");
}

runSeed().catch(console.error);
