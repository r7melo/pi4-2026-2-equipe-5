# Testes

## Estratégia

| Nível | Escopo | Ferramenta | Situação |
| :---- | :---- | :---- | :---- |
| Unitário (backend) | `DuracaoService`, `GanttService`, `CustoService`, `RegrasTransicaoService` | xUnit | Pendente |
| Unitário (frontend) | Validações Zod, `useMoverCard`, cálculo de cores de material | Vitest | Pendente |
| Integração de API | Rotas, RBAC e códigos de erro | Arquivo `.http`, Postman ou `curl` | Em andamento |
| Funcional de interface | Fluxos principais | Roteiro manual com os casos abaixo | Em andamento |
| Usabilidade | Tarefas por perfil | Avaliação heurística (concluída) e sessões com usuários | Em andamento |
| Desempenho | Exportação com 1.000 registros | Script de carga | Pendente |
| Segurança | RBAC, token, acesso a objetos de outro usuário | Testes de API por perfil | Pendente |

## Pré-condições

- Banco limpo antes de cada rodada: `docker compose down -v` seguido de `docker compose up --build`.
- Frontend com `VITE_USE_MOCK=false` em `frontend/.env.local`. Com o mock ativo, os resultados de autenticação e autorização não têm valor.
- Senha de todos os usuários do seed: `Senha123!`. O hash do seed deve ser confirmado antes da primeira rodada (ver [status](13-status.md)).
- Ferramentas: Chrome para os passos de interface; Postman, Insomnia ou `curl` para os passos de API.

Token para os passos de API:

```bash
curl -s -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@zl.com.br\",\"senha\":\"Senha123!\"}"
```

## Casos de teste essenciais

### CT-01: Autenticação

| Campo | Valor |
| :---- | :---- |
| Requisito | RF-01 (Must) |
| Tipo | Funcional, positivo e negativo |
| Pré-condição | Banco carregado com o seed; usuário deslogado |
| Dados | `admin@zl.com.br` / `Senha123!`; `instalador@zl.com.br` / `Senha123!`; `admin@zl.com.br` / `senhaerrada`; `naoexiste@teste.com` / `Senha123!` |

| # | Passo | Resultado esperado |
| :---- | :---- | :---- |
| 1 | Acessar `/login`, informar `admin@zl.com.br` / `Senha123!` e entrar | Redireciona para `/kanban`; menu exibe os itens do perfil Administrador |
| 2 | Sair e entrar com `instalador@zl.com.br` / `Senha123!` | Redireciona para a lista de instalações (perfil InstaladorCampo) |
| 3 | Sair e entrar com `admin@zl.com.br` / `senhaerrada` | Permanece em `/login`; exibe "E-mail ou senha incorretos"; o usuário não é autenticado |
| 4 | Entrar com `naoexiste@teste.com` / `Senha123!` | Mesma mensagem do passo 3; a mensagem não revela se o e-mail existe |
| 5 | API: `POST /api/auth/login` com as credenciais do passo 1 | `200`; `token`, `expiresAt` e `usuario.perfil = "Administrador"`; campo `senha` ausente |
| 6 | API: `POST /api/auth/login` com as credenciais do passo 3 | `401` com `error.code` |
| 7 | API: `GET /api/auth/me` sem header `Authorization` | `401` |

**Critério de aprovação:** todos os passos com o resultado esperado. Ao abrir `/login`, os campos de e-mail e senha iniciam vazios.

### CT-02: Restrição de ações por perfil (RBAC)

| Campo | Valor |
| :---- | :---- |
| Requisito | RF-02 (Must); RNF-03 |
| Tipo | Funcional e segurança, negativo |
| Pré-condição | CT-01 aprovado; tokens obtidos para cada perfil |
| Dados | Usuário Leitor (perfil em definição, ver [visão de negócio](01-visao-negocio.md#questões-em-aberto)); `instalador@zl.com.br`; `engenharia@zlengenharia.com`; `financeiro@zl.com.br`; obras 305 e 307; comentários 710 e 712 |

| # | Passo | Resultado esperado |
| :---- | :---- | :---- |
| 1 | Entrar como Leitor e abrir `/kanban` | Botão "Nova obra" ausente; cartões não podem ser arrastados |
| 2 | Com a sessão do Leitor, abrir `/cadastrarobra` pela barra de endereço | Tela "403 - Acesso Negado" |
| 3 | API: `POST /api/obras` com token do Leitor e payload válido | `403` |
| 4 | API: `PATCH /api/obras/305/status` com token do instalador e `{ "statusNovo": "Concluido" }` | `403`; obra 305 continua `EmAndamento` |
| 5 | API: `GET /api/obras/307/relatorio-custo` com token da Engenharia | `403` |
| 6 | API: `GET /api/obras/307/relatorio-custo` com token do Financeiro | `200` |
| 7 | API: `DELETE /api/comentarios/710` com token da Engenharia | `403`; comentário 710 continua existindo |
| 8 | API: `DELETE /api/comentarios/712` com token do Administrador | `204` |
| 9 | Entrar como Financeiro e acionar cada item do menu lateral | Nenhum item leva a tela em branco ou a erro |

**Critério de aprovação:** nenhum perfil executa ação fora da sua permissão, pela interface ou pela API.

**Observação:** os passos 7 e 8 usam comentários diferentes, de modo que a ordem de execução não altera o resultado.

### CT-03: Movimentação de cartão no funil Kanban

| Campo | Valor |
| :---- | :---- |
| Requisito | RF-04 (Must); RF-11 |
| Tipo | Funcional, positivo e negativo |
| Pré-condição | Banco recém-carregado; logado como `engenharia@zlengenharia.com` |
| Dados | Obra 301 (`MaterialComprado`, 1 registro de histórico); obra 307 (`Concluido`) |

| # | Passo | Resultado esperado |
| :---- | :---- | :---- |
| 1 | Abrir `/kanban` | Cinco colunas e a raia de Assistência; contadores: Material Comprado 3, No Depósito 2, Separado 1, Em Andamento 2, Concluído 1, Assistência 1 |
| 2 | Arrastar a obra 301 de "Material Comprado" para "Em Andamento" | Movimento recusado; cartão volta à coluna de origem; mensagem informa a transição inválida e os próximos status permitidos; API `400 INVALID_STATUS_TRANSITION` |
| 3 | Arrastar a obra 307 de "Concluído" para "Material Comprado" | Movimento recusado (`400`); cartão permanece em "Concluído" |
| 4 | Arrastar a obra 301 de "Material Comprado" para "No Depósito" | Cartão permanece em "No Depósito"; contadores atualizam (3 para 2 e 2 para 3) |
| 5 | Recarregar a página (F5) | Obra 301 continua em "No Depósito" |
| 6 | API: `GET /api/obras/301/historico` | 2 registros; o mais recente com status anterior `MaterialComprado`, novo `NoDeposito`, usuário e data/hora da execução |
| 7 | API: `GET /api/obras?status=EmAndamento` | Somente obras 305 e 306 |

**Critério de aprovação:** transições válidas persistem e geram histórico; transições inválidas são recusadas sem alterar o banco.

**Observação:** executar os passos 2 e 3 antes do passo 4, que altera o estado da obra 301.

### CT-04: Alocação no Gantt e conflito de agenda

| Campo | Valor |
| :---- | :---- |
| Requisito | RF-07 (Must); apoio a RF-08 |
| Tipo | Funcional, positivo e negativo |
| Pré-condição | Logado como `engenharia@zlengenharia.com`; banco recém-carregado |
| Dados | Obra 310 (200 painéis); Equipe 05 (sem alocações); Equipe 01 (programações 601, 602 e 607) |

| # | Passo | Resultado esperado |
| :---- | :---- | :---- |
| 1 | Abrir o Gantt | Uma barra por programação (601 a 610), na linha da equipe |
| 2 | Filtrar por Equipe 01 (`GET /api/programacoes?equipeId=1`) | Programações 601, 602 e 607 |
| 3 | Nova alocação: obra 310, Equipe 05, início 2026-10-19 (segunda-feira) | Duração de 23 dias úteis (200 ÷ 9 = 22,2, arredondado para cima); término 2026-11-18; fins de semana fora da contagem |
| 4 | Confirmar a alocação | `201`; barra aparece na linha da Equipe 05 no período informado |
| 5 | Alocar a Equipe 01 em uma obra com início em 2026-10-02 | Equipe 01 aparece marcada como ocupada no período; ao confirmar, `409 SCHEDULE_CONFLICT` com o período ocupado na mensagem; nada é gravado |
| 6 | Redimensionar a janela para 360 px | Gantt utilizável, sem quebra de layout |

**Critério de aprovação:** alocação criada com datas corretas e conflito de agenda bloqueado.

**Dependências:** regra de arredondamento (Q1) e feriados (Q2). O resultado do passo 3 vale com a regra de [ADR-011](09-decisoes-arquiteturais.md#adr-011-regras-de-cálculo-do-gantt).

### CT-05: Cálculo do custo total da obra

| Campo | Valor |
| :---- | :---- |
| Requisito | RF-14 (Must); apoio a RF-20 |
| Tipo | Funcional, teste de mesa |
| Pré-condição | Logado como `financeiro@zl.com.br` |
| Dados | Obra 307 (`Concluido`): mão de obra R$ 9.200,00 e insumos R$ 22.500,00 |

| # | Passo | Resultado esperado |
| :---- | :---- | :---- |
| 1 | Teste de mesa: 9.200,00 + 22.500,00 | 31.700,00 |
| 2 | API: `GET /api/obras/307/relatorio-custo` com token do Financeiro | `200`; `custoMaoObra = 9200.00`, `custoInsumos = 22500.00`, `custoTotal = 31700.00` |
| 3 | Repetir o passo 2 com token do Administrador | `200`, mesmos valores |
| 4 | Interface: menu "Financeiro", abrir a obra 307 | Exibe R$ 31.700,00 como custo total, separando mão de obra e insumos |
| 5 | API: consultar o custo da obra 316 (sem lançamento de custo) | `400 VALIDATION_ERROR`; mensagem "Dados de precificação incompletos para processar o cálculo" |
| 6 | API: consultar o custo da obra 301 (não concluída) | `400 VALIDATION_ERROR`; mensagem informando que o custo só é apurado para obras concluídas |

**Critério de aprovação:** valores batem com o teste de mesa, sem erro de arredondamento, e obras sem custo retornam erro descritivo.

**Dependências:** tratamento de obra sem precificação (Q5). A tela financeira do passo 4 e a obra 316 dependem de implementação e do complemento de dados.

## Avaliação de usabilidade

### Método

- Avaliação heurística com as 10 heurísticas de Nielsen, em percurso cognitivo pelas tarefas abaixo, sobre as telas implementadas. **Concluída.**
- Sessões com usuários: 1 participante por perfil, validando os achados com taxa de sucesso, tempo e erros. **Pendente.**

Escala de severidade:

| Nota | Significado |
| :---- | :---- |
| 0 | Não é problema de usabilidade |
| 1 | Cosmético: corrigir se houver tempo |
| 2 | Menor: baixa prioridade |
| 3 | Maior: alta prioridade |
| 4 | Catastrófico: corrigir antes da entrega |

Tarefas avaliadas:

| Tarefa | Perfil | Requisito |
| :---- | :---- | :---- |
| T1 - Entrar no sistema | Todos | RF-01 |
| T2 - Cadastrar uma nova obra | Engenharia | RF-03 |
| T3 - Mover a obra para a próxima etapa e consultar o histórico | Engenharia | RF-04, RF-11 |
| T4 - Alocar uma equipe no cronograma | Engenharia | RF-07, RF-08 |
| T5 - Atualizar a homologação de uma obra | Engenharia | RF-17 |
| T6 - Consultar o custo total de uma obra concluída | Financeiro | RF-14 |
| T7 - Ver o kit e abrir a rota do dia no celular | Instalador de Campo | RF-19 |

Resultado por tarefa:

| Tarefa | Pode ser concluída hoje? | Principal bloqueio |
| :---- | :---- | :---- |
| T1 | Parcialmente | Senha incorreta também autentica o usuário (UX-02) |
| T2 | Parcialmente | Faltam campos de pagamento, inversores e categoria; cliente fixo (UX-12) |
| T3 | Parcialmente | Move o cartão, mas não há painel de detalhes ou histórico (UX-05) |
| T4 | Sim | Sem alerta de conflito de agenda (UX-18) |
| T5 | Não | Tela fixa, não ligada a uma obra (UX-14) |
| T6 | Não | Menu "Financeiro" leva a tela inexistente (UX-15) |
| T7 | Parcialmente | Exige login e mostra dados fixos (UX-16) |

### Achados

| ID | Tela | Sev. | Problema | Ação |
| :---- | :---- | :---: | :---- | :---- |
| UX-01 | Login | 3 | Campos vêm pré-preenchidos com e-mail e senha de teste | Iniciar os campos vazios; credenciais de teste ficam só no guia de desenvolvimento |
| UX-02 | Login | 4 | Senha incorreta autentica o usuário, porque qualquer falha cai no modo de desenvolvimento | Usar o mock só com `VITE_USE_MOCK=true`; em `401`, exibir "E-mail ou senha incorretos" |
| UX-03 | Login | 2 | Botões "Esqueci minha senha" e "Criar nova conta" sem ação; criação de conta contradiz a regra de perfis atribuídos pelo administrador | Remover "Criar nova conta"; ocultar "Esqueci minha senha" até existir o fluxo |
| UX-04 | Login | 1 | Rótulos não associados aos campos; sem opção de mostrar senha | Associar rótulos aos campos; adicionar "mostrar senha" |
| UX-05 | Kanban | 3 | Cartão não abre detalhes (histórico, comentários, materiais) | Painel lateral com abas Dados, Materiais, Histórico e Comentários |
| UX-06 | Kanban | 2 | Botão "Filtros / Busca" sem ação | Busca por cliente e filtro por status e categoria, com mensagem para lista vazia |
| UX-07 | Kanban | 3 | Transição inválida exibe só "Falha ao mover o card", sem o motivo | Destacar as colunas permitidas durante o arraste; exibir a mensagem retornada pela API |
| UX-08 | Kanban | 2 | Cores de badge dependem de categorias inexistentes; status do material não aparece | Badge pela categoria real; selo do status do material (Comprado, Em trânsito, Disponível) |
| UX-09 | Kanban | 3 | Movimentação só por arraste com mouse ou toque; colunas largas exigem rolagem no celular | Adicionar teclado e menu "Mover para..."; no celular, mostrar uma coluna por vez |
| UX-10 | Kanban | 1 | Cartão de perfil somente leitura não arrasta, sem indicação do motivo | Ícone ou tooltip "Somente leitura para o seu perfil" |
| UX-11 | Kanban | 2 | Mover para "Concluído" dispara e-mail sem confirmação | Pedir confirmação antes de concluir a obra |
| UX-12 | Nova obra | 3 | Faltam data de pagamento, quantidade de inversores e categoria; cliente fixo | Adicionar os campos; selecionar cliente existente ou criar novo |
| UX-13 | Nova obra | 1 | Campo de prazo na seção de dados do cliente; sucesso exibe duas notificações | Mover o campo para a seção de prazos; manter uma notificação |
| UX-14 | Homologação | 3 | Tela fixa, sem seleção de obra; botões sem ação | Remover ou ocultar a tela enquanto a homologação estiver fora do escopo |
| UX-15 | Menu lateral | 4 | Itens "Financeiro", "Relatórios" e "Configurações" levam a rotas inexistentes, sem página de erro | Criar as telas ou ocultar os itens; adicionar página "Página não encontrada" |
| UX-16 | Link de instaladores | 3 | Rota exige login; dados fixos; botões "Ligar" e "Marcar chegada" sem ação; sem tela de link expirado | Ajustar à decisão de acesso do instalador (Q3) |
| UX-17 | Geral | 2 | Nenhuma tela tem ajuda contextual ou estado vazio com ação sugerida | Textos de ajuda nos formulários; estados vazios com ação ("Nenhuma obra. Cadastre a primeira") |
| UX-18 | Gantt | 3 | Sem aviso de conflito ao alocar; equipes ocupadas não aparecem marcadas | Marcar equipes ocupadas no período; alerta antes de salvar |

### Priorização

| Prioridade | Itens | Responsável sugerido |
| :---- | :---- | :---- |
| 1 - Antes da entrega | UX-02, UX-15 | Frontend |
| 2 - Alta | UX-01, UX-05, UX-07, UX-09, UX-12, UX-14, UX-16, UX-18 | Design e Frontend (UX-12 também Backend) |
| 3 - Média | UX-03, UX-06, UX-08, UX-11, UX-17 | Design e Frontend |
| 4 - Baixa | UX-04, UX-10, UX-13 | Frontend |

Pontos positivos observados: estados de carregamento e de erro com "Tentar novamente" no Kanban; atualização otimista com retorno ao estado anterior ao mover cartão; validação do formulário de obra com mensagens claras; tela "403 - Acesso Negado" ao acessar rota restrita pela URL; Gantt que trata fins de semana como não úteis e sugere a duração pela quantidade de painéis; raia de Assistência separada visualmente.

### Roteiro das sessões com usuários

- **Participantes:** 4 pessoas: 1 Engenharia, 1 Financeiro, 1 Leitor (perfil em definição), 1 Instalador de Campo. De preferência, pessoas que não participaram do desenvolvimento.
- **Duração:** 20 a 30 minutos por pessoa.
- **Ambiente:** `docker compose up` com o seed; o instalador testa no celular.

Procedimento:

1. Explicar que o sistema está sendo testado, não a pessoa; pedir para pensar em voz alta.
2. Entregar as tarefas do perfil, uma por vez, sem dar dicas.
3. Para cada tarefa, registrar: concluiu (sim, não ou com ajuda), tempo, número de erros e comentários.
4. Ao final, aplicar o questionário SUS (10 perguntas, escala de 1 a 5).

Metas: taxa de sucesso ≥ 80% por tarefa; SUS ≥ 68; taxa de erro < 5% (RNF-06).

| Participante | Perfil | T1 | T2 | T3 | T4 | T5 | T6 | T7 | SUS | Observações |
| :---- | :---- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---- |
| P1 | Engenharia | | | | | | - | - | | |
| P2 | Financeiro | | - | - | - | - | | - | | |
| P3 | Leitor | | - | | - | - | - | - | | |
| P4 | Instalador de Campo | | - | - | - | - | - | | | |

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
| CT-RNF-01 a 05 | RNF-01 a RNF-05 | Renderização em 4 larguras; HTTPS; RBAC em todas as rotas; log; exportação em 5 s |
| CT-RNF-06 | RNF-06 | Sessões com usuários e avaliação heurística (roteiro acima) |

## Dados de teste

### Seed atual

- Um usuário por perfil (Administrador, Engenharia, Financeiro, Instalador de Campo) e o Leitor, com perfil em definição.
- Obra 301 (`MaterialComprado`), obras 305 e 306 (`EmAndamento`), obra 307 (`Concluido`, com custo), obra 310 (200 painéis, com programação 608).
- Equipe 05 livre; Equipe 01 com programações 601, 602 e 607.
- Comentário 710, usado somente no teste de bloqueio (CT-02).

### Problemas conhecidos nos dados atuais

- Hash do seed ainda não confirmado.
- `duracao_estimada_dias` não segue a regra de 9 painéis por dia: a programação 601 (45 painéis) tem 2,0 dias, e pela regra seriam 5.
- Programações que terminam ou ocorrem em fim de semana: 601, 602, 604, 606, 607, 608, 609 e 610.
- Histórico incompleto: obras 306 a 308 têm só a última transição; 309 e 310 não têm registro de criação; 308 não tem registro de conclusão.
- Obra 302 está em duas programações (602 e 610).
- Programação 601 (obra 301) e programação 605 (obra 304) começam antes do status de instalação dessas obras; a programação 604 aloca a obra 305 em 07/10, embora ela esteja em andamento desde 26/09.
- Obra 307 tem só painéis: sem cabos e disjuntores para o balanço de materiais.

### Complemento proposto (aguardando aprovação do Backend)

- Clientes 11 a 16.
- Obras 311 a 316: cadeia de cinco programações na Equipe 06 (311 a 315) e obra 316 sem programação e sem custo.
- Programações 611 a 615, só em dias úteis, para o teste de propagação (CT-09).
- Histórico de criação das obras 309, 310 e 311 a 316.
- Comentário 712, para o teste de exclusão pelo Administrador (CT-02).
- Materiais 516 e 517 (cabo e disjuntor da obra 307), para o balanço de materiais.

## Execução

Registrar cada rodada com data, executor, commit, resultado (Passou, Falhou ou Bloqueado) e issue aberta. Falhas que dependem de decisão pendente registram o número da questão em [visão de negócio](01-visao-negocio.md#questões-em-aberto).
