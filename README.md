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
| **Backend** | Java 21, Spring Boot 3.3.4, Spring Data JPA, Spring Security, JWT (JJWT), Flyway, Apache POI |
| **Banco de Dados** | PostgreSQL 16 (porta mapeada para `5433` para evitar conflitos locais) |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS v4, Lucide Icons |
| **Ambiente & Testes** | Docker Compose, JUnit 5, MockMvc, AssertJ |

---

## 🔐 Configuração Inicial (obrigatória)

O repositório não traz senhas nem chaves. Antes de subir o backend:

1. Copie o modelo: `cp .env.example .env` (o `.env` não vai para o git).
2. Gere a chave dos tokens e cole em `JWT_SECRET` (uma linha só): `openssl rand -base64 64 | tr -d '\r\n'`
3. Preencha `RFLEET_GESTOR_NOME`, `RFLEET_GESTOR_EMAIL` e `RFLEET_GESTOR_SENHA` (mínimo 10 caracteres, sem aspas).

Na primeira inicialização o backend cria a conta do gestor com esses dados. Depois disso, a senha não é mais alterada pelo `.env`.

> **Atualizando um banco antigo:** a senha da conta padrão antiga foi revogada (migration V5). Defina as variáveis com o **mesmo e-mail** dessa conta para cadastrar a senha nova e manter o histórico ligado a ela.

Sem `JWT_SECRET` válido, ou sem nenhum gestor que consiga entrar, o backend não sobe e explica no log o que falta.

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
# Executar suíte de testes (57 testes unitários e de integração)
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
│   └── src/main/resources/
│       ├── application.yml      # Configurações de porta (8081), banco (5433) e JWT
│       └── db/migration/        # Migrações Flyway (V1 Schema, V2 Padrão, V3 Seed Demo)
├── frontend/
│   ├── src/
│   │   ├── components/          # KanbanBoard, TabelaOrdens, DashboardView, Modais
│   │   ├── context/             # AuthContext com persistência de token
│   │   ├── services/            # Cliente HTTP api.ts com headers de autenticação
│   │   ├── types/               # Tipagens e interfaces TypeScript
│   │   ├── App.tsx              # Componente principal e orquestrador de estado
│   │   └── index.css            # Estilos e tokens Tailwind CSS
│   └── vite.config.ts           # Configuração de porta (5174) e proxy reverso para :8081
├── docs/
│   ├── SPEC-DESIGN.md           # Especificação arquitetural completa
│   └── PLANO-IMPLEMENTACAO.md   # Plano mestre de implementação
├── docker-compose.yml           # Definição do banco PostgreSQL 16
└── README.md                    # Documentação do projeto
```

---

## 🧪 Suíte de Testes Automatizados

O backend conta com 57 testes cobrindo todos os fluxos críticos:
- Autenticação e geração de token JWT
- Bloqueio de senhas incorretas e validação de token expirado
- Validação estrita de formato de placas antigas e Mercosul
- Prevenção de concorrência com rejeição de 2ª OS ativa para o mesmo veículo (HTTP 409 Conflict)
- Auditoria automática de transição de etapas e preenchimento de data de saída ao marcar como entregue
- Ajuste de orçamento com justificativa gravada na linha do tempo
- Upload, listagem, download e exclusão de anexos (laudos, fotos, PDFs)
- Cálculo das métricas consolidadas do dashboard, incluindo a comissão mensal
- Histórico mensal de entregues e ocultação dos entregues de meses anteriores na operação
- Importação da planilha legada via CSV e exportação em `.xlsx` e `.csv`
- Segurança: senha padrão revogada, conta do gestor por variáveis de ambiente, chave JWT obrigatória, token só no cabeçalho, CORS restrito e limite de upload

Para rodar todos os testes:
```bash
cd backend
./mvnw test
```
