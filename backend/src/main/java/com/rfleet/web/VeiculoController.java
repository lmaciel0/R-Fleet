package com.rfleet.web;

import com.rfleet.dto.SalvarVeiculoRequest;
import com.rfleet.dto.VeiculoBuscaPlacaResponse;
import com.rfleet.dto.VeiculoDTO;
import com.rfleet.service.VeiculoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/veiculos")
public class VeiculoController {

    private final VeiculoService veiculoService;

    public VeiculoController(VeiculoService veiculoService) {
        this.veiculoService = veiculoService;
    }

    /**
     * Endpoint crítico para a agilidade do cadastro de entrada (< 30s).
     * Autocompleta dados prévios e alerta sobre OS ativa para evitar duplicidades.
     */
    @GetMapping("/buscar-placa/{placa}")
    public ResponseEntity<VeiculoBuscaPlacaResponse> buscarPorPlaca(@PathVariable String placa) {
        return ResponseEntity.ok(veiculoService.buscarPorPlaca(placa));
    }

    @GetMapping
    public ResponseEntity<List<VeiculoDTO>> listar(@RequestParam(value = "termo", required = false) String termo) {
        return ResponseEntity.ok(veiculoService.listar(termo));
    }

    @GetMapping("/{id}")
    public ResponseEntity<VeiculoDTO> obterPorId(@PathVariable Long id) {
        return ResponseEntity.ok(veiculoService.obterPorId(id));
    }

    @PostMapping
    public ResponseEntity<VeiculoDTO> salvar(@Valid @RequestBody SalvarVeiculoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(veiculoService.salvar(request));
    }
}
