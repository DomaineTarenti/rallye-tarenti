-- ============================================================
-- The Quest — Seed Data : Domaine Tarenti (9 permanent objects)
-- Run AFTER schema.sql + all migrations
-- ============================================================

-- ─── 1. Organization ────────────────────────────────────────
INSERT INTO organizations (id, name, slug, primary_color)
VALUES ('a1b2c3d4-0001-4000-8000-000000000001', 'Domaine Tarenti', 'tarenti', '#C4622D')
ON CONFLICT (slug) DO NOTHING;

-- ─── 2. Session ─────────────────────────────────────────────
INSERT INTO sessions (id, org_id, name, code, status, theme, duration_minutes, primary_color, started_at, intro_text)
VALUES (
  'b1b2c3d4-0001-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  'Tarenti Mysteria', 'TARENTI24', 'active',
  'An ancient Mediterranean mystery among olive groves and sun-bleached ruins',
  90, '#C4622D', now(),
  'Les collines de Tarenti murmurent un secret vieux de mille ans. Quelque part entre les oliviers centenaires et les ruines blanchies par le soleil, neuf artefacts attendent d''être découverts. Chacun porte un fragment de vérité, un morceau du puzzle laissé par Aristide, le dernier gardien de ces terres. Votre quête commence maintenant — suivez les indices, fiez-vous à votre instinct, et que le premier artefact vous révèle le chemin.'
) ON CONFLICT (code) DO UPDATE SET status='active', started_at=now(),
  intro_text=EXCLUDED.intro_text;

-- ─── 3. Scoring config ──────────────────────────────────────
INSERT INTO scoring_config (session_id)
VALUES ('b1b2c3d4-0001-4000-8000-000000000001')
ON CONFLICT (session_id) DO NOTHING;

-- ─── Clean ──────────────────────────────────────────────────
DELETE FROM objects WHERE session_id = 'b1b2c3d4-0001-4000-8000-000000000001';

-- ─── 4. Nine permanent objects ──────────────────────────────

INSERT INTO objects (id, session_id, name, qr_code_id, physical_id, "order", description, is_final) VALUES
('c1000000-0001-4000-8000-000000000001', 'b1b2c3d4-0001-4000-8000-000000000001', 'Le Scarabée de Bronze',    'QR-TAR-001', 'OBJ-01', 1, 'Un scarabée en bronze patiné, gravé de symboles anciens', false),
('c1000000-0002-4000-8000-000000000002', 'b1b2c3d4-0001-4000-8000-000000000001', 'La Fiole Ambrée',          'QR-TAR-002', 'OBJ-02', 2, 'Une fiole de verre ambré contenant une huile millénaire', false),
('c1000000-0003-4000-8000-000000000003', 'b1b2c3d4-0001-4000-8000-000000000001', 'Le Rouleau de Parchemin',  'QR-TAR-003', 'OBJ-03', 3, 'Un parchemin scellé à la cire rouge sang', false),
('c1000000-0004-4000-8000-000000000004', 'b1b2c3d4-0001-4000-8000-000000000001', 'L''Amulette d''Argile',    'QR-TAR-004', 'OBJ-04', 4, 'Une amulette d''argile ornée d''un motif en spirale', false),
('c1000000-0005-4000-8000-000000000005', 'b1b2c3d4-0001-4000-8000-000000000001', 'La Clé Ancienne',          'QR-TAR-005', 'OBJ-05', 5, 'Une clé ornementale en cuivre vert-de-gris', false),
('c1000000-0006-4000-8000-000000000006', 'b1b2c3d4-0001-4000-8000-000000000001', 'Le Sceau Circulaire',      'QR-TAR-006', 'OBJ-06', 6, 'Un sceau de cire portant l''empreinte d''un olivier', false),
('c1000000-0007-4000-8000-000000000007', 'b1b2c3d4-0001-4000-8000-000000000001', 'Le Fragment de Carte',     'QR-TAR-007', 'OBJ-07', 7, 'Un fragment de carte ancienne sur peau de chèvre', false),
('c1000000-0008-4000-8000-000000000008', 'b1b2c3d4-0001-4000-8000-000000000001', 'L''Urne Miniature',        'QR-TAR-008', 'OBJ-08', 8, 'Fragments d''urne noircie par le feu des potiers', false),
('c1000000-0009-4000-8000-000000000009', 'b1b2c3d4-0001-4000-8000-000000000001', 'Le Médaillon Final',       'QR-TAR-009', 'OBJ-09', 9, 'Un médaillon de cuivre frappé d''un soleil levant', true);

-- ─── 5. Steps (9 — one per object) ─────────────────────────

INSERT INTO steps (id, object_id, text_narratif, enigme, answer, type, "order") VALUES
('d1000000-0001-4000-8000-000000000001', 'c1000000-0001-4000-8000-000000000001',
 'Les dernières lueurs du crépuscule embrasent les collines du Domaine Tarenti. Un scarabée de bronze gît là, à demi enfoui dans la terre ocre. Sur son dos, une inscription murmure les mots d''Aristide : « Celui qui cherche la vérité doit d''abord écouter l''arbre qui nourrit cette terre depuis mille ans. »',
 'Je suis l''arbre sacré de la Méditerranée. Mon fruit donne une huile d''or, mes branches sont symbole de paix. Quel est mon nom ?', 'olivier', 'enigme', 1),

('d1000000-0002-4000-8000-000000000002', 'c1000000-0002-4000-8000-000000000002',
 'Posée sur un socle de marbre, une fiole ambrée capte les derniers rayons du soleil. Son contenu scintille comme de l''or liquide. Un message gravé dans le socle raconte les mots d''un bâtisseur oublié qui érigea les premiers murs de Tarenti.',
 'Je suis née du feu de la terre, façonnée par le temps. Les Romains m''ont taillée pour bâtir leurs temples. Que suis-je ?', 'pierre', 'enigme', 2),

('d1000000-0003-4000-8000-000000000003', 'c1000000-0003-4000-8000-000000000003',
 'Le parchemin craque sous vos doigts. L''écriture est celle du Gardien de Tarenti : « Vous avez prouvé votre sagesse, voyageurs, mais la connaissance seule ne suffit pas. Trouvez mon héritier et accomplissez l''épreuve qu''il vous réserve. »',
 'Le Gardien vous met à l''épreuve. Trouvez-le dans le domaine et accomplissez son défi physique.', NULL, 'epreuve', 3),

('d1000000-0004-4000-8000-000000000004', 'c1000000-0004-4000-8000-000000000004',
 'Le Gardien dépose une amulette d''argile dans votre paume. Le motif en spirale pulse sous la lumière. « Ceci est la clef du cœur de Tarenti — là où l''eau murmure les secrets que la terre a oubliés. »',
 'Je jaillis de la roche sans que personne ne m''appelle. Je suis le commencement de tout fleuve. Que suis-je ?', 'source', 'enigme', 4),

('d1000000-0005-4000-8000-000000000005', 'c1000000-0005-4000-8000-000000000005',
 'La source vous conduit vers une porte de bois vermoulu sous un escalier de jasmin sauvage. La serrure est intacte malgré les siècles. Un texte en latin mentionne l''année où Constantinople tomba.',
 'Entrez l''année de la chute de Constantinople (4 chiffres).', '1453', 'enigme', 5),

('d1000000-0006-4000-8000-000000000006', 'c1000000-0006-4000-8000-000000000006',
 'La porte s''ouvre sur une salle voûtée baignée de lumière dorée. Au centre, un sceau de cire frappé de l''olivier — le symbole des Gardiens. Une voix résonne : « Pour mériter le sceau, prouvez votre courage une seconde fois. »',
 'Le Second Gardien vous attend pour une épreuve de cohésion. Votre fellowship entière doit participer.', NULL, 'epreuve', 6),

('d1000000-0007-4000-8000-000000000007', 'c1000000-0007-4000-8000-000000000007',
 'Le Gardien vous remet un fragment de carte dessiné sur peau de chèvre tannée. Les lignes tracées à l''encre de seiche montrent un réseau de chemins convergent vers un point marqué d''une étoile.',
 'Quelle civilisation a fondé Tarente au VIIIe siècle av. J.-C. ?|Les Grecs de Sparte|Les Romains|Les Phéniciens|Les Étrusques', 'Les Grecs de Sparte', 'enigme', 7),

('d1000000-0008-4000-8000-000000000008', 'c1000000-0008-4000-8000-000000000008',
 'Les ruines d''un four à céramique noirci par des millénaires de cuissons. Des fragments d''urnes jonchent le sol. Les motifs gravés montrent des spirales de fumée s''élevant vers un soleil.',
 'Je danse sans jambes, je dévore sans bouche. Les potiers me vénéraient. Quel est mon nom ?', 'feu', 'enigme', 8),

('d1000000-0009-4000-8000-000000000009', 'c1000000-0009-4000-8000-000000000009',
 'Le feu vous a montré le chemin vers le cœur du domaine — un vieux figuier centenaire au-dessus d''une vasque de pierre moussue. Au fond de la vasque, un médaillon de cuivre attend celui qui a traversé toutes les épreuves. La dernière inscription, la plus simple de toutes : le nom de cette terre.',
 'Je suis le domaine, le mystère, la réponse finale. Prononcez mon nom.', 'tarenti', 'enigme', 9);

-- ─── 6. Staff ───────────────────────────────────────────────
DELETE FROM staff_members WHERE session_id = 'b1b2c3d4-0001-4000-8000-000000000001';
INSERT INTO staff_members (session_id, name, role, assigned_step_id, validation_code) VALUES
('b1b2c3d4-0001-4000-8000-000000000001', 'Le Premier Gardien', 'gardien', 'd1000000-0003-4000-8000-000000000003', '4721'),
('b1b2c3d4-0001-4000-8000-000000000001', 'Le Second Gardien', 'gardien', 'd1000000-0006-4000-8000-000000000006', '8356');
