package com.rfleet.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rfleet.support.GestorDeTeste;
import com.rfleet.dto.RegistrarEntradaRequest;
import com.rfleet.dto.SalvarVeiculoRequest;
import com.rfleet.repository.VeiculoRepository;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class VeiculoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private GestorDeTeste gestorDeTeste;

    @Autowired
    private VeiculoRepository veiculoRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PersistenceContext
    private EntityManager entityManager;

    private String tokenJwt;

    @BeforeEach
    void setUp() throws Exception {
        this.tokenJwt = gestorDeTeste.obterToken(mockMvc);
    }

    @Test
    @DisplayName("Deve cadastrar veículo e buscar por placa com sucesso")
    void deveCadastrarEBuscarVeiculoPorPlaca() throws Exception {
        SalvarVeiculoRequest request = SalvarVeiculoRequest.builder()
                .placa("BRA2E19")
                .modelo("Chevrolet Tracker 1.2 Turbo")
                .origemId(5L) // Movida
                .build();

        // 1. Cadastrar
        mockMvc.perform(post("/api/veiculos")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.placa").value("BRA2E19"))
                .andExpect(jsonPath("$.modelo").value("CHEVROLET TRACKER 1.2 TURBO"))
                .andExpect(jsonPath("$.mercosul").value(true));

        // 2. Buscar por placa digitada com traço e minúsculas (ex: bra-2e19)
        mockMvc.perform(get("/api/veiculos/buscar-placa/bra-2e19")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.encontrado").value(true))
                .andExpect(jsonPath("$.placa").value("BRA2E19"))
                .andExpect(jsonPath("$.modelo").value("CHEVROLET TRACKER 1.2 TURBO"))
                .andExpect(jsonPath("$.possuiOsAtiva").value(false));
    }

    @Test
    @DisplayName("Deve retornar encontrado=false para placa ainda não cadastrada")
    void deveRetornarEncontradoFalsoParaPlacaInexistente() throws Exception {
        mockMvc.perform(get("/api/veiculos/buscar-placa/XYZ9988")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.encontrado").value(false))
                .andExpect(jsonPath("$.placa").value("XYZ9988"))
                .andExpect(jsonPath("$.placaFormatada").value("XYZ-9988"))
                .andExpect(jsonPath("$.possuiOsAtiva").value(false));
    }

    @Test
    @DisplayName("Deve rejeitar busca com formato de placa inválido retornando 400")
    void deveRejeitarPlacaInvalida() throws Exception {
        mockMvc.perform(get("/api/veiculos/buscar-placa/PLACAINVALIDA123")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Deve listar veículos com filtro por termo")
    void deveListarVeiculosPorTermo() throws Exception {
        mockMvc.perform(get("/api/veiculos?termo=Tracker")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("Excluir veículo apaga junto as ordens de serviço, o histórico e os anexos dele")
    void deveExcluirVeiculoComOrdensHistoricoEAnexos() throws Exception {
        RegistrarEntradaRequest entrada = RegistrarEntradaRequest.builder()
                .placa("EXC1A01")
                .modelo("Fiat Mobi")
                .valorOrcamento(new BigDecimal("500.00"))
                .build();

        MvcResult osResult = mockMvc.perform(post("/api/ordens-servico")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(entrada)))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode os = objectMapper.readTree(osResult.getResponse().getContentAsString());
        long ordemId = os.get("id").asLong();
        long veiculoId = os.get("veiculoId").asLong();

        mockMvc.perform(multipart("/api/ordens-servico/" + ordemId + "/anexos")
                        .file(new MockMultipartFile("arquivo", "laudo.pdf", "application/pdf", new byte[]{1, 2, 3}))
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isCreated());

        mockMvc.perform(delete("/api/veiculos/" + veiculoId)
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isNoContent());
        // O Hibernate só envia o DELETE no flush; as contagens abaixo são SQL puro e não disparam flush
        entityManager.flush();

        assertThat(contar("SELECT COUNT(*) FROM veiculos WHERE id = ?", veiculoId)).isZero();
        assertThat(contar("SELECT COUNT(*) FROM ordens_servico WHERE id = ?", ordemId)).isZero();
        assertThat(contar("SELECT COUNT(*) FROM historico_etapas WHERE ordem_servico_id = ?", ordemId)).isZero();
        assertThat(contar("SELECT COUNT(*) FROM anexos_os WHERE ordem_servico_id = ?", ordemId)).isZero();
    }

    @Test
    @DisplayName("Excluir veículo inexistente retorna 404")
    void deveRetornar404AoExcluirVeiculoInexistente() throws Exception {
        mockMvc.perform(delete("/api/veiculos/999999999")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.mensagem").value("Veículo não encontrado com ID: 999999999"));
    }

    @Test
    @DisplayName("Excluir veículo sem token JWT retorna 401")
    void deveRejeitarExclusaoSemToken() throws Exception {
        mockMvc.perform(delete("/api/veiculos/1"))
                .andExpect(status().isUnauthorized());
    }

    private int contar(String sql, long id) {
        return jdbcTemplate.queryForObject(sql, Integer.class, id);
    }
}
