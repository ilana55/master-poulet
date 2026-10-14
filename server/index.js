import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { pathToFileURL } from "node:url";
import "dotenv/config";
import { supabase } from "./supabase.js";

const app = express();
const PORT = process.env.PORT || 3000;

function readAdminKey(req) {
  const value = req.headers["x-admin-key"];
  return Array.isArray(value) ? value[0] : value;
}

const CATEGORIES = ["etudiant", "classique", "saint_ouen", "dessert"];

// ---------- Middlewares ----------

// Ajoute des en-têtes HTTP de sécurité (anti-clickjacking, anti-sniffing...)
app.use(helmet());

// Seul notre front a le droit d'appeler l'API depuis un navigateur
app.use(cors({ origin: process.env.FRONT_URL || "http://localhost:5173" }));

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
  if (readAdminKey(req) !== process.env.ADMIN_KEY) {
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

// GET /plats : lister tous les plats → 200
app.get("/plats", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ erreur: "Configuration Supabase manquante" });
  }

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
  if (!supabase) {
    return res.status(500).json({ erreur: "Configuration Supabase manquante" });
  }

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
  if (!supabase) {
    return res.status(500).json({ erreur: "Configuration Supabase manquante" });
  }

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
  if (!supabase) {
    return res.status(500).json({ erreur: "Configuration Supabase manquante" });
  }

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

// Toute autre route → 404
app.use((req, res) => {
  res.status(404).json({ erreur: "Route inconnue" });
});

export { app };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  app.listen(PORT, () => {
    console.log(`🍗 API Mastère Poulet sur http://localhost:${PORT}`);
  });
}
