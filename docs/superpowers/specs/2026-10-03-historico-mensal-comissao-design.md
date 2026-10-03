# Histórico Mensal de Entregues e Comissão Mensal — Design

> **Status:** Aguardando revisão
> **Data:** 03/10/2026
> **Escopo:** backend (Spring Boot) e frontend (React) do R-Fleet

## 1. Objetivo

1. **Histórico mensal:** quando o mês vira, os veículos entregues nos meses
   anteriores saem da operação do dia a dia (Kanban e Tabela Operacional) e
   passam a ser consultados numa tela **Histórico**, com uma tabela por mês.
   Hoje a coluna "Entregue" do Kanban acumula todos os entregues desde sempre.
2. **Comissão mensal:** o card "Tempo Médio" do Dashboard é substituído pelo
   card **"Comissão Mensal"**: 2% sobre o valor das OS faturadas no mês.

### Decisões já tomadas com o gestor

- A passagem para o histórico é **automática**: não existe ação de "fechar o
  mês" e nada é apagado nem copiado.
- O histórico é **calculado** a partir das próprias OS, sem tabela nova. Se uma
  OS for editada depois, o histórico reflete a edição.
- A **comissão** usa a mesma base do card "Faturamento do mês" que já existe:
  OS com `faturado = true` e `data_faturamento` no mês corrente. O valor é o
  `valor_orcamento`, o único campo de valor da OS.

### Fora do escopo

- Comissão por mecânico ou por funcionário (existe só um valor mensal).
- Mostrar a comissão na tabela do Histórico. O Histórico é por data de
  **saída** e a comissão por data de **faturamento**, então os números não
  bateriam lado a lado.
- Tela para editar o percentual da comissão. Ele fica numa configuração no
  banco e poderá ser editado pela tela de configurações (item 2 da lista de
  pendências), quando ela existir.

## 2. Regras de negócio

### 2.1. Mês de referência

- O mês de um veículo entregue é o mês da sua `data_saida`.
- Toda OS em `ENTREGUE` tem `data_saida`: a transição para Entregue preenche a
  data quando ela é nula, e a importação da planilha também a preenche
  (`ImportadorPlanilhaService`).
- O "mês corrente" é calculado no fuso **America/Sao_Paulo**
  (`LocalDate.now(ZoneId.of("America/Sao_Paulo"))`), e não no fuso do servidor.
  Assim a virada acontece à meia-noite do horário de Brasília, mesmo num
  servidor em UTC.

### 2.2. Operação atual × histórico

| Situação da OS | Kanban / Tabela | Histórico |
|---|---|---|
| Etapa diferente de `ENTREGUE` | aparece | não aparece |
| `ENTREGUE` com saída no mês corrente | aparece (coluna Entregue) | aparece no mês corrente |
| `ENTREGUE` com saída em mês anterior | **não aparece** | aparece no mês da saída |
| Arquivada (`ativo = false`) | não aparece | não aparece |

- Uma OS reaberta (que sai de `ENTREGUE` e volta para outra etapa) volta para
  a operação e sai do histórico, porque deixa de estar em `ENTREGUE`.
- O mês corrente aparece **nos dois lugares**: no Kanban, para a operação, e no
  Histórico, para quem quiser ver o mês completo ou exportá-lo.

### 2.3. Comissão mensal

```
comissaoMesAtual = faturamentoMesAtual × COMISSAO_PERCENTUAL / 100
```

- Arredondada para 2 casas decimais (`HALF_UP`).
- `COMISSAO_PERCENTUAL` vem da tabela `configuracoes`, com valor inicial `2`.
  Aceita decimais (ex.: `2.5`). Se a chave estiver ausente ou com valor
  inválido, usa `2`.

## 3. Backend

### 3.1. Objeto de filtros da listagem (melhoria direcionada)

`OrdemServicoSpecification.comFiltros`, `OrdemServicoService.listar`, o
controller de listagem e o de exportação repetem a mesma lista posicional de
11 parâmetros, que cresceria para 14. Para não aumentar isso, os filtros passam
a viajar num record:

```java
public record FiltroOrdensServico(
        String termo,
        List<EtapaOrdemServico> etapas,
        Long origemId,
        Long tipoServicoId,
        Boolean faturado,
        Boolean concluido,
        LocalDate dataEntradaInicio,
        LocalDate dataEntradaFim,
        LocalDate dataSaidaInicio,          // novo
        LocalDate dataSaidaFim,             // novo
        Boolean emAtraso,
        Boolean ocultarEntreguesAnteriores, // novo
        Boolean ativo
) {}
```

- Os controllers continuam recebendo os mesmos `@RequestParam` (a API pública
  não muda, só ganha parâmetros novos). Os parâmetros novos são opcionais.
- `ativo` mantém o padrão `true`.

### 3.2. Novos filtros na listagem e na exportação

Valem para `GET /api/ordens-servico` e `GET /api/exportacao/ordens-servico`:

| Parâmetro | Tipo | Efeito |
|---|---|---|
| `dataSaidaInicio` | data ISO | `data_saida >= valor` |
| `dataSaidaFim` | data ISO | `data_saida <= valor` |
| `ocultarEntreguesAnteriores` | boolean | quando `true`, exclui as OS em `ENTREGUE` com `data_saida` anterior ao dia 1º do mês corrente (§2.1) |

### 3.3. Novo endpoint: meses do histórico

`GET /api/historico/meses` (exige autenticação, como todo o resto da API)

Resposta: os meses com pelo menos uma OS ativa em `ENTREGUE`, do mais recente
ao mais antigo.

```json
[
  { "ano": 2026, "mes": 10, "quantidade": 4,  "valorTotal": 9850.00 },
  { "ano": 2026, "mes": 9,  "quantidade": 23, "valorTotal": 48300.00 }
]
```

- Agrupamento por ano e mês de `data_saida`, contando as OS e somando
  `valor_orcamento`. Filtros: `etapa = 'ENTREGUE'` e `ativo = true`.
- Implementado com uma consulta agregada no `OrdemServicoRepository` (JPQL com
  `YEAR`/`MONTH` ou SQL nativo com `EXTRACT`), sem carregar as OS em memória.
- Sem entregas, devolve `[]`.
- Arquivos novos: `HistoricoController`, `HistoricoMesDTO` (record) e um método
  de consulta no `OrdemServicoRepository`. A lógica é só uma consulta, então
  não cria service próprio: o controller chama um método novo do
  `OrdemServicoService`.

As linhas de cada mês vêm da listagem que já existe:
`GET /api/ordens-servico?etapas=ENTREGUE&dataSaidaInicio=2026-09-01&dataSaidaFim=2026-09-30`.

### 3.4. Dashboard

- **Coluna Entregue:** `distribuicaoPorEtapa.ENTREGUE` passa a contar só os
  entregues com saída no mês corrente, para bater com o Kanban. As outras
  etapas continuam iguais.
- **Comissão:** `DashboardMetricasDTO` ganha:
  - `comissaoPercentual` (`BigDecimal`), com o percentual em uso;
  - `comissaoMesAtual` (`BigDecimal`), calculada como em §2.3.
- **Tempo médio:** `tempoMedioPatioDias` sai do DTO e do `DashboardService`,
  porque não é mais exibido em lugar nenhum.
- `DashboardService` volta a receber o `ConfiguracaoRepository` para ler
  `COMISSAO_PERCENTUAL`.
- **Fuso:** quando nenhuma data de referência é passada, o `DashboardService`
  usa a data de hoje em America/Sao_Paulo (§2.1), e não `LocalDate.now()` do
  servidor. Assim "faturamento do mês", "comissão" e "entregues do mês" viram
  no mesmo instante que o Kanban. Os demais usos de `LocalDate.now()` no
  sistema (atraso, data de saída automática) ficam fora deste escopo.

### 3.5. Migration

`V4__configuracao_comissao.sql`:

```sql
INSERT INTO configuracoes (chave, valor, descricao) VALUES
    ('COMISSAO_PERCENTUAL', '2', 'Percentual de comissão mensal sobre o valor faturado no mês')
ON CONFLICT (chave) DO NOTHING;
```

## 4. Frontend

### 4.1. Carga da operação

- `App.tsx` passa a carregar as ordens com
  `api.listarOrdens({ ativo: true, ocultarEntreguesAnteriores: true })`.
  Kanban e Tabela Operacional usam essa lista, então os dois deixam de mostrar
  os entregues de meses anteriores.
- Efeito colateral desejado: a quantidade de dados carregados na tela para de
  crescer a cada mês.

### 4.2. Aba Histórico

- `abaAtiva` ganha o valor `'historico'`. A `Navbar` ganha a aba
  **Histórico**, no desktop e na barra do celular, com o ícone `History`
  (lucide).
- Novo componente `HistoricoView.tsx`:
  - Ao abrir, chama `api.listarMesesHistorico()` e seleciona o mês mais recente.
  - **Seletor de meses:** botões no topo ("Out/2026", "Set/2026"…), com
    rolagem horizontal no celular. Cada botão mostra a quantidade de veículos.
  - **Tabela do mês:** chama `api.listarOrdens({ etapas: ['ENTREGUE'],
    dataSaidaInicio, dataSaidaFim })` com o primeiro e o último dia do mês.
    Colunas: placa, modelo, origem, tipo de serviço, entrada, saída, dias na
    oficina, valor, faturado e NF. Ordenada pela data de saída, da mais recente
    para a mais antiga.
  - **Rodapé:** "Setembro/2026 — 23 veículos — R$ 48.300,00", mais os botões
    **Exportar Excel** e **Exportar CSV** (`api.exportarOrdensUrl` com os
    mesmos filtros).
  - Clicar numa linha abre o `ModalDetalhes` que já existe.
  - **Estado vazio:** "Nenhum veículo entregue ainda."
  - **Erro de carga:** toast de erro, como nas outras telas.
  - No celular, a tabela rola na horizontal dentro do próprio contêiner, sem
    rolagem horizontal da página.
- `api.ts`: novo `listarMesesHistorico()`. `listarOrdens` e
  `exportarOrdensUrl` passam a aceitar `dataSaidaInicio`, `dataSaidaFim` e
  `ocultarEntreguesAnteriores`.
- `types/index.ts`: nova interface `HistoricoMes`.

### 4.3. Card Comissão Mensal

O card "Tempo Médio" do `DashboardView` vira:

```
┌─ COMISSÃO MENSAL ──────── $ ┐
│  R$ 966,00                  │
│  2% de R$ 48.300,00 faturado│
│  em outubro                 │
└─────────────────────────────┘
```

- Valor principal: `comissaoMesAtual` em R$.
- Linha de apoio: `{comissaoPercentual}% de {faturamentoMesAtual} faturado em
  {mês corrente por extenso}`.
- `DashboardMetricas` (TS): remove `tempoMedioPatioDias` e adiciona
  `comissaoPercentual` e `comissaoMesAtual`.

## 5. Testes

Escritos **antes** da implementação, com MockMvc contra o PostgreSQL, como os
testes existentes. As OS de teste são criadas pela API e, quando preciso,
levadas a `ENTREGUE` com `PATCH /etapa`. Para pôr a data de saída num mês
anterior, o teste ajusta `data_saida` pelo repositório, porque a API não
permite editá-la.

1. **Listagem com `ocultarEntreguesAnteriores=true`:** uma OS entregue no mês
   passado não aparece; uma entregue neste mês aparece; uma OS aberta aparece.
2. **Filtros de data de saída:** `dataSaidaInicio`/`dataSaidaFim` devolvem só as
   OS do intervalo, na listagem e na exportação CSV.
3. **`GET /api/historico/meses`:** quantidade e valor total corretos para dois
   meses diferentes, em ordem decrescente. OS arquivadas e OS fora de
   `ENTREGUE` não entram. Sem token: 401 ou 403.
4. **Dashboard, comissão:** com R$ 10.000 faturados no mês, `comissaoMesAtual`
   é 200,00 e `comissaoPercentual` é 2. Mudando `COMISSAO_PERCENTUAL` para
   `2.5` no repositório, passa a ser 250,00. Uma OS faturada no mês passado não
   entra.
5. **Dashboard, coluna Entregue:** um entregue do mês passado não entra em
   `distribuicaoPorEtapa.ENTREGUE`.
6. Ajustar `DashboardControllerTest`, que hoje verifica `tempoMedioPatioDias`.

Frontend (não há testes automatizados): `npm run build` (inclui `tsc`) e
verificação manual no navegador, no desktop e numa largura de celular (375px):
Kanban sem entregues antigos, aba Histórico com os meses, exportação do mês e
card de comissão.

## 6. Entrega

- Branch `feat/historico-mensal-comissao`, com commits pequenos no padrão
  Conventional Commits, PR para a `main`, CI verde e merge.
- README atualizado: nova aba Histórico e card de comissão.
