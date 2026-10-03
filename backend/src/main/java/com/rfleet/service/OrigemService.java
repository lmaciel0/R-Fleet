package com.rfleet.service;

import com.rfleet.domain.Origem;
import com.rfleet.dto.OrigemDTO;
import com.rfleet.dto.SalvarOrigemRequest;
import com.rfleet.repository.OrigemRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class OrigemService {

    private final OrigemRepository origemRepository;

    public OrigemService(OrigemRepository origemRepository) {
        this.origemRepository = origemRepository;
    }

    @Transactional(readOnly = true)
    public List<OrigemDTO> listarTodas() {
        return origemRepository.findAllByOrderByNomeAsc().stream()
                .map(OrigemDTO::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OrigemDTO> listarAtivas() {
        return origemRepository.findByAtivoTrueOrderByNomeAsc().stream()
                .map(OrigemDTO::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public OrigemDTO obterPorId(Long id) {
        Origem origem = origemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Origem não encontrada com ID: " + id));
        return OrigemDTO.fromEntity(origem);
    }

    @Transactional
    public OrigemDTO salvar(SalvarOrigemRequest request) {
        String nomeNormalizado = request.getNome().trim();
        if (origemRepository.existsByNomeIgnoreCase(nomeNormalizado)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe uma origem com o nome: " + nomeNormalizado);
        }

        Origem origem = Origem.builder()
                .nome(nomeNormalizado)
                .ativo(request.getAtivo() != null ? request.getAtivo() : true)
                .build();

        return OrigemDTO.fromEntity(origemRepository.save(origem));
    }

    @Transactional
    public OrigemDTO atualizar(Long id, SalvarOrigemRequest request) {
        Origem origem = origemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Origem não encontrada com ID: " + id));

        String nomeNormalizado = request.getNome().trim();
        origemRepository.findByNomeIgnoreCase(nomeNormalizado)
                .ifPresent(existente -> {
                    if (!existente.getId().equals(id)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe outra origem com o nome: " + nomeNormalizado);
                    }
                });

        origem.setNome(nomeNormalizado);
        if (request.getAtivo() != null) {
            origem.setAtivo(request.getAtivo());
        }

        return OrigemDTO.fromEntity(origemRepository.save(origem));
    }

    @Transactional
    public void desativar(Long id) {
        Origem origem = origemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Origem não encontrada com ID: " + id));
        origem.setAtivo(false);
        origemRepository.save(origem);
    }
}
