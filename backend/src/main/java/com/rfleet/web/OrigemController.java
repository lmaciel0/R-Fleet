package com.rfleet.web;

import com.rfleet.dto.OrigemDTO;
import com.rfleet.dto.SalvarOrigemRequest;
import com.rfleet.service.OrigemService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/origens")
public class OrigemController {

    private final OrigemService origemService;

    public OrigemController(OrigemService origemService) {
        this.origemService = origemService;
    }

    @GetMapping
    public ResponseEntity<List<OrigemDTO>> listar(@RequestParam(value = "apenasAtivas", defaultValue = "false") boolean apenasAtivas) {
        if (apenasAtivas) {
            return ResponseEntity.ok(origemService.listarAtivas());
        }
        return ResponseEntity.ok(origemService.listarTodas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrigemDTO> obterPorId(@PathVariable Long id) {
        return ResponseEntity.ok(origemService.obterPorId(id));
    }

    @PostMapping
    public ResponseEntity<OrigemDTO> criar(@Valid @RequestBody SalvarOrigemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(origemService.salvar(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<OrigemDTO> atualizar(@PathVariable Long id, @Valid @RequestBody SalvarOrigemRequest request) {
        return ResponseEntity.ok(origemService.atualizar(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> desativar(@PathVariable Long id) {
        origemService.desativar(id);
        return ResponseEntity.noContent().build();
    }
}
