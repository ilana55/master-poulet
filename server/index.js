import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import "dotenv/config";
import { supabase } from "./supabase.js";

const app = express();
const PORT = process.env.PORT || 3000;

const CATEGORIES = ["etudiant", "classique", "saint_ouen", "dessert"];

// ---------- Middlewares ----------

// Ajoute des en-têtes HTTP de sécurité (anti-clickjacking, anti-sniffing...)
app.use(helmet());

// Render passe par un proxy : on lui fait confiance pour connaître la vraie IP
// du visiteur (sinon la limite de requêtes s'appliquerait à tout le monde d'un coup)
app.set("trust proxy", 1);

// Seuls notre site en ligne (Netlify) et notre site en local ont le droit d'appeler l'API
app.use(cors({ origin: [process.env.FRONT_URL, "http://localhost:5173"] }));

// Lit le JSON envoyé par le front (limité à 10 ko pour éviter les gros envois)
app.use(express.json({ limit: "10kb" }));

// Anti-spam : 100 requêtes max par IP toutes les 15 minutes
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    message: { erreur: "Trop de requêtes, réessayez plus tard" },
  })
);

// Vérifie le mot de passe du gérant (en-tête x-admin-key) pour POST / PUT / DELETE
function verifierGerant(req, res, next) {
  if (req.headers["x-admin-key"] !== process.env.ADMIN_KEY) {
    return res.status(401).json({ erreur: "Accès réservé au gérant" });
  }
  next();
}

// Validation d'un plat. "partiel" = true pour le PUT (on peut ne modifier qu'un champ)
function validerPlat(plat, partiel) {
  const erreurs = [];

  if (!partiel || plat.nom !== undefined) {
    if (typeof plat.nom !== "string" || plat.nom.trim() === "") {
      erreurs.push("Le nom est obligatoire");
    } else if (plat.nom.length > 60) {
      erreurs.push("Le nom fait 60 caractères maximum");
    }
  }

  if (!partiel || plat.prix !== undefined) {
    const prix = Number(plat.prix);
    if (plat.prix === "" || plat.prix === null || isNaN(prix)) {
      erreurs.push("Le prix est obligatoire et doit être un nombre");
    } else if (prix < 0) {
      erreurs.push("Le prix ne peut pas être négatif");
    } else if (prix > 100) {
      erreurs.push("Le prix ne peut pas dépasser 100 €");
    }
  }

  if (!partiel || plat.categorie !== undefined) {
    if (!CATEGORIES.includes(plat.categorie)) {
      erreurs.push("Catégorie inconnue");
    }
  }

  if (plat.dispo !== undefined && typeof plat.dispo !== "boolean") {
    erreurs.push("dispo doit être true ou false");
  }

  if (plat.image_url !== undefined && plat.image_url !== "") {
    if (typeof plat.image_url !== "string" || !plat.image_url.startsWith("https://")) {
      erreurs.push("L'image doit être un lien https://");
    }
  }

  return erreurs;
}

// On ne garde que les champs autorisés (le client ne peut pas choisir l'id par exemple)
function nettoyerPlat(plat) {
  const propre = {};
  if (plat.nom !== undefined) propre.nom = plat.nom.trim();
  if (plat.prix !== undefined) propre.prix = Number(plat.prix);
  if (plat.categorie !== undefined) propre.categorie = plat.categorie;
  if (plat.dispo !== undefined) propre.dispo = plat.dispo;
  if (plat.image_url !== undefined) propre.image_url = plat.image_url || null;
  return propre;
}

// Vérifie que l'id dans l'URL est bien un nombre entier
function idValide(id) {
  return /^\d+$/.test(id);
}

// ---------- Routes ----------

app.get("/", (req, res) => {
  res.json({ message: "API Mastère Poulet 🍗 — essayez GET /plats" });
});

// Anti brute-force sur la connexion gérant : 5 essais max par IP toutes les 15 minutes
const limiteConnexion = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true, // seuls les mauvais mots de passe comptent
  message: { erreur: "Trop d'essais de connexion, réessayez dans 15 minutes" },
});

// POST /gerant/connexion : vérifie le mot de passe du gérant → 200, sinon 401
// Le mot de passe est vérifié par le serveur, jamais dans le navigateur.
app.post("/gerant/connexion", limiteConnexion, verifierGerant, (req, res) => {
  res.status(200).json({ connecte: true });
});

// GET /plats : lister tous les plats → 200
app.get("/plats", async (req, res) => {
  const { data, error } = await supabase
    .from("plats")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error(error);
    return res.status(500).json({ erreur: "Erreur serveur" });
  }
  res.status(200).json(data);
});

// POST /plats : ajouter un plat → 201, ou 400 si un champ est vide / invalide
app.post("/plats", verifierGerant, async (req, res) => {
  const erreurs = validerPlat(req.body, false);
  if (erreurs.length > 0) {
    return res.status(400).json({ erreurs });
  }

  const { data, error } = await supabase
    .from("plats")
    .insert(nettoyerPlat(req.body))
    .select()
    .single();

  if (error) {
    console.error(error);
    return res.status(500).json({ erreur: "Erreur serveur" });
  }
  res.status(201).json(data);
});

// PUT /plats/:id : modifier un plat → 200, ou 404 s'il n'existe pas
app.put("/plats/:id", verifierGerant, async (req, res) => {
  if (!idValide(req.params.id)) {
    return res.status(400).json({ erreur: "id invalide" });
  }

  const erreurs = validerPlat(req.body, true);
  if (erreurs.length > 0) {
    return res.status(400).json({ erreurs });
  }

  const modifs = nettoyerPlat(req.body);
  if (Object.keys(modifs).length === 0) {
    return res.status(400).json({ erreur: "Rien à modifier" });
  }

  const { data, error } = await supabase
    .from("plats")
    .update(modifs)
    .eq("id", req.params.id)
    .select();

  if (error) {
    console.error(error);
    return res.status(500).json({ erreur: "Erreur serveur" });
  }
  if (data.length === 0) {
    return res.status(404).json({ erreur: "Plat introuvable" });
  }
  res.status(200).json(data[0]);
});

// DELETE /plats/:id : supprimer un plat → 204 (pas de contenu), ou 404
app.delete("/plats/:id", verifierGerant, async (req, res) => {
  if (!idValide(req.params.id)) {
    return res.status(400).json({ erreur: "id invalide" });
  }

  const { data, error } = await supabase
    .from("plats")
    .delete()
    .eq("id", req.params.id)
    .select();

  if (error) {
    console.error(error);
    return res.status(500).json({ erreur: "Erreur serveur" });
  }
  if (data.length === 0) {
    return res.status(404).json({ erreur: "Plat introuvable" });
  }
  res.status(204).send();
});

// =====================================================
//  Réduction étudiante + commandes
// =====================================================

// Anti brute-force : 5 essais de numéro étudiant max par IP toutes les 15 minutes.
// Sans ça, un attaquant pourrait tester les 100 millions de numéros possibles.
const limiteEtudiant = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { erreur: "Trop d'essais de numéro étudiant, réessayez dans 15 minutes" },
});

// Renvoie true si le numéro existe dans la table etudiants
async function estEtudiant(numero) {
  // On vérifie d'abord le format (8 chiffres) avant d'interroger la base
  if (typeof numero !== "string" || !/^\d{8}$/.test(numero)) {
    return false;
  }
  const { data, error } = await supabase
    .from("etudiants")
    .select("numero")
    .eq("numero", numero);

  if (error) {
    console.error(error);
    return false;
  }
  return data.length > 0;
}

// Algorithme de Luhn : la "clé de contrôle" des numéros de carte bancaire.
// Il détecte les fautes de frappe (un chiffre faux, deux chiffres inversés).
function luhnValide(numero) {
  let somme = 0;
  let doubler = false;
  for (let i = numero.length - 1; i >= 0; i--) {
    let chiffre = Number(numero[i]);
    if (doubler) {
      chiffre = chiffre * 2;
      if (chiffre > 9) chiffre = chiffre - 9;
    }
    somme = somme + chiffre;
    doubler = !doubler;
  }
  return somme % 10 === 0;
}

// Vérifie la carte (fictive) : retourne la liste des erreurs
function validerCarte(carte) {
  const erreurs = [];
  if (!carte) return ["Informations de paiement manquantes"];

  const numero = String(carte.numero || "").replace(/\s/g, "");
  if (!/^\d{16}$/.test(numero) || !luhnValide(numero)) {
    erreurs.push("Numéro de carte invalide");
  }

  if (typeof carte.titulaire !== "string" || carte.titulaire.trim() === "") {
    erreurs.push("Le nom du titulaire est obligatoire");
  }

  // Date d'expiration au format MM/AA, et pas dans le passé
  const match = /^(\d{2})\/(\d{2})$/.exec(carte.expiration || "");
  if (!match || Number(match[1]) < 1 || Number(match[1]) > 12) {
    erreurs.push("Date d'expiration invalide (format MM/AA)");
  } else {
    const mois = Number(match[1]);
    const annee = 2000 + Number(match[2]);
    const maintenant = new Date();
    const anneeActuelle = maintenant.getFullYear();
    const moisActuel = maintenant.getMonth() + 1;
    if (annee < anneeActuelle || (annee === anneeActuelle && mois < moisActuel)) {
      erreurs.push("Carte expirée");
    }
  }

  if (!/^\d{3}$/.test(carte.cvv || "")) {
    erreurs.push("Le CVV doit contenir 3 chiffres");
  }
  return erreurs;
}

// POST /etudiants/verifier : le front demande si un numéro est valide
app.post("/etudiants/verifier", limiteEtudiant, async (req, res) => {
  const valide = await estEtudiant(req.body.numero);
  if (!valide) {
    return res.status(400).json({ erreur: "Numéro étudiant non reconnu" });
  }
  res.status(200).json({ valide: true });
});

// POST /commandes : valider le panier et payer (paiement SIMULÉ)
app.post("/commandes", async (req, res) => {
  const { articles, numeroEtudiant, carte } = req.body;

  // 1) Le panier : une liste d'id de plats (pas de prix ! on ne fait pas confiance au client)
  if (!Array.isArray(articles) || articles.length === 0) {
    return res.status(400).json({ erreur: "Le panier est vide" });
  }
  if (articles.length > 30) {
    return res.status(400).json({ erreur: "30 articles maximum par commande" });
  }
  if (!articles.every((id) => Number.isInteger(id) && id > 0)) {
    return res.status(400).json({ erreur: "Panier invalide" });
  }

  // 2) La carte
  const erreursCarte = validerCarte(carte);
  if (erreursCarte.length > 0) {
    return res.status(400).json({ erreurs: erreursCarte });
  }

  // 3) On relit les VRAIS prix dans la base
  const { data: plats, error } = await supabase
    .from("plats")
    .select("id, nom, prix, categorie, dispo")
    .in("id", articles);

  if (error) {
    console.error(error);
    return res.status(500).json({ erreur: "Erreur serveur" });
  }

  const lignes = [];
  for (const id of articles) {
    const plat = plats.find((p) => p.id === id);
    if (!plat) {
      return res.status(400).json({ erreur: "Un plat du panier n'existe plus" });
    }
    if (!plat.dispo) {
      return res.status(400).json({ erreur: plat.nom + " n'est plus disponible" });
    }
    lignes.push(plat);
  }

  // 4) Calcul du total + réduction étudiante vérifiée par le serveur
  let total = lignes.reduce((somme, p) => somme + Number(p.prix), 0);
  const contientMenuEtudiant = lignes.some((p) => p.categorie === "etudiant");
  let reduction = false;

  if (numeroEtudiant) {
    if (!(await estEtudiant(numeroEtudiant))) {
      return res.status(400).json({ erreur: "Numéro étudiant non reconnu" });
    }
    reduction = contientMenuEtudiant;
  }
  if (reduction) total = total * 0.9;
  total = Math.round(total * 100) / 100;

  // 5) On enregistre la commande, SANS le numéro de carte complet ni le CVV
  const numeroCarte = carte.numero.replace(/\s/g, "");
  const { data: commande, error: erreurInsert } = await supabase
    .from("commandes")
    .insert({
      articles: lignes.map((p) => ({ nom: p.nom, prix: p.prix })),
      total,
      reduction,
      titulaire: carte.titulaire.trim(),
      carte_fin: numeroCarte.slice(-4),
    })
    .select("id, total, reduction")
    .single();

  if (erreurInsert) {
    console.error(erreurInsert);
    return res.status(500).json({ erreur: "Erreur serveur" });
  }
  res.status(201).json(commande);
});

// Toute autre route → 404
app.use((req, res) => {
  res.status(404).json({ erreur: "Route inconnue" });
});

app.listen(PORT, () => {
  console.log(`🍗 API Mastère Poulet sur http://localhost:${PORT}`);
});
