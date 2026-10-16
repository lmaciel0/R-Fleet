const formatadorCampo = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Máscara de digitação: só dígitos viram centavos ("15050" -> "150,50"). */
export const mascararMoeda = (digitado: string): string =>
  formatadorCampo.format(Number(digitado.replace(/\D/g, '')) / 100);

/** Número vindo da API para o texto do campo ("1500.5" -> "1.500,50"). */
export const paraCampoMoeda = (valor: number | null | undefined): string =>
  formatadorCampo.format(valor ?? 0);

/** Texto do campo ("1.500,50") de volta para número. */
export const lerMoeda = (campo: string): number => Number(campo.replace(/\./g, '').replace(',', '.')) || 0;

const formatadorBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatarMoeda = (valor: number | null | undefined): string => formatadorBRL.format(valor || 0);
