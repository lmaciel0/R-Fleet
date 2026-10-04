import React from 'react';

interface MarcaProps {
  /** nav: na barra de navegação; grande: na tela de login */
  tamanho?: 'nav' | 'grande';
}

/** Marca do R-Fleet: uma placa Mercosul com o nome no lugar dos caracteres. */
export const Marca: React.FC<MarcaProps> = ({ tamanho = 'nav' }) => {
  const grande = tamanho === 'grande';
  return (
    <span
      role="img"
      aria-label="R-Fleet"
      className={`inline-flex flex-col bg-white border-[#1b2333] overflow-hidden select-none shrink-0 ${
        grande
          ? 'w-[248px] h-[84px] border-[3px] rounded-[7px] shadow-[0_18px_50px_-12px_rgb(37_99_235/0.55)]'
          : 'w-[104px] h-[34px] border-[1.5px] rounded-[4px]'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex items-center justify-between bg-[#003399] text-white font-sans font-bold leading-none ${
          grande ? 'h-[20px] px-3 text-[11px] tracking-[0.18em]' : 'h-[9px] px-1.5 text-[6px] tracking-[0.12em]'
        }`}
      >
        <span>BRASIL</span>
        <span className="opacity-80">★</span>
      </span>
      <span
        aria-hidden="true"
        className={`flex-1 flex items-center justify-center font-placa font-bold text-[#1b2333] leading-none ${
          grande ? 'text-[44px] tracking-[0.06em]' : 'text-[19px] tracking-[0.04em]'
        }`}
      >
        R-FLEET
      </span>
    </span>
  );
};
