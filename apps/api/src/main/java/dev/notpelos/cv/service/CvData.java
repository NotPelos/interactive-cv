package dev.notpelos.cv.service;

import java.util.List;

/**
 * Immutable value object holding all CV content for one language.
 * Populated by ContentLoader and consumed by PdfGenerator.
 */
public record CvData(
    String lang,
    Identity identity,
    String about,
    List<Highlight> highlights,
    List<Experience> experience,
    List<Project> projects,
    List<SkillGroup> skills,
    List<Education> education
) {
    public record Identity(
        String fullName,
        String publicAlias,
        String title,
        String email,
        String location,
        String github,
        String linkedin
    ) {}

    public record Highlight(int number, String text) {}

    public record Experience(
        String company,
        String role,
        String period,
        String stack,
        List<String> bullets
    ) {}

    public record Project(
        String name,
        String pitch,
        String url,
        String stack,
        String description
    ) {}

    public record SkillGroup(String category, List<SkillEntry> entries) {}

    public record SkillEntry(String name, int level) {}

    public record Education(String year, String institution, String degree) {}
}
