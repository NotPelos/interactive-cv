package dev.notpelos.cv.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.greaterThan;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class CvPdfControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void pdf_defaultLang_returns200WithPdfContentType() throws Exception {
        mockMvc.perform(get("/api/cv/pdf"))
            .andExpect(status().isOk())
            .andExpect(content().contentType("application/pdf"));
    }

    @Test
    void pdf_langEs_returns200() throws Exception {
        mockMvc.perform(get("/api/cv/pdf").param("lang", "es"))
            .andExpect(status().isOk())
            .andExpect(content().contentType("application/pdf"));
    }

    @Test
    void pdf_langEn_returns200() throws Exception {
        mockMvc.perform(get("/api/cv/pdf").param("lang", "en"))
            .andExpect(status().isOk())
            .andExpect(content().contentType("application/pdf"));
    }

    @Test
    void pdf_invalidLang_returns400() throws Exception {
        // Jakarta validation rejects values outside es|en pattern
        mockMvc.perform(get("/api/cv/pdf").param("lang", "fr"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void pdf_contentIsNotEmpty() throws Exception {
        byte[] bytes = mockMvc.perform(get("/api/cv/pdf"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsByteArray();

        assert bytes.length > 1000 : "PDF should not be empty (got " + bytes.length + " bytes)";
    }

    @Test
    void pdf_hasContentDispositionHeader() throws Exception {
        mockMvc.perform(get("/api/cv/pdf").param("lang", "es"))
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Disposition",
                org.hamcrest.Matchers.containsString("notpelos-cv-es.pdf")));
    }

    @Test
    void pdf_enHasCorrectFilename() throws Exception {
        mockMvc.perform(get("/api/cv/pdf").param("lang", "en"))
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Disposition",
                org.hamcrest.Matchers.containsString("notpelos-cv-en.pdf")));
    }
}
