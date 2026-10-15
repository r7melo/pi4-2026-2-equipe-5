# ZL Engenharia Solar: Sistema de Gestão de Obras

Sistema web para gestão de obras de instalação de energia solar. Reúne o funil de obras (Kanban), o planejamento de equipes de campo (Gantt), a linha do tempo de cada obra, o módulo do instalador em celular e o controle de custos e DRE.

## Stack

| Camada | Tecnologia |
| :---- | :---- |
| Frontend | React, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| Gantt / Kanban | DHTMLX Gantt, dnd-kit |
| Estado e dados | Zustand, TanStack React Query, Axios |
| Backend | ASP.NET Core Web API (.NET 8), C# |
| Tempo real | SignalR |
| Banco | PostgreSQL 16 |
| Ambiente local | Docker Compose |

## Executar localmente

```bash
docker compose up --build
```

| Serviço | Endereço |
| :---- | :---- |
| Frontend | http://localhost:3000 |
| API | http://localhost:8000/api |

Para carregar o banco do zero (o seed só roda na criação do volume):

```bash
docker compose down -v
docker compose up --build
```

Configure `VITE_USE_MOCK=false` em `frontend/.env.local` para usar a API real. Com o mock ativo, qualquer credencial é aceita.

Usuários do seed (somente ambiente de desenvolvimento): senha `Senha123!`, com e-mails `admin@zl.com.br`, `engenharia@zlengenharia.com`, `financeiro@zl.com.br`, `instalador@zl.com.br` e `leitor@zl.com.br` (perfil em definição).

## Documentação

| Documento | Conteúdo |
| :---- | :---- |
| [Visão de negócio](docs/Requisitos/01-visao-negocio.md) | Objetivos, escopo, perfis, premissas e questões em aberto |
| [Requisitos](docs/Requisitos/02-requisitos.md) | Requisitos funcionais, não funcionais e critérios de aceite |
| [Casos de uso](docs/Requisitos/03-casos-de-uso.md) | Atores, casos de uso e relações |
| [Regras de negócio](docs/Requisitos/04-regras-negocio.md) | Regras, transições de status e matriz de permissões |
| [Arquitetura](docs/Requisitos/05-arquitetura.md) | Contexto, contêineres, componentes, stack, segurança e operação |
| [Modelo de dados](docs/Requisitos/06-modelo-dados.md) | Entidades, domínios, relacionamentos e índices |
| [API](docs/Requisitos/07-api.md) | Convenções, erros e contrato das rotas |
| [Fluxos](docs/Requisitos/08-fluxos.md) | Sequências de login, mudança de status e alocação |
| [Decisões arquiteturais](docs/Requisitos/09-decisoes-arquiteturais.md) | ADRs do projeto |
| [Testes](docs/Requisitos/10-testes.md) | Estratégia, casos de teste e dados |
| [Rastreabilidade](docs/Requisitos/11-rastreabilidade.md) | Requisito → caso de uso → regra → componente → endpoint → teste |
| [Riscos](docs/Requisitos/12-riscos.md) | Riscos abertos e mitigação |
| [Status](docs/Requisitos/13-status.md) | Situação por módulo e critérios de conclusão |
| [Protótipo](https://www.figma.com/design/lVSE5i1ZoAaV5Y0AvmC0Hz/PI-IV?node-id=0-1&t=d1mq86Ut5gcweABj-1) | Modelo via Figma |