// Toutes les communications avec NOTRE API Express sont ici.
// Le front ne parle jamais à Supabase directement.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const CATEGORIES = {
  etudiant: "🎓 Menu Étudiant",
  classique: "🍗 Les Classiques",
  saint_ouen: "🏛️ Menu Saint-Ouen",
  dessert: "🍰 Desserts",
};

// Petite fonction qui lit la réponse et lance une erreur lisible si ça se passe mal
async function lireReponse(res) {
  if (res.status === 204) return null; // DELETE : pas de contenu
  const json = await res.json();
  if (!res.ok) {
    const message = json.erreurs ? json.erreurs.join(", ") : json.erreur;
    throw new Error(message || "Erreur " + res.status);
  }
  return json;
}

export async function getPlats() {
  const res = await fetch(`${API_URL}/plats`);
  return lireReponse(res);
}

export async function ajouterPlat(plat, cleGerant) {
  const res = await fetch(`${API_URL}/plats`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": cleGerant },
    body: JSON.stringify(plat),
  });
  return lireReponse(res);
}

export async function modifierPlat(id, modifs, cleGerant) {
  const res = await fetch(`${API_URL}/plats/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-admin-key": cleGerant },
    body: JSON.stringify(modifs),
  });
  return lireReponse(res);
}

export async function verifierEtudiant(numero) {
  const res = await fetch(`${API_URL}/etudiants/verifier`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ numero }),
  });
  return lireReponse(res);
}

// On envoie seulement les id des plats : c'est le serveur qui calcule le prix
export async function passerCommande(articles, numeroEtudiant, carte) {
  const res = await fetch(`${API_URL}/commandes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ articles, numeroEtudiant, carte }),
  });
  return lireReponse(res);
}

export async function supprimerPlat(id, cleGerant) {
  const res = await fetch(`${API_URL}/plats/${id}`, {
    method: "DELETE",
    headers: { "x-admin-key": cleGerant },
  });
  return lireReponse(res);
}
