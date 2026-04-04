-- ============================================================
-- Rallye Tarenti — Mise à jour v2
-- 9 étapes définitives + description + finish_message
-- À exécuter dans : Supabase > SQL Editor
-- ============================================================

-- ─── 1. Ajouter les colonnes manquantes sur sessions ─────────
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS description   text,
  ADD COLUMN IF NOT EXISTS finish_message text;

-- ─── 2. Mettre à jour le texte de la session ─────────────────
UPDATE sessions
SET
  description    = 'Le Domaine Tarenti est une histoire de famille. Depuis trois générations, les Daoud cultivent cette terre tunisienne — tout a commencé par les arbres fruitiers, les racines du domaine. Il y a trente ans, les premières vaches Tarentaises sont arrivées de Savoie, donnant son nom au lieu. Aujourd''hui, le domaine s''est ouvert au monde tout en gardant son âme paysanne. Ce matin, vous allez le découvrir comme jamais — en partant à la rencontre de ses habitants les plus authentiques.',
  finish_message = 'Bravo ! Vous avez traversé le Domaine Tarenti de bout en bout et rencontré tous ses habitants. Rendez-vous à l''accueil — l''ancienne étable rénovée en salle de restaurant — pour récupérer vos photos souvenir. Merci d''avoir fait partie de l''aventure Tarenti !'
WHERE id = 'a0000000-0000-4000-8000-000000000001';

-- ─── 3. Supprimer les anciens objets (cascade → steps) ────────
DELETE FROM objects WHERE session_id = 'a0000000-0000-4000-8000-000000000001';

-- ─── 4. Insérer les 9 nouveaux objets ─────────────────────────
-- GPS [à renseigner] → coordonnées approx. domaine (36.687, 10.209)
-- Elyes les mettra à jour sur le terrain.

INSERT INTO objects (id, session_id, name, emoji, "order", description, latitude, longitude, is_final)
VALUES
  -- 1. Chèvres Alpines
  (
    'b0000000-0001-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'Chèvres Alpines',
    '🐐',
    1,
    'Cap vers les chèvres ! Ces curieuses vont adorer votre visite.',
    36.687,
    10.209,
    false
  ),
  -- 2. Vignes de Cuves
  (
    'b0000000-0002-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'Vignes de Cuves',
    '🍇',
    2,
    'Direction les vignes du domaine — un trésor vieux de 2000 ans.',
    36.68722819238001,
    10.210195112715699,
    false
  ),
  -- 3. Vaches Tarentaises
  (
    'b0000000-0003-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'Vaches Tarentaises',
    '🐄',
    3,
    'Ces douces bovines venues de Savoie paissent tranquillement. Approchez-vous !',
    36.687,
    10.209,
    false
  ),
  -- 4. Oliviers Tunisiens
  (
    'b0000000-0004-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'Oliviers Tunisiens',
    '🫒',
    4,
    'Les oliviers vous attendent. Certains ont peut-être plus de mille ans !',
    36.68680014294743,
    10.208280597943178,
    false
  ),
  -- 5. Cochon Noir Vietnamien
  (
    'b0000000-0005-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'Cochon Noir Vietnamien',
    '🐷',
    5,
    'Un petit cochon tout noir vous attend — calme, curieux, et venu de loin !',
    36.687,
    10.209,
    false
  ),
  -- 6. Âne Tunisien
  (
    'b0000000-0006-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'Âne Tunisien',
    '🫏',
    6,
    'Un visiteur très patient vous attend avec de grandes oreilles pour bien vous entendre.',
    36.687,
    10.209,
    false
  ),
  -- 7. Champs de Sorgho
  (
    'b0000000-0007-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'Champs de Sorgho',
    '🌾',
    7,
    'Ces grands champs nourrissent les Tarentaises chaque matin.',
    36.687,
    10.209,
    false
  ),
  -- 8. Poules et Ayam Cemani
  (
    'b0000000-0008-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'Poules et Ayam Cemani',
    '🐓',
    8,
    'Parmi ces poules se cache une race rarissime entièrement noire. Saurez-vous la repérer ?',
    36.687,
    10.209,
    false
  ),
  -- 9. Lapins (is_final)
  (
    'b0000000-0009-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'Lapins',
    '🐰',
    9,
    'Dernière étape ! Cherchez bien — les lapins adorent se cacher.',
    36.687,
    10.209,
    true
  );

-- ─── 5. Insérer les 9 steps ───────────────────────────────────

INSERT INTO steps (id, object_id, intro_text, question, answer, hint, fun_fact, "order")
VALUES
  -- 1. Chèvres Alpines
  (
    'c0000000-0001-4000-8000-000000000002',
    'b0000000-0001-4000-8000-000000000002',
    'Vous avez trouvé les chèvres alpines du Domaine Tarenti !',
    'La chèvre alpine est originaire de quel massif montagneux ?',
    'les alpes',
    'Son nom le dit presque...',
    'La chèvre alpine peut produire jusqu''à 800 litres de lait par an — soit plus de 2 litres par jour. Ici elles sont chouchoutées !',
    1
  ),
  -- 2. Vignes de Cuves
  (
    'c0000000-0002-4000-8000-000000000002',
    'b0000000-0002-4000-8000-000000000002',
    'Bienvenue dans les vignes du Domaine Tarenti — un héritage de 2000 ans !',
    'La Tunisie produit du vin depuis l''Antiquité. Quel peuple, avant les Romains, a introduit la vigne en Afrique du Nord ?',
    'les phéniciens',
    'Pensez à Carthage...',
    'Le vignoble tunisien est l''un des plus anciens du monde. Au Domaine Tarenti, ces vignes de cuve produisent des raisins vinifiés localement — une tradition qui remonte à plus de 2000 ans.',
    1
  ),
  -- 3. Vaches Tarentaises
  (
    'c0000000-0003-4000-8000-000000000002',
    'b0000000-0003-4000-8000-000000000002',
    'Bienvenue chez les Tarentaises ! Ces grandes dames sont l''âme du domaine.',
    'Quelle région française a donné son nom à ces vaches... et au Domaine ?',
    'la tarentaise',
    'C''est aussi le nom du domaine...',
    'La Tarentaise est l''une des plus anciennes races bovines de France. Les Daoud les ont fait venir il y a 30 ans — et elles n''ont plus quitté la Tunisie !',
    1
  ),
  -- 4. Oliviers Tunisiens
  (
    'c0000000-0004-4000-8000-000000000002',
    'b0000000-0004-4000-8000-000000000002',
    'Ces oliviers veillent sur le domaine depuis des siècles. Prenez le temps de les observer.',
    'La Tunisie est l''un des premiers exportateurs mondiaux d''huile d''olive. Combien d''oliviers compte-t-on environ sur le territoire tunisien ?',
    '100 millions',
    'C''est un chiffre à 9 zéros...',
    'La variété tunisienne est particulièrement résistante à la chaleur et produit une huile douce et fruitée. Certains oliviers du pays ont plus de 1000 ans !',
    1
  ),
  -- 5. Cochon Noir Vietnamien
  (
    'c0000000-0005-4000-8000-000000000002',
    'b0000000-0005-4000-8000-000000000002',
    'Voici le cochon noir vietnamien — petit, calme, et très curieux !',
    'De quel pays d''Asie vient ce petit cochon tout noir ?',
    'vietnam',
    'Pensez à l''Asie du Sud-Est...',
    'Le cochon noir vietnamien est bien plus petit que ses cousins européens. Calme et curieux, il s''adapte parfaitement aux climats chauds comme celui de la Tunisie.',
    1
  ),
  -- 6. Âne Tunisien
  (
    'c0000000-0006-4000-8000-000000000002',
    'b0000000-0006-4000-8000-000000000002',
    'L''âne tunisien du Domaine coule une retraite bien méritée. Approchez-vous doucement !',
    'L''âne a longtemps été l''animal de travail numéro 1 en Tunisie. Pour quoi l''utilisait-on principalement ?',
    'transport',
    'Avant les tracteurs...',
    'L''âne tunisien est une race locale robuste, parfaitement adaptée à la chaleur et au terrain. Ici il coule une retraite paisible et bien méritée !',
    1
  ),
  -- 7. Champs de Sorgho
  (
    'c0000000-0007-4000-8000-000000000002',
    'b0000000-0007-4000-8000-000000000002',
    'Ces grands champs de sorgho nourrissent les Tarentaises chaque matin.',
    'Le sorgho sert ici à nourrir les vaches le matin. Sur quel continent est-il un aliment de base pour les humains ?',
    'afrique',
    'Le continent le plus proche de la Tunisie...',
    'Le sorgho est l''une des céréales les plus résistantes à la sécheresse au monde. Au Domaine Tarenti, ces champs nourrissent les Tarentaises chaque matin.',
    1
  ),
  -- 8. Poules et Ayam Cemani
  (
    'c0000000-0008-4000-8000-000000000002',
    'b0000000-0008-4000-8000-000000000002',
    'Parmi ces poules se cache une star rarissime entièrement noire — l''Ayam Cemani !',
    'L''une de ces poules est entièrement noire — plumes, bec, pattes et même chair. De quelle île indonésienne vient-elle ?',
    'java',
    'C''est l''île la plus peuplée du monde...',
    'L''Ayam Cemani est l''une des races les plus rares au monde. Sa couleur noire totale vient d''une hyperpigmentation génétique appelée fibromatose. Une vraie star du domaine !',
    1
  ),
  -- 9. Lapins
  (
    'c0000000-0009-4000-8000-000000000002',
    'b0000000-0009-4000-8000-000000000002',
    'Dernière étape — et pas des moindres ! Les lapins vous attendent.',
    'Les lapins tapent leurs pattes arrière sur le sol pour communiquer. Que signifie ce signal ?',
    'danger',
    'C''est un signal d''alarme...',
    'Un lapin heureux fait des bonds et des pirouettes — si vous en voyez un sauter en l''air, c''est qu''il est aux anges !',
    1
  );
