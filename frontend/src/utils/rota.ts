import { useCallback, useEffect, useRef, useState } from 'react';
import { AbaApp } from '../types';

/**
 * Aba e OS aberta ficam no endereço (#tabela, #quadro/os/106): o F5 mantém a tela, o voltar do
 * navegador funciona e dá para mandar o link de uma OS. Usa hash para não depender do servidor.
 */
const SLUG: Record<AbaApp, string> = {
  kanban: 'quadro',
  tabela: 'tabela',
  dashboard: 'painel',
  historico: 'historico',
};
const ABA_DO_SLUG = Object.fromEntries(Object.entries(SLUG).map(([aba, slug]) => [slug, aba])) as Record<
  string,
  AbaApp
>;

export interface Rota {
  aba: AbaApp;
  osId: number | null;
}

export function lerRota(hash: string): Rota {
  const [slug, trecho, id] = hash.replace(/^#\/?/, '').split('/');
  const aba = ABA_DO_SLUG[slug] ?? 'kanban';
  const numero = trecho === 'os' && /^\d{1,9}$/.test(id ?? '') ? Number(id) : null;
  return { aba, osId: numero && numero > 0 ? numero : null };
}

export function montarHash({ aba, osId }: Rota): string {
  return `#${SLUG[aba]}${osId ? `/os/${osId}` : ''}`;
}

export function useRota() {
  const [rota, setRota] = useState<Rota>(() => lerRota(window.location.hash));
  // OS aberta por clique nesta visita: fechar volta no histórico em vez de empilhar outra entrada
  const abertaPorClique = useRef(false);

  useEffect(() => {
    const aoMudar = () => setRota(lerRota(window.location.hash));
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);

  const ir = useCallback((nova: Rota, substituir = false) => {
    const hash = montarHash(nova);
    if (hash === window.location.hash) return;
    if (substituir) {
      history.replaceState(null, '', hash);
      setRota(nova);
    } else {
      window.location.hash = hash;
    }
  }, []);

  const irParaAba = useCallback(
    (aba: AbaApp) => {
      abertaPorClique.current = false;
      ir({ aba, osId: null });
    },
    [ir]
  );

  const abrirOs = useCallback(
    (osId: number) => {
      abertaPorClique.current = true;
      ir({ aba: lerRota(window.location.hash).aba, osId });
    },
    [ir]
  );

  const fecharOs = useCallback(() => {
    if (abertaPorClique.current) {
      abertaPorClique.current = false;
      history.back();
    } else {
      // Veio por link ou F5: tira a OS do endereço sem criar entrada nova no histórico
      ir({ aba: lerRota(window.location.hash).aba, osId: null }, true);
    }
  }, [ir]);

  return { rota, irParaAba, abrirOs, fecharOs };
}
