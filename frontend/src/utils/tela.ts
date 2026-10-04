import { useEffect, useState } from 'react';

/** true a partir do breakpoint md do Tailwind (768px): quadro em raias; abaixo disso, lista por etapa. */
export function useTelaLarga() {
  const consulta = '(min-width: 768px)';
  const [larga, setLarga] = useState(() => window.matchMedia(consulta).matches);

  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const aoMudar = () => setLarga(mq.matches);
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, []);

  return larga;
}
