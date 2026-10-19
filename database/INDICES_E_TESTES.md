# Backend 1: índices e testes

| Consulta/filtro | Coluna(s) | Índice |
| :--- | :--- | :--- |
| Login por e-mail | `lower(usuario.email)` | `idx_usuario_email_busca` |
| Obras ativas por status | `obra.status` | `idx_obra_ativas_status` |
| Obras ativas por categoria e status | `obra.categoria, status` | `idx_obra_ativas_categoria_status` |
| Obras por nome do cliente | `cliente.nome` | `idx_cliente_nome_busca` |
| Materiais de uma obra | `material.id_obra` | `idx_material_obra` |
| Comentários de uma obra | `comentario.id_obra` | `idx_comentario_obra` |
| Histórico da obra, por data | `historico_obra.id_obra, data_alteracao` | `idx_historico_obra_data` |
| Programações por obra | `programacao_obra.id_obra` | `idx_programacao_obra` |
| Programações por equipe e início | `programacao_obra.id_equipe, data_inicio` | `idx_programacao_equipe_inicio` |
| Manutenções por obra/status | `manutencao.id_obra, status` | `idx_manutencao_obra_status` |
| Auditoria por registro | `audit_log.entidade, entidade_id` | `idx_audit_entidade` |

`tests/database/testes_integridade.sql` verifica a presença do log e dos
artefatos de auditoria, rejeita constraints não validadas e testa rejeições de
dados inválidos nas 21 FKs e 6 restrições `UNIQUE` atuais. A API também aplica
migrations pendentes em uma transação serializada no startup e valida `audit_log`
antes de aceitar requisições.

```sh
docker compose cp tests/database/testes_integridade.sql db:/tmp/testes_integridade.sql
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U pi4_user -d pi4_db -f /tmp/testes_integridade.sql
```
