# Decisões Arquiteturais

Cada decisão relevante tem um registro com contexto, decisão, alternativas e consequências. Decisões não são apagadas: quando mudam, o registro antigo recebe o status "Substituída por ADR-NNN" e um novo registro é criado.

| ADR | Título | Status |
| :---- | :---- | :---- |
| [ADR-001](#adr-001-monolito-modular-no-backend) | Monolito modular no backend | Proposta |
| [ADR-002](#adr-002-spa-em-react-com-vite-e-typescript) | SPA em React com Vite e TypeScript | Aceita |
| [ADR-003](#adr-003-tailwind-css-e-shadcnui) | Tailwind CSS e shadcn/ui | Aceita |
| [ADR-004](#adr-004-dhtmlx-gantt-com-propagação-customizada) | DHTMLX Gantt com propagação customizada | Aceita, licença pendente |
| [ADR-005](#adr-005-dnd-kit-no-kanban) | dnd-kit no Kanban | Aceita, menu "Mover para..." reclassificado (ver ADR-013) |
| [ADR-006](#adr-006-zustand-react-query-e-signalr) | Zustand, React Query e SignalR | Aceita |
| [ADR-007](#adr-007-autenticação-jwt-com-autorização-no-servidor) | Autenticação JWT com autorização no servidor | Aceita |
| [ADR-008](#adr-008-exclusão-lógica-e-timeline-append-only) | Exclusão lógica e timeline append-only | Aceita |
| [ADR-009](#adr-009-postgresql) | PostgreSQL | Aceita |
| [ADR-010](#adr-010-homologação-fora-do-escopo) | Homologação fora do escopo | Aceita |
| [ADR-011](#adr-011-regras-de-cálculo-do-gantt) | Regras de cálculo do Gantt | Proposta |
| [ADR-012](#adr-012-equipes-temporais-no-gantt-no-lugar-de-equipes-cadastradas-e-responsáveis) | Equipes temporais no Gantt no lugar de equipes cadastradas e responsáveis | Aceita (revisão de 07/11/2026) |
| [ADR-013](#adr-013-kanban-com-arraste-livre-e-edição-na-página-obras) | Kanban com arraste livre e edição na página Obras | Aceita (revisão de 07/11/2026) |
| [ADR-014](#adr-014-valores-e-catálogo-de-produtos-no-módulo-financeiro) | Valores e catálogo de produtos no módulo financeiro | Aceita (revisão de 07/11/2026) |

---

## ADR-001: Monolito modular no backend

**Status:** Proposta

**Contexto.** A API é um único projeto. Os módulos de domínio são claros, mas a equipe é pequena e a carga é baixa.

**Decisão.** Um processo de API com módulos por pasta e por serviço. Dependências só no sentido de camadas superiores para inferiores. Sem microsserviços nesta fase.

**Alternativas.** Microsserviços: operação e testes mais complexos, sem ganho de escala previsto. Monolito sem módulos: acoplamento alto.

**Consequências.** Deploy único e simples. Exige disciplina de fronteira entre módulos. Permite extrair o Gantt ou o financeiro no futuro.

---

## ADR-002: SPA em React com Vite e TypeScript

**Status:** Aceita

**Contexto.** Telas densas (Kanban, Gantt), roteamento por perfil e uso em celular.

**Decisão.** SPA em React, build com Vite, linguagem TypeScript.

**Alternativas.** Next.js: renderização no servidor sem necessidade num sistema interno. Angular: curva de aprendizado maior.

**Consequências.** Build rápido. A página pública do cronograma também é uma SPA.

---

## ADR-003: Tailwind CSS e shadcn/ui

**Status:** Aceita

**Contexto.** Layout de 360 a 1920 px, com interface mobile-first para o instalador.

**Decisão.** Tailwind CSS v4 para estilo. shadcn/ui para componentes acessíveis, com base em Base UI e alternativa em Radix UI.

**Consequências.** Componentes ficam no código do projeto. Evitar duplicação de estilos.

---

## ADR-004: DHTMLX Gantt com propagação customizada

**Status:** Aceita, licença pendente

**Contexto.** Programação de obras por arraste no Gantt. O auto-scheduling (propagação automática de datas) é recurso pago na maioria das bibliotecas comerciais.

**Decisão.** DHTMLX Gantt para a interface. Propagação de atrasos (dependência fim-início, em dias úteis) implementada pela equipe, no backend (`GanttService`). Horário de cada tarefa é preservado; só edição manual o altera.

**Alternativas.** Frappe Gantt: open source, com menos recursos. Implementação própria: custo alto.

**Consequências.** A licença do DHTMLX (GPL ou comercial) precisa ser verificada antes da produção. A lógica de dias úteis exige testes unitários.

---

## ADR-005: dnd-kit no Kanban

**Status:** Aceita

**Decisão.** dnd-kit com sensores de ponteiro e de teclado. Menu "Mover para..." no cartão como alternativa ao arraste.

**Alternativas.** react-beautiful-dnd: descontinuada. Drag and drop nativo do HTML: suporte inconsistente a toque e teclado.

---

## ADR-006: Zustand, React Query e SignalR

**Status:** Aceita

**Contexto.** Dois tipos de estado no frontend: de interface e do servidor.

**Decisão.**

- Zustand para estado de interface que não vem do servidor.
- TanStack React Query para todos os dados de negócio.
- SignalR para eventos em tempo real. Um handler traduz cada evento em invalidação ou atualização do cache.

**Consequências.** Dados de negócio nunca ficam no Zustand. O handler do SignalR é código próprio e precisa de teste.

---

## ADR-007: Autenticação JWT com autorização no servidor

**Status:** Aceita

**Contexto.** Instaladores acessam o sistema pelo celular. Dados de obras não podem ser acessados por quem só tem um link.

**Decisão.**

- Todo usuário, inclusive o instalador, faz login e recebe JWT com o perfil.
- O servidor valida token e perfil em toda rota protegida.
- O instalador só vê instalações das obras cujas equipes integra, com filtro no servidor.
- O link público fica restrito ao cronograma somente leitura, sem dados financeiros.

**Alternativas.** Token público por link para o instalador: expõe dados. Sessão em cookie: viável, mas o contrato já usa JWT.

**Consequências.** Instaladores precisam de conta e senha inicial. Bloqueio após 5 falhas. Expiração configurável por `JWT_EXPIRES_MINUTES`.

---

## ADR-008: Exclusão lógica e timeline append-only

**Status:** Aceita

**Decisão.**

- Obra excluída recebe `excluida_em` e some das listagens. Não é apagada.
- `audit_log` e `historico_obra` aceitam somente INSERT, inclusive para o Administrador.
- Comentários gerais da timeline podem ser editados pelo Administrador, e a edição gera log.

**Consequências.** O banco cresce. Consultas filtram obras excluídas. A política de retenção precisa tratar dados de clientes de obras excluídas.

---

## ADR-009: PostgreSQL

**Status:** Aceita

**Decisão.** PostgreSQL 16, com migrations e seed em SQL.

**Alternativas.** SQL Server: licença em produção. MySQL: também viável.

**Consequências.** Após inserts com IDs fixos, reajustar as sequências.

---

## ADR-010: Homologação fora do escopo

**Status:** Aceita

**Decisão.** Não implementar acompanhamento de homologação nesta fase. Não há rotas, tela ou entidade para ele. Caso volte, será tratado em ADR próprio.

---

## ADR-011: Regras de cálculo do Gantt

**Status:** Proposta

**Contexto.** Três pontos ainda não estão definidos:

1. Arredondamento da duração: dias inteiros ou múltiplos de 0,5 dia.
2. Feriados: excluídos ou não do cálculo de dias úteis.
3. Durações de exemplo nos dados de teste precisam seguir a regra escolhida.

**Proposta.**

- Duração = `ceil(painéis ÷ produtividade)` em dias úteis inteiros. Alternativa: múltiplos de 0,5 dia, se o solicitante preferir.
- Dias não úteis: sábados, domingos e feriados nacionais. Feriados ficam em tabela no banco, não no código.
- Recalcular as programações de exemplo com a regra escolhida.

**Consequências.** Sem esta decisão, o cálculo de duração e a propagação no Gantt não têm resultado único, e backend e testes podem divergir.

---

## ADR-012: Equipes temporais no Gantt no lugar de equipes cadastradas e responsáveis

**Status:** Aceita (revisão de 07/11/2026)

**Contexto.** Equipes de campo mudam com frequência, então um cadastro fixo de equipes não representa a operação. A primeira proposta da revisão trocou equipes por "responsáveis da obra", mas isso perde o que o Gantt precisa gerir: o tempo das pessoas que instalam os painéis. A empresa precisa saber quantas pessoas estão em cada instalação, quantas faltam e quanto tempo cada instalador fica ocupado ou ocioso, para aproveitar ao máximo o tempo de cada trabalhador.

**Decisão.**

- Equipe é entidade temporal, 1:1 com a programação no Gantt (`equipe`). Não há cadastro de equipes nem nome fixo.
- Integrantes (`equipe_integrante`) são instaladores de campo ativos, cada um com data de entrada e saída dentro do período da programação. Incluir e remover é imediato, sem recriar a programação.
- A programação registra `pessoas_previstas`; o sistema deriva pessoas faltantes, pessoa-dia e ocupação por instalador.
- O conflito de agenda é verificado por instalador, considerando os intervalos de cada integrante.
- O Gantt tem uma linha por obra programada, com a equipe na barra, e uma visão complementar de ocupação por instalador.
- `obra_responsavel` e a rota `PUT /api/obras/{id}/responsaveis` são descartadas.

**Alternativas.** Equipes cadastradas e fixas: exigem manutenção constante e não registram entradas e saídas no meio da instalação. Responsáveis da obra (N:N obra-usuário): não têm período nem quantidade prevista, então não medem tempo nem pessoas faltantes. Campo de texto livre: impede controle de conflito e filtro de acesso.

**Consequências.** RF-07, RF-09, RF-19, RN-02, RN-09, RN-10 e as rotas 13a, 26 a 29 mudam. A propagação de atrasos passa a seguir integrantes em comum (Q10). O filtro de acesso do instalador usa a participação em equipes. O token não carrega equipe, porque ela muda com o período.

---

## ADR-013: Kanban com arraste livre e edição na página Obras

**Status:** Aceita (revisão de 07/11/2026); reclassifica parte da ADR-005

**Contexto.** O menu "Mover para..." está bugado e deve ser pouco usado. O Kanban deve ser a visão simples do fluxo. A edição de obra precisa de um lugar único.

**Decisão.**

- Arraste livre: o cartão pode ser solto em qualquer coluna. A API valida a transição ao receber o movimento. A regra de transição é mantida (Q11).
- Sem destaque prévio de colunas durante o arraste.
- O menu "Mover para..." passa a Could.
- Edição, materiais e comentários de gestão ficam na página Obras. O botão "Página da Obra" do cartão é somente um atalho.

**Alternativas.** Arraste sem validação: permite transições fora do fluxo de negócio. Manter o destaque de colunas: restringe o arraste, contrariando o pedido de revisão.

**Consequências.** Mais trabalho no backend para tratar movimentos recusados. A página Obras passa a ser a rota principal de gestão. Q11 precisa de resposta do solicitante.

---

## ADR-014: Valores e catálogo de produtos no módulo financeiro

**Status:** Aceita (revisão de 07/11/2026)

**Contexto.** A gestão de obras e a Engenharia não devem tratar valores. O valor estimado mockado na tela da obra induzia a erro.

**Decisão.**

- Preços de produto, custos, valor da obra, custo total e DRE ficam somente no módulo financeiro, visíveis a Administrador e Financeiro.
- O catálogo de produtos é mantido pelo Financeiro e pelo Administrador. A Engenharia usa a lista sem preço.
- As respostas da API para Engenharia e Instalador não contêm campos de valor. A regra é aplicada no servidor, nos DTOs.
- O valor mockado é removido da interface.

**Alternativas.** Ocultar valores só no frontend: não protege os dados, pois a decisão de autorização é do servidor (ADR-007). Manter preços na tela de materiais com leitura liberada: expõe valores à Engenharia.

**Consequências.** Dois conjuntos de DTOs para obra e material. Os testes de API por perfil precisam verificar a ausência de campos de valor (CT-20).
