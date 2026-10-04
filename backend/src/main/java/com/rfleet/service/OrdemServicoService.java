package com.rfleet.service;

import com.rfleet.domain.*;
import com.rfleet.dto.*;
import com.rfleet.repository.*;
import com.rfleet.util.DataOficina;
import com.rfleet.util.PlacaUtils;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class OrdemServicoService {

    private final OrdemServicoRepository ordemServicoRepository;
    private final HistoricoEtapaRepository historicoEtapaRepository;
    private final VeiculoRepository veiculoRepository;
    private final OrigemRepository origemRepository;
    private final TipoServicoRepository tipoServicoRepository;
    private final UsuarioRepository usuarioRepository;
    private final ConfiguracaoRepository configuracaoRepository;

    public OrdemServicoService(
            OrdemServicoRepository ordemServicoRepository,
            HistoricoEtapaRepository historicoEtapaRepository,
            VeiculoRepository veiculoRepository,
            OrigemRepository origemRepository,
            TipoServicoRepository tipoServicoRepository,
            UsuarioRepository usuarioRepository,
            ConfiguracaoRepository configuracaoRepository
    ) {
        this.ordemServicoRepository = ordemServicoRepository;
        this.historicoEtapaRepository = historicoEtapaRepository;
        this.veiculoRepository = veiculoRepository;
        this.origemRepository = origemRepository;
        this.tipoServicoRepository = tipoServicoRepository;
        this.usuarioRepository = usuarioRepository;
        this.configuracaoRepository = configuracaoRepository;
    }

    public long obterLimiteDiasSla() {
        return configuracaoRepository.findById("LIMITE_DIAS_ALERTA_PARADO")
                .map(c -> {
                    try {
                        return Long.parseLong(c.getValor());
                    } catch (NumberFormatException e) {
                        return 15L;
                    }
                })
                .orElse(15L);
    }

    /**
     * Registra a entrada do veículo na oficina (< 30s).
     * Garante a regra de não permitir mais de uma OS em aberto para o mesmo veículo.
     */
    @Transactional
    public OrdemServicoDTO registrarEntrada(RegistrarEntradaRequest request, String emailUsuario) {
        String placaSanitizada = PlacaUtils.sanitizar(request.getPlaca());

        // 1. Obter ou cadastrar o Veículo
        Veiculo veiculo = veiculoRepository.findByPlaca(placaSanitizada).orElse(null);

        if (veiculo != null) {
            // Validação de unicidade de OS ativa
            Optional<OrdemServico> osAtivaOpt = ordemServicoRepository.findByVeiculoIdAndEtapaNotAndAtivoTrue(
                    veiculo.getId(),
                    EtapaOrdemServico.ENTREGUE
            );

            if (osAtivaOpt.isPresent()) {
                OrdemServico osAtiva = osAtivaOpt.get();
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "O veículo de placa " + PlacaUtils.formatar(placaSanitizada) +
                        " já possui uma Ordem de Serviço em aberto (#" + osAtiva.getId() +
                        ") na etapa '" + osAtiva.getEtapa().getDescricao() + "'."
                );
            }
        } else {
            // Criação do novo veículo no primeiro atendimento
            Origem origemPadrao = null;
            if (request.getOrigemId() != null) {
                origemPadrao = origemRepository.findById(request.getOrigemId()).orElse(null);
            }

            veiculo = Veiculo.builder()
                    .placa(placaSanitizada)
                    .modelo(request.getModelo().trim().toUpperCase())
                    .origemPadrao(origemPadrao)
                    .build();
            veiculo = veiculoRepository.save(veiculo);
        }

        // 2. Resolver Tipo de Serviço
        TipoServico tipoServico = null;
        if (request.getTipoServicoId() != null) {
            tipoServico = tipoServicoRepository.findById(request.getTipoServicoId()).orElse(null);
        }

        // 3. Criar a Ordem de Serviço
        EtapaOrdemServico etapaInicial = request.getEtapa() != null ? request.getEtapa() : EtapaOrdemServico.AGUARDANDO_ORCAMENTO;
        LocalDate dataEntrada = request.getDataEntrada() != null ? request.getDataEntrada() : LocalDate.now();

        OrdemServico os = OrdemServico.builder()
                .veiculo(veiculo)
                .tipoServico(tipoServico)
                .etapa(etapaInicial)
                .valorOrcamento(request.getValorOrcamento() != null ? request.getValorOrcamento() : BigDecimal.ZERO)
                .faturado(false)
                .dataEntrada(dataEntrada)
                .observacoes(request.getObservacoes())
                .ativo(true)
                .build();

        os = ordemServicoRepository.save(os);

        // 4. Registrar evento inicial no Histórico imutável
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(emailUsuario).orElse(null);

        HistoricoEtapa historico = HistoricoEtapa.builder()
                .ordemServico(os)
                .etapaAnterior(null)
                .etapaNova(etapaInicial)
                .usuario(usuario)
                .valorOrcamentoMomento(os.getValorOrcamento())
                .observacao("Entrada do veículo registrada na oficina.")
                .build();

        historicoEtapaRepository.save(historico);

        return OrdemServicoDTO.fromEntity(os, obterLimiteDiasSla(), LocalDate.now());
    }

    /**
     * Transiciona de etapa (via 1 clique ou arrastando no Kanban).
     * Aplica preenchimento automático da data de saída quando etapa vira ENTREGUE.
     */
    @Transactional
    public OrdemServicoDTO transicionarEtapa(Long id, AtualizarEtapaRequest request, String emailUsuario) {
        OrdemServico os = ordemServicoRepository.findByIdComDetalhes(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ordem de serviço não encontrada com ID: " + id));

        EtapaOrdemServico etapaAnterior = os.getEtapa();
        EtapaOrdemServico etapaNova = request.getNovaEtapa();

        if (etapaAnterior == etapaNova) {
            return OrdemServicoDTO.fromEntity(os, obterLimiteDiasSla(), LocalDate.now());
        }

        // Data de saída automática: toda entrega (inclusive a de uma OS reaberta) sai com a data de hoje,
        // senão uma saída antiga mandaria o veículo direto para um mês passado do histórico
        if (etapaNova == EtapaOrdemServico.ENTREGUE) {
            os.setDataSaida(DataOficina.hoje());
        }

        os.setEtapa(etapaNova);
        os = ordemServicoRepository.save(os);

        // Registro no histórico
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(emailUsuario).orElse(null);

        HistoricoEtapa historico = HistoricoEtapa.builder()
                .ordemServico(os)
                .etapaAnterior(etapaAnterior)
                .etapaNova(etapaNova)
                .usuario(usuario)
                .valorOrcamentoMomento(os.getValorOrcamento())
                .observacao(request.getObservacao() != null && !request.getObservacao().isBlank()
                        ? request.getObservacao()
                        : "Transição da etapa " + etapaAnterior.getDescricao() + " para " + etapaNova.getDescricao())
                .build();

        historicoEtapaRepository.save(historico);

        return OrdemServicoDTO.fromEntity(os, obterLimiteDiasSla(), LocalDate.now());
    }

    /**
     * Atualiza o valor do orçamento com registro no histórico imutável.
     */
    @Transactional
    public OrdemServicoDTO atualizarOrcamento(Long id, AtualizarOrcamentoRequest request, String emailUsuario) {
        OrdemServico os = ordemServicoRepository.findByIdComDetalhes(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ordem de serviço não encontrada com ID: " + id));

        BigDecimal valorAnterior = os.getValorOrcamento();
        os.setValorOrcamento(request.getValor());
        os = ordemServicoRepository.save(os);

        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(emailUsuario).orElse(null);

        String motivo = request.getJustificativa() != null && !request.getJustificativa().isBlank()
                ? request.getJustificativa()
                : "Ajuste de valor sem justificativa informada";

        HistoricoEtapa historico = HistoricoEtapa.builder()
                .ordemServico(os)
                .etapaAnterior(os.getEtapa())
                .etapaNova(os.getEtapa())
                .usuario(usuario)
                .valorOrcamentoMomento(request.getValor())
                .observacao("Valor do orçamento alterado de R$ " + valorAnterior + " para R$ " + request.getValor() + ". Motivo: " + motivo)
                .build();

        historicoEtapaRepository.save(historico);

        return OrdemServicoDTO.fromEntity(os, obterLimiteDiasSla(), LocalDate.now());
    }

    /**
     * Atualiza o status de faturamento da OS.
     */
    @Transactional
    public OrdemServicoDTO atualizarFaturamento(Long id, AtualizarFaturamentoRequest request) {
        OrdemServico os = ordemServicoRepository.findByIdComDetalhes(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ordem de serviço não encontrada com ID: " + id));

        os.setFaturado(request.getFaturado());
        if (Boolean.TRUE.equals(request.getFaturado()) && request.getDataFaturamento() == null) {
            os.setDataFaturamento(LocalDate.now());
        } else {
            os.setDataFaturamento(request.getDataFaturamento());
        }

        if (request.getNumeroNf() != null) {
            os.setNumeroNf(request.getNumeroNf().trim());
        }

        os = ordemServicoRepository.save(os);
        return OrdemServicoDTO.fromEntity(os, obterLimiteDiasSla(), LocalDate.now());
    }

    @Transactional(readOnly = true)
    public OrdemServicoDTO obterPorId(Long id) {
        OrdemServico os = ordemServicoRepository.findByIdComDetalhes(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ordem de serviço não encontrada com ID: " + id));

        return OrdemServicoDTO.fromEntity(os, obterLimiteDiasSla(), LocalDate.now());
    }

    @Transactional(readOnly = true)
    public List<OrdemServicoDTO> listar(FiltroOrdensServico filtro) {
        long limiteSla = obterLimiteDiasSla();

        Specification<OrdemServico> spec = OrdemServicoSpecification.comFiltros(
                filtro, limiteSla, DataOficina.inicioDoMesCorrente()
        );

        Sort sort = Sort.by(Sort.Direction.DESC, "dataEntrada", "id");

        return ordemServicoRepository.findAll(spec, sort).stream()
                .map(os -> OrdemServicoDTO.fromEntity(os, limiteSla, LocalDate.now()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<HistoricoEtapaDTO> obterHistorico(Long ordemServicoId) {
        if (!ordemServicoRepository.existsById(ordemServicoId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ordem de serviço não encontrada com ID: " + ordemServicoId);
        }

        return historicoEtapaRepository.findByOrdemServicoIdOrderByDataHoraDesc(ordemServicoId).stream()
                .map(HistoricoEtapaDTO::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<HistoricoMesDTO> listarMesesHistorico() {
        return ordemServicoRepository.resumirPorMesDeSaida(EtapaOrdemServico.ENTREGUE);
    }

    /**
     * Arquiva (some da operação, do Histórico, do dashboard e das exportações) ou restaura a OS.
     * Nada é apagado: a mudança e o motivo ficam na linha do tempo.
     */
    @Transactional
    public OrdemServicoDTO alterarArquivamento(Long id, ArquivamentoRequest request, String emailUsuario) {
        OrdemServico os = ordemServicoRepository.findByIdComDetalhes(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ordem de serviço não encontrada com ID: " + id));

        boolean arquivar = request.arquivada();
        String motivo = request.motivo() != null ? request.motivo().trim() : "";

        if (arquivar && motivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o motivo do arquivamento.");
        }
        if (arquivar != Boolean.TRUE.equals(os.getAtivo())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    arquivar ? "A ordem de serviço já está arquivada." : "A ordem de serviço não está arquivada.");
        }
        // Restaurar uma OS em aberto não pode deixar o veículo com duas OS em aberto
        if (!arquivar && os.getEtapa() != EtapaOrdemServico.ENTREGUE) {
            ordemServicoRepository.findByVeiculoIdAndEtapaNotAndAtivoTrue(os.getVeiculo().getId(), EtapaOrdemServico.ENTREGUE)
                    .ifPresent(outra -> {
                        throw new ResponseStatusException(HttpStatus.CONFLICT,
                                "O veículo de placa " + PlacaUtils.formatar(os.getVeiculo().getPlaca())
                                        + " já possui uma Ordem de Serviço em aberto (#" + outra.getId()
                                        + "). Arquive ou entregue essa OS antes de restaurar esta.");
                    });
        }

        os.setAtivo(!arquivar);
        OrdemServico salva = ordemServicoRepository.save(os);

        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(emailUsuario).orElse(null);
        String observacao = (arquivar ? "OS arquivada." : "OS restaurada.")
                + (motivo.isEmpty() ? "" : " Motivo: " + motivo);

        historicoEtapaRepository.save(HistoricoEtapa.builder()
                .ordemServico(salva)
                .etapaAnterior(salva.getEtapa())
                .etapaNova(salva.getEtapa())
                .usuario(usuario)
                .valorOrcamentoMomento(salva.getValorOrcamento())
                .observacao(observacao)
                .build());

        return OrdemServicoDTO.fromEntity(salva, obterLimiteDiasSla(), LocalDate.now());
    }

    /**
     * Exclusão definitiva, só para OS arquivada. O banco apaga junto (ON DELETE CASCADE) o histórico
     * de etapas e os anexos; o veículo fica, pois pode ter outras OS ou voltar à oficina.
     */
    @Transactional
    public void excluir(Long id) {
        OrdemServico os = ordemServicoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ordem de serviço não encontrada com ID: " + id));
        if (Boolean.TRUE.equals(os.getAtivo())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Só é possível excluir uma ordem de serviço arquivada.");
        }
        ordemServicoRepository.delete(os);
    }
}
