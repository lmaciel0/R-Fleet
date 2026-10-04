import { useEffect, useState } from 'react';

export type Tema = 'claro' | 'escuro';

const CHAVE = 'rfleet_tema';
const COR_DA_BARRA: Record<Tema, string> = { claro: '#0B1426', escuro: '#0C1527' };

function aplicar(tema: Tema) {
  document.documentElement.dataset.tema = tema;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COR_DA_BARRA[tema]);
}

function temaDoSistema(): Tema {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

function escolhaSalva(): Tema | null {
  try {
    const salvo = localStorage.getItem(CHAVE);
    return salvo === 'claro' || salvo === 'escuro' ? salvo : null;
  } catch {
    return null;
  }
}

/**
 * Tema claro/escuro. Sem escolha salva, segue o sistema (e acompanha se ele mudar);
 * depois que o usuário alterna, a escolha fica salva neste navegador.
 * O index.html aplica o tema antes do React carregar, para a tela não piscar.
 */
export function useTema() {
  const [tema, setTema] = useState<Tema>(
    () => (document.documentElement.dataset.tema as Tema | undefined) ?? escolhaSalva() ?? temaDoSistema()
  );

  useEffect(() => {
    if (escolhaSalva()) return;
    const consulta = window.matchMedia('(prefers-color-scheme: dark)');
    const aoMudar = () => {
      const novo = temaDoSistema();
      aplicar(novo);
      setTema(novo);
    };
    consulta.addEventListener('change', aoMudar);
    return () => consulta.removeEventListener('change', aoMudar);
  }, []);

  const alternar = () => {
    const novo: Tema = tema === 'escuro' ? 'claro' : 'escuro';
    try {
      localStorage.setItem(CHAVE, novo);
    } catch {
      // Sem armazenamento (aba anônima bloqueada): troca só nesta visita
    }
    aplicar(novo);
    setTema(novo);
  };

  return { tema, alternar };
}
