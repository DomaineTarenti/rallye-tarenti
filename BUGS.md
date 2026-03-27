# The Quest — Audit Complet (2026-03-27)

## FLUX 1 — Cr&eacute;ation de session (admin)

- [x] Cr&eacute;er une nouvelle session — `/admin/sessions/new` fonctionne, POST `/api/session` OK
- [x] Les 9 objets sont copi&eacute;s automatiquement — Confirm&eacute; en DB (BGH17 = 9 objects, AJN54 = 9 objects)
- [x] 2 gardiens cr&eacute;&eacute;s automatiquement — Confirm&eacute; (BGH17: Gardien 1/2, AJN54: Gardien 1/2)
- [x] Generate with AI cr&eacute;e 9 &eacute;tapes (steps 1-9) + intro (step 0 dans session) — Confirm&eacute; (BGH17: 9 steps, AJN54: 9 steps)
- [x] Les &eacute;tapes sont sauvegard&eacute;es en base — Confirm&eacute; avec r&eacute;ponses et types corrects
- [x] Auto-save des modifications (debounce 1s) — Impl&eacute;ment&eacute; dans admin page
- [x] Generate QR PDF — Impl&eacute;ment&eacute; avec physical_id comme contenu QR
- [x] Activer/Pauser la session — Impl&eacute;ment&eacute;

**BUG:** SMUFORLIFE a 0 objets et 0 steps — session cr&eacute;&eacute;e avant le fix auto-clone. Non critique (session de test).

## FLUX 2 — Parcours joueur complet

- [x] Entrer un code session `/join` — Fonctionne, v&eacute;rifie session active
- [x] Cr&eacute;er une &eacute;quipe `/character` — Fonctionne avec animal + couleur + cri de guerre
- [x] Code de r&eacute;cup&eacute;ration affich&eacute; — Grand code 5 chars + bouton copier + avertissement
- [ ] **&Eacute;tape 0 — intro + premi&egrave;re &eacute;nigme** — NON IMPL&Eacute;MENT&Eacute;E c&ocirc;t&eacute; joueur. `sessions.intro_text` et `intro_enigme` existent en DB (BGH17 a les deux) mais aucune page joueur ne les affiche. Apr&egrave;s `/character` on va directement `/play` qui affiche le step 1.
- [x] Scanner QR `/scan` — Fonctionne (cam&eacute;ra + code manuel OBJ-xx)
- [x] &Eacute;nigme `/play` — Affiche texte narratif + &eacute;nigme + input r&eacute;ponse
- [x] Validation r&eacute;ponse correcte — `/api/answer` normalise et compare, active l'&eacute;tape suivante
- [x] Lettre collect&eacute;e affich&eacute;e — `/celebrate` montre la lettre avec phase d&eacute;di&eacute;e
- [x] PATCH `/api/team/letters` — Sauvegarde collected_letters en DB. Confirm&eacute; en DB (dzqd: {OBJ-01: L, OBJ-05: R})
- [x] `/celebrate` animation — Particules + score + lettre
- [x] `/map` mise &agrave; jour — Chemin zigzag avec &eacute;tapes compl&eacute;t&eacute;es/actives/verrouill&eacute;es
- [x] 9 objets dans l'ordre &eacute;quipe — `/api/game` trie par `team.object_order`
- [x] Journal des lettres — Onglet Journal dans `/play` avec grille 9 cases
- [x] `/unlock` avec drag and drop lettres — Page cr&eacute;&eacute;e, tap-to-place, 5 tentatives max
- [x] `/api/unlock` validation — Compare avec `session.secret_word`

**BUGS CRITIQUES FLUX 2:**

1. **&Eacute;tape 0 (intro) non affich&eacute;e** — Les donn&eacute;es existent en DB (`intro_text`, `intro_enigme`, `intro_answer`) mais le joueur saute directement de `/character` &agrave; `/play` step 1. Il faudrait un &eacute;cran interm&eacute;diaire.

2. **&Eacute;quipes en &eacute;tat bloqu&eacute;** — "Gouzou" et "dzqd" (AJN54) ont `collected_letters` mais 0 active / 0 locked / 0 completed dans progress. Le scan auto-repair a &eacute;t&eacute; impl&eacute;ment&eacute; mais ces &eacute;quipes sont rest&eacute;es coinc&eacute;es car elles ont des lettres collect&eacute;es mais pas de progress. Ce sont des donn&eacute;es de test — non critique en production.

3. **Team "Ybb" a 2 steps "active"** — Incoh&eacute;rence: 2 completed, 2 active, 5 locked = 9 total. Devrait avoir max 1 active. Bug mineur dans la logique d'activation du step suivant (probablement un double-clic).

4. **Navigation GPS `/navigate`** — Fonctionne mais les objets n'ont pas de coordonn&eacute;es GPS pour les sessions de test (latitude/longitude null). Le GPS est inactif sans coordonn&eacute;es — affiche juste les indices texte.

## FLUX 3 — Staff / Gardien

- [x] Gardiens cr&eacute;&eacute;s auto &agrave; la cr&eacute;ation de session — 2 gardiens par d&eacute;faut
- [x] Gardien se connecte `/staff/login` — Recherche partielle (%name%) fonctionne
- [x] Dashboard gardien affiche code 4 chiffres — Tr&egrave;s grand code + "Teams can use this code"
- [x] Notification Supabase Realtime quand &eacute;quipe arrive — Impl&eacute;ment&eacute; avec vibration
- [x] Bouton "&Eacute;preuve r&eacute;ussie" — POST `/api/validate` + POST `/api/admin/unlock`
- [x] Historique des validations `/staff/history` — Impl&eacute;ment&eacute;
- [ ] **Code manuel 4 chiffres c&ocirc;t&eacute; joueur** — Le joueur peut entrer le code staff dans `/scan` mode manuel, mais le scan API cherche par `physical_id` (OBJ-xx) pas par validation_code (4 chiffres). Le code staff 4 chiffres n'est PAS g&eacute;r&eacute; dans `/api/scan`.

**BUG CRITIQUE FLUX 3:**

5. **Gardiens sans assigned_step_id** — Toutes les sessions sauf TARENTI24 ont des gardiens SANS `assigned_step_id`. Le dashboard attend un step assign&eacute; pour les notifications Realtime. Sans step assign&eacute;, le gardien ne re&ccedil;oit aucune notification. L'assignation devrait se faire dans le back-office `/admin/sessions/[id]/staff` ou automatiquement apr&egrave;s g&eacute;n&eacute;ration AI.

6. **Code staff 4 chiffres non fonctionnel** — Le scan cherche par `physical_id` pas par `validation_code`. Le flow "pas de r&eacute;seau → code staff" est cass&eacute;.

## FLUX 4 — Live dashboard admin

- [x] Voir toutes les &eacute;quipes en temps r&eacute;el — `/admin/sessions/[id]/live` (382 lignes, impl&eacute;mentation compl&egrave;te)
- [x] Envoyer message &agrave; une &eacute;quipe — `/api/admin/message` impl&eacute;ment&eacute;
- [x] D&eacute;bloquer une &eacute;tape — `/api/admin/unlock` impl&eacute;ment&eacute;
- [x] Ajouter du temps — `/api/admin/add-time` impl&eacute;ment&eacute;
- [x] Arr&ecirc;ter la session — Toggle status dans session config page

## FLUX 5 — Fin de session

- [x] R&eacute;sultats finaux — `/admin/sessions/[id]/results` (300 lignes, impl&eacute;ment&eacute;)
- [ ] **PDF rapport** — Non impl&eacute;ment&eacute; (le code results affiche mais pas d'export PDF)
- [ ] **Certificats** — Non impl&eacute;ment&eacute; (champ `certificate_url` dans Team existe mais rien ne le g&eacute;n&egrave;re)
- [ ] **Lien public classement** — Non impl&eacute;ment&eacute;
- [x] Session marqu&eacute;e completed — PATCH `/api/session` avec `status: completed` + r&eacute;g&eacute;n&egrave;re le code
- [x] Code session invalid&eacute; — Nouveau code g&eacute;n&eacute;r&eacute; au moment du complete

---

## R&Eacute;SUM&Eacute; DES BUGS PAR PRIORIT&Eacute;

### Critiques (Flux 2 & 3 — joueur + staff)
| # | Bug | Impact |
|---|-----|--------|
| 1 | &Eacute;tape 0 intro non affich&eacute;e au joueur | Les joueurs sautent l'intro narrative |
| 5 | Gardiens sans `assigned_step_id` | Notifications Realtime staff ne marchent pas |
| 6 | Code staff 4 chiffres non g&eacute;r&eacute; par le scan | Le flow offline &eacute;preuve est cass&eacute; |

### Moyens
| # | Bug | Impact |
|---|-----|--------|
| 3 | Double "active" possible sur team_progress | Rare, mais peut bloquer un joueur |
| 4 | GPS inactif sans coordonn&eacute;es | Normal en dev, &agrave; configurer jour J |

### Non impl&eacute;ment&eacute;s (Flux 5)
| # | Feature | Statut |
|---|---------|--------|
| - | PDF rapport | Non impl&eacute;ment&eacute; |
| - | Certificats | Non impl&eacute;ment&eacute; |
| - | Lien public classement | Non impl&eacute;ment&eacute; |
