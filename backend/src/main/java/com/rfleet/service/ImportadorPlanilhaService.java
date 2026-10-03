package com.rfleet.service;

import com.rfleet.domain.*;
import com.rfleet.dto.ImportacaoResultadoDTO;
import com.rfleet.repository.*;
import com.rfleet.util.PlacaUtils;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

@Service
public class ImportadorPlanilhaService {

    private final VeiculoRepository veiculoRepository;
    private final OrigemRepository origemRepository;
    private final TipoServicoRepository tipoServicoRepository;
    private final OrdemServicoRepository ordemServicoRepository;
    private final HistoricoEtapaRepository historicoEtapaRepository;
    private final UsuarioRepository usuarioRepository;

    private static final List<DateTimeFormatter> DATE_FORMATTERS = List.of(
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("d/M/yyyy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy")
    );

    public ImportadorPlanilhaService(
            VeiculoRepository veiculoRepository,
            OrigemRepository origemRepository,
            TipoServicoRepository tipoServicoRepository,
            OrdemServicoRepository ordemServicoRepository,
            HistoricoEtapaRepository historicoEtapaRepository,
            UsuarioRepository usuarioRepository
    ) {
        this.veiculoRepository = veiculoRepository;
        this.origemRepository = origemRepository;
        this.tipoServicoRepository = tipoServicoRepository;
        this.ordemServicoRepository = ordemServicoRepository;
        this.historicoEtapaRepository = historicoEtapaRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional
    public ImportacaoResultadoDTO importar(MultipartFile arquivo, String emailUsuario) {
        if (arquivo == null || arquivo.isEmpty()) {
            return ImportacaoResultadoDTO.builder()
                    .mensagens(List.of("Arquivo enviado está vazio."))
                    .build();
        }

        Usuario usuario = emailUsuario != null ? usuarioRepository.findByEmail(emailUsuario).orElse(null) : null;
        String nomeOriginal = arquivo.getOriginalFilename() != null ? arquivo.getOriginalFilename().toLowerCase() : "";

        if (nomeOriginal.endsWith(".xlsx") || nomeOriginal.endsWith(".xls")) {
            return importarExcel(arquivo, usuario);
        } else if (nomeOriginal.endsWith(".csv") || nomeOriginal.endsWith(".txt")) {
            return importarCsv(arquivo, usuario);
        } else {
            return ImportacaoResultadoDTO.builder()
                    .totalErros(1)
                    .mensagens(List.of("Formato de arquivo não suportado. Utilize .xlsx ou .csv."))
                    .build();
        }
    }

    private ImportacaoResultadoDTO importarExcel(MultipartFile arquivo, Usuario usuario) {
        ImportacaoResultadoDTO resultado = new ImportacaoResultadoDTO();

        try (InputStream is = arquivo.getInputStream();
             Workbook workbook = WorkbookFactory.create(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter(Locale.forLanguageTag("pt-BR"));

            int rowNum = 0;
            for (Row row : sheet) {
                rowNum++;
                if (rowNum == 1) {
                    // Pular cabeçalho
                    continue;
                }

                resultado.setTotalLinhasLidas(resultado.getTotalLinhasLidas() + 1);

                String placaRaw = getCellValue(row.getCell(1), formatter);
                if (placaRaw == null || placaRaw.trim().isEmpty()) {
                    resultado.setTotalIgnoradas(resultado.getTotalIgnoradas() + 1);
                    continue;
                }

                String placa = PlacaUtils.sanitizar(placaRaw);
                if (!PlacaUtils.isValida(placa)) {
                    resultado.setTotalErros(resultado.getTotalErros() + 1);
                    resultado.getMensagens().add("Linha " + rowNum + ": Placa inválida (" + placaRaw + ")");
                    continue;
                }

                String modelo = getCellValue(row.getCell(2), formatter);
                if (modelo == null || modelo.trim().isEmpty()) {
                    modelo = "Não informado";
                }

                String origemStr = getCellValue(row.getCell(3), formatter);
                String tipoServicoStr = getCellValue(row.getCell(4), formatter);
                String etapaStr = getCellValue(row.getCell(5), formatter);
                LocalDate dataEntrada = parseData(row.getCell(6), formatter); // Coluna G: Data de Entrada
                LocalDate dataSaida = parseData(row.getCell(7), formatter); // Coluna H: Data de Saída
                BigDecimal valorOrcamento = parseMoeda(getCellValue(row.getCell(8), formatter));
                Boolean faturado = parseBooleano(getCellValue(row.getCell(9), formatter));
                String observacoes = getCellValue(row.getCell(10), formatter);

                processarLinha(resultado, rowNum, placa, modelo, origemStr, tipoServicoStr,
                        etapaStr, dataEntrada, dataSaida, valorOrcamento, faturado, observacoes, usuario);
            }

        } catch (Exception e) {
            resultado.setTotalErros(resultado.getTotalErros() + 1);
            resultado.getMensagens().add("Erro fatal ao processar planilha: " + e.getMessage());
        }

        return resultado;
    }

    private ImportacaoResultadoDTO importarCsv(MultipartFile arquivo, Usuario usuario) {
        ImportacaoResultadoDTO resultado = new ImportacaoResultadoDTO();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(arquivo.getInputStream(), StandardCharsets.UTF_8))) {
            String linha;
            int rowNum = 0;

            while ((linha = reader.readLine()) != null) {
                rowNum++;
                if (rowNum == 1) {
                    continue; // Pular cabeçalho
                }

                if (linha.trim().isEmpty()) {
                    continue;
                }

                resultado.setTotalLinhasLidas(resultado.getTotalLinhasLidas() + 1);

                // Detectar delimitador (; ou ,)
                String delimiter = linha.contains(";") ? ";" : ",";
                String[] colunas = linha.split(delimiter, -1);

                if (colunas.length < 2) {
                    resultado.setTotalIgnoradas(resultado.getTotalIgnoradas() + 1);
                    continue;
                }

                String placaRaw = colunas.length > 1 ? colunas[1].trim() : "";
                if (placaRaw.isEmpty()) {
                    resultado.setTotalIgnoradas(resultado.getTotalIgnoradas() + 1);
                    continue;
                }

                String placa = PlacaUtils.sanitizar(placaRaw);
                if (!PlacaUtils.isValida(placa)) {
                    resultado.setTotalErros(resultado.getTotalErros() + 1);
                    resultado.getMensagens().add("Linha " + rowNum + ": Placa inválida (" + placaRaw + ")");
                    continue;
                }

                String modelo = colunas.length > 2 ? colunas[2].trim() : "Não informado";
                String origemStr = colunas.length > 3 ? colunas[3].trim() : null;
                String tipoServicoStr = colunas.length > 4 ? colunas[4].trim() : null;
                String etapaStr = colunas.length > 5 ? colunas[5].trim() : null;
                LocalDate dataEntrada = parseDataString(colunas.length > 6 ? colunas[6].trim() : null); // Col G
                LocalDate dataSaida = parseDataString(colunas.length > 7 ? colunas[7].trim() : null); // Col H
                BigDecimal valorOrcamento = parseMoeda(colunas.length > 8 ? colunas[8].trim() : null);
                Boolean faturado = parseBooleano(colunas.length > 9 ? colunas[9].trim() : null);
                String observacoes = colunas.length > 10 ? colunas[10].trim() : null;

                processarLinha(resultado, rowNum, placa, modelo, origemStr, tipoServicoStr,
                        etapaStr, dataEntrada, dataSaida, valorOrcamento, faturado, observacoes, usuario);
            }

        } catch (Exception e) {
            resultado.setTotalErros(resultado.getTotalErros() + 1);
            resultado.getMensagens().add("Erro ao processar arquivo CSV: " + e.getMessage());
        }

        return resultado;
    }

    private void processarLinha(
            ImportacaoResultadoDTO resultado,
            int rowNum,
            String placa,
            String modelo,
            String origemStr,
            String tipoServicoStr,
            String etapaStr,
            LocalDate dataEntrada,
            LocalDate dataSaida,
            BigDecimal valorOrcamento,
            Boolean faturado,
            String observacoes,
            Usuario usuario
    ) {
        try {
            // Resolver ou criar Origem
            Origem origem = resolverOrigem(origemStr);

            // Resolver ou criar Tipo de Serviço
            TipoServico tipoServico = resolverTipoServico(tipoServicoStr);

            // Resolver ou criar Veículo
            Veiculo veiculo = veiculoRepository.findByPlaca(placa).orElseGet(() -> {
                Veiculo novo = Veiculo.builder()
                        .placa(placa)
                        .modelo(modelo != null && !modelo.isBlank() ? modelo.toUpperCase() : "NÃO INFORMADO")
                        .origemPadrao(origem)
                        .build();
                return veiculoRepository.save(novo);
            });

            // Etapa
            EtapaOrdemServico etapa = parseEtapa(etapaStr);

            // Se a etapa for concluída (ENTREGUE), não há restrição de OS ativa única
            if (etapa != EtapaOrdemServico.ENTREGUE) {
                // Verificar se veículo já possui OS ativa em andamento
                boolean jaTemAtiva = ordemServicoRepository.existsByVeiculoIdAndEtapaNotAndAtivoTrue(
                        veiculo.getId(), EtapaOrdemServico.ENTREGUE
                );

                if (jaTemAtiva) {
                    resultado.setTotalIgnoradas(resultado.getTotalIgnoradas() + 1);
                    resultado.getMensagens().add("Linha " + rowNum + ": Veículo " + placa + " já possui OS ativa no sistema. Ignorado.");
                    return;
                }
            }

            LocalDate entradaEfetiva = dataEntrada != null ? dataEntrada : LocalDate.now();

            OrdemServico os = OrdemServico.builder()
                    .veiculo(veiculo)
                    .tipoServico(tipoServico)
                    .etapa(etapa)
                    .valorOrcamento(valorOrcamento != null ? valorOrcamento : BigDecimal.ZERO)
                    .faturado(Boolean.TRUE.equals(faturado))
                    .dataFaturamento(Boolean.TRUE.equals(faturado) ? (dataSaida != null ? dataSaida : entradaEfetiva) : null)
                    .dataEntrada(entradaEfetiva)
                    .dataSaida(etapa == EtapaOrdemServico.ENTREGUE ? (dataSaida != null ? dataSaida : LocalDate.now()) : dataSaida)
                    .observacoes(observacoes)
                    .ativo(true)
                    .build();

            os = ordemServicoRepository.save(os);

            // Registro no Histórico Imutável
            HistoricoEtapa historico = HistoricoEtapa.builder()
                    .ordemServico(os)
                    .etapaAnterior(null)
                    .etapaNova(etapa)
                    .usuario(usuario)
                    .valorOrcamentoMomento(os.getValorOrcamento())
                    .observacao("Importado via planilha legada")
                    .build();
            historicoEtapaRepository.save(historico);

            resultado.setTotalImportadas(resultado.getTotalImportadas() + 1);

        } catch (Exception e) {
            resultado.setTotalErros(resultado.getTotalErros() + 1);
            resultado.getMensagens().add("Linha " + rowNum + " (" + placa + "): " + e.getMessage());
        }
    }

    private Origem resolverOrigem(String nomeOrigem) {
        if (nomeOrigem == null || nomeOrigem.trim().isEmpty()) {
            return origemRepository.findById(7L).orElse(null); // Outro
        }

        String nomeTrim = nomeOrigem.trim();
        Optional<Origem> existente = origemRepository.findAll().stream()
                .filter(o -> o.getNome().equalsIgnoreCase(nomeTrim))
                .findFirst();

        if (existente.isPresent()) {
            return existente.get();
        }

        // Criar nova origem
        Origem nova = Origem.builder()
                .nome(nomeTrim)
                .ativo(true)
                .build();
        return origemRepository.save(nova);
    }

    private TipoServico resolverTipoServico(String nomeTipo) {
        if (nomeTipo == null || nomeTipo.trim().isEmpty()) {
            return tipoServicoRepository.findById(1L).orElse(null); // Mecânica
        }

        String nomeTrim = nomeTipo.trim();
        Optional<TipoServico> existente = tipoServicoRepository.findAll().stream()
                .filter(t -> t.getNome().equalsIgnoreCase(nomeTrim))
                .findFirst();

        if (existente.isPresent()) {
            return existente.get();
        }

        TipoServico novo = TipoServico.builder()
                .nome(nomeTrim)
                .ativo(true)
                .build();
        return tipoServicoRepository.save(novo);
    }

    public static EtapaOrdemServico parseEtapa(String etapaStr) {
        if (etapaStr == null || etapaStr.trim().isEmpty()) {
            return EtapaOrdemServico.AGUARDANDO_ORCAMENTO;
        }

        String normalizado = etapaStr.trim().toUpperCase()
                .replace("Ç", "C").replace("Ã", "A").replace("Õ", "O").replace("Á", "A").replace("É", "E").replace("Í", "I").replace("Ó", "O").replace("Ú", "U");

        if (normalizado.contains("AGUARDANDO") && normalizado.contains("ORCAMENTO")) {
            return EtapaOrdemServico.AGUARDANDO_ORCAMENTO;
        } else if (normalizado.contains("AGUARDANDO") && (normalizado.contains("RETIRADA") || normalizado.contains("ENTREGA"))) {
            return EtapaOrdemServico.AGUARDANDO_RETIRADA;
        } else if (normalizado.contains("ORCAMENTO")) {
            return EtapaOrdemServico.ORCAMENTO;
        } else if (normalizado.contains("APROVADO")) {
            return EtapaOrdemServico.APROVADO;
        } else if (normalizado.contains("SERVICO") || normalizado.contains("ANDAMENTO") || normalizado.contains("EXECUCAO")) {
            return EtapaOrdemServico.EM_SERVICO;
        } else if (normalizado.contains("FINALIZADO") || normalizado.contains("PRONTO")) {
            return EtapaOrdemServico.FINALIZADO;
        } else if (normalizado.contains("ENTREGUE") || normalizado.contains("SAIU")) {
            return EtapaOrdemServico.ENTREGUE;
        }

        return EtapaOrdemServico.AGUARDANDO_ORCAMENTO;
    }

    private LocalDate parseData(Cell cell, DataFormatter formatter) {
        if (cell == null) {
            return null;
        }

        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            Date date = cell.getDateCellValue();
            return date.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
        }

        String text = formatter.formatCellValue(cell).trim();
        return parseDataString(text);
    }

    private LocalDate parseDataString(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }

        for (DateTimeFormatter fmt : DATE_FORMATTERS) {
            try {
                return LocalDate.parse(text, fmt);
            } catch (DateTimeParseException ignored) {
            }
        }

        return null;
    }

    private BigDecimal parseMoeda(String text) {
        if (text == null || text.isBlank()) {
            return BigDecimal.ZERO;
        }

        try {
            String limpo = text.replace("R$", "")
                    .replace(" ", "")
                    .replace(".", "")
                    .replace(",", ".");
            return new BigDecimal(limpo.trim());
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }

    private Boolean parseBooleano(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }

        String s = text.trim().toUpperCase();
        return s.startsWith("S") || s.equals("SIM") || s.equals("1") || s.equals("TRUE") || s.equals("T");
    }

    private String getCellValue(Cell cell, DataFormatter formatter) {
        if (cell == null) {
            return "";
        }
        return formatter.formatCellValue(cell);
    }
}
