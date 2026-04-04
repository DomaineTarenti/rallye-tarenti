-- ============================================================
-- Rallye Tarenti — Seed de données (v1)
-- Session TARENTI25 avec 7 animaux + 15 équipes de test
-- ============================================================

-- ─── Session ──────────────────────────────────────────────────
INSERT INTO sessions (id, name, code, status, primary_color)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'Rallye Tarenti 2025',
  'TARENTI25',
  'active',
  '#2D7D46'
);

-- ─── Objets (ordre fixe 1→7) ──────────────────────────────────
INSERT INTO objects (id, session_id, name, emoji, "order", description, latitude, longitude, is_final)
VALUES
  -- 1. Chèvres
  (
    'b0000000-0001-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'Les Chèvres',
    '🐐',
    1,
    'Suivez le chemin vers l''enclos des chèvres. Ces curieuses vont adorer votre visite !',
    36.68653492692563,
    10.210360935921443,
    false
  ),
  -- 2. Vaches
  (
    'b0000000-0002-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'Les Vaches',
    '🐄',
    2,
    'Direction les vaches ! Ces douces bovines passent leur journée à brouter tranquillement.',
    36.68790732639046,
    10.209060248513682,
    false
  ),
  -- 3. Âne
  (
    'b0000000-0003-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'L''Âne',
    '🫏',
    3,
    'Un visiteur très patient vous attend... il a de grandes oreilles pour bien vous entendre !',
    36.68630912674403,
    10.208415150340297,
    false
  ),
  -- 4. Cochons
  (
    'b0000000-0004-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'Les Cochons',
    '🐷',
    4,
    'Les cochons fouinent et grognent... ils vous ont sûrement déjà entendu arriver !',
    36.68614330997645,
    10.208318093945488,
    false
  ),
  -- 5. Champ d'herbes
  (
    'b0000000-0005-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'Le Champ Aromatique',
    '🌿',
    5,
    'Fermez les yeux et respirez... le champ aromatique du Domaine Tarenti vous attend.',
    36.68417968248825,
    10.207979379717381,
    false
  ),
  -- 6. Poules
  (
    'b0000000-0006-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'Les Poules',
    '🐔',
    6,
    'Cot cot cot... les poules caquètent pour vous accueillir dans leur enclos !',
    36.68608903628465,
    10.209727428427485,
    false
  ),
  -- 7. Lapin
  (
    'b0000000-0007-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'Le Lapin',
    '🐇',
    7,
    'Cherchez bien... le lapin est peut-être caché dans son terrier ou dans les fourrés !',
    36.68610785682307,
    10.209897078132796,
    false
  );

-- ─── Steps (1 question par animal) ────────────────────────────
INSERT INTO steps (id, object_id, intro_text, question, answer, hint, fun_fact, "order")
VALUES
  -- Chèvres
  (
    'c0000000-0001-4000-8000-000000000001',
    'b0000000-0001-4000-8000-000000000001',
    'Vous avez trouvé les chèvres du Domaine Tarenti ! Observez-les bien avant de répondre.',
    'De quelle forme sont les pupilles d''une chèvre ?',
    'rectangulaire',
    'Regardez attentivement dans leurs yeux... ce n''est pas une forme ronde !',
    'Les chèvres ont des pupilles rectangulaires ! Cette forme particulière leur permet de voir à presque 340° autour d''elles sans bouger la tête. Très pratique pour repérer les prédateurs dans la nature !',
    1
  ),
  -- Vaches
  (
    'c0000000-0002-4000-8000-000000000001',
    'b0000000-0002-4000-8000-000000000001',
    'Bienvenue chez les vaches du Domaine Tarenti ! Ces grandes dames passent leur temps à brouter et ruminer.',
    'Combien d''estomacs a une vache ?',
    '4',
    'C''est plus d''un seul... les vaches sont des ruminants !',
    'Les vaches ont 4 estomacs ! Elles avalent l''herbe, la régurgitent pour la mâcher à nouveau — c''est ce qu''on appelle ruminer. Elles passent jusqu''à 8 heures par jour à mâcher. Impressionnant, non ?',
    1
  ),
  -- Âne
  (
    'c0000000-0003-4000-8000-000000000001',
    'b0000000-0003-4000-8000-000000000001',
    'L''âne du Domaine vous attend avec sa bonne humeur légendaire ! Un animal fidèle et très intelligent.',
    'Comment s''appelle le cri de l''âne ?',
    'braiment',
    'L''âne fait "hi-han"... ce son porte un nom précis !',
    'Le cri de l''âne s''appelle le braiment ! Un hi-han peut s''entendre jusqu''à 3 km de distance. Les ânes beuglent pour communiquer avec leurs amis ou pour exprimer leurs émotions. Un animal très expressif !',
    1
  ),
  -- Cochons
  (
    'c0000000-0004-4000-8000-000000000001',
    'b0000000-0004-4000-8000-000000000001',
    'Les cochons du Domaine grognent pour vous dire bonjour ! Des animaux bien plus intelligents qu''on ne le croit.',
    'Quel est le nom du bébé cochon ?',
    'porcelet',
    'C''est un mot qui ressemble à "cochon"... en version miniature !',
    'Le bébé cochon s''appelle le porcelet ! Les cochons sont parmi les animaux les plus intelligents de la ferme — plus que les chiens selon certaines études. Ils peuvent reconnaître leur prénom et même apprendre des tours !',
    1
  ),
  -- Champ aromatique
  (
    'c0000000-0005-4000-8000-000000000001',
    'b0000000-0005-4000-8000-000000000001',
    'Bienvenue dans le champ aromatique du Domaine ! Fermez les yeux un instant et respirez profondément.',
    'Pour préparer une tisane à la menthe, quelle partie de la plante utilise-t-on ?',
    'feuilles',
    'C''est la partie verte et parfumée de la plante !',
    'On utilise les feuilles de menthe pour faire la tisane ! La menthe est au cœur de la culture tunisienne : le thé à la menthe est une boisson traditionnelle incontournable. La Tunisie est l''un des plus grands producteurs de plantes aromatiques d''Afrique.',
    1
  ),
  -- Poules
  (
    'c0000000-0006-4000-8000-000000000001',
    'b0000000-0006-4000-8000-000000000001',
    'Les poules caquettent pour vous accueillir ! Ces dames pondeuses travaillent dur chaque jour.',
    'Combien de jours met un œuf de poule pour éclore ?',
    '21',
    'C''est environ 3 semaines... comptez les jours !',
    'Un œuf de poule met exactement 21 jours pour éclore ! La poule retourne ses œufs plusieurs fois par jour pour assurer le bon développement du poussin. Une poule pond environ 250 à 300 œufs par an. Merci les poules !',
    1
  ),
  -- Lapin
  (
    'c0000000-0007-4000-8000-000000000001',
    'b0000000-0007-4000-8000-000000000001',
    'Cherchez bien... le lapin est peut-être tapi dans son coin. Un animal vif et adorable !',
    'Comment s''appelle le bébé lapin ?',
    'lapereau',
    'C''est un mot proche de "lapin"... en version bébé !',
    'Le bébé lapin s''appelle le lapereau ! Les lapins ont de très longues oreilles qui leur servent à détecter les prédateurs de loin... mais aussi à réguler leur température corporelle en été en faisant circuler le sang. Pratique sous le soleil tunisien !',
    1
  );

-- ─── Équipes pré-créées (FAM01 à FAM15) ──────────────────────
INSERT INTO teams (id, session_id, name, status, access_code, is_precreated, locked)
VALUES
  ('d0000000-0001-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 01',  'waiting', 'FAM01',  true, false),
  ('d0000000-0002-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 02',  'waiting', 'FAM02',  true, false),
  ('d0000000-0003-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 03',  'waiting', 'FAM03',  true, false),
  ('d0000000-0004-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 04',  'waiting', 'FAM04',  true, false),
  ('d0000000-0005-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 05',  'waiting', 'FAM05',  true, false),
  ('d0000000-0006-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 06',  'waiting', 'FAM06',  true, false),
  ('d0000000-0007-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 07',  'waiting', 'FAM07',  true, false),
  ('d0000000-0008-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 08',  'waiting', 'FAM08',  true, false),
  ('d0000000-0009-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 09',  'waiting', 'FAM09',  true, false),
  ('d0000000-0010-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 10',  'waiting', 'FAM10',  true, false),
  ('d0000000-0011-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 11',  'waiting', 'FAM11',  true, false),
  ('d0000000-0012-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 12',  'waiting', 'FAM12',  true, false),
  ('d0000000-0013-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 13',  'waiting', 'FAM13',  true, false),
  ('d0000000-0014-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 14',  'waiting', 'FAM14',  true, false),
  ('d0000000-0015-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 15',  'waiting', 'FAM15',  true, false);

-- Note: Les team_progress seront créées au moment où chaque équipe rejoint le rallye
-- (via POST /api/team/join), pas ici.
