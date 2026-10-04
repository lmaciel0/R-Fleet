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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        ref={dialogoRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-importar-titulo"
        className="outline-none bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-importar-titulo" className="text-base font-bold text-slate-100">Importar Planilha Legada</h3>
              <p className="text-xs text-slate-400">Migração de dados do Excel (.xlsx ou .csv)</p>
            </div>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {erro && (
            <div role="alert" className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {/* Instruções de colunas */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-sky-400 font-bold">
              <Info className="w-4 h-4" />
              <span>Estrutura Esperada das Colunas:</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              A primeira linha deve ser o cabeçalho. As colunas devem estar na seguinte ordem:
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-400 font-mono pt-1">
              <div>A: OS / Número</div>
              <div>B: Placa *</div>
              <div>C: Modelo *</div>
              <div>D: Origem / Locadora</div>
              <div>E: Tipo de Serviço</div>
              <div>F: Etapa / Status</div>
              <div className="text-emerald-400 font-bold">G: Data de Entrada *</div>
              <div>H: Data de Saída</div>
              <div>I: Valor Orçado (R$)</div>
              <div>J: Faturado (Sim/Não)</div>
              <div>K: Observações / NF</div>
            </div>
          </div>

          {/* Dropzone */}
          <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500 has-[:focus-visible]:border-emerald-500 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-sky-400 rounded-2xl p-6 text-center transition-colors">
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
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-1">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-emerald-400 hover:underline">
                {arquivo ? arquivo.name : 'Selecione ou arraste o arquivo aqui'}
              </span>
              <span className="text-[11px] text-slate-400">
                Suporta planilhas Excel (.xlsx) e arquivos delimitados (.csv)
              </span>
            </label>
          </div>

          {/* Resumo da Importação */}
          {resultado && (
            <div role="status" className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Resultado da Importação
              </h4>

              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Lidas</span>
                  <strong className="font-mono text-slate-100">{resultado.totalLinhasLidas}</strong>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-emerald-400 block text-[10px]">Importadas</span>
                  <strong className="font-mono text-emerald-400">{resultado.totalImportadas}</strong>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-amber-400 block text-[10px]">Ignoradas</span>
                  <strong className="font-mono text-amber-400">{resultado.totalIgnoradas}</strong>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-rose-400 block text-[10px]">Erros</span>
                  <strong className="font-mono text-rose-400">{resultado.totalErros}</strong>
                </div>
              </div>

              {resultado.mensagens.length > 0 && (
                <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] text-slate-400 font-mono bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
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
        <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-950/60">
          <button
            type="button"
            onClick={onFechar}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Fechar
          </button>

          <button
            type="button"
            disabled={!arquivo || importando}
            onClick={handleImportar}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            {importando ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>Processar e Importar</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
