/** @jsxImportSource preact */
import { useEffect, useRef, useState } from "preact/hooks";
import type { Lang } from "../lib/commands/types.js";

// ---------------------------------------------------------------------------
// Turnstile global — cargado dinámicamente cuando se abre el modal
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        options: { sitekey: string; callback: (token: string) => void; "error-callback"?: () => void; theme?: "light" | "dark" | "auto" }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (document.querySelector(`script[src^="${TURNSTILE_SRC}"]`)) {
    // Ya cargándose desde una apertura previa — esperamos a que window.turnstile exista.
    return new Promise((resolve) => {
      const t = setInterval(() => {
        if (window.turnstile) {
          clearInterval(t);
          resolve();
        }
      }, 100);
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = TURNSTILE_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile_script_failed"));
    document.head.appendChild(s);
  });
}

// ---------------------------------------------------------------------------
// i18n mínimo — todas las cadenas visibles pasan por T[lang]
// ---------------------------------------------------------------------------

interface Copy {
  title: string;
  intro: string;
  name: string;
  email: string;
  company: string;
  companyOpt: string;
  message: string;
  send: string;
  sending: string;
  cancel: string;
  success: string;
  successHint: string;
  errors: {
    required: string;
    email: string;
    messageMin: string;
    turnstile: string;
    rateLimited: string;
    upstream: string;
    unknown: string;
    apiMissing: string;
  };
}

const COPY: Record<Lang, Copy> = {
  es: {
    title: "Contactar",
    intro: "Escribe lo que quieras. Me llega directo al email.",
    name: "Nombre",
    email: "Email",
    company: "Empresa",
    companyOpt: "opcional",
    message: "Mensaje",
    send: "Enviar",
    sending: "Enviando…",
    cancel: "Cancelar",
    success: "Mensaje enviado.",
    successHint: "Te responderé al email que dejaste.",
    errors: {
      required: "Rellena este campo",
      email: "Email no válido",
      messageMin: "El mensaje es demasiado corto (mínimo 20 caracteres)",
      turnstile: "Cloudflare no ha validado el envío. Intenta de nuevo.",
      rateLimited: "Demasiados envíos. Espera un minuto e inténtalo otra vez.",
      upstream: "El servicio de email no está disponible ahora mismo.",
      unknown: "Ha fallado algo al enviar. Prueba en un momento.",
      apiMissing: "API no configurada — este entorno no puede enviar mensajes.",
    },
  },
  en: {
    title: "Contact",
    intro: "Say hi. It comes straight to my inbox.",
    name: "Name",
    email: "Email",
    company: "Company",
    companyOpt: "optional",
    message: "Message",
    send: "Send",
    sending: "Sending…",
    cancel: "Cancel",
    success: "Message sent.",
    successHint: "I'll reply to the email you left.",
    errors: {
      required: "Please fill this in",
      email: "Not a valid email",
      messageMin: "Message is too short (minimum 20 characters)",
      turnstile: "Cloudflare didn't validate your submission. Try again.",
      rateLimited: "Too many submissions. Wait a minute and try again.",
      upstream: "The email service is unavailable right now.",
      unknown: "Something failed while sending. Try again shortly.",
      apiMissing: "API not configured — this environment can't send messages.",
    },
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  lang: Lang;
  apiBaseUrl: string;
  turnstileSiteKey: string;
  onClose: () => void;
}

type Status = "idle" | "sending" | "success" | "error";

export default function ContactModal({ lang, apiBaseUrl, turnstileSiteKey, onClose }: Props) {
  // lang es typed como Lang ("es"|"en"), no user-controlled — el índice es seguro
  // eslint-disable-next-line security/detect-object-injection
  const t = COPY[lang];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const turnstileHostRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Autofocus del primer input al abrir. Sin esto, el input del terminal
  // (que estaba enfocado antes) se queda con el foco y las teclas van allí.
  useEffect(() => {
    // requestAnimationFrame para asegurar que el input ya está pintado.
    const raf = requestAnimationFrame(() => firstInputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, []);

  // Cargar script Turnstile + renderizar widget al montar
  useEffect(() => {
    if (!turnstileSiteKey) return;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile || !turnstileHostRef.current) return;
        widgetIdRef.current = window.turnstile.render(turnstileHostRef.current, {
          sitekey: turnstileSiteKey,
          theme: "dark",
          callback: (token) => {
            setTurnstileToken(token);
            setTurnstileReady(true);
          },
          "error-callback": () => {
            setTurnstileReady(false);
            setTurnstileToken("");
          },
        });
      })
      .catch(() => setTurnstileReady(false));

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* noop */ }
      }
    };
  }, [turnstileSiteKey]);

  // Cerrar con Escape (sin autofocus dentro del modal para no atrapar al usuario)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function validateClient(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t.errors.required;
    if (!email.trim()) errs.email = t.errors.required;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = t.errors.email;
    if (!message.trim()) errs.message = t.errors.required;
    else if (message.trim().length < 20) errs.message = t.errors.messageMin;
    return errs;
  }

  async function onSubmit(e: Event) {
    e.preventDefault();
    setErrorMsg("");
    const errs = validateClient();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (!apiBaseUrl) {
      setStatus("error");
      setErrorMsg(t.errors.apiMissing);
      return;
    }
    if (!turnstileToken) {
      setStatus("error");
      setErrorMsg(t.errors.turnstile);
      return;
    }

    setStatus("sending");
    try {
      const response = await fetch(`${apiBaseUrl}/api/contact`, {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          company: company.trim() || undefined,
          message: message.trim(),
          turnstileToken,
        }),
      });

      if (response.ok) {
        setStatus("success");
        return;
      }
      // Map status → user-friendly message; do NOT surface upstream body.
      if (response.status === 429) setErrorMsg(t.errors.rateLimited);
      else if (response.status === 403) setErrorMsg(t.errors.turnstile);
      else if (response.status === 502 || response.status === 503) setErrorMsg(t.errors.upstream);
      else setErrorMsg(t.errors.unknown);
      setStatus("error");
      // Reset Turnstile so the user gets a fresh token on retry (single-use).
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
          setTurnstileToken("");
          setTurnstileReady(false);
        } catch { /* noop */ }
      }
    } catch {
      setStatus("error");
      setErrorMsg(t.errors.unknown);
    }
  }

  const inputCls =
    "w-full bg-tn-bg-alt border border-tn-border rounded px-3 py-2 text-sm text-tn-text focus:outline-none focus:ring-1 focus:ring-tn-blue";
  const labelCls = "block text-xs uppercase tracking-wider text-tn-text-mute mb-1";
  const errCls = "text-xs text-tn-red mt-1";

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
    >
      <div class="bg-tn-bg border border-tn-border rounded-lg shadow-2xl w-full max-w-md p-6 max-h-full overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-tn-blue">{t.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.cancel}
            class="text-tn-text-mute hover:text-tn-text text-2xl leading-none"
          >×</button>
        </div>

        {status === "success" ? (
          <div class="py-6 text-center">
            <p class="text-tn-green text-base mb-2">{t.success}</p>
            <p class="text-tn-text-mute text-sm">{t.successHint}</p>
            <button
              type="button"
              onClick={onClose}
              class="mt-6 px-4 py-2 rounded bg-tn-blue text-tn-bg font-semibold text-sm hover:opacity-90"
            >OK</button>
          </div>
        ) : (
          <form onSubmit={onSubmit} novalidate>
            <p class="text-sm text-tn-text-mute mb-4">{t.intro}</p>

            <div class="mb-3">
              <label class={labelCls} htmlFor="cf-name">{t.name}</label>
              <input
                ref={firstInputRef}
                id="cf-name" type="text" class={inputCls}
                value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)}
                maxLength={80} required
              />
              {fieldErrors.name && <div class={errCls}>{fieldErrors.name}</div>}
            </div>

            <div class="mb-3">
              <label class={labelCls} htmlFor="cf-email">{t.email}</label>
              <input
                id="cf-email" type="email" class={inputCls}
                value={email} onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                maxLength={120} required
              />
              {fieldErrors.email && <div class={errCls}>{fieldErrors.email}</div>}
            </div>

            <div class="mb-3">
              <label class={labelCls} htmlFor="cf-company">
                {t.company} <span class="normal-case text-tn-text-dim">({t.companyOpt})</span>
              </label>
              <input
                id="cf-company" type="text" class={inputCls}
                value={company} onInput={(e) => setCompany((e.target as HTMLInputElement).value)}
                maxLength={100}
              />
            </div>

            <div class="mb-3">
              <label class={labelCls} htmlFor="cf-message">{t.message}</label>
              <textarea
                id="cf-message" class={`${inputCls} min-h-[120px] resize-y`}
                value={message} onInput={(e) => setMessage((e.target as HTMLTextAreaElement).value)}
                maxLength={3000} required
              />
              {fieldErrors.message && <div class={errCls}>{fieldErrors.message}</div>}
            </div>

            {/* Turnstile — el widget se renderiza dentro cuando el script carga */}
            <div ref={turnstileHostRef} class="mb-3" />

            {errorMsg && (
              <div class="mb-3 text-sm text-tn-red border border-tn-red/40 bg-tn-red/10 rounded px-3 py-2">
                {errorMsg}
              </div>
            )}

            <div class="flex gap-2 justify-end mt-4">
              <button
                type="button" onClick={onClose}
                class="px-4 py-2 rounded border border-tn-border text-sm text-tn-text-mute hover:text-tn-text"
              >{t.cancel}</button>
              <button
                type="submit"
                disabled={status === "sending" || (Boolean(turnstileSiteKey) && !turnstileReady)}
                class="px-4 py-2 rounded bg-tn-blue text-tn-bg font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >{status === "sending" ? t.sending : t.send}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
