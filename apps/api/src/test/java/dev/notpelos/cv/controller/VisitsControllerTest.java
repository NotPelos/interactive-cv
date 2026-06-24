package dev.notpelos.cv.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class VisitsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void visits_returns200WithCountField() throws Exception {
        mockMvc.perform(get("/api/visits"))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith("application/json"))
            .andExpect(jsonPath("$.count").isNumber());
    }

    @Test
    void visits_incrementsOnEachCall() throws Exception {
        // Two sequential requests should yield n and n+1
        String first = mockMvc.perform(get("/api/visits"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

        String second = mockMvc.perform(get("/api/visits"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

        // Parse count values and assert second > first
        long countFirst = extractCount(first);
        long countSecond = extractCount(second);
        assert countSecond == countFirst + 1
            : "Expected " + (countFirst + 1) + " but got " + countSecond;
    }

    private long extractCount(String json) {
        // Simple extraction without Jackson dep — format is {"count":N}
        String value = json.replaceAll(".*\"count\":(\\d+).*", "$1");
        return Long.parseLong(value);
    }
}
