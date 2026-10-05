import React, { useEffect, useId, useRef, useState } from 'react';
import { FileSpreadsheet, LogOut, Moon, MoreHorizontal, Sun } from 'lucide-react';

interface MenuMaisProps {
  tema: 'claro' | 'escuro';
  nome: string;
  email: string;
  onImportar: () => void;
  onAlternarTema: () => void;
  onSair: () => void;
}

const classeItem =
  'flex items-center gap-3 w-full min-h-12 px-4 text-left text-[15px] font-medium transition-colors cursor-pointer hover:bg-noite-alto';

/**
 * Menu "mais" do celular: reúne o que não cabe na barra de cima (importar, tema e sair).
 * Abre por toque, fecha com toque fora, Esc ou ao escolher uma opção, e Esc devolve o foco ao botão.
 */
export const MenuMais: React.FC<MenuMaisProps> = ({ tema, nome, email, onImportar, onAlternarTema, onSair }) => {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const idPainel = useId();

  useEffect(() => {
    if (!aberto) return;
    const fecharAoTocarFora = (e: PointerEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    };
    const fecharComEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAberto(false);
        botao.current?.focus();
      }
    };
    document.addEventListener('pointerdown', fecharAoTocarFora);
    document.addEventListener('keydown', fecharComEsc);
    return () => {
      document.removeEventListener('pointerdown', fecharAoTocarFora);
      document.removeEventListener('keydown', fecharComEsc);
    };
  }, [aberto]);

  const escolher = (acao: () => void) => () => {
    setAberto(false);
    acao();
  };

  const rotuloTema = tema === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro';

  return (
    <div ref={raiz} className="relative md:hidden">
      <button
        ref={botao}
        onClick={() => setAberto((v) => !v)}
        aria-label="Mais opções"
        aria-expanded={aberto}
        aria-controls={idPainel}
        className="flex items-center justify-center w-11 h-11 rounded-md text-noite-suave hover:text-noite-texto hover:bg-noite-alto transition-colors cursor-pointer"
      >
        <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
      </button>

      {aberto && (
        <div
          id={idPainel}
          className="absolute right-0 top-full mt-2 w-64 py-1 rounded-lg border border-noite-borda bg-noite shadow-[0_12px_32px_-8px_rgb(0_0_0/0.6)] animate-fade-in"
        >
          <div className="px-4 py-2.5 border-b border-noite-borda">
            <p className="text-[15px] font-semibold text-noite-texto truncate">{nome}</p>
            <p className="text-xs text-noite-suave truncate">{email}</p>
          </div>

          <button onClick={escolher(onImportar)} className={`${classeItem} text-noite-texto`}>
            <FileSpreadsheet className="w-5 h-5 text-[#5cc98a]" aria-hidden="true" />
            <span>Importar planilha</span>
          </button>
          <button onClick={escolher(onAlternarTema)} className={`${classeItem} text-noite-texto`}>
            {tema === 'escuro' ? (
              <Sun className="w-5 h-5 text-noite-suave" aria-hidden="true" />
            ) : (
              <Moon className="w-5 h-5 text-noite-suave" aria-hidden="true" />
            )}
            <span>{rotuloTema}</span>
          </button>

          {/* Sair fica separado e em cor de alerta, longe do que se toca no dia a dia */}
          <div className="mt-1 pt-1 border-t border-noite-borda">
            <button onClick={escolher(onSair)} className={`${classeItem} text-alerta-noite`}>
              <LogOut className="w-5 h-5" aria-hidden="true" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
