# Rastreabilidade

Cada requisito funcional e não funcional tem caso de uso, regra de negócio, componente, endpoint e caso de teste. Lacunas ficam marcadas com `—`.

**Situação:** Concluído · Em andamento · Pendente · Fora do escopo

## Requisitos funcionais

| RF | Casos de uso | Regras | Componente | Endpoint | Caso de teste | Situação |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| RF-01 | UC-01, UC-02, UC-05, UC-06, UC-07, UC-09 | RN-04 | `AuthController`, `AuthService` | `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/usuarios` | CT-01 | Em andamento |
| RF-02 | UC-03, UC-04 | RN-04, RN-05 | `AuthorizationMiddleware` | Todas as rotas protegidas | CT-02 | Pendente |
| RF-03 | UC-08, UC-10, UC-11, UC-15, UC-16 | RN-03 | `ClienteController`, `ObraController` | `POST /api/clientes`, `POST /api/obras`, `DELETE /api/obras/{id}` | CT-06 | Em andamento |
| RF-04 | UC-12, UC-15 a UC-19 | RN-03, RN-05 | `KanbanBoard`, `ObraController` | `PATCH /api/obras/{id}/status`, `PUT /api/obras/{id}` | CT-03 | Em andamento |
| RF-05 | UC-14, UC-20, UC-25 | RN-05 | `ManutencaoController` | `PATCH /api/manutencoes/{id}/concluir`, `POST /api/manutencoes/{id}/comentarios` | CT-07 | Pendente |
| RF-06 | UC-17, UC-27, UC-28 | — | `ObraController`, `KanbanCard`, `GanttBar` | `PATCH /api/materiais/{id}` | CT-13 | Em andamento |
| RF-07 | UC-13, UC-21, UC-22 | RN-01, RN-02 | `EquipeController`, `GanttController` | `POST /api/equipes`, `POST /api/programacoes` | CT-04 | Em andamento |
| RF-08 | UC-22 | RN-01 | `DuracaoService` | Cálculo em `POST /api/programacoes` | CT-04 | Em andamento |
| RF-09 | UC-22 | RN-02 | `GanttService` | `PUT /api/programacoes/{id}/reordenar` | CT-09 | Em andamento |
| RF-10 | UC-12, UC-13, UC-18 | — | `SyncService`, handler SignalR | Evento interno | CT-10 | Pendente |
| RF-11 | UC-19, UC-20, UC-29, UC-30 | RN-05 | `HistoricoController`, `RegistroAcaoService` | `GET /api/obras/{id}/historico`, comentários | CT-03 | Em andamento |
| RF-12 | UC-20, UC-30 | RN-05 | Política de imutabilidade | `PUT` e `DELETE /api/comentarios/{id}` | CT-02 | Em andamento |
| RF-13 | — | — | `EmailService`, `ObraStatusEventHandler` | Evento de `PATCH /status` | CT-11 | Pendente |
| RF-14 | UC-31, UC-32 | RN-03 | `FinanceiroController`, `CustoService` | `GET /api/obras/{id}/relatorio-custo`, `POST /api/obras/{id}/custos` | CT-05 | Em andamento |
| RF-15 | UC-23, UC-34 | — | `RelatorioController`, `ExportService` | `GET /api/relatorios/export`, `GET /api/obras/{id}/instalacao/export` | — | Pendente |
| RF-16 | — | RN-04 | `CronogramaPublicoController` | `POST` e `GET /api/cronograma/compartilhado` | CT-12 | Pendente |
| RF-17 | — | — | — | — | — | Fora do escopo |
| RF-18 | — | RN-04 | `DisplayMode` (frontend) | — | — | Pendente |
| RF-19 | UC-01, UC-03, UC-14, UC-24, UC-25, UC-26 | RN-04 | `InstaladorController` | `GET /api/instalador/instalacoes`, `GET /api/instalador/instalacoes/{obraId}` | CT-08 | Em andamento |
| RF-20 | UC-33 | RN-03 | `DREController`, `DREService` | `GET /api/obras/{id}/dre` | CT-14 | Pendente |

## Requisitos não funcionais

| RNF | Componente | Verificação | Caso de teste | Situação |
| :---- | :---- | :---- | :---- | :---- |
| RNF-01 | Layout responsivo (Tailwind CSS) | Render em 360, 768, 1280 e 1920 px nos três navegadores | CT-RNF-01 | Em andamento |
| RNF-02 | Proxy reverso e TLS | Nenhuma rota HTTP em produção | CT-RNF-02 | Pendente |
| RNF-03 | `AuthorizationMiddleware` | 401 sem token; 403 perfil errado; log em ambos | CT-RNF-03 | Pendente |
| RNF-04 | `AuditLogService`, `audit_log` | Registro com usuário e timestamp; remoção bloqueada | CT-RNF-04 | Pendente |
| RNF-05 | `ExportService` | P95 ≤ 5 s com 1.000 registros | CT-RNF-05 | Pendente |

## Casos de uso

| UC | Rota ou componente | Situação |
| :---- | :---- | :---- |
| UC-01 | `POST /api/auth/login` | Em andamento |
| UC-02 | Emissão de JWT em `AuthService` | Em andamento |
| UC-03 | `GET /api/auth/me` e middleware | Em andamento |
| UC-04 | `AuthorizationMiddleware` | Pendente |
| UC-05, UC-06, UC-07, UC-09 | `POST /api/usuarios` | Pendente |
| UC-08 | `POST /api/clientes` | Pendente |
| UC-10 | `POST /api/obras` | Em andamento |
| UC-11 | `DELETE /api/obras/{id}` | Pendente |
| UC-12 | `PATCH /api/obras/{id}/status` | Em andamento |
| UC-13 | `POST /api/programacoes` | Em andamento |
| UC-14 | `POST /api/manutencoes/{id}/comentarios` | Pendente |
| UC-15, UC-16 | Criação e remoção de cartão em `ObraController` | Em andamento |
| UC-17 | `PUT /api/obras/{id}` | Em andamento |
| UC-18 | `PATCH /api/obras/{id}/status` | Em andamento |
| UC-19 | `POST /api/obras/{id}/comentarios` | Em andamento |
| UC-20 | `RegistroAcaoService` | Em andamento |
| UC-21 | `POST /api/equipes` | Em andamento |
| UC-22 | `POST /api/programacoes`, `PUT /reordenar` | Em andamento |
| UC-23 | `GET /api/obras/{id}/instalacao/export` | Pendente |
| UC-24 | `GET /api/instalador/instalacoes/{obraId}` | Em andamento |
| UC-25 | `PATCH /api/manutencoes/{id}/concluir` | Pendente |
| UC-26 | `linkNavegacao` na instalação | Em andamento |
| UC-27 | `GET /api/obras` (leitura) | Em andamento |
| UC-28 | `GET /api/programacoes` (leitura) | Em andamento |
| UC-29 | `GET /api/obras/{id}/historico` | Em andamento |
| UC-30 | Comentário geral na timeline | Pendente |
| UC-31 | `POST /api/obras/{id}/custos` | Pendente |
| UC-32 | `GET /api/obras/{id}/relatorio-custo` | Em andamento |
| UC-33 | `GET /api/obras/{id}/dre` | Pendente |
| UC-34 | `GET /api/relatorios/export` | Pendente |
