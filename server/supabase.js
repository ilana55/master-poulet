// Connexion à Supabase : c'est le SEUL fichier du projet qui connaît la clé.
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error(" Il manque SUPABASE_URL ou SUPABASE_KEY dans le fichier .env");
  process.exit(1);
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
