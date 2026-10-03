package com.rfleet.web;

import com.rfleet.dto.SalvarTipoServicoRequest;
import com.rfleet.dto.TipoServicoDTO;
import com.rfleet.service.TipoServicoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tipos-servico")
public class TipoServicoController {

    private final TipoServicoService tipoServicoService;

    public TipoServicoController(TipoServicoService tipoServicoService) {
        this.tipoServicoService = tipoServicoService;
    }

    @GetMapping
    public ResponseEntity<List<TipoServicoDTO>> listar(@RequestParam(value = "apenasAtivos", defaultValue = "false") boolean apenasAtivos) {
        if (apenasAtivos) {
            return ResponseEntity.ok(tipoServicoService.listarAtivos());
        }
        return ResponseEntity.ok(tipoServicoService.listarTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TipoServicoDTO> obterPorId(@PathVariable Long id) {
        return ResponseEntity.ok(tipoServicoService.obterPorId(id));
    }

    @PostMapping
    public ResponseEntity<TipoServicoDTO> criar(@Valid @RequestBody SalvarTipoServicoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(tipoServicoService.salvar(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TipoServicoDTO> atualizar(@PathVariable Long id, @Valid @RequestBody SalvarTipoServicoRequest request) {
        return ResponseEntity.ok(tipoServicoService.atualizar(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> desativar(@PathVariable Long id) {
        tipoServicoService.desativar(id);
        return ResponseEntity.noContent().build();
    }
}
