# Melhorias de Segurança — Design

> **Status:** Aguardando revisão
> **Data:** 03/10/2026
> **Escopo:** backend (Spring Boot), frontend (React), CI, configuração e documentação do R-Fleet

## 1. Objetivo

Tirar do repositório e da interface toda credencial e todo segredo fixo, e fechar os alertas de segurança restantes do SonarCloud.

| # | Problema atual | Onde |
|---|---|---|
| 1 | Login já vem com e-mail e senha do gestor nos campos, e com o e-mail como dica | `frontend/src/components/LoginView.tsx` |
| 2 | Hash da senha real do gestor no repositório público; e-mail e senha em texto puro no README; os testes fazem login com essa senha | `V2__dados_iniciais_padrao.sql`, `README.md`, 9 testes |
| 3 | `JWT_SECRET` com valor padrão fixo: quem lê o repositório forja tokens válidos de qualquer instância que suba sem a variável | `application.yml` |
| 4 | CORS aceita qualquer origem (`*`) com credenciais e ignora `app.cors.allowed-origins` | `SecurityConfig.java` |
| 5 | Token JWT na URL (`?token=`) das exportações e do download de anexos, que fica no histórico do navegador e em logs | `JwtAuthenticationFilter.java`, `api.ts` |
| 6 | `.env` não está no `.gitignore` | `.gitignore` |
| 7 | Alertas do SonarCloud: limite de upload de 20/25 MB (S5693), `npm install` sem `--ignore-scripts` nem versões travadas (S6505/S8543), `Math.random()` (S2245), hash na V2 (S8215) | `application.yml`, `ci.yml`, `App.tsx`, V2 |

### Decisões já tomadas com o usuário

- **Não se sabe se existe banco fora da máquina local.** Por isso a V2 **não é editada**, porque o Flyway rejeitaria a mudança num banco que já a aplicou. A senha vazada é **invalidada** por uma migration nova, o que funciona em qualquer banco. O hash continua no histórico do git, mas não serve mais para entrar.
- A conta do gestor passa a vir de **variáveis de ambiente**. Nenhuma senha fica no código.
- **Login com campos vazios**, sem dica de credenciais.

### Fora do escopo (próximos passos sugeridos)

- Limite de tentativas de login (proteção contra força bruta).
- Guardar o token em cookie `HttpOnly` em vez de `localStorage`.
- Fixar versões das GitHub Actions por SHA.
- Tela para o gestor trocar a própria senha.

## 2. Conta do gestor

### 2.1. Invalidação da senha vazada — migration V5

`V5__invalidar_senha_padrao.sql`:

```sql
UPDATE usuarios
   SET senha_hash = '!SENHA-INVALIDADA',
       atualizado_em = CURRENT_TIMESTAMP
 WHERE id = 'a0000000-0000-0000-0000-000000000001';
```

- O alvo é o usuário semeado pela V2, identificado pelo `id`. O hash vazado não é repetido no código, para não gerar um novo alerta.
- O registro não é apagado, porque `historico_etapas.usuario_id` e `anexos_os.usuario_id` apontam para ele.
- `!SENHA-INVALIDADA` não é um hash BCrypt válido, então `BCryptPasswordEncoder.matches` sempre devolve `false` para ele. O valor fica numa constante Java (`Usuario.SENHA_INVALIDADA`), usada pela inicialização (§2.2).

### 2.2. Criação do gestor na inicialização

Novo componente `GestorInicial`, um `ApplicationRunner` no pacote `config`, com propriedades:

| Propriedade | Variável de ambiente | Padrão |
|---|---|---|
| `app.gestor.email` | `RFLEET_GESTOR_EMAIL` | vazio |
| `app.gestor.senha` | `RFLEET_GESTOR_SENHA` | vazio |
| `app.gestor.nome` | `RFLEET_GESTOR_NOME` | `Gestor` |
| `app.gestor.exigir-gestor-valido` | — | `true` |

Regras, nesta ordem:

1. **E-mail e senha definidos:**
   - Senha com menos de **10** caracteres → falha na inicialização: `RFLEET_GESTOR_SENHA deve ter pelo menos 10 caracteres.`
   - E-mail **não existe** no banco (comparação sem diferenciar maiúsculas) → cria o usuário ativo com o hash BCrypt da senha. Log `INFO`: `Gestor <email> criado.`
   - E-mail existe e `senha_hash = SENHA_INVALIDADA` → grava o hash da senha nova e reativa a conta. Log `INFO`: `Senha do gestor <email> definida.`
   - E-mail existe com senha válida → não altera nada, para que a senha não seja sobrescrita a cada inicialização. Log `INFO`: `Gestor <email> já configurado; senha mantida.`
2. **Só um dos dois definido** → falha: `Defina RFLEET_GESTOR_EMAIL e RFLEET_GESTOR_SENHA juntos.`
3. Por fim, se `exigir-gestor-valido = true` e não existe nenhum usuário **ativo** com `senha_hash <> SENHA_INVALIDADA` → falha:
   `Nenhum gestor consegue entrar no sistema. Defina RFLEET_GESTOR_EMAIL e RFLEET_GESTOR_SENHA (veja .env.example).`

"Falha na inicialização" significa lançar `IllegalStateException` com a mensagem. O Spring Boot encerra a aplicação e mostra a mensagem no log.

A senha nunca aparece em log.

## 3. Configuração e segredos

### 3.1. `JWT_SECRET` obrigatório

- `application.yml`: `app.jwt.secret: ${JWT_SECRET:}`, sem valor padrão.
- `JwtService` valida a chave na inicialização (`@PostConstruct`). Se estiver vazia, não for Base64 válido ou decodificar em menos de **32 bytes** (256 bits, o mínimo do HMAC-SHA256), lança `IllegalStateException`:
  `JWT_SECRET ausente ou fraco: gere com "openssl rand -base64 64" (veja .env.example).`

### 3.2. Arquivo `.env`

- `application.yml` passa a importar, se existirem:
  `spring.config.import: optional:file:../.env[.properties],optional:file:.env[.properties]`
  O primeiro serve para rodar a partir de `backend/` (`./mvnw spring-boot:run`) e o segundo para rodar a partir da raiz.
- `.gitignore` ganha `.env` e `.env.*`, com exceção de `!.env.example`.
- Novo `.env.example` na raiz, comentado, com `JWT_SECRET`, `RFLEET_GESTOR_NOME`, `RFLEET_GESTOR_EMAIL` e `RFLEET_GESTOR_SENHA` (sem valores reais) e os comandos para gerar a chave. As variáveis do banco já usadas pelo `docker-compose.yml` aparecem comentadas, com os valores locais atuais como exemplo.
- As senhas padrão do banco **local** (`rfleet123` no `docker-compose.yml` e no `application.yml`) ficam como estão. Valem só para o container de desenvolvimento e podem ser sobrescritas por variável.

### 3.3. CORS

`SecurityConfig.corsConfigurationSource()` usa as origens de `app.cors.allowed-origins` (lista separada por vírgula, valor atual mantido) em `setAllowedOrigins`, em vez de `setAllowedOriginPatterns(List.of("*"))`. Métodos, cabeçalhos e credenciais continuam como estão.

### 3.4. Limite de upload

`spring.servlet.multipart.max-file-size: 8MB` e `max-request-size: 8MB` (hoje 20 MB e 25 MB). Um arquivo acima do limite recebe HTTP **413** com uma mensagem clara em português, em duas camadas:
- **Servidor:** a `MaxUploadSizeExceededException`, lançada pelo Tomcat antes de chegar ao controller, passa a ser tratada no `RestExceptionHandler`.
- **`AnexoService`:** confere `arquivo.getSize()` contra o mesmo `spring.servlet.multipart.max-file-size` (injetado como `DataSize`) e lança 413. Essa checagem também protege caminhos que não passam pelo limite do servidor, e é ela que os testes exercitam, já que o MockMvc não aplica os limites de multipart.

## 4. Token fora da URL

### 4.1. Backend

`JwtAuthenticationFilter` aceita o token **somente** pelo cabeçalho `Authorization: Bearer`. O parâmetro `token` deixa de ser lido.

### 4.2. Frontend

Novo método interno em `api.ts`:

```ts
async function baixarArquivo(endpoint: string, nomePadrao: string): Promise<void>
```

1. Faz `fetch` com o token no cabeçalho, com o mesmo tratamento de erro de `request` (401 → sessão expirada).
2. Lê o blob e o nome do arquivo do `Content-Disposition`: `filename*=UTF-8''…` tem prioridade sobre `filename="…"`, e na falta dos dois usa `nomePadrao`.
3. Cria uma URL temporária (`URL.createObjectURL`), dispara o download por um `<a download>` e libera a URL em seguida.

Substituições:

| Antes | Depois |
|---|---|
| `exportarOrdensUrl(formato, filtros): string` + `window.open` | `exportarOrdens(formato, filtros): Promise<void>` |
| `downloadAnexoUrl(id): string` em `<a href>` | `baixarAnexo(id, nomeArquivo): Promise<void>` num `<button>` |

Os chamadores (`TabelaOrdens`, `HistoricoView`, `ModalDetalhes`) mostram um toast de erro se o download falhar.

## 5. Tela de login

- `email` e `senha` começam vazios.
- O rodapé com "Gestor Único Configurado · rodrigoaffalcao@..." é removido.
- Os campos ganham `autoComplete="username"` e `autoComplete="current-password"`, para o navegador poder sugerir a senha salva.

## 6. Demais alertas do SonarCloud

- **CI (`ci.yml`, job do frontend):** `npm ci --ignore-scripts` no lugar de `npm install`, e `cache-dependency-path: frontend/package-lock.json`.
- **`App.tsx`:** o id dos toasts passa a ser `crypto.randomUUID()`.
- **V2 (S8215):** o código não muda (§1). Depois do merge, o usuário marca o alerta como **revisado** no SonarCloud, com a justificativa "senha revogada pela V5; o hash permanece só no histórico de migrations aplicadas". O README não traz essa instrução; ela vai na mensagem final ao usuário.

## 7. Documentação

- `README.md`:
  - remove a seção "Acesso e Credenciais";
  - adiciona **"Configuração inicial"**: copiar `.env.example` para `.env`, gerar `JWT_SECRET`, escolher e-mail e senha do gestor, e o que acontece na primeira inicialização;
  - adiciona o aviso de que, num banco que já tinha a conta antiga, basta definir as variáveis com o mesmo e-mail para cadastrar a senha nova.
- `docs/superpowers/plans/2026-10-03-historico-mensal-comissao.md`: o plano antigo cita e-mail e senha antigos em exemplos de teste e no passo de login manual. Esses trechos são trocados por referências às variáveis de ambiente.

## 8. Testes

### 8.1. Isolamento dos testes

- Novo `backend/src/test/resources/config/application.yml`, carregado **junto** com o principal e com precedência sobre ele:
  - `app.jwt.secret`: uma chave Base64 de 64 bytes **só de teste**;
  - `app.gestor.email: ""` e `app.gestor.senha: ""`;
  - `app.gestor.exigir-gestor-valido: false`.
  Assim os testes não dependem de `.env`, de variáveis do CI nem do gestor do banco local.
- Novo helper de teste `GestorDeTeste` (`@Component` em `src/test/java/com/rfleet/support/`):
  - cria um usuário com e-mail e senha **aleatórios** (UUID) dentro da transação do teste, que é desfeita ao fim;
  - faz o login por `POST /api/auth/login` e devolve o token.
  Os 9 testes trocam o login fixo por `gestorDeTeste.obterToken(mockMvc)`.

### 8.2. Testes novos (escritos antes da implementação)

| Teste | Comportamento |
|---|---|
| Senha antiga | Depois da V5, o `senha_hash` do usuário `a0000000-…-0001` é `SENHA_INVALIDADA`, e um login com o e-mail dele (lido do banco) e qualquer senha devolve 401. A senha antiga não aparece no código do teste. |
| `GestorInicial`: cria | Com e-mail novo e senha válida, cria um usuário ativo cujo hash confere com a senha. |
| `GestorInicial`: redefine | Usuário com `SENHA_INVALIDADA` recebe a senha nova e consegue entrar. |
| `GestorInicial`: mantém | Usuário com senha válida não tem a senha alterada. |
| `GestorInicial`: senha curta | Senha com 9 caracteres → `IllegalStateException`. |
| `GestorInicial`: variável faltando | Só o e-mail definido → `IllegalStateException`. |
| `GestorInicial`: nenhum gestor válido | Com a exigência ligada, sem variáveis e só usuários invalidados → `IllegalStateException`. |
| `JwtService` | Chave vazia, não-Base64 e de 16 bytes → `IllegalStateException`; chave de 64 bytes → ok. |
| Token na URL | `GET /api/auth/me?token=<token válido>` → 403. Com o cabeçalho → 200. |
| CORS | Pré-requisição (`OPTIONS`) de `http://evil.example` → sem `Access-Control-Allow-Origin`; de `http://localhost:5174` → permitida. |
| Upload acima do limite | Anexo de 8 MB + 1 byte → 413 com mensagem em português; anexo de exatamente 8 MB → aceito. |

Os testes do `GestorInicial` e do `JwtService` chamam os componentes diretamente (sem subir outro contexto Spring), usando o repositório e o `PasswordEncoder` do contexto de teste.

### 8.3. Frontend

Sem testes automatizados (o projeto não tem). Verificação: `npm run build` e conferência manual:
- login com campos vazios;
- login com o gestor do `.env`;
- exportar Excel/CSV na Tabela e no Histórico;
- baixar um anexo.

## 9. Entrega

- Branch `fix/melhorias-seguranca`, commits pequenos (Conventional Commits), PR para a `main`, CI e SonarCloud verdes, conferência manual do usuário e merge.
- Depois do merge, o usuário:
  1. cria o `.env` a partir do `.env.example`, com uma **senha nova**;
  2. sobe o backend (a V5 roda e a conta é configurada);
  3. marca o alerta S8215 como revisado no SonarCloud.
