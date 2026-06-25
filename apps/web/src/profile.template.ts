// PLACEHOLDER profile — copy this file to profile.ts and fill in your own data.
//
//   cp apps/web/src/profile.template.ts apps/web/src/profile.ts
//
// Or run:  pnpm --filter web sync   (requires personal/ directory).
//
// profile.ts is .gitignored so it never commits personal data to the public repo.

export interface Profile {
  /** Full legal name shown in JSON-LD, OG tags, and recruiter view. */
  fullName: string;
  /** Public alias shown in the terminal prompt, neofetch, whoami, etc. */
  publicAlias: string;
  /** String shown as "user@host" in the terminal prompt, e.g. "youralias@cv". */
  promptUser: string;
  email: string;
  location: { es: string; en: string };
  social: {
    githubUrl: string;
    githubUser: string;
    linkedinUrl: string;
  };
  /** Deployed domain, e.g. "youralias.pages.dev". Used in canonical URLs and OG. */
  domain: string;
  /** Fly.io backend URL — optional, enables `download cv.pdf` live generation. */
  apiUrl?: string;
  /** Cloudflare Worker URL — optional, enables `repos` live GitHub fetch. */
  workerUrl?: string;
}

const profile: Profile = {
  fullName: "Your Name",
  publicAlias: "youralias",
  promptUser: "youralias@cv",
  email: "you@example.com",
  location: { es: "Tu ciudad, País", en: "Your city, Country" },
  social: {
    githubUrl: "https://github.com/youralias",
    githubUser: "youralias",
    linkedinUrl: "https://www.linkedin.com/in/your-handle",
  },
  domain: "youralias.pages.dev",
};

export default profile;
