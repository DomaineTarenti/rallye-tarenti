# The Quest — Project Context

> Read this file at the start of every new session to understand the full state of the project.

## What is The Quest?

A **white-label PWA** for interactive treasure hunts at events and team building. Organisations create sessions, place physical objects with QR codes, and teams compete by scanning objects, solving riddles, and completing challenges — all from their phones.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3.4 |
| Database | Supabase (Postgres + Realtime + RLS) |
| State | Zustand 5 (persisted to localStorage) |
| QR Scan | html5-qrcode |
| QR Generate | qrcode |
| PDF Export | jsPDF |
| Icons | lucide-react |
| AI | Claude API (scenario generation) |

## Repository

- **GitHub**: https://github.com/DomaineTarenti/the-quest
- **Branch**: `main`
- **Deployed**: Vercel (planned)

## Project Structure

```
app/
  page.tsx                      # Home — Access Key entry
  layout.tsx                    # Root layout (SW registration, Inter font)
  globals.css                   # Theme colors, animations (shake, pulse, corner-pulse)
  (player)/                     # Route group — dark theme, mobile-first
    layout.tsx                  # Applies theme + OfflineBanner
    join/page.tsx               # Fetch session by code, apply white-label theme
    character/page.tsx          # "Forge Your Legacy" — team creation
    play/page.tsx               # Main gameplay — narrative, enigma, hints, BottomNav
    scan/page.tsx               # "Decipher the Sigil" — QR scanner + manual fallback
    step/page.tsx               # Step revelation + validation (auto or staff Realtime)
  admin/                        # Actual URL prefix /admin — light theme, desktop-first
    layout.tsx                  # Sidebar nav with session sub-nav
    page.tsx                    # Dashboard — session list, stats
    sessions/new/page.tsx       # Create session — code gen, color picker, duration slider
    sessions/[id]/page.tsx      # Configure path — object CRUD, AI gen, QR PDF export
    sessions/[id]/live/page.tsx # Live dashboard — Realtime, rankings, interventions
    sessions/[id]/staff/page.tsx    # Guardian management
    sessions/[id]/results/page.tsx  # Final rankings, podium, PDF export
  (admin)/                      # Old route group (layout only, kept for compat)
  (staff)/                      # Staff routes (stubs — not yet implemented)
  api/
    session/route.ts            # GET (by code or all), POST (create), PATCH (update)
    team/route.ts               # POST — create team + init progress
    teams/route.ts              # GET — list teams with progress for a session
    objects/route.ts            # GET/POST/PATCH/DELETE — object + step CRUD
    scan/route.ts               # POST — validate QR scan (order check, already_scanned)
    answer/route.ts             # POST — check answer, advance step, mark finished
    hint/route.ts               # POST — progressive hints (narratif/photo/direct)
    game/route.ts               # GET — full game state reload
    validate/route.ts           # POST — staff validates an epreuve
    scenario/route.ts           # POST — Claude API scenario generation
    step/route.ts               # GET — steps by object_id

lib/
  types.ts          # All interfaces: Session, Team, Step, TeamProgress, ScanResult, etc.
  store.ts          # Zustand stores: usePlayerStore (persisted), useThemeStore
  supabase.ts       # Client + server Supabase clients
  theme.ts          # useTheme, useApplyTheme, applySessionTheme, color helpers
  scoring.ts        # calculateScore (variable hint penalties), getRank (5 tiers)

components/shared/
  Button.tsx        # Variants: primary/secondary/ghost, sizes: sm/md/lg
  Card.tsx          # Rounded border card
  Input.tsx         # Labeled input with focus ring
  Loader.tsx        # Spinning loader with text
  BottomNav.tsx     # 4-tab nav: Journal/Hint/Scan(raised)/Rank
  OfflineBanner.tsx # Auto-detects offline, amber banner

supabase/
  schema.sql        # 8 tables, 4 enums, indexes, RLS policies (player-facing)
  admin-policies.sql # INSERT/UPDATE/DELETE policies for admin operations
  seed.sql          # Tarenti Mysteria test data (5 objects, 5 steps, 1 staff)
  run-seed.mjs      # Node script to seed via service_role key

public/
  manifest.json     # PWA manifest (standalone, icons referenced)
  sw.js             # Service worker: cache-first images, network-first API
```

## Database Schema (Supabase)

8 tables with RLS enabled on all:

| Table | Purpose |
|-------|---------|
| `organizations` | White-label clients |
| `sessions` | Treasure hunt instances (draft/active/paused/completed) |
| `objects` | Physical items with QR codes, ordered |
| `steps` | Riddles/challenges per object (enigme/epreuve/navigation) |
| `teams` | Player groups with character data |
| `team_progress` | Per-team per-step tracking (locked/active/completed) |
| `staff_members` | Guardians assigned to steps |
| `scoring_config` | Scoring params per session |

Realtime enabled on: `team_progress`, `teams`.

## Design Decisions

### Player App (dark theme)
- Background: `#0d0d1a` (deep), `#1a1a2e` (surface)
- Accent: `#7F77DD` (primary), `#EF9F27` (amber for scores)
- Mobile-first, bottom nav with 80px padding
- All text uses naming convention: "Chapter" (not "Step"), "Fellowship" (not "Team"), "Rank Points" (not "Score"), "Decipher the Sigil" (not "Scan QR"), etc.

### Admin Back-office (light theme)
- White/gray background with indigo (#4F46E5) accents
- Sidebar navigation, desktop-first
- Contextual sub-nav when inside a session (Configure/Live/Staff/Results)

### Scoring System
- Base: 1000 points
- Hint penalties: narratif -15, photo -25, direct -50
- Epreuve: success +50, failure -25
- First-try bonus: +30 (1st attempt), +15 (2nd attempt)
- Ranks: Diamond (970+), Platinum (900+), Gold (750+), Silver (600+), Bronze (400+)

### Enigma Types
Detected from step data:
- `step.type === "epreuve"` → staff validation (Guardian challenge)
- `step.enigme.includes("|")` → QCM (pipe-separated choices)
- `step.answer` all digits → numeric code input
- Default → free text input

### State Persistence
- Zustand store persisted to localStorage (version 1)
- Game state survives page refresh
- `/api/game` endpoint for full state reload

## Seed Data (Tarenti Mysteria)

- **Org**: Domaine Tarenti (#C4622D)
- **Session**: "Tarenti Mysteria", code `TARENTI24`, active, 90min
- **5 objects**: Le Scarabee de Bronze → La Fiole Ambree → Le Parchemin Scelle → L'Amulette d'Argile → Le Medaillon Final
- **Answers**: olivier, pierre, (staff epreuve), source, tarenti
- **QR codes**: QR-TARENTI-001 through 005
- **Staff**: "Le Gardien" assigned to object 3 (epreuve)

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=     # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Supabase anon (public) key
ANTHROPIC_API_KEY=             # Claude API key (for /api/scenario)
```

Never commit `.env.local` — it's in `.gitignore`.

## What's Done

### Phase 1 — Player Journey (complete)
- Home → /join → /character → /play → /scan → /step → loop
- QR scanning with html5-qrcode + manual fallback
- Progressive hint system (3 tiers with variable costs)
- Staff validation via Supabase Realtime
- Scoring with ranks
- Offline banner + service worker

### Phase 2 — Admin Back-office (complete)
- Dashboard with session list and stats
- Session creation with code generation, color picker, language selection
- Path configuration with object CRUD and inline step editing
- AI scenario generation via Claude API
- QR code PDF export (A4, 4 per page, branded header)
- Live dashboard with Realtime rankings and intervention tools
- Staff management with validation codes
- Results page with podium, full rankings, PDF export

## What's NOT Done Yet

### Phase 3 — Staff Interface
- `/staff/dashboard` — Real-time view for guardians
- `/staff/validate` — Validate epreuves from mobile
- Staff login with validation code

### Phase 4 — Production Hardening
- **Authentication** — Supabase Auth (magic link or OAuth) for admin/staff
- **Middleware** — Route protection (admin pages require auth)
- **Image upload** — Supabase Storage for logos, photos, hint images
- **i18n** — Multi-language support (FR/EN/AR framework in place)
- **Testing** — Vitest + Testing Library
- **Error boundaries** — React error boundaries on all routes
- **Rate limiting** — On public API routes
- **PWA icons** — Generate icon-192.png and icon-512.png

### Phase 5 — Advanced Features
- Certificate generation (PDF per team)
- Public results page (shareable link)
- Photo gallery from game submissions
- Analytics dashboard (completion rates, avg time, popular hints)
- Multi-session scheduling
- Team messaging system
- 3D object viewer (model_url field exists in schema)

## Running the Project

```bash
# Install dependencies
npm install

# Set up environment
cp .env.local.example .env.local
# Fill in Supabase URL, anon key, and optionally Anthropic key

# Run schema in Supabase SQL Editor
# 1. supabase/schema.sql (tables + player RLS)
# 2. supabase/admin-policies.sql (admin RLS)

# Seed test data (needs service_role key)
SUPABASE_SERVICE_ROLE_KEY=xxx node supabase/run-seed.mjs

# Start dev server
npm run dev
# → http://localhost:3000 (player)
# → http://localhost:3000/admin (back-office)
```

## Key Files to Read First

1. `lib/types.ts` — All data models
2. `lib/store.ts` — App state structure
3. `supabase/schema.sql` — Database schema
4. `app/(player)/play/page.tsx` — Main gameplay logic
5. `app/admin/sessions/[id]/page.tsx` — Path configuration + AI gen + QR PDF
