package com.rfleet.web;

import com.rfleet.domain.EtapaOrdemServico;
import com.rfleet.dto.*;
import com.rfleet.service.OrdemServicoService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/ordens-servico")
public class OrdemServicoController {

    private final OrdemServicoService ordemServicoService;

    public OrdemServicoController(OrdemServicoService ordemServicoService) {
        this.ordemServicoService = ordemServicoService;
    }

    /**
     * Registra a entrada do veículo na oficina (< 30s).
     */
    @PostMapping
    public ResponseEntity<OrdemServicoDTO> registrarEntrada(
            @Valid @RequestBody RegistrarEntradaRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String email = userDetails != null ? userDetails.getUsername() : null;
        OrdemServicoDTO dto = ordemServicoService.registrarEntrada(request, email);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    /**
     * Listagem com múltiplos filtros para a tela principal e quadro Kanban.
     */
    @GetMapping
    public ResponseEntity<List<OrdemServicoDTO>> listar(
            @RequestParam(required = false) String termo,
            @RequestParam(required = false) List<EtapaOrdemServico> etapas,
            @RequestParam(required = false) Long origemId,
            @RequestParam(required = false) Long tipoServicoId,
            @RequestParam(required = false) Boolean faturado,
            @RequestParam(required = false) Boolean concluido,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataEntradaInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataEntradaFim,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataSaidaInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataSaidaFim,
            @RequestParam(required = false) Boolean emAtraso,
            @RequestParam(required = false) Boolean ocultarEntreguesAnteriores,
            @RequestParam(required = false, defaultValue = "true") Boolean ativo
    ) {
        FiltroOrdensServico filtro = new FiltroOrdensServico(
                termo, etapas, origemId, tipoServicoId, faturado, concluido,
                dataEntradaInicio, dataEntradaFim, dataSaidaInicio, dataSaidaFim,
                emAtraso, ocultarEntreguesAnteriores, ativo
        );
        return ResponseEntity.ok(ordemServicoService.listar(filtro));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrdemServicoDTO> obterPorId(@PathVariable Long id) {
        return ResponseEntity.ok(ordemServicoService.obterPorId(id));
    }

    /**
     * Transição de etapa (arrastar no Kanban ou botão de ação rápida).
     */
    @PatchMapping("/{id}/etapa")
    public ResponseEntity<OrdemServicoDTO> transicionarEtapa(
            @PathVariable Long id,
            @Valid @RequestBody AtualizarEtapaRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String email = userDetails != null ? userDetails.getUsername() : null;
        return ResponseEntity.ok(ordemServicoService.transicionarEtapa(id, request, email));
    }

    /**
     * Ajuste de valor orçado com registro no histórico imutável.
     */
    @PatchMapping("/{id}/orcamento")
    public ResponseEntity<OrdemServicoDTO> atualizarOrcamento(
            @PathVariable Long id,
            @Valid @RequestBody AtualizarOrcamentoRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String email = userDetails != null ? userDetails.getUsername() : null;
        return ResponseEntity.ok(ordemServicoService.atualizarOrcamento(id, request, email));
    }

    /**
     * Alternância do status de faturamento (Sim/Não), data e NF.
     */
    @PatchMapping("/{id}/faturamento")
    public ResponseEntity<OrdemServicoDTO> atualizarFaturamento(
            @PathVariable Long id,
            @Valid @RequestBody AtualizarFaturamentoRequest request
    ) {
        return ResponseEntity.ok(ordemServicoService.atualizarFaturamento(id, request));
    }

    /**
     * Linha do tempo completa de auditoria da Ordem de Serviço.
     */
    @GetMapping("/{id}/historico")
    public ResponseEntity<List<HistoricoEtapaDTO>> obterHistorico(@PathVariable Long id) {
        return ResponseEntity.ok(ordemServicoService.obterHistorico(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> arquivar(@PathVariable Long id) {
        ordemServicoService.arquivar(id);
        return ResponseEntity.noContent().build();
    }
}
