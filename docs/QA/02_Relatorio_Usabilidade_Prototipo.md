# Relatório de Teste de Usabilidade do Protótipo

**ZL Engenharia Solar | QA - Equipe 5**
**Responsável:** Luis (QA)
**Objeto avaliado:** telas do protótipo funcional já implementadas no frontend (branch `main`, commit `d583d81`). O protótipo de alta fidelidade no Figma (link em `docs/Protótipo ZL Engenharia.pdf`) deve ser conferido nas sessões com usuários para confirmar se os problemas também existem no desenho ou só na implementação.
**Data:** 04/10/2026

---

## 1. Objetivo

Verificar se um usuário não técnico consegue executar as tarefas principais do seu perfil sem treinamento extenso (RNF-05) e se as telas funcionam de 360px a 1920px de largura (RNF-01), apontando problemas e sugestões de melhoria para Design e Frontend.

## 2. Método

O teste foi dividido em duas partes:

1. **Avaliação heurística** (realizada nesta sprint), usando as 10 heurísticas de Nielsen, com percurso cognitivo das tarefas abaixo sobre as telas implementadas e o código de cada uma.
2. **Sessões com usuários** (roteiro pronto na seção 6), para validar os achados com 1 participante por perfil, medindo taxa de sucesso, tempo e erros.

### Escala de severidade (Nielsen)

| Nota | Significado |
|------|-------------|
| 0 | Não é problema de usabilidade |
| 1 | Cosmético: corrigir se sobrar tempo |
| 2 | Menor: baixa prioridade |
| 3 | Maior: alta prioridade |
| 4 | Catastrófico: corrigir antes da entrega |

### Tarefas avaliadas

| Tarefa | Perfil | Requisito |
|--------|--------|-----------|
| T1 - Entrar no sistema | Todos | RF-01 |
| T2 - Cadastrar uma nova obra | EngenhariaObras | RF-03 |
| T3 - Mover a obra para a próxima etapa e consultar o histórico | EngenhariaObras | RF-04, RF-11 |
| T4 - Alocar uma equipe no cronograma | EngenhariaObras | RF-07, RF-08 |
| T5 - Atualizar a homologação de uma obra | EngenhariaObras | RF-17 |
| T6 - Consultar o custo total de uma obra concluída | Financeiro | RF-14 |
| T7 - Ver o kit e abrir a rota do dia no celular | InstaladorCampo | RF-19 |

## 3. Resumo dos resultados

| Severidade | Quantidade |
|------------|-----------|
| 4 - Catastrófico | 2 |
| 3 - Maior | 8 |
| 2 - Menor | 5 |
| 1 - Cosmético | 3 |
| **Total** | **18** |

| Tarefa | Pode ser concluída hoje? | Principal bloqueio |
|--------|--------------------------|--------------------|
| T1 | Parcialmente | Senha errada também entra no sistema (U-02) |
| T2 | Parcialmente | Faltam campos do contrato; cliente fixo (U-12) |
| T3 | Parcialmente | Move o card, mas não há tela de detalhes/histórico (U-05) |
| T4 | Sim | Sem alerta de conflito de agenda (U-18) |
| T5 | Não | Tela estática, não ligada a uma obra (U-14) |
| T6 | Não | Menu "Financeiro" leva a tela inexistente (U-15) |
| T7 | Parcialmente | Exige login e mostra dados fixos (U-16) |

## 4. Problemas encontrados

| ID | Tela | Heurística | Sev. | Problema | Evidência | Sugestão |
|----|------|-----------|------|----------|-----------|----------|
| U-01 | Login | Prevenção de erros | 3 | Campos vêm pré-preenchidos com `admin@zl.com.br` e senha `SenhaForte123` (que nem é a senha do seed) | `frontend/src/pages/Login.tsx` linhas 10-11 | Iniciar campos vazios; manter credenciais de teste só no `GUIA_QA.md` |
| U-02 | Login | Visibilidade do estado / Segurança | 4 | Senha errada não mostra erro: o sistema entra como "Ana Souza (Engenharia)" porque qualquer falha cai no modo de desenvolvimento | `frontend/src/services/auth.ts`, função `fazerLogin`, bloco `catch` | Só usar o mock quando `VITE_USE_MOCK=true`; em 401 exibir "E-mail ou senha incorretos" |
| U-03 | Login | Consistência / Controle do usuário | 2 | Botões "Esqueci minha senha" e "Criar nova conta" não fazem nada; "Criar conta" contradiz a regra de que perfis são atribuídos pelo administrador | `Login.tsx` | Remover "Criar nova conta"; ligar "Esqueci minha senha" a um fluxo real ou ocultar até existir |
| U-04 | Login | Acessibilidade | 1 | Labels "E-mail corporativo" e "Senha" não estão associados aos campos (sem `htmlFor`/`id`); sem opção de mostrar senha | `Login.tsx` | Usar o componente `Input` (que já associa label) e adicionar botão "mostrar senha" |
| U-05 | Kanban | Reconhecimento em vez de memorização | 3 | Card não abre detalhes: não há como ver histórico, comentários ou materiais da obra (RF-06, RF-11) | `components/kanban/KanbanCard.tsx` | Ao clicar no card, abrir painel lateral com abas Dados, Materiais, Histórico e Comentários |
| U-06 | Kanban | Visibilidade do estado | 2 | Botão "Filtros / Busca" não tem ação | `pages/Kanban.tsx` | Implementar busca por cliente e filtro por status/categoria, com mensagem de lista vazia |
| U-07 | Kanban | Prevenção de erros / Mensagens de erro | 3 | Usuário pode soltar o card em qualquer coluna; transição inválida só gera "Falha ao mover o card", sem explicar o motivo | `KanbanBoard.tsx` não usa `TRANSICOES_VALIDAS` de `constants/kanbanStatus.ts`; mensagem em `hooks/api/useMoverCard.ts` | Durante o arraste, destacar só as colunas permitidas e esmaecer as demais; exibir a mensagem retornada pela API |
| U-08 | Kanban | Correspondência com o mundo real | 2 | Cores dos badges dependem de categorias inexistentes ("atenção", "em obra"); todos os cards ficam cinza e o status do material (RF-06) não aparece | `KanbanCard.tsx`, `getBadgeStyle` | Badge pela categoria real (Residencial, Comercial...) e selo colorido do status do material (Comprado, Em trânsito, Disponível) |
| U-09 | Kanban | Flexibilidade / Acessibilidade | 3 | Movimentação só por arrastar com mouse/toque; sem alternativa por teclado ou menu. Em 360px as 5 colunas de 288px exigem rolagem horizontal longa | `KanbanBoard.tsx` (só `PointerSensor`); `KanbanColumn.tsx` (`w-72`) | Adicionar `KeyboardSensor` e um menu "Mover para..." no card; no celular, mostrar uma coluna por vez com abas |
| U-10 | Kanban | Visibilidade do estado | 1 | Para perfis sem permissão (Leitor, Financeiro) o card simplesmente não arrasta, sem indicação do motivo | `KanbanCard.tsx` | Mostrar ícone de cadeado ou tooltip "Somente leitura para o seu perfil" |
| U-11 | Kanban | Prevenção de erros | 2 | Mover para "Concluído" dispara e-mail (RF-13) sem pedir confirmação | `useMoverCard.ts` | Usar o `ConfirmDialog` já existente antes de concluir uma obra |
| U-12 | Nova Obra | Correspondência com o mundo real | 3 | Faltam campos exigidos pelo RF-03 (data de pagamento, quantidade de inversores, categoria). Cliente sempre enviado com `clienteId: 45`, que não existe no seed; não há como escolher cliente já cadastrado | `pages/CadastrarObra.tsx`; `types/obras.ts` | Adicionar os campos; campo de cliente com autocompletar e opção "novo cliente" |
| U-13 | Nova Obra | Estética e design minimalista | 1 | "Prazo contratual" aparece na seção "Dados do Cliente"; sucesso exibe duas notificações ao mesmo tempo (sonner + toast próprio) | `CadastrarObra.tsx` | Mover o campo para "Prazos"; manter apenas uma notificação |
| U-14 | Homologação | Correspondência com o mundo real | 3 | Tela fixa ("João Silva", "Enel"), sem escolher a obra; botões "Anexar ART" e "Ver PDF do Parecer" sem ação | `pages/AndamentoHomologacao.tsx` | Abrir a homologação a partir da obra (card ou lista); ligar à API `GET/PUT /api/obras/{id}/homologacao`; upload com validação de PDF |
| U-15 | Menu lateral | Consistência / Recuperação de erros | 4 | Itens "Financeiro", "Relatórios" e "Configurações" levam a rotas que não existem: tela vazia, sem 404. O perfil Financeiro não consegue fazer nenhuma tarefa própria | `components/Sidebar.tsx` x `App.tsx` | Criar as telas ou ocultar os itens até existirem; adicionar rota coringa com página "Página não encontrada" |
| U-16 | Link instaladores | Correspondência com o mundo real | 3 | Rota exige login (contraria RF-19: link sem login, por token); dados fixos (Crateús-CE); botões "Ligar" e "Marcar chegada" sem ação; sem tela de link expirado | `pages/LinkInstaladores.tsx`; `App.tsx` | Rota pública `/mobile/:token` consumindo `GET /api/mobile/{token}`; tela "Este link expirou ou não corresponde à data de hoje" |
| U-17 | Geral | Ajuda e documentação | 2 | Nenhuma tela tem ajuda contextual ou estado vazio explicativo para o primeiro uso (meta do RNF-05: menos de 2 h de treinamento) | Todas | Textos de ajuda curtos nos formulários e estados vazios com ação sugerida ("Nenhuma obra. Cadastre a primeira") |
| U-18 | Gantt | Prevenção de erros | 3 | Ao alocar equipe não há aviso de conflito de agenda (RF-07, fluxo 3a); a lista de equipes não indica quem está ocupado | `components/gantt/GanttNovaAlocacaoModal.tsx` | Marcar equipes ocupadas no período e exibir alerta antes de salvar |

## 5. Pontos positivos

- Estados de carregamento e de erro com botão "Tentar novamente" no Kanban.
- Atualização otimista com rollback ao mover card (`useMoverCard.ts`).
- Validação do formulário de obra com mensagens claras, inclusive "Data Final menor que Data Inicial".
- Tela "403 - Acesso Negado" ao acessar rota restrita pela URL.
- Gantt já considera fins de semana como não úteis e sugere a duração por quantidade de painéis.
- Raia de Assistência separada visualmente (RF-05).

## 6. Roteiro para as sessões com usuários

**Participantes:** 4 pessoas (1 Engenharia, 1 Financeiro, 1 Leitor, 1 Instalador), de preferência colegas que não participaram do desenvolvimento.
**Duração:** 20 a 30 minutos por pessoa.
**Ambiente:** `docker compose up` com o seed; instalador testando no celular.

1. Explicar que o sistema está sendo testado, não a pessoa; pedir para pensar em voz alta.
2. Entregar as tarefas do perfil impressas, uma por vez, sem dar dicas.
3. Para cada tarefa anotar: concluiu (sim/não/com ajuda), tempo, número de erros, comentários.
4. Ao final, aplicar o questionário SUS (10 perguntas, escala 1 a 5).

**Metas:** taxa de sucesso >= 80% por tarefa; SUS >= 68; taxa de erro < 5% (RNF-05).

| Participante | Perfil | T1 | T2 | T3 | T4 | T5 | T6 | T7 | SUS | Observações |
|--------------|--------|----|----|----|----|----|----|----|-----|-------------|
| P1 | EngenhariaObras | | | | | | - | - | | |
| P2 | Financeiro | | - | - | - | - | | - | | |
| P3 | VisualizadorLeitor | | - | | - | - | - | - | | |
| P4 | InstaladorCampo | | - | - | - | - | - | | | |

## 7. Melhorias priorizadas

| Prioridade | Itens | Responsável sugerido |
|------------|-------|----------------------|
| 1 - Antes da entrega | U-02, U-15 | Frontend |
| 2 - Alta | U-01, U-05, U-07, U-09, U-12, U-14, U-16, U-18 | Design + Frontend (U-12 também Backend 1) |
| 3 - Média | U-03, U-06, U-08, U-11, U-17 | Design + Frontend |
| 4 - Baixa | U-04, U-10, U-13 | Frontend |
