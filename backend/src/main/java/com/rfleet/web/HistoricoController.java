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
