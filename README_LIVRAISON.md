# OFPPT Specs Manager - Guide de Déploiement Client

Ce document explique comment installer et lancer l'application sur votre environnement.

## Option A : Déploiement avec Docker (Recommandé)

### Prérequis
1.  **Docker Desktop** installé.
2.  Une **Clé API Gemini**.

### Lancement
1.  Extraire le ZIP.
2.  Créer un fichier `.env` avec `GEMINI_API_KEY=votre_cle`.
3.  Lancer : `docker compose up --build -d`
4.  Synchroniser la base : `docker exec -it ofppt-app pnpm --filter @workspace/db run push`

L'application sera sur **http://localhost:3000**.

---

## Option B : Déploiement Manuel (Sans Docker)

Si vous ne pouvez pas utiliser Docker, suivez ces étapes sur Windows :

### Prérequis
1.  **Node.js v20+** : [Télécharger ici](https://nodejs.org/)
2.  **pnpm** : Ouvrez un terminal et tapez `npm install -g pnpm`
3.  **PostgreSQL** : Installé et actif sur votre machine.

### Installation et Configuration
1.  **Base de données** : Créez une base nommée `ofppt_manager` dans votre PostgreSQL.
2.  **Variables d'env** : Créez un fichier `.env.local` à la racine et copiez-y ceci (adaptez l'URL si besoin) :
    ```env
    DATABASE_URL=postgresql://postgres:votre_mot_de_passe@localhost:5432/ofppt_manager
    PORT=8082
    GEMINI_API_KEY=votre_cle_api
    ```
3.  **Installation** : Ouvrez un terminal dans le dossier et tapez :
    ```bash
    pnpm install
    ```

### Lancement
Pour lancer le serveur et l'interface en même temps, utilisez simplement le script fourni :
```powershell
.\dev.ps1
```

*Note : La première fois, synchronisez la base avec : `pnpm run db:push`*

---

## Maintenance et Logs


Pour consulter les logs en temps réel :

```bash
docker compose logs -f app
```

### Données Techniques
-   **Port Application** : 3000
-   **Port Base de Données** : 5433 (Postgres)
-   **Utilisateurs DB** : postgres / ofppt_pw (configuré dans docker-compose.yml)
