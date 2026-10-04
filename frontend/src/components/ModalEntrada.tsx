import React, { useState, useEffect } from 'react';
import { Origem, TipoServico, BuscarPlacaResultado, EtapaOrdemServico } from '../types';
import { api } from '../services/api';
import { PlacaBadge } from './PlacaBadge';
import { useDialogo } from '../utils/acessibilidade';
import {
  X,
  Car,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Wrench,
  DollarSign,
  Calendar,
  FileText,
} from 'lucide-react';

interface ModalEntradaProps {
  origens: Origem[];
  tiposServico: TipoServico[];
  onFechar: () => void;
  onSucesso: (novaOrdem: any) => void;
}

export const ModalEntrada: React.FC<ModalEntradaProps> = ({
  origens,
  tiposServico,
  onFechar,
  onSucesso,
}) => {
  const [placa, setPlaca] = useState('');
  const [modelo, setModelo] = useState('');
  const [origemId, setOrigemId] = useState<number | undefined>(origens[0]?.id);
  const [tipoServicoId, setTipoServicoId] = useState<number | undefined>(tiposServico[0]?.id);
  const [etapa, setEtapa] = useState<EtapaOrdemServico>('AGUARDANDO_ORCAMENTO');
  const [valorOrcamento, setValorOrcamento] = useState<string>('0,00');
  const [dataEntrada, setDataEntrada] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [observacoes, setObservacoes] = useState('');

  const [buscandoPlaca, setBuscandoPlaca] = useState(false);
  const [resultadoPlaca, setResultadoPlaca] = useState<BuscarPlacaResultado | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const dialogoRef = useDialogo<HTMLDivElement>(onFechar);

  // Debounce search placa
  useEffect(() => {
    const limpa = placa.replace(/[^a-zA-Z0-9]/g, '');
    if (limpa.length !== 7) {
      setResultadoPlaca(null);
      return;
    }

    const timer = setTimeout(async () => {
      setBuscandoPlaca(true);
      try {
        const res = await api.buscarPlaca(limpa);
        setResultadoPlaca(res);
        if (res.encontrado) {
          if (res.modelo) setModelo(res.modelo);
          if (res.origemId) setOrigemId(res.origemId);
        }
      } catch {
        // Ignora erro de busca
      } finally {
        setBuscandoPlaca(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [placa]);

  const handlePlacaChange = (val: string) => {
    const limpa = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    setPlaca(limpa);
  };

  const handleValorChange = (val: string) => {
    const apenasDigitos = val.replace(/\D/g, '');
    const centavos = Number(apenasDigitos) / 100;
    setValorOrcamento(
      centavos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resultadoPlaca?.possuiOsAtiva) {
      setErro('Não é permitido abrir uma nova OS para um veículo que já possui OS ativa em andamento.');
      return;
    }

    setSalvando(true);
    setErro(null);

    const valorNum = Number(valorOrcamento.replace(/\./g, '').replace(',', '.')) || 0;

    try {
      const novaOs = await api.registrarEntrada({
        placa,
        modelo: modelo.trim().toUpperCase(),
        origemId,
        tipoServicoId,
        etapa,
        valorOrcamento: valorNum,
        dataEntrada,
        observacoes: observacoes.trim() || undefined,
      });

      onSucesso(novaOs);
    } catch (err: any) {
      setErro(err.message || 'Erro ao registrar entrada do veículo.');
    } finally {
      setSalvando(false);
    }
  };

  const impedidoPorOsAtiva = Boolean(resultadoPlaca?.possuiOsAtiva);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        ref={dialogoRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-entrada-titulo"
        className="outline-none bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-entrada-titulo" className="text-base font-bold text-slate-100">Registrar Entrada no Pátio</h3>
              <p className="text-xs text-slate-400">Fluxo rápido &lt; 30 segundos</p>
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

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {erro && (
            <div role="alert" className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {/* Alerta de OS Ativa Duplicada */}
          {impedidoPorOsAtiva && (
            <div role="alert" className="p-3.5 bg-amber-950/80 border border-amber-500/60 rounded-xl text-amber-200 text-xs flex items-start gap-2.5 shadow-lg shadow-amber-950/30 animate-pulse">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <strong className="block font-bold text-amber-300">
                  Veículo já possui OS ativa em andamento!
                </strong>
                <span>
                  A Ordem de Serviço #{String(resultadoPlaca?.ordemServicoAtivaId).padStart(5, '0')} está ativa na etapa &quot;{resultadoPlaca?.etapaAtivaDescricao}&quot;. Finalize a OS anterior antes de abrir uma nova entrada.
                </span>
              </div>
            </div>
          )}

          {/* Campo Placa com Busca e Preview */}
          <div>
            <label htmlFor="entrada-placa" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Placa do Veículo *
            </label>
            <div className="flex gap-3 items-center">
              <div className="relative flex-1">
                <input
                  type="text"
                  required
                  maxLength={7}
                  value={placa}
                  id="entrada-placa"
                  onChange={(e) => handlePlacaChange(e.target.value)}
                  placeholder="Ex: BRA2E19 ou ABC1234"
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm font-mono font-bold tracking-widest text-slate-100 placeholder-slate-500 uppercase focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                {buscandoPlaca && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              {placa.length === 7 && (
                <PlacaBadge
                  placa={placa}
                  mercosul={resultadoPlaca?.mercosul ?? true}
                  size="md"
                />
              )}
            </div>

            {/* Aviso de placa encontrada */}
            {resultadoPlaca?.encontrado && !resultadoPlaca?.possuiOsAtiva && (
              <p className="text-[11px] text-emerald-400 mt-1.5 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Veículo já cadastrado! Dados preenchidos automaticamente.
              </p>
            )}
          </div>

          {/* Modelo */}
          <div>
            <label htmlFor="entrada-modelo" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Modelo do Veículo *
            </label>
            <input
              type="text"
              required
              value={modelo}
              id="entrada-modelo"
              onChange={(e) => setModelo(e.target.value)}
              placeholder="Ex: CHEVROLET TRACKER 1.2 TURBO"
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 uppercase focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Grid: Origem e Tipo de Serviço */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="entrada-origem" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Origem / Locadora
              </label>
              <select
                value={origemId}
                id="entrada-origem"
                onChange={(e) => setOrigemId(Number(e.target.value))}
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {origens.map((origem) => (
                  <option key={origem.id} value={origem.id}>
                    {origem.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="entrada-tipo-servico" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-slate-400" />
                Tipo de Serviço
              </label>
              <select
                value={tipoServicoId}
                id="entrada-tipo-servico"
                onChange={(e) => setTipoServicoId(Number(e.target.value))}
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {tiposServico.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid: Etapa Inicial e Orçamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="entrada-etapa" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Etapa Inicial
              </label>
              <select
                value={etapa}
                id="entrada-etapa"
                onChange={(e) => setEtapa(e.target.value as EtapaOrdemServico)}
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="AGUARDANDO_ORCAMENTO">Aguardando Orçamento</option>
                <option value="ORCAMENTO">Orçamento</option>
                <option value="APROVADO">Aprovado</option>
                <option value="EM_SERVICO">Em Serviço</option>
              </select>
            </div>

            <div>
              <label htmlFor="entrada-valor" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Valor Orçado (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                  R$
                </span>
                <input
                  type="text"
                  value={valorOrcamento}
                  id="entrada-valor"
                  onChange={(e) => handleValorChange(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-mono font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Data de Entrada */}
          <div>
            <label htmlFor="entrada-data" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Data de Entrada
            </label>
            <input
              type="date"
              value={dataEntrada}
              id="entrada-data"
              onChange={(e) => setDataEntrada(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Observações */}
          <div>
            <label htmlFor="entrada-observacoes" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Observações / Detalhes do Serviço
            </label>
            <textarea
              rows={2}
              value={observacoes}
              id="entrada-observacoes"
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Barulho na suspensão dianteira; verificar pastilhas..."
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Rodapé e Botões */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onFechar}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={salvando || impedidoPorOsAtiva || placa.length !== 7 || !modelo.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              {salvando ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Confirmar Entrada</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
