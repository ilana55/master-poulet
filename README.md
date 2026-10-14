# 🍗 Mastère Poulet — « Le poulet niveau Bac+5 »

Projet « Ta petite entreprise » — ECE, Master 1 Cybersécurité.
Un fast-food de poulet revisité : menu étudiant, grands classiques, menu Saint-Ouen et desserts.

## Architecture

```
 Navigateur (React / Vite)  ──fetch──▶  API Express (Node)  ──supabase-js──▶  Supabase (PostgreSQL)
      la salle                         la cuisine 🔒 clé secrète                  le frigo
```

- Le front ne connaît que l'adresse de l'API (`VITE_API_URL`), jamais la clé Supabase.
- La clé secrète Supabase est dans `server/.env`, ignoré par Git.
- RLS activé sans policy : même avec la clé publique, personne ne peut lire la table en direct.

## Arborescence

```
mastere-poulet/
├── .gitignore
├── supabase/schema.sql        ← les 3 tables + 16 plats + étudiants de test
├── server/                    ← API Express
│   ├── index.js               ← les 4 routes + sécurité
│   ├── supabase.js            ← seul fichier qui utilise la clé
│   └── .env.example
└── client/                    ← Front React (Vite)
    ├── public/logo.svg
    └── src/
        ├── App.jsx            ← navigation entre les 2 pages
        ├── api.js             ← tous les fetch vers l'API
        ├── components/CartePlat.jsx
        └── pages/PageClient.jsx, PageGerant.jsx
```

## Installation (une seule fois)

1. **Supabase** : *SQL Editor* → *New query* → coller tout `supabase/schema.sql` → *Run*. Ce script unique supprime les anciennes tables et recrée `plats`, `etudiants` et `commandes` avec leurs données.
2. **API**
   ```bash
   cd server
   npm install
   cp .env.example .env      # puis remplir SUPABASE_URL, SUPABASE_KEY, ADMIN_KEY
   npm run dev               # → http://localhost:3000/plats
   ```
3. **Front** (dans un 2e terminal)
   ```bash
   cd client
   npm install
   cp .env.example .env
   npm run dev               # → http://localhost:5173
   ```

## Les routes

| Route | Rôle | Codes |
|---|---|---|
| `GET /plats` | lister | 200 |
| `POST /plats` | ajouter (gérant) | 201, 400 si champ vide/invalide, 401 sans mot de passe |
| `PUT /plats/:id` | modifier (gérant) | 200, 400, 404 |
| `DELETE /plats/:id` | supprimer (gérant) | 204, 404 |

Routes bonus (commande) :

| Route | Rôle | Codes |
|---|---|---|
| `POST /etudiants/verifier` | vérifier un n° étudiant | 200, 400, 429 après 5 essais / 15 min |
| `POST /commandes` | valider le panier + paiement simulé | 201, 400 |

Numéros étudiants de test : `20260001`, `20260002`, `20260003`.
Carte de test : `4242 4242 4242 4242`, date future (ex. `12/30`), CVV `123`.

Tester sans le front (Git Bash / terminal) :
```bash
curl http://localhost:3000/plats
curl -X POST http://localhost:3000/plats -H "Content-Type: application/json" -H "x-admin-key: VOTRE_CLE" -d '{"nom":"","prix":-3}'
# → 400 {"erreurs":["Le nom est obligatoire","Le prix ne peut pas être négatif","Catégorie inconnue"]}
```

## Mise en ligne (bonus ⭐⭐⭐)

- **API sur Render** : *New Web Service* → dossier racine `server` → Build `npm install` → Start `npm start` → ajouter les variables d'environnement (`SUPABASE_URL`, `SUPABASE_KEY`, `ADMIN_KEY`, `FRONT_URL` = l'URL Vercel).
- **Front sur Vercel** : importer le repo → dossier racine `client` → variable `VITE_API_URL` = l'URL Render.
- ⚠️ Le plan gratuit de Render met l'API en veille : la 1re requête peut prendre ~1 minute. Ouvrez l'URL de l'API avant la démo.

## Antisèche pour l'oral

- **Où le serveur appelle Supabase ?** `server/supabase.js` crée le client, `server/index.js` l'utilise dans chaque route (`supabase.from("plats")...`).
- **Pourquoi la clé n'est pas dans le front ?** Tout ce qui est envoyé au navigateur est lisible (F12 → Sources). La clé secrète contourne la sécurité de la base : quiconque l'aurait pourrait tout supprimer.
- **Pourquoi POST renvoie 201 ?** 201 = *Created* : une ressource a été créée. 200 = simple succès.
- **Formulaire vide ?** `validerPlat()` renvoie la liste des erreurs → 400 Bad Request, rien n'est écrit en base. Et la base a un `not null` + `check (prix >= 0)` en dernier rempart.
- **Où est le useState du formulaire ?** `PageGerant.jsx` : `const [formulaire, setFormulaire] = useState(...)`. Le setter remplace l'état ; React redessine alors le composant avec les nouvelles valeurs.
- **Pourquoi passer par l'API ?** Pour cacher la clé, valider les données côté serveur, contrôler qui a le droit de modifier (mot de passe gérant) et limiter le spam.
- **À quoi sert le .gitignore ?** À ne pas envoyer sur GitHub `node_modules` (lourd, réinstallable) et surtout `.env` (secrets). Des robots scannent GitHub en continu pour voler les clés publiées.

### Questions possibles sur les bonus commande

- **Pourquoi le front n'envoie que les id des plats ?** Un client peut modifier le prix dans F12 avant l'envoi. Le serveur relit les vrais prix dans Supabase et recalcule le total lui-même.
- **Pourquoi la réduction est vérifiée côté serveur ?** Un `if` dans React se contourne en 2 secondes. Le serveur vérifie le numéro dans la table `etudiants`, et limite à 5 essais pour empêcher de deviner un numéro (brute force).
- **Vous stockez les cartes bancaires ?** Non : on vérifie le format (algorithme de Luhn, date, CVV) puis on ne garde que les 4 derniers chiffres. Le CVV n'est jamais stocké. Dans la vraie vie, la norme PCI DSS impose de passer par un prestataire (Stripe, PayPal…) : le numéro de carte ne doit même pas passer par notre serveur.
- **Comment le plat du jour reste le même toute la journée ?** On calcule le numéro du jour (jours écoulés depuis 1970) modulo le nombre de plats : même date → même plat, pour tout le monde.

## Sources

- Routing Express : https://expressjs.com/en/guide/routing.html
- Bonnes pratiques sécurité Express : https://expressjs.com/en/advanced/best-practice-security.html
- Client Supabase JS (select / insert / update / delete) : https://supabase.com/docs/reference/javascript/select
- Row Level Security : https://supabase.com/docs/guides/database/postgres/row-level-security
- useState : https://react.dev/reference/react/useState — useEffect : https://react.dev/reference/react/useEffect
- Variables d'environnement Vite : https://vite.dev/guide/env-and-mode
- fetch : https://developer.mozilla.org/fr/docs/Web/API/Fetch_API/Using_Fetch
- Codes HTTP : https://developer.mozilla.org/fr/docs/Web/HTTP/Status
- Flexbox : https://css-tricks.com/snippets/css/a-guide-to-flexbox/
- Helmet : https://helmetjs.github.io/ — Rate limit : https://www.npmjs.com/package/express-rate-limit — CORS : https://www.npmjs.com/package/cors
- .gitignore Node officiel : https://github.com/github/gitignore/blob/main/Node.gitignore
- Algorithme de Luhn : https://fr.wikipedia.org/wiki/Formule_de_Luhn
- Cartes de test (4242…) : https://docs.stripe.com/testing
- Norme PCI DSS : https://www.pcisecuritystandards.org/
- Fenêtre modale en CSS (position fixed) : https://developer.mozilla.org/fr/docs/Web/CSS/position
- Images des plats : TheMealDB, https://www.themealdb.com/api.php
- Déploiement : https://render.com/docs/deploy-node-express-app et https://vercel.com/docs/frameworks/vite
