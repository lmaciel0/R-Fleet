package com.rfleet.service;

import com.rfleet.domain.AnexoOs;
import com.rfleet.domain.OrdemServico;
import com.rfleet.domain.Usuario;
import com.rfleet.dto.AnexoOsDTO;
import com.rfleet.repository.AnexoConteudoRepository;
import com.rfleet.repository.AnexoOsRepository;
import com.rfleet.repository.OrdemServicoRepository;
import com.rfleet.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AnexoService {

    private final AnexoOsRepository anexoOsRepository;
    private final AnexoConteudoRepository anexoConteudoRepository;
    private final OrdemServicoRepository ordemServicoRepository;
    private final UsuarioRepository usuarioRepository;
    private final DataSize tamanhoMaximoUpload;

    public AnexoService(
            @Value("${spring.servlet.multipart.max-file-size}") DataSize tamanhoMaximoUpload,
            AnexoOsRepository anexoOsRepository,
            AnexoConteudoRepository anexoConteudoRepository,
            OrdemServicoRepository ordemServicoRepository,
            UsuarioRepository usuarioRepository
    ) {
        this.anexoOsRepository = anexoOsRepository;
        this.anexoConteudoRepository = anexoConteudoRepository;
        this.ordemServicoRepository = ordemServicoRepository;
        this.usuarioRepository = usuarioRepository;
        this.tamanhoMaximoUpload = tamanhoMaximoUpload;
    }

    @Transactional
    public AnexoOsDTO salvarAnexo(Long ordemServicoId, MultipartFile arquivo, String emailUsuario) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O arquivo não pode estar vazio");
        }

        if (arquivo.getSize() > tamanhoMaximoUpload.toBytes()) {
            throw new ResponseStatusException(HttpStatus.valueOf(413),
                    "O arquivo excede o tamanho máximo permitido de " + tamanhoMaximoUpload.toMegabytes() + " MB.");
        }

        OrdemServico os = ordemServicoRepository.findById(ordemServicoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ordem de serviço não encontrada: " + ordemServicoId));

        Usuario usuario = null;
        if (emailUsuario != null) {
            usuario = usuarioRepository.findByEmail(emailUsuario).orElse(null);
        }

        String nomeOriginal = StringUtils.cleanPath(arquivo.getOriginalFilename() != null ? arquivo.getOriginalFilename() : "arquivo");

        byte[] dados;
        try {
            dados = arquivo.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao ler o arquivo enviado", e);
        }

        AnexoOs anexo = AnexoOs.builder()
                .ordemServico(os)
                .nomeArquivo(nomeOriginal)
                .tipoConteudo(arquivo.getContentType() != null ? arquivo.getContentType() : "application/octet-stream")
                .tamanhoBytes((long) dados.length)
                .usuario(usuario)
                .build();

        anexo = anexoOsRepository.save(anexo);
        anexoConteudoRepository.salvar(anexo.getId(), dados);
        return AnexoOsDTO.fromEntity(anexo);
    }

    @Transactional(readOnly = true)
    public List<AnexoOsDTO> listarPorOrdemServico(Long ordemServicoId) {
        if (!ordemServicoRepository.existsById(ordemServicoId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ordem de serviço não encontrada: " + ordemServicoId);
        }

        return anexoOsRepository.findByOrdemServicoIdOrderByCriadoEmDesc(ordemServicoId)
                .stream()
                .map(AnexoOsDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AnexoOs obterEntidadePorId(Long id) {
        return anexoOsRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Anexo não encontrado: " + id));
    }

    @Transactional(readOnly = true)
    public Resource carregarConteudo(AnexoOs anexo) {
        byte[] dados = anexoConteudoRepository.buscar(anexo.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Conteúdo do anexo não encontrado: " + anexo.getNomeArquivo()));
        return new ByteArrayResource(dados);
    }

    @Transactional
    public void excluirAnexo(Long id) {
        AnexoOs anexo = anexoOsRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Anexo não encontrado: " + id));

        // O conteúdo sai junto (ON DELETE CASCADE em anexos_conteudo)
        anexoOsRepository.delete(anexo);
    }
}
