# Testes

## Estratégia

| Nível | Escopo | Ferramenta | Situação |
| :---- | :---- | :---- | :---- |
| Unitário (backend) | `DuracaoService`, `GanttService`, `CustoService`, `RegrasTransicaoService` | xUnit | Pendente |
| Unitário (frontend) | Validações Zod, `useMoverCard`, cálculo de cores de material | Vitest | Pendente |
| Integração de API | Rotas, RBAC e códigos de erro | Arquivo `.http`, Postman ou `curl` | Em andamento |
| Funcional de interface | Fluxos principais | Roteiro manual com casos abaixo | Em andamento |
| Usabilidade | Tarefas por perfil | Avaliação heurística e sessões com usuários | Pendente |
| Desempenho | Exportação com 1.000 registros | Script de carga | Pendente |
| Segurança | RBAC, token, acesso a objetos de outro usuário | Testes de API por perfil | Pendente |

## Casos de teste essenciais

### CT-01: Autenticação

| Passo | Ação | Resultado esperado |
| :---- | :---- | :---- |
| 1 | Login com `admin@zl.com.br` e `Senha123!` | Redireciona para `/kanban`; menu do Administrador |
| 2 | Login com `instalador@zl.com.br` e `Senha123!` | Redireciona para a tela de instalações |
| 3 | Login com senha errada | Permanece em `/login`; mensagem "E-mail ou senha incorretos" |
| 4 | Login com e-mail inexistente | Mesma mensagem do passo 3 |
| 5 | `POST /api/auth/login` com credenciais válidas | `200`; `token`, `expiresAt`, `usuario.perfil`; sem `senha` |
| 6 | `POST /api/auth/login` com credenciais inválidas | `401` com `error.code` |
| 7 | `GET /api/auth/me` sem token | `401` |

### CT-02: Autorização por perfil

| Passo | Ação | Resultado esperado |
| :---- | :---- | :---- |
| 1 | Login como Financeiro e acessar `/kanban` | Botão "Nova obra" ausente; cartões não arrastáveis |
| 2 | Financeiro acessa `/cadastrarobra` pela URL | Tela "403 - Acesso Negado" |
| 3 | `POST /api/obras` com token do Financeiro | `403` |
| 4 | `PATCH /api/obras/{id}/status` com token do Instalador | `403`; status não muda |
| 5 | `GET /api/obras/{id}/custos` com token da Engenharia | `403` |
| 6 | `GET /api/obras/{id}/custos` com token do Financeiro | `200` |
| 7 | `DELETE /api/comentarios/{id}` com token da Engenharia | `403`; comentário continua existindo |
| 8 | `DELETE /api/comentarios/{id}` com token do Administrador | `204` |
| 9 | Financeiro clica em cada item do menu | Nenhum item leva a tela vazia ou erro |

Os passos 7 e 8 usam comentários diferentes, para não depender da ordem de execução.

### CT-03: Movimentação no Kanban

| Passo | Ação | Resultado esperado |
| :---- | :---- | :---- |
| 1 | Abrir `/kanban` | Cinco colunas e a raia de Assistência, com contagem de cartões por coluna |
| 2 | Mover obra de Material Comprado para Em Andamento | Movimento recusado; cartão volta; motivo exibido; API `400` |
| 3 | Mover obra Concluído para Material Comprado | Recusado; `400` |
| 4 | Mover obra de Material Comprado para No Depósito | Cartão permanece; contagens atualizam |
| 5 | Recarregar a página | Cartão continua na nova coluna |
| 6 | `GET /api/obras/{id}/historico` | Registro mais recente com status anterior e novo, usuário e data |
| 7 | `GET /api/obras?status=EmAndamento` | Somente obras em andamento |

### CT-04: Alocação no Gantt e conflito de agenda

| Passo | Ação | Resultado esperado |
| :---- | :---- | :---- |
| 1 | Abrir o Gantt | Barras de todas as programações, uma por linha de equipe |
| 2 | Filtrar por uma equipe | Somente as programações dela |
| 3 | Alocar obra com 200 painéis a equipe livre, início em segunda-feira | Duração e término conforme ADR-011; fins de semana fora da contagem |
| 4 | Confirmar | `201`; barra aparece na linha da equipe |
| 5 | Alocar equipe ocupada em período sobreposto | Alerta de conflito; `409 SCHEDULE_CONFLICT`; nada gravado |
| 6 | Redimensionar para 360 px | Gantt utilizável, sem quebra de layout |

### CT-05: Custo total

| Passo | Ação | Resultado esperado |
| :---- | :---- | :---- |
| 1 | Somar mão de obra e insumos de uma obra concluída | Valor do custo total |
| 2 | `GET /api/obras/{id}/relatorio-custo` com token do Financeiro | `200`; `custoTotal` igual à soma |
| 3 | Repetir com token do Administrador | `200`, mesmos valores |
| 4 | Abrir a obra na tela financeira | Custo total e separação entre mão de obra e insumos |
| 5 | Consultar obra sem precificação | Erro descritivo; `400 VALIDATION_ERROR` |
| 6 | Consultar obra não concluída | Erro informando que o custo só é apurado para obras concluídas |

## Casos a implementar

| Caso | Requisito | Objetivo |
| :---- | :---- | :---- |
| CT-06 | RF-03 | Cadastro de obra com cliente existente; recusa sem cliente |
| CT-07 | RF-05 | Instalador vê só a própria equipe; conclui manutenção; outros perfis não concluem |
| CT-08 | RF-19 | Instalador autenticado acessa somente a própria equipe; não acessa DRE |
| CT-09 | RF-09 | Propagação em cadeia de cinco programações, com dias úteis |
| CT-10 | RF-10 | Alocação atualiza o Kanban; mudança no Kanban atualiza o Gantt |
| CT-11 | RF-13 | E-mail na conclusão; falha de envio não reverte o status |
| CT-12 | RF-16 | Link válido exibe cronograma; link inválido exibe mensagem; sem dados financeiros |
| CT-13 | RF-06 | Mudança de status logístico reflete no cartão e na barra |
| CT-14 | RF-20 | DRE com custo, valor da obra e resultado |
| CT-RNF-01 a 05 | RNF | Render em 4 larguras; HTTPS; RBAC em todas as rotas; log; exportação em 5 s |

## Dados de teste

- Banco carregado do zero: `docker compose down -v` e `docker compose up --build`.
- Usuários de teste: uma conta por perfil, com senha de teste conhecida, validada no ambiente.
- Obras de referência com status em cada coluna do Kanban, e obra concluída com precificação completa.
- Obra de referência sem precificação e sem programação, para os cenários de erro.
- Equipe livre e equipe com alocações conhecidas, para o conflito de agenda.
- Cadeia de programações da mesma equipe, para propagação.
- Um comentário exclusivo para o teste de exclusão pelo Administrador.

## Execução

Registrar cada rodada com data, executor, commit, resultado (Passou, Falhou ou Bloqueado) e issue aberta. Falhas que dependem de decisão pendente registram o número da questão em [visão de negócio](01-visao-negocio.md#questões-em-aberto).
