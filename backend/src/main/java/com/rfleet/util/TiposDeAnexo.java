package com.rfleet.util;

import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Tipos de arquivo aceitos como anexo de OS. O tipo vem da extensão, nunca do Content-Type enviado
 * pelo cliente: assim um HTML ou SVG renomeado não é devolvido ao navegador como página ativa.
 */
public final class TiposDeAnexo {

    public static final String DESCRICAO_PERMITIDOS = "PDF, imagem (JPG, PNG, WEBP, HEIC), Word, Excel ou TXT";
    public static final String TIPO_PADRAO = "application/octet-stream";

    private static final int TAMANHO_MAXIMO_NOME = 200;

    private static final Map<String, String> POR_EXTENSAO = Map.ofEntries(
            Map.entry("pdf", "application/pdf"),
            Map.entry("jpg", "image/jpeg"),
            Map.entry("jpeg", "image/jpeg"),
            Map.entry("png", "image/png"),
            Map.entry("webp", "image/webp"),
            Map.entry("heic", "image/heic"),
            Map.entry("doc", "application/msword"),
            Map.entry("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            Map.entry("xls", "application/vnd.ms-excel"),
            Map.entry("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            Map.entry("txt", "text/plain")
    );

    private TiposDeAnexo() {
    }

    /** Tipo de conteúdo da extensão do arquivo, ou vazio se a extensão não é permitida. */
    public static Optional<String> tipoPorNome(String nomeArquivo) {
        if (nomeArquivo == null) {
            return Optional.empty();
        }
        int ponto = nomeArquivo.lastIndexOf('.');
        if (ponto < 0 || ponto == nomeArquivo.length() - 1) {
            return Optional.empty();
        }
        return Optional.ofNullable(POR_EXTENSAO.get(nomeArquivo.substring(ponto + 1).toLowerCase(Locale.ROOT)));
    }

    /** Tipo para servir o arquivo: o da extensão; anexos antigos de tipo desconhecido saem como binário genérico. */
    public static String tipoParaDownload(String nomeArquivo) {
        return tipoPorNome(nomeArquivo).orElse(TIPO_PADRAO);
    }

    /**
     * Nome seguro para guardar e devolver em cabeçalho: só o último trecho do caminho, sem aspas,
     * barras invertidas nem caracteres de controle, e com tamanho que cabe na coluna do banco.
     */
    public static String nomeSeguro(String nomeOriginal) {
        String nome = nomeOriginal == null ? "" : nomeOriginal.replace('\\', '/');
        nome = nome.substring(nome.lastIndexOf('/') + 1);
        nome = nome.replaceAll("[\\p{Cntrl}\"]", "_").trim();
        if (nome.isEmpty() || nome.equals(".") || nome.equals("..")) {
            return "arquivo";
        }
        if (nome.length() > TAMANHO_MAXIMO_NOME) {
            int ponto = nome.lastIndexOf('.');
            String extensao = ponto >= 0 && nome.length() - ponto <= 10 ? nome.substring(ponto) : "";
            nome = nome.substring(0, TAMANHO_MAXIMO_NOME - extensao.length()) + extensao;
        }
        return nome;
    }
}
