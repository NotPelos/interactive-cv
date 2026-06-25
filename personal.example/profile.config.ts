// Ejemplo completo de personal/profile.config.ts
// Copia este archivo a personal/profile.config.ts y rellena con tus datos.
// El import apunta a profile.template porque una vez copiado a src/, ese path es correcto.
import type { Profile } from "./profile.template";

const profile: Profile = {
  fullName: "Your Full Name",
  publicAlias: "youralias",
  promptUser: "youralias@cv",
  email: "you@example.com",
  location: {
    es: "Tu ciudad, País",
    en: "Your city, Country",
  },
  social: {
    githubUrl: "https://github.com/youralias",
    githubUser: "youralias",
    linkedinUrl: "https://www.linkedin.com/in/your-handle",
  },
  domain: "youralias.pages.dev",
  // Optional: Fly.io backend (enables live PDF generation)
  // apiUrl: "https://your-app.fly.dev",
  // Optional: Cloudflare Worker (enables live GitHub repos)
  // workerUrl: "https://your-worker.workers.dev",
};

export default profile;
