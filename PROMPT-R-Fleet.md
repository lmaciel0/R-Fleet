# Projeto: R-Fleet — Sistema web de controle de veículos na oficina

## 1. Contexto e objetivo

Uma oficina mecânica e de funilaria controla hoje os carros numa planilha Excel
com macro (formulário de cadastro). Preciso de um **site online** que substitua
essa planilha e permita gerenciar a **entrada, a situação (etapa) e a saída** de
cada veículo, com histórico e visão geral para o dono da oficina.

Muitos veículos vêm de locadoras (ex.: Movida, Unidas), então o sistema deve
tratar a origem do carro como um cadastro, e não como texto livre.

## 2. Modelo de dados da planilha atual (ponto de partida)

Tabela "CONTROLE", uma linha por veículo:

| Campo atual | Significado real | Tipo |
|---|---|---|
| MODELO | Modelo do carro | texto |
| PLACA | Placa | texto, maiúsculas |
| ETAPA | Etapa atual | lista |
| FATURADO | Já foi faturado? | SIM/NÃO |
| VALORES/ORÇAMENTO | Valor do orçamento | dinheiro (R$) |
| DATA DA SAÍDA (coluna G) | Na verdade é a **data de entrada** | data |
| DATA DE SAÍDA (coluna H) | Data real de saída, preenchida à mão | data, opcional |
| SERVIÇO CONCLUÍDO | SIM ou EM ABERTO (verde/amarelo) | lista |
| DE ONDE É | Origem do veículo | lista |

Regras que a macro já aplica e devem ser mantidas:
- Obrigatórios no cadastro: modelo, placa, etapa, faturado, valor do orçamento
  (numérico), data de entrada (válida, padrão = hoje) e origem.
- Textos gravados em MAIÚSCULAS; espaços nas pontas removidos.
- Data de saída e "serviço concluído" não são preenchidas no cadastro.
- O formulário tem os botões Cadastrar, Limpar e Cancelar.

Listas de valores existentes:
- **Etapas (fluxo):** Aguardando Orçamento → Orçamento → Aprovado → Em Serviço →
  Finalizado → Aguardando Retirada → Entregue
- **Tipo de serviço:** Mecânica, Funilaria
- **Origem:** Cliente, Oficina, Concessionária, Seguradora, Outro, e também
  Movida e Unidas (listas soltas da planilha)
- **Faturado:** Sim, Não

## 3. Melhorias que o sistema deve trazer

1. **Histórico por veículo:** cada mudança de etapa gera um registro (etapa
   anterior, nova etapa, data/hora, usuário, observação).
2. **"Serviço concluído" derivado da etapa:** vira concluído a partir de
   "Finalizado". Não é campo manual.
3. **Data de saída automática** ao passar para "Entregue" (editável).
4. **Tempo na oficina:** dias desde a entrada, ou entrada → saída. Alerta visual
   para veículos parados acima de um limite configurável (padrão 15 dias).
5. **Placa única entre veículos ativos:** valida o formato (antigo ABC-1234 e
   Mercosul ABC1D23) e avisa se a placa já tem um serviço aberto.
6. **Origem e tipo de serviço são cadastros editáveis**, não texto livre.
7. **Múltiplos serviços por veículo:** o mesmo carro pode voltar à oficina. O
   cadastro do veículo (placa, modelo, origem) é separado da *ordem de serviço*
   (entrada, etapa, orçamento, faturado, saída).
8. **Anexos e observações** por ordem de serviço (fotos da entrada, orçamento em PDF).

## 4. Funcionalidades

**Cadastro / entrada**
- Formulário "Registrar entrada" (equivalente ao formulário da macro), com os
  campos da seção 2, tipo de serviço e observações. Data de entrada padrão = hoje.
- Autocompletar por placa quando o veículo já existe.

**Lista de veículos (tela principal)**
- Tabela com busca por placa/modelo e filtros por etapa, origem, tipo de
  serviço, faturado, concluído e período de entrada.
- Visão em **quadro (kanban)** por etapa, com arrastar e soltar para mudar a etapa.
- Cores: verde = concluído, amarelo = em aberto, vermelho = parado além do limite.
- Exportar a lista filtrada em CSV e Excel (o mesmo que a planilha oferecia).

**Detalhe da ordem de serviço**
- Dados, histórico de etapas em linha do tempo, anexos, observações.
- Ações: avançar etapa, voltar etapa, marcar faturado, registrar saída, editar valor.

**Painel (dashboard)**
- Carros hoje na oficina, por etapa.
- Entradas e saídas no mês.
- Valor total em orçamento e valor já faturado ou a faturar.
- Tempo médio de permanência.
- Carros parados há mais de N dias.

**Usuários e perfis**
- Login com e-mail e senha.
- Perfis: **Administrador** (tudo, inclusive usuários e cadastros auxiliares),
  **Operador** (registra entrada, muda etapa, anexa) e **Consulta** (somente leitura).
- Valores financeiros (orçamento/faturado) visíveis apenas para Administrador.

## 5. Requisitos não funcionais

- Interface em **português do Brasil**, moeda em R$, datas dd/mm/aaaa.
- **Responsivo**: será usado no celular, no pátio da oficina.
- Fuso: America/Sao_Paulo.
- Sem perda de dados: histórico nunca é apagado; exclusão é lógica (arquivar).
- Importação inicial a partir da planilha atual (CSV/XLSX), mapeando as colunas
  da seção 2 e tratando a coluna G como data de entrada.
- Mensagens de erro claras, validação no front e no back.
- Segurança: senhas com hash (BCrypt), JWT ou sessão com expiração, proteção
  contra upload malicioso, secrets só por variável de ambiente.

## 6. Stack sugerida (altere se preferir)

- Backend: Java 21 + Spring Boot 3, Spring Security, JPA/Hibernate, Flyway.
- Banco: PostgreSQL.
- Frontend: React + TypeScript + Vite.
- Testes: JUnit/Testcontainers no backend, Vitest no frontend.
- Infra: Docker Compose local, CI no GitHub Actions, deploy em Render ou similar.

## 7. Entregáveis e forma de trabalho

1. Primeiro, uma **spec de design** (`docs/`) com modelo de dados (ER),
   endpoints da API, telas e regras de negócio. Aguarde minha aprovação.
2. Depois, um **plano de implementação** em etapas pequenas.
3. Implementação em commits pequenos no padrão Conventional Commits
   (`feat:`, `fix:`, `docs:`, `chore:`).
4. Cada etapa com testes, e o CI deve ficar verde.
5. README com como rodar localmente, variáveis de ambiente e contas de demonstração.
6. Dados de demonstração (seed) com alguns carros em cada etapa.

## 8. Critérios de aceite do MVP

- Registro uma entrada em menos de 30 segundos.
- Mudo a etapa de um carro em 1 clique ou arrastando no quadro.
- Vejo, de relance, quais carros estão em aberto e quais estão parados.
- Importo a planilha atual sem perder linhas.
- Funciona no celular.

## 9. Fora do escopo do MVP

Emissão de nota fiscal, integração com seguradoras, controle de estoque de
peças, notificações por WhatsApp/e-mail (possível fase 2).

## 10. Perguntas que você deve me fazer antes de começar a spec

- Quantos carros por mês e quantos usuários simultâneos?
- A oficina trabalha com mais de uma unidade?
- O orçamento muda ao longo do serviço (versões do orçamento)?
- Preciso de controle de pagamento parcial ou "faturado" é só SIM/NÃO?
