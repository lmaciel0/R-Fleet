package com.rfleet.service;

import com.rfleet.domain.TipoServico;
import com.rfleet.dto.SalvarTipoServicoRequest;
import com.rfleet.dto.TipoServicoDTO;
import com.rfleet.repository.TipoServicoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class TipoServicoService {

    private final TipoServicoRepository tipoServicoRepository;

    public TipoServicoService(TipoServicoRepository tipoServicoRepository) {
        this.tipoServicoRepository = tipoServicoRepository;
    }

    @Transactional(readOnly = true)
    public List<TipoServicoDTO> listarTodos() {
        return tipoServicoRepository.findAllByOrderByNomeAsc().stream()
                .map(TipoServicoDTO::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TipoServicoDTO> listarAtivos() {
        return tipoServicoRepository.findByAtivoTrueOrderByNomeAsc().stream()
                .map(TipoServicoDTO::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public TipoServicoDTO obterPorId(Long id) {
        TipoServico tipoServico = tipoServicoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tipo de serviço não encontrado com ID: " + id));
        return TipoServicoDTO.fromEntity(tipoServico);
    }

    @Transactional
    public TipoServicoDTO salvar(SalvarTipoServicoRequest request) {
        String nomeNormalizado = request.getNome().trim();
        if (tipoServicoRepository.existsByNomeIgnoreCase(nomeNormalizado)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um tipo de serviço com o nome: " + nomeNormalizado);
        }

        TipoServico tipoServico = TipoServico.builder()
                .nome(nomeNormalizado)
                .ativo(request.getAtivo() != null ? request.getAtivo() : true)
                .build();

        return TipoServicoDTO.fromEntity(tipoServicoRepository.save(tipoServico));
    }

    @Transactional
    public TipoServicoDTO atualizar(Long id, SalvarTipoServicoRequest request) {
        TipoServico tipoServico = tipoServicoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tipo de serviço não encontrado com ID: " + id));

        String nomeNormalizado = request.getNome().trim();
        tipoServicoRepository.findByNomeIgnoreCase(nomeNormalizado)
                .ifPresent(existente -> {
                    if (!existente.getId().equals(id)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe outro tipo de serviço com o nome: " + nomeNormalizado);
                    }
                });

        tipoServico.setNome(nomeNormalizado);
        if (request.getAtivo() != null) {
            tipoServico.setAtivo(request.getAtivo());
        }

        return TipoServicoDTO.fromEntity(tipoServicoRepository.save(tipoServico));
    }

    @Transactional
    public void desativar(Long id) {
        TipoServico tipoServico = tipoServicoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tipo de serviço não encontrado com ID: " + id));
        tipoServico.setAtivo(false);
        tipoServicoRepository.save(tipoServico);
    }
}
