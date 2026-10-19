# Banco para as rotas do Backend 2

O schema novo está em `database/01_schema.sql` e o seed em
`database/02_seed.sql`. Em volume novo, os dois rodam automaticamente.

Para volume antigo, a API aplica a migration pendente no startup e registra a
versão e o checksum em `schema_migrations`. Bancos em que a migration já foi
aplicada manualmente são reconhecidos e adotados pelo controle de versão. A
migration preserva as antigas tabelas/tipos `homologacao` e `parecer_enum`.

Para conferir a versão aplicada:

```sql
SELECT version, checksum, aplicado_em FROM schema_migrations ORDER BY aplicado_em;
```

Disponível para as rotas:

- `cliente`: `cpf_cnpj` (obrigatório e único), `endereco`, `telefone`,
  `email`.
- `usuario`: `ativo`, `tentativas_login`, `bloqueado_ate`.
- `obra`: `quantidade_inversores`, `endereco` obrigatório, `descricao`,
  `projeto_arquivo`, `instrucoes`, `excluida_em`.
- `material`: `quantidade_utilizada`, `custo_unitario`.
- `comentario`: `tipo` e `id_manutencao`; `historico_obra`:
  `tipo_acao`; `relatorio_custo`: `valor_obra`.
- `equipe.id_responsavel` e `pagamento.data_confirmacao` obrigatórios.
- Tabelas `equipe_instalador`, `manutencao`, `audit_log` e
  `cronograma_compartilhado`.
- `comentario.id_manutencao` para comentário de manutenção.
- Exclusão lógica de obra por `excluida_em`.
- Bloqueio de programação sobreposta da mesma equipe.
- Histórico e auditoria aceitam apenas INSERT.

Ao criar uma equipe, gravar o responsável e os instaladores na mesma
transação. O responsável precisa estar em `equipe_instalador`.

O seed inclui obra concluída com `valor_obra`, manutenções pendente e
concluída, comentário de manutenção, auditoria e token de cronograma.
