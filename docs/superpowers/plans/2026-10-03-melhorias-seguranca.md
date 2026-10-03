# Melhorias de Segurança — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover do repositório e da interface toda credencial e todo segredo fixo (conta do gestor vinda de variáveis de ambiente, `JWT_SECRET` obrigatório, login sem pré-preenchimento), tirar o token JWT da URL, restringir o CORS e fechar os alertas restantes do SonarCloud.

**Architecture:**
- A senha vazada é invalidada por uma migration nova (V5), sem editar a V2.
- Na inicialização, um `ApplicationRunner` (`GestorInicial`) cria ou reativa o gestor a partir de `RFLEET_GESTOR_*`. Se ninguém consegue entrar, a aplicação não sobe.
- `JwtService` valida a chave no construtor.
- Os testes ganham um gestor próprio e aleatório (`GestorDeTeste`) e uma configuração só de teste.
- No frontend, as exportações e o download de anexos passam a usar `fetch` com o cabeçalho `Authorization`.

**Tech Stack:** Java 21, Spring Boot 3.3.4 (Spring Security 6, Flyway, JJWT), JUnit 5 + MockMvc, PostgreSQL 16; React 18 + TypeScript strict + Vite; GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-03-melhorias-seguranca-design.md`

## Global Constraints

- **Não editar** `backend/src/main/resources/db/migration/V2__dados_iniciais_padrao.sql`: o checksum do Flyway quebraria em bancos que já a aplicaram.
- Marcador da senha invalidada: `!SENHA-INVALIDADA`, na constante `Usuario.SENHA_INVALIDADA`.
- Id do usuário semeado pela V2: `a0000000-0000-0000-0000-000000000001`.
- Variáveis: `RFLEET_GESTOR_EMAIL`, `RFLEET_GESTOR_SENHA`, `RFLEET_GESTOR_NOME` (padrão `Gestor`), `JWT_SECRET`. Propriedades: `app.gestor.email`, `app.gestor.senha`, `app.gestor.nome` e `app.gestor.exigir-gestor-valido` (padrão `true`).
- Senha do gestor: mínimo **10** caracteres. Chave JWT: Base64 com no mínimo **32 bytes** decodificados.
- Mensagens de falha na inicialização, exatamente como abaixo:
  - `RFLEET_GESTOR_SENHA deve ter pelo menos 10 caracteres.`
  - `Defina RFLEET_GESTOR_EMAIL e RFLEET_GESTOR_SENHA juntos.`
  - `Nenhum gestor consegue entrar no sistema. Defina RFLEET_GESTOR_EMAIL e RFLEET_GESTOR_SENHA (veja .env.example).`
  - `JWT_SECRET ausente ou fraco: gere com "openssl rand -base64 64" (veja .env.example).`
- Senha nunca aparece em log.
- Limite de upload: **8 MB** por arquivo e por requisição. Acima disso, HTTP **413** com `O arquivo excede o tamanho máximo permitido de 8 MB.`
- O token JWT só é aceito no cabeçalho `Authorization: Bearer`.
- **Nenhuma senha, segredo ou e-mail real em código de teste.** Valores de teste são gerados em tempo de execução (UUID, `SecureRandom`, `${random.value}`).
- Interface e mensagens em português do Brasil. Commits em Conventional Commits, em português sem acentos, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Branch: `fix/melhorias-seguranca` (já existe e contém a spec).

## Review Focus

1. **E-mail com outra capitalização no `.env`** (ex.: `Rodrigo...@Gmail.com` para a conta `rodrigo...@gmail.com`): deve reativar a conta existente, e não tentar criar uma segunda. Teste na Task 3.
2. **Valores entre aspas no `.env`** (`RFLEET_GESTOR_SENHA="minha senha"`): o formato `.properties` mantém as aspas literalmente, e a senha gravada ficaria com aspas. Aspas duplas ou simples nas pontas de e-mail, senha e nome são removidas. Teste na Task 3.
3. **Sessão expirada durante um download:** o download deve se comportar como qualquer outra chamada, com logout e "Sessão expirada". Tratado na Task 6 com o tratamento de erro compartilhado e conferido manualmente.
4. **Anexo com acento no nome** (`orçamento.pdf`): o arquivo baixado deve manter o nome, lido de `filename*=UTF-8''…`. Task 6, conferência manual.
5. **Gate do SonarCloud no PR:** a exportação agora usa `fetch` com o `termo` digitado pelo usuário na query string, e pode reacender o S8476. Conferido na Task 7, com o passo de contingência descrito lá.

## Mapa de arquivos

**Backend (main)**
- Criar `config/GestorInicial.java`.
- Modificar:
  - `domain/Usuario.java` (constante);
  - `repository/UsuarioRepository.java` (consulta);
  - `security/JwtService.java` (construtor e validação);
  - `security/JwtAuthenticationFilter.java` (só cabeçalho);
  - `config/SecurityConfig.java` (CORS);
  - `service/AnexoService.java` (limite);
  - `web/RestExceptionHandler.java` (413);
  - `resources/application.yml`.
- Criar `resources/db/migration/V5__invalidar_senha_padrao.sql`.

**Backend (testes)**
- Criar:
  - `src/test/resources/config/application.yml`;
  - `src/test/java/com/rfleet/support/GestorDeTeste.java`;
  - `web/ContaPadraoInvalidadaTest.java`;
  - `config/GestorInicialTest.java`;
  - `security/JwtServiceTest.java`;
  - `web/SegurancaHttpTest.java`;
  - `web/RestExceptionHandlerTest.java`.
- Modificar: os 9 testes em `web/` (login), além de `AnexoControllerTest` (limite).

**Frontend**
- Modificar:
  - `components/LoginView.tsx`;
  - `services/api.ts`;
  - `components/TabelaOrdens.tsx`;
  - `components/HistoricoView.tsx`;
  - `components/ModalDetalhes.tsx`;
  - `App.tsx`.

**Raiz e docs**
- Criar `.env.example`.
- Modificar:
  - `.gitignore`;
  - `.github/workflows/ci.yml`;
  - `README.md`;
  - `docs/superpowers/plans/2026-10-03-historico-mensal-comissao.md`.

## Como rodar

- Banco local: `docker compose up -d` (container `rfleet-postgres`, porta 5433).
- Testes backend: `cd backend && ./mvnw test`. Uma classe: `./mvnw test -Dtest=Classe`.
- Build frontend: `cd frontend && npm run build`.
- Os testes rodam contra o PostgreSQL local, que tem os dados de demonstração. Cada teste é `@Transactional` e é desfeito ao final.

---

### Task 1: Testes sem credencial fixa

**Files:**
- Create: `backend/src/test/resources/config/application.yml`
- Create: `backend/src/test/java/com/rfleet/support/GestorDeTeste.java`
- Modify: `backend/src/test/java/com/rfleet/web/AuthControllerTest.java` (reescrita)
- Modify: os outros 8 testes em `backend/src/test/java/com/rfleet/web/` (bloco de login do `setUp`), mais `OrdemServicoControllerTest.java:95`

**Interfaces:**
- Produces:
  - `GestorDeTeste` (bean de teste): `String obterToken(MockMvc mockMvc) throws Exception`, `String getEmail()`, `String getSenha()` e `static final String NOME = "Gestor de Teste"`;
  - configuração de teste com `app.gestor.*` vazios e `app.gestor.exigir-gestor-valido: false`.

- [ ] **Step 1: Linha de base**

Run: `cd backend && ./mvnw -q test`
Expected: BUILD SUCCESS, 38 testes.

- [ ] **Step 2: Configuração só de teste**

`backend/src/test/resources/config/application.yml` (carregado junto com o principal, com precedência sobre ele):

```yaml
# Configuração exclusiva dos testes: nada de .env, variáveis do CI ou gestor do banco local.
app:
  jwt:
    # 3 × 32 caracteres hex aleatórios = 96 caracteres Base64 válidos → 72 bytes (gerado a cada execução)
    secret: ${random.value}${random.value}${random.value}
  gestor:
    email: ""
    senha: ""
    exigir-gestor-valido: false
```

- [ ] **Step 3: Helper `GestorDeTeste`**

```java
package com.rfleet.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rfleet.domain.Usuario;
import com.rfleet.dto.LoginRequest;
import com.rfleet.dto.LoginResponse;
import com.rfleet.repository.UsuarioRepository;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Cria um gestor com e-mail e senha aleatórios dentro da transação do teste (desfeita ao final)
 * e faz o login real por /api/auth/login. Nenhuma credencial fixa no código de teste.
 */
@Component
public class GestorDeTeste {

    public static final String NOME = "Gestor de Teste";

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    private String email;
    private String senha;

    public GestorDeTeste(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder, ObjectMapper objectMapper) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.objectMapper = objectMapper;
    }

    /** Deve ser chamado dentro de um teste @Transactional. */
    public String obterToken(MockMvc mockMvc) throws Exception {
        this.email = "gestor.teste." + UUID.randomUUID() + "@rfleet.local";
        this.senha = UUID.randomUUID().toString();

        usuarioRepository.saveAndFlush(Usuario.builder()
                .nome(NOME)
                .email(email)
                .senhaHash(passwordEncoder.encode(senha))
                .ativo(true)
                .build());

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(LoginRequest.builder()
                                .email(email)
                                .senha(senha)
                                .build())))
                .andExpect(status().isOk())
                .andReturn();

        return objectMapper.readValue(result.getResponse().getContentAsString(), LoginResponse.class).getToken();
    }

    public String getEmail() {
        return email;
    }

    public String getSenha() {
        return senha;
    }
}
```

- [ ] **Step 4: Reescrever `AuthControllerTest`**

```java
package com.rfleet.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rfleet.dto.LoginRequest;
import com.rfleet.support.GestorDeTeste;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private GestorDeTeste gestorDeTeste;

    @Test
    @DisplayName("Deve autenticar com sucesso o gestor usando email e senha corretos")
    void deveAutenticarComSucessoComCredenciaisCorretas() throws Exception {
        gestorDeTeste.obterToken(mockMvc);

        LoginRequest request = LoginRequest.builder()
                .email(gestorDeTeste.getEmail())
                .senha(gestorDeTeste.getSenha())
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.tipo").value("Bearer"))
                .andExpect(jsonPath("$.usuario.email").value(gestorDeTeste.getEmail()))
                .andExpect(jsonPath("$.usuario.nome").value(GestorDeTeste.NOME))
                .andExpect(jsonPath("$.usuario.ativo").value(true));
    }

    @Test
    @DisplayName("Deve rejeitar login com senha incorreta retornando 401")
    void deveRejeitarLoginComSenhaIncorreta() throws Exception {
        gestorDeTeste.obterToken(mockMvc);

        LoginRequest request = LoginRequest.builder()
                .email(gestorDeTeste.getEmail())
                .senha("errada-" + UUID.randomUUID())
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.mensagem").value("E-mail ou senha inválidos."));
    }

    @Test
    @DisplayName("Deve rejeitar login com email não cadastrado retornando 401")
    void deveRejeitarLoginComUsuarioInexistente() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("desconhecido." + UUID.randomUUID() + "@oficina.com")
                .senha(UUID.randomUUID().toString())
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Deve rejeitar acesso ao /api/auth/me sem token JWT")
    void deveRejeitarAcessoSemToken() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Deve retornar dados do usuário autenticado no /api/auth/me com token válido")
    void deveRetornarDadosDoUsuarioAutenticadoComTokenValido() throws Exception {
        String token = gestorDeTeste.obterToken(mockMvc);

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(gestorDeTeste.getEmail()))
                .andExpect(jsonPath("$.nome").value(GestorDeTeste.NOME))
                .andExpect(jsonPath("$.ativo").value(true));
    }
}
```

- [ ] **Step 5: Trocar o login dos outros 8 testes**

Os 8 arquivos têm o mesmo bloco no `setUp`, de `LoginRequest loginRequest = LoginRequest.builder()` até `this.tokenJwt = loginResponse.getToken();`. Aplique este script na raiz do repositório. Ele falha se algum arquivo não tiver exatamente um bloco:

```python
import re, pathlib
base = pathlib.Path('backend/src/test/java/com/rfleet/web')
arquivos = ['AnexoControllerTest', 'DashboardControllerTest', 'EntreguesOperacaoControllerTest',
            'HistoricoControllerTest', 'ImportExportControllerTest', 'OrdemServicoControllerTest',
            'OrigemControllerTest', 'VeiculoControllerTest']
bloco = re.compile(r'        LoginRequest loginRequest = LoginRequest\.builder\(\).*?this\.tokenJwt = loginResponse\.getToken\(\);', re.S)
for nome in arquivos:
    p = base / f'{nome}.java'
    s = p.read_text(encoding='utf-8')
    s, n = bloco.subn('        this.tokenJwt = gestorDeTeste.obterToken(mockMvc);', s)
    assert n == 1, (nome, n)
    assert s.count('    private ObjectMapper objectMapper;\n') == 1, nome
    s = s.replace('    private ObjectMapper objectMapper;\n',
                  '    private ObjectMapper objectMapper;\n\n    @Autowired\n    private GestorDeTeste gestorDeTeste;\n', 1)
    s = s.replace('import com.rfleet.dto.LoginRequest;\n', '')
    s = s.replace('import com.rfleet.dto.LoginResponse;\n', 'import com.rfleet.support.GestorDeTeste;\n')
    if 'import com.rfleet.support.GestorDeTeste;' not in s:
        s = s.replace('package com.rfleet.web;\n', 'package com.rfleet.web;\n\nimport com.rfleet.support.GestorDeTeste;\n', 1)
    p.write_text(s, encoding='utf-8', newline='')
    print('ok', nome)
```

Depois, em `OrdemServicoControllerTest.java`, troque
`.andExpect(jsonPath("$[0].usuarioEmail").value("rodrigoaffalcao@gmail.com"));` por
`.andExpect(jsonPath("$[0].usuarioEmail").value(gestorDeTeste.getEmail()));`.

Confira que não sobrou nada:

Run: `grep -rn "rodrigoaffalcao\|rfleet99" backend/src/test`
Expected: nenhuma linha.

- [ ] **Step 6: Suíte**

Run: `cd backend && ./mvnw -q test`
Expected: BUILD SUCCESS, 38 testes.

- [ ] **Step 7: Commit**

```bash
git add backend/src/test
git commit -m "test(backend): usar gestor de teste aleatorio em vez da credencial real" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Invalidar a senha vazada (V5)

**Files:**
- Create: `backend/src/main/resources/db/migration/V5__invalidar_senha_padrao.sql`
- Create: `backend/src/test/java/com/rfleet/web/ContaPadraoInvalidadaTest.java`
- Modify: `backend/src/main/java/com/rfleet/domain/Usuario.java`

**Interfaces:**
- Produces: `Usuario.SENHA_INVALIDADA` (`public static final String`, valor `"!SENHA-INVALIDADA"`).

- [ ] **Step 1: Adicionar a constante**

Em `Usuario`, logo depois da declaração da classe (`public class Usuario {`):

```java
    /** Marcador de senha revogada: não é um hash BCrypt, então nenhuma senha confere com ele. */
    public static final String SENHA_INVALIDADA = "!SENHA-INVALIDADA";
```

- [ ] **Step 2: Escrever o teste que falha**

```java
package com.rfleet.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rfleet.domain.Usuario;
import com.rfleet.dto.LoginRequest;
import com.rfleet.repository.UsuarioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ContaPadraoInvalidadaTest {

    private static final UUID ID_GESTOR_PADRAO = UUID.fromString("a0000000-0000-0000-0000-000000000001");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private void loginDeveFalhar(String email, String senha) throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(LoginRequest.builder()
                                .email(email)
                                .senha(senha)
                                .build())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("A senha do gestor semeado pela V2 (pública no repositório) está revogada")
    void senhaDoGestorPadraoEstaInvalidada() throws Exception {
        Usuario padrao = usuarioRepository.findById(ID_GESTOR_PADRAO).orElseThrow();

        assertThat(padrao.getSenhaHash()).isEqualTo(Usuario.SENHA_INVALIDADA);

        loginDeveFalhar(padrao.getEmail(), "qualquer-" + UUID.randomUUID());
        // O próprio marcador também não funciona como senha
        loginDeveFalhar(padrao.getEmail(), Usuario.SENHA_INVALIDADA);
    }
}
```

- [ ] **Step 3: Confirmar que falha**

Run: `cd backend && ./mvnw -q test -Dtest=ContaPadraoInvalidadaTest`
Expected: FAIL. `senhaHash` ainda é o hash BCrypt da V2 (`expected: "!SENHA-INVALIDADA" but was: "$2a$10$…"`).

- [ ] **Step 4: Criar a V5**

```sql
-- =========================================================================
-- V5: Revoga a senha do gestor semeado pela V2 (hash público no repositório).
-- O registro é mantido (histórico e anexos apontam para ele); a nova senha é
-- definida pelas variáveis RFLEET_GESTOR_* na inicialização (GestorInicial).
-- =========================================================================

UPDATE usuarios
   SET senha_hash = '!SENHA-INVALIDADA',
       atualizado_em = CURRENT_TIMESTAMP
 WHERE id = 'a0000000-0000-0000-0000-000000000001';
```

- [ ] **Step 5: Rodar o teste e a suíte**

Run: `cd backend && ./mvnw -q test -Dtest=ContaPadraoInvalidadaTest`
Expected: PASS.

Run: `cd backend && ./mvnw -q test`
Expected: BUILD SUCCESS, 39 testes. Os outros testes não dependem mais dessa conta, por causa da Task 1.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/rfleet/domain/Usuario.java backend/src/main/resources/db/migration/V5__invalidar_senha_padrao.sql backend/src/test/java/com/rfleet/web/ContaPadraoInvalidadaTest.java
git commit -m "fix(backend): revogar a senha do gestor padrao exposta no repositorio" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Gestor configurado por variáveis de ambiente

**Files:**
- Create: `backend/src/main/java/com/rfleet/config/GestorInicial.java`
- Create: `backend/src/test/java/com/rfleet/config/GestorInicialTest.java`
- Modify: `backend/src/main/java/com/rfleet/repository/UsuarioRepository.java`
- Modify: `backend/src/main/resources/application.yml`

**Interfaces:**
- Consumes: `Usuario.SENHA_INVALIDADA` (Task 2); configuração de teste com `app.gestor.*` vazio (Task 1).
- Produces:
  - `UsuarioRepository.existsByAtivoTrueAndSenhaHashNot(String senhaHash)` → `boolean`;
  - `GestorInicial(UsuarioRepository, PasswordEncoder, String email, String senha, String nome, boolean exigirGestorValido)`, com o método público `void configurar()`, também chamado pelo `run(...)`.

- [ ] **Step 1: Escrever os testes que falham**

```java
package com.rfleet.config;

import com.rfleet.domain.Usuario;
import com.rfleet.repository.UsuarioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class GestorInicialTest {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private GestorInicial gestorInicial(String email, String senha, boolean exigir) {
        return new GestorInicial(usuarioRepository, passwordEncoder, email, senha, "Gestor da Oficina", exigir);
    }

    private static String emailAleatorio() {
        return "gestor." + UUID.randomUUID() + "@rfleet.local";
    }

    private static String senhaAleatoria() {
        return "Senha-" + UUID.randomUUID();
    }

    private Usuario salvar(String email, String senhaHash, boolean ativo) {
        return usuarioRepository.saveAndFlush(Usuario.builder()
                .nome("Existente")
                .email(email)
                .senhaHash(senhaHash)
                .ativo(ativo)
                .build());
    }

    @Test
    @DisplayName("Cria o gestor quando o e-mail ainda não existe")
    void criaGestorNovo() {
        String email = emailAleatorio();
        String senha = senhaAleatoria();

        gestorInicial(email, senha, true).configurar();

        Usuario criado = usuarioRepository.findByEmailIgnoreCase(email).orElseThrow();
        assertThat(criado.getAtivo()).isTrue();
        assertThat(criado.getNome()).isEqualTo("Gestor da Oficina");
        assertThat(passwordEncoder.matches(senha, criado.getSenhaHash())).isTrue();
    }

    @Test
    @DisplayName("Define a senha de uma conta revogada e a reativa, mesmo com o e-mail em outra capitalização")
    void redefineContaInvalidada() {
        String email = emailAleatorio();
        salvar(email, Usuario.SENHA_INVALIDADA, false);
        String senha = senhaAleatoria();

        gestorInicial(email.toUpperCase(), senha, true).configurar();

        assertThat(usuarioRepository.findAll().stream().filter(u -> u.getEmail().equalsIgnoreCase(email))).hasSize(1);
        Usuario conta = usuarioRepository.findByEmailIgnoreCase(email).orElseThrow();
        assertThat(conta.getAtivo()).isTrue();
        assertThat(passwordEncoder.matches(senha, conta.getSenhaHash())).isTrue();
    }

    @Test
    @DisplayName("Não sobrescreve a senha de um gestor que já tem senha válida")
    void mantemSenhaValida() {
        String email = emailAleatorio();
        String senhaAtual = senhaAleatoria();
        salvar(email, passwordEncoder.encode(senhaAtual), true);

        gestorInicial(email, senhaAleatoria(), true).configurar();

        Usuario conta = usuarioRepository.findByEmailIgnoreCase(email).orElseThrow();
        assertThat(passwordEncoder.matches(senhaAtual, conta.getSenhaHash())).isTrue();
    }

    @Test
    @DisplayName("Remove aspas nas pontas dos valores vindos do .env")
    void removeAspasDosValores() {
        String email = emailAleatorio();
        String senha = senhaAleatoria();

        gestorInicial("\"" + email + "\"", "'" + senha + "'", true).configurar();

        Usuario criado = usuarioRepository.findByEmailIgnoreCase(email).orElseThrow();
        assertThat(passwordEncoder.matches(senha, criado.getSenhaHash())).isTrue();
    }

    @Test
    @DisplayName("Rejeita senha com menos de 10 caracteres")
    void rejeitaSenhaCurta() {
        assertThatThrownBy(() -> gestorInicial(emailAleatorio(), "123456789", true).configurar())
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("RFLEET_GESTOR_SENHA deve ter pelo menos 10 caracteres.");
    }

    @Test
    @DisplayName("Exige e-mail e senha juntos")
    void exigeEmailESenhaJuntos() {
        assertThatThrownBy(() -> gestorInicial(emailAleatorio(), "", true).configurar())
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Defina RFLEET_GESTOR_EMAIL e RFLEET_GESTOR_SENHA juntos.");
    }

    @Test
    @DisplayName("Não sobe quando nenhum gestor consegue entrar e as variáveis faltam")
    void falhaSemGestorValido() {
        usuarioRepository.findAll().forEach(u -> u.setSenhaHash(Usuario.SENHA_INVALIDADA));
        usuarioRepository.flush();

        assertThatThrownBy(() -> gestorInicial("", "", true).configurar())
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Nenhum gestor consegue entrar no sistema. Defina RFLEET_GESTOR_EMAIL e RFLEET_GESTOR_SENHA (veja .env.example).");
    }

    @Test
    @DisplayName("Sobe normalmente sem variáveis quando já existe gestor válido")
    void sobeComGestorValidoExistente() {
        salvar(emailAleatorio(), passwordEncoder.encode(senhaAleatoria()), true);

        assertThatCode(() -> gestorInicial("", "", true).configurar()).doesNotThrowAnyException();
    }
}
```

- [ ] **Step 2: Confirmar que falha**

Run: `cd backend && ./mvnw -q test -Dtest=GestorInicialTest`
Expected: FAIL na compilação dos testes (`cannot find symbol: class GestorInicial`).

- [ ] **Step 3: Consulta no repositório**

Em `UsuarioRepository`, adicione:

```java
    boolean existsByAtivoTrueAndSenhaHashNot(String senhaHash);
```

- [ ] **Step 4: Implementar `GestorInicial`**

```java
package com.rfleet.config;

import com.rfleet.domain.Usuario;
import com.rfleet.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Configura a conta do gestor a partir de RFLEET_GESTOR_EMAIL / RFLEET_GESTOR_SENHA / RFLEET_GESTOR_NOME
 * e impede a aplicação de subir se nenhum gestor conseguir entrar. Nenhuma senha fica no código.
 */
@Component
public class GestorInicial implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(GestorInicial.class);
    private static final int TAMANHO_MINIMO_SENHA = 10;

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String senha;
    private final String nome;
    private final boolean exigirGestorValido;

    public GestorInicial(
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.gestor.email:}") String email,
            @Value("${app.gestor.senha:}") String senha,
            @Value("${app.gestor.nome:Gestor}") String nome,
            @Value("${app.gestor.exigir-gestor-valido:true}") boolean exigirGestorValido
    ) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.email = normalizar(email);
        this.senha = normalizar(senha);
        this.nome = normalizar(nome).isEmpty() ? "Gestor" : normalizar(nome);
        this.exigirGestorValido = exigirGestorValido;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        configurar();
    }

    @Transactional
    public void configurar() {
        boolean temEmail = !email.isEmpty();
        boolean temSenha = !senha.isEmpty();

        if (temEmail != temSenha) {
            throw new IllegalStateException("Defina RFLEET_GESTOR_EMAIL e RFLEET_GESTOR_SENHA juntos.");
        }

        if (temEmail) {
            if (senha.length() < TAMANHO_MINIMO_SENHA) {
                throw new IllegalStateException("RFLEET_GESTOR_SENHA deve ter pelo menos 10 caracteres.");
            }
            aplicarGestor();
        }

        if (exigirGestorValido && !usuarioRepository.existsByAtivoTrueAndSenhaHashNot(Usuario.SENHA_INVALIDADA)) {
            throw new IllegalStateException(
                    "Nenhum gestor consegue entrar no sistema. Defina RFLEET_GESTOR_EMAIL e RFLEET_GESTOR_SENHA (veja .env.example).");
        }
    }

    private void aplicarGestor() {
        Optional<Usuario> existente = usuarioRepository.findByEmailIgnoreCase(email);

        if (existente.isEmpty()) {
            usuarioRepository.save(Usuario.builder()
                    .nome(nome)
                    .email(email)
                    .senhaHash(passwordEncoder.encode(senha))
                    .ativo(true)
                    .build());
            log.info("Gestor {} criado.", email);
            return;
        }

        Usuario usuario = existente.get();
        if (Usuario.SENHA_INVALIDADA.equals(usuario.getSenhaHash())) {
            usuario.setSenhaHash(passwordEncoder.encode(senha));
            usuario.setAtivo(true);
            usuarioRepository.save(usuario);
            log.info("Senha do gestor {} definida.", usuario.getEmail());
        } else {
            log.info("Gestor {} já configurado; senha mantida.", usuario.getEmail());
        }
    }

    /** Remove espaços e aspas nas pontas (valores copiados para o .env costumam vir entre aspas). */
    private static String normalizar(String valor) {
        if (valor == null) {
            return "";
        }
        String v = valor.trim();
        if (v.length() >= 2 && (v.startsWith("\"") && v.endsWith("\"") || v.startsWith("'") && v.endsWith("'"))) {
            v = v.substring(1, v.length() - 1).trim();
        }
        return v;
    }
}
```

(`Usuario` já tem `@Getter`/`@Setter` do Lombok; `setSenhaHash`/`setAtivo` existem.)

- [ ] **Step 5: Propriedades no `application.yml`**

Dentro do bloco `app:`, logo depois de `cors:` e seu `allowed-origins`, adicione:

```yaml
  gestor:
    email: ${RFLEET_GESTOR_EMAIL:}
    senha: ${RFLEET_GESTOR_SENHA:}
    nome: ${RFLEET_GESTOR_NOME:Gestor}
    exigir-gestor-valido: true
```

- [ ] **Step 6: Rodar os testes e a suíte**

Run: `cd backend && ./mvnw -q test -Dtest=GestorInicialTest`
Expected: PASS (8 testes).

Run: `cd backend && ./mvnw -q test`
Expected: BUILD SUCCESS, 47 testes. O contexto de teste sobe porque `exigir-gestor-valido` é `false` na configuração de teste.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/rfleet/config/GestorInicial.java backend/src/main/java/com/rfleet/repository/UsuarioRepository.java backend/src/main/resources/application.yml backend/src/test/java/com/rfleet/config/GestorInicialTest.java
git commit -m "feat(backend): configurar a conta do gestor por variaveis de ambiente" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `JWT_SECRET` obrigatório e arquivo `.env`

**Files:**
- Create: `backend/src/test/java/com/rfleet/security/JwtServiceTest.java`
- Create: `.env.example`
- Modify: `backend/src/main/java/com/rfleet/security/JwtService.java`
- Modify: `backend/src/main/resources/application.yml`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `JwtService(String secretKey, long jwtExpirationMs)`, que lança `IllegalStateException` com chave ausente ou fraca. Os métodos públicos não mudam.

- [ ] **Step 1: Escrever os testes que falham**

```java
package com.rfleet.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String MENSAGEM = "JWT_SECRET ausente ou fraco: gere com \"openssl rand -base64 64\" (veja .env.example).";

    private static String chaveAleatoria(int bytes) {
        byte[] chave = new byte[bytes];
        new SecureRandom().nextBytes(chave);
        return Base64.getEncoder().encodeToString(chave);
    }

    @Test
    @DisplayName("Recusa chave ausente")
    void recusaChaveAusente() {
        assertThatThrownBy(() -> new JwtService("", 3_600_000))
                .isInstanceOf(IllegalStateException.class).hasMessage(MENSAGEM);
    }

    @Test
    @DisplayName("Recusa chave que não é Base64")
    void recusaChaveInvalida() {
        assertThatThrownBy(() -> new JwtService("isto não é base64 !!!", 3_600_000))
                .isInstanceOf(IllegalStateException.class).hasMessage(MENSAGEM);
    }

    @Test
    @DisplayName("Recusa chave com menos de 256 bits")
    void recusaChaveCurta() {
        assertThatThrownBy(() -> new JwtService(chaveAleatoria(16), 3_600_000))
                .isInstanceOf(IllegalStateException.class).hasMessage(MENSAGEM);
    }

    @Test
    @DisplayName("Aceita chave forte e emite token válido")
    void aceitaChaveForte() {
        JwtService jwtService = new JwtService(chaveAleatoria(64), 3_600_000);

        String token = jwtService.generateToken("gestor@rfleet.local", Map.of());

        assertThat(jwtService.extractUsername(token)).isEqualTo("gestor@rfleet.local");
    }
}
```

- [ ] **Step 2: Confirmar que falha**

Run: `cd backend && ./mvnw -q test -Dtest=JwtServiceTest`
Expected: FAIL na compilação (`constructor JwtService in class JwtService cannot be applied to given types`).

- [ ] **Step 3: Validar a chave no construtor**

Em `JwtService`, troque os dois campos com `@Value` e o método `getSignInKey()`:

```java
    private static final int TAMANHO_MINIMO_CHAVE_BYTES = 32;

    private final SecretKey chaveAssinatura;
    private final long jwtExpirationMs;

    public JwtService(
            @Value("${app.jwt.secret:}") String secretKey,
            @Value("${app.jwt.expiration-ms}") long jwtExpirationMs
    ) {
        this.chaveAssinatura = criarChave(secretKey);
        this.jwtExpirationMs = jwtExpirationMs;
    }

    private static SecretKey criarChave(String secretKey) {
        byte[] bytes;
        try {
            bytes = secretKey == null || secretKey.isBlank() ? new byte[0] : Decoders.BASE64.decode(secretKey.trim());
        } catch (RuntimeException e) {
            bytes = new byte[0];
        }
        if (bytes.length < TAMANHO_MINIMO_CHAVE_BYTES) {
            throw new IllegalStateException("JWT_SECRET ausente ou fraco: gere com \"openssl rand -base64 64\" (veja .env.example).");
        }
        return Keys.hmacShaKeyFor(bytes);
    }

    private SecretKey getSignInKey() {
        return chaveAssinatura;
    }
```

- [ ] **Step 4: `application.yml`**

1. Troque `secret: ${JWT_SECRET:404E…5970}` por `secret: ${JWT_SECRET:}`.
2. Dentro do bloco `spring:`, logo depois de `application:` / `name: rfleet-backend`, adicione:

```yaml
  config:
    # Lê o .env da raiz (rodando a partir de backend/) ou da pasta atual, se existir
    import: optional:file:../.env[.properties],optional:file:.env[.properties]
```

- [ ] **Step 5: `.gitignore` e `.env.example`**

No fim do `.gitignore`:

```gitignore

# Segredos locais (o modelo versionado é o .env.example)
.env
.env.*
!.env.example
```

`.env.example` na raiz:

```properties
# =============================================================================
# R-Fleet — configuração local. Copie para ".env" (que NÃO vai para o git):
#   cp .env.example .env
# Escreva os valores SEM aspas.
# =============================================================================

# Chave de assinatura dos tokens de login (Base64, mínimo 32 bytes). Gere com:
#   openssl rand -base64 64
# (sem openssl: node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")
JWT_SECRET=

# Conta do gestor. Na primeira inicialização a conta é criada; se o e-mail já
# existir com a senha revogada (conta antiga), a senha nova é cadastrada.
# Depois disso, mudar a senha aqui NÃO altera uma senha que já funciona.
RFLEET_GESTOR_NOME=
RFLEET_GESTOR_EMAIL=
# Mínimo de 10 caracteres
RFLEET_GESTOR_SENHA=

# Banco local (docker compose). Os valores abaixo já são o padrão de desenvolvimento.
# POSTGRES_DB=rfleet
# POSTGRES_USER=rfleet
# POSTGRES_PASSWORD=rfleet123
# POSTGRES_PORT=5433
```

- [ ] **Step 6: Rodar os testes e a suíte**

Run: `cd backend && ./mvnw -q test -Dtest=JwtServiceTest`
Expected: PASS (4 testes).

Run: `cd backend && ./mvnw -q test`
Expected: BUILD SUCCESS, 51 testes. A chave vem de `${random.value}` na configuração de teste, então o CI não precisa de `JWT_SECRET`.

Run: `git check-ignore -v .env && git check-ignore .env.example || echo "env.example versionado"`
Expected: a primeira linha mostra a regra do `.gitignore` para `.env`, e a segunda imprime `env.example versionado`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/rfleet/security/JwtService.java backend/src/main/resources/application.yml backend/src/test/java/com/rfleet/security/JwtServiceTest.java .gitignore .env.example
git commit -m "feat(backend): exigir JWT_SECRET forte e ler configuracao local do .env" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Token só no cabeçalho, CORS restrito e limite de upload

**Files:**
- Create: `backend/src/test/java/com/rfleet/web/SegurancaHttpTest.java`
- Create: `backend/src/test/java/com/rfleet/web/RestExceptionHandlerTest.java`
- Modify:
  - `backend/src/main/java/com/rfleet/security/JwtAuthenticationFilter.java`
  - `backend/src/main/java/com/rfleet/config/SecurityConfig.java`
  - `backend/src/main/java/com/rfleet/service/AnexoService.java`
  - `backend/src/main/java/com/rfleet/web/RestExceptionHandler.java`
  - `backend/src/main/resources/application.yml`
  - `backend/src/test/java/com/rfleet/web/AnexoControllerTest.java`

**Interfaces:**
- Consumes: `GestorDeTeste` (Task 1).
- Produces:
  - CORS que expõe `Content-Disposition` (a Task 6 lê o nome do arquivo dele);
  - `RestExceptionHandler(DataSize tamanhoMaximoUpload)`;
  - `AnexoService` com o parâmetro extra `DataSize tamanhoMaximoUpload` no construtor.

- [ ] **Step 1: Escrever os testes que falham**

`SegurancaHttpTest.java`:

```java
package com.rfleet.web;

import com.rfleet.support.GestorDeTeste;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SegurancaHttpTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private GestorDeTeste gestorDeTeste;

    @Test
    @DisplayName("Token na URL (?token=) não autentica; só o cabeçalho Authorization")
    void tokenSoPeloCabecalho() throws Exception {
        String token = gestorDeTeste.obterToken(mockMvc);

        mockMvc.perform(get("/api/auth/me").param("token", token))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("CORS recusa origem fora da lista configurada")
    void corsRecusaOrigemDesconhecida() throws Exception {
        mockMvc.perform(options("/api/auth/me")
                        .header("Origin", "http://evil.example")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    @DisplayName("CORS permite a origem configurada e expõe Content-Disposition")
    void corsPermiteOrigemConfigurada() throws Exception {
        mockMvc.perform(options("/api/auth/me")
                        .header("Origin", "http://localhost:5174")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5174"));

        String token = gestorDeTeste.obterToken(mockMvc);
        mockMvc.perform(get("/api/auth/me")
                        .header("Origin", "http://localhost:5174")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Expose-Headers", containsString("Content-Disposition")));
    }
}
```

`RestExceptionHandlerTest.java`:

```java
package com.rfleet.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RestExceptionHandlerTest {

    @Test
    @DisplayName("Upload acima do limite do servidor vira 413 com mensagem em português")
    void uploadAcimaDoLimiteDoServidor() {
        RestExceptionHandler handler = new RestExceptionHandler(DataSize.ofMegabytes(8));

        ResponseEntity<Map<String, Object>> resposta =
                handler.handleMaxUploadSize(new MaxUploadSizeExceededException(DataSize.ofMegabytes(8).toBytes()));

        assertThat(resposta.getStatusCode().value()).isEqualTo(413);
        assertThat(resposta.getBody()).containsEntry("mensagem", "O arquivo excede o tamanho máximo permitido de 8 MB.");
    }
}
```

Em `AnexoControllerTest`, adicione os testes abaixo, mais o import `import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;` se não houver (confira os imports estáticos existentes):

```java
    private static final int OITO_MB = 8 * 1024 * 1024;

    @Test
    @DisplayName("Rejeita anexo acima de 8 MB com 413")
    void deveRejeitarAnexoAcimaDoLimite() throws Exception {
        MockMultipartFile grande = new MockMultipartFile("arquivo", "grande.pdf", "application/pdf", new byte[OITO_MB + 1]);

        mockMvc.perform(multipart("/api/ordens-servico/" + ordemServicoId + "/anexos")
                        .file(grande)
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().is(413))
                .andExpect(jsonPath("$.mensagem").value("O arquivo excede o tamanho máximo permitido de 8 MB."));
    }

    @Test
    @DisplayName("Aceita anexo de exatamente 8 MB")
    void deveAceitarAnexoNoLimite() throws Exception {
        MockMultipartFile noLimite = new MockMultipartFile("arquivo", "limite.pdf", "application/pdf", new byte[OITO_MB]);

        MvcResult result = mockMvc.perform(multipart("/api/ordens-servico/" + ordemServicoId + "/anexos")
                        .file(noLimite)
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isCreated())
                .andReturn();

        // Remove o arquivo gravado em disco
        String anexoId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
        mockMvc.perform(delete("/api/anexos/" + anexoId).header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isNoContent());
    }
```

(Se o `DELETE /api/anexos/{id}` responder outro código de sucesso, confira o teste `deveGerenciarCicloDeVidaDeAnexos` e use o mesmo.)

- [ ] **Step 2: Confirmar que falham**

Run: `cd backend && ./mvnw -q test -Dtest='SegurancaHttpTest,RestExceptionHandlerTest,AnexoControllerTest'`
Expected: FAIL.
- `RestExceptionHandlerTest` não compila, porque o construtor e o `handleMaxUploadSize` ainda não existem.
- Comente-o temporariamente para ver os demais:
  - `tokenSoPeloCabecalho` recebe 200 em vez de 403;
  - `corsRecusaOrigemDesconhecida` recebe a origem permitida;
  - `deveRejeitarAnexoAcimaDoLimite` recebe 201.

Descomente antes do Step 3.

- [ ] **Step 3: Token só no cabeçalho**

Em `JwtAuthenticationFilter.doFilterInternal`, troque:

```java
        String jwt = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            jwt = authHeader.substring(7);
        } else if (request.getParameter("token") != null && !request.getParameter("token").isBlank()) {
            jwt = request.getParameter("token");
        }
```

por:

```java
        // O token só é aceito no cabeçalho: na URL ele ficaria no histórico do navegador e em logs
        String jwt = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            jwt = authHeader.substring(7);
        }
```

- [ ] **Step 4: CORS pela lista configurada**

Em `SecurityConfig`:
1. Acrescente o campo `private final List<String> origensPermitidas;`.
2. O construtor ganha o parâmetro `@Value("${app.cors.allowed-origins}") List<String> origensPermitidas`, atribuído ao campo. Importe `org.springframework.beans.factory.annotation.Value`.
3. Em `corsConfigurationSource()`, troque `config.setAllowedOriginPatterns(List.of("*"));` por:

```java
        config.setAllowedOrigins(origensPermitidas);
        // O frontend lê o nome do arquivo baixado deste cabeçalho
        config.setExposedHeaders(List.of("Content-Disposition"));
```

- [ ] **Step 5: Limite de upload**

`application.yml`: `max-file-size: 8MB` e `max-request-size: 8MB`.

`RestExceptionHandler`:

```java
    private final DataSize tamanhoMaximoUpload;

    public RestExceptionHandler(@Value("${spring.servlet.multipart.max-file-size}") DataSize tamanhoMaximoUpload) {
        this.tamanhoMaximoUpload = tamanhoMaximoUpload;
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        return buildResponse(HttpStatus.valueOf(413),
                "O arquivo excede o tamanho máximo permitido de " + tamanhoMaximoUpload.toMegabytes() + " MB.");
    }
```

Imports: `org.springframework.beans.factory.annotation.Value`, `org.springframework.util.unit.DataSize`, `org.springframework.web.multipart.MaxUploadSizeExceededException`.

`AnexoService`:
1. O construtor ganha `@Value("${spring.servlet.multipart.max-file-size}") DataSize tamanhoMaximoUpload`, guardado em `private final DataSize tamanhoMaximoUpload;`. Importe `org.springframework.util.unit.DataSize`.
2. Em `salvarAnexo`, logo depois da checagem de arquivo vazio:

```java
        if (arquivo.getSize() > tamanhoMaximoUpload.toBytes()) {
            throw new ResponseStatusException(HttpStatus.valueOf(413),
                    "O arquivo excede o tamanho máximo permitido de " + tamanhoMaximoUpload.toMegabytes() + " MB.");
        }
```

- [ ] **Step 6: Rodar os testes e a suíte**

Run: `cd backend && ./mvnw -q test -Dtest='SegurancaHttpTest,RestExceptionHandlerTest,AnexoControllerTest'`
Expected: PASS (3 + 1 + 3 testes).

Run: `cd backend && ./mvnw -q test`
Expected: BUILD SUCCESS, 57 testes.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/rfleet/security/JwtAuthenticationFilter.java backend/src/main/java/com/rfleet/config/SecurityConfig.java backend/src/main/java/com/rfleet/service/AnexoService.java backend/src/main/java/com/rfleet/web/RestExceptionHandler.java backend/src/main/resources/application.yml backend/src/test/java/com/rfleet/web/SegurancaHttpTest.java backend/src/test/java/com/rfleet/web/RestExceptionHandlerTest.java backend/src/test/java/com/rfleet/web/AnexoControllerTest.java
git commit -m "fix(backend): aceitar token so no cabecalho, restringir CORS e limitar upload a 8 MB" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Frontend — login vazio, downloads com cabeçalho e id dos avisos

**Files:**
- Modify:
  - `frontend/src/components/LoginView.tsx`
  - `frontend/src/services/api.ts`
  - `frontend/src/components/TabelaOrdens.tsx`
  - `frontend/src/components/HistoricoView.tsx`
  - `frontend/src/components/ModalDetalhes.tsx`
  - `frontend/src/App.tsx`

**Interfaces:**
- Consumes: o backend da Task 5 (sem `?token=`; `Content-Disposition` exposto).
- Produces:
  - `api.exportarOrdens(formato: 'xlsx' | 'csv', filtros?: Record<string, any>): Promise<void>`;
  - `api.baixarAnexo(id: number, nomeArquivo: string): Promise<void>`;
  - `TabelaOrdens` ganha a prop opcional `onErro?: (mensagem: string) => void`.
- Removidos: `api.exportarOrdensUrl` e `api.downloadAnexoUrl`.

- [ ] **Step 1: Login sem credenciais**

Em `LoginView.tsx`:
1. Troque `useState('rodrigoaffalcao@gmail.com')` por `useState('')` e `useState('rfleet99')` por `useState('')`.
2. No `<input type="email"`, adicione `autoComplete="username"`. No `<input type="password"`, adicione `autoComplete="current-password"`.
3. Apague o bloco inteiro, do comentário `{/* Dica de credenciais para facilitar teste */}` até o `</div>` que fecha o `<div className="mt-6 pt-5 border-t …">`.
4. Remova `ShieldCheck` do import do `lucide-react`; ele só era usado nesse bloco.

Run: `grep -n "rodrigoaffalcao\|rfleet99\|ShieldCheck" frontend/src/components/LoginView.tsx`
Expected: nenhuma linha.

- [ ] **Step 2: Tratamento de erro compartilhado e download em `api.ts`**

1. Extraia o tratamento de resposta com erro de `request` para uma função, sem mudar o comportamento:

```ts
/** Lança o erro de uma resposta não-OK (401 encerra a sessão), igual para JSON e downloads. */
async function lancarErroDaResposta(response: Response): Promise<never> {
  if (response.status === 401) {
    localStorage.removeItem('rfleet_token');
    localStorage.removeItem('rfleet_user');
    window.dispatchEvent(new Event('auth:unauthorized'));
    throw new ApiError('Sessão expirada. Faça login novamente.', 401);
  }

  let errorMsg = `Erro na requisição (${response.status})`;
  try {
    const errorData = await response.json();
    if (errorData.mensagem) {
      errorMsg = errorData.mensagem;
    } else if (errorData.errors && Array.isArray(errorData.errors)) {
      errorMsg = errorData.errors.map((e: any) => e.mensagem || e).join(', ');
    }
  } catch {
    // Ignora erro de parse de JSON
  }
  throw new ApiError(errorMsg, response.status);
}
```

Em `request`, substitua o trecho que vai de `if (response.status === 401) {` até o fim do bloco `if (!response.ok) { … }`, incluindo o `if (response.status === 204)` que fica entre os dois, por:

```ts
  if (response.status === 204) {
    return {} as T;
  }

  if (!response.ok) {
    await lancarErroDaResposta(response);
  }
```

O 401 não é `ok`, então continua caindo em `lancarErroDaResposta`, que faz o logout. O `return response.json();` final fica como está.

2. Logo depois de `request`, adicione:

```ts
/** Nome do arquivo do Content-Disposition (filename* em UTF-8 tem prioridade). */
function nomeDoArquivo(contentDisposition: string | null, nomePadrao: string): string {
  if (!contentDisposition) return nomePadrao;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1].trim());
    } catch {
      // segue para o filename simples
    }
  }
  const simples = /filename="([^"]+)"/i.exec(contentDisposition);
  return simples ? simples[1] : nomePadrao;
}

/** Baixa um arquivo autenticado pelo cabeçalho (o token nunca vai na URL). */
async function baixarArquivo(endpoint: string, nomePadrao: string): Promise<void> {
  const token = getToken();
  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, { headers });
  if (!response.ok) {
    await lancarErroDaResposta(response);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeDoArquivo(response.headers.get('Content-Disposition'), nomePadrao);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
```

3. Troque `downloadAnexoUrl(id: number): string { … }` inteiro por:

```ts
  async baixarAnexo(id: number, nomeArquivo: string): Promise<void> {
    return baixarArquivo(`/anexos/${idNaUrl(id)}/download`, nomeArquivo);
  },
```

4. Troque `exportarOrdensUrl(…): string { … }` inteiro por:

```ts
  async exportarOrdens(formato: 'xlsx' | 'csv', filtros: Record<string, any> = {}): Promise<void> {
    const params = new URLSearchParams();
    params.set('formato', formato);
    Object.entries(filtros).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        if (Array.isArray(val)) {
          val.forEach((item) => params.append(key, item));
        } else {
          params.append(key, String(val));
        }
      }
    });
    return baixarArquivo(`/exportacao/ordens-servico?${params.toString()}`, `rfleet_ordens.${formato}`);
  },
```

- [ ] **Step 3: Confirmar que o build quebra nos chamadores antigos**

Run: `cd frontend && npm run build`
Expected: FAIL com `Property 'exportarOrdensUrl' does not exist` (`TabelaOrdens`, `HistoricoView`) e `Property 'downloadAnexoUrl' does not exist` (`ModalDetalhes`).

- [ ] **Step 4: Atualizar os chamadores**

`TabelaOrdens.tsx`:
1. Na interface `TabelaOrdensProps`, adicione `onErro?: (mensagem: string) => void;` e desestruture `onErro` nas props do componente.
2. Em `handleExportar`, troque as duas últimas linhas (`const url = api.exportarOrdensUrl(formato, filtros);` e `window.open(url, '_blank');`) por:

```tsx
    api.exportarOrdens(formato, filtros).catch((err: any) => {
      onErro?.(err.message || 'Falha ao exportar.');
    });
```

`HistoricoView.tsx`, em `exportar`: troque as linhas que montam `const url = api.exportarOrdensUrl(formato, { … });` e o `window.open(url, '_blank');` por:

```tsx
    api
      .exportarOrdens(formato, {
        etapas: ['ENTREGUE'],
        dataSaidaInicio: inicio,
        dataSaidaFim: fim,
      })
      .catch((err: any) => onErro(err.message || 'Falha ao exportar.'));
```

`ModalDetalhes.tsx`:
1. Logo depois de `handleExcluirAnexo`, adicione:

```tsx
  const handleBaixarAnexo = async (anexoId: number, nomeArquivo: string) => {
    try {
      await api.baixarAnexo(anexoId, nomeArquivo);
    } catch (err: any) {
      setErro(err.message || 'Falha ao baixar o arquivo.');
    }
  };
```

2. Troque o `<a href={api.downloadAnexoUrl(anexo.id)} download target="_blank" rel="noreferrer" className="…" title="Baixar arquivo">…</a>` por um `<button>` com as mesmas classes e o mesmo conteúdo:

```tsx
                        <button
                          onClick={() => handleBaixarAnexo(anexo.id, anexo.nomeArquivo)}
                          className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Baixar arquivo"
                        >
                          <Download className="w-4 h-4" />
                        </button>
```

`App.tsx`:
1. Em `adicionarToast`, troque `const id = Math.random().toString(36).substring(2, 9);` por `const id = crypto.randomUUID();`.
2. No `<TabelaOrdens`, adicione `onErro={(mensagem) => adicionarToast(mensagem, 'erro')}`.

- [ ] **Step 5: Build e varredura**

Run: `cd frontend && npm run build`
Expected: sucesso, sem erros de tipo.

Run: `grep -rn "token=\|exportarOrdensUrl\|downloadAnexoUrl\|Math.random\|rodrigoaffalcao\|rfleet99" frontend/src`
Expected: nenhuma linha.

- [ ] **Step 6: Commit**

```bash
git add frontend/src
git commit -m "fix(frontend): login sem credenciais, downloads com token no cabecalho e ids seguros nos avisos" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: CI, documentação, verificação e PR

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-10-03-historico-mensal-comissao.md`

- [ ] **Step 1: CI com `npm ci --ignore-scripts`**

No job `frontend` do `ci.yml`:
- `cache-dependency-path: frontend/package.json` → `cache-dependency-path: frontend/package-lock.json`;
- `run: npm install` → `run: npm ci --ignore-scripts`.

Confirme localmente que o lockfile está em dia e que o build funciona sem scripts de instalação, numa cópia temporária. O `node_modules` atual não é tocado:

```bash
T=$(mktemp -d) && cp -r frontend/. "$T" && rm -rf "$T/node_modules" "$T/dist" && (cd "$T" && npm ci --ignore-scripts && npm run build) ; echo exit=$? ; rm -rf "$T"
```

Expected: `exit=0`. Se o `npm ci` reclamar de lockfile fora de sincronia, rode `npm install` em `frontend/` para atualizar o `package-lock.json` e inclua-o no commit.

- [ ] **Step 2: README**

1. Apague a seção `## 🔐 Acesso e Credenciais`, do título até o `---` seguinte, inclusive.
2. Logo antes de `## ⚙️ Como Executar Localmente`, insira:

```markdown
## 🔐 Configuração Inicial (obrigatória)

O repositório não traz senhas nem chaves. Antes de subir o backend:

1. Copie o modelo: `cp .env.example .env` (o `.env` não vai para o git).
2. Gere a chave dos tokens e cole em `JWT_SECRET`: `openssl rand -base64 64`
3. Preencha `RFLEET_GESTOR_NOME`, `RFLEET_GESTOR_EMAIL` e `RFLEET_GESTOR_SENHA` (mínimo 10 caracteres, sem aspas).

Na primeira inicialização o backend cria a conta do gestor com esses dados. Depois disso, a senha não é mais alterada pelo `.env`.

> **Atualizando um banco antigo:** a senha da conta padrão antiga foi revogada (migration V5). Defina as variáveis com o **mesmo e-mail** dessa conta para cadastrar a senha nova e manter o histórico ligado a ela.

Sem `JWT_SECRET` válido, ou sem nenhum gestor que consiga entrar, o backend não sobe e explica no log o que falta.

---
```

3. Em "Iniciar o Backend", troque o comentário `# Executar suíte de testes (37 testes unitários e de integração)` pela contagem final do Step 4. Na seção de testes, troque também `O backend conta com 37 testes` e adicione o item `- Segurança: senha padrão revogada, conta do gestor por variáveis de ambiente, chave JWT obrigatória, token só no cabeçalho, CORS restrito e limite de upload`.

- [ ] **Step 3: Plano antigo sem as credenciais**

```bash
sed -i "s/rodrigoaffalcao@gmail.com/gestor@exemplo.com/g; s/rfleet99/<senha-do-gestor>/g" docs/superpowers/plans/2026-10-03-historico-mensal-comissao.md
```

Run: `grep -rn "rodrigoaffalcao\|rfleet99" --exclude-dir=node_modules --exclude-dir=target --exclude-dir=.git . | grep -v "V2__dados_iniciais_padrao.sql"`
Expected: nenhuma linha. A V2 é a única exceção, e foi revogada pela V5.

- [ ] **Step 4: Suíte, build e commit**

Run: `cd backend && ./mvnw -q test` e depois `cat target/surefire-reports/*.txt | grep "Tests run"`
Expected: 0 falhas, 57 testes.

Run: `cd frontend && npm run build`
Expected: sucesso.

```bash
git add .github/workflows/ci.yml README.md docs/superpowers/plans/2026-10-03-historico-mensal-comissao.md
git commit -m "docs: documentar configuracao inicial segura e usar npm ci no CI" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Verificação da inicialização num banco separado**

Para não mexer no banco local do usuário, use um banco descartável no mesmo container:

```bash
docker exec rfleet-postgres psql -U rfleet -d rfleet -c "CREATE DATABASE rfleet_verificacao;"
```

Em `backend/`, com `DB_NAME=rfleet_verificacao` e `PORT=8092`, confira três inicializações:
1. **Sem `JWT_SECRET`:** o processo termina com `JWT_SECRET ausente ou fraco…` no log.
2. **Com `JWT_SECRET` válido, sem `RFLEET_GESTOR_*`:** termina com `Nenhum gestor consegue entrar no sistema…`.
3. **Com tudo definido** (e-mail e senha aleatórios gerados no shell, nunca escritos em arquivo): sobe e loga `Gestor … criado.`. O login por `curl` com essas credenciais devolve token, `GET /api/auth/me?token=…` devolve 403, e com o cabeçalho devolve 200.

Gere a chave com `openssl rand -base64 64 | tr -d '\n'`. Encerre o processo e apague o banco:

```bash
docker exec rfleet-postgres psql -U rfleet -d rfleet -c "DROP DATABASE rfleet_verificacao;"
```

- [ ] **Step 6: Push, PR e gate do SonarCloud**

```bash
git push -u origin fix/melhorias-seguranca
gh pr create --base main --head fix/melhorias-seguranca --title "fix: melhorias de seguranca (credenciais, JWT, CORS, token fora da URL, upload)" --body "<resumo: o que muda, testes, o que o usuario precisa fazer apos o merge (.env com senha nova; marcar S8215 como revisado); terminar com: 🤖 Generated with [Claude Code](https://claude.com/claude-code)>"
```

Espere os três checks: `Backend Test & Build`, `Frontend Typecheck & Build` e `SonarCloud Code Analysis`.

**Contingência (Review Focus 5):** se o SonarCloud reprovar com S8476 em `baixarArquivo`, vindo de `exportarOrdens`, valide os filtros antes de montar a query em `exportarOrdens`:
- `etapas` contra a lista de etapas conhecidas;
- ids com `Number.isSafeInteger`;
- booleanos;
- datas com `/^\d{4}-\d{2}-\d{2}$/`;
- `termo` limitado a 100 caracteres de letras, números, espaço e `-`.

Depois faça um novo commit e espere o gate de novo.

- [ ] **Step 7: Conferência do usuário e merge**

O usuário confere na própria instância, já com o `.env` dele:
- a tela de login vem vazia;
- o login funciona com o gestor do `.env`;
- a exportação Excel/CSV funciona na Tabela e no Histórico;
- o download de um anexo funciona, de preferência com acento no nome (Review Focus 4).

Com o "ok" dele: `gh pr merge --rebase --delete-branch`, `git switch main && git pull --ff-only && git fetch --prune`.
