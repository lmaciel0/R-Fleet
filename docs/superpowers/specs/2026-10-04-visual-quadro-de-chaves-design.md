# Visual "Quadro de chaves" — plano de design

**Data:** 2026-10-04
**Escopo desta passada:** tokens e tema claro do app inteiro, navbar, quadro Kanban e card.
As outras telas (tabela, dashboard, histórico, login, modais) recebem só a conversão de cores
para os tokens novos; o redesenho delas fica para depois.

## Brief

- **Assunto:** o pátio de uma oficina de mecânica e funilaria; boa parte dos carros vem de locadoras.
- **Público:** uma pessoa, o gestor. No pátio usa o celular, muitas vezes no sol; no escritório, o desktop.
- **Função principal:** ver de relance quais carros estão em aberto e quais estão parados, e mover a etapa
  com um clique ou arrastando.

## Conceito

Oficina pendura as chaves dos carros num quadro, separadas por etapa, cada uma com uma etiqueta onde
está escrita a placa. O gestor olha o quadro e sabe onde cada carro está. O Kanban do R-Fleet é esse
quadro: cada coluna é um trilho de ganchos e cada carro é uma etiqueta de chave pendurada nele.

## Cores

| Nome | Hex | Papel |
|---|---|---|
| Parede | `#E2E5E3` | Fundo da página; o painel onde as etiquetas ficam |
| Etiqueta | `#FFFFFF` | Superfície de cards, modais e painéis |
| Grafite | `#23272B` | Texto principal (15:1 sobre etiqueta) |
| Aço | `#566064` | Texto secundário (6,5:1 sobre etiqueta, 5,1:1 sobre parede) |
| Trilho | `#BFC5C7` | Linhas, bordas e o trilho das colunas |
| Azul Mercosul | `#003399` | Único acento: ação principal, aba ativa, foco. É o azul da faixa da placa |

Semáforo (só onde há status; vem da planilha original):

| Nome | Hex | Uso |
|---|---|---|
| Verde | `#1B7340` | Concluído |
| Amarelo | `#E8A600` | Em aberto, dentro do prazo (faixas e preenchimentos) |
| Amarelo tinta | `#7A5200` | Texto do estado amarelo (o amarelo puro não é legível como texto) |
| Vermelho | `#B3261E` | Parado além do limite |

Todas as combinações de texto passam de 4,5:1 sobre etiqueta e sobre parede.

## Tipografia

Uma família, duas larguras: **Barlow**, desenhada a partir de placas de carro e sinalização de estrada.

- **Barlow Semi Condensed 600/700** — o que se lê como placa ou placa de sinalização: a placa, o nome
  das etapas, os números grandes. Números sempre com algarismos tabulares.
- **Barlow 400/500/600** — o resto da interface.
- Escala (razão ~1,25): 13 / 16 / 20 / 25 / 31 px. Corpo em 16 px, porque no celular, no sol,
  14 px é pequeno demais.
- Texto em caixa normal (sentence case). Nada de rótulos em caixa alta.
- A JetBrains Mono sai. Os números usam Barlow Semi Condensed com `tabular-nums`.

## Layout

Navbar clara, alinhada à esquerda, sem moldura:

```
R-Fleet   Quadro  Tabela  Painel  Histórico        14 no pátio  [3 parados]  Importar  [Registrar entrada]  Sair
```

Quadro: cada coluna é um trilho com o nome da etapa e a contagem. As etiquetas ficam penduradas
embaixo, em fila.

```
Aguardando orçamento  3          Orçamento  2   1 parado
━━━━━━━━━━━━━━━━━━━━━━━          ━━━━━━━━━━━━━━━━━━━━━━━
   ╱‾‾‾‾‾(o)‾‾‾‾‾╲                  ╱‾‾‾‾‾(o)‾‾‾‾‾╲
  ┃ ▀BRASIL▀▀▀▀▀▀ ┃                 ┃ ▀BRASIL▀▀▀▀▀▀ ┃
  ┃   BRA2E19     ┃                 ┃   QTX4F82     ┃
  ┃ Onix 1.0      ┃                 ┃ HB20 1.6      ┃
  ┃ Movida, funil.┃                 ┃ Unidas, mec.  ┃
  ┃ 18 dias parado┃ ← faixa         ┃ 4 dias        ┃ ← faixa
  ┃ R$ 1.500,00   ┃   vermelha      ┃ R$ 820,00     ┃   amarela
  ┃ Mover para    ┃                 ┃ Mover para    ┃
  ┃ Orçamento     ┃                 ┃ Aprovado      ┃
   ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾                   ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
```

- **A etiqueta:** cantos de cima chanfrados, ilhós (furo reforçado) no topo, placa centralizada
  logo abaixo. Faixa de cor do semáforo na borda esquerda, sempre acompanhada de texto
  ("18 dias parado", "4 dias", "Pronto").
- Alinhamento à esquerda dentro da etiqueta; só a placa é centralizada, como numa etiqueta real.
- Coluna sem carros: só o trilho e a frase "Nenhum carro nesta etapa".
- Arrastando por cima de uma coluna, o trilho fica azul e o fundo da coluna ganha um leve tom azul.
- Celular: as colunas rolam na horizontal e param encaixadas em cada coluna.

## Princípios

1. **O quadro é a tela.** Cada carro é uma etiqueta legível a um braço de distância, no sol.
2. **Cor é status.** Azul é ação; verde, amarelo e vermelho só aparecem com significado de semáforo.
   O resto é grafite, aço e branco.
3. **A placa é o nome do carro.** Placa primeiro, modelo depois.
4. **A ousadia fica num lugar só:** a forma da etiqueta. Em volta, tudo plano e quieto: sem degradê,
   sem brilho, sem sombra colorida, sem animação contínua.
5. **Palavras simples em português.** Botões dizem o que fazem ("Registrar entrada",
   "Mover para Aprovado"), sem seta no fim.

## Revisão contra os padrões genéricos

O que eu teria feito no automático e troquei:

| Padrão no automático | Troca | Por quê |
|---|---|---|
| Fundo cinza bem claro (`#F3F4F6`) com cards brancos | Parede `#E2E5E3`, mais escura | Etiqueta branca precisa se destacar como no quadro de verdade; ajuda no sol |
| Botão principal verde em degradê ("Nova Entrada") | Azul Mercosul, sólido, "Registrar entrada" | Verde quer dizer concluído; degradê é enfeite |
| Uma cor por etapa (7 matizes nas colunas) | Sem cor por etapa | A etapa é identificada pela posição e pelo nome; cor fica para o semáforo |
| Origem e serviço em pílulas coloridas | Uma linha de texto ("Movida, funilaria") | Menos moldura; a informação é secundária |
| "Avançar →" | "Mover para Orçamento" | A seta é um vício; o botão passa a dizer o destino |
| Monoespaçada para números e IDs | Barlow Semi Condensed tabular | Monoespaçada em dado pequeno é marca de template |
| Vermelho pulsante no atraso (pedido na spec original) | Faixa vermelha fixa + "18 dias parado" | Pulsar o tempo todo cansa e some no sol; o contraste fixo comunica melhor |
| Card sobe no hover, sombra em tudo | Hover só escurece a borda; sombra só nos modais | Movimento só em resposta a uma ação |
| Selos "PRO" e "v1.0", ícone em degradê no logo | Só a palavra "R-Fleet" | Selos que não informam nada |

Risco que fica: azul escuro como cor de ação é comum. Mantive porque aqui ele é o azul da placa e
aparece junto com a placa em todo card, o que amarra a cor ao assunto.

## Revisão 2 — mais vida e tema escuro (2026-10-04)

Retorno do uso em produção: com o pátio vazio, o sistema "morreu". Era cinza chapado, só o azul aparecia e as
sete colunas repetiam "Nenhum carro nesta etapa". Além disso, o tema escuro precisa existir, e o usuário
escolhe qual usar.

O que mudou em relação ao plano acima:

- **Cor por etapa** (decisão do usuário). Cada etapa tem uma cor, como ganchos coloridos: a cabeça da etiqueta,
  o trilho e o selo de contagem da coluna, as barras do painel e a marca na tabela. O botão "Mover para"
  usa a cor da próxima etapa. Isso substitui o princípio "cor é só status".
- **Semáforo de prazo vira selo** com texto ("18 dias parado", "5 dias no pátio", "Pronto, 11 dias"),
  no lugar da faixa lateral, que agora competiria com a cor da etapa.
- **Tema escuro** em `[data-tema="escuro"]`, redefinindo os mesmos tokens. Abre no tema do sistema e o
  botão na navbar alterna; a escolha fica salva em `localStorage` (`rfleet_tema`). Um script no
  `index.html` aplica o tema antes de pintar, para não piscar.
- **Texto sobre cor** (`sobre-cor`): branco no claro e grafite no escuro. No escuro, o azul e as cores de
  semáforo ficam claras o bastante para serem lidas como texto, então o texto em cima delas precisa ser escuro.
- **A placa mantém as cores reais** (branca, faixa `#003399`, letras escuras) nos dois temas.
- **Pátio vazio**: um trilho com um gancho de cada cor de etapa, "Nenhum carro no pátio" e as ações
  "Registrar entrada" e "Importar planilha".
- **Painel perfurado**: furos discretos em grade no fundo, como o eucatex onde a oficina pendura ferramentas.
- **O quadro usa a largura toda da tela**, e as colunas não têm mais altura mínima (a barra de rolagem
  ficava solta no meio da tela).

| Etapa | Claro | Escuro |
|---|---|---|
| Aguardando orçamento | `#5A6B85` | `#9AABC4` |
| Orçamento | `#2459D6` | `#7EA2FF` |
| Aprovado | `#0B7F7B` | `#3FC7C0` |
| Em serviço | `#C2560A` | `#FF9A4D` |
| Finalizado | `#6A3FC4` | `#B595FF` |
| Aguardando retirada | `#23824B` | `#5CC98A` |
| Entregue | `#4A5056` | `#AEB5BA` |

Todas passam de 4,5:1 como texto sobre a etiqueta e como fundo de selo com `sobre-cor`.
