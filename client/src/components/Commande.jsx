import { useState } from "react";
import { verifierEtudiant, passerCommande } from "../api.js";

// Fenêtre de validation du panier, en 3 étapes :
// "recap" (+ numéro étudiant)  →  "paiement"  →  "confirmation"
function Commande({ panier, onFermer, onCommandeValidee }) {
  const [etape, setEtape] = useState("recap");
  const [erreur, setErreur] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  // Réduction étudiante
  const [numeroEtudiant, setNumeroEtudiant] = useState("");
  const [etudiantVerifie, setEtudiantVerifie] = useState(false);

  // Carte bancaire (fictive). Gardée en mémoire seulement, jamais dans localStorage.
  const [carte, setCarte] = useState({
    titulaire: "",
    numero: "",
    expiration: "",
    cvv: "",
  });

  const [commande, setCommande] = useState(null);

  const contientMenuEtudiant = panier.some((p) => p.categorie === "etudiant");
  let total = panier.reduce((somme, p) => somme + Number(p.prix), 0);
  const reduction = etudiantVerifie && contientMenuEtudiant;
  if (reduction) total = total * 0.9;

  async function verifierNumero() {
    setErreur("");
    try {
      await verifierEtudiant(numeroEtudiant);
      setEtudiantVerifie(true);
    } catch (err) {
      setEtudiantVerifie(false);
      setErreur(err.message);
    }
  }

  function changerCarte(e) {
    setCarte({ ...carte, [e.target.name]: e.target.value });
  }

  async function payer(e) {
    e.preventDefault();
    setErreur("");
    setEnvoiEnCours(true); // empêche de payer deux fois en double-cliquant
    try {
      const ids = panier.map((p) => p.id);
      const resultat = await passerCommande(
        ids,
        etudiantVerifie ? numeroEtudiant : null,
        carte
      );
      setCommande(resultat);
      // On efface la carte de la mémoire dès que le paiement est fait
      setCarte({ titulaire: "", numero: "", expiration: "", cvv: "" });
      setEtape("confirmation");
      onCommandeValidee();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <div className="fond-modale">
      <div className="modale">
        <button className="fermer" onClick={onFermer}>
          ✕
        </button>

        {/* ---------- Étape 1 : récapitulatif ---------- */}
        {etape === "recap" && (
          <div>
            <h2>1. Mon plateau</h2>
            <ul>
              {panier.map((p, index) => (
                <li key={index}>
                  {p.nom} — {Number(p.prix).toFixed(2)} €
                </li>
              ))}
            </ul>

            {contientMenuEtudiant && (
              <div className="encadre">
                <p>🎓 Vous avez un menu étudiant : -10 % sur présentation de votre carte.</p>
                <div className="ligne">
                  <input
                    placeholder="N° étudiant (8 chiffres)"
                    value={numeroEtudiant}
                    maxLength={8}
                    disabled={etudiantVerifie}
                    onChange={(e) => setNumeroEtudiant(e.target.value)}
                  />
                  <button
                    className="bouton jaune"
                    onClick={verifierNumero}
                    disabled={etudiantVerifie || numeroEtudiant.length !== 8}
                  >
                    {etudiantVerifie ? "✅ Vérifié" : "Vérifier"}
                  </button>
                </div>
              </div>
            )}

            {reduction && <p className="reduc">-10 % réduction étudiante appliquée</p>}
            <p className="total">Total : {total.toFixed(2)} €</p>
            {erreur && <p className="erreur">{erreur}</p>}

            <button className="bouton" onClick={() => { setErreur(""); setEtape("paiement"); }}>
              Passer au paiement
            </button>
          </div>
        )}

        {/* ---------- Étape 2 : paiement ---------- */}
        {etape === "paiement" && (
          <form onSubmit={payer}>
            <h2>2. Paiement</h2>
            <p className="avertissement">
              ⚠️ Paiement simulé (projet étudiant) : n'entrez jamais une vraie carte.
              Carte de test : <strong>4242 4242 4242 4242</strong>, date future, CVV 123.
            </p>

            <input
              name="titulaire"
              placeholder="Nom du titulaire"
              value={carte.titulaire}
              onChange={changerCarte}
              autoComplete="off"
            />
            <input
              name="numero"
              placeholder="Numéro de carte (16 chiffres)"
              value={carte.numero}
              onChange={changerCarte}
              maxLength={19}
              inputMode="numeric"
              autoComplete="off"
            />
            <div className="ligne">
              <input
                name="expiration"
                placeholder="MM/AA"
                value={carte.expiration}
                onChange={changerCarte}
                maxLength={5}
                autoComplete="off"
              />
              <input
                name="cvv"
                type="password"
                placeholder="CVV"
                value={carte.cvv}
                onChange={changerCarte}
                maxLength={3}
                inputMode="numeric"
                autoComplete="off"
              />
            </div>

            <p className="total">À payer : {total.toFixed(2)} €</p>
            {erreur && <p className="erreur">{erreur}</p>}

            <div className="ligne">
              <button type="button" className="bouton gris" onClick={() => setEtape("recap")}>
                Retour
              </button>
              <button type="submit" className="bouton" disabled={envoiEnCours}>
                {envoiEnCours ? "Paiement..." : "Payer"}
              </button>
            </div>
          </form>
        )}

        {/* ---------- Étape 3 : confirmation ---------- */}
        {etape === "confirmation" && commande && (
          <div className="confirmation">
            <h2>3. Merci ! 🍗</h2>
            <p>
              Commande <strong>n°{commande.id}</strong> validée.
            </p>
            <p>
              Montant débité : <strong>{Number(commande.total).toFixed(2)} €</strong>
              {commande.reduction && " (réduction étudiante incluse)"}
            </p>
            <button className="bouton" onClick={onFermer}>
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Commande;
