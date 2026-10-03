package com.rfleet.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rfleet.dto.AnexoOsDTO;
import com.rfleet.support.GestorDeTeste;
import com.rfleet.dto.RegistrarEntradaRequest;
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
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
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

    @Autowired
    private GestorDeTeste gestorDeTeste;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PersistenceContext
    private EntityManager entityManager;

    private String tokenJwt;
    private Long ordemServicoId;

    @BeforeEach
    void setUp() throws Exception {
        this.tokenJwt = gestorDeTeste.obterToken(mockMvc);

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

    private static final int OITO_MB = 8 * 1024 * 1024;

    @Test
    @DisplayName("Rejeita anexo acima de 8 MB com 413")
    void deveRejeitarAnexoAcimaDoLimite() throws Exception {
        MockMultipartFile grande = new MockMultipartFile("arquivo", "grande.pdf", "application/pdf", new byte[OITO_MB + 1]);

        mockMvc.perform(multipart("/api/ordens-servico/" + ordemServicoId + "/anexos")
                        .file(grande)
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().is(413))
                .andExpect(jsonPath("$.mensagem").value("O arquivo excede o tamanho máximo permitido de 8 MB."));
    }

    @Test
    @DisplayName("Aceita anexo de exatamente 8 MB")
    void deveAceitarAnexoNoLimite() throws Exception {
        MockMultipartFile noLimite = new MockMultipartFile("arquivo", "limite.pdf", "application/pdf", new byte[OITO_MB]);

        Long anexoId = enviarAnexo(noLimite);

        assertThat(linhasDeConteudo(anexoId)).isEqualTo(1);
    }

    private Long enviarAnexo(MockMultipartFile arquivo) throws Exception {
        MvcResult result = mockMvc.perform(multipart("/api/ordens-servico/" + ordemServicoId + "/anexos")
                        .file(arquivo)
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private int linhasDeConteudo(Long anexoId) {
        return jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM anexos_conteudo WHERE anexo_id = ?", Integer.class, anexoId);
    }

    @Test
    @DisplayName("Guarda o conteúdo no banco e o download devolve exatamente os mesmos bytes")
    void deveGuardarOConteudoNoBancoEBaixarOsMesmosBytes() throws Exception {
        byte[] todosOsBytes = new byte[256];
        for (int i = 0; i < todosOsBytes.length; i++) {
            todosOsBytes[i] = (byte) i;
        }

        Long anexoId = enviarAnexo(new MockMultipartFile("arquivo", "foto.jpg", "image/jpeg", todosOsBytes));

        assertThat(linhasDeConteudo(anexoId)).isEqualTo(1);

        mockMvc.perform(get("/api/anexos/" + anexoId + "/download")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/jpeg"))
                .andExpect(content().bytes(todosOsBytes));
    }

    @Test
    @DisplayName("Excluir o anexo remove também o conteúdo do banco")
    void deveExcluirOConteudoJuntoComOAnexo() throws Exception {
        Long anexoId = enviarAnexo(new MockMultipartFile("arquivo", "nota.pdf", "application/pdf", new byte[]{1, 2, 3}));

        mockMvc.perform(delete("/api/anexos/" + anexoId).header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isNoContent());
        // O Hibernate só envia o DELETE no flush; a consulta abaixo é SQL puro e não dispara flush
        entityManager.flush();

        assertThat(linhasDeConteudo(anexoId)).isZero();
    }

    @Test
    @DisplayName("Anexo sem conteúdo no banco (gravado em disco antes da V6) responde 404")
    void deveResponder404QuandoOAnexoNaoTemConteudo() throws Exception {
        Long anexoId = jdbcTemplate.queryForObject(
                "INSERT INTO anexos_os (ordem_servico_id, nome_arquivo, tipo_conteudo, tamanho_bytes) "
                        + "VALUES (?, 'antigo.pdf', 'application/pdf', 10) RETURNING id",
                Long.class, ordemServicoId);

        mockMvc.perform(get("/api/anexos/" + anexoId + "/download")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.mensagem").value("Conteúdo do anexo não encontrado: antigo.pdf"));
    }

    @Test
    @DisplayName("Download mantém o nome com acento no Content-Disposition")
    void deveManterNomeComAcentoNoDownload() throws Exception {
        Long anexoId = enviarAnexo(new MockMultipartFile("arquivo", "orçamento.pdf", "application/pdf", new byte[]{9}));

        mockMvc.perform(get("/api/anexos/" + anexoId + "/download")
                        .header("Authorization", "Bearer " + tokenJwt))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", containsString("filename*=UTF-8''or%C3%A7amento.pdf")));
    }
}
