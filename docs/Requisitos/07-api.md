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
| 400 | `INVALID_STATUS_LOGISTICO` | Status logístico inexistente ou fora da ordem (Q12) |
| 401 | `INVALID_CREDENTIALS` | E-mail ou senha inválidos |
| 401 | `UNAUTHORIZED` | Token ausente, inválido ou expirado |
| 403 | `ACCESS_DENIED` | Perfil sem permissão |
| 404 | `OBRA_NOT_FOUND` | Obra inexistente |
| 404 | `ROUTE_NOT_FOUND` | Rota inexistente, inclusive ID não numérico |
| 405 | `METHOD_NOT_ALLOWED` | Método não suportado |
| 400 | `PRODUTO_INATIVO` | Produto inexistente ou desativado na inclusão de material |
| 400 | `SENHA_ATUAL_INCORRETA` | Senha atual não confere na alteração autenticada |
| 409 | `SCHEDULE_CONFLICT` | Responsável já alocado em outra obra no período |
| 409 | `CLIENTE_COM_OBRAS` | Exclusão de cliente com obras vinculadas, inclusive excluídas logicamente |
| 409 | `CPF_CNPJ_DUPLICADO` | CPF/CNPJ já cadastrado |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Corpo sem `Content-Type: application/json` |
| 423 | `ACCOUNT_LOCKED` | Conta bloqueada por falhas de login |
| 500 | `INTERNAL_ERROR` | Erro inesperado (detalhes apenas no log) |

## Rotas

A matriz por perfil, em formato de tabela, está na seção 8 de [Regras de negócio](04-regras-negocio.md#8-matriz-de-autorização-das-rotas-da-api).

| # | Método e caminho | Perfis | Descrição | Situação |
| :---- | :---- | :---- | :---- | :---: |
| 1 | `POST /api/auth/login` | Público | Autentica e emite JWT | ✅ |
| 2 | `GET /api/auth/me` | Autenticado | Usuário, perfil e permissões | ✅ |
| 3 | `POST /api/auth/esqueci-senha` | Público | Envia e-mail com link de redefinição (uso único, expira em 1h) | ⏳ |
| 4 | `POST /api/auth/redefinir-senha` | Público por token | Redefine a senha pelo token; invalida todos os tokens do usuário | ⏳ |
| 5 | `PUT /api/auth/alterar-senha` | Autenticado | Usuário autenticado altera a própria senha | ⏳ |
| 6 | `GET /api/usuarios` | Administrador | Lista usuários (nome, e-mail, perfil, situação) | ⏳ |
| 7 | `POST /api/usuarios` | Administrador | Cadastra usuário de qualquer perfil; senha inicial enviada por e-mail | ⏳ |
| 8 | `PUT /api/usuarios/{id}` | Administrador | Edita nome, e-mail e perfil; mudança de perfil invalida os tokens do usuário | ⏳ |
| 9 | `PATCH /api/usuarios/{id}/ativo` | Administrador | Desativa ou reativa usuário; desativar invalida os tokens; reativar envia nova senha por e-mail | ⏳ |
| 10 | `GET /api/clientes` | Administrador, Engenharia | Lista clientes | ⏳ |
| 10a | `PUT /api/clientes/{id}` | Administrador, Engenharia | Edita cliente; CPF/CNPJ continua único e válido | ⏳ |
| 10b | `DELETE /api/clientes/{id}` | Administrador, Engenharia | Exclui cliente sem obras vinculadas, inclusive excluídas logicamente; caso contrário `409 CLIENTE_COM_OBRAS` | ⏳ |
| 11 | `POST /api/clientes` | Administrador, Engenharia | Cadastra cliente (CPF/CNPJ único e válido) | ⏳ |
| 12 | `GET /api/obras` | Administrador, Engenharia, Financeiro | Lista obras; filtros: `status`, `clienteNome`, `categoria`, `page`, `pageSize` | ✅ |
| 13 | `POST /api/obras` | Administrador, Engenharia | Cadastra obra vinculada a cliente existente; sem campos de valor | ✅ |
| 13a | `PUT /api/obras/{id}/responsaveis` | Administrador, Engenharia | Define os responsáveis da obra (usuários ativos de qualquer perfil) | ⏳ |
| 14 | `GET /api/obras/{id}` | Administrador, Engenharia, Financeiro; Instalador se for responsável | Detalhe da obra; Engenharia e Instalador não recebem campos de valor | ✅ |
| 15 | `PUT /api/obras/{id}` | Administrador, Engenharia | Edita descrição, categoria, endereço e datas (sem campos de valor) | ✅ |
| 16 | `DELETE /api/obras/{id}` | Administrador, Engenharia | Exclusão lógica (obra em execução não pode ser excluída) | ⏳ |
| 17 | `PATCH /api/obras/{id}/status` | Administrador, Engenharia | Muda o status da obra conforme o fluxo; grava histórico e audit_log | ✅ |
| 18 | `GET /api/obras/{id}/materiais` | Autenticado (Instalador só se for responsável) | Lista materiais | ✅ |
| 19 | `POST /api/obras/{id}/materiais` | Administrador, Engenharia | Inclui material a partir de produto cadastrado e ativo; status inicial `EmSolicitacao` | ✅ |
| 20 | `PATCH /api/materiais/{id}` | Administrador, Financeiro | Atualiza status logístico na ordem da seção 2.1 de [regras](04-regras-negocio.md); grava audit_log | ⏳ |
| 20a | `GET /api/produtos` | Administrador, Engenharia, Financeiro | Lista produtos ativos; Engenharia recebe nome, tipo e unidade, sem preço | ⏳ |
| 20b | `POST /api/produtos` | Administrador, Financeiro | Cadastra produto com preço unitário | ⏳ |
| 20c | `PUT /api/produtos/{id}` | Administrador, Financeiro | Altera produto ou desativa (`ativo: false`) | ⏳ |
| 21 | `GET /api/obras/{id}/historico` | Administrador, Engenharia, Financeiro | Timeline cronológica | ✅ |
| 22 | `GET /api/obras/{id}/comentarios` | Autenticado | Lista comentários; filtro opcional `?tipo=` com `Cartao`, `Manutencao` ou `Timeline` | ✅ |
| 23 | `POST /api/obras/{id}/comentarios` | Administrador, Engenharia (tipo Cartao, comentário de gestão da obra); Financeiro (tipo Timeline apenas) | Cria comentário | ✅ |
| 24 | `PUT /api/comentarios/{id}` | Administrador | Edita comentário; grava audit_log | ✅ |
| 25 | `DELETE /api/comentarios/{id}` | Administrador | Exclui comentário; grava audit_log | ✅ |
| 26 | `GET /api/responsaveis` | Administrador, Engenharia | Lista usuários ativos elegíveis como responsáveis; com `?dataInicio&dataFim` marca campo `ocupado` | ⏳ |
| 27 | ~~`POST /api/equipes`~~ | Removida na revisão de 07/11/2026; responsáveis ficam na obra (rota 13a) | — |
| 28 | `GET /api/programacoes` | Autenticado (Instalador só de obras em que é responsável) | Cronograma; filtros: `dataInicio`, `dataFim`, `responsavelId` | ✅ |
| 29 | `POST /api/programacoes` | Administrador, Engenharia | Programa obra no período (dia útil obrigatório; status Separado, EmAndamento ou Assistencia; ao menos um responsável). `409 SCHEDULE_CONFLICT` se algum responsável estiver ocupado | ✅ |
| 30 | `PUT /api/programacoes/{id}/reordenar` | Administrador, Engenharia | Reordena com propagação em dias úteis | ✅ |
| 31 | `GET /api/obras/{id}/custos` | Administrador, Financeiro | Itens de custo e precificação | ⏳ |
| 32 | `POST /api/obras/{id}/custos` | Financeiro | Registra custos e valor da obra | ⏳ |
| 33 | `GET /api/obras/{id}/relatorio-custo` | Administrador, Financeiro | Custo total e itens (só obra concluída com precificação completa) | ⏳ |
| 34 | `GET /api/obras/{id}/dre` | Administrador, Financeiro | DRE da obra (custo, valor, resultado) | ⏳ |
| 35 | `GET /api/relatorios/export` | Administrador, Financeiro | Exporta `tipo` (financeiro, cronograma), `dataInicio`, `dataFim`, `formato` (pdf ou xlsx) | ⏳ |
| 36 | `GET /api/obras/{id}/instalacao/export` | Administrador | Exporta detalhes da instalação | ⏳ |
| 37 | `GET /api/instalador/instalacoes` | InstaladorCampo | Instalações das obras em que o usuário é responsável | ⏳ |
| 38 | `GET /api/instalador/instalacoes/{obraId}` | InstaladorCampo | Detalhe: kit, endereço, projeto, instruções, `linkNavegacao` | ⏳ |
| 39 | `GET /api/instalador/manutencoes` | InstaladorCampo | Manutenções das obras em que o usuário é responsável | ⏳ |
| 40 | `PATCH /api/manutencoes/{id}/concluir` | InstaladorCampo | Conclui manutenção | ⏳ |
| 41 | `POST /api/manutencoes/{id}/comentarios` | InstaladorCampo | Comenta manutenção | ⏳ |
| 42 | `POST /api/cronograma/compartilhado` | Administrador, Engenharia | Gera token de cronograma compartilhado | ⏳ |
| 43 | `GET /api/cronograma/compartilhado/{token}` | Público por token | Cronograma somente leitura, sem dados financeiros ou de usuários | ⏳ |

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
  "usuario": { "id": 12, "nome": "Ana Souza", "email": "engenharia@zlengenharia.com", "perfil": "Engenharia" }
}
```

### Mover cartão

Requisição:

```json
{ "statusNovo": "EmAndamento", "observacao": "Responsável iniciou instalação" }
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

### Definir responsáveis

Requisição (`PUT /api/obras/{id}/responsaveis`):

```json
{ "responsaveisIds": [12, 15] }
```

Resposta `200`:

```json
{
  "obraId": 301,
  "responsaveis": [
    { "id": 12, "nome": "Ana Souza", "perfil": "Engenharia" },
    { "id": 15, "nome": "Bruno Lima", "perfil": "InstaladorCampo" }
  ]
}
```

### Programar obra

Requisição (`POST /api/programacoes`):

```json
{ "obraId": 301, "dataInicio": "2026-10-19", "prioridade": 1 }
```

Resposta `201`:

```json
{
  "id": 601,
  "obraId": 301,
  "responsaveis": [{ "id": 12, "nome": "Ana Souza" }],
  "dataInicio": "2026-10-19",
  "dataFim": "2026-10-21",
  "duracaoEstimadaDias": 2.5,
  "prioridade": 1
}
```

Conflito: `409 SCHEDULE_CONFLICT`, com o nome do responsável ocupado e o período ocupado na mensagem.

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

## Alteração de senha autenticada

A resposta reflete o estado real: sucesso (`200`) ou falha (`400`), nunca os dois. Em falha, a senha anterior continua válida e nenhum token é invalidado. A mensagem de falha não sugere solicitar novo link, pois esse fluxo é exclusivo da redefinição por e-mail (RF-21).
