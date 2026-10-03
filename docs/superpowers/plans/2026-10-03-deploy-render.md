# Deploy no Render + Neon — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** publicar o R-Fleet com custo zero: API no Render (web service Docker, plano Free), banco no Neon (plano Free) e frontend como site estático no Render. É a mesma arquitetura do ticket-flow.

**Architecture:**
- Os bytes dos anexos saem do disco e vão para o PostgreSQL, numa tabela própria (`anexos_conteudo`, coluna `bytea`). Motivo: o disco do Render Free é apagado a cada deploy e a cada vez que o serviço volta de uma pausa.
- A API ganha um `Dockerfile` em três estágios, com CDS (Class Data Sharing) e flags de JVM para 512 MB e 0,1 CPU. É o mesmo que no ticket-flow já levou a subida de ~190 s para ~60 s.
- A infraestrutura fica num Render Blueprint (`render.yaml`), validado contra o JSON Schema oficial do Render.
- O site estático encaminha `/api/*` para a API com um rewrite. Assim o frontend continua chamando `/api`, como hoje com o proxy do Vite, e não muda nenhuma linha de código.
- Segredos e URLs nunca entram no repositório: são digitados no painel do Render.

**Tech Stack:** Java 21, Spring Boot 3.3.4 (Spring Data JPA, `JdbcTemplate`, Flyway), JUnit 5 + MockMvc, PostgreSQL 16 (local) e 17 (Neon); React 18 + Vite; Docker; Render (Blueprint, web service Docker e static site); Neon; GitHub Actions.

**Spec:** não há spec separada. As decisões vêm da conversa de 2026-10-03 e do plano de deploy do ticket-flow (`../ticket-flow/docs/plans/2026-09-29-ticket-flow-deploy.md`), que já validou Render + Neon no plano grátis. Spec geral do produto: `docs/SPEC-DESIGN.md`.

## Antes de começar

O `V3__dados_demonstracao.sql` tem uma alteração não commitada: um `/` solto depois de `('DEM8H08', 'NISSAN KICKS ADVANCE', 1),`. Isso quebra o SQL e muda o checksum de uma migration que já rodou, e com isso todos os testes `@SpringBootTest` falham. A alteração é guardada com `git stash push -- backend/src/main/resources/db/migration/V3__dados_demonstracao.sql`, sem ser descartada, e o Roberto decide depois o que fazer com ela.

## Condições dos planos grátis (do plano do ticket-flow, 2026-09-29)

- **Render Free (web service):** dorme depois de 15 minutos sem tráfego e leva cerca de 1 minuto para voltar.
  - 750 horas por mês **por workspace**. O ticket-flow já usa parte desse total; com os dois dormindo quando ninguém usa, sobra folga.
  - Sem disco persistente. O Render define `PORT=10000`.
- **Render static site:** grátis e não dorme.
- **Neon Free:** 0,5 GB por projeto e 100 CU-horas por mês. Suspende depois de 5 minutos sem uso e não pede cartão.
  - Com anexos de até 8 MB no banco, cabem algumas dezenas de anexos antes de chegar perto do limite. Para uma demo, é suficiente.
- **Região:** API e banco em **Virginia (AWS us-east-1)**, perto um do outro.

## Global Constraints

- **Custo zero.** Nada que peça cartão de crédito.
- **Nunca editar migrations já aplicadas (V1–V5).** Mudança de esquema só em migration nova: `V6__anexos_no_banco.sql`.
- Limite de upload continua **8 MB**. Acima disso, HTTP **413** com `O arquivo excede o tamanho máximo permitido de 8 MB.`
- Variáveis da API:
  - `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`;
  - `JWT_SECRET` (Base64, ≥ 32 bytes);
  - `RFLEET_GESTOR_NOME`, `RFLEET_GESTOR_EMAIL`, `RFLEET_GESTOR_SENHA` (senha ≥ 10 caracteres);
  - `CORS_ALLOWED_ORIGINS`;
  - `PORT`, que o Render define.
- **Segredos nunca versionados.** No Blueprint, `sync: false` para tudo que é segredo ou URL, e `generateValue: true` para o `JWT_SECRET`.
- A API roda como usuário sem root, com a heap limitada a 75% da memória.
- Interface, mensagens, comentários e README em português do Brasil.
- Commits em Conventional Commits, em português sem acentos, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Branch: `feat/deploy-render`. Push e PR só com autorização do Roberto.
- Execução nativa: o Claude implementa nesta sessão, com um commit pequeno por task e uma revisão só no fim, antes do merge (Task 4).
- Na Task 5, o Roberto cria as contas e digita os segredos no painel. O Claude nunca cria contas nem digita senhas; só confere com `curl` e no navegador.

## Review Focus

1. **Arquivo binário com qualquer byte** (PDF, imagem, bytes `0x00`–`0xFF`): o download deve devolver exatamente os mesmos bytes do upload. Teste `deveGuardarOConteudoNoBancoEBaixarOsMesmosBytes` (Task 1).
2. **Anexo sem conteúdo no banco** (gravado em disco antes desta mudança): o download deve responder 404 com mensagem clara, e não 500. Teste `deveResponder404QuandoOAnexoNaoTemConteudo` (Task 1).
3. **Origem colada com barra no final no painel do Render** (`https://rfleet-web.onrender.com/`) ou com espaço depois da vírgula: o CORS deve funcionar igual. Teste `CorsOrigensTest` (Task 3).
4. **Primeiro acesso depois de 15 minutos parado, passando pelo rewrite do site estático:** a requisição precisa esperar a API acordar (~1 min) e não falhar com timeout do proxy. Verificação manual na Task 5, Step 7, com plano B descrito lá.
5. **Banco do Neon suspenso:** a primeira consulta depois de 5 minutos parado deve funcionar, só um pouco mais lenta. Verificação na Task 5, Step 7.

## Mapa de arquivos

**Task 1: anexos no banco**
- Criar `backend/src/main/resources/db/migration/V6__anexos_no_banco.sql`.
- Criar `backend/src/main/java/com/rfleet/repository/AnexoConteudoRepository.java`.
- Modificar:
  - `backend/src/main/java/com/rfleet/domain/AnexoOs.java` (remove `caminhoStorage`);
  - `backend/src/main/java/com/rfleet/service/AnexoService.java`;
  - `backend/src/main/java/com/rfleet/web/AnexoController.java`;
  - `backend/src/main/resources/application.yml` (remove `app.storage`);
  - `backend/src/test/java/com/rfleet/web/AnexoControllerTest.java`.

**Task 2: imagem Docker**
- Criar `backend/Dockerfile` e `backend/.dockerignore`.
- Modificar `backend/src/main/resources/application.yml` (pool do Hikari).

**Task 3: Blueprint e CORS**
- Criar `render.yaml` e `backend/src/test/java/com/rfleet/config/CorsOrigensTest.java`.
- Modificar `backend/src/main/java/com/rfleet/config/SecurityConfig.java` e `README.md` (seção de deploy).

**Task 4:** revisão final e PR.

**Task 5:** deploy, feito pelo Roberto com verificação do Claude. Pode tocar `render.yaml` (URL real da API) e `README.md` (link da demo).

---

### Task 1: Anexos no PostgreSQL

**Objetivo:** upload, download e exclusão de anexos funcionam sem tocar no disco. Os bytes ficam em `anexos_conteudo`, fora da entidade, então listar anexos nunca carrega os arquivos.

**Conceitos (para explicar em entrevista):**
- Por que o disco do container é efêmero (12-factor: processos descartáveis e sem estado).
- `bytea` em tabela separada: a listagem continua leve, e a exclusão vem em cascata pelo `ON DELETE CASCADE`.
- `JdbcTemplate` dentro da mesma transação JPA: o `JpaTransactionManager` expõe a mesma conexão JDBC. Com `IDENTITY`, o `save` faz o `INSERT` na hora, então a FK já existe quando o conteúdo é gravado.
- Por que o teste chama `entityManager.flush()` antes de conferir com SQL puro: o Hibernate adia o `DELETE` até o flush, e o `JdbcTemplate` não dispara flush.

**Files:**
- Create: `backend/src/main/resources/db/migration/V6__anexos_no_banco.sql`
- Create: `backend/src/main/java/com/rfleet/repository/AnexoConteudoRepository.java`
- Modify: `backend/src/main/java/com/rfleet/domain/AnexoOs.java`
- Modify: `backend/src/main/java/com/rfleet/service/AnexoService.java`
- Modify: `backend/src/main/java/com/rfleet/web/AnexoController.java`
- Modify: `backend/src/main/resources/application.yml`
- Test: `backend/src/test/java/com/rfleet/web/AnexoControllerTest.java`

**Interfaces:**
- Produces:
  - `AnexoConteudoRepository.salvar(Long anexoId, byte[] dados): void`
  - `AnexoConteudoRepository.buscar(Long anexoId): Optional<byte[]>`
  - `AnexoService.carregarConteudo(AnexoOs anexo): Resource` (substitui `carregarArquivoComoRecurso`)

- [ ] **Step 1: Escrever os testes que falham**

Em `AnexoControllerTest`, injetar `JdbcTemplate` e `EntityManager` e acrescentar os testes abaixo. O upload passa a ser feito por um método auxiliar reaproveitado por eles:

```java
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PersistenceContext
    private EntityManager entityManager;

    private Long enviarAnexo(MockMultipartFile arquivo) throws Exception {
        MvcResult result = mockMvc.perform(multipart("/api/ordens-servico/" + ordemServicoId + "/anexos")
                        .file(arquivo)
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private int linhasDeConteudo(Long anexoId) {
        return jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM anexos_conteudo WHERE anexo_id = ?", Integer.class, anexoId);
    }

    @Test
    @DisplayName("Guarda o conteúdo no banco e o download devolve exatamente os mesmos bytes")
    void deveGuardarOConteudoNoBancoEBaixarOsMesmosBytes() throws Exception {
        byte[] todosOsBytes = new byte[256];
        for (int i = 0; i < todosOsBytes.length; i++) {
            todosOsBytes[i] = (byte) i;
        }

        Long anexoId = enviarAnexo(new MockMultipartFile("arquivo", "foto.jpg", "image/jpeg", todosOsBytes));

        org.assertj.core.api.Assertions.assertThat(linhasDeConteudo(anexoId)).isEqualTo(1);

        mockMvc.perform(get("/api/anexos/" + anexoId + "/download")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/jpeg"))
                .andExpect(content().bytes(todosOsBytes));
    }

    @Test
    @DisplayName("Excluir o anexo remove também o conteúdo do banco")
    void deveExcluirOConteudoJuntoComOAnexo() throws Exception {
        Long anexoId = enviarAnexo(new MockMultipartFile("arquivo", "nota.pdf", "application/pdf", new byte[]{1, 2, 3}));

        mockMvc.perform(delete("/api/anexos/" + anexoId).header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isNoContent());
        entityManager.flush();

        org.assertj.core.api.Assertions.assertThat(linhasDeConteudo(anexoId)).isZero();
    }

    @Test
    @DisplayName("Anexo sem conteúdo no banco (gravado em disco antes da V6) responde 404")
    void deveResponder404QuandoOAnexoNaoTemConteudo() throws Exception {
        Long anexoId = jdbcTemplate.queryForObject(
                "INSERT INTO anexos_os (ordem_servico_id, nome_arquivo, tipo_conteudo, tamanho_bytes) "
                        + "VALUES (?, 'antigo.pdf', 'application/pdf', 10) RETURNING id",
                Long.class, ordemServicoId);

        mockMvc.perform(get("/api/anexos/" + anexoId + "/download")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.mensagem").value("Conteúdo do anexo não encontrado: antigo.pdf"));
    }

    @Test
    @DisplayName("Download mantém o nome com acento no Content-Disposition")
    void deveManterNomeComAcentoNoDownload() throws Exception {
        Long anexoId = enviarAnexo(new MockMultipartFile("arquivo", "orçamento.pdf", "application/pdf", new byte[]{9}));

        mockMvc.perform(get("/api/anexos/" + anexoId + "/download")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.containsString("filename*=UTF-8''or%C3%A7amento.pdf")));
    }
```

Imports novos: `jakarta.persistence.EntityManager`, `jakarta.persistence.PersistenceContext`, `org.springframework.jdbc.core.JdbcTemplate`. Use os `Assertions`/`Matchers` com import normal, e não com o nome qualificado, se o arquivo ficar mais legível.

No teste `deveAceitarAnexoNoLimite`, troque o comentário `// Remove o arquivo gravado em disco` e a exclusão que vem depois dele por uma checagem de que o conteúdo foi gravado: `assertThat(linhasDeConteudo(anexoId)).isEqualTo(1);`, usando `enviarAnexo`.

- [ ] **Step 2: Rodar e ver falhar**

Run (Git Bash, a partir de `backend/`, com o Postgres do `docker compose` no ar):
`./mvnw -q test -Dtest=AnexoControllerTest`
Expected: FAIL. `deveGuardar...`, `deveExcluir...` e `deveAceitar...` falham com `relation "anexos_conteudo" does not exist`. `deveResponder404...` falha com violação de NOT NULL em `caminho_storage`. `deveManterNomeComAcento...` já passa (caracterização) e continua como proteção.

- [ ] **Step 3: Migration V6**

`backend/src/main/resources/db/migration/V6__anexos_no_banco.sql`:

```sql
-- Os bytes dos anexos passam a ficar no PostgreSQL: o disco do servidor no plano grátis do Render
-- é apagado a cada deploy e a cada vez que o serviço volta de uma pausa.
-- Tabela separada para que listar anexos nunca carregue os arquivos.
CREATE TABLE anexos_conteudo (
    anexo_id BIGINT PRIMARY KEY REFERENCES anexos_os(id) ON DELETE CASCADE,
    dados    BYTEA  NOT NULL
);

-- Anexos gravados em disco antes desta versão ficam sem conteúdo: o download responde 404.
ALTER TABLE anexos_os DROP COLUMN caminho_storage;
```

- [ ] **Step 4: Repositório do conteúdo**

`backend/src/main/java/com/rfleet/repository/AnexoConteudoRepository.java`:

```java
package com.rfleet.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Bytes dos anexos na tabela anexos_conteudo (bytea), fora da entidade AnexoOs:
 * listar anexos nunca carrega os arquivos. A exclusão vem em cascata da tabela anexos_os.
 */
@Repository
public class AnexoConteudoRepository {

    private final JdbcTemplate jdbcTemplate;

    public AnexoConteudoRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void salvar(Long anexoId, byte[] dados) {
        jdbcTemplate.update("INSERT INTO anexos_conteudo (anexo_id, dados) VALUES (?, ?)", anexoId, dados);
    }

    public Optional<byte[]> buscar(Long anexoId) {
        return jdbcTemplate.query("SELECT dados FROM anexos_conteudo WHERE anexo_id = ?",
                        (rs, linha) -> rs.getBytes("dados"), anexoId)
                .stream()
                .findFirst();
    }
}
```

- [ ] **Step 5: Entidade, service, controller e configuração**

`AnexoOs.java`: remover o campo `caminhoStorage` e sua anotação `@Column(name = "caminho_storage", ...)`.

`AnexoService.java`:
- Remover o parâmetro `uploadDir`, o campo `uploadPath`, o `Files.createDirectories` do construtor e os imports de `java.nio.file.*`, `UrlResource` e `MalformedURLException`.
- Injetar `AnexoConteudoRepository anexoConteudoRepository` no construtor.
- Em `salvarAnexo`, trocar a geração de `nomeArmazenado`, o `Files.copy` e o `.caminhoStorage(...)` por:

```java
        byte[] dados;
        try {
            dados = arquivo.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao ler o arquivo enviado", e);
        }

        AnexoOs anexo = AnexoOs.builder()
                .ordemServico(os)
                .nomeArquivo(nomeOriginal)
                .tipoConteudo(arquivo.getContentType() != null ? arquivo.getContentType() : "application/octet-stream")
                .tamanhoBytes((long) dados.length)
                .usuario(usuario)
                .build();

        anexo = anexoOsRepository.save(anexo);
        anexoConteudoRepository.salvar(anexo.getId(), dados);
        return AnexoOsDTO.fromEntity(anexo);
```

- Trocar `carregarArquivoComoRecurso` por:

```java
    @Transactional(readOnly = true)
    public Resource carregarConteudo(AnexoOs anexo) {
        byte[] dados = anexoConteudoRepository.buscar(anexo.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Conteúdo do anexo não encontrado: " + anexo.getNomeArquivo()));
        return new ByteArrayResource(dados);
    }
```

- Em `excluirAnexo`, remover o bloco `try { Files.deleteIfExists(...) }` e deixar só a busca e o `anexoOsRepository.delete(anexo);`, com o comentário `// O conteúdo sai junto (ON DELETE CASCADE em anexos_conteudo)`.

`AnexoController.downloadAnexo`: chamar `anexoService.carregarConteudo(anexo)` e acrescentar `.contentLength(recurso.contentLength())` antes do `.body(recurso)`. O método passa a declarar `throws IOException`, porque `Resource.contentLength()` declara.

`application.yml`: remover o bloco `app.storage` (`upload-dir: ${STORAGE_UPLOAD_DIR:./uploads}`).

- [ ] **Step 6: Rodar os testes de anexo**

Run: `./mvnw -q test -Dtest=AnexoControllerTest`
Expected: PASS (7 testes).

- [ ] **Step 7: Rodar a suíte inteira**

Run: `./mvnw -q test`
Expected: BUILD SUCCESS, 0 falhas. Conferir com `grep -rn "caminhoStorage\|upload-dir\|uploadPath" src` que nada mais referencia o disco.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/resources/db/migration/V6__anexos_no_banco.sql \
        backend/src/main/java/com/rfleet/repository/AnexoConteudoRepository.java \
        backend/src/main/java/com/rfleet/domain/AnexoOs.java \
        backend/src/main/java/com/rfleet/service/AnexoService.java \
        backend/src/main/java/com/rfleet/web/AnexoController.java \
        backend/src/main/resources/application.yml \
        backend/src/test/java/com/rfleet/web/AnexoControllerTest.java
git commit -m "feat(backend): guardar o conteudo dos anexos no PostgreSQL em vez do disco"
```

---

### Task 2: Imagem Docker para o plano grátis

**Objetivo:** a API sobe numa imagem que cabe em 512 MB e 0,1 CPU, em cerca de um minuto, escutando em `PORT`. O pool de conexões deixa o Neon suspender enquanto a API dorme.

**Conceitos:**
- Build multi-stage: o JDK fica só no estágio de build e a imagem final leva só o JRE.
- CDS: uma execução de treino (`spring.context.exit=onRefresh`) grava as classes carregadas em `app.jsa`, e a subida real lê esse arquivo.
- O `JwtService` valida a chave no construtor, então o treino precisa de uma chave descartável, gerada na hora e que não vai para a imagem final.
- O `GestorInicial` é um `ApplicationRunner`: roda depois do refresh e não executa no treino.
- C1 × C2 (`TieredStopAtLevel=1`), Serial GC e `MaxRAMPercentage=75`.
- Hikari com `minimum-idle: 0`: sem conexões presas, o Neon consegue suspender.

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`
- Modify: `backend/src/main/resources/application.yml`

- [ ] **Step 1: Pool do Hikari**

Em `application.yml`, dentro de `spring.datasource`, depois de `driver-class-name`:

```yaml
    hikari:
      # Pool pequeno para o Neon grátis: conexões ociosas fecham em 30 s (minimum-idle 0),
      # e o banco pode suspender enquanto a API dorme em vez de ficar acordado pelo pool.
      maximum-pool-size: 5
      minimum-idle: 0
      idle-timeout: 30000
```

- [ ] **Step 2: `.dockerignore`**

`backend/.dockerignore`:

```
target/
uploads/
.env
```

- [ ] **Step 3: Dockerfile**

`backend/Dockerfile`:

```dockerfile
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
```

- [ ] **Step 4: Construir a imagem**

Run (a partir de `backend/`): `docker build -t rfleet-api-render .`
Expected: build conclui. Se o treino do CDS falhar porque algum bean precisa do banco, o erro aparece no `RUN` do estágio `cds`. Corrigir com propriedades `-D` desse mesmo `RUN`, nunca mudando o código.

- [ ] **Step 5: Rodar com os limites do plano grátis**

Run (a partir da raiz, com o `.env` local preenchido e o `rfleet-postgres` no ar):

```bash
docker run -d --rm --name rfleet-render-check --network r-fleet_default \
  --memory=512m --memory-swap=512m --cpus=0.1 \
  --env-file .env -e PORT=10000 \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://rfleet-postgres:5432/rfleet \
  -p 10000:10000 rfleet-api-render
docker logs -f rfleet-render-check   # esperar "Started RfleetApplication in X seconds"
```

Expected:
- `Started RfleetApplication in` por volta de 60 s, e não mais que ~120 s. Anotar o número para o README.
- Nenhum aviso de que o `app.jsa` foi recusado.
- Escuta na porta 10000.

- [ ] **Step 6: Conferir saúde, memória e anexo de ponta a ponta**

```bash
curl -s http://localhost:10000/api/health          # "status":"UP"
docker stats --no-stream rfleet-render-check        # memória bem abaixo de 512 MiB
docker exec rfleet-render-check id                  # uid de "app", não root
docker stop rfleet-render-check
```

Expected: `UP`, memória abaixo de ~300 MiB e usuário `app`.

- [ ] **Step 7: Rodar a suíte e fazer o commit**

Run: `./mvnw -q test` (a partir de `backend/`). Expected: BUILD SUCCESS.

```bash
git add backend/Dockerfile backend/.dockerignore backend/src/main/resources/application.yml
git commit -m "build(backend): imagem Docker com CDS para o plano gratis do Render e pool para o Neon"
```

---

### Task 3: Blueprint do Render e CORS tolerante

**Objetivo:** API e site descritos num `render.yaml` validado pelo schema oficial, com deploy só depois do CI verde. O CORS aceita a origem colada com barra no final e com espaços. O README explica o deploy.

**Conceitos:**
- Infraestrutura como código (Blueprint).
- `sync: false` para segredos e `generateValue` para a chave JWT.
- `autoDeployTrigger: checksPass`: deploy só depois do CI verde.
- Rewrite × redirect: no rewrite, o navegador continua vendo a URL do site.
- SPA fallback (`/*` → `/index.html`) para o F5 numa rota funcionar.
- CORS: a origem do navegador nunca termina em `/`, então `https://x.onrender.com/` digitado no painel nunca bateria.

**Files:**
- Create: `render.yaml`
- Create: `backend/src/test/java/com/rfleet/config/CorsOrigensTest.java`
- Modify: `backend/src/main/java/com/rfleet/config/SecurityConfig.java`
- Modify: `README.md`

- [ ] **Step 1: Teste que falha (CORS com barra e espaços)**

`backend/src/test/java/com/rfleet/config/CorsOrigensTest.java`:

```java
package com.rfleet.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Origens digitadas à mão no painel do Render: barra no final e espaço depois da vírgula. */
@SpringBootTest(properties = "app.cors.allowed-origins=https://rfleet-web.onrender.com/ ,  http://localhost:5174")
@AutoConfigureMockMvc
class CorsOrigensTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Aceita a origem configurada com barra no final")
    void aceitaOrigemComBarraNoFinal() throws Exception {
        mockMvc.perform(options("/api/auth/login")
                        .header("Origin", "https://rfleet-web.onrender.com")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://rfleet-web.onrender.com"));
    }

    @Test
    @DisplayName("Aceita a origem que vem depois de espaços na lista")
    void aceitaOrigemDepoisDeEspacos() throws Exception {
        mockMvc.perform(options("/api/auth/login")
                        .header("Origin", "http://localhost:5174")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5174"));
    }
}
```

Run: `./mvnw -q test -Dtest=CorsOrigensTest`
Expected: `aceitaOrigemComBarraNoFinal` FAIL com 403 (origem com `/` não bate). `aceitaOrigemDepoisDeEspacos` pode já passar, porque o conversor do Spring apara espaços; fica como proteção.

- [ ] **Step 2: Normalizar as origens**

Em `SecurityConfig`, no construtor, trocar a atribuição de `origensPermitidas` por:

```java
        // Origens digitadas à mão (painel do Render): sem espaços e sem a barra final, que o navegador nunca envia.
        this.origensPermitidas = origensPermitidas.stream()
                .map(String::trim)
                .map(origem -> origem.replaceAll("/+$", ""))
                .filter(origem -> !origem.isEmpty())
                .toList();
```

Run: `./mvnw -q test -Dtest=CorsOrigensTest+SegurancaHttpTest`
Expected: PASS.

- [ ] **Step 3: `render.yaml`**

Na raiz:

```yaml
# Render Blueprint: o deploy inteiro descrito como código (https://render.com/docs/blueprint-spec).
# Segredos e URLs marcados com "sync: false" são digitados no painel do Render, nunca versionados.
services:
  # API: Spring Boot em Docker. Plano Free: dorme depois de 15 min sem tráfego.
  - type: web
    name: rfleet-api
    runtime: docker
    plan: free
    region: virginia
    rootDir: backend
    dockerfilePath: ./Dockerfile
    dockerContext: .
    healthCheckPath: /api/health
    autoDeployTrigger: checksPass
    envVars:
      - key: JWT_SECRET
        generateValue: true
      - key: SPRING_DATASOURCE_URL
        sync: false
      - key: SPRING_DATASOURCE_USERNAME
        sync: false
      - key: SPRING_DATASOURCE_PASSWORD
        sync: false
      - key: RFLEET_GESTOR_NOME
        sync: false
      - key: RFLEET_GESTOR_EMAIL
        sync: false
      - key: RFLEET_GESTOR_SENHA
        sync: false
      - key: CORS_ALLOWED_ORIGINS
        sync: false

  # Frontend: arquivos estáticos gerados pelo Vite. Sites estáticos não dormem.
  - type: web
    name: rfleet-web
    runtime: static
    rootDir: frontend
    buildCommand: npm ci && npm run build
    staticPublishPath: dist
    autoDeployTrigger: checksPass
    envVars:
      - key: NODE_VERSION
        value: "22"
    routes:
      # O site encaminha /api/* para a API, como o proxy do Vite faz no desenvolvimento: o frontend
      # continua chamando /api. A URL real da API (com o sufixo que o Render sorteia) entra na Task 5.
      - type: rewrite
        source: /api/*
        destination: https://rfleet-api.onrender.com/api/*
      - type: rewrite
        source: /*
        destination: /index.html
    headers:
      - path: /assets/*
        name: Cache-Control
        value: public, max-age=31536000, immutable
```

- [ ] **Step 4: Validar contra o schema oficial**

```bash
curl -sfL https://render.com/schema/render.yaml.json -o "$TMPDIR/render-schema.json"
npx --yes ajv-cli@5 validate --spec=draft2020 -s "$TMPDIR/render-schema.json" -d render.yaml --strict=false
```

Expected: `render.yaml valid`. Os avisos `unknown format "uri" ignored` vêm do próprio schema e podem ser ignorados. Prova negativa: trocar temporariamente `checksPass` por `onGreen`, ver `render.yaml invalid` e desfazer.

- [ ] **Step 5: Conferir o formato do `generateValue`**

Abrir https://render.com/docs/blueprint-spec (seção `generateValue`) e confirmar que o valor gerado é Base64 com pelo menos 32 bytes, que é o que o `JwtService` exige. Se não for, trocar por `sync: false` e documentar no README a geração com `openssl rand -base64 64 | tr -d '\r\n'`.

- [ ] **Step 6: README, seção "Deploy (Render + Neon)"**

Acrescentar, depois de "Como Executar Localmente":
- arquitetura (site estático → rewrite `/api` → API Docker → Neon) e custo zero;
- os passos da Task 5, em forma resumida;
- a tabela de variáveis da API: nome, de onde vem e exemplo sem segredo, como `jdbc:postgresql://ep-xxx.us-east-1.aws.neon.tech/rfleet?sslmode=require`;
- trade-offs:
  - a API dorme e leva cerca de 1 minuto para acordar (anotar o tempo medido na Task 2);
  - anexos no banco ocupam a cota de 0,5 GB do Neon;
  - as 750 h do Render são divididas entre os serviços do workspace.

- [ ] **Step 7: Suíte e commit**

Run: `./mvnw -q test` (em `backend/`). Expected: BUILD SUCCESS.

```bash
git add render.yaml README.md backend/src/main/java/com/rfleet/config/SecurityConfig.java \
        backend/src/test/java/com/rfleet/config/CorsOrigensTest.java
git commit -m "feat(deploy): Blueprint do Render, CORS tolerante a barra final e guia de deploy"
```

---

### Task 4: Revisão final e PR

- [ ] **Step 1:** `./mvnw -q test` (em `backend/`) e `npm ci && npm run build` (em `frontend/`): tudo verde.
- [ ] **Step 2:** revisão de todo o diff da branch por um revisor novo (superpowers:requesting-code-review), com foco no Review Focus acima.
- [ ] **Step 3:** corrigir os achados confirmados, um commit por correção.
- [ ] **Step 4:** push e PR para `main` (com autorização), corpo em português terminando com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

---

### Task 5: Deploy (Roberto no navegador, Claude confere)

**Objetivo:** demo no ar, com o primeiro acesso funcionando mesmo com API e banco dormindo.

- [ ] **Step 1 (Roberto): banco no Neon.** Criar um projeto (ou um database novo no projeto existente) em **AWS us-east-1**, chamado `rfleet`. Copiar host, usuário e senha da connection string.
- [ ] **Step 2 (Roberto): merge do PR da Task 4.** O CI precisa ficar verde, porque o Blueprint só faz deploy com os checks passando (`checksPass`).
- [ ] **Step 3 (Roberto): criar o Blueprint.** Render → New → Blueprint → repositório `lmaciel0/R-Fleet`, branch `main` (depois do merge do PR). Preencher:
  - `SPRING_DATASOURCE_URL` = `jdbc:postgresql://<host-neon>/rfleet?sslmode=require`;
  - `SPRING_DATASOURCE_USERNAME` e `SPRING_DATASOURCE_PASSWORD`;
  - `RFLEET_GESTOR_NOME`, `RFLEET_GESTOR_EMAIL` e `RFLEET_GESTOR_SENHA` (≥ 10 caracteres);
  - `CORS_ALLOWED_ORIGINS` = URL do `rfleet-web`. Se ainda não for conhecida, preencher depois e redeployar a API.
- [ ] **Step 4 (Claude): ajustar a URL da API no rewrite.** Com a URL real do `rfleet-api` (o Render pode acrescentar um sufixo, como foi `-a15n` no ticket-flow), atualizar o `destination` do `render.yaml` e o README. Fazer commit (`fix(deploy): apontar o rewrite para a URL real da API`) e abrir PR.
- [ ] **Step 5 (Claude): conferir a API.** `curl -s https://<rfleet-api>/api/health` deve mostrar `"status":"UP"` e `"database":"CONNECTED"`. No log do Render, as migrations V1 a V6 devem aparecer aplicadas no Neon.
- [ ] **Step 6 (Claude, no navegador): conferir o site.**
  - Login com o gestor.
  - Kanban com os dados de demonstração da V3.
  - Upload de um PDF, download (mesmo arquivo) e exclusão.
  - F5 em uma rota interna, que deve devolver o app e não 404.
  - Exportação de planilha.
- [ ] **Step 7 (Claude): primeiro acesso a frio (Review Focus 4 e 5).** Depois de mais de 15 minutos sem tráfego:
  - abrir o site e fazer login, medindo quanto tempo o primeiro `/api/...` leva pelo rewrite;
  - esperado: cerca de 1 minuto, e a requisição completa.
  - **Plano B**, se o rewrite der timeout enquanto a API acorda:
    - o frontend passa a chamar a API diretamente por `VITE_API_URL`, com `API_BASE = (import.meta.env.VITE_API_URL ?? '') + '/api'`, e com o CORS da Task 3;
    - o rewrite `/api/*` sai do Blueprint;
    - e o plano ganha uma task com teste para isso.
- [ ] **Step 8 (Claude): README com o link da demo** e o tempo de primeiro acesso medido. Commit `docs: adicionar o link da demo e o tempo de primeiro acesso`.
