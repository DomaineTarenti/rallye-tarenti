# The Quest

PWA de chasse au trésor white-label pour événements et team building.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** — styling utilitaire
- **Supabase** — auth, base de données, realtime
- **Zustand** — state management
- **html5-qrcode** — lecture QR codes
- **qrcode** — génération QR codes
- **lucide-react** — icônes

## Setup

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer les variables d'environnement
cp .env.local.example .env.local
# Remplir les valeurs Supabase et Anthropic

# 3. Créer les tables Supabase
# Exécuter le contenu de supabase/schema.sql dans le SQL Editor Supabase

# 4. Lancer le serveur de dev
npm run dev
```

## Structure

```
/app
  /(player)     → expérience joueur (join, character, play, scan, step)
  /(staff)      → interface staff (dashboard, validate)
  /(admin)      → back-office (sessions, objects, scenario)
  /api          → routes API (session, step, scan, scenario, validate)
/components     → composants React (player, staff, admin, shared)
/lib            → utilitaires (supabase, store, types, theme)
/supabase       → schema SQL
```

## White-label

Le système de thème charge la couleur primaire et le logo depuis la session active.
Utiliser `useTheme()` dans n'importe quel composant client.
