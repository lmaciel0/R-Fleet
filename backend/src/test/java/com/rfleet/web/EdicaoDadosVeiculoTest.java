package com.rfleet.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rfleet.domain.Origem;
import com.rfleet.domain.TipoServico;
import com.rfleet.dto.AtualizarDadosVeiculoRequest;
import com.rfleet.dto.RegistrarEntradaRequest;
import com.rfleet.repository.OrigemRepository;
import com.rfleet.repository.TipoServicoRepository;
import com.rfleet.support.GestorDeTeste;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class EdicaoDadosVeiculoTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private GestorDeTeste gestorDeTeste;

    @Autowired
    private OrigemRepository origemRepository;

    @Autowired
    private TipoServicoRepository tipoServicoRepository;

    private String tokenJwt;
    private Origem origemA;
    private Origem origemB;
    private TipoServico tipoA;
    private TipoServico tipoB;

    @BeforeEach
    void setUp() throws Exception {
        this.tokenJwt = gestorDeTeste.obterToken(mockMvc);
        String sufixo = UUID.randomUUID().toString().substring(0, 8);
        origemA = origemRepository.save(Origem.builder().nome("Locadora A " + sufixo).build());
        origemB = origemRepository.save(Origem.builder().nome("Locadora B " + sufixo).build());
        tipoA = tipoServicoRepository.save(TipoServico.builder().nome("Funilaria " + sufixo).build());
        tipoB = tipoServicoRepository.save(TipoServico.builder().nome("Mecânica " + sufixo).build());
    }

    @Test
    @DisplayName("Corrige placa, modelo, origem e tipo de serviço e registra a correção na linha do tempo")
    void deveCorrigirOsQuatroCampos() throws Exception {
        long id = registrarEntrada("EDT1A01", "Fiat Uno", origemA, tipoA);

        corrigir(id, "EDT1A02", "Fiat Mobi", origemB.getId(), tipoB.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.placa").value("EDT1A02"))
                .andExpect(jsonPath("$.modelo").value("FIAT MOBI"))
                .andExpect(jsonPath("$.origemId").value(origemB.getId()))
                .andExpect(jsonPath("$.origemNome").value(origemB.getNome()))
                .andExpect(jsonPath("$.tipoServicoId").value(tipoB.getId()))
                .andExpect(jsonPath("$.tipoServicoNome").value(tipoB.getNome()));

        mockMvc.perform(get("/api/ordens-servico/" + id).header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.placa").value("EDT1A02"))
                .andExpect(jsonPath("$.modelo").value("FIAT MOBI"))
                .andExpect(jsonPath("$.origemId").value(origemB.getId()))
                .andExpect(jsonPath("$.tipoServicoId").value(tipoB.getId()));

        mockMvc.perform(get("/api/ordens-servico/" + id + "/historico").header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].observacao", hasItem(
                        "Dados corrigidos: placa EDT1A01 → EDT1A02; modelo FIAT UNO → FIAT MOBI; origem "
                                + origemA.getNome() + " → " + origemB.getNome()
                                + "; tipo de serviço " + tipoA.getNome() + " → " + tipoB.getNome() + ".")));
    }

    @Test
    @DisplayName("Corrige só o modelo e a nota cita apenas o que mudou")
    void deveRegistrarApenasOQueMudou() throws Exception {
        long id = registrarEntrada("EDT1A03", "Fiat Uno", origemA, tipoA);

        corrigir(id, "EDT1A03", "Fiat Argo", origemA.getId(), tipoA.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.modelo").value("FIAT ARGO"));

        mockMvc.perform(get("/api/ordens-servico/" + id + "/historico").header("Authorization", "Bearer " + tokenJwt))
                .andExpect(jsonPath("$[*].observacao", hasItem("Dados corrigidos: modelo FIAT UNO → FIAT ARGO.")));
    }

    @Test
    @DisplayName("Sem nenhuma mudança (mesmo com a placa digitada de outro jeito) não cria registro na linha do tempo")
    void naoDeveRegistrarQuandoNadaMudou() throws Exception {
        long id = registrarEntrada("EDT1A04", "Fiat Uno", origemA, tipoA);

        corrigir(id, "edt-1a04", "fiat uno", origemA.getId(), tipoA.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.placa").value("EDT1A04"));

        mockMvc.perform(get("/api/ordens-servico/" + id + "/historico").header("Authorization", "Bearer " + tokenJwt))
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    @DisplayName("Origem e tipo podem ser limpos")
    void deveLimparOrigemETipo() throws Exception {
        long id = registrarEntrada("EDT1A05", "Fiat Uno", origemA, tipoA);

        corrigir(id, "EDT1A05", "Fiat Uno", null, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.origemId").value(nullValue()))
                .andExpect(jsonPath("$.tipoServicoId").value(nullValue()));

        mockMvc.perform(get("/api/ordens-servico/" + id + "/historico").header("Authorization", "Bearer " + tokenJwt))
                .andExpect(jsonPath("$[*].observacao", hasItem(
                        "Dados corrigidos: origem " + origemA.getNome() + " → não informada; tipo de serviço "
                                + tipoA.getNome() + " → não informado.")));
    }

    @Test
    @DisplayName("Placa que já pertence a outro veículo retorna 409 e nada muda")
    void deveRejeitarPlacaDeOutroVeiculo() throws Exception {
        long id = registrarEntrada("EDT1A06", "Fiat Uno", origemA, tipoA);
        registrarEntrada("EDT1A07", "VW Gol", origemA, tipoA);

        corrigir(id, "EDT1A07", "Fiat Uno", origemA.getId(), tipoA.getId())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensagem").value("Já existe outro veículo cadastrado com a placa EDT1A07."));

        mockMvc.perform(get("/api/ordens-servico/" + id).header("Authorization", "Bearer " + tokenJwt))
                .andExpect(jsonPath("$.placa").value("EDT1A06"));
    }

    @Test
    @DisplayName("Placa em formato inválido retorna 400")
    void deveRejeitarPlacaInvalida() throws Exception {
        long id = registrarEntrada("EDT1A08", "Fiat Uno", origemA, tipoA);

        corrigir(id, "123", "Fiat Uno", origemA.getId(), tipoA.getId())
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Modelo em branco retorna 400")
    void deveRejeitarModeloEmBranco() throws Exception {
        long id = registrarEntrada("EDT1A09", "Fiat Uno", origemA, tipoA);

        corrigir(id, "EDT1A09", "   ", origemA.getId(), tipoA.getId())
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Origem ou tipo de serviço inexistente retorna 400")
    void deveRejeitarOrigemETipoInexistentes() throws Exception {
        long id = registrarEntrada("EDT1A10", "Fiat Uno", origemA, tipoA);

        corrigir(id, "EDT1A10", "Fiat Uno", 999999999L, tipoA.getId())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Origem não encontrada com ID: 999999999"));
        corrigir(id, "EDT1A10", "Fiat Uno", origemA.getId(), 999999999L)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Tipo de serviço não encontrado com ID: 999999999"));
    }

    @Test
    @DisplayName("OS inexistente retorna 404")
    void deveRetornar404ParaOsInexistente() throws Exception {
        corrigir(999999999L, "EDT1A11", "Fiat Uno", null, null)
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Sem token JWT retorna 401")
    void deveExigirToken() throws Exception {
        mockMvc.perform(patch("/api/ordens-servico/1/dados")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    private ResultActions corrigir(long id, String placa, String modelo, Long origemId, Long tipoServicoId) throws Exception {
        AtualizarDadosVeiculoRequest request = AtualizarDadosVeiculoRequest.builder()
                .placa(placa)
                .modelo(modelo)
                .origemId(origemId)
                .tipoServicoId(tipoServicoId)
                .build();
        return mockMvc.perform(patch("/api/ordens-servico/" + id + "/dados")
                .header("Authorization", "Bearer " + tokenJwt)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));
    }

    private long registrarEntrada(String placa, String modelo, Origem origem, TipoServico tipo) throws Exception {
        RegistrarEntradaRequest request = RegistrarEntradaRequest.builder()
                .placa(placa)
                .modelo(modelo)
                .origemId(origem.getId())
                .tipoServicoId(tipo.getId())
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
}
