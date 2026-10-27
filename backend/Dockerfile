FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn package -DskipTests

FROM eclipse-temurin:17-jre
# curl só pro healthcheck do docker-compose
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --no-create-home financeflow
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
USER financeflow
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
