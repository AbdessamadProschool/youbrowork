# OFPPT Manager — Workspace

## Overview

Full-stack pedagogical management system for OFPPT (Moroccan vocational training centers). Built as a pnpm monorepo with a React/Vite frontend, Express API backend, and PostgreSQL database.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, Tailwind CSS, Recharts, Wouter (routing)
- **Fonts**: Sora (sans), IBM Plex Mono (mono) via Google Fonts

## Artifacts

| Artifact | Path | Port |
|---|---|---|
| OFPPT Manager (frontend) | `artifacts/ofppt-manager/` | Auto (PORT env) |
| API Server | `artifacts/api-server/` | 8080 |
| Mockup Sandbox | `artifacts/mockup-sandbox/` | 8081 |

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Schema (`lib/db/src/schema/ofppt.ts`)

- `filieres` — Filières (vocational programs)
- `modules` — Training modules (code, intitule, mhGlobale, filiereCode, niveau)
- `groupes` — Formation groups (code, annee, mode, filiereCode, filiereNom, statut, anneeFormation)
- `stagiaires` — Students (cef, nom, prenom, groupeId)
- `avancements` — Module progress per group (tauxReel, mhRealise, nbSeances…)
- `notes_module` — Student grades per module (cc, efm, efmStatut, moyenneOff, moyenneNorm)
- `calendriers` — Academic calendar (tauxTheorique, totalJours, joursRealises)
- `import_logs` — Import history (filename, type, nbLignes, nbErreurs, warnings, dureeMs)

## API Routes (`artifacts/api-server/src/routes/`)

- `GET /api/dashboard` — Global KPIs (groupesActifs, tauxMoyen, tauxTheorique, alertes, modules)
- `GET /api/groupes` — List groups (filter by statut)
- `POST /api/groupes` — Create group
- `GET /api/groupes/:id` — Group details
- `GET /api/groupes/:id/avancement` — Module progress for a group
- `GET /api/groupes/:id/stagiaires` — Ranked students in a group with notes
- `GET /api/stagiaires` — List students (filter by groupeId, search)
- `GET /api/stagiaires/:cef/notes` — Student detail with notes and alerts
- `GET /api/modules` — List modules
- `GET /api/alertes` — All computed alerts (filter by niveau, entity)
- `GET /api/calendrier` — Current calendar (tauxTheorique)
- `POST /api/import` — Upload file (multipart: file + type)
- `GET /api/import/logs` — Import history

## Business Logic

- **moyenneOff** = (CC + EFM) / 3 (includes absent EFM as 0)
- **moyenneNorm** = (CC + EFM/2) / 2
- **tauxReel** = mhRealise / mhGlobale (capped at 107% for anomaly detection)
- **ecart** = tauxReel − tauxTheorique
- **Avancement statut**: en_avance (>+5%), a_jour (±5%), en_retard (<-5%)
- **Alert triggers**: EFM absent, moyenne < 10, CC = 0, ecart < -5%, tauxReel > 107%

## File Parsers (`artifacts/api-server/src/lib/parsers.ts`)

- `parseEtatXlsx(buffer)` — État d'avancement Excel (groups, modules, MH)
- `parseCalendrierXlsx(buffer)` — Calendar Excel (1A-CDJ / 2A-CDJ rows, tauxTheorique)
- `parsePvEfmPdf(text)` — PV EFM PDF text (student grades via regex)

## Frontend Pages (`artifacts/ofppt-manager/src/`)

- `/` — Tableau de bord (dashboard KPIs + top alerts)
- `/groupes` — List of groups with progress bars
- `/groupes/:id` — Group detail (module avancement table)
- `/groupes/:id/stagiaires` — Ranked student table
- `/stagiaires` — All students (search by name/CEF)
- `/stagiaires/:cef` — Student profile with grade chart
- `/alertes` — Alert list (filterable)
- `/modules` — Module list
- `/import` — File upload with import log history

## Seed Data

Run `npx tsx artifacts/api-server/src/seed.ts` to populate:
- 1 groupe (EB101 — Electricité de Bâtiment)
- 2 modules (M101, M102)
- 19 stagiaires with grades for both modules
- 1 calendrier (2025/2026, 1A-CDJ, tauxTheorique = 57.3%)

## Design Tokens

- Sidebar: deep navy (#0f1629)
- Success/en_avance: green
- Warning/en_retard: orange/amber
- Critique: red
- Anomalie: purple
- Accent: blue-indigo
