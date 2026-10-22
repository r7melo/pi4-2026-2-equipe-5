# Frontend — Guia de Desenvolvimento

> ZL Engenharia Solar · Sistema de Gestão de Obras

---

## Sumário

- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração do ambiente](#configuração-do-ambiente)
- [Rodando localmente](#rodando-localmente)
- [Seletor de API (mock vs. real)](#seletor-de-api-mock-vs-real)
- [Scripts disponíveis](#scripts-disponíveis)
- [Usuários de teste](#usuários-de-teste)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Tecnologias](#tecnologias)
- [Convenções de código](#convenções-de-código)
- [Dicas](#dicas)

---

## Pré-requisitos

- **Node.js** ≥ 20 LTS
- **npm** ≥ 10 (já vem com o Node)

Verifique sua versão:

```bash
node -v
npm -v
```

---

## Instalação

```bash
cd frontend
npm install
```

---

## Configuração do ambiente

Copie o arquivo de exemplo:

```bash
cp .env.local.example .env.local
```

Edite o `.env.local` conforme o modo que deseja usar:

### Modo mock — sem backend (padrão para devs frontend)

```dotenv
VITE_USE_MOCK=true
```

Toda a API é simulada localmente via `axios-mock-adapter`. Não precisa de backend, banco de dados ou qualquer outro serviço rodando.

### Modo API real — com backend rodando

```dotenv
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:8000
```

O backend precisa estar no ar. Confirme com o time de backend a URL correta.

> [!NOTE]
> `.env.local` está no `.gitignore` e **não deve ser commitado**.

---

## Rodando localmente

```bash
npm run dev
```

Acesse em **http://localhost:3000**.

O servidor tem **Hot Module Replacement** — a tela atualiza automaticamente ao salvar qualquer arquivo, sem perder o estado da aplicação.

---

## Seletor de API (mock vs. real)

Em desenvolvimento, um **botão flutuante** aparece no **canto inferior direito** da tela:

- 🚧 **Mock** — fundo amarelo, backend totalmente simulado
- 🌐 **API Real** — fundo verde, conecta ao backend em `VITE_API_URL`

Clique no botão para abrir o popup e trocar o modo. A página recarrega automaticamente para aplicar. A escolha fica salva no `localStorage` (chave `zl_api_mode`) e persiste entre sessões.

Isso permite trocar de modo **sem reiniciar o servidor dev** e **sem editar o `.env.local`**.

> [!NOTE]
> O botão não aparece em produção (`npm run build`).

---

## Scripts disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento com HMR na porta 3000 |
| `npm run build` | Compila TypeScript e gera o bundle de produção em `dist/` |
| `npm run preview` | Serve o `dist/` localmente para inspecionar o build |
| `npm run lint` | Executa oxlint + ESLint em todos os arquivos |
| `npm run lint:ox` | Apenas oxlint (mais rápido, bom para checar no dia a dia) |
| `npm run lint:es` | Apenas ESLint (regras React Hooks / React Refresh) |

---

## Usuários de teste

No modo mock, todos os usuários usam a senha `Senha123!`:

| E-mail | Perfil | O que acessa |
|---|---|---|
| `admin@zl.com.br` | Administrador | Tudo |
| `engenharia@zlengenharia.com` | Engenharia | Kanban, Gantt, Obras |
| `financeiro@zl.com.br` | Financeiro | Leitura + DRE e Relatórios |
| `instalador@zl.com.br` | Instalador de Campo | Instalações da própria equipe |
| `leitor@zl.com.br` | Leitor | Somente leitura |

> [!NOTE]
> Após 5 tentativas erradas seguidas no mesmo e-mail, o mock bloqueia com `423 ACCOUNT_LOCKED`, simulando o comportamento real do backend.

---

## Estrutura de pastas

```
frontend/src/
├── App.tsx                    # Roteamento principal e providers globais
├── main.tsx                   # Entry point — carrega o mock se necessário
│
├── features/                  # Um diretório por módulo de negócio
│   ├── auth/                  # Login, proteção de rota, store de autenticação
│   ├── kanban/                # Quadro Kanban de obras
│   ├── cronograma/            # Gantt, equipes e programações
│   ├── obras/                 # Cadastro e detalhe de obras
│   ├── materiais/             # Status logístico e kit do instalador
│   ├── financeiro/            # DRE, relatórios e exportações
│   └── homologacao/           # Fora do escopo — não implementar
│
└── shared/                    # Código compartilhado entre features
    ├── api/
    │   ├── api.ts             # Instância Axios com interceptores JWT
    │   └── mock/
    │       ├── index.ts       # Mock adapter (toda a API simulada aqui)
    │       └── fixtures.ts    # Dados de seed armazenados em sessionStorage
    ├── components/
    │   ├── dev/
    │   │   └── ApiModeSwitcher.tsx  # Popup de troca de API (dev only)
    │   ├── feedback/          # Componentes de loading, erro e estado vazio
    │   ├── pwa/               # Prompt de atualização de PWA
    │   └── ui/                # Componentes de UI reutilizáveis
    ├── constants/             # Enums e constantes (ex: status do Kanban)
    ├── layouts/               # DashboardLayout (sidebar + header)
    ├── lib/                   # Utilitários: formatadores, cálculos de data
    └── stores/                # Zustand stores globais (tema, auth)
```

Cada `feature/` segue a mesma organização interna:

```
features/<modulo>/
├── components/   # Componentes visuais do módulo
├── hooks/        # Custom hooks (useQuery, useMutation)
├── pages/        # Páginas (conectadas ao router)
├── services/     # Funções que chamam a API
├── stores/       # Estado local com Zustand (se necessário)
└── types/        # Interfaces e tipos TypeScript
```

---

## Tecnologias

| Biblioteca | Versão | Para que serve |
|---|---|---|
| React | 19 | Biblioteca de UI |
| Vite | 8 | Servidor dev e bundler |
| TypeScript | 6 | Tipagem estática |
| Tailwind CSS | 4 | Estilização por classes utilitárias |
| React Router | 7 | Roteamento SPA e guarda de perfil |
| TanStack React Query | 5 | Cache e sincronização com o servidor |
| Zustand | 5 | Estado de interface (tema, filtros) |
| Axios | 1.x | Requisições HTTP com interceptor JWT |
| axios-mock-adapter | 2.x | Simulação do backend em dev |
| DHTMLX Gantt | 10 | Componente de gráfico de Gantt |
| dnd-kit | 6 / 10 | Drag-and-drop no Kanban |
| SignalR | 10 | Atualizações em tempo real (WebSocket) |
| React Hook Form + Zod | 7 / 4 | Formulários e validação de schema |
| Sonner | 2 | Notificações toast |
| vite-plugin-pwa | 1 | PWA — instalável no celular |

---

## Convenções de código

### Alias de importação

Use sempre `@/` para importar a partir de `src/`, evitando caminhos relativos longos:

```ts
// ✅ correto
import { api } from "@/shared/api/api";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";

// ❌ evitar
import { api } from "../../shared/api/api";
```

### Estado de servidor vs. estado de interface

| Tipo de dado | Use |
|---|---|
| Dados que vêm da API (obras, equipes…) | **React Query** (`useQuery`, `useMutation`) |
| Estado de UI (filtros, modal aberto, tema) | **Zustand** |
| Estado local simples de um componente | `useState` |

Não armazene respostas da API no Zustand.

### Adicionando uma nova rota no mock

Abra [`src/shared/api/mock/index.ts`](./src/shared/api/mock/index.ts) e registre o handler antes da linha `mock.onAny().passThrough()`:

```ts
mock.onGet(/\/minha-rota\/?(\\?.*)?$/).reply(() => [200, { dados: "aqui" }]);
```

---

## Dicas

### Proxy automático do Vite

Com `VITE_USE_MOCK=false`, o Vite encaminha chamadas `/api/*` e `/hubs/*` para o backend, sem precisar configurar CORS:

```
http://localhost:3000/api/obras  →  http://localhost:8000/api/obras
```

### Testando no celular via rede local

Para testar a interface do instalador no celular (mesma rede Wi-Fi):

1. No `.env.local`, adicione `USE_SSL=true`
2. Rode `npm run dev`
3. Acesse pelo IP da máquina: `https://192.168.x.x:3000`
4. Aceite o certificado autoassinado no navegador do celular

### Limpando dados do mock

Os dados gerados pelo mock ficam no **sessionStorage** do navegador. Para resetar ao estado inicial, basta fechar e reabrir a aba (ou abrir em aba anônima).

### Rodando o lint antes de abrir PR

```bash
npm run lint
```

PRs com erros de lint não devem ser mergeados.
