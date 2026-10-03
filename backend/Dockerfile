# Estágio 1: gera o jar com o Maven Wrapper (imagem com JDK).
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline
COPY src src
RUN ./mvnw -B -q package -DskipTests

# Estágio 2: CDS (Class Data Sharing). Uma execução de treino sobe o Spring uma vez, sem banco,
# e sai logo depois da inicialização; a JVM grava as classes carregadas em app.jsa. Ler esse
# arquivo na subida real reduz o tempo de ~190 s para ~60 s no plano grátis do Render (0,1 CPU).
FROM eclipse-temurin:21-jre AS cds
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
RUN java -Djarmode=tools -jar app.jar extract --destination application
WORKDIR /app/application
# Mesmas flags da imagem final, para o arquivo ser aceito na subida.
ENV JAVA_TOOL_OPTIONS="-XX:TieredStopAtLevel=1 -XX:+UseSerialGC -Xss512k"
# O JwtService recusa subir sem chave: o treino usa uma chave descartável, gerada aqui e que não
# vai para a imagem final. O GestorInicial (ApplicationRunner) não roda, porque o treino sai no refresh.
RUN JWT_SECRET="$(head -c 48 /dev/urandom | base64 -w0)" \
    java -XX:ArchiveClassesAtExit=app.jsa -Dspring.context.exit=onRefresh \
      -Dspring.flyway.enabled=false -Dspring.jpa.hibernate.ddl-auto=none \
      -Dspring.jpa.properties.hibernate.boot.allow_jdbc_metadata_access=false \
      -Dspring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect \
      -jar app.jar

# Estágio 3: roda numa imagem só com JRE, como usuário sem root.
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN groupadd --system app && useradd --system --gid app app
COPY --from=cds /app/application ./
USER app
EXPOSE 8081
# Ajustado para o plano grátis (512 MB, 0,1 CPU): só o compilador C1 (subida mais rápida),
# Serial GC (sem threads extras de GC), pilhas menores, heap até 75% da memória e o arquivo CDS.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:TieredStopAtLevel=1 -XX:+UseSerialGC -Xss512k -XX:SharedArchiveFile=app.jsa"
ENTRYPOINT ["java", "-jar", "app.jar"]
