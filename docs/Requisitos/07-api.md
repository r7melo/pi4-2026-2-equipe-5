# API

Base: `/api`. Autenticação por `Authorization: Bearer <token>`, obtido em `POST /api/auth/login`.

## Convenções

| Aspecto | Padrão |
| :---- | :---- |
| Formato | `application/json`, campos em camelCase |
| Datas | `yyyy-MM-dd` para data; `yyyy-MM-ddTHH:mm:ssZ` para data e hora |
| Paginação | `page` (padrão 1) e `pageSize` (padrão 20) |
| Erro | `{ "error": { "code": "...", "message": "..." } }`, com mensagem em português |
| Sem conteúdo | `204 No Content` em exclusões |
| Campos sensíveis | `senha` nunca é retornada |

## Códigos de erro

| HTTP | code | Quando |
| :---- | :---- | :---- |
| 400 | `INVALID_BODY` | Corpo ausente, JSON malformado ou tipo errado |
| 400 | `INVALID_PARAMETER` | Parâmetro de consulta inválido |
| 400 | `VALIDATION_ERROR` | Regra de negócio violada |
| 400 | `MISSING_STATUS` | `statusNovo` não informado |
| 400 | `INVALID_STATUS` | Status inexistente |
| 400 | `INVALID_STATUS_TRANSITION` | Transição fora do fluxo |
| 400 | `INVALID_STATUS_LOGISTICO` | Status logístico inexistente |
| 401 | `INVALID_CREDENTIALS` | E-mail ou senha inválidos |
| 401 | `UNAUTHORIZED` | Token ausente, inválido ou expirado |
| 403 | `ACCESS_DENIED` | Perfil sem permissão |
| 404 | `OBRA_NOT_FOUND` | Obra inexistente |
| 404 | `ROUTE_NOT_FOUND` | Rota inexistente, inclusive ID não numérico |
| 405 | `METHOD_NOT_ALLOWED` | Método não suportado |
| 409 | `SCHEDULE_CONFLICT` | Equipe já alocada no período |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Corpo sem `Content-Type: application/json` |
| 423 | `ACCOUNT_LOCKED` | Conta bloqueada por falhas de login |
| 500 | `INTERNAL_ERROR` | Erro inesperado (detalhes apenas no log) |

## Rotas

| # | Método e caminho | Perfis | Descrição |
| :---- | :---- | :---- | :---- |
| 1 | `POST /api/auth/login` | Público | Autentica e emite JWT |
| 2 | `GET /api/auth/me` | Autenticado | Usuário, perfil e permissões |
| 3 | `POST /api/auth/esqueci-senha` | Público | Envia e-mail com link de redefinição de senha (uso único, expira em 1h) |
| 4 | `POST /api/auth/redefinir-senha` | Público por token | Redefine a senha usando o token do link; invalida todos os tokens de acesso do usuário |
| 5 | `PUT /api/auth/alterar-senha` | Autenticado | Usuário autenticado altera a própria senha informando a senha atual e a nova |
| 6 | `POST /api/usuarios` | Administrador | Cadastra usuário de qualquer perfil |
| 7 | `GET /api/clientes` | Administrador, Engenharia | Lista clientes |
| 8 | `POST /api/clientes` | Administrador, Engenharia | Cadastra cliente |
| 9 | `GET /api/obras` | Administrador, Engenharia, Financeiro | Lista obras com filtros `status`, `clienteNome`, `categoria` |
| 10 | `POST /api/obras` | Administrador, Engenharia | Cadastra obra vinculada a cliente |
| 11 | `GET /api/obras/{id}` | Administrador, Engenharia, Financeiro; Instalador se da equipe | Detalhe da obra |
| 12 | `PUT /api/obras/{id}` | Administrador, Engenharia | Edita título, descrição, responsável e datas |
| 13 | `DELETE /api/obras/{id}` | Administrador, Engenharia | Exclusão lógica |
| 14 | `PATCH /api/obras/{id}/status` | Administrador, Engenharia | Move o cartão (muda status) |
| 15 | `GET /api/obras/{id}/materiais` | Autenticado (Instalador só da equipe) | Lista materiais |
| 16 | `POST /api/obras/{id}/materiais` | Administrador, Engenharia | Registra material |
| 17 | `PATCH /api/materiais/{id}` | Administrador, Engenharia | Atualiza status logístico |
| 18 | `GET /api/obras/{id}/historico` | Administrador, Engenharia, Financeiro | Timeline cronológica |
| 19 | `GET /api/obras/{id}/comentarios` | Autenticado | Lista comentários |
| 20 | `POST /api/obras/{id}/comentarios` | Administrador, Engenharia (cartão); Financeiro (timeline) | Cria comentário |
| 21 | `PUT /api/comentarios/{id}` | Administrador | Edita comentário geral |
| 22 | `DELETE /api/comentarios/{id}` | Administrador | Exclui comentário geral |
| 23 | `GET /api/equipes` | Autenticado | Lista equipes |
| 24 | `POST /api/equipes` | Administrador, Engenharia | Cria equipe com instaladores e responsável |
| 25 | `GET /api/programacoes` | Autenticado | Cronograma (filtros `dataInicio`, `dataFim`, `equipeId`) |
| 26 | `POST /api/programacoes` | Administrador, Engenharia | Aloca equipe a obra |
| 27 | `PUT /api/programacoes/{id}/reordenar` | Administrador, Engenharia | Reordena com propagação |
| 28 | `GET /api/obras/{id}/custos` | Administrador, Financeiro | Itens de custo e precificação |
| 29 | `POST /api/obras/{id}/custos` | Financeiro | Registra custos e valor da obra |
| 30 | `GET /api/obras/{id}/relatorio-custo` | Administrador, Financeiro | Custo total e itens (só obra concluída) |
| 31 | `GET /api/obras/{id}/dre` | Administrador, Financeiro | DRE da obra |
| 32 | `GET /api/relatorios/export` | Administrador, Financeiro | Exporta `tipo` (financeiro, cronograma), `dataInicio`, `dataFim`, `formato` (`pdf` ou `xlsx`) |
| 33 | `GET /api/obras/{id}/instalacao/export` | Administrador | Exporta detalhes da instalação |
| 34 | `GET /api/instalador/instalacoes` | InstaladorCampo | Instalações da equipe do usuário |
| 35 | `GET /api/instalador/instalacoes/{obraId}` | InstaladorCampo | Detalhe: kit, endereço, projeto, instruções, `linkNavegacao` |
| 36 | `GET /api/instalador/manutencoes` | InstaladorCampo | Manutenções da equipe |
| 37 | `PATCH /api/manutencoes/{id}/concluir` | InstaladorCampo | Conclui manutenção |
| 38 | `POST /api/manutencoes/{id}/comentarios` | InstaladorCampo | Comenta manutenção |
| 39 | `POST /api/cronograma/compartilhado` | Administrador, Engenharia | Gera token de cronograma |
| 40 | `GET /api/cronograma/compartilhado/{token}` | Público por token | Cronograma somente leitura, com `dataInicio` e `dataFim` |

## Contratos principais

### Login

Requisição:

```json
{ "email": "engenharia@zlengenharia.com", "senha": "********" }
```

Resposta `200`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresAt": "2026-10-15T03:00:00Z",
  "usuario": { "id": 12, "nome": "Ana Souza", "email": "engenharia@zlengenharia.com", "perfil": "Engenharia", "equipeId": 3 }
}
```

### Mover cartão

Requisição:

```json
{ "statusNovo": "EmAndamento", "observacao": "Equipe iniciou instalação" }
```

Resposta `200`:

```json
{
  "id": 301,
  "statusAnterior": "Separado",
  "statusNovo": "EmAndamento",
  "dataAlteracao": "2026-10-15T15:10:00Z",
  "emailNotificacaoEnviado": false
}
```

### Alocar equipe

Requisição:

```json
{ "obraId": 301, "equipeId": 3, "dataInicio": "2026-10-19", "prioridade": 1 }
```

Resposta `201`:

```json
{
  "id": 601,
  "obraId": 301,
  "equipeId": 3,
  "dataInicio": "2026-10-19",
  "dataFim": "2026-10-21",
  "duracaoEstimadaDias": 2.5,
  "prioridade": 1
}
```

Conflito: `409 SCHEDULE_CONFLICT`, com período ocupado na mensagem.

### Reordenar

Requisição:

```json
{ "novaDataInicio": "2026-10-21" }
```

Resposta `200`:

```json
{
  "id": 611,
  "novaDataInicio": "2026-10-21",
  "novaDataFim": "2026-10-22",
  "programacoesAfetadas": [
    { "id": 612, "novaDataInicio": "2026-10-23", "novaDataFim": "2026-10-27" }
  ]
}
```

### Custo total

Resposta `200` (obra concluída com precificação completa):

```json
{
  "obraId": 307,
  "custoMaoObra": 9200.00,
  "custoInsumos": 22500.00,
  "custoTotal": 31700.00,
  "balancoMateriais": [
    { "tipo": "Cabo Solar 6mm", "quantidadeUtilizada": 180, "quantidadeComprada": 180 }
  ]
}
```

Obra não concluída ou sem precificação: `400 VALIDATION_ERROR`, com o motivo na mensagem.

### Instalação do instalador

Resposta `200` de `GET /api/instalador/instalacoes/{obraId}`:

```json
{
  "obraId": 301,
  "clienteNome": "Rede Alfa Supermercados",
  "endereco": "Av. das Palmeiras, 500, Campinas/SP",
  "linkNavegacao": "https://www.google.com/maps/search/?api=1&query=-22.90,-47.06",
  "kit": [
    { "tipo": "Painel Solar 550W", "quantidade": 45 },
    { "tipo": "Inversor 5kW", "quantidade": 2 }
  ],
  "projeto": { "arquivo": "projeto-301.pdf" },
  "instrucoes": "Fixar estrutura antes dos painéis."
}
```

### Cronograma compartilhado

Resposta `200` de `GET /api/cronograma/compartilhado/{token}`: mesmo formato de `GET /api/programacoes`, sem campos de custo, cliente ou usuário. Token inválido ou expirado: `404 ROUTE_NOT_FOUND` com mensagem de link inválido.
