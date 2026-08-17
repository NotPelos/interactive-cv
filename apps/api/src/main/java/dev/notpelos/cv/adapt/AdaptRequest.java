package dev.notpelos.cv.adapt;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

/**
 * Request body for POST /api/cv/adapt.
 *
 * The frontend sends BOTH the job description and the full CV context in the
 * same request. This keeps the server stateless (no need for the API to know
 * where the CV lives) and lets the caller adapt any CV, not just NotPelos's.
 *
 * Size caps are conservative:
 *   jobDescription — 8 000 chars (~4 pages, more than enough for real posts).
 *   cv.about, cv.highlights, cv.experience, cv.projects — bounded by usage but
 *   Bean Validation enforces per-field lengths inside the nested records.
 */
public record AdaptRequest(
    @NotBlank(message = "jobDescription is required")
    @Size(min = 100, max = 8000, message = "jobDescription must be 100-8000 chars")
    String jobDescription,

    @NotNull(message = "cv is required")
    @Valid
    CvPayload cv
) {

    public record CvPayload(
        @NotBlank
        @Size(max = 4) // "es" or "en"
        String lang,

        @NotBlank
        @Size(max = 4000)
        String about,

        @NotNull
        @Size(max = 20)
        List<@Valid Highlight> highlights,

        @NotNull
        @Size(max = 20)
        List<@Valid Experience> experience,

        @NotNull
        @Size(max = 30)
        List<@Valid Project> projects,

        // Skills as-is from skills.json. Map keys are opaque names, values are
        // either integers (level 1-5) or nested maps. We deserialize as
        // Map<String,Object> intentionally — the LLM sees it as JSON.
        @NotNull
        Map<String, Object> skills
    ) {}

    public record Highlight(
        @NotBlank @Size(max = 30) String metric,
        @NotBlank @Size(max = 300) String label
    ) {}

    public record Experience(
        @NotBlank @Size(max = 100) String company,
        @NotBlank @Size(max = 100) String role,
        @Size(max = 100) String dateRange,
        @NotNull @Size(max = 20) List<@Size(max = 60) String> stack,
        @NotNull @Size(max = 20) List<@Size(max = 500) String> bullets
    ) {}

    public record Project(
        @NotBlank @Size(max = 100) String title,
        @NotBlank @Size(max = 500) String pitch,
        @NotNull @Size(max = 20) List<@Size(max = 60) String> stack
    ) {}
}
