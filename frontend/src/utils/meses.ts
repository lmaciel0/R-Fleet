const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** "Setembro/2026" — `mes` de 1 a 12. */
export function rotuloMesLongo(ano: number, mes: number): string {
  return `${NOMES_MESES[mes - 1]}/${ano}`;
}

/** "Set/2026" — `mes` de 1 a 12. */
export function rotuloMesCurto(ano: number, mes: number): string {
  return `${NOMES_MESES[mes - 1].slice(0, 3)}/${ano}`;
}

/**
 * Primeiro e último dia do mês em ISO (aaaa-mm-dd), para os filtros da API.
 * `ano` e `mes` vêm da resposta da API, então só valores inteiros e válidos são aceitos.
 */
export function intervaloDoMes(ano: number, mes: number): { inicio: string; fim: string } {
  const a = Number(ano);
  const m = Number(mes);
  if (!Number.isInteger(a) || a < 1900 || a > 9999 || !Number.isInteger(m) || m < 1 || m > 12) {
    throw new Error('Mês inválido.');
  }
  // Dia 0 do mês seguinte = último dia deste mês (funciona também em dezembro)
  const ultimoDia = new Date(a, m, 0).getDate();
  const aaaa = String(a);
  const mm = String(m).padStart(2, '0');
  return {
    inicio: `${aaaa}-${mm}-01`,
    fim: `${aaaa}-${mm}-${String(ultimoDia).padStart(2, '0')}`,
  };
}

/** Nome do mês corrente no fuso da oficina, ex.: "outubro". */
export function nomeMesAtual(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());
}
