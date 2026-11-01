# Backend 1: índices e testes de integridade

Mapeamento das expressões consultadas na DAL e dos índices existentes em
`01_schema.sql`. A existência de um índice não comprova que o PostgreSQL o
utilizará: isso depende da consulta, seletividade, estatísticas e volume.
Este levantamento não executa `EXPLAIN` nem apresenta medição de desempenho.

## Consultas e índices existentes

| Operação da DAL | Expressão de filtro/ordenação | Índice existente e limite do mapeamento |
| :--- | :--- | :--- |
| Login e busca de usuário por e-mail | `lower(usuario.email) = lower(@email)` | `idx_usuario_email_busca`, único sobre a mesma expressão |
| Busca de usuário por ID; estado/falhas de login | `usuario.id = @id` | `usuario_pkey` |
| Listagem dos quatro perfis de cadastro | `perfil_acesso.nome_perfil::text = ANY(@perfis)`, `ORDER BY id` | `perfil_acesso_pkey` e `perfil_acesso_nome_perfil_key` existem; o cast para `text` não é a chave do índice único. Tabela pequena; sem afirmar uso para esse filtro |
| Obras ativas por status | `excluida_em IS NULL`, `status = CAST(@status AS status_obra_enum)` | `idx_obra_ativas_status`, parcial com o mesmo predicado de atividade |
| Obras ativas por categoria | `lower(obra.categoria) = lower(@categoria)` e, opcionalmente, status | `idx_obra_ativas_categoria_status` indexa **`categoria, status` sem `lower`**. Não corresponde à expressão de categoria usada por `ListarObras`; não afirmar cobertura integral nem criar índice sem avaliar o plano |
| Obras por nome do cliente | `cliente.nome ILIKE @nome`, com `%termo%` e escape de curingas | `idx_cliente_nome_busca`, GIN com `gin_trgm_ops`; termos curtos e seletividade afetam o plano |
| Join de obras ao cliente | `obra.id_cliente = cliente.id` | `idx_obra_cliente` e `cliente_pkey` |
| Busca/alteração de obra por ID | `obra.id = @id AND excluida_em IS NULL` | `obra_pkey`; exclusão lógica é filtro adicional |
| Cliente por ID ou documento | `cliente.id = @id` / `cpf_cnpj = @cpf` | `cliente_pkey` / `cliente_cpf_cnpj_key` |
| Listagem de clientes, incluindo a DAL nova | `nome ILIKE @nome`, `ORDER BY id`, paginação | `idx_cliente_nome_busca` e `cliente_pkey`; nenhum deles garante sozinho filtro e ordenação de toda combinação |
| Pagamento/custos de uma obra | `pagamento.id_obra = @obra` / `relatorio_custo.id_obra = @obra` | `pagamento_id_obra_key` / `relatorio_custo_id_obra_key`, índices das respectivas UNIQUEs |
| Materiais/kit de uma obra | `material.id_obra = @obra ORDER BY id` | `idx_material_obra`; a ordenação por `id` não integra esse índice |
| Comentários da obra | `comentario.id_obra = @obra`, tipo opcional, `ORDER BY data_registro, id` | `idx_comentario_obra`; não inclui tipo nem a ordenação |
| Comentário por ID | `comentario.id = @id` | `comentario_pkey` |
| Comentários vinculados à manutenção | `comentario.id_manutencao` | `idx_comentario_manutencao`, parcial para valores não nulos; relacionamento disponível no schema, sem consulta de listagem específica neste pacote |
| Histórico da obra | `id_obra = @obra ORDER BY data_alteracao DESC, id DESC` | `idx_historico_obra_data`, mesmas colunas e ordem |
| Programações por obra; verificação de acesso da equipe | `id_obra = @obra`, com `id_equipe = @equipe` quando necessário | `idx_programacao_obra`; a equipe é filtro adicional |
| Programações por equipe/data inicial | `id_equipe = @equipe`, `data_inicio >= @inicio`, `ORDER BY data_inicio, prioridade, id` | `idx_programacao_equipe_inicio`; prioridade e ID não integram esse índice |
| Listagem de programações com intervalo | `data_fim >= @inicio`, `data_inicio <= @fim`, equipe opcional | `idx_programacao_datas` e `idx_programacao_equipe_inicio` existem; desigualdades em duas datas não implicam cobertura integral |
| Rejeição de sobreposição na agenda | `id_equipe` e `daterange(data_inicio, data_fim, '[]')` | `ex_programacao_equipe_periodo`, índice GiST criado pela exclusion constraint; proteção de integridade, não promessa de acelerar os filtros por datas isoladas |
| Equipe e seus integrantes | `equipe.id` / `equipe_instalador.id_equipe` | `equipe_pkey` / `pk_equipe_instalador(id_equipe, id_usuario)` |
| Vínculo por usuário e cadastro de equipe | `equipe_instalador.id_usuario = ANY(@ids)` / `usuario.id = ANY(@ids)` | `idx_equipe_instalador_usuario` / `usuario_pkey`; bloqueios da transação não são índices novos |
| Instalações da equipe | `programacao_obra.id_equipe = @equipe`, obras ativas, `ORDER BY data_inicio, p.id` | `idx_programacao_equipe_inicio`, `obra_pkey`, `cliente_pkey`; `p.id` é ordenação adicional |
| Detalhe da instalação | Obra ativa por ID + `EXISTS` programação da mesma obra/equipe | `obra_pkey` e `idx_programacao_obra`; não há índice composto específico obra/equipe |
| Manutenções por equipe/status | `manutencao.id_equipe = @equipe`, status opcional, obra ativa, `ORDER BY m.id` | `idx_manutencao_equipe_status`; consulta atual compara `m.status::text`, enquanto o índice guarda o enum. Não afirmar uso da segunda coluna para esse cast; ID é ordenação adicional |
| Manutenção por ID e equipe | `manutencao.id = @id AND id_equipe = @equipe`, obra ativa | `manutencao_pkey`; equipe e atividade são filtros adicionais |
| Auditoria por entidade/registro | `audit_log.entidade, entidade_id` | `idx_audit_entidade` existe para esse acesso; a DAL atual somente insere auditoria, sem método de consulta por esse par |

Outros índices do schema, sem consulta própria nos novos métodos:
`idx_manutencao_obra_status` (manutenção por obra/status) e
`idx_cronograma_expira_em` (expiração de compartilhamento). Permanecem
inventariados sem afirmar que já atendem a rotas implementadas.

Não foram acrescentados índices nem alterado o schema nesta revisão. Os pontos
de expressão/ordenação acima são candidatos a análise de plano quando houver
volume representativo e necessidade observada.

## Cobertura automatizada da integridade

`tests/database/testes_integridade.sql` deve rodar em banco **descartável**,
preparado com o schema e o seed do repositório. O script contém
`\set ON_ERROR_STOP on`: asserção reprovada faz o `psql` terminar com erro.

Cada caso provoca uma operação inválida e exige **SQLSTATE, nome da constraint
ou índice e tabela** esperados. Assim, uma FK sobreposta não pode passar como
prova de outra. A suíte confronta os casos aprovados com o catálogo `public`:

| Objeto no schema atual | Quantidade de rejeições esperadas |
| :--- | ---: |
| Chaves estrangeiras | 21 |
| Constraints `UNIQUE` | 6 |
| Índice único funcional `idx_usuario_email_busca` | 1 |
| Chaves primárias, incluindo `schema_migrations` e `pk_equipe_instalador` | 16 |
| **Total** | **44** |

Novas FKs, PKs, UNIQUEs ou índices únicos sem caso de rejeição causam falha no
fechamento do inventário. Também é erro registrar um caso fora do catálogo.
Não se declara aqui cobertura de todos os `CHECK`, `NOT NULL`, exclusões ou
regras de negócio: a contagem refere-se precisamente aos objetos da tabela.
Os artefatos básicos de auditoria e a ausência de constraints não validadas
são verificados como pré-condições, sem contar como testes de rejeição.

Para isolar `fk_equipe_responsavel_usuario`, o caso adia somente a FK composta
do responsável. Para testar `usuario_email_key` separadamente do índice
funcional redundante, o caso remove temporariamente esse índice. As duas
alterações ocorrem dentro de subtransações revertidas quando a rejeição
esperada é capturada; o índice funcional é testado em seguida, com e-mail em
caixa diferente. O script inteiro termina em `ROLLBACK`.

Rollback não reverte avanços de sequências. Por isso, não executar no banco de
desenvolvimento ou em servidor compartilhado. São necessárias permissões de
dono dos objetos no banco descartável para o isolamento do índice de e-mail.

Execução recomendada: PostgreSQL 16 em container exclusivo, sem volume nem
porta do banco de desenvolvimento, e uma base vazia própria. Substituir
`CONTAINER_DESCARTAVEL` e `BASE_DESCARTAVEL` pelos nomes desse ambiente:

```sh
docker cp database/01_schema.sql CONTAINER_DESCARTAVEL:/tmp/01_schema.sql
docker cp database/02_seed.sql CONTAINER_DESCARTAVEL:/tmp/02_seed.sql
docker cp tests/database/testes_integridade.sql CONTAINER_DESCARTAVEL:/tmp/testes_integridade.sql
docker exec CONTAINER_DESCARTAVEL psql -X -v ON_ERROR_STOP=1 -U postgres -d BASE_DESCARTAVEL -f /tmp/01_schema.sql -f /tmp/02_seed.sql -f /tmp/testes_integridade.sql
```

Os nomes devem identificar explicitamente o ambiente de testes; não usar o
serviço `db` habitual do projeto. O resultado esperado é a tabela de cobertura
21/6/1/16, a mensagem de inventário completo e código de saída 0. Resultados
efetivamente executados devem ser registrados separadamente na evidência da
entrega; este documento descreve o contrato e não afirma uma execução.
