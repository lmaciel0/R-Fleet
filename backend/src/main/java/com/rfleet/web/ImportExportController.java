package com.rfleet.web;

import com.rfleet.domain.EtapaOrdemServico;
import com.rfleet.dto.FiltroOrdensServico;
import com.rfleet.dto.ImportacaoResultadoDTO;
import com.rfleet.dto.OrdemServicoDTO;
import com.rfleet.service.ExportadorService;
import com.rfleet.service.ImportadorPlanilhaService;
import com.rfleet.service.OrdemServicoService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
public class ImportExportController {

    private final ImportadorPlanilhaService importadorPlanilhaService;
    private final ExportadorService exportadorService;
    private final OrdemServicoService ordemServicoService;

    public ImportExportController(
            ImportadorPlanilhaService importadorPlanilhaService,
            ExportadorService exportadorService,
            OrdemServicoService ordemServicoService
    ) {
        this.importadorPlanilhaService = importadorPlanilhaService;
        this.exportadorService = exportadorService;
        this.ordemServicoService = ordemServicoService;
    }

    @PostMapping(value = "/api/importacao/planilha", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportacaoResultadoDTO> importarPlanilha(
            @RequestParam("arquivo") MultipartFile arquivo,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String email = userDetails != null ? userDetails.getUsername() : null;
        ImportacaoResultadoDTO resultado = importadorPlanilhaService.importar(arquivo, email);
        return ResponseEntity.ok(resultado);
    }

    @GetMapping("/api/exportacao/ordens-servico")
    public ResponseEntity<byte[]> exportarOrdensServico(
            @RequestParam(defaultValue = "xlsx") String formato,
            @RequestParam(required = false) String termo,
            @RequestParam(required = false) List<EtapaOrdemServico> etapas,
            @RequestParam(required = false) Long origemId,
            @RequestParam(required = false) Long tipoServicoId,
            @RequestParam(required = false) Boolean faturado,
            @RequestParam(required = false) Boolean concluido,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataEntradaInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataEntradaFim,
            @RequestParam(required = false) Boolean emAtraso,
            @RequestParam(required = false, defaultValue = "true") Boolean ativo
    ) throws IOException {
        FiltroOrdensServico filtro = new FiltroOrdensServico(
                termo, etapas, origemId, tipoServicoId, faturado, concluido,
                dataEntradaInicio, dataEntradaFim, emAtraso, ativo
        );
        List<OrdemServicoDTO> ordens = ordemServicoService.listar(filtro);

        String timestamp = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));

        if ("csv".equalsIgnoreCase(formato)) {
            byte[] bytes = exportadorService.exportarCsv(ordens);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"rfleet_ordens_" + timestamp + ".csv\"")
                    .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                    .body(bytes);
        } else {
            byte[] bytes = exportadorService.exportarXlsx(ordens);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"rfleet_ordens_" + timestamp + ".xlsx\"")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(bytes);
        }
    }
}
