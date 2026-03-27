-- ============================================================
-- The Quest — Seed Data : Domaine Tarenti (9 permanent objects)
-- Run AFTER schema.sql + all migrations
-- ============================================================

INSERT INTO organizations (id, name, slug, primary_color)
VALUES ('a1b2c3d4-0001-4000-8000-000000000001', 'Domaine Tarenti', 'tarenti', '#C4622D')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO sessions (id, org_id, name, code, status, theme, duration_minutes, primary_color, started_at, intro_text)
VALUES (
  'b1b2c3d4-0001-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  'Tarenti Mysteria', 'TARENTI24', 'active',
  'An ancient Mediterranean mystery among olive groves and sun-bleached ruins',
  90, '#C4622D', now(),
  'Les collines de Tarenti murmurent un secret vieux de mille ans. Quelque part entre les oliviers centenaires et les ruines blanchies par le soleil, neuf artefacts attendent d''être découverts. Chacun porte un fragment de vérité laissé par Aristide, le dernier gardien. Votre quête commence maintenant — suivez les indices et que le premier artefact vous révèle le chemin.'
) ON CONFLICT (code) DO UPDATE SET status='active', started_at=now(), intro_text=EXCLUDED.intro_text;

INSERT INTO scoring_config (session_id)
VALUES ('b1b2c3d4-0001-4000-8000-000000000001')
ON CONFLICT (session_id) DO NOTHING;

DELETE FROM objects WHERE session_id = 'b1b2c3d4-0001-4000-8000-000000000001';

-- ─── 9 Permanent Objects ────────────────────────────────────

INSERT INTO objects (id, session_id, name, qr_code_id, physical_id, "order", description, is_final) VALUES
('c1000000-0001-4000-8000-000000000001', 'b1b2c3d4-0001-4000-8000-000000000001', 'Le Scarabée de Bronze',    'QR-OBJ-01-KRTM', 'OBJ-01', 1, 'Un scarabée en résine bronze, symbole de protection et de renaissance', false),
('c1000000-0002-4000-8000-000000000002', 'b1b2c3d4-0001-4000-8000-000000000001', 'La Fiole Ambrée',          'QR-OBJ-02-WFNL', 'OBJ-02', 2, 'Une petite fiole cylindrique en résine translucide couleur ambre', false),
('c1000000-0003-4000-8000-000000000003', 'b1b2c3d4-0001-4000-8000-000000000001', 'Le Rouleau de Parchemin',  'QR-OBJ-03-PXVD', 'OBJ-03', 3, 'Un rouleau miniature en résine, comme un parchemin ancien enroulé', false),
('c1000000-0004-4000-8000-000000000004', 'b1b2c3d4-0001-4000-8000-000000000001', 'L''Amulette d''Argile',    'QR-OBJ-04-HTJQ', 'OBJ-04', 4, 'Une amulette ovale en résine texturée imitant l''argile cuite', false),
('c1000000-0005-4000-8000-000000000005', 'b1b2c3d4-0001-4000-8000-000000000001', 'La Clé Ancienne',          'QR-OBJ-05-BMGS', 'OBJ-05', 5, 'Une grande clé ancienne en résine, style médiéval avec anneau décoratif', false),
('c1000000-0006-4000-8000-000000000006', 'b1b2c3d4-0001-4000-8000-000000000001', 'Le Sceau du Gardien',      'QR-OBJ-06-RLZN', 'OBJ-06', 6, 'Un sceau circulaire en résine avec motif géométrique gravé', false),
('c1000000-0007-4000-8000-000000000007', 'b1b2c3d4-0001-4000-8000-000000000001', 'Le Fragment de Carte',     'QR-OBJ-07-YCAK', 'OBJ-07', 7, 'Un fragment de carte en résine avec reliefs de montagnes et chemins', false),
('c1000000-0008-4000-8000-000000000008', 'b1b2c3d4-0001-4000-8000-000000000001', 'L''Urne Miniature',        'QR-OBJ-08-DXFP', 'OBJ-08', 8, 'Une petite urne grecque en résine avec motifs de vagues en relief', false),
('c1000000-0009-4000-8000-000000000009', 'b1b2c3d4-0001-4000-8000-000000000001', 'Le Médaillon Final',       'QR-OBJ-09-MNQT', 'OBJ-09', 9, 'Un grand médaillon circulaire en résine dorée — le trésor ultime', true);

-- ─── 9 Steps ────────────────────────────────────────────────

INSERT INTO steps (id, object_id, text_narratif, enigme, answer, type, "order") VALUES
('d1000000-0001-4000-8000-000000000001', 'c1000000-0001-4000-8000-000000000001',
 'Les dernières lueurs du crépuscule embrasent les collines du Domaine Tarenti. Un scarabée de bronze gît là, à demi enfoui dans la terre ocre. Sur son dos, une inscription murmure les mots d''Aristide : « Celui qui cherche la vérité doit d''abord écouter l''arbre qui nourrit cette terre depuis mille ans. »',
 'Je suis l''arbre sacré de la Méditerranée. Mon fruit donne une huile d''or, mes branches sont symbole de paix. Quel est mon nom ?', 'olivier', 'enigme', 1),

('d1000000-0002-4000-8000-000000000002', 'c1000000-0002-4000-8000-000000000002',
 'Posée sur un socle de marbre, une fiole ambrée capte les derniers rayons. Son contenu scintille comme de l''or liquide. Un message gravé raconte les mots d''un bâtisseur oublié qui érigea les premiers murs de Tarenti.',
 'Je suis née du feu de la terre, façonnée par le temps. Les Romains m''ont taillée pour bâtir leurs temples. Que suis-je ?', 'pierre', 'enigme', 2),

('d1000000-0003-4000-8000-000000000003', 'c1000000-0003-4000-8000-000000000003',
 'Le parchemin craque sous vos doigts. L''écriture du Gardien de Tarenti dit : « Vous avez prouvé votre sagesse. Là où l''eau murmure les secrets que la terre a oubliés, vous trouverez la suite de votre quête. »',
 'Je jaillis de la roche sans que personne ne m''appelle. Je suis le commencement de tout fleuve. Que suis-je ?', 'source', 'enigme', 3),

('d1000000-0004-4000-8000-000000000004', 'c1000000-0004-4000-8000-000000000004',
 'Le Gardien dépose une amulette d''argile dans votre paume. Le motif en spirale pulse sous la lumière. « Ceci est la clef du cœur de Tarenti. Blanc comme la neige mais né de la mer, les anciens se sont battus pour le posséder. »',
 'Je suis blanc mais né de la mer. Les anciens me récoltaient au soleil. Mon nom ne contient que trois lettres. Qui suis-je ?', 'sel', 'enigme', 4),

('d1000000-0005-4000-8000-000000000005', 'c1000000-0005-4000-8000-000000000005',
 'La clé ancienne attend devant une porte de bois vermoulu sous un escalier de jasmin sauvage. La serrure est intacte malgré les siècles. « Vous avez prouvé votre sagesse, mais la connaissance seule ne suffit pas. Trouvez le Gardien et accomplissez son défi. »',
 'Le Premier Gardien vous met à l''épreuve. Trouvez-le dans le domaine et accomplissez le défi physique qu''il vous propose.', NULL, 'epreuve', 5),

('d1000000-0006-4000-8000-000000000006', 'c1000000-0006-4000-8000-000000000006',
 'Une salle voûtée baignée de lumière dorée. Au centre, un sceau circulaire portant l''empreinte de l''olivier. Une voix résonne : « Pour mériter le sceau, prouvez votre courage une seconde fois. Le Second Gardien vous attend. »',
 'Le Second Gardien vous attend pour une épreuve de cohésion. Votre fellowship entière doit participer.', NULL, 'epreuve', 6),

('d1000000-0007-4000-8000-000000000007', 'c1000000-0007-4000-8000-000000000007',
 'Le Gardien vous remet un fragment de carte dessiné sur peau de chèvre. Les lignes tracées à l''encre de seiche montrent des chemins convergent vers un point marqué d''une étoile.',
 'Quelle civilisation a fondé Tarente au VIIIe siècle av. J.-C. ?|Les Grecs de Sparte|Les Romains|Les Phéniciens|Les Étrusques', 'Les Grecs de Sparte', 'enigme', 7),

('d1000000-0008-4000-8000-000000000008', 'c1000000-0008-4000-8000-000000000008',
 'Les ruines d''un ancien four à céramique noirci par des millénaires de cuissons. Les motifs sur l''urne montrent des spirales de fumée s''élevant vers un soleil. Les potiers vénéraient cet élément qui donnait vie à l''argile.',
 'Je danse sans jambes, je dévore sans bouche. Les potiers me vénéraient. Quel est mon nom ?', 'feu', 'enigme', 8),

('d1000000-0009-4000-8000-000000000009', 'c1000000-0009-4000-8000-000000000009',
 'Le feu vous a montré le chemin vers le cœur du domaine — un vieux figuier centenaire au-dessus d''une vasque moussue. Au fond de la vasque, un médaillon de cuivre attend. La dernière inscription : le nom de cette terre, le nom de cette quête.',
 'Je suis le domaine, le mystère, la réponse finale. Prononcez mon nom.', 'tarenti', 'enigme', 9);

-- ─── Staff ──────────────────────────────────────────────────
DELETE FROM staff_members WHERE session_id = 'b1b2c3d4-0001-4000-8000-000000000001';
INSERT INTO staff_members (session_id, name, role, assigned_step_id, validation_code) VALUES
('b1b2c3d4-0001-4000-8000-000000000001', 'Le Premier Gardien', 'gardien', 'd1000000-0005-4000-8000-000000000005', '4721'),
('b1b2c3d4-0001-4000-8000-000000000001', 'Le Second Gardien', 'gardien', 'd1000000-0006-4000-8000-000000000006', '8356');
