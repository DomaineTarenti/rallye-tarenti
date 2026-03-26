-- ============================================================
-- The Quest — Seed Data : Domaine Tarenti
-- ============================================================
-- Exécuter APRÈS schema.sql dans le SQL Editor de Supabase

-- ─── 1. Organisation ────────────────────────────────────────
INSERT INTO organizations (id, name, slug, primary_color)
VALUES (
  'a1b2c3d4-0001-4000-8000-000000000001',
  'Domaine Tarenti',
  'tarenti',
  '#C4622D'
);

-- ─── 2. Session active ──────────────────────────────────────
INSERT INTO sessions (id, org_id, name, code, status, theme, duration_minutes, primary_color, started_at)
VALUES (
  'b1b2c3d4-0001-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  'Tarenti Mysteria',
  'TARENTI24',
  'active',
  'Mystère méditerranéen antique',
  90,
  '#C4622D',
  now()
);

-- ─── 3. Scoring config ──────────────────────────────────────
INSERT INTO scoring_config (session_id)
VALUES ('b1b2c3d4-0001-4000-8000-000000000001');

-- ─── 4. Objets physiques ────────────────────────────────────

-- Objet 1 : Le Scarabée de Bronze
INSERT INTO objects (id, session_id, name, qr_code_id, "order", description)
VALUES (
  'c1b2c3d4-0001-4000-8000-000000000001',
  'b1b2c3d4-0001-4000-8000-000000000001',
  'Le Scarabée de Bronze',
  'QR-TARENTI-001',
  1,
  'Un scarabée en bronze patiné, gravé de symboles anciens'
);

-- Objet 2 : La Fiole Ambrée
INSERT INTO objects (id, session_id, name, qr_code_id, "order", description)
VALUES (
  'c1b2c3d4-0002-4000-8000-000000000002',
  'b1b2c3d4-0001-4000-8000-000000000001',
  'La Fiole Ambrée',
  'QR-TARENTI-002',
  2,
  'Une fiole de verre ambré contenant une huile parfumée millénaire'
);

-- Objet 3 : Le Parchemin Scellé
INSERT INTO objects (id, session_id, name, qr_code_id, "order", description)
VALUES (
  'c1b2c3d4-0003-4000-8000-000000000003',
  'b1b2c3d4-0001-4000-8000-000000000001',
  'Le Parchemin Scellé',
  'QR-TARENTI-003',
  3,
  'Un rouleau de parchemin scellé à la cire rouge, portant le sceau du Gardien'
);

-- Objet 4 : L'Amulette d'Argile
INSERT INTO objects (id, session_id, name, qr_code_id, "order", description)
VALUES (
  'c1b2c3d4-0004-4000-8000-000000000004',
  'b1b2c3d4-0001-4000-8000-000000000001',
  'L''Amulette d''Argile',
  'QR-TARENTI-004',
  4,
  'Une amulette d''argile cuite au soleil, ornée d''un motif en spirale'
);

-- Objet 5 : Le Médaillon Final
INSERT INTO objects (id, session_id, name, qr_code_id, "order", description)
VALUES (
  'c1b2c3d4-0005-4000-8000-000000000005',
  'b1b2c3d4-0001-4000-8000-000000000001',
  'Le Médaillon Final',
  'QR-TARENTI-005',
  5,
  'Un médaillon de cuivre frappé d''un soleil levant sur les collines de Tarenti'
);

-- ─── 5. Étapes (une par objet) ──────────────────────────────

-- Étape 1 — Le Scarabée de Bronze (enigme → "olivier")
INSERT INTO steps (id, object_id, text_narratif, enigme, answer, type, "order")
VALUES (
  'd1b2c3d4-0001-4000-8000-000000000001',
  'c1b2c3d4-0001-4000-8000-000000000001',
  'Les dernières lueurs du crépuscule embrasent les collines du Domaine Tarenti. Sous vos pieds, un sentier de pierres usées serpente entre les murets séculaires. Un scarabée de bronze git là, à demi enfoui dans la terre ocre, comme s''il vous attendait depuis des siècles. Sur son dos, une inscription presque effacée murmure les mots d''Aristide, le dernier gardien du domaine : « Celui qui cherche la vérité doit d''abord écouter l''arbre qui nourrit cette terre depuis mille ans. »',
  'Je suis l''arbre sacré de la Méditerranée. Mon fruit donne une huile d''or, mes branches sont symbole de paix, et mes racines plongent dans la mémoire des civilisations. Quel est mon nom ?',
  'olivier',
  'enigme',
  1
);

-- Étape 2 — La Fiole Ambrée (enigme → "pierre")
INSERT INTO steps (id, object_id, text_narratif, enigme, answer, type, "order")
VALUES (
  'd1b2c3d4-0002-4000-8000-000000000002',
  'c1b2c3d4-0002-4000-8000-000000000002',
  'L''huile de l''olivier ancien vous a guidé jusqu''à une alcôve dissimulée derrière un rideau de lierre. Là, posée sur un socle de marbre veiné, une fiole ambrée capte les derniers rayons du soleil. Son contenu scintille comme de l''or liquide. En la soulevant, vous découvrez un message gravé dans le socle — les mots d''un bâtisseur oublié qui érigea les premiers murs de Tarenti avec la sueur de son front et la sagesse de ses mains.',
  'Je suis née du feu de la terre, façonnée par le temps et la pluie. Les Romains m''ont taillée pour bâtir leurs temples, les bergers m''ont empilée pour tracer leurs chemins. Je suis le socle de toute civilisation méditerranéenne. Que suis-je ?',
  'pierre',
  'enigme',
  2
);

-- Étape 3 — Le Parchemin Scellé (epreuve → staff)
INSERT INTO steps (id, object_id, text_narratif, enigme, answer, type, "order")
VALUES (
  'd1b2c3d4-0003-4000-8000-000000000003',
  'c1b2c3d4-0003-4000-8000-000000000003',
  'Le parchemin craque sous vos doigts tandis que vous brisez le sceau de cire rouge. L''écriture, fine et tremblante, est celle du Gardien de Tarenti — le dernier d''une lignée qui veille sur ces terres depuis l''époque des colonies grecques. « Vous avez prouvé votre sagesse, voyageurs, mais la connaissance seule ne suffit pas. Il est temps de prouver votre vaillance. Trouvez mon héritier, celui qui porte le manteau couleur de terre, et accomplissez l''épreuve qu''il vous réserve. »',
  'Le Gardien de Tarenti vous met à l''épreuve. Trouvez-le dans le domaine — il porte un signe distinctif couleur terre cuite. Accomplissez le défi physique qu''il vous proposera pour prouver que vous êtes dignes de poursuivre la quête.',
  NULL,
  'epreuve',
  3
);

-- Étape 4 — L'Amulette d'Argile (enigme → "source")
INSERT INTO steps (id, object_id, text_narratif, enigme, answer, type, "order")
VALUES (
  'd1b2c3d4-0004-4000-8000-000000000004',
  'c1b2c3d4-0004-4000-8000-000000000004',
  'Le Gardien hoche la tête avec un sourire grave. Vous avez passé l''épreuve. De sa besace, il sort une amulette d''argile et la dépose dans votre paume. Le motif en spirale semble pulser doucement sous la lumière rasante. « Ceci est la clef du cœur de Tarenti », souffle-t-il. « Là où tout commence, là où l''eau murmure les secrets que la terre a oubliés. Écoutez bien — elle vous dira où trouver le dernier fragment. »',
  'Je jaillis de la roche sans que personne ne m''appelle. Je suis le commencement de tout fleuve et la fin de toute soif. Les anciens bâtissaient leurs cités autour de moi, et les voyageurs me cherchent avant toute chose. Que suis-je ?',
  'source',
  'enigme',
  4
);

-- Étape 5 — Le Médaillon Final (enigme → "tarenti")
INSERT INTO steps (id, object_id, text_narratif, enigme, answer, type, "order")
VALUES (
  'd1b2c3d4-0005-4000-8000-000000000005',
  'c1b2c3d4-0005-4000-8000-000000000005',
  'La source vous a mené ici — au cœur même du domaine, là où un vieux figuier étend ses branches au-dessus d''une vasque de pierre moussue. L''eau chante. Le vent porte l''odeur du thym et du romarin sauvage. Au fond de la vasque, à demi submergé, un médaillon de cuivre attend celui qui a traversé toutes les épreuves. En le retournant, vous découvrez une dernière inscription, la plus simple de toutes, celle qui contient la réponse à tout : le nom de cette terre, le nom de cette quête, le nom gravé dans chaque pierre et chaque racine de ce lieu sacré.',
  'Je suis le nom que porte cette terre depuis que les premiers hommes ont foulé ses collines. Je suis le domaine, le mystère, et la réponse finale. Prononcez mon nom pour achever la quête.',
  'tarenti',
  'enigme',
  5
);

-- ─── 6. Staff member ────────────────────────────────────────
INSERT INTO staff_members (session_id, name, role, assigned_step_id)
VALUES (
  'b1b2c3d4-0001-4000-8000-000000000001',
  'Le Gardien',
  'gardien',
  'd1b2c3d4-0003-4000-8000-000000000003'
);
