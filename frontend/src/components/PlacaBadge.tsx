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
        className={`inline-flex flex-col items-center bg-white border border-slate-300 rounded shadow-sm overflow-hidden select-none font-mono ${
          isSmall
            ? 'h-6 min-w-[70px] text-[11px]'
            : isLarge
            ? 'h-10 min-w-[130px] text-lg'
            : 'h-8 min-w-[95px] text-sm'
        }`}
        style={{
          border: '1.5px solid #0f172a',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }}
      >
        {/* Faixa Azul Mercosul */}
        <div
          className={`w-full bg-[#003399] flex items-center justify-between px-1.5 text-white font-sans font-bold leading-none ${
            isSmall ? 'h-2 text-[6px]' : isLarge ? 'h-3.5 text-[9px]' : 'h-2.5 text-[7px]'
          }`}
        >
          <span className="tracking-tighter">BRASIL</span>
          <span className="opacity-80">★</span>
        </div>
        {/* Letras da Placa */}
        <div className="flex-1 flex items-center justify-center px-2 font-bold tracking-wider text-slate-900 leading-none">
          {formatada}
        </div>
      </div>
    );
  }

  // Placa Padrão Antiga (Cinza com tarja preta)
  return (
    <div
      className={`inline-flex items-center justify-center bg-slate-200 border-2 border-slate-700 rounded text-slate-900 font-mono font-bold tracking-widest px-2 select-none shadow-sm ${
        isSmall
          ? 'h-6 text-[11px]'
          : isLarge
          ? 'h-10 text-lg px-3'
          : 'h-8 text-sm'
      }`}
    >
      {formatada}
    </div>
  );
};
