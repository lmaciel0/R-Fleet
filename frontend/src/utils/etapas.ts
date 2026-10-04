import { EtapaOrdemServico } from '../types';

/**
 * Etapas na ordem do fluxo, com o nome mostrado e a cor de cada uma.
 * As classes ficam escritas por extenso para o Tailwind encontrá-las.
 */
export const ETAPAS: {
  etapa: EtapaOrdemServico;
  titulo: string;
  /** fundo preenchido (selos, trilho, cabeça da etiqueta, barras) */
  fundo: string;
  /** texto na cor da etapa, só sobre a superfície da etiqueta */
  texto: string;
}[] = [
  { etapa: 'AGUARDANDO_ORCAMENTO', titulo: 'Aguardando orçamento', fundo: 'bg-etapa-aguardando', texto: 'text-etapa-aguardando' },
  { etapa: 'ORCAMENTO', titulo: 'Orçamento', fundo: 'bg-etapa-orcamento', texto: 'text-etapa-orcamento' },
  { etapa: 'APROVADO', titulo: 'Aprovado', fundo: 'bg-etapa-aprovado', texto: 'text-etapa-aprovado' },
  { etapa: 'EM_SERVICO', titulo: 'Em serviço', fundo: 'bg-etapa-servico', texto: 'text-etapa-servico' },
  { etapa: 'FINALIZADO', titulo: 'Finalizado', fundo: 'bg-etapa-finalizado', texto: 'text-etapa-finalizado' },
  { etapa: 'AGUARDANDO_RETIRADA', titulo: 'Aguardando retirada', fundo: 'bg-etapa-retirada', texto: 'text-etapa-retirada' },
  { etapa: 'ENTREGUE', titulo: 'Entregue', fundo: 'bg-etapa-entregue', texto: 'text-etapa-entregue' },
];

export const etapaInfo = (etapa: EtapaOrdemServico) => ETAPAS.find((e) => e.etapa === etapa) ?? ETAPAS[0];
