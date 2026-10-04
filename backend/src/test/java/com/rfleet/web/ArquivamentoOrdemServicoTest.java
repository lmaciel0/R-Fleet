package com.rfleet.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rfleet.domain.EtapaOrdemServico;
import com.rfleet.dto.ArquivamentoRequest;
import com.rfleet.dto.AtualizarEtapaRequest;
import com.rfleet.dto.RegistrarEntradaRequest;
import com.rfleet.support.GestorDeTeste;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import jakarta.persistence.EntityManager;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ArquivamentoOrdemServicoTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private GestorDeTeste gestorDeTeste;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private String tokenJwt;

    @BeforeEach
    void setUp() throws Exception {
        this.tokenJwt = gestorDeTeste.obterToken(mockMvc);
    }

    @Test
    @DisplayName("Arquivar tira a OS da operação, registra o motivo na linha do tempo e a lista em ativo=false")
    void deveArquivarComMotivo() throws Exception {
        long id = registrarEntrada("ARQ1A01");

        alterarArquivamento(id, true, "Entrada em duplicidade")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ativo").value(false));

        mockMvc.perform(get("/api/ordens-servico?termo=ARQ1A01").header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", not(hasItem((int) id))));

        mockMvc.perform(get("/api/ordens-servico?ativo=false&termo=ARQ1A01").header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem((int) id)));

        mockMvc.perform(get("/api/ordens-servico/" + id + "/historico").header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].observacao", hasItem("OS arquivada. Motivo: Entrada em duplicidade")));
    }

    @Test
    @DisplayName("Arquivar sem motivo retorna 400")
    void deveExigirMotivoParaArquivar() throws Exception {
        long id = registrarEntrada("ARQ1A02");

        alterarArquivamento(id, true, "   ")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Informe o motivo do arquivamento."));
    }

    @Test
    @DisplayName("Restaurar devolve a OS à operação e registra na linha do tempo")
    void deveRestaurar() throws Exception {
        long id = registrarEntrada("ARQ1A03");
        alterarArquivamento(id, true, "Cliente desistiu").andExpect(status().isOk());

        alterarArquivamento(id, false, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ativo").value(true));

        mockMvc.perform(get("/api/ordens-servico/" + id + "/historico").header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].observacao", hasItem("OS restaurada.")));
    }

    @Test
    @DisplayName("Não restaura OS em aberto se o veículo já tem outra OS em aberto")
    void deveBloquearRestauracaoComOutraOsAberta() throws Exception {
        long arquivada = registrarEntrada("ARQ1A04");
        alterarArquivamento(arquivada, true, "Lançada errado").andExpect(status().isOk());
        long nova = registrarEntrada("ARQ1A04");

        alterarArquivamento(arquivada, false, null)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensagem").value(
                        "O veículo de placa ARQ1A04 já possui uma Ordem de Serviço em aberto (#" + nova
                                + "). Arquive ou entregue essa OS antes de restaurar esta."));
    }

    @Test
    @DisplayName("Restaura OS entregue mesmo com outra OS em aberto do mesmo veículo")
    void deveRestaurarEntregueComOutraOsAberta() throws Exception {
        long entregue = registrarEntrada("ARQ1A05");
        mockMvc.perform(patch("/api/ordens-servico/" + entregue + "/etapa")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                AtualizarEtapaRequest.builder().novaEtapa(EtapaOrdemServico.ENTREGUE).build())))
                .andExpect(status().isOk());
        alterarArquivamento(entregue, true, "Teste").andExpect(status().isOk());
        registrarEntrada("ARQ1A05");

        alterarArquivamento(entregue, false, null).andExpect(status().isOk());
    }

    @Test
    @DisplayName("Arquivar OS já arquivada retorna 409")
    void deveRejeitarArquivarDuasVezes() throws Exception {
        long id = registrarEntrada("ARQ1A06");
        alterarArquivamento(id, true, "Primeira vez").andExpect(status().isOk());

        alterarArquivamento(id, true, "Segunda vez")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensagem").value("A ordem de serviço já está arquivada."));
    }

    @Test
    @DisplayName("Arquivar OS inexistente retorna 404")
    void deveRetornar404ParaOsInexistente() throws Exception {
        alterarArquivamento(999999999L, true, "Qualquer")
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Excluir OS arquivada apaga a OS, o histórico e os anexos, mas mantém o veículo")
    void deveExcluirOsArquivada() throws Exception {
        long id = registrarEntrada("ARQ1A07");
        mockMvc.perform(multipart("/api/ordens-servico/" + id + "/anexos")
                        .file(new MockMultipartFile("arquivo", "laudo.pdf", "application/pdf", new byte[]{1, 2, 3}))
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isCreated());
        alterarArquivamento(id, true, "Lançada em duplicidade").andExpect(status().isOk());

        mockMvc.perform(delete("/api/ordens-servico/" + id).header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isNoContent());
        // O Hibernate só envia o DELETE no flush; as contagens abaixo são SQL puro e não disparam flush
        entityManager.flush();

        assertThat(contar("SELECT COUNT(*) FROM ordens_servico WHERE id = ?", id)).isZero();
        assertThat(contar("SELECT COUNT(*) FROM historico_etapas WHERE ordem_servico_id = ?", id)).isZero();
        assertThat(contar("SELECT COUNT(*) FROM anexos_os WHERE ordem_servico_id = ?", id)).isZero();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM veiculos WHERE placa = 'ARQ1A07'", Integer.class)).isEqualTo(1);
    }

    @Test
    @DisplayName("Excluir OS que não está arquivada retorna 409")
    void deveRejeitarExclusaoDeOsAtiva() throws Exception {
        long id = registrarEntrada("ARQ1A08");

        mockMvc.perform(delete("/api/ordens-servico/" + id).header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensagem").value("Só é possível excluir uma ordem de serviço arquivada."));
    }

    @Test
    @DisplayName("Excluir OS inexistente retorna 404")
    void deveRetornar404AoExcluirOsInexistente() throws Exception {
        mockMvc.perform(delete("/api/ordens-servico/999999999").header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Excluir OS sem token JWT retorna 401")
    void deveRejeitarExclusaoSemToken() throws Exception {
        mockMvc.perform(delete("/api/ordens-servico/1"))
                .andExpect(status().isUnauthorized());
    }

    private int contar(String sql, long id) {
        return jdbcTemplate.queryForObject(sql, Integer.class, id);
    }

    private long registrarEntrada(String placa) throws Exception {
        RegistrarEntradaRequest request = RegistrarEntradaRequest.builder()
                .placa(placa)
                .modelo("Fiat Uno")
                .valorOrcamento(new BigDecimal("100.00"))
                .build();
        String corpo = mockMvc.perform(post("/api/ordens-servico")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(corpo).get("id").asLong();
    }

    private ResultActions alterarArquivamento(long id, boolean arquivada, String motivo) throws Exception {
        return mockMvc.perform(patch("/api/ordens-servico/" + id + "/arquivamento")
                .header("Authorization", "Bearer " + tokenJwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ArquivamentoRequest(arquivada, motivo))));
    }
}
