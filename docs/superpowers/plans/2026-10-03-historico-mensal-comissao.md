# Histórico Mensal de Entregues e Comissão Mensal — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tirar da operação (Kanban e Tabela) os veículos entregues em meses anteriores, exibi-los numa aba Histórico com uma tabela por mês, e trocar o card "Tempo Médio" do Dashboard por "Comissão Mensal" (2% do faturado no mês).

**Architecture:** Não há tabela nova. O mês de um entregue é o mês da `data_saida`. A listagem de OS ganha filtros por data de saída e o parâmetro `ocultarEntreguesAnteriores`, e um endpoint agregado `GET /api/historico/meses` devolve os meses com entregas. O dashboard passa a calcular o mês corrente no fuso America/Sao_Paulo e lê o percentual de comissão da tabela `configuracoes`.

**Tech Stack:** Java 21, Spring Boot 3.3.4, Spring Data JPA (Specifications, JPQL), Flyway, PostgreSQL 16, JUnit 5 + MockMvc; React 18, TypeScript (strict, `noUnusedLocals`), Vite, Tailwind v4, lucide-react.

**Spec:** `docs/superpowers/specs/2026-10-03-historico-mensal-comissao-design.md`

## Global Constraints

- Fuso do "mês corrente": **America/Sao_Paulo** (`LocalDate.now(ZoneId.of("America/Sao_Paulo"))`), nunca o fuso do servidor.
- O mês de um entregue é o mês da `data_saida`. A etapa considerada é `ENTREGUE`, e só entram OS com `ativo = true`.
- `COMISSAO_PERCENTUAL`: valor inicial `'2'`, aceita decimais (ex.: `2.5`), padrão `2` se a chave estiver ausente ou inválida.
- Comissão: `faturamentoMesAtual × COMISSAO_PERCENTUAL / 100`, com 2 casas decimais e `HALF_UP`.
- A API pública não muda, só ganha parâmetros opcionais: `dataSaidaInicio`, `dataSaidaFim` (data ISO) e `ocultarEntreguesAnteriores` (boolean). Valem para `GET /api/ordens-servico` e `GET /api/exportacao/ordens-servico`.
- Interface em português do Brasil, moeda R$ (`Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`), datas dd/mm/aaaa.
- Na tela do celular (375px), sem rolagem horizontal da página. Tabelas rolam dentro do próprio contêiner.
- Commits no padrão Conventional Commits, em português e sem acentos (como o histórico do repo), terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Branch: `feat/historico-mensal-comissao` (já existe e contém a spec).

## Review Focus

1. **OS em `ENTREGUE` sem `data_saida`** (dado legado ou inconsistente): com `ocultarEntreguesAnteriores=true` ela **continua visível** na operação, em vez de sumir sem deixar rastro. Teste na Task 2.
2. **Limite do mês:** uma saída no último dia do mês anterior fica oculta e uma saída no dia 1º do mês corrente aparece. Teste na Task 2.
3. **OS reaberta** (sai de `ENTREGUE` com `data_saida` antiga): volta para a operação e não aparece no histórico daquele mês. Testes nas Tasks 2 e 3.
4. **Arredondamento da comissão** com valores quebrados (ex.: R$ 333,33): o resultado tem exatamente 2 casas e usa `HALF_UP`. Teste na Task 4.
5. **Seleção rápida de meses no Histórico:** uma resposta atrasada de um mês anterior não pode sobrescrever a tabela do mês escolhido depois. Tratado na Task 6, com o flag `cancelado` no `useEffect`, e conferido na verificação manual.

## Mapa de arquivos

**Backend (`backend/src/main/java/com/rfleet/`)**
- Criar `util/DataOficina.java`: data de hoje e início do mês no fuso da oficina.
- Criar `dto/FiltroOrdensServico.java`: record com os filtros da listagem e da exportação.
- Criar `dto/HistoricoMesDTO.java`: record de um mês do histórico.
- Criar `web/HistoricoController.java`: `GET /api/historico/meses`.
- Modificar `repository/OrdemServicoSpecification.java`: recebe o record e ganha os novos filtros.
- Modificar `repository/OrdemServicoRepository.java`: consulta agregada por mês.
- Modificar `service/OrdemServicoService.java`: `listar(FiltroOrdensServico)` e `listarMesesHistorico()`.
- Modificar `web/OrdemServicoController.java` e `web/ImportExportController.java`: montam o record e recebem os novos parâmetros.
- Modificar `service/DashboardService.java` e `dto/DashboardMetricasDTO.java`: comissão, entregues do mês, fuso e remoção do tempo médio.
- Criar `backend/src/main/resources/db/migration/V4__configuracao_comissao.sql`.

**Testes backend (`backend/src/test/java/com/rfleet/web/`)**
- Criar `EntreguesOperacaoControllerTest.java`.
- Criar `HistoricoControllerTest.java`.
- Modificar `DashboardControllerTest.java`.

**Frontend (`frontend/src/`)**
- Criar `utils/meses.ts`: rótulos e intervalo de mês.
- Criar `components/HistoricoView.tsx`.
- Modificar `types/index.ts`: `AbaApp`, `HistoricoMes`, `DashboardMetricas`.
- Modificar `services/api.ts`: `listarMesesHistorico()`.
- Modificar `App.tsx`: carga com `ocultarEntreguesAnteriores` e aba Histórico.
- Modificar `components/Navbar.tsx`: aba Histórico.
- Modificar `components/DashboardView.tsx`: card Comissão Mensal.

**Docs:** modificar `README.md`.

## Como rodar

- Banco local: `docker compose up -d`, na raiz. Container `rfleet-postgres`, porta 5433.
- Testes backend: `cd backend && ./mvnw test`. Um teste: `./mvnw test -Dtest=NomeDaClasse`.
- Build frontend: `cd frontend && npm run build` (roda `tsc` e `vite build`).
- App: `cd backend && ./mvnw spring-boot:run` (porta 8081) e `cd frontend && npm run dev` (http://localhost:5174). Login `gestor@exemplo.com` / `<senha-do-gestor>`.
- Os testes de integração rodam contra o PostgreSQL local, que já tem os dados de demonstração da V3 (datas relativas a hoje). Cada teste é `@Transactional` e é desfeito ao final. Por isso os testes isolam os próprios dados com placas de prefixo único e datas em 2019/2020, ou comparam valores antes e depois.

---

### Task 1: Fuso da oficina e objeto de filtros (refatoração sem mudança de comportamento)

**Files:**
- Create: `backend/src/main/java/com/rfleet/util/DataOficina.java`
- Create: `backend/src/main/java/com/rfleet/dto/FiltroOrdensServico.java`
- Modify: `backend/src/main/java/com/rfleet/repository/OrdemServicoSpecification.java`
- Modify: `backend/src/main/java/com/rfleet/service/OrdemServicoService.java` (método `listar`)
- Modify: `backend/src/main/java/com/rfleet/web/OrdemServicoController.java` (método `listar`)
- Modify: `backend/src/main/java/com/rfleet/web/ImportExportController.java` (método `exportarOrdensServico`)
- Test: a suíte existente (`OrdemServicoControllerTest`, `ImportExportControllerTest`, `DashboardControllerTest`)

**Interfaces:**
- Produces:
  - `DataOficina.ZONA` (`ZoneId`), `DataOficina.hoje()` (`LocalDate`), `DataOficina.inicioDoMesCorrente()` (`LocalDate`)
  - `record FiltroOrdensServico(String termo, List<EtapaOrdemServico> etapas, Long origemId, Long tipoServicoId, Boolean faturado, Boolean concluido, LocalDate dataEntradaInicio, LocalDate dataEntradaFim, Boolean emAtraso, Boolean ativo)`. A Task 2 acrescenta três campos.
  - `OrdemServicoSpecification.comFiltros(FiltroOrdensServico filtro, long limiteDiasSla)`
  - `OrdemServicoService.listar(FiltroOrdensServico filtro)` → `List<OrdemServicoDTO>`

- [ ] **Step 1: Rodar a suíte antes de mexer (linha de base)**

Run: `cd backend && ./mvnw -q test`
Expected: BUILD SUCCESS, 28 testes, 0 falhas.

- [ ] **Step 2: Criar `DataOficina`**

```java
package com.rfleet.util;

import java.time.LocalDate;
import java.time.ZoneId;

/**
 * Datas no fuso da oficina (America/Sao_Paulo), independente do fuso do servidor.
 */
public final class DataOficina {

    public static final ZoneId ZONA = ZoneId.of("America/Sao_Paulo");

    private DataOficina() {
    }

    public static LocalDate hoje() {
        return LocalDate.now(ZONA);
    }

    public static LocalDate inicioDoMesCorrente() {
        return hoje().withDayOfMonth(1);
    }
}
```

- [ ] **Step 3: Criar `FiltroOrdensServico`**

```java
package com.rfleet.dto;

import com.rfleet.domain.EtapaOrdemServico;

import java.time.LocalDate;
import java.util.List;

/**
 * Filtros da listagem e da exportação de ordens de serviço.
 */
public record FiltroOrdensServico(
        String termo,
        List<EtapaOrdemServico> etapas,
        Long origemId,
        Long tipoServicoId,
        Boolean faturado,
        Boolean concluido,
        LocalDate dataEntradaInicio,
        LocalDate dataEntradaFim,
        Boolean emAtraso,
        Boolean ativo
) {
}
```

- [ ] **Step 4: Trocar a assinatura de `OrdemServicoSpecification.comFiltros`**

Substitua o cabeçalho do método (os 11 parâmetros) por:

```java
    public static Specification<OrdemServico> comFiltros(FiltroOrdensServico filtro, long limiteDiasSla) {
```

Adicione `import com.rfleet.dto.FiltroOrdensServico;`. No corpo, troque cada parâmetro antigo pelo acessor do record, sem mudar a lógica: `ativo` → `filtro.ativo()`, `termo` → `filtro.termo()`, `etapas` → `filtro.etapas()`, `origemId` → `filtro.origemId()`, `tipoServicoId` → `filtro.tipoServicoId()`, `faturado` → `filtro.faturado()`, `concluido` → `filtro.concluido()`, `dataEntradaInicio` → `filtro.dataEntradaInicio()`, `dataEntradaFim` → `filtro.dataEntradaFim()`, `emAtraso` → `filtro.emAtraso()`. O `limiteDiasSla` continua sendo parâmetro. Exemplo do bloco 2:

```java
            // 2. Termo de busca (Placa ou Modelo)
            if (filtro.termo() != null && !filtro.termo().trim().isEmpty()) {
                String termoNormalizado = "%" + filtro.termo().trim().toLowerCase() + "%";
```

- [ ] **Step 5: Trocar `OrdemServicoService.listar`**

Substitua o método `listar` inteiro por:

```java
    @Transactional(readOnly = true)
    public List<OrdemServicoDTO> listar(FiltroOrdensServico filtro) {
        long limiteSla = obterLimiteDiasSla();

        Specification<OrdemServico> spec = OrdemServicoSpecification.comFiltros(filtro, limiteSla);

        Sort sort = Sort.by(Sort.Direction.DESC, "dataEntrada", "id");

        return ordemServicoRepository.findAll(spec, sort).stream()
                .map(os -> OrdemServicoDTO.fromEntity(os, limiteSla, LocalDate.now()))
                .toList();
    }
```

(`com.rfleet.dto.*` já está importado.)

- [ ] **Step 6: Montar o record em `OrdemServicoController.listar`**

Mantenha todos os `@RequestParam`. Troque só o corpo:

```java
        FiltroOrdensServico filtro = new FiltroOrdensServico(
                termo, etapas, origemId, tipoServicoId, faturado, concluido,
                dataEntradaInicio, dataEntradaFim, emAtraso, ativo
        );
        return ResponseEntity.ok(ordemServicoService.listar(filtro));
```

(`com.rfleet.dto.*` já está importado.)

- [ ] **Step 7: Montar o record em `ImportExportController.exportarOrdensServico`**

Troque a chamada `ordemServicoService.listar(...)` por:

```java
        FiltroOrdensServico filtro = new FiltroOrdensServico(
                termo, etapas, origemId, tipoServicoId, faturado, concluido,
                dataEntradaInicio, dataEntradaFim, emAtraso, ativo
        );
        List<OrdemServicoDTO> ordens = ordemServicoService.listar(filtro);
```

e adicione `import com.rfleet.dto.FiltroOrdensServico;`.

- [ ] **Step 8: Rodar a suíte**

Run: `cd backend && ./mvnw -q test`
Expected: BUILD SUCCESS, os mesmos 28 testes passando.

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/com/rfleet/util/DataOficina.java backend/src/main/java/com/rfleet/dto/FiltroOrdensServico.java backend/src/main/java/com/rfleet/repository/OrdemServicoSpecification.java backend/src/main/java/com/rfleet/service/OrdemServicoService.java backend/src/main/java/com/rfleet/web/OrdemServicoController.java backend/src/main/java/com/rfleet/web/ImportExportController.java
git commit -m "refactor(backend): agrupar filtros de ordens de servico em record e adicionar fuso da oficina" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Filtros por data de saída e ocultação dos entregues de meses anteriores

**Files:**
- Create: `backend/src/test/java/com/rfleet/web/EntreguesOperacaoControllerTest.java`
- Modify: `backend/src/main/java/com/rfleet/dto/FiltroOrdensServico.java`
- Modify: `backend/src/main/java/com/rfleet/repository/OrdemServicoSpecification.java`
- Modify: `backend/src/main/java/com/rfleet/service/OrdemServicoService.java` (método `listar`)
- Modify: `backend/src/main/java/com/rfleet/web/OrdemServicoController.java` (método `listar`)
- Modify: `backend/src/main/java/com/rfleet/web/ImportExportController.java` (método `exportarOrdensServico`)

**Interfaces:**
- Consumes: `DataOficina.inicioDoMesCorrente()`, `FiltroOrdensServico` (Task 1)
- Produces:
  - `FiltroOrdensServico` final, nesta ordem: `(String termo, List<EtapaOrdemServico> etapas, Long origemId, Long tipoServicoId, Boolean faturado, Boolean concluido, LocalDate dataEntradaInicio, LocalDate dataEntradaFim, LocalDate dataSaidaInicio, LocalDate dataSaidaFim, Boolean emAtraso, Boolean ocultarEntreguesAnteriores, Boolean ativo)`
  - `OrdemServicoSpecification.comFiltros(FiltroOrdensServico filtro, long limiteDiasSla, LocalDate inicioMesCorrente)`
  - Parâmetros HTTP `dataSaidaInicio`, `dataSaidaFim` e `ocultarEntreguesAnteriores` em `GET /api/ordens-servico` e `GET /api/exportacao/ordens-servico`

- [ ] **Step 1: Escrever os testes que falham**

Crie `EntreguesOperacaoControllerTest.java`:

```java
package com.rfleet.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rfleet.domain.EtapaOrdemServico;
import com.rfleet.domain.OrdemServico;
import com.rfleet.dto.AtualizarEtapaRequest;
import com.rfleet.dto.LoginRequest;
import com.rfleet.dto.LoginResponse;
import com.rfleet.dto.RegistrarEntradaRequest;
import com.rfleet.repository.OrdemServicoRepository;
import com.rfleet.util.DataOficina;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class EntreguesOperacaoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private OrdemServicoRepository ordemServicoRepository;

    private String tokenJwt;

    @BeforeEach
    void setUp() throws Exception {
        LoginRequest loginRequest = LoginRequest.builder()
                .email("gestor@exemplo.com")
                .senha("<senha-do-gestor>")
                .build();

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        LoginResponse loginResponse = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                LoginResponse.class
        );
        this.tokenJwt = loginResponse.getToken();
    }

    private Long criarOs(String placa, EtapaOrdemServico etapa) throws Exception {
        RegistrarEntradaRequest request = RegistrarEntradaRequest.builder()
                .placa(placa)
                .modelo("Teste Historico")
                .etapa(etapa)
                .valorOrcamento(new BigDecimal("1000.00"))
                .dataEntrada(LocalDate.of(2019, 12, 1))
                .build();

        MvcResult result = mockMvc.perform(post("/api/ordens-servico")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private void definirDataSaida(Long id, LocalDate dataSaida) {
        OrdemServico os = ordemServicoRepository.findById(id).orElseThrow();
        os.setDataSaida(dataSaida);
        ordemServicoRepository.saveAndFlush(os);
    }

    private List<String> placasListadas(MockHttpServletRequestBuilder requisicao) throws Exception {
        MvcResult result = mockMvc.perform(requisicao.header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andReturn();

        List<String> placas = new ArrayList<>();
        for (JsonNode os : objectMapper.readTree(result.getResponse().getContentAsString())) {
            placas.add(os.get("placa").asText());
        }
        return placas;
    }

    @Test
    @DisplayName("Deve ocultar da operação os entregues de meses anteriores, respeitando o limite do mês")
    void deveOcultarEntreguesDeMesesAnteriores() throws Exception {
        LocalDate inicioMes = DataOficina.inicioDoMesCorrente();

        Long ultimoDiaMesAnterior = criarOs("HST1A01", EtapaOrdemServico.ENTREGUE);
        definirDataSaida(ultimoDiaMesAnterior, inicioMes.minusDays(1));

        Long primeiroDiaMesAtual = criarOs("HST1A02", EtapaOrdemServico.ENTREGUE);
        definirDataSaida(primeiroDiaMesAtual, inicioMes);

        criarOs("HST1A03", EtapaOrdemServico.EM_SERVICO);

        // Entregue sem data de saída (dado legado): não pode sumir da operação
        criarOs("HST1A04", EtapaOrdemServico.ENTREGUE);

        List<String> operacao = placasListadas(get("/api/ordens-servico")
                .param("termo", "HST1A")
                .param("ocultarEntreguesAnteriores", "true"));

        assertThat(operacao).containsExactlyInAnyOrder("HST1A02", "HST1A03", "HST1A04");

        List<String> semFiltro = placasListadas(get("/api/ordens-servico")
                .param("termo", "HST1A"));

        assertThat(semFiltro).containsExactlyInAnyOrder("HST1A01", "HST1A02", "HST1A03", "HST1A04");
    }

    @Test
    @DisplayName("OS reaberta volta para a operação e sai do histórico do mês da saída antiga")
    void deveManterOsReabertaNaOperacao() throws Exception {
        LocalDate saidaAntiga = DataOficina.inicioDoMesCorrente().minusMonths(2);

        Long id = criarOs("HST1A05", EtapaOrdemServico.ENTREGUE);
        definirDataSaida(id, saidaAntiga);

        AtualizarEtapaRequest reabrir = AtualizarEtapaRequest.builder()
                .novaEtapa(EtapaOrdemServico.EM_SERVICO)
                .observacao("Retorno em garantia")
                .build();

        mockMvc.perform(patch("/api/ordens-servico/" + id + "/etapa")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reabrir)))
                .andExpect(status().isOk());

        List<String> operacao = placasListadas(get("/api/ordens-servico")
                .param("termo", "HST1A05")
                .param("ocultarEntreguesAnteriores", "true"));

        assertThat(operacao).containsExactly("HST1A05");

        List<String> historicoDoMes = placasListadas(get("/api/ordens-servico")
                .param("termo", "HST1A05")
                .param("etapas", "ENTREGUE")
                .param("dataSaidaInicio", saidaAntiga.withDayOfMonth(1).toString())
                .param("dataSaidaFim", saidaAntiga.withDayOfMonth(saidaAntiga.lengthOfMonth()).toString()));

        assertThat(historicoDoMes).isEmpty();
    }

    @Test
    @DisplayName("Deve filtrar entregues pelo período de saída")
    void deveFiltrarPorPeriodoDeSaida() throws Exception {
        Long janeiro = criarOs("HST1A06", EtapaOrdemServico.ENTREGUE);
        definirDataSaida(janeiro, LocalDate.of(2020, 1, 15));

        Long fevereiro = criarOs("HST1A07", EtapaOrdemServico.ENTREGUE);
        definirDataSaida(fevereiro, LocalDate.of(2020, 2, 10));

        List<String> placas = placasListadas(get("/api/ordens-servico")
                .param("termo", "HST1A0")
                .param("etapas", "ENTREGUE")
                .param("dataSaidaInicio", "2020-01-01")
                .param("dataSaidaFim", "2020-01-31"));

        assertThat(placas).containsExactly("HST1A06");
    }

    @Test
    @DisplayName("Deve exportar CSV filtrado pelo período de saída")
    void deveExportarCsvFiltradoPorSaida() throws Exception {
        Long janeiro = criarOs("HST1A08", EtapaOrdemServico.ENTREGUE);
        definirDataSaida(janeiro, LocalDate.of(2020, 1, 20));

        Long fevereiro = criarOs("HST1A09", EtapaOrdemServico.ENTREGUE);
        definirDataSaida(fevereiro, LocalDate.of(2020, 2, 5));

        MvcResult result = mockMvc.perform(get("/api/exportacao/ordens-servico")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .param("formato", "csv")
                        .param("etapas", "ENTREGUE")
                        .param("dataSaidaInicio", "2020-01-01")
                        .param("dataSaidaFim", "2020-01-31"))
                .andExpect(status().isOk())
                .andReturn();

        String csv = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(csv).contains("HST1A08");
        assertThat(csv).doesNotContain("HST1A09");
    }
}
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `cd backend && ./mvnw -q test -Dtest=EntreguesOperacaoControllerTest`
Expected: FAIL. `deveOcultarEntreguesDeMesesAnteriores` falha porque `HST1A01` aparece, já que o parâmetro é ignorado. `deveFiltrarPorPeriodoDeSaida` e `deveExportarCsvFiltradoPorSaida` falham porque os filtros de saída são ignorados. `deveManterOsReabertaNaOperacao` pode passar por acaso, já que a reabertura funciona hoje; ele vale como regressão.

- [ ] **Step 3: Acrescentar os três campos ao record**

Substitua `FiltroOrdensServico` por:

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
        LocalDate dataSaidaInicio,
        LocalDate dataSaidaFim,
        Boolean emAtraso,
        Boolean ocultarEntreguesAnteriores,
        Boolean ativo
) {
}
```

- [ ] **Step 4: Implementar os filtros na Specification**

Troque a assinatura para:

```java
    public static Specification<OrdemServico> comFiltros(
            FiltroOrdensServico filtro,
            long limiteDiasSla,
            LocalDate inicioMesCorrente
    ) {
```

e, logo depois do bloco `// 9. Em Atraso / Alerta SLA` e antes do `return`, adicione:

```java
            // 10. Período de Saída
            if (filtro.dataSaidaInicio() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("dataSaida"), filtro.dataSaidaInicio()));
            }
            if (filtro.dataSaidaFim() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("dataSaida"), filtro.dataSaidaFim()));
            }

            // 11. Operação atual: oculta entregues com saída antes do mês corrente
            if (Boolean.TRUE.equals(filtro.ocultarEntreguesAnteriores())) {
                predicates.add(cb.or(
                        cb.notEqual(root.get("etapa"), EtapaOrdemServico.ENTREGUE),
                        cb.isNull(root.get("dataSaida")),
                        cb.greaterThanOrEqualTo(root.get("dataSaida"), inicioMesCorrente)
                ));
            }
```

O `cb.isNull` é obrigatório. Sem ele, um entregue sem data de saída daria `NULL` no `<` e sumiria da operação (Review Focus 1).

- [ ] **Step 5: Passar o início do mês no service**

Em `OrdemServicoService.listar`, troque a linha da spec por:

```java
        Specification<OrdemServico> spec = OrdemServicoSpecification.comFiltros(
                filtro, limiteSla, DataOficina.inicioDoMesCorrente()
        );
```

e adicione `import com.rfleet.util.DataOficina;`.

- [ ] **Step 6: Receber os parâmetros em `OrdemServicoController.listar`**

Adicione os parâmetros logo depois de `dataEntradaFim`:

```java
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataSaidaInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataSaidaFim,
```

e, logo depois de `emAtraso`:

```java
            @RequestParam(required = false) Boolean ocultarEntreguesAnteriores,
```

Monte o record na nova ordem:

```java
        FiltroOrdensServico filtro = new FiltroOrdensServico(
                termo, etapas, origemId, tipoServicoId, faturado, concluido,
                dataEntradaInicio, dataEntradaFim, dataSaidaInicio, dataSaidaFim,
                emAtraso, ocultarEntreguesAnteriores, ativo
        );
```

- [ ] **Step 7: Fazer o mesmo em `ImportExportController.exportarOrdensServico`**

Adicione os mesmos três `@RequestParam`, nas mesmas posições, e monte o record exatamente como no Step 6.

- [ ] **Step 8: Rodar os testes novos e a suíte**

Run: `cd backend && ./mvnw -q test -Dtest=EntreguesOperacaoControllerTest`
Expected: PASS (4 testes).

Run: `cd backend && ./mvnw -q test`
Expected: BUILD SUCCESS (32 testes).

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/com/rfleet/dto/FiltroOrdensServico.java backend/src/main/java/com/rfleet/repository/OrdemServicoSpecification.java backend/src/main/java/com/rfleet/service/OrdemServicoService.java backend/src/main/java/com/rfleet/web/OrdemServicoController.java backend/src/main/java/com/rfleet/web/ImportExportController.java backend/src/test/java/com/rfleet/web/EntreguesOperacaoControllerTest.java
git commit -m "feat(backend): filtrar ordens por data de saida e ocultar entregues de meses anteriores" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Endpoint `GET /api/historico/meses`

**Files:**
- Create: `backend/src/main/java/com/rfleet/dto/HistoricoMesDTO.java`
- Create: `backend/src/main/java/com/rfleet/web/HistoricoController.java`
- Create: `backend/src/test/java/com/rfleet/web/HistoricoControllerTest.java`
- Modify: `backend/src/main/java/com/rfleet/repository/OrdemServicoRepository.java`
- Modify: `backend/src/main/java/com/rfleet/service/OrdemServicoService.java`

**Interfaces:**
- Produces:
  - `record HistoricoMesDTO(Integer ano, Integer mes, Long quantidade, BigDecimal valorTotal)`, serializado como `{ "ano": 2026, "mes": 9, "quantidade": 23, "valorTotal": 48300.00 }`
  - `OrdemServicoRepository.resumirPorMesDeSaida(EtapaOrdemServico etapa)` → `List<HistoricoMesDTO>`
  - `OrdemServicoService.listarMesesHistorico()` → `List<HistoricoMesDTO>`
  - `GET /api/historico/meses` → `200 [HistoricoMesDTO...]`, do mês mais recente ao mais antigo

- [ ] **Step 1: Escrever os testes que falham**

Crie `HistoricoControllerTest.java`:

```java
package com.rfleet.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rfleet.domain.EtapaOrdemServico;
import com.rfleet.domain.OrdemServico;
import com.rfleet.dto.LoginRequest;
import com.rfleet.dto.LoginResponse;
import com.rfleet.dto.RegistrarEntradaRequest;
import com.rfleet.repository.OrdemServicoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class HistoricoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private OrdemServicoRepository ordemServicoRepository;

    private String tokenJwt;

    @BeforeEach
    void setUp() throws Exception {
        LoginRequest loginRequest = LoginRequest.builder()
                .email("gestor@exemplo.com")
                .senha("<senha-do-gestor>")
                .build();

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        LoginResponse loginResponse = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                LoginResponse.class
        );
        this.tokenJwt = loginResponse.getToken();
    }

    private Long criarEntregue(String placa, String valor, LocalDate dataSaida) throws Exception {
        RegistrarEntradaRequest request = RegistrarEntradaRequest.builder()
                .placa(placa)
                .modelo("Teste Historico")
                .etapa(EtapaOrdemServico.ENTREGUE)
                .valorOrcamento(new BigDecimal(valor))
                .dataEntrada(LocalDate.of(2019, 12, 1))
                .build();

        MvcResult result = mockMvc.perform(post("/api/ordens-servico")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        Long id = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();

        OrdemServico os = ordemServicoRepository.findById(id).orElseThrow();
        os.setDataSaida(dataSaida);
        ordemServicoRepository.saveAndFlush(os);
        return id;
    }

    private JsonNode buscarMeses() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/historico/meses")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode encontrarMes(JsonNode meses, int ano, int mes) {
        for (JsonNode item : meses) {
            if (item.get("ano").asInt() == ano && item.get("mes").asInt() == mes) {
                return item;
            }
        }
        return null;
    }

    @Test
    @DisplayName("Deve resumir os entregues por mês de saída, do mais recente ao mais antigo")
    void deveResumirEntreguesPorMes() throws Exception {
        criarEntregue("HSM1A01", "1000.00", LocalDate.of(2020, 1, 10));
        criarEntregue("HSM1A02", "500.00", LocalDate.of(2020, 1, 25));
        criarEntregue("HSM1A03", "300.00", LocalDate.of(2020, 2, 3));

        // Reaberta: saída em jan/2020, mas não está mais em ENTREGUE
        Long reaberta = criarEntregue("HSM1A04", "9999.00", LocalDate.of(2020, 1, 12));
        OrdemServico osReaberta = ordemServicoRepository.findById(reaberta).orElseThrow();
        osReaberta.setEtapa(EtapaOrdemServico.EM_SERVICO);
        ordemServicoRepository.saveAndFlush(osReaberta);

        // Arquivada: não entra no histórico
        Long arquivada = criarEntregue("HSM1A05", "7777.00", LocalDate.of(2020, 1, 15));
        mockMvc.perform(delete("/api/ordens-servico/" + arquivada)
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isNoContent());

        JsonNode meses = buscarMeses();

        JsonNode janeiro = encontrarMes(meses, 2020, 1);
        JsonNode fevereiro = encontrarMes(meses, 2020, 2);

        assertThat(janeiro).isNotNull();
        assertThat(janeiro.get("quantidade").asLong()).isEqualTo(2);
        assertThat(janeiro.get("valorTotal").decimalValue()).isEqualByComparingTo("1500.00");

        assertThat(fevereiro).isNotNull();
        assertThat(fevereiro.get("quantidade").asLong()).isEqualTo(1);
        assertThat(fevereiro.get("valorTotal").decimalValue()).isEqualByComparingTo("300.00");

        // Ordem decrescente em toda a lista
        for (int i = 1; i < meses.size(); i++) {
            int anterior = meses.get(i - 1).get("ano").asInt() * 12 + meses.get(i - 1).get("mes").asInt();
            int atual = meses.get(i).get("ano").asInt() * 12 + meses.get(i).get("mes").asInt();
            assertThat(anterior).isGreaterThan(atual);
        }
    }

    @Test
    @DisplayName("Deve exigir autenticação para consultar o histórico")
    void deveExigirAutenticacao() throws Exception {
        mockMvc.perform(get("/api/historico/meses"))
                .andExpect(status().isForbidden());
    }
}
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `cd backend && ./mvnw -q test -Dtest=HistoricoControllerTest`
Expected: FAIL. `deveResumirEntreguesPorMes` recebe 404, porque o endpoint não existe. `deveExigirAutenticacao` pode passar, porque toda rota desconhecida também exige token; vale como regressão.

- [ ] **Step 3: Criar o DTO**

```java
package com.rfleet.dto;

import java.math.BigDecimal;

/**
 * Resumo de um mês do histórico: veículos entregues (por data de saída) e valor total.
 */
public record HistoricoMesDTO(
        Integer ano,
        Integer mes,
        Long quantidade,
        BigDecimal valorTotal
) {
}
```

- [ ] **Step 4: Criar a consulta agregada no repositório**

Em `OrdemServicoRepository`, adicione `import com.rfleet.dto.HistoricoMesDTO;` e o método:

```java
    @Query("SELECT new com.rfleet.dto.HistoricoMesDTO(" +
           "  YEAR(os.dataSaida), MONTH(os.dataSaida), COUNT(os), SUM(os.valorOrcamento)) " +
           "FROM OrdemServico os " +
           "WHERE os.etapa = :etapa AND os.ativo = true AND os.dataSaida IS NOT NULL " +
           "GROUP BY YEAR(os.dataSaida), MONTH(os.dataSaida) " +
           "ORDER BY YEAR(os.dataSaida) DESC, MONTH(os.dataSaida) DESC")
    List<HistoricoMesDTO> resumirPorMesDeSaida(@Param("etapa") EtapaOrdemServico etapa);
```

- [ ] **Step 5: Expor no service**

Em `OrdemServicoService`, logo depois de `obterHistorico`:

```java
    @Transactional(readOnly = true)
    public List<HistoricoMesDTO> listarMesesHistorico() {
        return ordemServicoRepository.resumirPorMesDeSaida(EtapaOrdemServico.ENTREGUE);
    }
```

(`com.rfleet.dto.*` e `com.rfleet.domain.*` já estão importados.)

- [ ] **Step 6: Criar o controller**

```java
package com.rfleet.web;

import com.rfleet.dto.HistoricoMesDTO;
import com.rfleet.service.OrdemServicoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/historico")
public class HistoricoController {

    private final OrdemServicoService ordemServicoService;

    public HistoricoController(OrdemServicoService ordemServicoService) {
        this.ordemServicoService = ordemServicoService;
    }

    /**
     * Meses com veículos entregues (por data de saída), do mais recente ao mais antigo.
     */
    @GetMapping("/meses")
    public ResponseEntity<List<HistoricoMesDTO>> listarMeses() {
        return ResponseEntity.ok(ordemServicoService.listarMesesHistorico());
    }
}
```

- [ ] **Step 7: Rodar os testes novos e a suíte**

Run: `cd backend && ./mvnw -q test -Dtest=HistoricoControllerTest`
Expected: PASS (2 testes). Se o Hibernate reclamar do construtor do DTO (tipos de `YEAR`/`MONTH`/`SUM`), confira que o record usa `Integer, Integer, Long, BigDecimal`. São os tipos que o Hibernate 6 devolve para essas funções sobre `LocalDate` e `NUMERIC`.

Run: `cd backend && ./mvnw -q test`
Expected: BUILD SUCCESS (34 testes).

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/rfleet/dto/HistoricoMesDTO.java backend/src/main/java/com/rfleet/web/HistoricoController.java backend/src/main/java/com/rfleet/repository/OrdemServicoRepository.java backend/src/main/java/com/rfleet/service/OrdemServicoService.java backend/src/test/java/com/rfleet/web/HistoricoControllerTest.java
git commit -m "feat(backend): adicionar endpoint de meses do historico de entregues" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Dashboard — comissão mensal, entregues do mês e fuso da oficina

**Files:**
- Create: `backend/src/main/resources/db/migration/V4__configuracao_comissao.sql`
- Modify: `backend/src/main/java/com/rfleet/dto/DashboardMetricasDTO.java`
- Modify: `backend/src/main/java/com/rfleet/service/DashboardService.java` (substituição completa)
- Modify: `backend/src/test/java/com/rfleet/web/DashboardControllerTest.java`

**Interfaces:**
- Consumes: `DataOficina.hoje()` (Task 1), `OrdemServicoService.obterLimiteDiasSla()` (já existe)
- Produces: JSON de `GET /api/dashboard/metricas` **sem** `tempoMedioPatioDias` e **com** `comissaoPercentual` (número, ex.: `2`) e `comissaoMesAtual` (número, ex.: `966.00`). `distribuicaoPorEtapa.ENTREGUE` conta só os entregues que não saíram em mês anterior.

- [ ] **Step 1: Escrever os testes que falham**

Em `DashboardControllerTest.java`:

(a) No teste `deveRetornarMetricasDashboard`, troque a linha
`.andExpect(jsonPath("$.tempoMedioPatioDias").isNumber())` por:

```java
                .andExpect(jsonPath("$.tempoMedioPatioDias").doesNotExist())
                .andExpect(jsonPath("$.comissaoMesAtual").isNumber())
                .andExpect(jsonPath("$.comissaoPercentual").value(2))
```

(b) Adicione os imports:

```java
import com.fasterxml.jackson.databind.JsonNode;
import com.rfleet.domain.Configuracao;
import com.rfleet.domain.OrdemServico;
import com.rfleet.dto.AtualizarFaturamentoRequest;
import com.rfleet.repository.ConfiguracaoRepository;
import com.rfleet.repository.OrdemServicoRepository;
import com.rfleet.util.DataOficina;
import java.math.RoundingMode;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
```

(c) Adicione os campos e auxiliares na classe:

```java
    @Autowired
    private ConfiguracaoRepository configuracaoRepository;

    @Autowired
    private OrdemServicoRepository ordemServicoRepository;

    private JsonNode buscarMetricas() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/dashboard/metricas")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private Long criarOs(String placa, EtapaOrdemServico etapa, String valor) throws Exception {
        RegistrarEntradaRequest request = RegistrarEntradaRequest.builder()
                .placa(placa)
                .modelo("Teste Comissao")
                .etapa(etapa)
                .valorOrcamento(new BigDecimal(valor))
                .dataEntrada(LocalDate.of(2019, 12, 1))
                .build();

        MvcResult result = mockMvc.perform(post("/api/ordens-servico")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private void faturar(Long id, LocalDate dataFaturamento) throws Exception {
        AtualizarFaturamentoRequest request = AtualizarFaturamentoRequest.builder()
                .faturado(true)
                .dataFaturamento(dataFaturamento)
                .build();

        mockMvc.perform(patch("/api/ordens-servico/" + id + "/faturamento")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    private static BigDecimal comissaoEsperada(BigDecimal faturamento, String percentual) {
        return faturamento.multiply(new BigDecimal(percentual))
                .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
    }
```

(d) Adicione os testes:

```java
    @Test
    @DisplayName("Comissão mensal é o percentual configurado sobre o faturado no mês, com 2 casas HALF_UP")
    void deveCalcularComissaoSobreFaturadoDoMes() throws Exception {
        Long id = criarOs("DSH1A03", EtapaOrdemServico.FINALIZADO, "10000.00");
        faturar(id, DataOficina.hoje());

        // Valor quebrado para exercitar o arredondamento
        Long quebrado = criarOs("DSH1A04", EtapaOrdemServico.FINALIZADO, "333.33");
        faturar(quebrado, DataOficina.hoje());

        JsonNode metricas = buscarMetricas();
        BigDecimal faturamento = metricas.get("faturamentoMesAtual").decimalValue();
        BigDecimal comissao = metricas.get("comissaoMesAtual").decimalValue();

        assertThat(faturamento).isGreaterThanOrEqualTo(new BigDecimal("10333.33"));
        assertThat(metricas.get("comissaoPercentual").decimalValue()).isEqualByComparingTo("2");
        assertThat(comissao).isEqualByComparingTo(comissaoEsperada(faturamento, "2"));
        assertThat(comissao.scale()).isLessThanOrEqualTo(2);

        configuracaoRepository.saveAndFlush(Configuracao.builder()
                .chave("COMISSAO_PERCENTUAL")
                .valor("2.5")
                .descricao("teste")
                .build());

        JsonNode depois = buscarMetricas();
        assertThat(depois.get("comissaoPercentual").decimalValue()).isEqualByComparingTo("2.5");
        assertThat(depois.get("comissaoMesAtual").decimalValue())
                .isEqualByComparingTo(comissaoEsperada(faturamento, "2.5"));
    }

    @Test
    @DisplayName("OS faturada no mês passado não entra no faturamento nem na comissão do mês")
    void naoDeveContarFaturadoDoMesPassado() throws Exception {
        BigDecimal antes = buscarMetricas().get("faturamentoMesAtual").decimalValue();

        Long id = criarOs("DSH1A05", EtapaOrdemServico.FINALIZADO, "7000.00");
        faturar(id, DataOficina.hoje().minusMonths(1));

        BigDecimal depois = buscarMetricas().get("faturamentoMesAtual").decimalValue();
        assertThat(depois).isEqualByComparingTo(antes);
    }

    @Test
    @DisplayName("Coluna Entregue do dashboard conta só os entregues do mês corrente")
    void deveContarEntregueSoDoMesCorrente() throws Exception {
        long antes = buscarMetricas().get("distribuicaoPorEtapa").get("ENTREGUE").asLong();

        Long mesPassado = criarOs("DSH1A06", EtapaOrdemServico.ENTREGUE, "100.00");
        OrdemServico antiga = ordemServicoRepository.findById(mesPassado).orElseThrow();
        antiga.setDataSaida(DataOficina.inicioDoMesCorrente().minusDays(1));
        ordemServicoRepository.saveAndFlush(antiga);

        assertThat(buscarMetricas().get("distribuicaoPorEtapa").get("ENTREGUE").asLong()).isEqualTo(antes);

        Long esteMes = criarOs("DSH1A07", EtapaOrdemServico.ENTREGUE, "100.00");
        OrdemServico atual = ordemServicoRepository.findById(esteMes).orElseThrow();
        atual.setDataSaida(DataOficina.hoje());
        ordemServicoRepository.saveAndFlush(atual);

        assertThat(buscarMetricas().get("distribuicaoPorEtapa").get("ENTREGUE").asLong()).isEqualTo(antes + 1);
    }
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `cd backend && ./mvnw -q test -Dtest=DashboardControllerTest`
Expected: FAIL. `deveRetornarMetricasDashboard` falha porque `tempoMedioPatioDias` existe e `comissaoMesAtual` não. `deveCalcularComissaoSobreFaturadoDoMes` dá NPE em `comissaoMesAtual`. `deveContarEntregueSoDoMesCorrente` falha porque o total sobe de `antes` para `antes + 1` já com o entregue do mês passado. `naoDeveContarFaturadoDoMesPassado` pode passar, porque esse comportamento já existe; vale como regressão.

- [ ] **Step 3: Criar a migration V4**

`backend/src/main/resources/db/migration/V4__configuracao_comissao.sql`:

```sql
-- =========================================================================
-- V4: Percentual da comissão mensal sobre o valor faturado no mês
-- =========================================================================

INSERT INTO configuracoes (chave, valor, descricao) VALUES
    ('COMISSAO_PERCENTUAL', '2', 'Percentual de comissão mensal sobre o valor faturado no mês')
ON CONFLICT (chave) DO NOTHING;
```

- [ ] **Step 4: Atualizar o DTO**

Em `DashboardMetricasDTO`, remova `private double tempoMedioPatioDias;` e, logo depois de `private BigDecimal faturamentoMesAtual;`, adicione:

```java
    private BigDecimal comissaoPercentual;
    private BigDecimal comissaoMesAtual;
```

- [ ] **Step 5: Substituir `DashboardService` por completo**

```java
package com.rfleet.service;

import com.rfleet.domain.EtapaOrdemServico;
import com.rfleet.domain.OrdemServico;
import com.rfleet.dto.DashboardMetricasDTO;
import com.rfleet.repository.ConfiguracaoRepository;
import com.rfleet.repository.OrdemServicoRepository;
import com.rfleet.util.DataOficina;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private static final String CHAVE_COMISSAO_PERCENTUAL = "COMISSAO_PERCENTUAL";
    private static final BigDecimal PERCENTUAL_COMISSAO_PADRAO = new BigDecimal("2");
    private static final BigDecimal CEM = new BigDecimal("100");

    private final OrdemServicoRepository ordemServicoRepository;
    private final OrdemServicoService ordemServicoService;
    private final ConfiguracaoRepository configuracaoRepository;

    public DashboardService(
            OrdemServicoRepository ordemServicoRepository,
            OrdemServicoService ordemServicoService,
            ConfiguracaoRepository configuracaoRepository
    ) {
        this.ordemServicoRepository = ordemServicoRepository;
        this.ordemServicoService = ordemServicoService;
        this.configuracaoRepository = configuracaoRepository;
    }

    @Transactional(readOnly = true)
    public DashboardMetricasDTO obterMetricas(LocalDate dataReferencia) {
        LocalDate hoje = dataReferencia != null ? dataReferencia : DataOficina.hoje();
        LocalDate inicioMes = hoje.withDayOfMonth(1);

        long limiteSla = ordemServicoService.obterLimiteDiasSla();

        List<OrdemServico> todasAtivas = ordemServicoRepository.findByAtivoTrue();

        // Veículos atualmente no pátio (etapa != ENTREGUE)
        List<OrdemServico> patio = todasAtivas.stream()
                .filter(os -> os.getEtapa() != EtapaOrdemServico.ENTREGUE)
                .toList();

        long totalPatio = patio.size();

        long emAtraso = patio.stream()
                .filter(os -> "VERMELHO".equals(os.calcularStatusSla(limiteSla, hoje)))
                .count();

        BigDecimal totalOrcadoPatio = patio.stream()
                .map(os -> os.getValorOrcamento() != null ? os.getValorOrcamento() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Faturamento no mês atual
        int mesAtual = hoje.getMonthValue();
        int anoAtual = hoje.getYear();

        BigDecimal faturamentoMesAtual = todasAtivas.stream()
                .filter(os -> Boolean.TRUE.equals(os.getFaturado()))
                .filter(os -> os.getDataFaturamento() != null
                        && os.getDataFaturamento().getMonthValue() == mesAtual
                        && os.getDataFaturamento().getYear() == anoAtual)
                .map(os -> os.getValorOrcamento() != null ? os.getValorOrcamento() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Comissão mensal sobre o faturado no mês
        BigDecimal comissaoPercentual = obterPercentualComissao();
        BigDecimal comissaoMesAtual = faturamentoMesAtual
                .multiply(comissaoPercentual)
                .divide(CEM, 2, RoundingMode.HALF_UP);

        BigDecimal totalFaturadoGeral = todasAtivas.stream()
                .filter(os -> Boolean.TRUE.equals(os.getFaturado()))
                .map(os -> os.getValorOrcamento() != null ? os.getValorOrcamento() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long totalFaturadas = todasAtivas.stream()
                .filter(os -> Boolean.TRUE.equals(os.getFaturado()))
                .count();

        long totalNaoFaturadas = todasAtivas.size() - totalFaturadas;

        // Distribuição por Etapa (todas as 7 etapas inicializadas; Entregue só do mês corrente, como no Kanban)
        Map<EtapaOrdemServico, Long> distribuicaoEtapas = new EnumMap<>(EtapaOrdemServico.class);
        for (EtapaOrdemServico etapa : EtapaOrdemServico.values()) {
            distribuicaoEtapas.put(etapa, 0L);
        }
        for (OrdemServico os : todasAtivas) {
            if (os.getEtapa() != null && !entregueEmMesAnterior(os, inicioMes)) {
                distribuicaoEtapas.put(os.getEtapa(), distribuicaoEtapas.get(os.getEtapa()) + 1L);
            }
        }

        // Distribuição por Origem no Pátio
        Map<String, Long> distribuicaoOrigem = patio.stream()
                .collect(Collectors.groupingBy(
                        os -> (os.getVeiculo() != null && os.getVeiculo().getOrigemPadrao() != null)
                                ? os.getVeiculo().getOrigemPadrao().getNome()
                                : "Não Informada",
                        Collectors.counting()
                ));

        return DashboardMetricasDTO.builder()
                .totalVeiculosPatio(totalPatio)
                .veiculosEmAtraso(emAtraso)
                .faturamentoMesAtual(faturamentoMesAtual)
                .comissaoPercentual(comissaoPercentual)
                .comissaoMesAtual(comissaoMesAtual)
                .totalOrcadoPatio(totalOrcadoPatio)
                .totalFaturadoGeral(totalFaturadoGeral)
                .totalFaturadas(totalFaturadas)
                .totalNaoFaturadas(totalNaoFaturadas)
                .limiteSlaDias(limiteSla)
                .distribuicaoPorEtapa(distribuicaoEtapas)
                .distribuicaoPorOrigem(distribuicaoOrigem)
                .build();
    }

    /**
     * Mesmo critério do filtro ocultarEntreguesAnteriores: entregue com saída antes do mês corrente.
     */
    private static boolean entregueEmMesAnterior(OrdemServico os, LocalDate inicioMes) {
        return os.getEtapa() == EtapaOrdemServico.ENTREGUE
                && os.getDataSaida() != null
                && os.getDataSaida().isBefore(inicioMes);
    }

    private BigDecimal obterPercentualComissao() {
        return configuracaoRepository.findById(CHAVE_COMISSAO_PERCENTUAL)
                .map(c -> {
                    try {
                        return new BigDecimal(c.getValor().trim());
                    } catch (RuntimeException e) {
                        return null;
                    }
                })
                .filter(p -> p.signum() >= 0)
                .orElse(PERCENTUAL_COMISSAO_PADRAO);
    }
}
```

- [ ] **Step 6: Rodar os testes do dashboard e a suíte**

Run: `cd backend && ./mvnw -q test -Dtest=DashboardControllerTest`
Expected: PASS (5 testes).

Run: `cd backend && ./mvnw -q test`
Expected: BUILD SUCCESS (37 testes).

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/resources/db/migration/V4__configuracao_comissao.sql backend/src/main/java/com/rfleet/dto/DashboardMetricasDTO.java backend/src/main/java/com/rfleet/service/DashboardService.java backend/src/test/java/com/rfleet/web/DashboardControllerTest.java
git commit -m "feat(dashboard): calcular comissao mensal e contar so entregues do mes corrente" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Frontend — tipos, utilitários de mês, carga da operação e card Comissão Mensal

**Files:**
- Create: `frontend/src/utils/meses.ts`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/App.tsx` (só a chamada `listarOrdens` em `carregarDadosIniciais`)
- Modify: `frontend/src/components/DashboardView.tsx` (card 3)

**Interfaces:**
- Consumes: JSON das Tasks 3 e 4
- Produces:
  - `type AbaApp = 'kanban' | 'tabela' | 'dashboard' | 'historico'`
  - `interface HistoricoMes { ano: number; mes: number; quantidade: number; valorTotal: number }`
  - `DashboardMetricas` com `comissaoPercentual: number` e `comissaoMesAtual: number`, sem `tempoMedioPatioDias`
  - `api.listarMesesHistorico(): Promise<HistoricoMes[]>`
  - `rotuloMesCurto(ano, mes)` → `"Set/2026"`, `rotuloMesLongo(ano, mes)` → `"Setembro/2026"`, `intervaloDoMes(ano, mes)` → `{ inicio: '2026-09-01', fim: '2026-09-30' }`, `nomeMesAtual()` → `"outubro"`

- [ ] **Step 1: Atualizar os tipos**

Em `types/index.ts`, na interface `DashboardMetricas`, remova `tempoMedioPatioDias: number;` e, logo depois de `faturamentoMesAtual: number;`, adicione:

```ts
  comissaoPercentual: number;
  comissaoMesAtual: number;
```

No fim do arquivo, adicione:

```ts
export type AbaApp = 'kanban' | 'tabela' | 'dashboard' | 'historico';

export interface HistoricoMes {
  ano: number;
  mes: number; // 1 a 12
  quantidade: number;
  valorTotal: number;
}
```

- [ ] **Step 2: Confirmar que o build quebra no card antigo**

Run: `cd frontend && npm run build`
Expected: FAIL com `Property 'tempoMedioPatioDias' does not exist on type 'DashboardMetricas'` em `DashboardView.tsx`.

- [ ] **Step 3: Criar `utils/meses.ts`**

```ts
const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** "Setembro/2026" — `mes` de 1 a 12. */
export function rotuloMesLongo(ano: number, mes: number): string {
  return `${NOMES_MESES[mes - 1]}/${ano}`;
}

/** "Set/2026" — `mes` de 1 a 12. */
export function rotuloMesCurto(ano: number, mes: number): string {
  return `${NOMES_MESES[mes - 1].slice(0, 3)}/${ano}`;
}

/** Primeiro e último dia do mês em ISO (aaaa-mm-dd), para os filtros da API. */
export function intervaloDoMes(ano: number, mes: number): { inicio: string; fim: string } {
  // Dia 0 do mês seguinte = último dia deste mês (funciona também em dezembro)
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const mm = String(mes).padStart(2, '0');
  return {
    inicio: `${ano}-${mm}-01`,
    fim: `${ano}-${mm}-${String(ultimoDia).padStart(2, '0')}`,
  };
}

/** Nome do mês corrente no fuso da oficina, ex.: "outubro". */
export function nomeMesAtual(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());
}
```

- [ ] **Step 4: Adicionar `listarMesesHistorico` em `api.ts`**

Inclua `HistoricoMes` no `import { ... } from '../types'` e adicione, logo depois de `obterOrdem`:

```ts
  async listarMesesHistorico(): Promise<HistoricoMes[]> {
    return request('/historico/meses');
  },
```

`listarOrdens` e `exportarOrdensUrl` já aceitam qualquer filtro (`Record<string, any>`), então não mudam.

- [ ] **Step 5: Carregar só a operação atual em `App.tsx`**

Em `carregarDadosIniciais`, troque `api.listarOrdens({ ativo: true }),` por:

```ts
        api.listarOrdens({ ativo: true, ocultarEntreguesAnteriores: true }),
```

- [ ] **Step 6: Trocar o card 3 do `DashboardView`**

No import do lucide, troque `Clock,` por `HandCoins,`. Adicione `import { nomeMesAtual } from '../utils/meses';`. Logo depois de `formatarMoeda`, adicione:

```tsx
  const formatarPercentual = (val: number) => `${(val ?? 0).toLocaleString('pt-BR')}%`;
```

Substitua o bloco `{/* 3. Tempo Médio no Pátio */}` inteiro (o `<div>` do card até o seu fechamento) por:

```tsx
        {/* 3. Comissão Mensal */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Comissão Mensal</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <HandCoins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono truncate">
            {formatarMoeda(metricas.comissaoMesAtual)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            <span>
              {formatarPercentual(metricas.comissaoPercentual)} de{' '}
              {formatarMoeda(metricas.faturamentoMesAtual)} faturado em {nomeMesAtual()}
            </span>
          </div>
        </div>
```

- [ ] **Step 7: Build**

Run: `cd frontend && npm run build`
Expected: sucesso, sem erros de tipo. Se aparecer `'HistoricoMes' is declared but never read` vindo de `api.ts`, confira o Step 4: o tipo tem de ser usado no retorno de `listarMesesHistorico`.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/utils/meses.ts frontend/src/types/index.ts frontend/src/services/api.ts frontend/src/App.tsx frontend/src/components/DashboardView.tsx
git commit -m "feat(frontend): exibir comissao mensal e carregar so a operacao do mes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Frontend — aba Histórico

**Files:**
- Create: `frontend/src/components/HistoricoView.tsx`
- Modify: `frontend/src/components/Navbar.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `AbaApp`, `HistoricoMes`, `api.listarMesesHistorico`, `rotuloMesCurto`, `rotuloMesLongo`, `intervaloDoMes` (Task 5); `api.listarOrdens`, `api.exportarOrdensUrl`, `PlacaBadge`, `ModalDetalhes` (já existem)
- Produces: `<HistoricoView onSelecionarOrdem={(o: OrdemServico) => void} onErro={(mensagem: string) => void} />`

- [ ] **Step 1: Criar `HistoricoView.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { History, FileSpreadsheet, FileText } from 'lucide-react';
import { HistoricoMes, OrdemServico } from '../types';
import { api } from '../services/api';
import { PlacaBadge } from './PlacaBadge';
import { intervaloDoMes, rotuloMesCurto, rotuloMesLongo } from '../utils/meses';

interface HistoricoViewProps {
  onSelecionarOrdem: (ordem: OrdemServico) => void;
  onErro: (mensagem: string) => void;
}

const mesmoMes = (a: HistoricoMes | null, b: HistoricoMes) =>
  a !== null && a.ano === b.ano && a.mes === b.mes;

export const HistoricoView: React.FC<HistoricoViewProps> = ({ onSelecionarOrdem, onErro }) => {
  const [meses, setMeses] = useState<HistoricoMes[] | null>(null);
  const [mesSelecionado, setMesSelecionado] = useState<HistoricoMes | null>(null);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [carregandoOrdens, setCarregandoOrdens] = useState(false);

  // Meses disponíveis (o mais recente vem primeiro e já fica selecionado)
  useEffect(() => {
    let cancelado = false;
    api
      .listarMesesHistorico()
      .then((res) => {
        if (cancelado) return;
        setMeses(res);
        setMesSelecionado(res[0] ?? null);
      })
      .catch((err: any) => {
        if (cancelado) return;
        setMeses([]);
        onErro(err.message || 'Falha ao carregar o histórico.');
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Veículos entregues no mês selecionado. O flag `cancelado` descarta respostas
  // atrasadas quando o usuário troca de mês rapidamente.
  useEffect(() => {
    if (!mesSelecionado) {
      setOrdens([]);
      return;
    }
    let cancelado = false;
    const { inicio, fim } = intervaloDoMes(mesSelecionado.ano, mesSelecionado.mes);
    setCarregandoOrdens(true);
    api
      .listarOrdens({ etapas: ['ENTREGUE'], dataSaidaInicio: inicio, dataSaidaFim: fim })
      .then((res) => {
        if (cancelado) return;
        setOrdens([...res].sort((a, b) => (b.dataSaida ?? '').localeCompare(a.dataSaida ?? '')));
      })
      .catch((err: any) => {
        if (!cancelado) onErro(err.message || 'Falha ao carregar os veículos do mês.');
      })
      .finally(() => {
        if (!cancelado) setCarregandoOrdens(false);
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesSelecionado]);

  const exportar = (formato: 'xlsx' | 'csv') => {
    if (!mesSelecionado) return;
    const { inicio, fim } = intervaloDoMes(mesSelecionado.ano, mesSelecionado.mes);
    const url = api.exportarOrdensUrl(formato, {
      etapas: ['ENTREGUE'],
      dataSaidaInicio: inicio,
      dataSaidaFim: fim,
    });
    window.open(url, '_blank');
  };

  const formatarMoeda = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const formatarData = (dataStr?: string) => {
    if (!dataStr) return '-';
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  if (meses === null) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Carregando histórico...</p>
      </div>
    );
  }

  if (meses.length === 0) {
    return (
      <div className="py-20 text-center text-slate-400">
        <History className="w-10 h-10 mx-auto mb-3 text-slate-600" />
        <p className="text-sm">Nenhum veículo entregue ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Seletor de meses */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {meses.map((m) => (
          <button
            key={`${m.ano}-${m.mes}`}
            onClick={() => setMesSelecionado(m)}
            className={`shrink-0 flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              mesmoMes(mesSelecionado, m)
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <span>{rotuloMesCurto(m.ano, m.mes)}</span>
            <span className="font-mono text-[11px] px-1.5 rounded bg-slate-950/60">{m.quantidade}</span>
          </button>
        ))}
      </div>

      {/* Tabela do mês */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Placa</th>
                <th className="py-3.5 px-4">Veículo / Modelo</th>
                <th className="py-3.5 px-4">Origem</th>
                <th className="py-3.5 px-4">Serviço</th>
                <th className="py-3.5 px-4">Entrada</th>
                <th className="py-3.5 px-4">Saída</th>
                <th className="py-3.5 px-4 text-center">Dias</th>
                <th className="py-3.5 px-4 text-right">Valor</th>
                <th className="py-3.5 px-4 text-center">Faturado</th>
                <th className="py-3.5 px-4">NF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {carregandoOrdens ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Carregando veículos do mês...
                  </td>
                </tr>
              ) : (
                ordens.map((ordem) => (
                  <tr
                    key={ordem.id}
                    onClick={() => onSelecionarOrdem(ordem)}
                    className="hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <PlacaBadge placa={ordem.placa} mercosul={ordem.mercosul} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-100 max-w-[200px] truncate">{ordem.modelo}</td>
                    <td className="py-3 px-4 text-slate-300">{ordem.origemNome || '-'}</td>
                    <td className="py-3 px-4 text-sky-400 font-medium">{ordem.tipoServicoNome || '-'}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{formatarData(ordem.dataEntrada)}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{formatarData(ordem.dataSaida)}</td>
                    <td className="py-3 px-4 text-center font-mono text-slate-300">{ordem.diasNoPatio}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                      {formatarMoeda(ordem.valorOrcamento)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={ordem.faturado ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                        {ordem.faturado ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{ordem.numeroNf || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé com totais e exportação */}
        {mesSelecionado && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-slate-800 bg-slate-950/60">
            <span className="text-xs text-slate-300">
              <strong className="text-slate-100">{rotuloMesLongo(mesSelecionado.ano, mesSelecionado.mes)}</strong>
              {' — '}
              {mesSelecionado.quantidade} {mesSelecionado.quantidade === 1 ? 'veículo' : 'veículos'}
              {' — '}
              <strong className="font-mono text-slate-100">{formatarMoeda(mesSelecionado.valorTotal)}</strong>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => exportar('xlsx')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Exportar Excel</span>
              </button>
              <button
                onClick={() => exportar('csv')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4 text-sky-400" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Adicionar a aba na `Navbar`**

Em `Navbar.tsx`:
1. No import do lucide, acrescente `History,`.
2. Troque `import { DashboardMetricas } from '../types';` por `import { AbaApp, DashboardMetricas } from '../types';`.
3. Na interface, troque os dois tipos de aba:

```ts
  abaAtiva: AbaApp;
  setAbaAtiva: (aba: AbaApp) => void;
```

4. Na `<nav>` do desktop, logo depois do botão "Dashboard Executivo", adicione:

```tsx
            <button
              onClick={() => setAbaAtiva('historico')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                abaAtiva === 'historico'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Histórico</span>
            </button>
```

5. Na navegação mobile, logo depois do botão "Métricas", adicione:

```tsx
        <button
          onClick={() => setAbaAtiva('historico')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
            abaAtiva === 'historico' ? 'bg-sky-500/20 text-sky-300 font-bold' : 'text-slate-400'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Histórico</span>
        </button>
```

- [ ] **Step 3: Ligar a aba no `App.tsx`**

1. Adicione `import { HistoricoView } from './components/HistoricoView';` e inclua `AbaApp` no `import { ... } from './types'`.
2. Troque o estado da aba por:

```ts
  const [abaAtiva, setAbaAtiva] = useState<AbaApp>('kanban');
```

3. Logo depois do bloco `{abaAtiva === 'dashboard' && (...)}`, adicione:

```tsx
            {abaAtiva === 'historico' && (
              <HistoricoView
                onSelecionarOrdem={(o) => setOrdemSelecionadaId(o.id)}
                onErro={(mensagem) => adicionarToast(mensagem, 'erro')}
              />
            )}
```

- [ ] **Step 4: Build**

Run: `cd frontend && npm run build`
Expected: sucesso, sem erros de tipo.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/HistoricoView.tsx frontend/src/components/Navbar.tsx frontend/src/App.tsx
git commit -m "feat(frontend): adicionar aba de historico mensal de veiculos entregues" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: README, verificação manual e PR

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Atualizar o README**

Em "Visão Geral e Recursos", logo depois do item "Quadro Kanban Dinâmico (7 Etapas)" e seus subitens, adicione:

```markdown
- **Histórico Mensal de Entregues:**
  - Na virada do mês, os veículos entregues nos meses anteriores saem do Kanban e da Tabela Operacional automaticamente (horário de Brasília).
  - A aba *Histórico* mostra uma tabela por mês (pela data de saída), com total de veículos e valor, e exporta o mês em `.xlsx` ou `.csv`.
```

Em "Dashboard Executivo", troque `tempo médio de permanência` por `comissão mensal (2% sobre o faturado no mês, configurável em `COMISSAO_PERCENTUAL`)`.

Na seção de testes, troque "27 testes" e "Executar suíte de testes (27 testes...)" pela contagem final do Step 2 (esperado: 37).

- [ ] **Step 2: Suíte completa e build**

Run: `cd backend && ./mvnw -q test` e depois `cat target/surefire-reports/*.txt | grep "Tests run"`
Expected: 0 falhas; total de 37 testes.

Run: `cd frontend && npm run build`
Expected: sucesso.

- [ ] **Step 3: Verificação manual no navegador**

1. `docker compose up -d`; `cd backend && ./mvnw spring-boot:run`; `cd frontend && npm run dev`. Abra http://localhost:5174 e faça login.
2. Para ter um entregue de mês anterior no banco local, rode (altera só os dados de demonstração locais):

```bash
docker exec rfleet-postgres psql -U rfleet -d rfleet -c "UPDATE ordens_servico SET data_saida = date_trunc('month', CURRENT_DATE)::date - 5 WHERE id = (SELECT id FROM ordens_servico WHERE etapa = 'ENTREGUE' AND ativo ORDER BY id LIMIT 1) RETURNING id, data_saida;"
```

3. **Kanban:** a OS alterada não aparece mais na coluna Entregue. **Tabela Operacional:** também não.
4. **Histórico:** aparecem os meses atual e anterior. O mês anterior lista a OS alterada, com total e valor no rodapé. Clique numa linha e confira que o painel de detalhes abre. Clique rápido entre os meses e confira que a tabela termina mostrando o último mês clicado (Review Focus 5). Clique em Exportar Excel e em Exportar CSV e confira que o arquivo traz só os veículos do mês.
5. **Dashboard:** o card "Comissão Mensal" mostra R$ e "2% de R$ X faturado em <mês>", e X é igual ao card "Faturado no Mês".
6. Repita os passos 3 a 5 com a janela do navegador em 375px de largura: a aba Histórico aparece na barra inferior, os meses rolam na horizontal e a página não rola na horizontal.

- [ ] **Step 4: Commit, push e PR**

```bash
git add README.md
git commit -m "docs: documentar historico mensal de entregues e comissao mensal" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin feat/historico-mensal-comissao
gh pr create --base main --head feat/historico-mensal-comissao --title "feat: historico mensal de entregues e comissao mensal" --body "<resumo das mudanças, testes executados e verificação manual; terminar com: 🤖 Generated with [Claude Code](https://claude.com/claude-code)>"
```

- [ ] **Step 5: CI e merge**

Run: `gh pr checks --watch`
Expected: "Backend Test & Build" e "Frontend Typecheck & Build" passam.

Com o CI verde: `gh pr merge --rebase --delete-branch`, depois `git switch main && git pull --ff-only && git fetch --prune`.
