/** @jsxImportSource preact */
import { useEffect, useRef, useState } from "preact/hooks";
import type { Lang } from "../lib/commands/types.js";
import type { AdaptPayload } from "../lib/cvData.js";

// ---------------------------------------------------------------------------
// Shapes matching backend AdaptResponse
// ---------------------------------------------------------------------------

interface AdaptResponse {
  relevantHighlights: number[];
  relevantExperience: number[];
  relevantProjects: number[];
  relevantSkills: string[];
  customSummary: string;
  matchScore: number;
}

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

const COPY = {
  es: {
    title: "Adaptar CV al puesto",
    intro: "Pega la descripción del puesto y una IA te dice qué partes del CV encajan más.",
    jobLabel: "Descripción del puesto",
    jobPlaceholder: "Pega aquí el texto de la oferta (mínimo 100 caracteres)…",
    analyze: "Analizar",
    analyzing: "Analizando…",
    close: "Cerrar",
    newAnalysis: "Otro análisis",
    scoreLabel: "Encaje",
    summaryLabel: "Resumen personalizado",
    highlightsLabel: "Highlights relevantes",
    experienceLabel: "Experiencia relevante",
    projectsLabel: "Proyectos relevantes",
    skillsLabel: "Skills clave",
    nothingRelevant: "Nada especialmente relevante en esta sección.",
    errors: {
      tooShort: "La descripción es demasiado corta (mínimo 100 caracteres).",
      apiMissing: "API no configurada — este entorno no puede adaptar.",
      rateLimited: "Demasiados análisis. Espera un minuto e inténtalo otra vez.",
      upstream: "El servicio de IA no está disponible ahora mismo.",
      unknown: "Ha fallado algo. Prueba en un momento.",
    },
  },
  en: {
    title: "Adapt CV to the role",
    intro: "Paste the job description and an AI tells you which parts of the CV best fit.",
    jobLabel: "Job description",
    jobPlaceholder: "Paste the role text here (minimum 100 characters)…",
    analyze: "Analyse",
    analyzing: "Analysing…",
    close: "Close",
    newAnalysis: "New analysis",
    scoreLabel: "Fit",
    summaryLabel: "Personalised summary",
    highlightsLabel: "Relevant highlights",
    experienceLabel: "Relevant experience",
    projectsLabel: "Relevant projects",
    skillsLabel: "Key skills",
    nothingRelevant: "Nothing particularly relevant in this section.",
    errors: {
      tooShort: "Description is too short (minimum 100 characters).",
      apiMissing: "API not configured — this environment can't adapt.",
      rateLimited: "Too many analyses. Wait a minute and try again.",
      upstream: "The AI service is unavailable right now.",
      unknown: "Something failed. Try again shortly.",
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  lang: Lang;
  apiBaseUrl: string;
  cvData: AdaptPayload;
  onClose: () => void;
}

type Status = "idle" | "sending" | "success" | "error";

export default function AdaptModal({ lang, apiBaseUrl, cvData, onClose }: Props) {
  // eslint-disable-next-line security/detect-object-injection
  const t = COPY[lang];
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [result, setResult] = useState<AdaptResponse | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => textareaRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(e: Event) {
    e.preventDefault();
    setErrorMsg("");
    if (description.trim().length < 100) {
      setErrorMsg(t.errors.tooShort);
      return;
    }
    if (!apiBaseUrl) {
      setErrorMsg(t.errors.apiMissing);
      return;
    }

    setStatus("sending");
    try {
      const response = await fetch(`${apiBaseUrl}/api/cv/adapt`, {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: description.trim(),
          cv: cvData,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as AdaptResponse;
        setResult(data);
        setStatus("success");
        return;
      }
      if (response.status === 429) setErrorMsg(t.errors.rateLimited);
      else if (response.status === 502 || response.status === 503) setErrorMsg(t.errors.upstream);
      else setErrorMsg(t.errors.unknown);
      setStatus("error");
    } catch {
      setErrorMsg(t.errors.unknown);
      setStatus("error");
    }
  }

  function reset() {
    setResult(null);
    setStatus("idle");
    setErrorMsg("");
    setDescription("");
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  const inputCls =
    "w-full bg-tn-bg border border-tn-border rounded px-3 py-2 text-sm text-tn-text placeholder:text-tn-text-dim focus:outline-none focus:ring-1 focus:ring-tn-blue";
  const labelCls = "block text-xs uppercase tracking-wider text-tn-text-mute mb-1";
  const sectionCls = "mt-4";
  const sectionTitleCls = "text-xs uppercase tracking-wider text-tn-blue mb-2";
  const chipCls =
    "inline-block px-2 py-0.5 text-xs rounded bg-tn-blue/10 border border-tn-blue/40 text-tn-text mr-1 mb-1";

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
    >
      <div class="bg-tn-bg border border-tn-border rounded-lg shadow-2xl w-full max-w-2xl p-6 max-h-full overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-tn-blue">{t.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            class="text-tn-text-mute hover:text-tn-text text-2xl leading-none"
          >×</button>
        </div>

        {status === "success" && result ? (
          <div>
            {/* Score */}
            <div class="mb-4 flex items-baseline gap-3">
              <span class="text-xs uppercase tracking-wider text-tn-text-mute">{t.scoreLabel}</span>
              <span
                class={`text-2xl font-bold ${
                  result.matchScore >= 70 ? "text-tn-green"
                  : result.matchScore >= 40 ? "text-tn-yellow"
                  : "text-tn-red"
                }`}
              >{result.matchScore}<span class="text-tn-text-mute text-base">/100</span></span>
            </div>

            {/* Summary */}
            <div class={sectionCls}>
              <div class={sectionTitleCls}>{t.summaryLabel}</div>
              <p class="text-sm text-tn-text leading-relaxed">{result.customSummary}</p>
            </div>

            {/* Highlights */}
            <div class={sectionCls}>
              <div class={sectionTitleCls}>{t.highlightsLabel}</div>
              {result.relevantHighlights.length === 0 ? (
                <p class="text-sm text-tn-text-dim">{t.nothingRelevant}</p>
              ) : (
                <ul class="space-y-1">
                  {result.relevantHighlights.map((idx) => {
                    const h = cvData.highlights[idx];
                    if (!h) return null;
                    return (
                      <li class="text-sm text-tn-text">
                        <span class="text-tn-blue font-bold mr-2">{h.metric}</span>
                        <span>{h.label}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Experience */}
            <div class={sectionCls}>
              <div class={sectionTitleCls}>{t.experienceLabel}</div>
              {result.relevantExperience.length === 0 ? (
                <p class="text-sm text-tn-text-dim">{t.nothingRelevant}</p>
              ) : (
                <ul class="space-y-2">
                  {result.relevantExperience.map((idx) => {
                    const e = cvData.experience[idx];
                    if (!e) return null;
                    return (
                      <li class="text-sm">
                        <div class="text-tn-text">
                          <span class="font-bold">{e.role}</span>
                          <span class="text-tn-text-mute"> · {e.company}</span>
                        </div>
                        <div class="text-xs text-tn-text-dim">{e.dateRange}</div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Projects */}
            <div class={sectionCls}>
              <div class={sectionTitleCls}>{t.projectsLabel}</div>
              {result.relevantProjects.length === 0 ? (
                <p class="text-sm text-tn-text-dim">{t.nothingRelevant}</p>
              ) : (
                <ul class="space-y-2">
                  {result.relevantProjects.map((idx) => {
                    const p = cvData.projects[idx];
                    if (!p) return null;
                    return (
                      <li class="text-sm">
                        <div class="text-tn-text font-bold">{p.title}</div>
                        <div class="text-xs text-tn-text-mute">{p.pitch}</div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Skills */}
            <div class={sectionCls}>
              <div class={sectionTitleCls}>{t.skillsLabel}</div>
              {result.relevantSkills.length === 0 ? (
                <p class="text-sm text-tn-text-dim">{t.nothingRelevant}</p>
              ) : (
                <div>
                  {result.relevantSkills.map((s) => (
                    <span class={chipCls}>{s}</span>
                  ))}
                </div>
              )}
            </div>

            <div class="flex gap-2 justify-end mt-6">
              <button
                type="button" onClick={reset}
                class="px-4 py-2 rounded border border-tn-border text-sm text-tn-text-mute hover:text-tn-text"
              >{t.newAnalysis}</button>
              <button
                type="button" onClick={onClose}
                class="px-4 py-2 rounded bg-tn-blue text-tn-bg font-semibold text-sm hover:opacity-90"
              >{t.close}</button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} novalidate>
            <p class="text-sm text-tn-text-mute mb-4">{t.intro}</p>

            <div class="mb-3">
              <label class={labelCls} htmlFor="ad-desc">{t.jobLabel}</label>
              <textarea
                ref={textareaRef}
                id="ad-desc" class={`${inputCls} min-h-[180px] resize-y`}
                value={description}
                onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
                placeholder={t.jobPlaceholder}
                maxLength={8000} required
              />
              <div class="text-xs text-tn-text-dim mt-1 text-right">
                {description.length} / 8000
              </div>
            </div>

            {errorMsg && (
              <div class="mb-3 text-sm text-tn-red border border-tn-red/40 bg-tn-red/10 rounded px-3 py-2">
                {errorMsg}
              </div>
            )}

            <div class="flex gap-2 justify-end mt-4">
              <button
                type="button" onClick={onClose}
                class="px-4 py-2 rounded border border-tn-border text-sm text-tn-text-mute hover:text-tn-text"
              >{t.close}</button>
              <button
                type="submit"
                disabled={status === "sending" || description.trim().length < 100}
                class="px-4 py-2 rounded bg-tn-blue text-tn-bg font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >{status === "sending" ? t.analyzing : t.analyze}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
