# Decisões Arquiteturais

Cada decisão relevante tem um registro com contexto, decisão, alternativas e consequências. Decisões não são apagadas: quando mudam, o registro antigo recebe o status "Substituída por ADR-NNN" e um novo registro é criado.

| ADR | Título | Status |
| :---- | :---- | :---- |
| [ADR-001](#adr-001-monolito-modular-no-backend) | Monolito modular no backend | Proposta |
| [ADR-002](#adr-002-spa-em-react-com-vite-e-typescript) | SPA em React com Vite e TypeScript | Aceita |
| [ADR-003](#adr-003-tailwind-css-e-shadcnui) | Tailwind CSS e shadcn/ui | Aceita |
| [ADR-004](#adr-004-dhtmlx-gantt-com-propagação-customizada) | DHTMLX Gantt com propagação customizada | Aceita, licença pendente |
| [ADR-005](#adr-005-dnd-kit-no-kanban) | dnd-kit no Kanban | Aceita |
| [ADR-006](#adr-006-zustand-react-query-e-signalr) | Zustand, React Query e SignalR | Aceita |
| [ADR-007](#adr-007-autenticação-jwt-com-autorização-no-servidor) | Autenticação JWT com autorização no servidor | Aceita |
| [ADR-008](#adr-008-exclusão-lógica-e-timeline-append-only) | Exclusão lógica e timeline append-only | Aceita |
| [ADR-009](#adr-009-postgresql) | PostgreSQL | Aceita |
| [ADR-010](#adr-010-homologação-fora-do-escopo) | Homologação fora do escopo | Aceita |
| [ADR-011](#adr-011-regras-de-cálculo-do-gantt) | Regras de cálculo do Gantt | Proposta |

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

**Contexto.** Alocação de equipes por arraste. O auto-scheduling (propagação automática de datas) é recurso pago na maioria das bibliotecas comerciais.

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
- O instalador só vê instalações da própria equipe, com filtro no servidor.
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
