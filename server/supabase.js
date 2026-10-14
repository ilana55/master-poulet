// Connexion à Supabase : c'est le SEUL fichier du projet qui connaît la clé.
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const { SUPABASE_URL, SUPABASE_KEY } = process.env;

export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const supabase = hasSupabaseConfig
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

export function ensureSupabaseConfigured() {
  if (!hasSupabaseConfig) {
    throw new Error("SUPABASE_URL et SUPABASE_KEY sont requis pour utiliser l'API");
  }
}
