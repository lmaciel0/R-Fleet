# R-Fleet — Sistema de Gestão Operacional de Veículos e Oficina

> Sistema web responsivo, moderno e de alta performance para controle de entrada, fluxo de etapas (mecânica e funilaria), faturamento e saída de veículos, substituindo planilhas legadas com macros por uma experiência fluida, segura e auditável.

---

## 🚀 Visão Geral e Recursos

- **Quadro Kanban Dinâmico (7 Etapas):**
  - *Aguardando Orçamento* &rarr; *Orçamento* &rarr; *Aprovado* &rarr; *Em Serviço* &rarr; *Finalizado* &rarr; *Aguardando Retirada* &rarr; *Entregue*.
  - Arraste de cartões (*Drag and Drop*) ou botão de avanço rápido de etapa.
- **Histórico Mensal de Entregues:**
  - Na virada do mês, os veículos entregues nos meses anteriores saem do Kanban e da Tabela Operacional automaticamente (horário de Brasília).
  - A aba *Histórico* mostra uma tabela por mês (pela data de saída), com total de veículos e valor, e exporta o mês em `.xlsx` ou `.csv`.
- **Entrada Rápida de Veículos (< 30s):**
  - Validação estrita de placas brasileiras (padrão Mercosul `BRA2E19` e tradicional `ABC-1234`).
  - Busca automática com *debounce*: se o veículo já passou pela oficina, modelo e locadora/origem são preenchidos instantaneamente.
  - **Bloqueio de Duplicidade:** Constraint parcial única no banco (`idx_os_veiculo_ativo_unica`) e no backend que impede abertura de duas OS ativas para o mesmo carro.
- **Controle de SLA e Prazos:**
  - Contador de dias de permanência no pátio em tempo real.
  - Alerta visual no semáforo: **Verde** (Concluído), **Amarelo** (Em aberto no prazo), **Vermelho** (Em aberto há mais de 15 dias, limite configurável em `LIMITE_DIAS_ALERTA_PARADO`, com indicador pulsante no topo).
- **Linha do Tempo e Auditoria Imutável:**
  - Todo avanço de etapa, ajuste de orçamento e anotação é gravado de forma imutável com data/hora, usuário responsável e observações.
- **Gestão Financeira & Faturamento:**
  - Orçamento editável com justificativa auditada.
  - Controle de faturamento com flag (*Sim/Não*), data e número da Nota Fiscal (NF).
- **Importador da Planilha Legada:**
  - Suporte a upload de planilhas `.xlsx` e arquivos `.csv`.
  - Mapeamento estrito com a coluna **G** como Data de Entrada (`data_entrada`).
- **Exportação de Relatórios:**
  - Exportação instantânea dos dados filtrados para Excel `.xlsx` estilizado ou `.csv` com BOM UTF-8.
- **Dashboard Executivo:**
  - Indicadores em tempo real: veículos no pátio, taxa de atraso SLA, comissão mensal (2% sobre o faturado no mês, configurável em `COMISSAO_PERCENTUAL`), faturamento do mês e valor orçado em produção.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Backend** | Java 21, Spring Boot 3, Spring Data JPA, Spring Security, JWT (JJWT), Flyway, Apache POI |
| **Banco de Dados** | PostgreSQL (porta mapeada para `5433` para evitar conflitos locais) |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS v4, Lucide Icons |
| **Ambiente & Testes** | Docker Compose, JUnit 5, MockMvc, AssertJ |

---

## 🔐 Configuração Inicial (obrigatória)

O repositório não traz senhas nem chaves. Antes de subir o backend:

1. Copie o modelo: `cp .env.example .env` (o `.env` não vai para o git).
2. Gere a chave dos tokens e cole em `JWT_SECRET` (uma linha só): `openssl rand -base64 64 | tr -d '\r\n'`
3. Preencha `RFLEET_GESTOR_NOME`, `RFLEET_GESTOR_EMAIL` e `RFLEET_GESTOR_SENHA` (mínimo 10 caracteres, sem aspas).

Na primeira inicialização o backend cria a conta do gestor com esses dados. Depois disso, a senha não é mais alterada pelo `.env`.

Sem `JWT_SECRET` válido, ou sem nenhum gestor que consiga entrar, o backend não sobe e explica no log o que falta.

**Esqueceu a senha do gestor?** O `.env` não sobrescreve uma senha que já funciona. Em desenvolvimento, o jeito mais simples é recriar o banco local (`docker compose down -v` e `docker compose up -d`) e subir o backend com a senha nova.

---

## ⚙️ Como Executar Localmente

### 1. Pré-requisitos
- **Docker** e **Docker Compose**
- **Java 21 (JDK)**
- **Node.js 18+** e **npm**

### 2. Iniciar o Banco de Dados (PostgreSQL)
Na raiz do projeto:
```bash
docker compose up -d
```
> O container `rfleet-postgres` subirá na porta **5433** (`localhost:5433/rfleet`).

### 3. Iniciar o Backend (Spring Boot)
No diretório `backend/`:
```bash
# Executar suíte de testes (testes unitários e de integração)
./mvnw test

# Iniciar o servidor backend (Porta 8081)
./mvnw spring-boot:run
```
O backend estará disponível em: `http://localhost:8081/api`
Healthcheck: `http://localhost:8081/api/health`

### 4. Iniciar o Frontend (React + Vite)
No diretório `frontend/`:
```bash
# Instalar dependências (se necessário)
npm install

# Iniciar o servidor de desenvolvimento (Porta 5174)
npm run dev
```
Acesse o sistema no navegador: `http://localhost:5174`

---

## ☁️ Deploy (Render + Neon, custo zero)

```text
navegador ──► rfleet-web (site estático no Render) ──/api/*──► rfleet-api (Docker no Render) ──► PostgreSQL (Neon)
```

- **Site estático (`rfleet-web`):** o Vite gera os arquivos e o Render serve. Não dorme. Um rewrite encaminha `/api/*` para a API, como o proxy do Vite faz no desenvolvimento, então o frontend continua chamando `/api`.
- **API (`rfleet-api`):** a imagem de `backend/Dockerfile`, ajustada para o plano grátis, com CDS e flags de JVM para economizar memória.
- **Banco:** Neon (PostgreSQL), na mesma região da API. Os anexos ficam no próprio banco (tabela `anexos_conteudo`), porque o disco do Render grátis é apagado a cada deploy.
- Toda a infraestrutura está em [`render.yaml`](render.yaml) (Render Blueprint). Segredos e URLs nunca vão para o git: são digitados no painel.

### Passo a passo

1. **Neon:** crie um projeto (ou um database novo) chamado `rfleet`, na mesma região da API, e copie host, usuário e senha.
2. **Render:** New → Blueprint → este repositório. O Render lê o `render.yaml` e pede as variáveis abaixo.
3. Depois do primeiro deploy, confira o endereço que o Render deu à API. Se não for o endereço que está no `render.yaml`, atualize o `destination` do rewrite no `render.yaml`.
4. Coloque o endereço do site em `CORS_ALLOWED_ORIGINS` e faça redeploy da API.

O deploy só roda depois que o CI do GitHub passa (`autoDeployTrigger: checksPass`).

### Variáveis da API

| Variável | De onde vem | Exemplo (sem segredo) |
|---|---|---|
| `SPRING_DATASOURCE_URL` | Neon (host + database) | `jdbc:postgresql://ep-xxx.<regiao>.aws.neon.tech/rfleet?sslmode=require` |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | Neon | — |
| `JWT_SECRET` | gerada pelo Render (`generateValue`: Base64 de 256 bits) | — |
| `RFLEET_GESTOR_NOME` / `RFLEET_GESTOR_EMAIL` / `RFLEET_GESTOR_SENHA` | você escolhe (senha com 10+ caracteres) | — |
| `CORS_ALLOWED_ORIGINS` | endereço do `rfleet-web` | `https://<seu-site>.onrender.com` |
| `PORT` | definida pelo Render | `10000` |

### Trade-offs do plano grátis

- **A API dorme depois de 15 minutos sem acesso.** O primeiro acesso depois disso espera a API subir de novo: cerca de **1 minuto**. O site estático não dorme.
- **O Neon suspende o banco depois de 5 minutos parado.** A primeira consulta leva alguns segundos a mais. O pool de conexões (`minimum-idle: 0`) não segura conexões abertas, para o banco poder suspender.
- **Anexos ocupam a cota de 0,5 GB do Neon.** Com o limite de 8 MB por arquivo, sobra espaço para uma demonstração.
- **As 750 horas por mês do Render grátis valem para o workspace inteiro**, e não por serviço.

---

## 📁 Estrutura do Repositório

```text
R-Fleet/
├── backend/
│   ├── src/main/java/com/rfleet/
│   │   ├── config/              # Configurações de segurança e CORS
│   │   ├── domain/              # Entidades JPA (OrdemServico, Veiculo, Usuario, etc.)
│   │   ├── dto/                 # Data Transfer Objects
│   │   ├── repository/          # Repositórios Spring Data & Specifications
│   │   ├── security/            # Filtros JWT e UserDetails
│   │   ├── service/             # Serviços de negócio (OS, Anexo, Dashboard, Import/Export)
│   │   ├── util/                # Formatadores e utilitários de placa
│   │   ├── validation/          # Validador personalizado @ValidPlaca
│   │   └── web/                 # Controllers REST
│   ├── src/main/resources/
│   │   ├── application.yml      # Configurações de porta (8081), banco (5433) e JWT
│   │   └── db/migration/        # Migrações Flyway (V1 Schema, V2 Padrão, V3 Seed Demo, ..., V6 Anexos no banco)
│   └── Dockerfile               # Imagem da API para o Render
├── frontend/
│   ├── src/
│   │   ├── components/          # KanbanBoard, TabelaOrdens, DashboardView, Modais
│   │   ├── context/             # AuthContext com persistência de token
│   │   ├── services/            # Cliente HTTP api.ts com headers de autenticação
│   │   ├── types/               # Tipagens e interfaces TypeScript
│   │   ├── App.tsx              # Componente principal e orquestrador de estado
│   │   └── index.css            # Estilos e tokens Tailwind CSS
│   └── vite.config.ts           # Configuração de porta (5174) e proxy reverso para :8081
├── .github/workflows/           # CI: testes do backend e build do frontend
├── docs/
│   ├── SPEC-DESIGN.md           # Especificação arquitetural completa
│   └── PLANO-IMPLEMENTACAO.md   # Plano mestre de implementação
├── docker-compose.yml           # Banco PostgreSQL para desenvolvimento local
├── render.yaml                  # Render Blueprint: API, site estático e variáveis do deploy
└── README.md                    # Documentação do projeto
```

---

## 🧪 Suíte de Testes Automatizados

O backend tem uma suíte de testes que cobre os fluxos críticos:
- Autenticação e geração de token JWT
- Bloqueio de senhas incorretas e validação de token expirado
- Validação estrita de formato de placas antigas e Mercosul
- Prevenção de concorrência com rejeição de 2ª OS ativa para o mesmo veículo (HTTP 409 Conflict)
- Auditoria automática de transição de etapas e preenchimento de data de saída ao marcar como entregue
- Ajuste de orçamento com justificativa gravada na linha do tempo
- Upload, listagem, download (mesmos bytes) e exclusão de anexos (laudos, fotos, PDFs), guardados no PostgreSQL
- Cálculo das métricas consolidadas do dashboard, incluindo a comissão mensal
- Histórico mensal de entregues e ocultação dos entregues de meses anteriores na operação
- Importação da planilha legada via CSV e exportação em `.xlsx` e `.csv`
- Segurança: sem senha padrão, conta do gestor por variáveis de ambiente, chave JWT obrigatória, token só no cabeçalho, CORS restrito e limite de upload

Para rodar todos os testes:
```bash
cd backend
./mvnw test
```
