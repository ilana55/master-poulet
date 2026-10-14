import { useState, useEffect } from "react";
import {
  getPlats,
  ajouterPlat,
  modifierPlat,
  supprimerPlat,
  CATEGORIES,
} from "../api.js";
import CartePlat from "../components/CartePlat.jsx";

const FORMULAIRE_VIDE = { nom: "", prix: "", categorie: "classique", image_url: "" };

function PageGerant() {
  const [plats, setPlats] = useState([]);
  const [message, setMessage] = useState("");

  // Le mot de passe gérant est gardé en mémoire seulement (pas de localStorage)
  const [cleGerant, setCleGerant] = useState("");

  // useState du formulaire d'ajout : un seul objet pour tous les champs
  const [formulaire, setFormulaire] = useState(FORMULAIRE_VIDE);

  function chargerPlats() {
    getPlats()
      .then((data) => setPlats(data))
      .catch((err) => setMessage("❌ " + err.message));
  }

  useEffect(() => {
    chargerPlats();
  }, []);

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
      setMessage("❌ " + err.message);
    }
  }

  async function basculerDispo(plat) {
    try {
      await modifierPlat(plat.id, { dispo: !plat.dispo }, cleGerant);
      chargerPlats();
    } catch (err) {
      setMessage("❌ " + err.message);
    }
  }

  async function changerPrix(plat) {
    const nouveauPrix = window.prompt("Nouveau prix pour " + plat.nom, plat.prix);
    if (nouveauPrix === null) return; // l'utilisateur a cliqué sur Annuler
    try {
      await modifierPlat(plat.id, { prix: nouveauPrix.replace(",", ".") }, cleGerant);
      chargerPlats();
    } catch (err) {
      setMessage("❌ " + err.message);
    }
  }

  async function supprimer(plat) {
    if (!window.confirm("Supprimer " + plat.nom + " ?")) return;
    try {
      await supprimerPlat(plat.id, cleGerant);
      setMessage("🗑️ " + plat.nom + " supprimé");
      chargerPlats();
    } catch (err) {
      setMessage("❌ " + err.message);
    }
  }

  // Petit tableau de bord (bonus)
  const nbDispo = plats.filter((p) => p.dispo).length;
  const prixMoyen =
    plats.length > 0
      ? plats.reduce((s, p) => s + Number(p.prix), 0) / plats.length
      : 0;

  return (
    <div className="page">
      <section className="bloc">
        <label>
          🔑 Mot de passe gérant :{" "}
          <input
            type="password"
            value={cleGerant}
            onChange={(e) => setCleGerant(e.target.value)}
            placeholder="Demandé pour ajouter / modifier / supprimer"
          />
        </label>
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
