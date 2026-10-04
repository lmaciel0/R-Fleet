import React, { useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { OrdemServico } from '../types';
import { PlacaBadge } from './PlacaBadge';
import { api } from '../services/api';
import { etapaInfo } from '../utils/etapas';
import { useDialogo } from '../utils/acessibilidade';

interface BuscaRapidaProps {
  ordens: OrdemServico[];
  onAbrirOs: (id: number) => void;
  onRegistrarEntrada: (placa: string) => void;
  onFechar: () => void;
}

const LIMITE = 8;
const soLetrasENumeros = (texto: string) => texto.toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * "Cadê o carro tal?": procura a placa (ou o modelo) nos carros do pátio enquanto digita.
 * Se não achar e a placa estiver completa, pergunta ao servidor, que conhece também as OS fora da operação.
 */
export const BuscaRapida: React.FC<BuscaRapidaProps> = ({ ordens, onAbrirOs, onRegistrarEntrada, onFechar }) => {
  const [texto, setTexto] = useState('');
  const [marcado, setMarcado] = useState(0);
  const [consultando, setConsultando] = useState(false);
  const [semOsAberta, setSemOsAberta] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const dialogoRef = useDialogo<HTMLDivElement>(onFechar);

  const placaDigitada = soLetrasENumeros(texto);
  const resultados = useMemo(() => {
    const modelo = texto.trim().toLowerCase();
    if (!modelo) return [];
    return ordens
      .filter(
        (o) =>
          (placaDigitada && soLetrasENumeros(o.placa).includes(placaDigitada)) ||
          o.modelo.toLowerCase().includes(modelo)
      )
      .sort((a, b) => Number(b.statusSla === 'VERMELHO') - Number(a.statusSla === 'VERMELHO'))
      .slice(0, LIMITE);
  }, [ordens, texto, placaDigitada]);

  const placaCompleta = placaDigitada.length === 7;

  const consultarServidor = async () => {
    setConsultando(true);
    setErro(null);
    try {
      const res = await api.buscarPlaca(placaDigitada);
      if (res.possuiOsAtiva && res.ordemServicoAtivaId) {
        onAbrirOs(res.ordemServicoAtivaId);
      } else {
        setSemOsAberta(placaDigitada);
      }
    } catch (err: any) {
      setErro(err.message || 'Não foi possível consultar a placa. Tente de novo.');
    } finally {
      setConsultando(false);
    }
  };

  const aoTeclar = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' && resultados.length > 0) {
      e.preventDefault();
      setMarcado((m) => (m + 1) % resultados.length);
    } else if (e.key === 'ArrowUp' && resultados.length > 0) {
      e.preventDefault();
      setMarcado((m) => (m - 1 + resultados.length) % resultados.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (resultados[marcado]) onAbrirOs(resultados[marcado].id);
      else if (placaCompleta && !consultando) consultarServidor();
    }
  };

  const idOpcao = (i: number) => `busca-opcao-${i}`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh] bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onFechar}>
      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-label="Buscar placa"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-etiqueta border border-trilho rounded-xl shadow-2xl overflow-hidden focus:outline-none"
      >
        <div className="flex items-center gap-3 px-4 border-b border-trilho">
          <Search className="w-5 h-5 text-aco shrink-0" aria-hidden="true" />
          <input
            autoFocus
            type="search"
            role="combobox"
            aria-expanded={resultados.length > 0}
            aria-controls="busca-resultados"
            aria-activedescendant={resultados[marcado] ? idOpcao(marcado) : undefined}
            aria-label="Placa ou modelo"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setMarcado(0);
              setSemOsAberta(null);
              setErro(null);
            }}
            onKeyDown={aoTeclar}
            placeholder="Placa ou modelo"
            className="flex-1 min-w-0 h-14 bg-transparent font-placa text-[22px] font-semibold tracking-wide text-grafite placeholder:font-sans placeholder:text-[17px] placeholder:font-normal placeholder:tracking-normal placeholder:text-aco focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar busca"
            className="p-2.5 -mr-2 rounded-md text-aco hover:text-grafite hover:bg-parede cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {resultados.length > 0 && (
          <ul id="busca-resultados" role="listbox" aria-label="Carros encontrados" className="max-h-[50vh] overflow-y-auto py-1.5">
            {resultados.map((o, i) => {
              const etapa = etapaInfo(o.etapa);
              return (
                <li
                  key={o.id}
                  id={idOpcao(i)}
                  role="option"
                  aria-selected={i === marcado}
                  onMouseEnter={() => setMarcado(i)}
                  onClick={() => onAbrirOs(o.id)}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer ${i === marcado ? 'bg-mercosul/10' : ''}`}
                >
                  <PlacaBadge placa={o.placa} mercosul={o.mercosul} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-grafite truncate">{o.modelo}</span>
                    <span className="flex items-center gap-1.5 text-[13px] text-aco">
                      <span aria-hidden="true" className={`w-2 h-2 rounded-full ${etapa.fundo}`} />
                      <span>
                        {etapa.titulo}
                        {o.statusSla === 'VERMELHO' && (
                          <span className="font-semibold text-vermelho">, {o.diasNoPatio} dias parado</span>
                        )}
                      </span>
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {/* Rodapé: dica, consulta ao servidor ou o resultado dela */}
        <div className="px-4 py-3 border-t border-trilho bg-parede/50 text-[14px] text-aco" aria-live="polite">
          {erro ? (
            <p className="text-vermelho">{erro}</p>
          ) : semOsAberta ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p>
                <strong className="font-placa text-grafite">{semOsAberta}</strong> não tem OS aberta.
              </p>
              <button
                type="button"
                onClick={() => onRegistrarEntrada(semOsAberta)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-mercosul text-sobre-cor font-semibold cursor-pointer hover:bg-mercosul/90"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Registrar entrada
              </button>
            </div>
          ) : texto.trim() && resultados.length === 0 ? (
            placaCompleta ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p>Nenhum carro do pátio com essa placa.</p>
                <button
                  type="button"
                  onClick={consultarServidor}
                  disabled={consultando}
                  className="px-3 py-2 rounded-md border border-trilho bg-etiqueta text-grafite font-medium cursor-pointer hover:border-aco disabled:opacity-50 disabled:cursor-wait"
                >
                  {consultando ? 'Procurando…' : 'Procurar em todas as OS'}
                </button>
              </div>
            ) : (
              <p>Nenhum carro do pátio com esse texto. Digite a placa completa para procurar em todas as OS.</p>
            )
          ) : (
            <p>
              <span className="sm:hidden">Digite a placa ou o modelo do carro.</span>
              <span className="hidden sm:inline">Setas para escolher, Enter para abrir, Esc para fechar.</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
