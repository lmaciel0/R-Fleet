# Checklist antes de cada release

Revise antes de publicar ou fazer merge de uma release.

- [ ] `git ls-files` não lista `.env`, dumps, anexos, planos de IA nem notas pessoais.
- [ ] `git grep -nIiE 'senha|password|secret|token|@gmail|onrender|neon\.tech'` só acha placeholders e nomes de variáveis.
- [ ] O CI de varredura de segredos (Gitleaks) passou.
- [ ] Os números e comandos do README (portas, testes, variáveis) batem com o código.
- [ ] `docs/` e `render.yaml` não ganharam e-mails, senhas ou URLs que não precisam ser públicos.
- [ ] Se uma migration já aplicada em banco real foi editada, o checksum do Flyway foi tratado (`flyway repair`).
- [ ] Mensagens de erro e logs novos não devolvem dado interno ao cliente.
