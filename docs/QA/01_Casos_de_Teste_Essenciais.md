# Casos de Teste - Requisitos Essenciais (Sprint 2)

**ZL Engenharia Solar | QA - Equipe 5**
**Responsável:** Luis (QA)
**Base:** `database/02_seed.sql`, `database/GUIA_QA.md`, `docs/Contrato_API.md`, `docs/documentacao de requisitos/Documentacao_de_RF_e_RNF.pdf`
**Versão analisada:** branch `main`, commit `d583d81`

---

## 1. Escopo

A `Documentacao_de_RF_e_RNF.pdf` classifica como **Alta (Essencial)** os requisitos RF-01, RF-02, RF-03, RF-04, RF-07, RF-14, RF-17 e RF-19. Para esta sprint foram selecionados **5 casos de teste** cobrindo os fluxos de maior risco e que já possuem dados no seed:

| Caso | Requisito | Motivo da escolha |
|------|-----------|-------------------|
| CT-01 | RF-01 Autenticação | Porta de entrada do sistema; base de todos os outros testes |
| CT-02 | RF-02 Controle de acesso (RBAC) | Requisito de segurança (também RNF-03) |
| CT-03 | RF-04 Funil Kanban | Fluxo principal de operação da engenharia |
| CT-04 | RF-07 Alocação no Gantt | Fluxo principal de planejamento; inclui regra de conflito de agenda |
| CT-05 | RF-14 Custo total da obra | Único requisito essencial do perfil Financeiro |

RF-03, RF-17 e RF-19 ficam para a próxima rodada (ver seção 4).

## 2. Ambiente e preparação

1. Subir o ambiente: `docker compose up --build` na raiz do projeto.
2. Garantir banco limpo antes de cada execução completa (o seed só roda na criação do volume):
   ```bash
   docker compose down -v
   docker compose up --build
   ```
3. Frontend: `http://localhost:3000` | API: `http://localhost:8000/api`
4. **Importante:** executar com `VITE_USE_MOCK=false` no `frontend/.env.local`. Com o mock ativo, qualquer e-mail/senha é aceito e os resultados de RF-01/RF-02 não têm valor.
5. Senha de todos os usuários do seed: `Senha123!`
6. Ferramentas: navegador (Chrome) para os passos de interface; Postman/Insomnia ou `curl` para os passos de API.

Para obter um token via API:

```bash
curl -s -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@zl.com.br\",\"senha\":\"Senha123!\"}"
```

---

## 3. Casos de teste

### CT-01 - Autenticação com credenciais válidas e inválidas

| Campo | Valor |
|-------|-------|
| Requisito | RF-01 (Alta - Essencial) |
| Tipo | Funcional, positivo e negativo |
| Pré-condição | Banco carregado com o seed; usuário deslogado |
| Dados | `admin@zl.com.br` / `Senha123!`; `instalador@zl.com.br` / `Senha123!`; `admin@zl.com.br` / `senhaerrada`; `naoexiste@teste.com` / `Senha123!` |

| # | Passo | Resultado esperado |
|---|-------|--------------------|
| 1 | Acessar `/login`, informar `admin@zl.com.br` / `Senha123!` e clicar em "Entrar no sistema" | Redireciona para `/kanban`; menu lateral exibe os itens do perfil Administrador |
| 2 | Clicar em "Sair" e logar com `instalador@zl.com.br` / `Senha123!` | Redireciona para `/linkparainstaladores` (perfil InstaladorCampo) |
| 3 | Sair e logar com `admin@zl.com.br` / `senhaerrada` | Permanece em `/login` e exibe "E-mail ou senha incorretos" (fluxo alternativo 4a) |
| 4 | Logar com `naoexiste@teste.com` / `Senha123!` | Mesmo comportamento do passo 3; a mensagem não pode revelar se o e-mail existe |
| 5 | API: `POST /api/auth/login` com as credenciais do passo 1 | HTTP 200; corpo com `token`, `expiresAt` e `usuario.perfil = "Administrador"`; campo `senha` ausente |
| 6 | API: `POST /api/auth/login` com as credenciais do passo 3 | HTTP 401 com corpo `{ "error": { "code", "message" } }` |
| 7 | API: `GET /api/auth/me` sem header `Authorization` | HTTP 401 |

**Critério de aprovação:** todos os passos com o resultado esperado.

**Risco identificado na análise estática (executar com atenção):** em `frontend/src/services/auth.ts` (função `fazerLogin`) o bloco `catch` trata **qualquer erro**, inclusive o 401 de senha errada, como "backend indisponível" e autentica o usuário como `Ana Souza (EngenhariaObras)`. Com isso os passos 3 e 4 devem **falhar** na interface. Além disso, `Login.tsx` vem com `admin@zl.com.br` / `SenhaForte123` pré-preenchidos. Ver issues BUG-01 e BUG-02.

---

### CT-02 - Restrição de ações por perfil (RBAC)

| Campo | Valor |
|-------|-------|
| Requisito | RF-02 (Alta - Essencial), RNF-03 |
| Tipo | Funcional / Segurança, negativo |
| Pré-condição | CT-01 aprovado; tokens obtidos para cada perfil |
| Dados | `leitor@zl.com.br`, `instalador@zl.com.br`, `engenharia@zlengenharia.com`, `financeiro@zl.com.br`; obras 305 e 307 |

| # | Passo | Resultado esperado |
|---|-------|--------------------|
| 1 | Logar como `leitor@zl.com.br` e abrir `/kanban` | Botão "Nova obra" **não** aparece; cards não podem ser arrastados |
| 2 | Ainda como leitor, digitar na barra de endereço `/cadastrarobra` | Tela "403 - Acesso Negado" (fluxo alternativo 3a) |
| 3 | API: `POST /api/obras` com token do leitor e payload válido | HTTP 403 |
| 4 | API: `PATCH /api/obras/305/status` com token do instalador e `{ "statusNovo": "Concluido" }` | HTTP 403; obra 305 continua `EmAndamento` |
| 5 | API: `GET /api/obras/307/relatorio-custo` com token de `engenharia@zlengenharia.com` | HTTP 403 |
| 6 | API: `GET /api/obras/307/relatorio-custo` com token de `financeiro@zl.com.br` | HTTP 200 |
| 7 | API: `DELETE /api/comentarios/710` com token de engenharia | HTTP 403; comentário 710 continua existindo (executar **antes** do passo 8) |
| 8 | API: `DELETE /api/comentarios/710` com token de admin | HTTP 204 |
| 9 | Logar como financeiro e clicar em cada item do menu lateral | Nenhum item leva a tela em branco ou a erro |

**Critério de aprovação:** nenhum perfil consegue executar ação fora da sua permissão, tanto pela interface quanto pela API.

**Observações:** o passo 7 precisa rodar antes do 8 (o mesmo registro é usado). A proposta de carga inicial (documento 03) adiciona o comentário 712 para remover essa dependência. O passo 9 deve falhar hoje: os itens "Financeiro", "Relatórios" e "Configurações" apontam para rotas que não existem em `App.tsx` (BUG-04).

---

### CT-03 - Movimentação de card no funil Kanban

| Campo | Valor |
|-------|-------|
| Requisito | RF-04 (Alta - Essencial), RF-11 |
| Tipo | Funcional, positivo e negativo |
| Pré-condição | Banco recém-carregado; logado como `engenharia@zlengenharia.com` |
| Dados | Obra 301 (`MaterialComprado`, 1 registro de histórico); obra 307 (`Concluido`) |

| # | Passo | Resultado esperado |
|---|-------|--------------------|
| 1 | Abrir `/kanban` | 5 colunas + raia "Assistência / Manutenção"; contadores: Material Comprado 3, No Depósito 2, Separado 1, Em Andamento 2, Concluído 1, Assistência 1 |
| 2 | Arrastar a obra 301 (Rede Alfa Supermercados) de "Material Comprado" para "Em Andamento" | Movimento recusado: card volta para a coluna de origem e é exibida mensagem explicando a transição inválida. API retorna HTTP 400 |
| 3 | Arrastar a obra 307 (Posto Alvorada) de "Concluído" para "Material Comprado" | Movimento recusado (HTTP 400); card volta para "Concluído" |
| 4 | Arrastar a obra 301 de "Material Comprado" para "No Depósito" | Card permanece em "No Depósito"; contadores atualizam (3 para 2 e 2 para 3) |
| 5 | Recarregar a página (F5) | Obra 301 continua em "No Depósito" (persistência no banco) |
| 6 | API: `GET /api/obras/301/historico` | 2 registros; o mais recente com `statusAnterior = MaterialComprado`, `statusNovo = NoDeposito`, usuário Ana Souza e data/hora da execução |
| 7 | API: `GET /api/obras?status=EmAndamento` | Somente obras 305 e 306 |

**Critério de aprovação:** transições válidas persistem e geram histórico; transições inválidas são recusadas sem alterar o banco.

**Observações:** executar os passos 2 e 3 antes do 4 (o passo 4 altera o estado da obra 301). O frontend tem a tabela `TRANSICOES_VALIDAS` em `constants/kanbanStatus.ts`, mas `KanbanBoard.tsx` não a utiliza antes de chamar a API; a mensagem exibida hoje é genérica ("Falha ao mover o card"), sem o motivo (melhoria U-07 do relatório de usabilidade).

---

### CT-04 - Alocação de equipe no Gantt e conflito de agenda

| Campo | Valor |
|-------|-------|
| Requisito | RF-07 (Alta - Essencial); apoio RF-08 |
| Tipo | Funcional, positivo e negativo |
| Pré-condição | Logado como `engenharia@zlengenharia.com`; banco recém-carregado |
| Dados | Obra 310 (200 painéis); Equipe 05 (sem alocações); Equipe 01 (alocada na programação 601 de 2026-10-01 a 2026-10-03) |

| # | Passo | Resultado esperado |
|---|-------|--------------------|
| 1 | Abrir `/equipes` (Gantt) | 10 barras, uma por programação (601 a 610) |
| 2 | Filtrar por Equipe 01 (`GET /api/programacoes?equipeId=1`) | Programações 601, 602 e 607 |
| 3 | Abrir "Nova alocação", selecionar obra 310, Equipe 05, início 2026-10-19 (segunda-feira) | Duração sugerida = 23 dias úteis (200 / 9 = 22,2, arredondado para cima); término sugerido 2026-11-18, ignorando finais de semana |
| 4 | Confirmar a alocação | HTTP 201; nova barra aparece na linha da Equipe 05 no período informado |
| 5 | Tentar alocar a Equipe 01 em qualquer obra com início 2026-10-02 | Sistema alerta que a Equipe 01 já está alocada no período (fluxo alternativo 3a) e não salva sem confirmação |
| 6 | Redimensionar a janela para 360px de largura | Gantt continua utilizável, sem quebra de layout (RNF-01) |

**Critério de aprovação:** alocação criada com datas corretas e conflito de agenda sinalizado.

**Pontos a confirmar com o Backend 1 antes da execução:**
- A regra de cálculo (9 painéis/dia, arredondamento para cima) usada pelo frontend em `GanttNovaAlocacaoModal.tsx` é a mesma do backend? Os valores de `duracao_estimada_dias` no seed não seguem essa regra (ex.: obra 301 com 45 painéis tem 2,0 dias no seed; pela regra seriam 5).
- Feriados (02/11 - Finados) devem ser desconsiderados? O backlog deixa essa decisão em aberto. O resultado esperado acima considera somente sábado e domingo.
- A obra 310 já possui a programação 608 (Equipe 02). A proposta de carga inicial (documento 03) cria a obra 316 sem programação para este teste.
- Não foi encontrada no código nenhuma verificação de conflito de agenda; o passo 5 deve falhar hoje (BUG-07).

---

### CT-05 - Cálculo do custo total da obra

| Campo | Valor |
|-------|-------|
| Requisito | RF-14 (Alta - Essencial); apoio RF-20 |
| Tipo | Funcional, teste de mesa |
| Pré-condição | Logado como `financeiro@zl.com.br` |
| Dados | Obra 307 (`Concluido`): mão de obra R$ 9.200,00 e insumos R$ 22.500,00 |

| # | Passo | Resultado esperado |
|---|-------|--------------------|
| 1 | Teste de mesa: 9.200,00 + 22.500,00 | 31.700,00 |
| 2 | API: `GET /api/obras/307/relatorio-custo` com token do financeiro | HTTP 200; `custoMaoObra = 9200.00`, `custoInsumos = 22500.00`, `custoTotal = 31700.00` (duas casas decimais) |
| 3 | Repetir o passo 2 com token de admin | HTTP 200, mesmos valores |
| 4 | Na interface, acessar o menu "Financeiro" e abrir a obra 307 | Exibe "R$ 31.700,00" como custo total, separando mão de obra e insumos |
| 5 | Consultar o custo de uma obra **sem** lançamento de custo (obra 316 da proposta ou obra criada no CT-02) | HTTP 404 na API; na interface, mensagem "Dados de precificação incompletos para processar o cálculo" |
| 6 | Consultar `GET /api/obras/301/relatorio-custo` (obra ainda em `MaterialComprado`) | Comportamento a definir: RF-14 diz que o custo é calculado **ao final da execução**, mas o seed tem custo para todas as obras |

**Critério de aprovação:** valores batem com o teste de mesa (sem erro de arredondamento) e obras sem custo são tratadas sem erro inesperado.

**Observações:** hoje o passo 4 não pode ser executado: não existe tela nem rota `/financeiro` no frontend (BUG-04). O passo 6 depende de decisão de Análise/Backend 1 (ver documento 03, item D-06).

---

## 4. Rastreabilidade e próximos casos

| Requisito essencial | Caso de teste | Situação |
|---------------------|---------------|----------|
| RF-01 | CT-01 | Escrito |
| RF-02 | CT-02 | Escrito |
| RF-03 | CT-06 (próxima rodada) | Pendente: formulário não tem data de pagamento, inversores e categoria; `clienteId` fixo em 45 |
| RF-04 | CT-03 | Escrito |
| RF-07 | CT-04 | Escrito |
| RF-14 | CT-05 | Escrito |
| RF-17 | CT-07 (próxima rodada) | Pendente: tela de homologação estática e sem upload |
| RF-19 | CT-08 (próxima rodada) | Pendente: rota exige login e não usa token |

## 5. Registro de execução

Preencher a cada rodada.

| Caso | Data | Executor | Ambiente/commit | Resultado (Passou / Falhou / Bloqueado) | Issue aberta |
|------|------|----------|-----------------|------------------------------------------|--------------|
| CT-01 | | | | | |
| CT-02 | | | | | |
| CT-03 | | | | | |
| CT-04 | | | | | |
| CT-05 | | | | | |
