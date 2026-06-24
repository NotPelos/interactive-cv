# syntax=docker/dockerfile:1

# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM eclipse-temurin:21.0.5_11-jdk-alpine AS build

WORKDIR /workspace

# Copy wrapper + pom first for layer caching
COPY .mvn/ .mvn/
COPY mvnw mvnw.cmd pom.xml ./

# Make wrapper executable and pre-fetch dependencies (offline-friendy layer)
RUN chmod +x mvnw && ./mvnw dependency:go-offline -q

# Copy source and build (skip tests here; CI runs them separately).
# Rename the jar to a version-agnostic name so the runtime COPY survives pom bumps.
COPY src/ src/
RUN ./mvnw package -DskipTests -q && mv target/*.jar target/app.jar

# ── Stage 2: runtime ────────────────────────────────────────────────────────
FROM eclipse-temurin:21.0.5_11-jre-alpine AS runtime

# Non-root user for principle of least privilege
RUN addgroup -S cvapp && adduser -S cvapp -G cvapp

WORKDIR /app

COPY --from=build /workspace/target/app.jar app.jar

# JVM tuned for Fly.io 512 MB container (see docs/DEPLOYMENT.md)
ENV JAVA_OPTS="-Xmx384m -XX:+UseG1GC -XX:MaxRAMPercentage=75 -Djava.security.egd=file:/dev/./urandom"

USER cvapp

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
