#
# Stage 1: Build stage
#
FROM maven:3.8-openjdk-8 AS builder

WORKDIR /opt/shipping

COPY pom.xml ./
RUN mvn dependency:resolve

COPY src/ ./src/
RUN mvn package -DskipTests

#
# Stage 2: Runtime stage
#
FROM eclipse-temurin:8-jre-focal AS runtime

EXPOSE 8080

WORKDIR /opt/shipping

RUN useradd -u 10001 -m -s /bin/sh appuser

COPY --from=builder --chown=appuser:appuser /opt/shipping/target/shipping-1.0.jar shipping.jar

USER appuser

CMD [ "java", "-Xmn256m", "-Xmx768m", "-jar", "shipping.jar" ]


