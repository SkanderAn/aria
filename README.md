# Aria — Votre moteur de recherche conversationnel privé

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) <!-- Mets à jour avec ta licence -->
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue)](https://python.org)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-yellow)](https://developer.mozilla.org)

**Aria** est un assistant de recherche intelligent propulsé par un moteur **RAG (Retrieval-Augmented Generation)** . Il vous permet de converser avec vos propres documents (PDF, TXT, Markdown, etc.) pour en extraire des informations, résumer des concepts et poser des questions précises, le tout en local ou sur votre propre infrastructure.

> **Pourquoi Aria ?** Pour interroger vos données sans dépendre d'un cloud tiers et avec une parfaite maîtrise du contexte.

---

## ✨ Fonctionnalités Clés

- **🧠 Moteur RAG Complet** : Ingestion de documents, découpage intelligent (*chunking*), vectorisation et récupération sémantique.
- **📂 Gestion d'Espace de Travail** : Organisez vos documents par projet ou par thème.
- **📊 Tableau de Bord Analytique** : Visualisez l'utilisation, les sources et la pertinence des réponses.
- **🖥️ Interface Moderne** : Une Single Page Application (SPA) réactive développée en JavaScript.
- **🔌 API Backend Robuste** : Construite en Python (FastAPI/Flask), prête à être intégrée à d'autres outils.
- **🚀 Prêt pour le Déploiement** : Architecture frontend/backend découplée.

---

## 🏗️ Architecture

Le projet est divisé en deux parties principales :

- **`backend/`** : Le cœur du RAG.
    - `ingestor/` : Traitement et vectorisation des documents.
    - `retriever/` : Recherche de contexte pertinent.
    - `analytics/` : Suivi des performances et métriques.
    - `workspace/` : Logique métier des espaces de travail.
    - `api/` : Endpoints REST pour communiquer avec le frontend.
- **`frontend/`** : L'interface utilisateur.
    - Application JavaScript vanilla (ou React/Vue/Svelte selon ton choix).
    - `landing/` : Page d'accueil et documentation intégrée.

---

## 🚀 Démarrage Rapide

### Prérequis
- Python 3.10+
- Node.js 18+ & npm
- (Optionnel) Une clé API pour le LLM (OpenAI, Mistral, Ollama local)

### 1. Cloner le dépôt
```bash
git clone https://github.com/SkanderAn/aria.git
cd aria
