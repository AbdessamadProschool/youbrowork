# 📦 Guide de Lancement - OFPPT Specs Manager (v4.2)

Ce document contient les instructions nécessaires pour lancer l'application sur votre environnement Docker local.

## 🚀 Prérequis
- **Docker Desktop** (installé et lancé)
- **Git** (pour cloner le projet)

## 🛠️ Installation et Lancement

1. **Cloner le projet** :
   ```bash
   git clone https://github.com/AbdessamadProschool/youbrowork.git
   cd youbrowork
   ```

2. **Configurer l'environnement** :
   Copiez le fichier d'exemple et ajoutez votre clé API Gemini (pour l'IA) :
   ```bash
   cp .env.example .env
   ```

3. **Lancer avec Docker Compose** :
   Cette commande construit l'image et lance la base de données + l'application :
   ```bash
   docker-compose up -d --build
   ```

4. **Initialiser la Base de Données** (À faire la première fois uniquement) :
   Synchronisez le schéma et insérez les données par défaut :
   ```bash
   # Synchronisation du schéma
   docker exec -it ofppt-app pnpm --filter @workspace/db push
   
   # Insertion des données essentielles (Etablissements, Salles, Formateurs de test)
   docker exec -it ofppt-app pnpm --filter @workspace/api-server run seed
   ```

## 🌐 Accès à l'Application
Une fois lancé, l'application est accessible aux adresses suivantes :
- **Interface Utilisateur (Frontend)** : [http://localhost:3000](http://localhost:3000)
- **Base de données (Interne)** : Accessible via le port `5434` sur localhost (si vous utilisez un client SQL).

## 📊 Utilisation du Moteur IA v4.2
1. Connectez-vous et sélectionnez votre établissement (**CF NAHDA**).
2. Allez dans l'onglet **Import** pour charger vos fichiers Excel/PDF.
3. Une fois les données chargées, allez dans **Emploi du Temps**.
4. Cliquez sur **"Calculer Prédiction Réelle"**.
5. Utilisez les flèches de navigation pour voir le planning sur les **4 prochaines semaines**.

## 🛑 Arrêt du projet
Pour arrêter les services proprement :
```bash
docker-compose down
```

---
*Développé avec 💚 par l'Expertise Senior QA pour l'OFPPT.*
