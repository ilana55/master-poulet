// fait tourner le React : en local il lance le site et en ligne la dernire version. Traduction du code react en javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
