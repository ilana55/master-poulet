import { useState, useEffect } from "react";
import {
  getPlats,
  ajouterPlat,
  modifierPlat,
  supprimerPlat,
  connexionGerant,
  CATEGORIES,
} from "../api.js";
import CartePlat from "../components/CartePlat.jsx";

const FORMULAIRE_VIDE = { nom: "", prix: "", categorie: "classique", image_url: "" };

function PageGerant() {
  // Connexion : le mot de passe est gardé en mémoire seulement (pas de localStorage).
  // Si on recharge la page, il faut se reconnecter.
  const [connecte, setConnecte] = useState(false);
  const [motDePasse, setMotDePasse] = useState("");
  const [cleGerant, setCleGerant] = useState("");
  const [erreurConnexion, setErreurConnexion] = useState("");

  const [plats, setPlats] = useState([]);
  const [message, setMessage] = useState("");

  // useState du formulaire d'ajout : un seul objet pour tous les champs
  const [formulaire, setFormulaire] = useState(FORMULAIRE_VIDE);

  function chargerPlats() {
    getPlats()
      .then((data) => setPlats(data))
      .catch((err) => setMessage("❌ " + err.message));
  }

  // On charge les plats seulement une fois connecté
  useEffect(() => {
    if (connecte) chargerPlats();
  }, [connecte]);

  // ---------- Connexion / déconnexion ----------

  async function seConnecter(e) {
    e.preventDefault();
    setErreurConnexion("");
    try {
      await connexionGerant(motDePasse); // c'est le serveur qui vérifie
      setCleGerant(motDePasse);
      setConnecte(true);
    } catch (err) {
      setErreurConnexion(err.message);
    }
    setMotDePasse("");
  }

  function seDeconnecter() {
    setConnecte(false);
    setCleGerant("");
    setPlats([]);
    setMessage("");
  }

  // Si le serveur répond "Accès réservé au gérant", on renvoie vers la connexion
  function gererErreur(err) {
    if (err.message === "Accès réservé au gérant") {
      seDeconnecter();
    } else {
      setMessage("❌ " + err.message);
    }
  }

  // ---------- Actions sur les plats ----------

  // Un seul handler pour tous les champs grâce à l'attribut "name"
  function changerChamp(e) {
    setFormulaire({ ...formulaire, [e.target.name]: e.target.value });
  }

  async function envoyerFormulaire(e) {
    e.preventDefault(); // empêche la page de se recharger
    try {
      await ajouterPlat(formulaire, cleGerant);
      setMessage("✅ Plat ajouté !");
      setFormulaire(FORMULAIRE_VIDE);
      chargerPlats();
    } catch (err) {
      gererErreur(err);
    }
  }

  async function basculerDispo(plat) {
    try {
      await modifierPlat(plat.id, { dispo: !plat.dispo }, cleGerant);
      chargerPlats();
    } catch (err) {
      gererErreur(err);
    }
  }

  async function changerPrix(plat) {
    const nouveauPrix = window.prompt("Nouveau prix pour " + plat.nom, plat.prix);
    if (nouveauPrix === null) return; // l'utilisateur a cliqué sur Annuler
    try {
      await modifierPlat(plat.id, { prix: nouveauPrix.replace(",", ".") }, cleGerant);
      chargerPlats();
    } catch (err) {
      gererErreur(err);
    }
  }

  async function supprimer(plat) {
    if (!window.confirm("Supprimer " + plat.nom + " ?")) return;
    try {
      await supprimerPlat(plat.id, cleGerant);
      setMessage("🗑️ " + plat.nom + " supprimé");
      chargerPlats();
    } catch (err) {
      gererErreur(err);
    }
  }

  // ---------- Écran de connexion ----------

  if (!connecte) {
    return (
      <div className="page">
        <form className="bloc connexion" onSubmit={seConnecter}>
          <h2>🔑 Espace gérant</h2>
          <p>Entrez le mot de passe pour gérer la carte.</p>
          <input
            type="password"
            placeholder="Mot de passe"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            autoComplete="current-password"
          />
          {erreurConnexion && <p className="erreur">{erreurConnexion}</p>}
          <button type="submit" className="bouton" disabled={motDePasse === ""}>
            Se connecter
          </button>
        </form>
      </div>
    );
  }

  // ---------- Espace gérant (une fois connecté) ----------

  // Petit tableau de bord
  const nbDispo = plats.filter((p) => p.dispo).length;
  const prixMoyen =
    plats.length > 0
      ? plats.reduce((s, p) => s + Number(p.prix), 0) / plats.length
      : 0;

  return (
    <div className="page">
      <section className="bloc barre-gerant">
        <span>✅ Connecté en tant que gérant</span>
        <button className="bouton noir petit-bouton" onClick={seDeconnecter}>
          Se déconnecter
        </button>
      </section>

      <section className="stats">
        <div className="stat">
          <strong>{plats.length}</strong> plats
        </div>
        <div className="stat">
          <strong>{nbDispo}</strong> disponibles
        </div>
        <div className="stat">
          <strong>{prixMoyen.toFixed(2)} €</strong> prix moyen
        </div>
      </section>

      <form className="bloc formulaire" onSubmit={envoyerFormulaire}>
        <h2>Ajouter un plat</h2>
        <input
          name="nom"
          placeholder="Nom du plat"
          value={formulaire.nom}
          onChange={changerChamp}
        />
        <input
          name="prix"
          type="number"
          step="0.1"
          placeholder="Prix (€)"
          value={formulaire.prix}
          onChange={changerChamp}
        />
        <select name="categorie" value={formulaire.categorie} onChange={changerChamp}>
          {Object.keys(CATEGORIES).map((cle) => (
            <option key={cle} value={cle}>
              {CATEGORIES[cle]}
            </option>
          ))}
        </select>
        <input
          name="image_url"
          placeholder="Lien de l'image (https://...)"
          value={formulaire.image_url}
          onChange={changerChamp}
        />
        <button type="submit" className="bouton">
          Ajouter
        </button>
      </form>

      {message && <p className="message">{message}</p>}

      <section className="grille">
        {plats.map((plat) => (
          <CartePlat key={plat.id} plat={plat}>
            <div className="actions">
              <button className="bouton jaune" onClick={() => basculerDispo(plat)}>
                {plat.dispo ? "Mettre en rupture" : "Remettre en vente"}
              </button>
              <button className="bouton gris" onClick={() => changerPrix(plat)}>
                Changer le prix
              </button>
              <button className="bouton noir" onClick={() => supprimer(plat)}>
                Supprimer
              </button>
            </div>
          </CartePlat>
        ))}
      </section>
    </div>
  );
}

export default PageGerant;
