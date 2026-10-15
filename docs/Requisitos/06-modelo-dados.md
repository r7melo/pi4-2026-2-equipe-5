# Modelo de Dados

Banco PostgreSQL. Nomes de tabelas e colunas em `snake_case`. No JSON da API, os mesmos campos são expostos em `camelCase`.

## Entidades

### cliente

| Coluna | Tipo | Obrigatório | Observação |
| :---- | :---- | :---- | :---- |
| id | serial | Sim | PK |
| nome | varchar | Sim | |
| cpf_cnpj | varchar | Sim | Único |
| cidade | varchar | Não | |
| endereco | varchar | Não | |
| telefone | varchar | Não | |
| email | varchar | Não | |
| dados_contrato | text | Não | |

### perfil_acesso

| Coluna | Tipo | Obrigatório | Observação |
| :---- | :---- | :---- | :---- |
| id | serial | Sim | PK |
| nome_perfil | varchar | Sim | `Administrador`, `Engenharia`, `Financeiro`, `InstaladorCampo` |
| permissoes | text | Não | |

### usuario

| Coluna | Tipo | Obrigatório | Observação |
| :---- | :---- | :---- | :---- |
| id | serial | Sim | PK |
| nome | varchar | Sim | |
| email | varchar | Sim | Único |
| senha_hash | varchar | Sim | bcrypt |
| id_perfil | int | Sim | FK `perfil_acesso` |
| id_equipe | int | Não | FK `equipe`. Obrigatório para `InstaladorCampo` |
| ativo | boolean | Sim | Padrão `true` |
| tentativas_login | int | Sim | Zerado no login válido |
| bloqueado_ate | timestamp | Não | Preenchido após 5 falhas |

### equipe

| Coluna | Tipo | Obrigatório | Observação |
| :---- | :---- | :---- | :---- |
| id | serial | Sim | PK |
| nome | varchar | Sim | |
| especialidade | varchar | Não | |
| id_responsavel | int | Sim | FK `usuario`, deve ser instalador da equipe |

### equipe_instalador

Relação N:N entre `equipe` e `usuario` (instaladores).

| Coluna | Tipo | Observação |
| :---- | :---- | :---- |
| id_equipe | int | FK, parte da PK |
| id_usuario | int | FK, parte da PK |

### obra

| Coluna | Tipo | Obrigatório | Observação |
| :---- | :---- | :---- | :---- |
| id | serial | Sim | PK |
| status | varchar | Sim | Valores em [domínios](#domínios) |
| categoria | varchar | Não | Residencial, Comercial |
| quantidade_paineis | int | Sim | Maior que zero |
| endereco | varchar | Sim | Usado no link de navegação |
| descricao | text | Não | |
| data_inicio_estimada | date | Não | |
| data_fim_estimada | date | Não | Não pode ser anterior à data de início |
| data_inicio_real | date | Não | |
| data_fim_real | date | Não | |
| id_cliente | int | Sim | FK `cliente` |
| excluida_em | timestamp | Não | Exclusão lógica |

### pagamento

| Coluna | Tipo | Obrigatório | Observação |
| :---- | :---- | :---- | :---- |
| id | serial | Sim | PK |
| data_confirmacao | date | Sim | |
| prazo_contratual_dias | int | Sim | |
| id_obra | int | Sim | FK `obra`, UNIQUE (1:1) |

### material

| Coluna | Tipo | Obrigatório | Observação |
| :---- | :---- | :---- | :---- |
| id | serial | Sim | PK |
| tipo | varchar | Sim | Ex.: painel, inversor, cabo, disjuntor |
| quantidade | int | Sim | |
| quantidade_utilizada | int | Não | Para balanço de materiais |
| custo_unitario | numeric(12,2) | Não | |
| status_logistico | varchar | Não | `Comprado`, `EmTransito`, `Disponivel` |
| id_obra | int | Sim | FK `obra` |

### programacao_obra

| Coluna | Tipo | Obrigatório | Observação |
| :---- | :---- | :---- | :---- |
| id | serial | Sim | PK |
| data_inicio | date | Sim | |
| data_fim | date | Sim | Dia útil |
| prioridade | int | Não | Ordem de propagação dentro da equipe |
| duracao_estimada_dias | numeric(5,1) | Não | |
| id_obra | int | Sim | FK `obra` |
| id_equipe | int | Sim | FK `equipe` |

### comentario

| Coluna | Tipo | Obrigatório | Observação |
| :---- | :---- | :---- | :---- |
| id | serial | Sim | PK |
| descricao | text | Sim | Não vazio |
| data_registro | timestamp | Sim | Padrão `now()` |
| id_obra | int | Sim | FK `obra` |
| id_usuario | int | Sim | FK `usuario` |
| tipo | varchar | Sim | `Cartao`, `Manutencao` ou `Timeline` |

### historico_obra

Registro de ações da timeline. Somente INSERT.

| Coluna | Tipo | Obrigatório | Observação |
| :---- | :---- | :---- | :---- |
| id | bigserial | Sim | PK |
| tipo_acao | varchar | Sim | `Cadastro`, `MudancaStatus`, `Comentario`, `ManutencaoConcluida`, `AlteracaoFinanceira` |
| status_anterior | varchar | Não | |
| status_novo | varchar | Não | |
| observacao | text | Não | |
| data_alteracao | timestamp | Sim | |
| id_obra | int | Sim | FK `obra` |
| id_usuario | int | Sim | FK `usuario` |

### relatorio_custo

| Coluna | Tipo | Obrigatório | Observação |
| :---- | :---- | :---- | :---- |
| id | serial | Sim | PK |
| custo_mao_obra | numeric(12,2) | Não | |
| custo_insumos | numeric(12,2) | Não | |
| custo_total | numeric(12,2) | Não | Soma dos itens |
| valor_obra | numeric(12,2) | Não | Valor cobrado do cliente |
| id_obra | int | Sim | FK `obra`, UNIQUE (1:1) |

Precificação completa: `custo_mao_obra`, `custo_insumos` e `valor_obra` preenchidos.

### manutencao

| Coluna | Tipo | Obrigatório | Observação |
| :---- | :---- | :---- | :---- |
| id | serial | Sim | PK |
| descricao | text | Sim | |
| status | varchar | Sim | `Pendente`, `Concluida` |
| data_conclusao | timestamp | Não | |
| id_obra | int | Sim | FK `obra` |
| id_equipe | int | Sim | FK `equipe` |

### audit_log

Log de auditoria. Somente INSERT. Sem UPDATE nem DELETE, nem para o Administrador.

| Coluna | Tipo | Obrigatório | Observação |
| :---- | :---- | :---- | :---- |
| id | bigserial | Sim | PK |
| id_usuario | int | Não | Nulo em falha de autenticação |
| acao | varchar | Sim | Ex.: `StatusAlterado`, `ObraExcluida`, `AcessoNegado` |
| entidade | varchar | Sim | Ex.: `obra`, `relatorio_custo` |
| entidade_id | int | Não | |
| detalhes | jsonb | Não | Sem dados sensíveis |
| timestamp | timestamptz | Sim | |

## Domínios

| Campo | Valores |
| :---- | :---- |
| `obra.status` | `MaterialComprado`, `NoDeposito`, `Separado`, `EmAndamento`, `Concluido`, `Assistencia` |
| `material.status_logistico` | `Comprado`, `EmTransito`, `Disponivel` |
| `perfil_acesso.nome_perfil` | `Administrador`, `Engenharia`, `Financeiro`, `InstaladorCampo` |
| `comentario.tipo` | `Cartao`, `Manutencao`, `Timeline` |
| `manutencao.status` | `Pendente`, `Concluida` |

## Relacionamentos

```mermaid
erDiagram
  CLIENTE ||--o{ OBRA : possui
  OBRA ||--|| PAGAMENTO : confirma
  OBRA ||--o{ MATERIAL : requer
  OBRA ||--o{ COMENTARIO : recebe
  OBRA ||--o{ HISTORICO_OBRA : registra
  OBRA ||--o{ PROGRAMACAO_OBRA : agenda
  OBRA ||--o| RELATORIO_CUSTO : gera
  OBRA ||--o{ MANUTENCAO : exige
  EQUIPE ||--o{ PROGRAMACAO_OBRA : executa
  EQUIPE ||--o{ USUARIO : contem
  EQUIPE ||--o{ MANUTENCAO : atende
  PERFIL_ACESSO ||--o{ USUARIO : define
  USUARIO ||--o{ COMENTARIO : escreve
  USUARIO ||--o{ HISTORICO_OBRA : realiza
  USUARIO ||--o{ AUDIT_LOG : gera
```

## Restrições e índices

| Tabela | Restrição ou índice |
| :---- | :---- |
| `usuario` | UNIQUE (`email`) |
| `cliente` | UNIQUE (`cpf_cnpj`) |
| `pagamento` | UNIQUE (`id_obra`) |
| `relatorio_custo` | UNIQUE (`id_obra`) |
| `programacao_obra` | Exclusão de sobreposição por equipe (`id_equipe`, `daterange(data_inicio, data_fim)`) |
| `obra` | Índice em (`status`) e parcial em `excluida_em IS NULL` |
| `programacao_obra` | Índice em (`id_equipe`, `data_inicio`) |
| `historico_obra` | Índice em (`id_obra`, `data_alteracao`) |
| `audit_log` | Índice em (`entidade`, `entidade_id`) |
| Todas as tabelas de ação | Trigger ou permissão que bloqueia UPDATE e DELETE em `historico_obra` e `audit_log` |

## Exclusão lógica

Obra excluída recebe `excluida_em`. Listagens, Gantt e Kanban filtram `excluida_em IS NULL`. Cartão e programações da obra são removidos. Histórico, comentários e custos são preservados.
