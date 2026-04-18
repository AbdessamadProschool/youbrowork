# OFPPT Specs Manager - Moteur de Planification IA

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=flat-square)](https://orm.drizzle.team/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)

Une solution avancée pour la gestion des avancements et la génération automatique d'emplois du temps pour les établissements de l'OFPPT, propulsée par l'intelligence artificielle (Gemini).

## 🌟 Fonctionnalités Clés

- **Moteur IA v4.0** : Algorithme d'entrelacement (interleaving) pour une répartition équitable des charges formateurs (limites 36h/26h).
- **Gestion Multi-filières** : Regroupement intelligent des spécialités (Électricité, Digital, Soft Skills).
- **Suivi des Stagiaires** : Analyse des notes, calcul des moyennes et système d'alertes automatiques (absences, retards).
- **Importation Intelligente** : Support des fichiers Excel/CSV standards OFPPT (PV EFM, Calendriers, États d'avancement).
- **Architecture Multi-tenant** : Isolation complète des données par établissement.

## 🛠 Stack Technique

- **Frontend** : React 18, Vite, Tailwind CSS, Shadcn/UI.
- **Backend** : Node.js, Express, Zod.
- **Base de Données** : PostgreSQL, Drizzle ORM.
- **IA** : Google Gemini API.
- **Déploiement** : Docker & Docker Compose.

## 🚀 Installation Rapide

### Methode Docker (Recommandée)

1. Clonez le dépôt.
2. Configurez votre `.env` avec votre `GEMINI_API_KEY`.
3. Lancez les services :
   ```bash
   docker compose up --build -d
   ```
4. Synchronisez la base de données :
   ```bash
   docker exec -it ofppt-app pnpm --filter @workspace/db run push
   ```

### Methode Développement Local

1. Installez pnpm : `npm install -g pnpm`.
2. Installez les dépendances : `pnpm install`.
3. Configurez `.env.local` (voir `.env.example`).
4. Lancez le script de démarrage :
   ```bash
   ./dev.ps1
   ```

## 📋 Normes et Standards

Le projet suit les standards de développement modernes :
- **TypeScript Strict** : Typage intégral de la chaîne de données (DB -> API -> UI).
- **Clean Architecture** : Séparation claire entre la couche de données, la logique métier (IA Engine) et la présentation.
- **Responsive Design** : Interface fluide adaptée aux tablettes et ordinateurs.

---
© 2024 OFPPT Manager Team. All rights reserved.
