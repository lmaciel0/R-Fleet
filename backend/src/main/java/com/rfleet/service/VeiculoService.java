package com.rfleet.service;

import com.rfleet.domain.Origem;
import com.rfleet.domain.Veiculo;
import com.rfleet.dto.SalvarVeiculoRequest;
import com.rfleet.dto.VeiculoBuscaPlacaResponse;
import com.rfleet.dto.VeiculoDTO;
import com.rfleet.repository.OrigemRepository;
import com.rfleet.repository.VeiculoRepository;
import com.rfleet.util.PlacaUtils;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
public class VeiculoService {

    private final VeiculoRepository veiculoRepository;
    private final OrigemRepository origemRepository;

    public VeiculoService(VeiculoRepository veiculoRepository, OrigemRepository origemRepository) {
        this.veiculoRepository = veiculoRepository;
        this.origemRepository = origemRepository;
    }

    /**
     * Busca rápida por placa para preenchimento de formulário de entrada.
     * Retorna dados do veículo prévio e se possui OS em aberto para prevenir duplicidade.
     */
    @Transactional(readOnly = true)
    public VeiculoBuscaPlacaResponse buscarPorPlaca(String placaRaw) {
        String placaSanitizada = PlacaUtils.sanitizar(placaRaw);

        if (!PlacaUtils.isValida(placaSanitizada)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Formato de placa inválido. Utilize o formato tradicional (ABC-1234) ou Mercosul (ABC1D23)."
            );
        }

        Optional<Veiculo> veiculoOpt = veiculoRepository.findByPlacaComOrigem(placaSanitizada);

        if (veiculoOpt.isEmpty()) {
            return VeiculoBuscaPlacaResponse.builder()
                    .encontrado(false)
                    .placa(placaSanitizada)
                    .placaFormatada(PlacaUtils.formatar(placaSanitizada))
                    .mercosul(PlacaUtils.isMercosul(placaSanitizada))
                    .possuiOsAtiva(false)
                    .build();
        }

        Veiculo veiculo = veiculoOpt.get();
        boolean possuiOsAtiva = false;
        Long osAtivaId = null;
        String osAtivaEtapa = null;
        String mensagemAlerta = null;

        List<Object[]> osAtivaRows = veiculoRepository.findOsAtivaByVeiculoId(veiculo.getId());
        if (!osAtivaRows.isEmpty()) {
            Object[] row = osAtivaRows.get(0);
            possuiOsAtiva = true;
            osAtivaId = ((Number) row[0]).longValue();
            osAtivaEtapa = (String) row[1];
            mensagemAlerta = "Atenção: Este veículo já possui uma Ordem de Serviço aberta (#" + osAtivaId + ") na etapa " + osAtivaEtapa + ".";
        }

        return VeiculoBuscaPlacaResponse.builder()
                .encontrado(true)
                .veiculoId(veiculo.getId())
                .placa(veiculo.getPlaca())
                .placaFormatada(PlacaUtils.formatar(veiculo.getPlaca()))
                .modelo(veiculo.getModelo())
                .origemId(veiculo.getOrigemPadrao() != null ? veiculo.getOrigemPadrao().getId() : null)
                .origemNome(veiculo.getOrigemPadrao() != null ? veiculo.getOrigemPadrao().getNome() : null)
                .mercosul(PlacaUtils.isMercosul(veiculo.getPlaca()))
                .possuiOsAtiva(possuiOsAtiva)
                .osAtivaId(osAtivaId)
                .osAtivaEtapa(osAtivaEtapa)
                .mensagemAlerta(mensagemAlerta)
                .build();
    }

    @Transactional(readOnly = true)
    public List<VeiculoDTO> listar(String termo) {
        String termoBusca = (termo != null && !termo.trim().isEmpty()) ? termo.trim() : null;
        return veiculoRepository.buscarPorTermo(termoBusca).stream()
                .map(VeiculoDTO::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public VeiculoDTO obterPorId(Long id) {
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Veículo não encontrado com ID: " + id));
        return VeiculoDTO.fromEntity(veiculo);
    }

    @Transactional
    public VeiculoDTO salvar(SalvarVeiculoRequest request) {
        String placaSanitizada = PlacaUtils.sanitizar(request.getPlaca());

        if (veiculoRepository.existsByPlaca(placaSanitizada)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um veículo cadastrado com a placa: " + placaSanitizada);
        }

        Origem origem = null;
        if (request.getOrigemId() != null) {
            origem = origemRepository.findById(request.getOrigemId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Origem não encontrada com ID: " + request.getOrigemId()));
        }

        Veiculo veiculo = Veiculo.builder()
                .placa(placaSanitizada)
                .modelo(request.getModelo().trim().toUpperCase())
                .origemPadrao(origem)
                .build();

        return VeiculoDTO.fromEntity(veiculoRepository.save(veiculo));
    }

    /**
     * Exclusão definitiva. O banco apaga junto (ON DELETE CASCADE) as ordens de serviço do veículo,
     * o histórico de etapas e os anexos delas.
     */
    @Transactional
    public void excluir(Long id) {
        Veiculo veiculo = veiculoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Veículo não encontrado com ID: " + id));
        veiculoRepository.delete(veiculo);
    }
}
