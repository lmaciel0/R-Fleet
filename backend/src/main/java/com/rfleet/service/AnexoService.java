package com.rfleet.service;

import com.rfleet.domain.AnexoOs;
import com.rfleet.domain.OrdemServico;
import com.rfleet.domain.Usuario;
import com.rfleet.dto.AnexoOsDTO;
import com.rfleet.repository.AnexoOsRepository;
import com.rfleet.repository.OrdemServicoRepository;
import com.rfleet.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AnexoService {

    private final Path uploadPath;
    private final AnexoOsRepository anexoOsRepository;
    private final OrdemServicoRepository ordemServicoRepository;
    private final UsuarioRepository usuarioRepository;
    private final DataSize tamanhoMaximoUpload;

    public AnexoService(
            @Value("${app.storage.upload-dir:./uploads}") String uploadDir,
            @Value("${spring.servlet.multipart.max-file-size}") DataSize tamanhoMaximoUpload,
            AnexoOsRepository anexoOsRepository,
            OrdemServicoRepository ordemServicoRepository,
            UsuarioRepository usuarioRepository
    ) {
        this.uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.anexoOsRepository = anexoOsRepository;
        this.ordemServicoRepository = ordemServicoRepository;
        this.usuarioRepository = usuarioRepository;
        this.tamanhoMaximoUpload = tamanhoMaximoUpload;

        try {
            Files.createDirectories(this.uploadPath);
        } catch (IOException e) {
            throw new RuntimeException("Não foi possível inicializar a pasta de uploads: " + this.uploadPath, e);
        }
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
        String nomeArmazenado = UUID.randomUUID() + "_" + nomeOriginal.replaceAll("[^a-zA-Z0-9._-]", "_");

        Path destino = this.uploadPath.resolve(nomeArmazenado);

        try {
            Files.copy(arquivo.getInputStream(), destino, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao salvar arquivo no disco", e);
        }

        AnexoOs anexo = AnexoOs.builder()
                .ordemServico(os)
                .nomeArquivo(nomeOriginal)
                .tipoConteudo(arquivo.getContentType() != null ? arquivo.getContentType() : "application/octet-stream")
                .tamanhoBytes(arquivo.getSize())
                .caminhoStorage(destino.toString())
                .usuario(usuario)
                .build();

        anexo = anexoOsRepository.save(anexo);
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

    public Resource carregarArquivoComoRecurso(AnexoOs anexo) {
        try {
            Path arquivo = Paths.get(anexo.getCaminhoStorage()).normalize();
            Resource resource = new UrlResource(arquivo.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Arquivo não encontrado no disco: " + anexo.getNomeArquivo());
            }
        } catch (MalformedURLException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erro ao carregar arquivo", e);
        }
    }

    @Transactional
    public void excluirAnexo(Long id) {
        AnexoOs anexo = anexoOsRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Anexo não encontrado: " + id));

        try {
            Path arquivo = Paths.get(anexo.getCaminhoStorage());
            Files.deleteIfExists(arquivo);
        } catch (IOException ignored) {
        }

        anexoOsRepository.delete(anexo);
    }
}
