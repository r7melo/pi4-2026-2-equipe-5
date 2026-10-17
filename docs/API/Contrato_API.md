# Contrato de API — Sistema de Gestão de Obras (ZL Engenharia)

## 1. Objetivo

Este documento define o contrato de comunicação entre o **frontend** (React + TypeScript) e o **backend** (ASP.NET Core Web API) do sistema de gestão de obras de energia solar. As rotas abaixo foram derivadas dos casos de uso, dos requisitos funcionais (`RF-01` a `RF-20`) e das regras de negócio definidos pela equipe de Requisitos, e os campos de entrada/saída seguem as entidades do modelo de dados do projeto.

Documentos de referência (`docs/Requisitos/`):
- `02-requisitos.md` — RF-01 a RF-20, RNF-01 a RNF-08
- `03-casos-de-uso.md` — casos de uso
- `04-regras-negocio.md` — RN-01 a RN-05, transições de status e matriz de permissões
- `06-modelo-dados.md` — entidades `cliente`, `perfil_acesso`, `usuario`, `equipe`, `equipe_instalador`, `obra`, `pagamento`, `material`, `programacao_obra`, `comentario`, `historico_obra`, `relatorio_custo`, `manutencao`, `audit_log`
- `07-api.md` — resumo das rotas e contratos principais (este documento é o detalhamento completo)

## 2. Convenções gerais

| Aspecto | Convenção |
|---|---|
| Base URL | `/api` |
| Autenticação | Header `Authorization: Bearer <token>` (JWT), obtido via `POST /api/auth/login`. Expiração configurável por `JWT_EXPIRES_MINUTES` |
| Formato de payload | `application/json`, chaves em **camelCase** (padrão de serialização do ASP.NET Core) |
| Datas | ISO 8601 (`yyyy-MM-ddTHH:mm:ssZ` para `DateTime`, `yyyy-MM-dd` para `Date`) |
| Paginação (listagens) | Query params `page` (default 1) e `pageSize` (default 20) |
| Erros | Corpo padrão: `{ "error": { "code": "string", "message": "string" } }` |
| Exclusões | `204 No Content` |
| Campos sensíveis | `senha` de `usuario` nunca é retornada |
| Perfis de acesso (RBAC — RF-01, RF-02) | `Administrador`, `EngenhariaObras`, `Financeiro`, `InstaladorCampo` (ver nota sobre nomes de perfil na seção 6) |
| Autorização | Toda rota protegida valida token e perfil **no servidor**. Sem token: `401`. Perfil sem permissão: `403`. Ambos geram registro em `audit_log` (RF-02, RNF-03) |
| Auditoria | Mudança de status, exclusão e alteração financeira gravam `audit_log` na mesma transação da operação (RNF-04) |

### 2.1 Códigos de erro

Todo erro retorna o corpo padrão `{ "error": { "code": "...", "message": "..." } }`, com `message` em português explicando o que corrigir. Detalhes técnicos de erros `500` ficam apenas no log.

| HTTP | `code` | Quando ocorre |
|---|---|---|
| 400 | `INVALID_BODY` | Corpo ausente, JSON malformado ou campo com tipo/formato errado (a mensagem informa o campo) |
| 400 | `INVALID_PARAMETER` | Query param inválido (ex.: `page=0`, `page=abc`) |
| 400 | `VALIDATION_ERROR` | Regra de negócio violada (ex.: `dataFimEstimada` anterior a `dataInicioEstimada`, `quantidadePaineis` ≤ 0, comentário vazio, obra em execução não pode ser excluída) |
| 400 | `MISSING_STATUS` | `statusNovo` não informado ao mover card |
| 400 | `INVALID_STATUS` | Status de obra inexistente (a mensagem lista os valores aceitos) |
| 400 | `INVALID_STATUS_TRANSITION` | Transição não permitida no funil (a mensagem lista as próximas etapas permitidas) |
| 400 | `INVALID_STATUS_LOGISTICO` | Status logístico de material inexistente |
| 401 | `INVALID_CREDENTIALS` | E-mail ou senha inválidos no login (mensagem genérica, sem indicar qual campo) |
| 401 | `UNAUTHORIZED` | Token ausente, inválido ou expirado |
| 403 | `ACCESS_DENIED` | Perfil sem permissão para a ação |
| 404 | `OBRA_NOT_FOUND` | Obra informada na rota não existe (ou foi excluída) |
| 404 | `CLIENTE_NOT_FOUND` | Cliente informado não existe |
| 404 | `EQUIPE_NOT_FOUND` | Equipe informada não existe |
| 404 | `USUARIO_NOT_FOUND` | Usuário informado não existe |
| 404 | `MATERIAL_NOT_FOUND` | Material informado não existe |
| 404 | `COMENTARIO_NOT_FOUND` | Comentário informado não existe |
| 404 | `PROGRAMACAO_NOT_FOUND` | Programação informada não existe |
| 404 | `MANUTENCAO_NOT_FOUND` | Manutenção informada não existe (ou não é da equipe do instalador) |
| 404 | `ROUTE_NOT_FOUND` | Rota inexistente (inclui id não numérico, ex.: `/api/obras/abc`) e token de cronograma compartilhado inválido ou expirado |
| 405 | `METHOD_NOT_ALLOWED` | Método HTTP não suportado pela rota |
| 409 | `SCHEDULE_CONFLICT` | Equipe já alocada no período (a mensagem informa o período ocupado) |
| 409 | `EMAIL_ALREADY_EXISTS` | E-mail já cadastrado para outro usuário |
| 409 | `CPF_CNPJ_ALREADY_EXISTS` | CPF/CNPJ já cadastrado para outro cliente |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Corpo enviado sem `Content-Type: application/json` |
| 423 | `ACCOUNT_LOCKED` | Conta bloqueada temporariamente após 5 falhas consecutivas de login |
| 500 | `INTERNAL_ERROR` | Erro inesperado no servidor |

**Transições válidas do funil (rota #11):** `MaterialComprado → NoDeposito → Separado → EmAndamento → Concluido`; `EmAndamento → Assistencia`; `Concluido → Assistencia`; `Assistencia → EmAndamento`. Mudar para o status atual também é recusado.

> **Rastreabilidade de campos:** os atributos de cada JSON abaixo correspondem às colunas do modelo de dados, convertidas de `snake_case` para `camelCase` (ex.: `data_inicio_estimada` → `dataInicioEstimada`, `id_cliente` → `clienteId`).

## 3. Tabela-resumo das rotas

| # | Método | Caminho | Descrição | Perfis | RF | Entidade(s) |
|---|---|---|---|---|---|---|
| 1 | POST | `/api/auth/login` | Autenticar usuário e emitir JWT | Público | RF-01 | usuario |
| 2 | GET | `/api/auth/me` | Usuário logado, perfil e permissões | Autenticado | RF-01, RF-02 | usuario, perfil_acesso |
| 3 | POST | `/api/usuarios` | Cadastrar usuário de qualquer perfil | Administrador | RF-01 | usuario, equipe_instalador |
| 4 | GET | `/api/clientes` | Listar clientes | Administrador, Engenharia | RF-03 | cliente |
| 5 | POST | `/api/clientes` | Cadastrar cliente | Administrador, Engenharia | RF-03 | cliente |
| 6 | GET | `/api/obras` | Listar obras (filtros `status`, `clienteNome`, `categoria`) | Administrador, Engenharia, Financeiro | RF-04 | obra, cliente |
| 7 | POST | `/api/obras` | Cadastrar obra vinculada a cliente | Administrador, Engenharia | RF-03 | obra, cliente, pagamento, historico_obra |
| 8 | GET | `/api/obras/{id}` | Detalhar obra | Administrador, Engenharia, Financeiro; Instalador se da equipe | RF-03 | obra, cliente, pagamento |
| 9 | PUT | `/api/obras/{id}` | Editar dados da obra/contrato | Administrador, Engenharia | RF-03 | obra, pagamento |
| 10 | DELETE | `/api/obras/{id}` | Exclusão lógica | Administrador, Engenharia | RF-03 | obra, programacao_obra, audit_log |
| 11 | PATCH | `/api/obras/{id}/status` | Mover card entre etapas do funil | Administrador, Engenharia | RF-04, RF-10, RF-13 | obra, historico_obra, audit_log |
| 12 | GET | `/api/obras/{id}/materiais` | Listar materiais da obra | Autenticado (Instalador só da equipe) | RF-06 | material |
| 13 | POST | `/api/obras/{id}/materiais` | Registrar material/lote | Administrador, Engenharia | RF-06 | material |
| 14 | PATCH | `/api/materiais/{id}` | Atualizar status logístico | Administrador, Engenharia | RF-06 | material |
| 15 | GET | `/api/obras/{id}/historico` | Timeline cronológica da obra | Administrador, Engenharia, Financeiro | RF-11 | historico_obra |
| 16 | GET | `/api/obras/{id}/comentarios` | Listar comentários | Autenticado | RF-11 | comentario |
| 17 | POST | `/api/obras/{id}/comentarios` | Criar comentário | Administrador, Engenharia (cartão); Financeiro (timeline) | RF-04, RF-11 | comentario, historico_obra |
| 18 | PUT | `/api/comentarios/{id}` | Editar comentário geral | Administrador | RF-12 | comentario, audit_log |
| 19 | DELETE | `/api/comentarios/{id}` | Excluir comentário geral | Administrador | RF-12 | comentario, audit_log |
| 20 | GET | `/api/equipes` | Listar equipes | Autenticado | RF-07 | equipe, equipe_instalador |
| 21 | POST | `/api/equipes` | Criar equipe com instaladores e responsável | Administrador, Engenharia | RF-07 | equipe, equipe_instalador |
| 22 | GET | `/api/programacoes` | Cronograma consolidado (visão Gantt) | Autenticado | RF-07, RF-08 | programacao_obra |
| 23 | POST | `/api/programacoes` | Alocar equipe a uma obra | Administrador, Engenharia | RF-07, RF-08, RF-10 | programacao_obra |
| 24 | PUT | `/api/programacoes/{id}/reordenar` | Reordenar com propagação de atrasos | Administrador, Engenharia | RF-09 | programacao_obra |
| 25 | GET | `/api/obras/{id}/custos` | Itens de custo e precificação da obra | Administrador, Financeiro | RF-14 | relatorio_custo, material |
| 26 | POST | `/api/obras/{id}/custos` | Registrar custos e valor da obra | Financeiro | RF-14 | relatorio_custo, historico_obra, audit_log |
| 27 | GET | `/api/obras/{id}/relatorio-custo` | Custo total e itens (só obra concluída) | Administrador, Financeiro | RF-14 | relatorio_custo, material |
| 28 | GET | `/api/obras/{id}/dre` | DRE da obra | Administrador, Financeiro | RF-20 | relatorio_custo |
| 29 | GET | `/api/relatorios/export` | Exportar relatório financeiro ou cronograma em PDF/Excel | Administrador, Financeiro | RF-15 | relatorio_custo, programacao_obra |
| 30 | GET | `/api/obras/{id}/instalacao/export` | Exportar detalhes da instalação | Administrador | RF-15 | obra, material, programacao_obra |
| 31 | GET | `/api/instalador/instalacoes` | Instalações da equipe do usuário | InstaladorCampo | RF-19 | programacao_obra, obra |
| 32 | GET | `/api/instalador/instalacoes/{obraId}` | Detalhe: kit, endereço, projeto, instruções, link de navegação | InstaladorCampo | RF-19 | obra, material |
| 33 | GET | `/api/instalador/manutencoes` | Manutenções da equipe | InstaladorCampo | RF-05, RF-19 | manutencao |
| 34 | PATCH | `/api/manutencoes/{id}/concluir` | Concluir manutenção | InstaladorCampo | RF-05 | manutencao, historico_obra |
| 35 | POST | `/api/manutencoes/{id}/comentarios` | Comentar manutenção | InstaladorCampo | RF-05 | comentario |
| 36 | POST | `/api/cronograma/compartilhado` | Gerar token de cronograma compartilhado | Administrador, Engenharia | RF-16 | — |
| 37 | GET | `/api/cronograma/compartilhado/{token}` | Cronograma público somente leitura | Público por token | RF-16 | programacao_obra (agregado) |

Na coluna **Perfis**, "Engenharia" é o perfil `EngenhariaObras`.

---

## 4. Detalhamento das rotas

### 4.1 Autenticação e usuários (RF-01, RF-02)

#### 1. `POST /api/auth/login`
- **Descrição:** Autentica o usuário e retorna um token JWT com o perfil. Senhas são comparadas com o hash bcrypt. Login válido zera o contador de falhas; cinco falhas consecutivas bloqueiam a conta temporariamente. (RF-01)
- **Perfis:** Público (não autenticado)
- **Entrada:**
```json
{
  "email": "engenharia@zlengenharia.com",
  "senha": "SenhaForte123"
}
```
- **Saída (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-09-21T03:00:00Z",
  "usuario": {
    "id": 12,
    "nome": "Ana Souza",
    "email": "engenharia@zlengenharia.com",
    "perfil": "EngenhariaObras",
    "equipeId": 3
  }
}
```
- **Erros:** `401 INVALID_CREDENTIALS` (mensagem "E-mail ou senha incorretos"), `423 ACCOUNT_LOCKED`.

#### 2. `GET /api/auth/me`
- **Descrição:** Retorna o usuário autenticado e seu perfil de acesso, para o frontend aplicar RBAC na UI. (RF-01, RF-02)
- **Perfis:** Qualquer usuário autenticado
- **Entrada:** nenhuma (usa token do header)
- **Saída (200):**
```json
{
  "id": 12,
  "nome": "Ana Souza",
  "email": "engenharia@zlengenharia.com",
  "perfil": {
    "id": 2,
    "nomePerfil": "EngenhariaObras",
    "permissoes": ["obras:criar", "obras:mover", "programacoes:editar"]
  },
  "equipeId": 3
}
```
- **Erros:** `401 UNAUTHORIZED`.

#### 3. `POST /api/usuarios`
- **Descrição:** Cadastra um usuário de qualquer perfil. A senha é gravada somente como hash bcrypt. Para `InstaladorCampo`, `equipeId` é obrigatório. (RF-01)
- **Perfis:** `Administrador`
- **Entrada:**
```json
{
  "nome": "Carlos Lima",
  "email": "carlos@zl.com.br",
  "senha": "SenhaInicial123",
  "perfil": "InstaladorCampo",
  "equipeId": 3
}
```
- **Saída (201):**
```json
{
  "id": 15,
  "nome": "Carlos Lima",
  "email": "carlos@zl.com.br",
  "perfil": "InstaladorCampo",
  "equipeId": 3,
  "ativo": true
}
```
- **Erros:** `400 VALIDATION_ERROR` (perfil inexistente, instalador sem equipe), `404 EQUIPE_NOT_FOUND`, `409 EMAIL_ALREADY_EXISTS`, `403 ACCESS_DENIED`.

---

### 4.2 Clientes (RF-03)

#### 4. `GET /api/clientes`
- **Descrição:** Lista os clientes cadastrados, usada para vincular o cliente na tela de obra.
- **Perfis:** `Administrador`, `EngenhariaObras`
- **Query params:** `nome` (busca textual), `page`, `pageSize`
- **Saída (200):**
```json
{
  "page": 1,
  "pageSize": 20,
  "total": 1,
  "itens": [
    {
      "id": 45,
      "nome": "Rede Alfa Supermercados",
      "cpfCnpj": "12.345.678/0001-90",
      "cidade": "Campinas",
      "endereco": "Av. das Palmeiras, 500",
      "telefone": "(19) 99999-0000",
      "email": "contato@redealfa.com.br"
    }
  ]
}
```

#### 5. `POST /api/clientes`
- **Descrição:** Cadastra um cliente. Nome e CPF/CNPJ são obrigatórios; CPF/CNPJ é único. (RF-03)
- **Perfis:** `Administrador`, `EngenhariaObras`
- **Entrada:**
```json
{
  "nome": "Rede Alfa Supermercados",
  "cpfCnpj": "12.345.678/0001-90",
  "cidade": "Campinas",
  "endereco": "Av. das Palmeiras, 500",
  "telefone": "(19) 99999-0000",
  "email": "contato@redealfa.com.br",
  "dadosContrato": null
}
```
- **Saída (201):** o cliente criado, no mesmo formato de um item de `GET /api/clientes`.
- **Erros:** `400 VALIDATION_ERROR` (nome ou CPF/CNPJ ausente), `409 CPF_CNPJ_ALREADY_EXISTS`, `403 ACCESS_DENIED`.

---

### 4.3 Obras (RF-03, RF-04)

#### 6. `GET /api/obras`
- **Descrição:** Lista obras com filtros, usada para montar as colunas do Kanban e a busca por obra/cliente. Obras excluídas (`excluidaEm` preenchido) não aparecem. (RF-04)
- **Perfis:** `Administrador`, `EngenhariaObras`, `Financeiro`
- **Query params:** `status` (`MaterialComprado`, `NoDeposito`, `Separado`, `EmAndamento`, `Concluido`, `Assistencia`), `clienteNome` (busca textual), `categoria` (`Residencial`, `Comercial`), `page`, `pageSize`
- **Saída (200):**
```json
{
  "page": 1,
  "pageSize": 20,
  "total": 12,
  "itens": [
    {
      "id": 301,
      "status": "MaterialComprado",
      "clienteNome": "Rede Alfa Supermercados",
      "categoria": "Comercial",
      "quantidadePaineis": 45,
      "dataFimEstimada": "2026-10-06"
    }
  ]
}
```
- **Erros:** `400 INVALID_STATUS`, `400 INVALID_PARAMETER`.

#### 7. `POST /api/obras`
- **Descrição:** Cadastra uma nova obra vinculada a um cliente. O cliente é escolhido entre os cadastrados (`clienteId`) ou criado junto com a obra (`cliente`). A obra nasce em `MaterialComprado` (primeira coluna do Kanban) e a ação é registrada na timeline. (RF-03)
- **Perfis:** `Administrador`, `EngenhariaObras`
- **Entrada:** informar **ou** `clienteId` **ou** `cliente`.
```json
{
  "clienteId": 45,
  "cliente": null,
  "categoria": "Comercial",
  "quantidadePaineis": 45,
  "quantidadeInversores": 2,
  "endereco": "Av. das Palmeiras, 500 - Campinas/SP",
  "descricao": "Telhado metálico, acesso pela doca.",
  "dataInicioEstimada": "2026-10-01",
  "dataFimEstimada": "2026-10-06",
  "pagamento": {
    "dataConfirmacao": "2026-09-15",
    "prazoContratualDias": 45
  }
}
```
Para criar o cliente junto, `cliente` segue o formato da entrada de `POST /api/clientes` (nome e `cpfCnpj` obrigatórios).
- **Saída (201):**
```json
{
  "id": 301,
  "status": "MaterialComprado",
  "clienteId": 45,
  "categoria": "Comercial",
  "quantidadePaineis": 45,
  "quantidadeInversores": 2,
  "endereco": "Av. das Palmeiras, 500 - Campinas/SP",
  "dataInicioEstimada": "2026-10-01",
  "dataFimEstimada": "2026-10-06",
  "dataInicioReal": null,
  "dataFimReal": null,
  "criadoEm": "2026-09-20T14:32:00Z"
}
```
- **Erros:** `400 VALIDATION_ERROR` (`quantidadePaineis` ≤ 0, datas fora de ordem, categoria inválida, sem cliente), `404 CLIENTE_NOT_FOUND`, `409 CPF_CNPJ_ALREADY_EXISTS`, `403 ACCESS_DENIED`.

#### 8. `GET /api/obras/{id}`
- **Descrição:** Detalhe completo de uma obra (dados de contrato e pagamento).
- **Perfis:** `Administrador`, `EngenhariaObras`, `Financeiro`; `InstaladorCampo` somente se a obra estiver programada para a equipe dele
- **Saída (200):**
```json
{
  "id": 301,
  "status": "MaterialComprado",
  "categoria": "Comercial",
  "quantidadePaineis": 45,
  "quantidadeInversores": 2,
  "endereco": "Av. das Palmeiras, 500 - Campinas/SP",
  "descricao": "Telhado metálico, acesso pela doca.",
  "dataInicioEstimada": "2026-10-01",
  "dataFimEstimada": "2026-10-06",
  "dataInicioReal": null,
  "dataFimReal": null,
  "cliente": {
    "id": 45,
    "nome": "Rede Alfa Supermercados",
    "cidade": "Campinas"
  },
  "pagamento": {
    "id": 88,
    "dataConfirmacao": "2026-09-15",
    "prazoContratualDias": 45
  }
}
```
- **Erros:** `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 9. `PUT /api/obras/{id}`
- **Descrição:** Edita dados da obra/contrato. Campos omitidos mantêm o valor atual. O status não é alterado por esta rota (use a rota #11). (RF-03)
- **Perfis:** `Administrador`, `EngenhariaObras`
- **Entrada:**
```json
{
  "categoria": "Comercial",
  "quantidadePaineis": 48,
  "quantidadeInversores": 2,
  "endereco": "Av. das Palmeiras, 500 - Campinas/SP",
  "descricao": "Telhado metálico, acesso pela doca.",
  "dataInicioEstimada": "2026-10-02",
  "dataFimEstimada": "2026-10-07",
  "pagamento": {
    "dataConfirmacao": "2026-09-15",
    "prazoContratualDias": 60
  }
}
```
- **Saída (200):** mesmo formato de `GET /api/obras/{id}`.
- **Erros:** `400 VALIDATION_ERROR`, `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 10. `DELETE /api/obras/{id}`
- **Descrição:** Exclusão lógica da obra: preenche `excluidaEm`, tira a obra das listagens, do Kanban e do Gantt (remove as programações futuras) e grava `audit_log`. Histórico, comentários e custos são preservados. Obra em execução (`EmAndamento`) não pode ser excluída. (RF-03)
- **Perfis:** `Administrador`, `EngenhariaObras`
- **Saída:** `204 No Content`
- **Erros:** `400 VALIDATION_ERROR` (obra em execução), `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 11. `PATCH /api/obras/{id}/status`
- **Descrição:** Move o card da obra entre as etapas do funil Kanban. Na mesma transação, atualiza a obra e grava `historico_obra` e `audit_log`. Se o novo status for `Concluido`, dispara o e-mail de conclusão de forma assíncrona; falha no envio não reverte a mudança. (RF-04, RF-10, RF-13)
- **Perfis:** `Administrador`, `EngenhariaObras`
- **Entrada:**
```json
{
  "statusNovo": "EmAndamento",
  "observacao": "Equipe iniciou instalação hoje"
}
```
- **Saída (200):**
```json
{
  "id": 301,
  "statusAnterior": "Separado",
  "statusNovo": "EmAndamento",
  "dataAlteracao": "2026-09-20T15:10:00Z",
  "emailNotificacaoEnviado": false
}
```
- **Erros:** `400 MISSING_STATUS`, `400 INVALID_STATUS`, `400 INVALID_STATUS_TRANSITION` (inclui status igual ao atual), `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

---

### 4.4 Materiais (RF-06)

#### 12. `GET /api/obras/{id}/materiais`
- **Descrição:** Lista os materiais vinculados à obra e sua situação logística.
- **Perfis:** Todos os perfis autenticados (`InstaladorCampo` somente para obras da própria equipe)
- **Saída (200):**
```json
[
  { "id": 501, "tipo": "Painel Solar 550W", "quantidade": 45, "quantidadeUtilizada": null, "custoUnitario": 780.00, "statusLogistico": "EmTransito" },
  { "id": 502, "tipo": "Inversor 5kW", "quantidade": 2, "quantidadeUtilizada": null, "custoUnitario": 6200.00, "statusLogistico": "Disponivel" }
]
```
- **Erros:** `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 13. `POST /api/obras/{id}/materiais`
- **Descrição:** Registra um novo material/lote para a obra.
- **Perfis:** `Administrador`, `EngenhariaObras`
- **Entrada:**
```json
{
  "tipo": "Cabo Solar 6mm",
  "quantidade": 200,
  "custoUnitario": 4.50,
  "statusLogistico": "Comprado"
}
```
- **Saída (201):**
```json
{ "id": 503, "tipo": "Cabo Solar 6mm", "quantidade": 200, "quantidadeUtilizada": null, "custoUnitario": 4.50, "statusLogistico": "Comprado", "obraId": 301 }
```
- **Erros:** `400 VALIDATION_ERROR` (tipo vazio, quantidade negativa), `400 INVALID_STATUS_LOGISTICO`, `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 14. `PATCH /api/materiais/{id}`
- **Descrição:** Atualiza o status logístico do material e, quando consumido, a quantidade utilizada (usada no balanço de materiais do custo total). (RF-06)
- **Perfis:** `Administrador`, `EngenhariaObras`
- **Entrada:**
```json
{
  "statusLogistico": "Utilizado",
  "quantidadeUtilizada": 180
}
```
- **Saída (200):** o material atualizado, no mesmo formato da rota #13.
- **Erros:** `400 INVALID_STATUS_LOGISTICO`, `400 VALIDATION_ERROR` (`quantidadeUtilizada` negativa ou maior que `quantidade`), `404 MATERIAL_NOT_FOUND`, `403 ACCESS_DENIED`.

---

### 4.5 Histórico e Comentários (RF-11, RF-12)

#### 15. `GET /api/obras/{id}/historico`
- **Descrição:** Timeline cronológica das ações da obra. Os registros são imutáveis (somente INSERT). Ações registradas: `Cadastro`, `MudancaStatus`, `Comentario`, `ManutencaoConcluida`, `AlteracaoFinanceira`. (RF-11, RF-12)
- **Perfis:** `Administrador`, `EngenhariaObras`, `Financeiro`
- **Saída (200):**
```json
[
  {
    "id": 9001,
    "obraId": 301,
    "tipoAcao": "MudancaStatus",
    "statusAnterior": "Separado",
    "statusNovo": "EmAndamento",
    "dataAlteracao": "2026-09-20T15:10:00Z",
    "observacao": "Equipe iniciou instalação hoje",
    "usuario": { "id": 12, "nome": "Ana Souza" }
  }
]
```
- **Erros:** `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 16. `GET /api/obras/{id}/comentarios`
- **Descrição:** Lista os comentários vinculados à obra.
- **Perfis:** Todos os perfis autenticados
- **Query params:** `tipo` (`Cartao`, `Manutencao`, `Timeline`), opcional
- **Saída (200):**
```json
[
  {
    "id": 701,
    "tipo": "Cartao",
    "descricao": "Cliente confirmou acesso ao telhado para amanhã.",
    "dataRegistro": "2026-09-20T15:20:00Z",
    "usuario": { "id": 12, "nome": "Ana Souza" }
  }
]
```
- **Erros:** `404 OBRA_NOT_FOUND`.

#### 17. `POST /api/obras/{id}/comentarios`
- **Descrição:** Cria um comentário na obra e registra a ação na timeline. Comentário vazio é recusado. `Administrador` e `EngenhariaObras` comentam no cartão (`Cartao`) ou na timeline; `Financeiro` comenta somente na timeline (`Timeline`). (RF-04, RF-11)
- **Perfis:** `Administrador`, `EngenhariaObras`, `Financeiro`
- **Entrada:**
```json
{ "tipo": "Cartao", "descricao": "Cliente confirmou acesso ao telhado para amanhã." }
```
- **Saída (201):** o comentário criado, no mesmo formato de um item da rota #16.
- **Erros:** `400 VALIDATION_ERROR` (descrição vazia, tipo inválido), `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 18. `PUT /api/comentarios/{id}`
- **Descrição:** Edita um comentário geral. A edição gera `audit_log`. (RF-12)
- **Perfis:** `Administrador`
- **Entrada:**
```json
{ "descricao": "Cliente confirmou acesso ao telhado para quinta-feira." }
```
- **Saída (200):** o comentário atualizado, no mesmo formato de um item da rota #16.
- **Erros:** `400 VALIDATION_ERROR` (descrição vazia), `404 COMENTARIO_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 19. `DELETE /api/comentarios/{id}`
- **Descrição:** Exclui um comentário geral. A exclusão gera `audit_log`. Registros automáticos da timeline (`historico_obra`) não podem ser excluídos por nenhum perfil. (RF-12)
- **Perfis:** `Administrador`
- **Saída:** `204 No Content`
- **Erros:** `404 COMENTARIO_NOT_FOUND`, `403 ACCESS_DENIED`.

---

### 4.6 Equipes e Cronograma / Gantt (RF-07 a RF-10)

#### 20. `GET /api/equipes`
- **Descrição:** Lista as equipes de instalação, usadas na alocação do Gantt. Quando `dataInicio` e `dataFim` são informados, cada equipe indica se está ocupada no período. (RF-07)
- **Perfis:** Todos os perfis autenticados
- **Query params:** `dataInicio`, `dataFim` (opcionais)
- **Saída (200):**
```json
[
  {
    "id": 3,
    "nome": "Equipe Sul",
    "especialidade": "Instalação Residencial",
    "responsavel": { "id": 15, "nome": "Carlos Lima" },
    "instaladores": [
      { "id": 15, "nome": "Carlos Lima" },
      { "id": 16, "nome": "Bruno Alves" }
    ],
    "ocupada": false
  }
]
```
- **Erros:** `400 INVALID_PARAMETER`.

#### 21. `POST /api/equipes`
- **Descrição:** Cria uma equipe com ao menos um instalador e um responsável, que deve estar entre os instaladores. Os instaladores precisam ter o perfil `InstaladorCampo`. (RF-07)
- **Perfis:** `Administrador`, `EngenhariaObras`
- **Entrada:**
```json
{
  "nome": "Equipe Sul",
  "especialidade": "Instalação Residencial",
  "instaladoresIds": [15, 16],
  "responsavelId": 15
}
```
- **Saída (201):** a equipe criada, no mesmo formato de um item da rota #20 (sem `ocupada`).
- **Erros:** `400 VALIDATION_ERROR` (sem instaladores, responsável fora da lista, usuário que não é instalador), `404 USUARIO_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 22. `GET /api/programacoes`
- **Descrição:** Retorna o cronograma consolidado (visão Gantt) com as alocações de equipe por obra. Obras excluídas não aparecem. (RF-07, RF-08)
- **Perfis:** Todos os perfis autenticados (`InstaladorCampo` vê só a própria equipe)
- **Query params:** `dataInicio`, `dataFim`, `equipeId` (opcionais)
- **Saída (200):**
```json
[
  {
    "id": 601,
    "obraId": 301,
    "equipeId": 3,
    "dataInicio": "2026-10-01",
    "dataFim": "2026-10-03",
    "prioridade": 1,
    "duracaoEstimadaDias": 2.5
  }
]
```
- **Erros:** `400 INVALID_PARAMETER`.

#### 23. `POST /api/programacoes`
- **Descrição:** Aloca uma equipe a uma obra a partir de `dataInicio`. O backend calcula a duração pela quantidade de painéis (padrão 9 painéis por dia, RN-01) e a data de término em dias úteis, contando o início como primeiro dia (RN-02). A obra precisa estar apta (materiais separados) e a equipe não pode ter outra alocação no período. Alocar atualiza o status da obra e o Kanban (RF-10). (RF-07, RF-08)
- **Perfis:** `Administrador`, `EngenhariaObras`
- **Entrada:**
```json
{ "obraId": 301, "equipeId": 3, "dataInicio": "2026-10-01", "prioridade": 1 }
```
- **Saída (201):**
```json
{
  "id": 601,
  "obraId": 301,
  "equipeId": 3,
  "dataInicio": "2026-10-01",
  "dataFim": "2026-10-03",
  "duracaoEstimadaDias": 2.5,
  "prioridade": 1
}
```
- **Erros:** `400 VALIDATION_ERROR` (obra não apta, obra sem quantidade de painéis, início em fim de semana), `404 OBRA_NOT_FOUND`, `404 EQUIPE_NOT_FOUND`, `409 SCHEDULE_CONFLICT`, `403 ACCESS_DENIED`.

#### 24. `PUT /api/programacoes/{id}/reordenar`
- **Descrição:** Reordena manualmente uma alocação no Gantt, propagando o deslocamento em dias úteis para as alocações seguintes da mesma equipe, na ordem de prioridade. O horário de cada tarefa é preservado. (RF-09)
- **Perfis:** `Administrador`, `EngenhariaObras`
- **Entrada:**
```json
{ "novaDataInicio": "2026-10-05" }
```
- **Saída (200):**
```json
{
  "id": 601,
  "novaDataInicio": "2026-10-05",
  "novaDataFim": "2026-10-07",
  "programacoesAfetadas": [
    { "id": 602, "novaDataInicio": "2026-10-08", "novaDataFim": "2026-10-09" }
  ]
}
```
- **Erros:** `400 VALIDATION_ERROR`, `404 PROGRAMACAO_NOT_FOUND`, `409 SCHEDULE_CONFLICT`, `403 ACCESS_DENIED`.

---

### 4.7 Financeiro (RF-14, RF-15, RF-20)

#### 25. `GET /api/obras/{id}/custos`
- **Descrição:** Retorna a precificação registrada da obra (mão de obra, insumos e valor cobrado) e os materiais com custo unitário. Indica se a precificação está completa. (RF-14)
- **Perfis:** `Administrador`, `Financeiro`
- **Saída (200):**
```json
{
  "obraId": 301,
  "custoMaoObra": 8500.00,
  "custoInsumos": 21300.50,
  "valorObra": 38000.00,
  "precificacaoCompleta": true,
  "materiais": [
    { "id": 501, "tipo": "Painel Solar 550W", "quantidade": 45, "custoUnitario": 780.00 }
  ]
}
```
- **Erros:** `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 26. `POST /api/obras/{id}/custos`
- **Descrição:** Registra ou atualiza os custos e o valor da obra. Toda criação ou alteração grava `historico_obra` (`AlteracaoFinanceira`) e `audit_log` com usuário e timestamp. Campos omitidos mantêm o valor atual. (RF-14)
- **Perfis:** `Financeiro`
- **Entrada:**
```json
{
  "custoMaoObra": 8500.00,
  "custoInsumos": 21300.50,
  "valorObra": 38000.00
}
```
- **Saída (200):** mesmo formato de `GET /api/obras/{id}/custos`.
- **Erros:** `400 VALIDATION_ERROR` (valor negativo), `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 27. `GET /api/obras/{id}/relatorio-custo`
- **Descrição:** Custo total da obra (soma dos itens de custo) com o balanço de materiais. Só é apurado para obras `Concluido` com precificação completa. (RF-14, RN-03)
- **Perfis:** `Administrador`, `Financeiro`
- **Saída (200):**
```json
{
  "obraId": 301,
  "custoMaoObra": 8500.00,
  "custoInsumos": 21300.50,
  "custoTotal": 29800.50,
  "balancoMateriais": [
    { "tipo": "Cabo Solar 6mm", "quantidadeUtilizada": 180, "quantidadeComprada": 200 }
  ]
}
```
- **Erros:** `400 VALIDATION_ERROR` (obra não concluída ou sem precificação completa, com o motivo na mensagem), `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 28. `GET /api/obras/{id}/dre`
- **Descrição:** DRE da obra: valor da obra, custo total e resultado (valor da obra menos custo total). Só para obras `Concluido` com precificação completa. (RF-20, RN-03)
- **Perfis:** `Administrador`, `Financeiro`
- **Saída (200):**
```json
{
  "obraId": 301,
  "valorObra": 38000.00,
  "custoMaoObra": 8500.00,
  "custoInsumos": 21300.50,
  "custoTotal": 29800.50,
  "resultado": 8199.50
}
```
- **Erros:** `400 VALIDATION_ERROR` (obra não concluída ou sem precificação completa), `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 29. `GET /api/relatorios/export`
- **Descrição:** Exporta relatório financeiro ou o cronograma em PDF ou Excel, filtrado por período. Até 1.000 registros em no máximo 5 segundos (RNF-05). (RF-15)
- **Perfis:** `Administrador`, `Financeiro`
- **Query params:** `tipo` (`financeiro` | `cronograma`), `dataInicio`, `dataFim`, `formato` (`pdf` | `xlsx`)
- **Saída (200):** arquivo binário (`Content-Type: application/pdf` ou `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`), sem corpo JSON.
- **Erros:** `400 INVALID_PARAMETER`, `403 ACCESS_DENIED`.

#### 30. `GET /api/obras/{id}/instalacao/export`
- **Descrição:** Exporta os detalhes da instalação (kit, endereço, equipe, período e instruções). (RF-15)
- **Perfis:** `Administrador`
- **Query params:** `formato` (`pdf` | `xlsx`)
- **Saída (200):** arquivo binário, como na rota #29.
- **Erros:** `400 INVALID_PARAMETER`, `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

---

### 4.8 Instalador de campo (RF-05, RF-19)

O instalador faz login como qualquer usuário (JWT com perfil `InstaladorCampo`) e só enxerga instalações e manutenções da própria equipe. Não acessa dados financeiros, DRE ou gestão do Kanban (RN-04).

#### 31. `GET /api/instalador/instalacoes`
- **Descrição:** Lista as instalações programadas para a equipe do usuário logado. (RF-19)
- **Perfis:** `InstaladorCampo`
- **Saída (200):**
```json
[
  {
    "obraId": 301,
    "clienteNome": "Rede Alfa Supermercados",
    "endereco": "Av. das Palmeiras, 500 - Campinas/SP",
    "status": "EmAndamento",
    "dataInicio": "2026-10-01",
    "dataFim": "2026-10-03"
  }
]
```
- **Erros:** `403 ACCESS_DENIED`.

#### 32. `GET /api/instalador/instalacoes/{obraId}`
- **Descrição:** Detalhe da instalação: kit de materiais, endereço, projeto, instruções e link para o aplicativo de mapas ("Abrir rota"). (RF-19)
- **Perfis:** `InstaladorCampo` (somente obras da própria equipe)
- **Saída (200):**
```json
{
  "obraId": 301,
  "clienteNome": "Rede Alfa Supermercados",
  "endereco": "Av. das Palmeiras, 500 - Campinas/SP",
  "linkNavegacao": "https://www.google.com/maps/search/?api=1&query=Av.+das+Palmeiras%2C+500+-+Campinas%2FSP",
  "kit": [
    { "tipo": "Painel Solar 550W", "quantidade": 45 },
    { "tipo": "Inversor 5kW", "quantidade": 2 }
  ],
  "projeto": { "arquivo": "projeto-301.pdf" },
  "instrucoes": "Fixar estrutura antes dos painéis."
}
```
- **Erros:** `404 OBRA_NOT_FOUND` (inclui obra de outra equipe), `403 ACCESS_DENIED`.

#### 33. `GET /api/instalador/manutencoes`
- **Descrição:** Lista as manutenções atribuídas à equipe do usuário logado. (RF-05, RF-19)
- **Perfis:** `InstaladorCampo`
- **Query params:** `status` (`Pendente`, `Concluida`), opcional
- **Saída (200):**
```json
[
  {
    "id": 41,
    "obraId": 307,
    "clienteNome": "Padaria Bom Grão",
    "endereco": "Rua XV de Novembro, 120 - Campinas/SP",
    "descricao": "Inversor desligando no fim da tarde.",
    "status": "Pendente",
    "dataConclusao": null
  }
]
```
- **Erros:** `400 INVALID_PARAMETER`, `403 ACCESS_DENIED`.

#### 34. `PATCH /api/manutencoes/{id}/concluir`
- **Descrição:** Conclui a manutenção registrando o serviço executado, altera o status para `Concluida` e grava `historico_obra` (`ManutencaoConcluida`). Outros perfis não concluem manutenção. (RF-05)
- **Perfis:** `InstaladorCampo` (somente manutenções da própria equipe)
- **Entrada:**
```json
{ "servicoExecutado": "Substituído o disjuntor do inversor." }
```
- **Saída (200):**
```json
{ "id": 41, "status": "Concluida", "dataConclusao": "2026-10-10T17:40:00Z" }
```
- **Erros:** `400 VALIDATION_ERROR` (serviço executado vazio, manutenção já concluída), `404 MANUTENCAO_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 35. `POST /api/manutencoes/{id}/comentarios`
- **Descrição:** Comenta uma manutenção. O comentário é opcional, mas quando enviado não pode ser vazio; guarda autor, data e hora. É gravado em `comentario` com tipo `Manutencao`. (RF-05)
- **Perfis:** `InstaladorCampo` (somente manutenções da própria equipe)
- **Entrada:**
```json
{ "descricao": "Cliente pediu para voltar na próxima semana." }
```
- **Saída (201):** o comentário criado, no mesmo formato de um item da rota #16, com `tipo` `Manutencao`.
- **Erros:** `400 VALIDATION_ERROR` (descrição vazia), `404 MANUTENCAO_NOT_FOUND`, `403 ACCESS_DENIED`.

---

### 4.9 Cronograma compartilhado (RF-16)

#### 36. `POST /api/cronograma/compartilhado`
- **Descrição:** Gera um token único para o link público do cronograma. (RF-16)
- **Perfis:** `Administrador`, `EngenhariaObras`
- **Entrada:**
```json
{ "dataInicio": "2026-10-01", "dataFim": "2026-10-31" }
```
- **Saída (201):**
```json
{
  "token": "b7c1e9f04a2d4c3e",
  "url": "/cronograma/compartilhado/b7c1e9f04a2d4c3e",
  "expiraEm": "2026-11-30T00:00:00Z"
}
```
- **Erros:** `400 VALIDATION_ERROR` (período inválido), `403 ACCESS_DENIED`.

#### 37. `GET /api/cronograma/compartilhado/{token}`
- **Descrição:** Visualização pública, somente leitura, do cronograma, com filtro de data dinâmico. Não exige login e não expõe custos, DRE, dados de cliente nem de usuários. (RF-16)
- **Perfis:** Público via token
- **Query params:** `dataInicio`, `dataFim` (filtro dinâmico aplicado na URL compartilhada)
- **Saída (200):** mesmo formato de `GET /api/programacoes`, sem dados sensíveis.
- **Erros:** `404 ROUTE_NOT_FOUND` com mensagem de link inválido (token inexistente ou expirado).

---

## 5. Status da implementação

Implementadas em `backend/Backend.Api` (.NET 8), com **dados fixos em memória** espelhando `database/02_seed.sql` (alterações se perdem ao reiniciar a API): rotas **#1, #2, #6, #7, #8, #9, #11, #12, #13 e #15**. Exemplos de chamadas em `backend/Backend.Api/Backend.Api.http`.

A numeração das rotas mudou nesta versão do contrato para seguir `docs/Requisitos/07-api.md`. Correspondência com a versão anterior:

| Nº anterior | Nº atual | Rota |
|---|---|---|
| 1 | 1 | `POST /api/auth/login` |
| 2 | 2 | `GET /api/auth/me` |
| 3 | 7 | `POST /api/obras` |
| 4 | 6 | `GET /api/obras` |
| 5 | 8 | `GET /api/obras/{id}` |
| 6 | 9 | `PUT /api/obras/{id}` |
| 7 | 11 | `PATCH /api/obras/{id}/status` |
| 8 | 12 | `GET /api/obras/{id}/materiais` |
| 9 | 13 | `POST /api/obras/{id}/materiais` |
| 10 | 15 | `GET /api/obras/{id}/historico` |
| 11 | 16, 17 | Comentários (listar / criar) |
| 12 | 19 | `DELETE /api/comentarios/{id}` |
| 13 | 20, 21 | Equipes (listar / criar) |
| 14 | 22 | `GET /api/programacoes` |
| 15 | 23 | `POST /api/programacoes` |
| 16 | 24 | `PUT /api/programacoes/{id}/reordenar` |
| 17 | — | Homologação: **retirada** (RF-17 fora do escopo) |
| 18 | 27 | `GET /api/obras/{id}/relatorio-custo` |
| 19 | 29 | `GET /api/relatorios/export` |
| 20 | 31, 32 | `GET /api/mobile/{token}` **substituída** pelas rotas do instalador com login (ADR-007, questão Q3) |
| 21 | 37 | `GET /api/cronograma/compartilhado/{token}` |

Limitações desta etapa:
- **Sem JWT/RBAC:** as rotas estão abertas (sem `403`). O login valida os usuários do seed (senha `Senha123!`) e retorna um token fixo `token-fixo-{idUsuario}`, aceito por `GET /api/auth/me` no header `Authorization: Bearer ...`.
- **Histórico:** registros criados sem token são atribuídos ao Administrador (id 1). `GET /api/obras/{id}/historico` retorna do mais recente para o mais antigo.
- **`PATCH /api/obras/{id}/status`:** `emailNotificacaoEnviado` é sempre `false` (envio de e-mail ainda não implementado).
- As rotas implementadas ainda seguem os campos da versão anterior do contrato; os campos novos desta versão (ex.: `endereco`, `quantidadeInversores`, `cpfCnpj`, `tipoAcao`) entram junto com a ligação ao banco.

## 6. Divergências em aberto com o banco

O contrato segue o modelo de dados dos requisitos (`06-modelo-dados.md`). O schema atual (`database/01_schema.sql`) ainda não tem tudo o que ele prevê:

- **Nome do perfil de engenharia:** o schema e o seed usam `EngenhariaObras`; os requisitos usam `Engenharia`. Este contrato mantém `EngenhariaObras` até o schema mudar.
- **Perfil `VisualizadorLeitor`:** existe no schema e no seed, mas saiu da matriz de permissões (questão Q4 em aberto). Nenhuma rota concede permissão a ele.
- **Colunas a adicionar:** `cliente.cpf_cnpj`, `endereco`, `telefone`, `email`; `usuario.ativo`, `tentativas_login`, `bloqueado_ate`; `obra.quantidade_inversores`, `endereco`, `descricao`, `excluida_em`; `material.quantidade_utilizada`, `custo_unitario`; `comentario.tipo`; `historico_obra.tipo_acao`; `relatorio_custo.valor_obra`; `equipe.id_responsavel`.
- **Tabelas a adicionar:** `equipe_instalador`, `manutencao`, `audit_log` e a tabela de tokens do cronograma compartilhado (ainda não modelada).
- **Tabela a remover:** `homologacao` (RF-17 fora do escopo).
- **Projeto e instruções da instalação** (rota #32): ainda sem coluna no modelo de dados.

## 7. Próximos passos

- Alinhar `database/01_schema.sql` e `02_seed.sql` com a seção 6.
- Ligar as rotas implementadas ao PostgreSQL, substituindo os dados fixos em memória.
- Implementar JWT, RBAC e `audit_log` em todas as rotas protegidas.
- Resolver as questões Q1 (arredondamento da duração) e Q2 (feriados) antes de fechar as rotas #23 e #24.
- Este documento deve ser atualizado sempre que um novo caso de uso ou requisito for adicionado/alterado.
