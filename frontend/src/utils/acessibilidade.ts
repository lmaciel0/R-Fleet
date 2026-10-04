import { KeyboardEvent, useEffect, useRef } from 'react';

/**
 * Enter ou Espaço disparam a ação, como num botão. Usado em linhas de tabela clicáveis.
 * Ignora teclas vindas de um botão dentro do elemento, que já tem o próprio comportamento.
 */
export function ativarComTeclado(acao: () => void) {
  return (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      acao();
    }
  };
}

const FOCAVEIS = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Comportamento de modal para o teclado: o foco entra no diálogo ao abrir, o Tab fica preso dentro dele,
 * Esc fecha e, ao fechar, o foco volta para quem abriu. Ligue o ref no elemento com role="dialog"
 * (que precisa de tabIndex={-1} para receber o foco inicial).
 */
export function useDialogo<T extends HTMLElement>(onFechar: () => void) {
  const ref = useRef<T>(null);
  // Guarda a versão mais recente sem reinscrever o listener a cada render
  const onFecharRef = useRef(onFechar);
  onFecharRef.current = onFechar;

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    // Campo com autoFocus dentro do diálogo tem prioridade
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus();

    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onFecharRef.current();
        return;
      }
      const dialogo = ref.current;
      if (e.key !== 'Tab' || !dialogo) return;

      const focaveis = Array.from(dialogo.querySelectorAll<HTMLElement>(FOCAVEIS)).filter(
        (el) => !el.hasAttribute('disabled') && el.getClientRects().length > 0
      );
      if (focaveis.length === 0) {
        e.preventDefault();
        return;
      }
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const ativo = document.activeElement;

      if (!dialogo.contains(ativo)) {
        e.preventDefault();
        primeiro.focus();
      } else if (e.shiftKey && (ativo === primeiro || ativo === dialogo)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && ativo === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      anterior?.focus();
    };
  }, []);

  return ref;
}
