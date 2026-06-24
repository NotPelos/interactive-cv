package dev.notpelos.cv.config;

import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Translates Jakarta Validation constraint violations to HTTP 400.
 *
 * Spring MVC does not do this automatically for @RequestParam/@PathVariable
 * violations (it does for @RequestBody); this handler covers that gap.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ConstraintViolationException.class)
    public ProblemDetail handleConstraintViolation(ConstraintViolationException ex) {
        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        pd.setTitle("Validation failed");
        // Collect messages — no user-supplied data echoed back
        String detail = ex.getConstraintViolations().stream()
            .map(cv -> cv.getPropertyPath() + ": " + cv.getMessage())
            .reduce((a, b) -> a + "; " + b)
            .orElse("Invalid request parameter");
        pd.setDetail(detail);
        return pd;
    }
}
