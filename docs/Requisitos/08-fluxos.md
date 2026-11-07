# Fluxos

## Login

```mermaid
sequenceDiagram
  participant U as Usuário
  participant F as SPA
  participant A as AuthController
  participant S as AuthService
  participant D as PostgreSQL

  U->>F: e-mail e senha
  F->>A: POST /api/auth/login
  A->>S: validar credenciais
  S->>D: buscar usuário
  alt conta bloqueada
    A-->>F: 423 ACCOUNT_LOCKED
  else credenciais válidas
    S->>D: zerar tentativas
    S-->>A: JWT com perfil
    A-->>F: 200 token, expiresAt, usuario
  else credenciais inválidas
    S->>D: incrementar tentativas
    alt 5 falhas consecutivas
      S->>D: definir bloqueado_ate
    end
    A-->>F: 401 INVALID_CREDENTIALS
  end
```

## Mudança de status (cartão no Kanban)

O arraste é livre: o cartão pode ser solto em qualquer coluna, e a API valida a transição ao receber a tentativa (Q11).

```mermaid
sequenceDiagram
  participant F as KanbanBoard
  participant API as ObraController
  participant R as RegrasTransicaoService
  participant D as PostgreSQL
  participant E as EmailService

  opt statusNovo = Concluido
    F->>F: pede confirmação do usuário
  end
  F->>API: PATCH /api/obras/{id}/status
  API->>API: validar token e perfil
  API->>R: validar transição
  alt transição válida
    API->>D: transação com UPDATE obra, INSERT historico_obra e INSERT audit_log
    API-->>F: 200
    opt statusNovo = Concluido
      API-)E: evento ObraConcluida
      Note over E: falha de envio não reverte o status
    end
  else transição inválida
    API-->>F: 400 INVALID_STATUS_TRANSITION
    F->>F: devolve o cartão à coluna de origem e exibe o motivo retornado pela API
  end
```

## Programação de obra no Gantt

```mermaid
sequenceDiagram
  participant F as GanttNovaAlocacaoModal
  participant G as GanttController
  participant DS as DuracaoService
  participant GS as GanttService
  participant D as PostgreSQL

  F->>F: marca os responsáveis ocupados no período
  F->>G: POST /api/programacoes
  G->>D: buscar obra, verificar se está apta e se tem responsável
  G->>DS: duração a partir de quantidade_paineis
  G->>GS: data final em dias úteis
  G->>D: verificar conflito de cada responsável
  alt sem conflito
    G->>D: INSERT programacao_obra
    G-->>F: 201
  else conflito
    G-->>F: 409 SCHEDULE_CONFLICT
  end
```

## Status de material (Financeiro)

1. O Financeiro abre o material na aba Materiais da obra e escolhe o próximo status.
2. O SPA envia `PATCH /api/materiais/{id}` com `statusNovo`.
3. A API valida a ordem (Q12), grava o novo status e o `audit_log`.
4. O Kanban e o Gantt recebem o evento em tempo real e exibem o novo rótulo e cor.
5. Se a Engenharia enviar a mesma chamada, a API responde `403 ACCESS_DENIED`.

## Alteração de senha autenticada

1. O usuário informa a senha atual, a nova senha e a confirmação.
2. O SPA confere a confirmação e a política mínima antes de enviar.
3. A API valida a senha atual e grava o novo hash em uma única operação.
4. Sucesso: a API invalida os tokens, e o SPA exibe confirmação e leva ao login.
5. Falha: a senha anterior continua válida, e o SPA exibe "Não foi possível alterar a senha. Tente novamente.", sem sugerir link de redefinição.

## Atualização em tempo real

1. A API publica o evento (status alterado, programação criada ou reordenada) pelo SignalR.
2. O handler do frontend recebe o evento e chama `invalidateQueries` ou `setQueryData` do React Query para as chaves afetadas.
3. Gantt e Kanban são redesenhados a partir do cache, sem nova navegação.

## Exclusão lógica de obra

1. Administrador ou Engenharia confirma a exclusão.
2. A API verifica se a obra não está em execução.
3. Em uma transação: define `excluida_em`, remove o cartão e as programações futuras e grava `audit_log`.
4. Histórico, comentários e custos permanecem no banco.
