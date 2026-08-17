package dev.notpelos.cv.adapt;

import java.util.List;

/**
 * Response body for POST /api/cv/adapt.
 *
 * Índices (0-based) hacia los arrays del request original, en vez de duplicar
 * strings. El frontend re-renderiza el modal filtrando por esos índices — así
 * la comparación "before/after" es exacta y no depende de que el LLM devuelva
 * texto idéntico byte a byte.
 *
 * `customSummary` es el único campo generativo real: 2-4 frases explicando
 * *por qué* este perfil encaja con el puesto. Se muestra tal cual al usuario.
 * `matchScore` es un self-report del LLM (0-100) para dar contexto rápido.
 */
public record AdaptResponse(
    List<Integer> relevantHighlights,
    List<Integer> relevantExperience,
    List<Integer> relevantProjects,
    List<String> relevantSkills,
    String customSummary,
    int matchScore
) {}
