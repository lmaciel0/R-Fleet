package com.rfleet.service;

import com.rfleet.dto.OrdemServicoDTO;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ExportadorService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public byte[] exportarXlsx(List<OrdemServicoDTO> ordens) throws IOException {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Ordens de Serviço");

            // Estilo do cabeçalho
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            // Estilos de dados
            CellStyle currencyStyle = workbook.createCellStyle();
            DataFormat format = workbook.createDataFormat();
            currencyStyle.setDataFormat(format.getFormat("R$ #,##0.00"));

            String[] colunas = {
                    "OS", "Placa", "Modelo", "Origem", "Tipo de Serviço",
                    "Etapa", "Data Entrada", "Data Saída", "Dias no Pátio", "Status SLA",
                    "Valor Orçado (R$)", "Faturado", "Data Faturamento", "NF", "Observações"
            };

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < colunas.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(colunas[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (OrdemServicoDTO os : ordens) {
                Row row = sheet.createRow(rowIdx++);

                row.createCell(0).setCellValue(os.getId() != null ? String.format("#%05d", os.getId()) : "");
                row.createCell(1).setCellValue(os.getPlacaFormatada() != null ? os.getPlacaFormatada() : os.getPlaca());
                row.createCell(2).setCellValue(os.getModelo() != null ? os.getModelo() : "");
                row.createCell(3).setCellValue(os.getOrigemNome() != null ? os.getOrigemNome() : "");
                row.createCell(4).setCellValue(os.getTipoServicoNome() != null ? os.getTipoServicoNome() : "");
                row.createCell(5).setCellValue(os.getEtapaDescricao() != null ? os.getEtapaDescricao() : "");
                row.createCell(6).setCellValue(os.getDataEntrada() != null ? os.getDataEntrada().format(DATE_FORMATTER) : "");
                row.createCell(7).setCellValue(os.getDataSaida() != null ? os.getDataSaida().format(DATE_FORMATTER) : "");
                row.createCell(8).setCellValue(os.getDiasNoPatio());
                row.createCell(9).setCellValue(os.getStatusSla() != null ? os.getStatusSla() : "");

                Cell cellValor = row.createCell(10);
                if (os.getValorOrcamento() != null) {
                    cellValor.setCellValue(os.getValorOrcamento().doubleValue());
                    cellValor.setCellStyle(currencyStyle);
                } else {
                    cellValor.setCellValue(0.0);
                }

                row.createCell(11).setCellValue(Boolean.TRUE.equals(os.getFaturado()) ? "Sim" : "Não");
                row.createCell(12).setCellValue(os.getDataFaturamento() != null ? os.getDataFaturamento().format(DATE_FORMATTER) : "");
                row.createCell(13).setCellValue(os.getNumeroNf() != null ? os.getNumeroNf() : "");
                row.createCell(14).setCellValue(os.getObservacoes() != null ? os.getObservacoes() : "");
            }

            for (int i = 0; i < colunas.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    public byte[] exportarCsv(List<OrdemServicoDTO> ordens) {
        StringBuilder sb = new StringBuilder();

        // Byte Order Mark (BOM) UTF-8 para compatibilidade perfeita com Excel no Windows
        sb.append('\uFEFF');

        // Cabeçalho separado por ponto e vírgula
        sb.append("OS;Placa;Modelo;Origem;Tipo de Serviço;Etapa;Data Entrada;Data Saída;Dias no Pátio;Status SLA;Valor Orçado;Faturado;Data Faturamento;Número NF;Observações\n");

        for (OrdemServicoDTO os : ordens) {
            sb.append(os.getId() != null ? String.format("#%05d", os.getId()) : "").append(";");
            sb.append(escapeCsv(os.getPlacaFormatada() != null ? os.getPlacaFormatada() : os.getPlaca())).append(";");
            sb.append(escapeCsv(os.getModelo())).append(";");
            sb.append(escapeCsv(os.getOrigemNome())).append(";");
            sb.append(escapeCsv(os.getTipoServicoNome())).append(";");
            sb.append(escapeCsv(os.getEtapaDescricao())).append(";");
            sb.append(os.getDataEntrada() != null ? os.getDataEntrada().format(DATE_FORMATTER) : "").append(";");
            sb.append(os.getDataSaida() != null ? os.getDataSaida().format(DATE_FORMATTER) : "").append(";");
            sb.append(os.getDiasNoPatio()).append(";");
            sb.append(escapeCsv(os.getStatusSla())).append(";");
            sb.append(os.getValorOrcamento() != null ? os.getValorOrcamento().toString().replace(".", ",") : "0,00").append(";");
            sb.append(Boolean.TRUE.equals(os.getFaturado()) ? "Sim" : "Não").append(";");
            sb.append(os.getDataFaturamento() != null ? os.getDataFaturamento().format(DATE_FORMATTER) : "").append(";");
            sb.append(escapeCsv(os.getNumeroNf())).append(";");
            sb.append(escapeCsv(os.getObservacoes())).append("\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        String v = neutralizarFormula(value).replace("\"", "\"\"");
        if (v.contains(";") || v.contains("\n") || v.contains("\r") || v.contains("\"")) {
            return "\"" + v + "\"";
        }
        return v;
    }

    /**
     * O Excel executa como fórmula uma célula de CSV que começa com = + - @ (ou tab/CR). O texto das
     * ordens vem de digitação e de planilhas importadas, então ganha um apóstrofo na frente.
     * No XLSX não é preciso: setCellValue(String) grava texto, nunca fórmula.
     */
    private static String neutralizarFormula(String valor) {
        if (!valor.isEmpty() && "=+-@\t\r".indexOf(valor.charAt(0)) >= 0) {
            return "'" + valor;
        }
        return valor;
    }
}
