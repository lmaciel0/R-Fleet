import React, { useState } from 'react';
import { api } from '../services/api';
import { ImportacaoResultado } from '../types';
import { useDialogo } from '../utils/acessibilidade';
import {
  X,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface ModalImportarProps {
  onFechar: () => void;
  onSucesso: () => void;
}

export const ModalImportar: React.FC<ModalImportarProps> = ({ onFechar, onSucesso }) => {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<ImportacaoResultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const dialogoRef = useDialogo<HTMLDivElement>(onFechar);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setArquivo(e.target.files[0]);
      setResultado(null);
      setErro(null);
    }
  };

  const handleImportar = async () => {
    if (!arquivo) return;
    setImportando(true);
    setErro(null);

    try {
      const res = await api.importarPlanilha(arquivo);
      setResultado(res);
      if (res.totalImportadas > 0) {
        onSucesso();
      }
    } catch (err: any) {
      setErro(err.message || 'Erro ao importar planilha legada.');
    } finally {
      setImportando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div
        ref={dialogoRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-importar-titulo"
        className="outline-none bg-etiqueta border border-trilho w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-trilho flex items-center justify-between bg-parede/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-verde/10 border border-verde/40 flex items-center justify-center text-verde">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-importar-titulo" className="text-base font-bold text-grafite">Importar Planilha Legada</h3>
              <p className="text-xs text-aco">Migração de dados do Excel (.xlsx ou .csv)</p>
            </div>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-aco hover:text-grafite hover:bg-parede transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {erro && (
            <div role="alert" className="p-3 bg-vermelho/10 border border-vermelho/40 rounded-xl text-vermelho text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-vermelho mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {/* Instruções de colunas */}
          <div className="bg-parede/60 p-4 rounded-xl border border-trilho space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-mercosul font-bold">
              <Info className="w-4 h-4" />
              <span>Estrutura Esperada das Colunas:</span>
            </div>
            <p className="text-grafite leading-relaxed">
              A primeira linha deve ser o cabeçalho. As colunas devem estar na seguinte ordem:
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-aco font-placa tabular-nums pt-1">
              <div>A: OS / Número</div>
              <div>B: Placa *</div>
              <div>C: Modelo *</div>
              <div>D: Origem / Locadora</div>
              <div>E: Tipo de Serviço</div>
              <div>F: Etapa / Status</div>
              <div className="text-verde font-bold">G: Data de Entrada *</div>
              <div>H: Data de Saída</div>
              <div>I: Valor Orçado (R$)</div>
              <div>J: Faturado (Sim/Não)</div>
              <div>K: Observações / NF</div>
            </div>
          </div>

          {/* Dropzone */}
          <div className="border-2 border-dashed border-trilho hover:border-verde has-[:focus-visible]:border-verde/40 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-mercosul rounded-2xl p-6 text-center transition-colors">
            <input
              type="file"
              id="planilha-upload"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              disabled={importando}
              className="sr-only"
            />
            <label
              htmlFor="planilha-upload"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <div className="w-12 h-12 rounded-2xl bg-verde/10 border border-verde/40 flex items-center justify-center text-verde mb-1">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-verde hover:underline">
                {arquivo ? arquivo.name : 'Selecione ou arraste o arquivo aqui'}
              </span>
              <span className="text-[11px] text-aco">
                Suporta planilhas Excel (.xlsx) e arquivos delimitados (.csv)
              </span>
            </label>
          </div>

          {/* Resumo da Importação */}
          {resultado && (
            <div role="status" className="bg-parede/60 p-4 rounded-xl border border-trilho space-y-3">
              <h4 className="text-xs font-bold text-grafite uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-verde" />
                Resultado da Importação
              </h4>

              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-etiqueta p-2 rounded-lg border border-trilho">
                  <span className="text-aco block text-[10px]">Lidas</span>
                  <strong className="font-placa tabular-nums text-grafite">{resultado.totalLinhasLidas}</strong>
                </div>
                <div className="bg-etiqueta p-2 rounded-lg border border-trilho">
                  <span className="text-verde block text-[10px]">Importadas</span>
                  <strong className="font-placa tabular-nums text-verde">{resultado.totalImportadas}</strong>
                </div>
                <div className="bg-etiqueta p-2 rounded-lg border border-trilho">
                  <span className="text-amarelo-tinta block text-[10px]">Ignoradas</span>
                  <strong className="font-placa tabular-nums text-amarelo-tinta">{resultado.totalIgnoradas}</strong>
                </div>
                <div className="bg-etiqueta p-2 rounded-lg border border-trilho">
                  <span className="text-vermelho block text-[10px]">Erros</span>
                  <strong className="font-placa tabular-nums text-vermelho">{resultado.totalErros}</strong>
                </div>
              </div>

              {resultado.mensagens.length > 0 && (
                <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] text-aco font-placa tabular-nums bg-etiqueta p-2.5 rounded-lg border border-trilho">
                  {resultado.mensagens.map((msg, idx) => (
                    <div key={idx} className="leading-tight">
                      &bull; {msg}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-trilho flex items-center justify-end gap-3 bg-parede/60">
          <button
            type="button"
            onClick={onFechar}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-aco hover:text-grafite hover:bg-parede transition-colors cursor-pointer"
          >
            Fechar
          </button>

          <button
            type="button"
            disabled={!arquivo || importando}
            onClick={handleImportar}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-sobre-cor bg-mercosul hover:bg-mercosul/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            {importando ? (
              <div className="w-4 h-4 border-2 border-sobre-cor/30 border-t-sobre-cor rounded-full animate-spin" />
            ) : (
              <span>Processar e Importar</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
