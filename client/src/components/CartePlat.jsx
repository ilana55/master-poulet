import { CATEGORIES } from "../api.js";

// Une carte = un plat
function CartePlat({ plat, children }) {
  return (
    <div className={plat.dispo ? "carte" : "carte indispo"}>
      <img
        src={plat.image_url || "/logo.svg"}
        alt={plat.nom}
        className="carte-image"
        onError={(e) => (e.target.src = "/logo.svg")} 
      />
      {!plat.dispo && <span className="badge-indispo">Victime de son succès</span>}
      <div className="carte-contenu">
        <span className="carte-categorie">{CATEGORIES[plat.categorie]}</span>
        <h3>{plat.nom}</h3>
        <p className="prix">{Number(plat.prix).toFixed(2)} €</p>
        {children}
      </div>
    </div>
  );
}

export default CartePlat;
