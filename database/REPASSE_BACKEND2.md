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

## Sprint 5 · Banco local para materiais, equipes e senha

O pacote do Backend 1 cobre RF-06, RF-07, RF-09, RF-19, RF-21, RF-22 e RF-25.
A referência é a `main` `3a78fed`.

| Migration | Alteração |
| --- | --- |
| `20261122_01_status_em_solicitacao.sql` | Acrescenta `EmSolicitacao` antes de `Comprado` no enum `public.status_logistico_enum`. |
| `20261122_02_catalogo_produtos.sql` | Cria `public.produto` e adiciona `material.id_produto` opcional, com FK e índice. O produto nasce ativo. A FK bloqueia a exclusão do produto referenciado. |
| `20261122_03_materiais_corte.sql` | Exige produto e status, define `EmSolicitacao` como padrão e recusa inclusão com produto inativo. A inclusão guarda o custo vigente do catálogo. |
| `20261122_04_equipes_temporais.sql` | Cria equipe por programação e instala as restrições de integrantes, período e sobreposição. Converte os vínculos antigos e preserva a equipe fixa de manutenção. |
| `20261122_05_redefinicao_senha.sql` | Instala o armazenamento do hash do token, consumo atômico e versão de credencial. |

### Preparação e corte

A instalação nova parte de `01_schema.sql` e usa as migrations para chegar ao
schema final. O seed antigo é carregado antes da fase 03. Depois da fase 02,
`04_catalogo_demonstracao.sql` carrega sete produtos fictícios e associa os 15
materiais do seed. Essa carga foi feita para o seed e usa seus IDs, nomes e
preços. Execute a carga uma vez na fixture local. Em outra base, faça seu próprio
mapeamento de produto, unidade e preços antes do corte. A fase 03 aborta se
qualquer material ainda estiver sem produto ou status.

O Backend 2 precisa embutir as cinco migrations no projeto e registrá-las no
`SchemaMigrator` após as versões vigentes. A fase 01 deve confirmar antes de a
fase 03 usar `EmSolicitacao`. Preserve a exclusão mútua entre confirmações e
registre versão e checksum na transação da fase correspondente. As fases 03 e 04
exigem a API adaptada no corte. A API atual escreve materiais sem `produtoId`,
grava programações sem equipe temporal e espera `programacao_obra.id_equipe`
preenchido ao ler programações. Planeje a atualização coordenada desses fluxos.

### Contrato de escrita para Backend 2

- **Material.** A inclusão envia `id_produto`, `id_obra` e `quantidade`. O banco
  preenche `tipo` com o nome do produto para as consultas antigas e grava o custo
  do momento da inclusão. O vínculo de um lançamento é imutável. Mudanças de
  preço ou desativação preservam os lançamentos anteriores. Para o ambiente
  local foi seguida a regra de cópia do preço descrita no contrato. Confirme
  Q13 com Financeiro antes de aplicar em uma base do cliente. A API é responsável
  pela progressão de status (Q12) e pela omissão de valores por perfil.
- **Programação.** Na mesma transação, inserir `programacao_obra`, inserir
  `equipe_temporal` pelo `id_programacao` e então os integrantes. A programação
  nova pode ter `id_equipe` legado nulo. Ao incluir um integrante, enviar
  `id_equipe` temporal e `id_usuario`, mais as datas quando precisarem divergir
  do período total. O banco deriva `id_programacao`, `periodo_programacao` e
  `reserva_agenda`. O modelo admite um intervalo por instalador em cada equipe,
  conforme a unicidade do contrato atual. Na conversão, pessoas previstas são
  a contagem de integrantes legados, com mínimo de um, e as datas são as da
  programação. Esses valores representam planejamento, sem atestar presença.
- **Reordenação e exclusão.** Atualizar a programação e seus integrantes em uma
  transação. Após atualizar o período da programação, atualizar os integrantes
  mesmo quando suas datas individuais continuarem iguais. Isso atualiza o período
  de referência usado pela FK. Para movimentos em cadeia, a exclusão GiST
  `ex_instalador_periodo` aceita adiamento dentro da transação. Traduzir `23P01`
  dessa restrição em conflito de agenda (HTTP 409). A decisão Q10 cabe à API e
  a Requisitos. A exclusão lógica da obra desativa a reserva sem apagar o
  vínculo. Use `reserva_agenda = true` na consulta de ocupação. A autorização
  por vínculo atual ou histórico deve seguir a regra de cada endpoint.
- **Manutenção.** Usar o relacionamento legado de `manutencao.id_equipe`
  enquanto houver manutenção sem programação ou decisão de conversão pendente.
  O seed contém uma manutenção desse tipo e ela sobrevive ao corte.
- **Senha.** Emitir token aleatório na API e armazenar só o SHA-256 de 32 bytes
  em `token_redefinicao_senha`, junto do usuário e de sua `versao_credencial`.
  A expiração padrão é uma hora. Chamar `consumir_token_redefinicao(hash)` e
  atualizar o hash da senha dentro da mesma transação. A função devolve o ID
  ou `NULL`. A API inclui a versão de credencial no JWT e compara com o valor
  atual. Troca de senha, perfil ou estado incrementa a versão no banco. A API
  também precisa tratar os tokens emitidos antes da adoção da versão.

### Verificação do lote

```powershell
pwsh -NoProfile -File tests/executar-banco-sprint5.ps1
```

Em 22/11/2026, o runner passou no PostgreSQL 16 isolado. Validou 44 chaves e
índices únicos do legado, dump e restauração, confirmação separada do enum e
schemas finais equivalentes na instalação nova e no upgrade. Os 15 materiais
mantiveram custos e dados anteriores. A conversão local gerou sete produtos, dez
equipes temporais e dez integrantes. Duas conexões simultâneas produziram uma
única reserva por instalador no intervalo conflitante e um único consumo do
mesmo token. A validação cobre também a preservação de manutenção e a liberação
da agenda na exclusão lógica da obra.

O runner executa os SQLs em sessões de `psql` e usa instâncias descartáveis.
Registro automático de versões, reinício concorrente da API e fluxos do Front
ficam para a integração. O pacote foi desenvolvido e testado localmente.
