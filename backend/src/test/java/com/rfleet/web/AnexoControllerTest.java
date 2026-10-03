package com.rfleet.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rfleet.dto.AnexoOsDTO;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AnexoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String tokenJwt;
    private Long ordemServicoId;

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

        // Criar uma OS para os testes de anexos
        RegistrarEntradaRequest request = RegistrarEntradaRequest.builder()
                .placa("ANX1A01")
                .modelo("Renault Kwid")
                .valorOrcamento(new BigDecimal("900.00"))
                .build();

        MvcResult osResult = mockMvc.perform(post("/api/ordens-servico")
                        .header("Authorization", "Bearer " + tokenJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String idStr = objectMapper.readTree(osResult.getResponse().getContentAsString()).get("id").asText();
        this.ordemServicoId = Long.parseLong(idStr);
    }

    @Test
    @DisplayName("Deve fazer upload, listar, baixar e excluir anexo da Ordem de Serviço")
    void deveGerenciarCicloDeVidaDeAnexos() throws Exception {
        MockMultipartFile arquivo = new MockMultipartFile(
                "arquivo",
                "laudo_vistoria.pdf",
                "application/pdf",
                "Conteúdo binário simulado do laudo em PDF".getBytes()
        );

        // 1. Upload
        MvcResult uploadResult = mockMvc.perform(multipart("/api/ordens-servico/" + ordemServicoId + "/anexos")
                        .file(arquivo)
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nomeArquivo").value("laudo_vistoria.pdf"))
                .andExpect(jsonPath("$.tipoConteudo").value("application/pdf"))
                .andExpect(jsonPath("$.ordemServicoId").value(ordemServicoId))
                .andReturn();

        AnexoOsDTO anexoDTO = objectMapper.readValue(
                uploadResult.getResponse().getContentAsString(),
                AnexoOsDTO.class
        );

        // 2. Listar anexos da OS
        mockMvc.perform(get("/api/ordens-servico/" + ordemServicoId + "/anexos")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(anexoDTO.getId()))
                .andExpect(jsonPath("$[0].nomeArquivo").value("laudo_vistoria.pdf"));

        // 3. Download do anexo
        mockMvc.perform(get("/api/anexos/" + anexoDTO.getId() + "/download")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/pdf"))
                .andExpect(header().exists("Content-Disposition"));

        // 4. Excluir anexo
        mockMvc.perform(delete("/api/anexos/" + anexoDTO.getId())
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isNoContent());

        // 5. Verificar que a lista ficou vazia
        mockMvc.perform(get("/api/ordens-servico/" + ordemServicoId + "/anexos")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }
}
