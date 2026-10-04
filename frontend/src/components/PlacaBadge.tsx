import React from 'react';

interface PlacaBadgeProps {
  placa: string;
  mercosul?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const PlacaBadge: React.FC<PlacaBadgeProps> = ({ placa, mercosul = true, size = 'md' }) => {
  const limpa = placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const formatada =
    limpa.length === 7
      ? mercosul
        ? limpa
        : `${limpa.slice(0, 3)}-${limpa.slice(3)}`
      : placa;

  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  if (mercosul) {
    return (
      <div
        className={`inline-flex flex-col items-center bg-white border-[1.5px] border-grafite rounded-[3px] overflow-hidden select-none font-placa tabular-nums ${
          isSmall
            ? 'h-6 min-w-[72px] text-[13px]'
            : isLarge
            ? 'h-11 min-w-[136px] text-[24px]'
            : 'h-8 min-w-[96px] text-[16px]'
        }`}
      >
        {/* Faixa Azul Mercosul */}
        <div
          className={`w-full bg-mercosul flex items-center justify-between px-1.5 text-white font-sans font-bold leading-none ${
            isSmall ? 'h-2 text-[6px]' : isLarge ? 'h-3 text-[8px]' : 'h-2.5 text-[7px]'
          }`}
        >
          <span className="tracking-tighter">BRASIL</span>
          <span className="opacity-80">★</span>
        </div>
        {/* Letras da Placa */}
        <div className="flex-1 flex items-center justify-center px-2 font-bold tracking-wide text-grafite leading-none">
          {formatada}
        </div>
      </div>
    );
  }

  // Placa Padrão Antiga (Cinza com tarja preta)
  return (
    <div
      className={`inline-flex items-center justify-center bg-[#c4c8ca] border-2 border-grafite rounded-[3px] text-grafite font-placa tabular-nums font-bold tracking-wide px-2 select-none ${
        isSmall
          ? 'h-6 text-[13px]'
          : isLarge
          ? 'h-11 text-[24px] px-3'
          : 'h-8 text-[16px]'
      }`}
    >
      {formatada}
    </div>
  );
};
