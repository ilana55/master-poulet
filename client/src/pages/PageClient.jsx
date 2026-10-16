import { useState, useEffect } from "react";
import { getPlats, CATEGORIES } from "../api.js";
import CartePlat from "../components/CartePlat.jsx";
import Commande from "../components/Commande.jsx";

// Plat du jour : on le calcule à partir de la date, donc il est le même toute
// la journée (et pour tous les clients), puis il change le lendemain.
function choisirPlatDuJour(plats) {
  if (plats.length === 0) return null;

  const maintenant = new Date();
  // Numéro du jour : nombre de jours écoulés depuis le 1er janvier 1970
  const numeroDuJour = Math.floor(
    Date.UTC(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate()) /
      (24 * 60 * 60 * 1000)
  );

  // On part de la case du jour, et si le plat est indisponible on prend le suivant
  for (let i = 0; i < plats.length; i++) {
    const plat = plats[(numeroDuJour + i) % plats.length];
    if (plat.dispo) return plat;
  }
  return null; // aucun plat disponible
}

function PageClient() {
  const [plats, setPlats] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  // Filtres
  const [recherche, setRecherche] = useState("");
  const [categorie, setCategorie] = useState("tous");
  const [budget, setBudget] = useState(15);
  const [dispoSeulement, setDispoSeulement] = useState(false);

  // Bonus : panier + fenêtre de validation de commande
  const [panier, setPanier] = useState([]);
  const [commandeOuverte, setCommandeOuverte] = useState(false);

  // Au chargement de la page, on récupère les plats via NOTRE API
  useEffect(() => {
    getPlats()
      .then((data) => setPlats(data))
      .catch((err) => setErreur(err.message))
      .finally(() => setChargement(false));
  }, []);

  // On applique tous les filtres un par un
  const platsFiltres = plats
    .filter((p) => p.nom.toLowerCase().includes(recherche.toLowerCase()))
    .filter((p) => categorie === "tous" || p.categorie === categorie)
    .filter((p) => Number(p.prix) <= budget)
    .filter((p) => !dispoSeulement || p.dispo);

  const platDuJour = choisirPlatDuJour(plats);

  function ajouterAuPanier(plat) {
    setPanier([...panier, plat]);
  }

  function retirerDuPanier(index) {
    setPanier(panier.filter((_, i) => i !== index));
  }

  // Total avant réduction (la réduction étudiante est vérifiée à la validation)
  const total = panier.reduce((somme, p) => somme + Number(p.prix), 0);
  const contientMenuEtudiant = panier.some((p) => p.categorie === "etudiant");

  if (chargement) return <p className="message">Le poulet chauffe... 🔥</p>;
  if (erreur) return <p className="message erreur">Oups : {erreur}</p>;

  return (
    <div className="page">
      <section className="barre-filtres">
        <input
          type="text"
          placeholder="🔍 Rechercher un plat..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />

        <select value={categorie} onChange={(e) => setCategorie(e.target.value)}>
          <option value="tous">Tous les menus</option>
          {Object.keys(CATEGORIES).map((cle) => (
            <option key={cle} value={cle}>
              {CATEGORIES[cle]}
            </option>
          ))}
        </select>

        <label className="budget">
          Budget max : <strong>{budget} €</strong>
          <input
            type="range"
            min="3"
            max="15"
            step="0.5"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
          />
        </label>

        <label className="case">
          <input
            type="checkbox"
            checked={dispoSeulement}
            onChange={(e) => setDispoSeulement(e.target.checked)}
          />
          Disponibles uniquement
        </label>
      </section>

      {platDuJour && (
        <div className="plat-du-jour">
          <span>
            ⭐ Plat du jour : <strong>{platDuJour.nom}</strong> à{" "}
            {Number(platDuJour.prix).toFixed(2)} €
          </span>
          <button className="bouton petit-bouton" onClick={() => ajouterAuPanier(platDuJour)}>
            Je le prends
          </button>
        </div>
      )}

      <div className="mise-en-page">
        <section className="grille">
          {platsFiltres.length === 0 && (
            <p className="message">Aucun plat ne correspond à votre recherche.</p>
          )}
          {platsFiltres.map((plat) => (
            <CartePlat key={plat.id} plat={plat}>
              <button
                className="bouton"
                disabled={!plat.dispo}
                onClick={() => ajouterAuPanier(plat)}
              >
                {plat.dispo ? "Ajouter au panier" : "Indisponible"}
              </button>
            </CartePlat>
          ))}
        </section>

        <aside className="panier">
          <h2>🛒 Mon plateau</h2>
          {panier.length === 0 && <p>Votre plateau est vide.</p>}
          <ul>
            {panier.map((p, index) => (
              <li key={index}>
                {p.nom} — {Number(p.prix).toFixed(2)} €
                <button className="petit" onClick={() => retirerDuPanier(index)}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
          {contientMenuEtudiant && (
            <p className="reduc">🎓 -10 % possible avec votre n° étudiant</p>
          )}
          <p className="total">Total : {total.toFixed(2)} €</p>
          <button
            className="bouton"
            disabled={panier.length === 0}
            onClick={() => setCommandeOuverte(true)}
          >
            Valider mon plateau
          </button>
        </aside>
      </div>

      {commandeOuverte && (
        <Commande
          panier={panier}
          onFermer={() => setCommandeOuverte(false)}
          onCommandeValidee={() => setPanier([])}
        />
      )}
    </div>
  );
}

export default PageClient;
