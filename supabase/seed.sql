-- ============================================================
-- The Quest — Seed Data : Domaine Tarenti (10 stages)
-- ============================================================
-- Run AFTER schema.sql + admin-policies.sql
-- To re-seed: DELETE FROM organizations WHERE slug='tarenti'; then run this.

-- ─── 1. Organization ────────────────────────────────────────
INSERT INTO organizations (id, name, slug, primary_color)
VALUES (
  'a1b2c3d4-0001-4000-8000-000000000001',
  'Domaine Tarenti',
  'tarenti',
  '#C4622D'
) ON CONFLICT (slug) DO NOTHING;

-- ─── 2. Session active ──────────────────────────────────────
INSERT INTO sessions (id, org_id, name, code, status, theme, duration_minutes, primary_color, started_at)
VALUES (
  'b1b2c3d4-0001-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  'Tarenti Mysteria',
  'TARENTI24',
  'active',
  'An ancient Mediterranean mystery among olive groves and sun-bleached ruins',
  90,
  '#C4622D',
  now()
) ON CONFLICT (code) DO UPDATE SET status='active', started_at=now();

-- ─── 3. Scoring config ──────────────────────────────────────
INSERT INTO scoring_config (session_id)
VALUES ('b1b2c3d4-0001-4000-8000-000000000001')
ON CONFLICT (session_id) DO NOTHING;

-- ─── Clean old objects for this session ─────────────────────
DELETE FROM objects WHERE session_id = 'b1b2c3d4-0001-4000-8000-000000000001';

-- ─── 4. Objects (10) ────────────────────────────────────────

INSERT INTO objects (id, session_id, name, qr_code_id, "order", description) VALUES
('c1000000-0001-4000-8000-000000000001', 'b1b2c3d4-0001-4000-8000-000000000001', 'Le Scarabée de Bronze', 'QR-TAR-001', 1, 'Un scarabée en bronze patiné, gravé de symboles anciens'),
('c1000000-0002-4000-8000-000000000002', 'b1b2c3d4-0001-4000-8000-000000000001', 'La Fiole Ambrée', 'QR-TAR-002', 2, 'Une fiole de verre ambré contenant une huile parfumée millénaire'),
('c1000000-0003-4000-8000-000000000003', 'b1b2c3d4-0001-4000-8000-000000000001', 'Le Parchemin Scellé', 'QR-TAR-003', 3, 'Un rouleau de parchemin scellé à la cire rouge'),
('c1000000-0004-4000-8000-000000000004', 'b1b2c3d4-0001-4000-8000-000000000001', 'L''Amulette d''Argile', 'QR-TAR-004', 4, 'Une amulette d''argile ornée d''un motif en spirale'),
('c1000000-0005-4000-8000-000000000005', 'b1b2c3d4-0001-4000-8000-000000000001', 'Le Miroir de Sel', 'QR-TAR-005', 5, 'Un disque de sel cristallisé poli comme un miroir'),
('c1000000-0006-4000-8000-000000000006', 'b1b2c3d4-0001-4000-8000-000000000001', 'La Clé de Cuivre', 'QR-TAR-006', 6, 'Une clé ornementale en cuivre vert-de-gris'),
('c1000000-0007-4000-8000-000000000007', 'b1b2c3d4-0001-4000-8000-000000000001', 'Le Sceau du Gardien', 'QR-TAR-007', 7, 'Un sceau de cire portant l''empreinte d''un olivier'),
('c1000000-0008-4000-8000-000000000008', 'b1b2c3d4-0001-4000-8000-000000000001', 'La Carte Déchirée', 'QR-TAR-008', 8, 'Un fragment de carte ancienne dessiné sur peau de chèvre'),
('c1000000-0009-4000-8000-000000000009', 'b1b2c3d4-0001-4000-8000-000000000001', 'L''Urne Brisée', 'QR-TAR-009', 9, 'Les fragments d''une urne de terre cuite noircie par le feu'),
('c1000000-0010-4000-8000-000000000010', 'b1b2c3d4-0001-4000-8000-000000000001', 'Le Médaillon Final', 'QR-TAR-010', 10, 'Un médaillon de cuivre frappé d''un soleil levant');

-- ─── 5. Steps (10) ──────────────────────────────────────────

-- Step 1 — Le Scarabée de Bronze (enigme → "olivier")
INSERT INTO steps (id, object_id, text_narratif, enigme, answer, type, "order") VALUES (
  'd1000000-0001-4000-8000-000000000001',
  'c1000000-0001-4000-8000-000000000001',
  'Les dernières lueurs du crépuscule embrasent les collines du Domaine Tarenti. Sous vos pieds, un sentier de pierres usées serpente entre les murets séculaires. Un scarabée de bronze gît là, à demi enfoui dans la terre ocre, comme s''il vous attendait depuis des siècles. Sur son dos, une inscription presque effacée murmure les mots d''Aristide, le dernier gardien : « Celui qui cherche la vérité doit d''abord écouter l''arbre qui nourrit cette terre depuis mille ans. » Le vent porte l''odeur des champs, et quelque part, un arbre ancestral veille.',
  'Je suis l''arbre sacré de la Méditerranée. Mon fruit donne une huile d''or, mes branches sont symbole de paix, et mes racines plongent dans la mémoire des civilisations. Quel est mon nom ?',
  'olivier',
  'enigme', 1
);

-- Step 2 — La Fiole Ambrée (enigme → "pierre")
INSERT INTO steps (id, object_id, text_narratif, enigme, answer, type, "order") VALUES (
  'd1000000-0002-4000-8000-000000000002',
  'c1000000-0002-4000-8000-000000000002',
  'L''huile de l''olivier ancien vous a guidé jusqu''à une alcôve dissimulée derrière un rideau de lierre sauvage. Là, posée sur un socle de marbre veiné de rose, une fiole ambrée capte les derniers rayons du soleil. Son contenu scintille comme de l''or liquide, gardant le parfum d''une civilisation disparue. En la soulevant, vous découvrez un message gravé dans le socle — les mots d''un bâtisseur oublié qui érigea les premiers murs de Tarenti avec la sueur de son front et la sagesse de ses mains. La fiole tremble doucement entre vos doigts.',
  'Je suis née du feu de la terre, façonnée par le temps et la pluie. Les Romains m''ont taillée pour bâtir leurs temples, les bergers m''ont empilée pour tracer leurs chemins. Je suis le socle de toute civilisation méditerranéenne. Que suis-je ?',
  'pierre',
  'enigme', 2
);

-- Step 3 — Le Parchemin Scellé (epreuve staff)
INSERT INTO steps (id, object_id, text_narratif, enigme, answer, type, "order") VALUES (
  'd1000000-0003-4000-8000-000000000003',
  'c1000000-0003-4000-8000-000000000003',
  'Le parchemin craque sous vos doigts tandis que vous brisez le sceau de cire rouge sang. L''écriture, fine et tremblante, est celle du Gardien de Tarenti — le dernier d''une lignée secrète qui veille sur ces terres depuis l''époque des colonies grecques. « Vous avez prouvé votre sagesse, voyageurs, mais la connaissance seule ne suffit pas pour percer les mystères de cette terre. Il est temps de prouver votre vaillance. Trouvez mon héritier, celui qui porte le manteau couleur de terre brûlée, et accomplissez l''épreuve qu''il vous réserve. » Les mots semblent vibrer sur le parchemin.',
  'Le Gardien de Tarenti vous met à l''épreuve. Trouvez-le dans le domaine — il porte un signe distinctif couleur terre cuite. Accomplissez le défi physique qu''il vous proposera pour prouver que vous êtes dignes de poursuivre la quête des anciens.',
  NULL,
  'epreuve', 3
);

-- Step 4 — L'Amulette d'Argile (enigme → "source")
INSERT INTO steps (id, object_id, text_narratif, enigme, answer, type, "order") VALUES (
  'd1000000-0004-4000-8000-000000000004',
  'c1000000-0004-4000-8000-000000000004',
  'Le Gardien hoche la tête avec un sourire grave et ancien. Vous avez passé l''épreuve. De sa besace de cuir usé, il sort une amulette d''argile cuite au soleil et la dépose dans votre paume ouverte. Le motif en spirale semble pulser doucement sous la lumière rasante du couchant, comme un cœur minéral. « Ceci est la clef du cœur de Tarenti », souffle-t-il d''une voix qui porte la poussière des siècles. « Là où tout commence, là où l''eau murmure les secrets que la terre a depuis longtemps oubliés. Écoutez bien — elle vous dira où trouver le fragment suivant. »',
  'Je jaillis de la roche sans que personne ne m''appelle. Je suis le commencement de tout fleuve et la fin de toute soif. Les anciens bâtissaient leurs cités autour de moi, et les voyageurs me cherchent avant toute chose. Que suis-je ?',
  'source',
  'enigme', 4
);

-- Step 5 — Le Miroir de Sel (enigme → "sel")
INSERT INTO steps (id, object_id, text_narratif, enigme, answer, type, "order") VALUES (
  'd1000000-0005-4000-8000-000000000005',
  'c1000000-0005-4000-8000-000000000005',
  'La source vous a conduit vers la côte, là où les vagues lèchent les rochers blancs. Dans une crevasse naturelle, protégé du vent par des pierres empilées avec soin, un disque de sel cristallisé repose comme un miroir oublié par la mer. Sa surface est si pure qu''on peut y voir le reflet du ciel. Les marins d''autrefois l''utilisaient pour préserver leurs prises et tracer leurs routes commerciales à travers toute la Méditerranée. En le retournant, des symboles phéniciens racontent l''histoire d''une richesse plus ancienne que l''or.',
  'Je suis blanc comme la neige mais né de la mer. Les anciens me récoltaient dans des bassins au soleil. Je conserve la nourriture, je purifie les plaies, et les civilisations se sont battues pour me posséder. Mon nom ne contient que trois lettres. Qui suis-je ?',
  'sel',
  'enigme', 5
);

-- Step 6 — La Clé de Cuivre (code numérique → "1453")
INSERT INTO steps (id, object_id, text_narratif, enigme, answer, type, "order") VALUES (
  'd1000000-0006-4000-8000-000000000006',
  'c1000000-0006-4000-8000-000000000006',
  'Le sel vous a mené vers une porte de bois vermoulu, cachée sous un escalier de pierre envahi par le jasmin sauvage. La serrure est intacte malgré les siècles — un chef-d''œuvre d''orfèvrerie qui attendait la bonne clé. Mais la clé de cuivre que vous trouvez à côté ne suffit pas : il faut aussi un code. Gravé dans le linteau, un texte en latin mentionne « l''année où le dernier empire romain s''effondra et où Constantinople tomba entre des mains nouvelles ». Les chiffres sont la clé du passage.',
  'Entrez l''année de la chute de Constantinople, quand le dernier vestige de l''Empire romain d''Orient s''effondra sous les coups du sultan Mehmed II. Quatre chiffres qui changèrent le cours de l''histoire.',
  '1453',
  'enigme', 6
);

-- Step 7 — Le Sceau du Gardien (epreuve staff)
INSERT INTO steps (id, object_id, text_narratif, enigme, answer, type, "order") VALUES (
  'd1000000-0007-4000-8000-000000000007',
  'c1000000-0007-4000-8000-000000000007',
  'La porte s''ouvre sur une salle voûtée baignée d''une lumière dorée. Au centre, sur un autel de pierre, repose un sceau de cire frappé de l''empreinte d''un olivier — le symbole des Gardiens de Tarenti. L''air est chargé d''encens et de mystère. Une voix résonne dans la pénombre : « Vous avez franchi le seuil des initiés. Mais pour mériter le sceau, vous devez prouver votre courage une seconde fois. Le Gardien vous attend. Cette épreuve testera non pas votre esprit, mais votre corps et votre cohésion d''équipe. Préparez-vous. »',
  'Le Second Gardien vous attend pour une épreuve de cohésion. Votre fellowship entière doit participer. Trouvez-le près de l''autel — il porte le sceau de l''olivier. Accomplissez son défi pour recevoir la bénédiction des anciens et poursuivre votre quête.',
  NULL,
  'epreuve', 7
);

-- Step 8 — La Carte Déchirée (QCM)
INSERT INTO steps (id, object_id, text_narratif, enigme, answer, type, "order") VALUES (
  'd1000000-0008-4000-8000-000000000008',
  'c1000000-0008-4000-8000-000000000008',
  'Le Gardien, satisfait de votre vaillance, vous remet un fragment de carte dessiné sur peau de chèvre tannée. Les lignes sont fines, tracées à l''encre de seiche, et montrent un réseau de chemins qui convergent vers un point marqué d''une étoile. C''est la carte du domaine telle qu''elle existait il y a deux mille ans. Mais un morceau manque — celui qui indique la direction finale. Pour le reconstituer, vous devez répondre à la question inscrite au dos du parchemin, dans une encre qui ne se révèle qu''à la lumière du crépuscule.',
  'Quelle civilisation a fondé la cité de Tarente (Taras) au VIIIe siècle avant J.-C. ?|Les Grecs de Sparte|Les Romains|Les Phéniciens|Les Étrusques',
  'Les Grecs de Sparte',
  'enigme', 8
);

-- Step 9 — L'Urne Brisée (enigme → "feu")
INSERT INTO steps (id, object_id, text_narratif, enigme, answer, type, "order") VALUES (
  'd1000000-0009-4000-8000-000000000009',
  'c1000000-0009-4000-8000-000000000009',
  'La carte complétée vous guide vers les ruines d''un ancien four à céramique, noirci par des millénaires de cuissons. Des fragments d''urnes jonchent le sol — témoins muets d''un artisanat disparu. Parmi les débris, une urne presque intacte attire votre regard. Sa surface porte des traces de suie et de flammes, mais les motifs gravés restent lisibles : des spirales de fumée qui s''élèvent vers un soleil. Les potiers de Tarenti croyaient que cet élément était sacré, le souffle qui donnait vie à l''argile et transformait la terre en art éternel.',
  'Je danse sans jambes, je dévore sans bouche. Les potiers me vénéraient car je transformais l''argile molle en céramique éternelle. Je réchauffe les foyers et consume les forêts. Les anciens me considéraient comme l''un des quatre éléments sacrés. Quel est mon nom ?',
  'feu',
  'enigme', 9
);

-- Step 10 — Le Médaillon Final (enigme → "tarenti")
INSERT INTO steps (id, object_id, text_narratif, enigme, answer, type, "order") VALUES (
  'd1000000-0010-4000-8000-000000000010',
  'c1000000-0010-4000-8000-000000000010',
  'Le feu vous a montré le chemin vers le cœur même du domaine — là où un vieux figuier centenaire étend ses branches noueuses au-dessus d''une vasque de pierre moussue. L''eau y chante une mélodie ancienne. Le vent porte l''odeur du thym sauvage, du romarin et de la terre chaude. Au fond de la vasque, à demi submergé dans une eau cristalline, un médaillon de cuivre attend celui qui a traversé toutes les épreuves. En le retournant d''une main tremblante, vous découvrez une dernière inscription — la plus simple de toutes, celle qui contient la réponse à tout : le nom de cette terre, le nom de cette quête, le nom gravé dans chaque pierre et chaque racine de ce lieu sacré depuis l''aube des temps.',
  'Je suis le nom que porte cette terre depuis que les premiers hommes ont foulé ses collines baignées de soleil. Je suis le domaine, le mystère, la quête, et la réponse finale. Prononcez mon nom pour achever votre voyage et révéler le trésor.',
  'tarenti',
  'enigme', 10
);

-- ─── 6. Staff members ───────────────────────────────────────
DELETE FROM staff_members WHERE session_id = 'b1b2c3d4-0001-4000-8000-000000000001';

INSERT INTO staff_members (session_id, name, role, assigned_step_id) VALUES
('b1b2c3d4-0001-4000-8000-000000000001', 'Le Premier Gardien', 'gardien', 'd1000000-0003-4000-8000-000000000003'),
('b1b2c3d4-0001-4000-8000-000000000001', 'Le Second Gardien', 'gardien', 'd1000000-0007-4000-8000-000000000007');
