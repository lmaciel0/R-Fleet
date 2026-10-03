package com.rfleet.web;

import com.rfleet.domain.AnexoOs;
import com.rfleet.dto.AnexoOsDTO;
import com.rfleet.service.AnexoService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
public class AnexoController {

    private final AnexoService anexoService;

    public AnexoController(AnexoService anexoService) {
        this.anexoService = anexoService;
    }

    @PostMapping(value = "/api/ordens-servico/{ordemServicoId}/anexos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AnexoOsDTO> uploadAnexo(
            @PathVariable Long ordemServicoId,
            @RequestParam("arquivo") MultipartFile arquivo,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String email = userDetails != null ? userDetails.getUsername() : null;
        AnexoOsDTO dto = anexoService.salvarAnexo(ordemServicoId, arquivo, email);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @GetMapping("/api/ordens-servico/{ordemServicoId}/anexos")
    public ResponseEntity<List<AnexoOsDTO>> listarPorOrdemServico(@PathVariable Long ordemServicoId) {
        return ResponseEntity.ok(anexoService.listarPorOrdemServico(ordemServicoId));
    }

    @GetMapping("/api/anexos/{id}/download")
    public ResponseEntity<Resource> downloadAnexo(@PathVariable Long id) throws IOException {
        AnexoOs anexo = anexoService.obterEntidadePorId(id);
        Resource recurso = anexoService.carregarConteudo(anexo);

        String nomeCodificado = URLEncoder.encode(anexo.getNomeArquivo(), StandardCharsets.UTF_8).replace("+", "%20");

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(anexo.getTipoConteudo()))
                .contentLength(recurso.contentLength())
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + anexo.getNomeArquivo() + "\"; filename*=UTF-8''" + nomeCodificado)
                .body(recurso);
    }

    @DeleteMapping("/api/anexos/{id}")
    public ResponseEntity<Void> excluirAnexo(@PathVariable Long id) {
        anexoService.excluirAnexo(id);
        return ResponseEntity.noContent().build();
    }
}
