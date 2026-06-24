package dev.notpelos.cv.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.lowagie.text.pdf.draw.LineSeparator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

/**
 * Generates the CV as a PDF using OpenPDF (LGPL).
 *
 * Layout decisions:
 * - A4, margins 36pt (0.5 inch) to maximise content area.
 * - Black on white — no Tokyo Night colours; this is paper.
 * - No images/fonts downloaded at runtime: uses built-in Helvetica family.
 * - Sections separated by a thin horizontal rule.
 * - Table for skills (name + level dots), bullet list for experience.
 */
@Service
public class PdfGenerator {

    private static final Logger log = LoggerFactory.getLogger(PdfGenerator.class);

    // --- Colours ---
    private static final Color COLOR_PRIMARY   = new Color(0, 0, 0);       // black
    private static final Color COLOR_ACCENT    = new Color(30, 80, 160);    // dark blue for links/headers
    private static final Color COLOR_RULE      = new Color(180, 180, 180);  // light grey rule
    private static final Color COLOR_SECONDARY = new Color(80, 80, 80);     // dark grey for sub-text

    // --- Fonts ---
    private static final Font FONT_NAME       = FontFactory.getFont(FontFactory.HELVETICA_BOLD,   22, COLOR_PRIMARY);
    private static final Font FONT_TITLE      = FontFactory.getFont(FontFactory.HELVETICA,        11, COLOR_SECONDARY);
    private static final Font FONT_CONTACT    = FontFactory.getFont(FontFactory.HELVETICA,         9, COLOR_SECONDARY);
    private static final Font FONT_SECTION    = FontFactory.getFont(FontFactory.HELVETICA_BOLD,   12, COLOR_ACCENT);
    private static final Font FONT_COMPANY    = FontFactory.getFont(FontFactory.HELVETICA_BOLD,   10, COLOR_PRIMARY);
    private static final Font FONT_ROLE       = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 10, COLOR_SECONDARY);
    private static final Font FONT_PERIOD     = FontFactory.getFont(FontFactory.HELVETICA,         9, COLOR_SECONDARY);
    private static final Font FONT_BODY       = FontFactory.getFont(FontFactory.HELVETICA,         9, COLOR_PRIMARY);
    private static final Font FONT_HIGHLIGHT  = FontFactory.getFont(FontFactory.HELVETICA_BOLD,    9, COLOR_PRIMARY);
    private static final Font FONT_SKILL_NAME = FontFactory.getFont(FontFactory.HELVETICA,         9, COLOR_PRIMARY);
    private static final Font FONT_SKILL_LVL  = FontFactory.getFont(FontFactory.HELVETICA,         9, COLOR_ACCENT);

    /**
     * Generates the PDF for the given CV data.
     *
     * @param data populated CV content for the requested language
     * @return raw PDF bytes
     * @throws DocumentException if OpenPDF fails to construct the document
     */
    public byte[] generate(CvData data) throws DocumentException, IOException {
        log.debug("Generating PDF for lang={}", data.lang());

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4, 36, 36, 36, 36);
        PdfWriter.getInstance(doc, out);
        doc.open();

        addHeader(doc, data.identity());
        addRule(doc);
        addAbout(doc, data.about(), data.lang());
        addHighlights(doc, data.highlights(), data.lang());
        addRule(doc);
        addExperience(doc, data.experience(), data.lang());
        addRule(doc);
        addProjects(doc, data.projects(), data.lang());
        addRule(doc);
        addSkills(doc, data.skills(), data.lang());
        addRule(doc);
        addEducation(doc, data.education(), data.lang());

        doc.close();
        log.debug("PDF generated, size={}bytes", out.size());
        return out.toByteArray();
    }

    // -------------------------------------------------------------------------
    // Section renderers
    // -------------------------------------------------------------------------

    private void addHeader(Document doc, CvData.Identity id) throws DocumentException {
        Paragraph name = new Paragraph(id.fullName(), FONT_NAME);
        name.setAlignment(Element.ALIGN_LEFT);
        name.setSpacingAfter(2);
        doc.add(name);

        doc.add(new Paragraph(id.title(), FONT_TITLE));

        String contactLine = id.email()
            + "   |   " + id.location()
            + "   |   " + id.github()
            + "   |   " + id.linkedin();
        Paragraph contact = new Paragraph(contactLine, FONT_CONTACT);
        contact.setSpacingAfter(6);
        doc.add(contact);
    }

    private void addAbout(Document doc, String about, String lang) throws DocumentException {
        addSectionTitle(doc, "es".equals(lang) ? "Sobre mí" : "About");
        Paragraph p = new Paragraph(stripMarkdownBold(about), FONT_BODY);
        p.setSpacingAfter(8);
        doc.add(p);
    }

    private void addHighlights(Document doc, List<CvData.Highlight> highlights, String lang)
            throws DocumentException {
        addSectionTitle(doc, "es".equals(lang) ? "Highlights" : "Key wins");
        for (CvData.Highlight h : highlights) {
            Paragraph bullet = new Paragraph("• " + h.text(), FONT_BODY);
            bullet.setSpacingAfter(2);
            doc.add(bullet);
        }
        addSpacing(doc, 4);
    }

    private void addExperience(Document doc, List<CvData.Experience> experiences, String lang)
            throws DocumentException {
        addSectionTitle(doc, "es".equals(lang) ? "Experiencia" : "Experience");
        for (CvData.Experience exp : experiences) {
            Paragraph companyLine = new Paragraph();
            companyLine.add(new Chunk(exp.company(), FONT_COMPANY));
            companyLine.add(new Chunk("  —  " + exp.role(), FONT_ROLE));
            companyLine.setSpacingBefore(4);
            doc.add(companyLine);

            Paragraph periodStack = new Paragraph(exp.period() + "   " + exp.stack(), FONT_PERIOD);
            periodStack.setSpacingAfter(2);
            doc.add(periodStack);

            for (String bullet : exp.bullets()) {
                Paragraph b = new Paragraph("• " + bullet, FONT_BODY);
                b.setIndentationLeft(10);
                b.setSpacingAfter(1);
                doc.add(b);
            }
        }
        addSpacing(doc, 4);
    }

    private void addProjects(Document doc, List<CvData.Project> projects, String lang)
            throws DocumentException {
        addSectionTitle(doc, "es".equals(lang) ? "Proyectos" : "Projects");
        for (CvData.Project p : projects) {
            Paragraph titleLine = new Paragraph();
            titleLine.add(new Chunk(p.name(), FONT_HIGHLIGHT));
            titleLine.add(new Chunk("  —  " + p.pitch(), FONT_BODY));
            titleLine.setSpacingBefore(3);
            doc.add(titleLine);

            Paragraph detail = new Paragraph(p.stack() + "\n" + p.description(), FONT_BODY);
            detail.setIndentationLeft(10);
            detail.setSpacingAfter(2);
            doc.add(detail);
        }
        addSpacing(doc, 4);
    }

    private void addSkills(Document doc, List<CvData.SkillGroup> skillGroups, String lang)
            throws DocumentException {
        addSectionTitle(doc, "es".equals(lang) ? "Habilidades" : "Skills");

        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setSpacingAfter(8);
        table.getDefaultCell().setBorder(Rectangle.NO_BORDER);
        table.getDefaultCell().setPaddingBottom(3);

        for (CvData.SkillGroup group : skillGroups) {
            // Group header spans all 4 columns
            PdfPCell header = new PdfPCell(new Phrase(group.category(), FONT_HIGHLIGHT));
            header.setColspan(4);
            header.setBorder(Rectangle.NO_BORDER);
            header.setPaddingBottom(2);
            table.addCell(header);

            for (CvData.SkillEntry entry : group.entries()) {
                String dots = buildLevelDots(entry.level());
                PdfPCell cell = new PdfPCell();
                cell.setBorder(Rectangle.NO_BORDER);
                cell.setPaddingBottom(2);
                Phrase phrase = new Phrase();
                phrase.add(new Chunk(entry.name() + " ", FONT_SKILL_NAME));
                phrase.add(new Chunk(dots, FONT_SKILL_LVL));
                cell.addElement(new Paragraph(phrase));
                table.addCell(cell);
            }
            // Pad row to multiple of 4
            int remainder = group.entries().size() % 4;
            if (remainder != 0) {
                for (int i = remainder; i < 4; i++) {
                    PdfPCell empty = new PdfPCell(new Phrase(""));
                    empty.setBorder(Rectangle.NO_BORDER);
                    table.addCell(empty);
                }
            }
        }
        doc.add(table);
    }

    private void addEducation(Document doc, List<CvData.Education> education, String lang)
            throws DocumentException {
        addSectionTitle(doc, "es".equals(lang) ? "Educación" : "Education");
        for (CvData.Education edu : education) {
            Paragraph line = new Paragraph();
            line.add(new Chunk(edu.year() + "   ", FONT_PERIOD));
            line.add(new Chunk(edu.institution() + "   ", FONT_COMPANY));
            line.add(new Chunk(edu.degree(), FONT_BODY));
            line.setSpacingAfter(2);
            doc.add(line);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private void addSectionTitle(Document doc, String title) throws DocumentException {
        Paragraph p = new Paragraph(title.toUpperCase(), FONT_SECTION);
        p.setSpacingBefore(8);
        p.setSpacingAfter(4);
        doc.add(p);
    }

    private void addRule(Document doc) throws DocumentException {
        LineSeparator separator = new LineSeparator(0.5f, 100, COLOR_RULE, Element.ALIGN_LEFT, -2);
        doc.add(new Chunk(separator));
        addSpacing(doc, 2);
    }

    private void addSpacing(Document doc, float points) throws DocumentException {
        Paragraph spacer = new Paragraph(" ");
        spacer.setSpacingAfter(points);
        doc.add(spacer);
    }

    /** Renders skill level 1-5 as filled/empty dots. */
    private String buildLevelDots(int level) {
        return "●".repeat(Math.min(level, 5)) + "○".repeat(Math.max(0, 5 - level));
    }

    /**
     * Strips **bold** Markdown syntax for plain-text PDF paragraphs.
     * Full MD rendering into PDF would require a visitor pattern over
     * the commonmark AST — left for a follow-up iteration.
     */
    private String stripMarkdownBold(String text) {
        return text.replace("**", "");
    }
}
