package com.rfleet.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rfleet.dto.LoginRequest;
import com.rfleet.dto.LoginResponse;
import com.rfleet.dto.RegistrarEntradaRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ImportExportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String tokenJwt;

    @BeforeEach
    void setUp() throws Exception {
        LoginRequest loginRequest = LoginRequest.builder()
                .email("rodrigoaffalcao@gmail.com")
                .senha("rfleet99")
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

        RegistrarEntradaRequest osExemplo = RegistrarEntradaRequest.builder()
                .placa("EXP1A01")
                .modelo("Hyundai HB20 1.0 Sense")
                .origemId(5L)
                .tipoServicoId(1L)
                .valorOrcamento(new BigDecimal("1800.00"))
                .build();

        mockMvc.perform(post("/api/ordens-servico")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(osExemplo)))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("Deve importar ordens de serviço a partir de arquivo CSV legado")
    void deveImportarPlanilhaCsvComSucesso() throws Exception {
        // Col A: OS; Col B: Placa; Col C: Modelo; Col D: Origem; Col E: Tipo Servico; Col F: Etapa; Col G: Data Entrada; Col H: Data Saída; Col I: Orçamento; Col J: Faturado; Col K: Obs
        String csvConteudo = """
                OS;Placa;Modelo;Origem;Tipo de Serviço;Etapa;Data Entrada;Data Saída;Valor Orçado;Faturado;Observações
                1;IMP1A01;Fiat Argo 1.3 Drive;Localiza;Mecânica;Aguardando Orçamento;01/10/2026;;1200,00;Não;Troca de amortecedores
                2;IMP1A02;Jeep Renegade Sport;Movida;Funilaria;Em Serviço;28/09/2026;;4500,50;Sim;Pintura lateral esquerda
                """;

        MockMultipartFile arquivo = new MockMultipartFile(
                "arquivo",
                "planilha_legada.csv",
                "text/csv",
                csvConteudo.getBytes(StandardCharsets.UTF_8)
        );

        mockMvc.perform(multipart("/api/importacao/planilha")
                        .file(arquivo)
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalLinhasLidas").value(2))
                .andExpect(jsonPath("$.totalImportadas").value(2))
                .andExpect(jsonPath("$.totalErros").value(0));

        // Verificar se os veículos importados aparecem na busca
        mockMvc.perform(get("/api/veiculos/buscar-placa/IMP1A01")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.encontrado").value(true))
                .andExpect(jsonPath("$.modelo").value("FIAT ARGO 1.3 DRIVE"));
    }

    @Test
    @DisplayName("Deve exportar ordens de serviço em formato XLSX e CSV")
    void deveExportarOrdensEmXlsxECsv() throws Exception {
        // 1. Exportar XLSX
        mockMvc.perform(get("/api/exportacao/ordens-servico?formato=xlsx")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .andExpect(header().exists("Content-Disposition"));

        // 2. Exportar CSV
        mockMvc.perform(get("/api/exportacao/ordens-servico?formato=csv")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "text/csv;charset=UTF-8"))
                .andExpect(header().exists("Content-Disposition"));
    }
}
