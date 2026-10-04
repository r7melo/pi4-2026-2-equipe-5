# ZL Engenharia — Sistema de Gestão de Obras Solares

> Projeto Integrador 4 · Equipe 5 · 2026/2

Sistema web para gestão completa de obras de instalação de energia solar: do cadastro ao financeiro, com Kanban, Gantt, controle de materiais e acesso mobile para instaladores de campo.

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Stack Tecnológica](#stack-tecnológica)
- [Estrutura do Repositório](#estrutura-do-repositório)
- [Pré-requisitos](#pré-requisitos)
- [Como Rodar o Projeto](#como-rodar-o-projeto)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Perfis de Acesso](#perfis-de-acesso)
- [Documentação](#documentação)

---

## Visão Geral

O sistema atende à empresa **ZL Engenharia** e cobre os seguintes fluxos principais:

| Módulo | Descrição |
|---|---|
| **Kanban de Obras** | Acompanha cada instalação pelas etapas: `Material Comprado → No Depósito → Separado → Em Andamento → Concluído → Assistência` |
| **Cronograma (Gantt)** | Aloca equipes por obra e período, com propagação automática de atrasos |
| **Materiais** | Rastreia kits e insumos por obra (painéis, inversores, cabos etc.) |
| **Financeiro** | DRE por obra (mão de obra + insumos) e exportação de relatórios em PDF/Excel |
| **Homologação** | Acompanha o processo junto à concessionária de energia |
| **Acesso Mobile** | Link sem login para instaladores de campo verem kits do dia e rota no mapa |
| **Cronograma Público** | Link somente leitura do Gantt para compartilhamento externo |

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Frontend** | React 19 · TypeScript · Vite · Tailwind CSS v4 |
| **State / Data** | Zustand · TanStack Query · React Hook Form · Zod |
| **UI / UX** | dnd-kit (drag-and-drop) · dhtmlx-gantt · Lucide Icons · Sonner |
| **Real-time** | SignalR (`@microsoft/signalr`) |
| **Backend** | ASP.NET Core Web API (.NET) |
| **Banco de Dados** | PostgreSQL 16 |
| **Infra** | Docker · Docker Compose |

---

## Estrutura do Repositório

```
pi4-2026-2-equipe-5/
├── backend/                  # ASP.NET Core Web API
│   └── Dockerfile
├── database/
│   ├── 01_schema.sql         # Criação das tabelas (roda automaticamente no Docker)
│   ├── 02_seed.sql           # Dados iniciais para desenvolvimento
│   └── GUIA_QA.md            # Guia de qualidade e testes do banco
├── docs/
│   ├── Contrato_API.md       # Contrato completo de rotas (frontend ↔ backend)
│   ├── Protótipo ZL Engenharia.pdf
│   └── documentacao de requisitos/
│       ├── Casos_de_Uso.pdf
│       ├── Requisitos_Funcionais_e_Nao_Funcionais.pdf
│       └── MER_Textual_-_Sistema_de_Gestao_Solar.pdf
├── frontend/                 # React + TypeScript + Vite
│   └── src/
│       ├── components/       # Componentes reutilizáveis (Kanban, Gantt, UI, Auth)
│       ├── pages/            # Páginas da aplicação
│       ├── services/         # Chamadas à API (+ mocks para desenvolvimento)
│       ├── stores/           # Estado global (Zustand)
│       ├── hooks/            # Hooks de dados (React Query)
│       └── types/            # Tipagens TypeScript
├── docker-compose.yml
├── env.example               # Modelo das variáveis de ambiente
└── README.md
```

---

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e rodando
- [Node.js 20+](https://nodejs.org/) (apenas para desenvolvimento local do frontend sem Docker)
- [.NET 9 SDK](https://dotnet.microsoft.com/download) (apenas para desenvolvimento local do backend sem Docker)

---

## Como Rodar o Projeto

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd pi4-2026-2-equipe-5
```

### 2. Configure as variáveis de ambiente

```bash
# Na raiz do projeto:
copy env.example .env

# No frontend:
copy frontend\.env.local.example frontend\.env.local
```

> O arquivo `.env` **nunca deve ser commitado**. Ele já está no `.gitignore`.

### 3. Suba o ambiente com Docker

```bash
docker compose up --build
```

Na **primeira** execução, o Docker irá:
1. Criar o banco PostgreSQL
2. Executar `01_schema.sql` (tabelas) e `02_seed.sql` (dados de exemplo) automaticamente
3. Compilar e subir o backend e o frontend

### 4. Acesse a aplicação

| Serviço | URL |
|---|---|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:8000 |
| **Banco de dados** | `localhost:5432` (use DBeaver, TablePlus etc.) |

---

### Rodando o Frontend isoladamente (sem Docker)

```bash
cd frontend
npm install
npm run dev
```

> O frontend possui **mocks** configurados (`src/services/mock/`) para funcionar sem o backend durante o desenvolvimento.

---

## Variáveis de Ambiente

### Raiz do projeto (`.env`)

| Variável | Padrão | Descrição |
|---|---|---|
| `DB_USER` | `pi4_user` | Usuário do PostgreSQL |
| `DB_PASSWORD` | `pi4_password` | Senha do PostgreSQL |
| `DB_NAME` | `pi4_db` | Nome do banco de dados |
| `DB_PORT` | `5432` | Porta exposta do banco |
| `BACKEND_PORT` | `8000` | Porta exposta do backend |

### Frontend (`frontend/.env.local`)

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | URL base da API do backend (ex.: `http://localhost:8000`) |

---

## Perfis de Acesso

O sistema usa RBAC com 5 perfis:

| Perfil | Permissões principais |
|---|---|
| `Administrador` | Acesso total, incluindo exclusão de comentários e gestão de equipes |
| `EngenhariaObras` | Criar/editar obras, mover cards no Kanban, gerenciar cronograma |
| `Financeiro` | Visualizar e exportar relatórios de custo |
| `VisualizadorLeitor` | Somente leitura em todas as telas |
| `InstaladorCampo` | Acesso via link mobile (sem login tradicional) |

---

## Documentação

| Documento | Localização |
|---|---|
| Contrato de API (rotas) | [`docs/Contrato_API.md`](docs/Contrato_API.md) |
| Casos de Uso (UC-01 a UC-06) | `docs/documentacao de requisitos/Casos_de_Uso.pdf` |
| Requisitos Funcionais (RF-01 a RF-20) | `docs/documentacao de requisitos/Requisitos_Funcionais_e_Nao_Funcionais.pdf` |
| Modelo Entidade-Relacionamento | `docs/documentacao de requisitos/MER_Textual_-_Sistema_de_Gestao_Solar.pdf` |
| Guia de QA do Banco | [`database/GUIA_QA.md`](database/GUIA_QA.md) |
| Protótipo (Figma) | [Abrir no Figma](https://www.figma.com/design/lVSE5i1ZoAaV5Y0AvmC0Hz/PI-IV?node-id=0-1&t=d1mq86Ut5gcweABj-1) |