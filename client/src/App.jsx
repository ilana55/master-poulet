import { useState } from "react";
import PageClient from "./pages/PageClient.jsx";
import PageGerant from "./pages/PageGerant.jsx";

function App() {
  const [page, setPage] = useState("client");

  return (
    <div>
      <header className="entete">
        <div className="marque">
          <img src="/logo.svg" alt="Logo Mastère Poulet" className="logo" />
          <div>
            <h1>Mastère Poulet</h1>
            <p className="slogan">Le poulet niveau Bac+5</p>
          </div>
        </div>
        <nav>
          <button
            className={page === "client" ? "onglet actif" : "onglet"}
            onClick={() => setPage("client")}
          >
            La carte
          </button>
          <button
            className={page === "gerant" ? "onglet actif" : "onglet"}
            onClick={() => setPage("gerant")}
          >
            Espace gérant
          </button>
        </nav>
      </header>

      <main>{page === "client" ? <PageClient /> : <PageGerant />}</main>

      <footer className="pied">
        Projet étudiant ECE — images : TheMealDB · client → API Express → Supabase
      </footer>
    </div>
  );
}

export default App;
