# Contrato de API — Sistema de Gestão de Obras (ZL Engenharia)

## 1. Objetivo

Este documento define o contrato de comunicação entre o **frontend** (React + TypeScript) e o **backend** (ASP.NET Core Web API) do sistema de gestão de obras de energia solar. As rotas foram derivadas dos casos de uso, dos requisitos funcionais (`RF-01` a `RF-26`) e das regras de negócio definidos pela equipe de Requisitos. Os campos de entrada e saída seguem as entidades do modelo de dados.

Esta versão segue a **revisão dos requisitos de 07/11/2026**: equipes passam a ser temporais (uma por programação no Gantt), valores ficam isolados no módulo financeiro (RF-26), materiais saem de um catálogo de produtos (RF-25) e entram as rotas de senha (RF-21), usuários (RF-22) e clientes (RF-23).

Documentos de referência (`docs/Requisitos/`):
- `02-requisitos.md`: RF-01 a RF-26, RNF-01 a RNF-08
- `03-casos-de-uso.md`: casos de uso
- `04-regras-negocio.md`: RN-01 a RN-10, transições de status, matriz de permissões (seção 4) e matriz de autorização das rotas (seção 8)
- `06-modelo-dados.md`: entidades `cliente`, `perfil_acesso`, `usuario`, `obra`, `pagamento`, `produto`, `material`, `programacao_obra`, `equipe`, `equipe_integrante`, `comentario`, `historico_obra`, `relatorio_custo`, `manutencao`, `audit_log`
- `07-api.md`: resumo das rotas. Este documento é o detalhamento completo e usa a **mesma numeração**.

A API também se documenta sozinha pelo **Swagger**, em `/api/docs` (ex.: http://localhost:8000/api/docs). Lá é possível fazer login, clicar em **Authorize**, colar o token e chamar as rotas já implementadas. O Swagger mostra o que está no código; este documento mostra o que foi combinado. Quando os dois divergirem, a seção 5 explica o motivo.

## 2. Convenções gerais

| Aspecto | Convenção |
|---|---|
| Base URL | `/api` |
| Documentação interativa | Swagger UI em `/api/docs`; especificação OpenAPI em `/api/docs/v1/swagger.json` |
| Autenticação | Header `Authorization: Bearer <token>` (JWT), obtido em `POST /api/auth/login`. Validade padrão de 480 minutos, configurável por `JWT_EXPIRES_MINUTES`, sem renovação automática |
| Conteúdo do token | Somente o id e o perfil do usuário. A equipe **não** vai no token, porque muda conforme o período (RF-01, revisão de 07/11/2026) |
| Formato de payload | `application/json`, chaves em **camelCase**. Corpo sem esse `Content-Type` recebe `415` |
| Datas | ISO 8601: `yyyy-MM-dd` para data e `yyyy-MM-ddTHH:mm:ssZ` para data e hora (UTC) |
| Paginação (listagens) | Query params `page` (padrão 1) e `pageSize` (padrão 20) |
| Erros | Corpo padrão: `{ "error": { "code": "string", "message": "string" } }` |
| Exclusões | `204 No Content` |
| Campos sensíveis | `senha`/`senhaHash` nunca são retornados |
| Perfis de acesso (RBAC, RF-01 e RF-02) | `Administrador`, `Engenharia`, `Financeiro`, `InstaladorCampo` |
| Autorização | Toda rota protegida valida token e perfil **no servidor**. Sem token: `401`. Perfil sem permissão: `403`. Ambos geram registro em `audit_log` (RF-02, RNF-03) |
| Isolamento de valores (RF-26) | Preços, custos, valor da obra, custo total, DRE e data de confirmação de pagamento só aparecem para `Administrador` e `Financeiro`. Para `Engenharia` e `InstaladorCampo` esses campos **não vêm na resposta** (não vêm nem como `null`) |
| Instalador (filtro **E**) | O `InstaladorCampo` só acessa obras cujas equipes integra ou integrou. Obra sem esse vínculo responde `403 ACCESS_DENIED` (matriz da seção 8 de `04-regras-negocio.md`) |
| Auditoria | Mudança de status, exclusão, alteração de equipe, alteração de status de material e alteração financeira gravam `audit_log` na mesma transação da operação (RNF-04) |

### 2.1 Códigos de erro

Todo erro retorna o corpo padrão `{ "error": { "code": "...", "message": "..." } }`, com `message` em português explicando o que corrigir. Detalhes técnicos de erros `500` ficam apenas no log.

| HTTP | `code` | Quando ocorre |
|---|---|---|
| 400 | `INVALID_BODY` | Corpo ausente, JSON malformado ou campo com tipo/formato errado (a mensagem informa o campo) |
| 400 | `INVALID_PARAMETER` | Query param inválido (ex.: `page=0`, `page=abc`, `status` fora da lista) |
| 400 | `VALIDATION_ERROR` | Regra de negócio violada (a mensagem explica qual) |
| 400 | `MISSING_STATUS` | `statusNovo` não informado ao mover o cartão |
| 400 | `INVALID_STATUS` | Status de obra inexistente (a mensagem lista os valores aceitos) |
| 400 | `INVALID_STATUS_TRANSITION` | Transição não permitida no funil (a mensagem lista as próximas etapas permitidas) |
| 400 | `INVALID_STATUS_LOGISTICO` | Status logístico inexistente ou fora da ordem (Q12) |
| 400 | `PRODUTO_INATIVO` | Produto inexistente ou desativado na inclusão de material |
| 400 | `SENHA_ATUAL_INCORRETA` | Senha atual não confere na alteração autenticada de senha |
| 400 | `INTEGRANTE_INVALIDO` | Usuário inativo ou sem perfil `InstaladorCampo`, ou datas fora do período da programação |
| 401 | `INVALID_CREDENTIALS` | E-mail ou senha inválidos no login (mensagem genérica, sem indicar qual campo) |
| 401 | `UNAUTHORIZED` | Token ausente, inválido ou expirado |
| 403 | `ACCESS_DENIED` | Perfil sem permissão para a ação, ou instalador fora da equipe da obra |
| 404 | `OBRA_NOT_FOUND` | Obra informada não existe (ou foi excluída) |
| 404 | `CLIENTE_NOT_FOUND` | Cliente informado não existe |
| 404 | `USUARIO_NOT_FOUND` | Usuário informado não existe |
| 404 | `PRODUTO_NOT_FOUND` | Produto informado não existe |
| 404 | `MATERIAL_NOT_FOUND` | Material informado não existe |
| 404 | `COMENTARIO_NOT_FOUND` | Comentário informado não existe |
| 404 | `PROGRAMACAO_NOT_FOUND` | Programação informada não existe |
| 404 | `INTEGRANTE_NOT_FOUND` | O usuário não integra a equipe da programação |
| 404 | `MANUTENCAO_NOT_FOUND` | Manutenção informada não existe |
| 404 | `ROUTE_NOT_FOUND` | Rota inexistente (inclui id não numérico, ex.: `/api/obras/abc`) e token de cronograma compartilhado inválido ou expirado |
| 405 | `METHOD_NOT_ALLOWED` | Método HTTP não suportado pela rota |
| 409 | `SCHEDULE_CONFLICT` | Instalador já está em outra equipe no período (a mensagem informa o instalador, a obra e o período ocupado) |
| 409 | `EMAIL_ALREADY_EXISTS` | E-mail já cadastrado para outro usuário |
| 409 | `CPF_CNPJ_DUPLICADO` | CPF/CNPJ já cadastrado para outro cliente |
| 409 | `CLIENTE_COM_OBRAS` | Exclusão de cliente com obras vinculadas, inclusive excluídas logicamente |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Corpo sem `Content-Type: application/json` |
| 423 | `ACCOUNT_LOCKED` | Conta bloqueada por 15 minutos após 5 falhas consecutivas de login (a mensagem informa o tempo restante) |
| 500 | `INTERNAL_ERROR` | Erro inesperado no servidor |

Os códigos 404 por entidade (`CLIENTE_NOT_FOUND`, `USUARIO_NOT_FOUND` etc.) e o `EMAIL_ALREADY_EXISTS` não constam em `07-api.md`; foram acrescentados aqui para o frontend distinguir os casos.

**Transições válidas do funil (rota #17):** `MaterialComprado → NoDeposito → Separado → EmAndamento → Concluido`; `EmAndamento → Assistencia`; `Concluido → Assistencia`; `Assistencia → EmAndamento`. Mudar para o status atual também é recusado.

**Ordem do status logístico do material (rota #20):** `EmSolicitacao → Comprado → EmTransito → Disponivel → Utilizado`. Pular ou voltar status ainda está em aberto (Q12); até a decisão, só o próximo status da ordem é aceito.

> **Rastreabilidade de campos:** os atributos de cada JSON correspondem às colunas do modelo de dados, convertidas de `snake_case` para `camelCase` (ex.: `data_inicio_estimada` → `dataInicioEstimada`, `id_cliente` → `clienteId`).

## 3. Tabela-resumo das rotas

A numeração é a de `07-api.md`. Rotas com sufixo (ex.: `10a`) entraram na revisão de 07/11/2026 sem renumerar as anteriores. **E** = instalador só nas obras cujas equipes integra ou integrou.

| # | Método | Caminho | Descrição | Perfis | RF |
|---|---|---|---|---|---|
| 1 | POST | `/api/auth/login` | Autenticar e emitir JWT | Público | RF-01 |
| 2 | GET | `/api/auth/me` | Usuário logado, perfil e permissões | Autenticado | RF-01, RF-02 |
| 3 | POST | `/api/auth/esqueci-senha` | Enviar link de redefinição por e-mail | Público | RF-21 |
| 4 | POST | `/api/auth/redefinir-senha` | Redefinir senha pelo token do link | Público (token) | RF-21 |
| 5 | PUT | `/api/auth/alterar-senha` | Alterar a própria senha | Autenticado | RF-21 |
| 6 | GET | `/api/usuarios` | Listar usuários | Administrador | RF-22 |
| 7 | POST | `/api/usuarios` | Cadastrar usuário de qualquer perfil | Administrador | RF-01, RF-22 |
| 8 | PUT | `/api/usuarios/{id}` | Editar nome, e-mail e perfil | Administrador | RF-22 |
| 9 | PATCH | `/api/usuarios/{id}/ativo` | Desativar ou reativar usuário | Administrador | RF-22 |
| 10 | GET | `/api/clientes` | Listar clientes | Administrador, Engenharia | RF-23 |
| 10a | PUT | `/api/clientes/{id}` | Editar cliente | Administrador, Engenharia | RF-23 |
| 10b | DELETE | `/api/clientes/{id}` | Excluir cliente sem obras | Administrador, Engenharia | RF-23 |
| 11 | POST | `/api/clientes` | Cadastrar cliente | Administrador, Engenharia | RF-23 |
| 12 | GET | `/api/obras` | Listar obras com filtros | Administrador, Engenharia, Financeiro | RF-03, RF-04 |
| 13 | POST | `/api/obras` | Cadastrar obra de cliente existente | Administrador, Engenharia | RF-03 |
| 13a | ~~PUT~~ | ~~`/api/obras/{id}/responsaveis`~~ | Removida na revisão de 07/11/2026; a equipe fica na programação (27 a 27c) | — | — |
| 14 | GET | `/api/obras/{id}` | Detalhar obra | Administrador, Engenharia, Financeiro; Instalador **E** | RF-03, RF-26 |
| 15 | PUT | `/api/obras/{id}` | Editar obra (sem campos de valor) | Administrador, Engenharia | RF-03 |
| 16 | DELETE | `/api/obras/{id}` | Exclusão lógica | Administrador, Engenharia | RF-03 |
| 17 | PATCH | `/api/obras/{id}/status` | Mover cartão no funil | Administrador, Engenharia | RF-04, RF-10, RF-13 |
| 18 | GET | `/api/obras/{id}/materiais` | Listar materiais da obra | Administrador, Engenharia, Financeiro; Instalador **E** | RF-06 |
| 19 | POST | `/api/obras/{id}/materiais` | Incluir material a partir de produto | Administrador, Engenharia | RF-06, RF-25 |
| 20 | PATCH | `/api/materiais/{id}` | Atualizar status logístico | Administrador, Financeiro | RF-06 |
| 20a | GET | `/api/produtos` | Listar produtos ativos | Administrador, Engenharia, Financeiro | RF-25 |
| 20b | POST | `/api/produtos` | Cadastrar produto | Administrador, Financeiro | RF-25 |
| 20c | PUT | `/api/produtos/{id}` | Alterar ou desativar produto | Administrador, Financeiro | RF-25 |
| 21 | GET | `/api/obras/{id}/historico` | Linha do tempo da obra | Administrador, Engenharia, Financeiro | RF-11 |
| 22 | GET | `/api/obras/{id}/comentarios` | Listar comentários | Autenticado (Instalador **E**) | RF-11 |
| 23 | POST | `/api/obras/{id}/comentarios` | Criar comentário | Administrador, Engenharia; Financeiro só `Timeline` | RF-04, RF-11 |
| 24 | PUT | `/api/comentarios/{id}` | Editar comentário | Administrador | RF-12 |
| 25 | DELETE | `/api/comentarios/{id}` | Excluir comentário | Administrador | RF-12 |
| 26 | GET | `/api/instaladores/disponibilidade` | Instaladores livres e ocupados no período | Administrador, Engenharia | RF-07 |
| 27 | POST | `/api/programacoes/{id}/integrantes` | Incluir instalador na equipe | Administrador, Engenharia | RF-07 |
| 27a | PATCH | `/api/programacoes/{id}/integrantes/{usuarioId}` | Alterar datas do integrante | Administrador, Engenharia | RF-07 |
| 27b | DELETE | `/api/programacoes/{id}/integrantes/{usuarioId}` | Remover integrante | Administrador, Engenharia | RF-07 |
| 27c | PATCH | `/api/programacoes/{id}/equipe` | Alterar pessoas previstas | Administrador, Engenharia | RF-07 |
| 28 | GET | `/api/programacoes` | Cronograma (visão Gantt) com equipes | Administrador, Engenharia, Financeiro; Instalador **E** | RF-07, RF-08 |
| 28a | GET | `/api/gantt/ocupacao` | Ocupação dos instaladores no período | Administrador, Engenharia, Financeiro | RF-07 |
| 29 | POST | `/api/programacoes` | Programar obra com equipe | Administrador, Engenharia | RF-07, RF-08, RF-10 |
| 30 | PUT | `/api/programacoes/{id}/reordenar` | Reordenar com propagação | Administrador, Engenharia | RF-09 |
| 31 | GET | `/api/obras/{id}/custos` | Custos e valor da obra | Administrador, Financeiro | RF-14, RF-26 |
| 32 | POST | `/api/obras/{id}/custos` | Registrar custos e valor da obra | Financeiro | RF-14, RF-26 |
| 33 | GET | `/api/obras/{id}/relatorio-custo` | Custo total (obra concluída) | Administrador, Financeiro | RF-14 |
| 34 | GET | `/api/obras/{id}/dre` | DRE da obra | Administrador, Financeiro | RF-20 |
| 35 | GET | `/api/relatorios/export` | Exportar relatório em PDF/Excel | Administrador, Financeiro | RF-15 |
| 36 | GET | `/api/obras/{id}/instalacao/export` | Exportar detalhes da instalação | Administrador | RF-15 |
| 37 | GET | `/api/instalador/instalacoes` | Instalações do instalador logado | InstaladorCampo | RF-19 |
| 38 | GET | `/api/instalador/instalacoes/{obraId}` | Detalhe: kit, endereço, projeto, rota | InstaladorCampo **E** | RF-19 |
| 39 | GET | `/api/instalador/manutencoes` | Manutenções do instalador logado | InstaladorCampo **E** | RF-05, RF-19 |
| 40 | PATCH | `/api/manutencoes/{id}/concluir` | Concluir manutenção | InstaladorCampo **E** | RF-05 |
| 41 | POST | `/api/manutencoes/{id}/comentarios` | Comentar manutenção | InstaladorCampo **E** | RF-05 |
| 42 | POST | `/api/cronograma/compartilhado` | Gerar link do cronograma | Administrador, Engenharia | RF-16 |
| 43 | GET | `/api/cronograma/compartilhado/{token}` | Cronograma público somente leitura | Público (token) | RF-16 |

Rota removida além da 13a: **`POST /api/equipes`** (cadastro fixo de equipe), substituída pelas rotas 27 a 27c. `GET /api/equipes` também deixa de existir no modelo novo; a disponibilidade dos instaladores vem da rota 26.

---

## 4. Detalhamento das rotas

### 4.1 Autenticação e senha (RF-01, RF-02, RF-21)

#### 1. `POST /api/auth/login`
- **Descrição:** Autentica o usuário e retorna um token JWT com o perfil. Senhas são comparadas com o hash bcrypt. Login válido zera o contador de falhas; cinco falhas consecutivas bloqueiam a conta por 15 minutos. Conta inativa recebe a mesma mensagem genérica, sem contar tentativa. (RF-01)
- **Perfis:** Público
- **Entrada:**
```json
{ "email": "engenharia@zlengenharia.com", "senha": "SenhaForte123" }
```
- **Saída (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-11-09T20:00:00Z",
  "usuario": { "id": 12, "nome": "Ana Souza", "email": "engenharia@zlengenharia.com", "perfil": "Engenharia" }
}
```
- **Erros:** `401 INVALID_CREDENTIALS` ("E-mail ou senha incorretos"), `423 ACCOUNT_LOCKED`.

#### 2. `GET /api/auth/me`
- **Descrição:** Retorna o usuário autenticado e as permissões do perfil, para o frontend montar menu e telas (RF-01, RF-02).
- **Perfis:** Autenticado
- **Saída (200):**
```json
{
  "id": 12,
  "nome": "Ana Souza",
  "email": "engenharia@zlengenharia.com",
  "perfil": {
    "id": 2,
    "nomePerfil": "Engenharia",
    "permissoes": ["obras:criar", "obras:mover", "programacoes:editar"]
  }
}
```
- **Erros:** `401 UNAUTHORIZED`.

#### 3. `POST /api/auth/esqueci-senha`
- **Descrição:** Envia por e-mail um link de redefinição de senha, de uso único e válido por 1 hora. A resposta é **sempre a mesma**, exista ou não o e-mail, para não revelar quem tem cadastro. (RF-21)
- **Perfis:** Público
- **Entrada:**
```json
{ "email": "engenharia@zlengenharia.com" }
```
- **Saída (200):**
```json
{ "mensagem": "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha." }
```
- **Erros:** `400 VALIDATION_ERROR` (e-mail vazio ou em formato inválido).

#### 4. `POST /api/auth/redefinir-senha`
- **Descrição:** Redefine a senha com o token recebido no link. O token vale uma vez só. Depois da troca, todos os tokens de acesso (JWT) do usuário são invalidados. (RF-21)
- **Perfis:** Público, com token do link
- **Entrada:**
```json
{ "token": "3f9c1a7e...", "novaSenha": "NovaSenha123", "confirmacaoSenha": "NovaSenha123" }
```
- **Saída (200):**
```json
{ "mensagem": "Senha redefinida. Faça login com a nova senha." }
```
- **Erros:** `400 VALIDATION_ERROR` (link inválido, expirado ou já usado; senha fora da política: mínimo 8 caracteres, com maiúscula, minúscula e número; confirmação diferente).

#### 5. `PUT /api/auth/alterar-senha`
- **Descrição:** O usuário logado troca a própria senha informando a atual. A resposta reflete o resultado real: sucesso (`200`) ou falha (`400`), nunca os dois. Em falha, a senha anterior continua válida e nenhum token é invalidado. A mensagem de falha não sugere pedir novo link. (RF-21)
- **Perfis:** Autenticado
- **Entrada:**
```json
{ "senhaAtual": "SenhaForte123", "novaSenha": "NovaSenha123", "confirmacaoSenha": "NovaSenha123" }
```
- **Saída (200):**
```json
{ "mensagem": "Senha alterada com sucesso." }
```
- **Erros:** `400 SENHA_ATUAL_INCORRETA`, `400 VALIDATION_ERROR` (política de senha, confirmação diferente), `401 UNAUTHORIZED`.

---

### 4.2 Usuários (RF-01, RF-22)

Somente o `Administrador` acessa estas rotas.

#### 6. `GET /api/usuarios`
- **Descrição:** Lista os usuários com nome, e-mail, perfil e situação. (RF-22)
- **Perfis:** `Administrador`
- **Query params:** `nome` (busca textual), `perfil`, `ativo` (`true`/`false`), `page`, `pageSize`
- **Saída (200):**
```json
{
  "page": 1,
  "pageSize": 20,
  "total": 1,
  "itens": [
    { "id": 15, "nome": "Carlos Lima", "email": "carlos@zl.com.br", "perfil": "InstaladorCampo", "ativo": true }
  ]
}
```
- **Erros:** `400 INVALID_PARAMETER`, `403 ACCESS_DENIED`.

#### 7. `POST /api/usuarios`
- **Descrição:** Cadastra usuário de qualquer perfil. A senha inicial é gerada pelo sistema e enviada por e-mail (depende do RF-21); só o hash é gravado. O instalador é cadastrado sem equipe: ele entra em equipes pela programação do Gantt (rota 27). (RF-01, RF-22)
- **Perfis:** `Administrador`
- **Entrada:**
```json
{ "nome": "Carlos Lima", "email": "carlos@zl.com.br", "perfil": "InstaladorCampo" }
```
- **Saída (201):** o usuário criado, no mesmo formato de um item da rota 6.
- **Erros:** `400 VALIDATION_ERROR` (nome vazio, e-mail inválido, perfil inexistente), `409 EMAIL_ALREADY_EXISTS`, `403 ACCESS_DENIED`.

#### 8. `PUT /api/usuarios/{id}`
- **Descrição:** Edita nome, e-mail e perfil. Mudar o perfil invalida na hora os tokens do usuário. Campos omitidos mantêm o valor atual. (RF-22)
- **Perfis:** `Administrador`
- **Entrada:**
```json
{ "nome": "Carlos Lima", "email": "carlos.lima@zl.com.br", "perfil": "Engenharia" }
```
- **Saída (200):** o usuário atualizado, no formato de um item da rota 6.
- **Erros:** `400 VALIDATION_ERROR`, `404 USUARIO_NOT_FOUND`, `409 EMAIL_ALREADY_EXISTS`, `403 ACCESS_DENIED`.

#### 9. `PATCH /api/usuarios/{id}/ativo`
- **Descrição:** Desativa ou reativa o usuário (exclusão lógica). Desativar invalida todos os tokens e impede novos logins. Reativar envia nova senha por e-mail. O administrador não pode desativar a si mesmo. (RF-22)
- **Perfis:** `Administrador`
- **Entrada:**
```json
{ "ativo": false }
```
- **Saída (200):** o usuário atualizado, no formato de um item da rota 6.
- **Erros:** `400 VALIDATION_ERROR` (desativar a si mesmo), `404 USUARIO_NOT_FOUND`, `403 ACCESS_DENIED`.

---

### 4.3 Clientes (RF-23)

O cadastro de clientes tem tela própria. O formulário de obra só escolhe um cliente já cadastrado.

#### 10. `GET /api/clientes`
- **Descrição:** Lista os clientes com a quantidade de obras vinculadas. Também alimenta o seletor de cliente do cadastro de obra. (RF-23)
- **Perfis:** `Administrador`, `Engenharia`
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
      "cpfCnpj": "12.345.678/0001-95",
      "cidade": "Campinas",
      "endereco": "Av. das Palmeiras, 500",
      "telefone": "(19) 99999-0000",
      "email": "contato@redealfa.com.br",
      "quantidadeObras": 3
    }
  ]
}
```
- **Erros:** `400 INVALID_PARAMETER`, `403 ACCESS_DENIED`.

#### 10a. `PUT /api/clientes/{id}`
- **Descrição:** Edita o cliente. Campos omitidos mantêm o valor atual. CPF/CNPJ continua obrigatório, válido nos dígitos verificadores e único. (RF-23)
- **Perfis:** `Administrador`, `Engenharia`
- **Entrada:** mesmos campos da rota 11.
- **Saída (200):** o cliente atualizado, no formato de um item da rota 10.
- **Erros:** `400 VALIDATION_ERROR`, `404 CLIENTE_NOT_FOUND`, `409 CPF_CNPJ_DUPLICADO`, `403 ACCESS_DENIED`.

#### 10b. `DELETE /api/clientes/{id}`
- **Descrição:** Exclui o cliente. Cliente com obra vinculada, inclusive obra excluída logicamente, não pode ser excluído. (RF-23)
- **Perfis:** `Administrador`, `Engenharia`
- **Saída:** `204 No Content`
- **Erros:** `404 CLIENTE_NOT_FOUND`, `409 CLIENTE_COM_OBRAS`, `403 ACCESS_DENIED`.

#### 11. `POST /api/clientes`
- **Descrição:** Cadastra cliente. Nome e CPF/CNPJ são obrigatórios; CPF/CNPJ precisa ser válido e único. (RF-23)
- **Perfis:** `Administrador`, `Engenharia`
- **Entrada:**
```json
{
  "nome": "Rede Alfa Supermercados",
  "cpfCnpj": "12.345.678/0001-95",
  "cidade": "Campinas",
  "endereco": "Av. das Palmeiras, 500",
  "telefone": "(19) 99999-0000",
  "email": "contato@redealfa.com.br",
  "dadosContrato": null
}
```
- **Saída (201):** o cliente criado, no formato de um item da rota 10 (`quantidadeObras: 0`).
- **Erros:** `400 VALIDATION_ERROR` (nome vazio, CPF/CNPJ ausente ou inválido), `409 CPF_CNPJ_DUPLICADO`, `403 ACCESS_DENIED`.

---

### 4.4 Obras (RF-03, RF-04, RF-26)

#### 12. `GET /api/obras`
- **Descrição:** Lista obras com filtros, usada na página Obras e nas colunas do Kanban. Obras excluídas não aparecem. Sem campos de valor. (RF-03, RF-04)
- **Perfis:** `Administrador`, `Engenharia`, `Financeiro`
- **Query params:** `status` (`MaterialComprado`, `NoDeposito`, `Separado`, `EmAndamento`, `Concluido`, `Assistencia`), `clienteNome`, `categoria` (`Residencial`, `Comercial`), `page`, `pageSize`
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
- **Erros:** `400 INVALID_STATUS`, `400 INVALID_PARAMETER`, `403 ACCESS_DENIED`.

#### 13. `POST /api/obras`
- **Descrição:** Cadastra obra vinculada a um cliente **já cadastrado**. O formulário não cria cliente (isso fica na rota 11) e não tem campos de valor. A obra nasce em `MaterialComprado` e a ação vai para a linha do tempo. (RF-03)
- **Perfis:** `Administrador`, `Engenharia`
- **Entrada:**
```json
{
  "clienteId": 45,
  "categoria": "Comercial",
  "quantidadePaineis": 45,
  "quantidadeInversores": 2,
  "endereco": "Av. das Palmeiras, 500 - Campinas/SP",
  "descricao": "Telhado metálico, acesso pela doca.",
  "dataInicioEstimada": "2026-10-01",
  "dataFimEstimada": "2026-10-06",
  "prazoContratualDias": 45
}
```
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
  "descricao": "Telhado metálico, acesso pela doca.",
  "dataInicioEstimada": "2026-10-01",
  "dataFimEstimada": "2026-10-06",
  "prazoContratualDias": 45,
  "criadoEm": "2026-09-20T14:32:00Z"
}
```
- **Erros:** `400 VALIDATION_ERROR` (`quantidadePaineis` ≤ 0, datas fora de ordem, categoria inválida, sem `clienteId`), `404 CLIENTE_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 14. `GET /api/obras/{id}`
- **Descrição:** Detalhe da obra (aba Dados). Os campos de valor (`pagamento.dataConfirmacao`, `valorObra`) só vêm para `Administrador` e `Financeiro`. (RF-03, RF-26)
- **Perfis:** `Administrador`, `Engenharia`, `Financeiro`; `InstaladorCampo` **E**
- **Saída (200)**, para Administrador e Financeiro:
```json
{
  "id": 301,
  "status": "EmAndamento",
  "categoria": "Comercial",
  "quantidadePaineis": 45,
  "quantidadeInversores": 2,
  "endereco": "Av. das Palmeiras, 500 - Campinas/SP",
  "descricao": "Telhado metálico, acesso pela doca.",
  "dataInicioEstimada": "2026-10-01",
  "dataFimEstimada": "2026-10-06",
  "dataInicioReal": "2026-10-01",
  "dataFimReal": null,
  "cliente": { "id": 45, "nome": "Rede Alfa Supermercados", "cidade": "Campinas" },
  "pagamento": { "prazoContratualDias": 45, "dataConfirmacao": "2026-09-15" },
  "valorObra": 38000.00
}
```
Para Engenharia e Instalador, a mesma resposta **sem** `valorObra` e sem `pagamento.dataConfirmacao`.
- **Erros:** `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 15. `PUT /api/obras/{id}`
- **Descrição:** Edita descrição, categoria, quantidades, endereço, datas e prazo contratual. Sem campos de valor. Campos omitidos mantêm o valor atual. O status muda só pela rota 17. (RF-03)
- **Perfis:** `Administrador`, `Engenharia`
- **Entrada:** os mesmos campos da rota 13, menos `clienteId`.
- **Saída (200):** mesmo formato da rota 14.
- **Erros:** `400 VALIDATION_ERROR`, `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 16. `DELETE /api/obras/{id}`
- **Descrição:** Exclusão lógica: preenche `excluidaEm`, tira a obra das listagens, do Kanban e do Gantt (remove as programações futuras e suas equipes) e grava `audit_log`. Histórico, comentários e custos são preservados. Obra `EmAndamento` não pode ser excluída. (RF-03)
- **Perfis:** `Administrador`, `Engenharia`
- **Saída:** `204 No Content`
- **Erros:** `400 VALIDATION_ERROR` (obra em execução), `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 17. `PATCH /api/obras/{id}/status`
- **Descrição:** Move o cartão entre as etapas do funil. Na mesma transação, atualiza a obra e grava `historico_obra` e `audit_log`. Indo para `Concluido`, dispara o e-mail de conclusão de forma assíncrona; falha no envio não desfaz a mudança. (RF-04, RF-10, RF-13)
- **Perfis:** `Administrador`, `Engenharia`
- **Entrada:**
```json
{ "statusNovo": "EmAndamento", "observacao": "Equipe iniciou a instalação" }
```
- **Saída (200):**
```json
{
  "id": 301,
  "statusAnterior": "Separado",
  "statusNovo": "EmAndamento",
  "dataAlteracao": "2026-10-15T15:10:00Z",
  "emailNotificacaoEnviado": false
}
```
- **Erros:** `400 MISSING_STATUS`, `400 INVALID_STATUS`, `400 INVALID_STATUS_TRANSITION` (inclui status igual ao atual), `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

---

### 4.5 Materiais e catálogo de produtos (RF-06, RF-25)

#### 18. `GET /api/obras/{id}/materiais`
- **Descrição:** Lista os materiais da obra e o status logístico. `custoUnitario` só vem para `Administrador` e `Financeiro`. (RF-06, RF-26)
- **Perfis:** `Administrador`, `Engenharia`, `Financeiro`; `InstaladorCampo` **E**
- **Saída (200)**, para Administrador e Financeiro:
```json
[
  {
    "id": 501,
    "produtoId": 7,
    "produtoNome": "Painel Solar 550W",
    "tipo": "Painel",
    "unidade": "un",
    "quantidade": 45,
    "quantidadeUtilizada": null,
    "custoUnitario": 780.00,
    "statusLogistico": "EmTransito"
  }
]
```
Para Engenharia e Instalador, os mesmos itens **sem** `custoUnitario`.
- **Erros:** `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 19. `POST /api/obras/{id}/materiais`
- **Descrição:** Inclui material na obra a partir de um produto cadastrado e ativo. A Engenharia escolhe produto e quantidade; não digita tipo nem preço. O material nasce em `EmSolicitacao` e guarda o preço do produto no momento da inclusão (Q13). (RF-06, RF-25)
- **Perfis:** `Administrador`, `Engenharia`
- **Entrada:**
```json
{ "produtoId": 7, "quantidade": 45 }
```
- **Saída (201):** o material criado, no formato de um item da rota 18 (com `custoUnitario` só para Administrador), com `statusLogistico: "EmSolicitacao"`.
- **Erros:** `400 VALIDATION_ERROR` (quantidade ≤ 0), `400 PRODUTO_INATIVO`, `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 20. `PATCH /api/materiais/{id}`
- **Descrição:** Atualiza o status logístico na ordem `EmSolicitacao → Comprado → EmTransito → Disponivel → Utilizado` e, ao usar, a quantidade utilizada (balanço do custo total). Grava `audit_log`. A Engenharia vê o status, mas não altera. (RF-06)
- **Perfis:** `Administrador`, `Financeiro`
- **Entrada:**
```json
{ "statusLogistico": "Utilizado", "quantidadeUtilizada": 44 }
```
- **Saída (200):** o material atualizado, no formato de um item da rota 18.
- **Erros:** `400 INVALID_STATUS_LOGISTICO` (status inexistente ou fora da ordem), `400 VALIDATION_ERROR` (`quantidadeUtilizada` negativa ou maior que `quantidade`), `404 MATERIAL_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 20a. `GET /api/produtos`
- **Descrição:** Lista os produtos ativos do catálogo. A Engenharia recebe nome, tipo e unidade, **sem** `precoUnitario`. Com `incluirInativos=true` (só Administrador e Financeiro), lista também os desativados. (RF-25, RN-07)
- **Perfis:** `Administrador`, `Engenharia`, `Financeiro`
- **Query params:** `nome`, `tipo`, `incluirInativos`
- **Saída (200)**, para Administrador e Financeiro:
```json
[
  { "id": 7, "nome": "Painel Solar 550W", "tipo": "Painel", "unidade": "un", "precoUnitario": 780.00, "ativo": true }
]
```
- **Erros:** `400 INVALID_PARAMETER`, `403 ACCESS_DENIED`.

#### 20b. `POST /api/produtos`
- **Descrição:** Cadastra produto no catálogo. (RF-25)
- **Perfis:** `Administrador`, `Financeiro`
- **Entrada:**
```json
{ "nome": "Painel Solar 550W", "tipo": "Painel", "unidade": "un", "precoUnitario": 780.00 }
```
- **Saída (201):** o produto criado, no formato de um item da rota 20a.
- **Erros:** `400 VALIDATION_ERROR` (campo obrigatório vazio, preço negativo), `403 ACCESS_DENIED`.

#### 20c. `PUT /api/produtos/{id}`
- **Descrição:** Altera o produto ou desativa (`ativo: false`). Produto desativado não aparece para novas inclusões; materiais já incluídos continuam com ele. Mudar o preço não altera o custo de materiais já incluídos (Q13). Campos omitidos mantêm o valor atual. (RF-25)
- **Perfis:** `Administrador`, `Financeiro`
- **Entrada:**
```json
{ "precoUnitario": 810.00, "ativo": true }
```
- **Saída (200):** o produto atualizado, no formato de um item da rota 20a.
- **Erros:** `400 VALIDATION_ERROR`, `404 PRODUTO_NOT_FOUND`, `403 ACCESS_DENIED`.

---

### 4.6 Histórico e comentários (RF-11, RF-12)

#### 21. `GET /api/obras/{id}/historico`
- **Descrição:** Linha do tempo da obra, do mais recente para o mais antigo. Registros imutáveis (somente INSERT). Ações: `Cadastro`, `MudancaStatus`, `Comentario`, `ManutencaoConcluida`, `AlteracaoFinanceira`. (RF-11, RF-12)
- **Perfis:** `Administrador`, `Engenharia`, `Financeiro`
- **Saída (200):**
```json
[
  {
    "id": 9001,
    "obraId": 301,
    "tipoAcao": "MudancaStatus",
    "statusAnterior": "Separado",
    "statusNovo": "EmAndamento",
    "dataAlteracao": "2026-10-15T15:10:00Z",
    "observacao": "Equipe iniciou a instalação",
    "usuario": { "id": 12, "nome": "Ana Souza" }
  }
]
```
- **Erros:** `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 22. `GET /api/obras/{id}/comentarios`
- **Descrição:** Lista os comentários da obra. (RF-11)
- **Perfis:** Autenticado (`InstaladorCampo` **E**)
- **Query params:** `tipo` (`Cartao`, `Manutencao`, `Timeline`), opcional
- **Saída (200):**
```json
[
  {
    "id": 701,
    "tipo": "Cartao",
    "descricao": "Cliente confirmou acesso ao telhado para amanhã.",
    "dataRegistro": "2026-10-15T15:20:00Z",
    "usuario": { "id": 12, "nome": "Ana Souza" }
  }
]
```
- **Erros:** `400 INVALID_PARAMETER`, `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 23. `POST /api/obras/{id}/comentarios`
- **Descrição:** Cria comentário e registra a ação na linha do tempo. Comentário vazio é recusado. `Administrador` e `Engenharia` comentam na gestão da obra (`Cartao`) ou na linha do tempo; `Financeiro` só na linha do tempo (`Timeline`). (RF-04, RF-11)
- **Perfis:** `Administrador`, `Engenharia`, `Financeiro`
- **Entrada:**
```json
{ "tipo": "Cartao", "descricao": "Cliente confirmou acesso ao telhado para amanhã." }
```
- **Saída (201):** o comentário criado, no formato de um item da rota 22.
- **Erros:** `400 VALIDATION_ERROR` (descrição vazia, tipo inválido), `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED` (inclui Financeiro com tipo `Cartao`).

#### 24. `PUT /api/comentarios/{id}`
- **Descrição:** Edita comentário. Grava `audit_log`. (RF-12)
- **Perfis:** `Administrador`
- **Entrada:**
```json
{ "descricao": "Cliente confirmou acesso ao telhado para quinta-feira." }
```
- **Saída (200):** o comentário atualizado, no formato de um item da rota 22.
- **Erros:** `400 VALIDATION_ERROR`, `404 COMENTARIO_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 25. `DELETE /api/comentarios/{id}`
- **Descrição:** Exclui comentário. Grava `audit_log`. Os registros automáticos da linha do tempo (`historico_obra`) não podem ser excluídos por nenhum perfil. (RF-12)
- **Perfis:** `Administrador`
- **Saída:** `204 No Content`
- **Erros:** `404 COMENTARIO_NOT_FOUND`, `403 ACCESS_DENIED`.

---

### 4.7 Equipes, cronograma e Gantt (RF-07 a RF-10)

Equipe é temporal: cada programação de obra tem a sua equipe, com `pessoasPrevistas` e integrantes que entram e saem em datas próprias, dentro do período da programação. Um instalador não pode estar em duas equipes com períodos sobrepostos (`409 SCHEDULE_CONFLICT`). Valores derivados (RN-10): `pessoasAlocadas`, `pessoasFaltantes` (previstas − alocadas) e `pessoaDia` (soma dos dias úteis de cada integrante).

Objeto `equipe`, usado nas rotas 27 a 29:
```json
{
  "pessoasPrevistas": 3,
  "pessoasAlocadas": 2,
  "pessoasFaltantes": 1,
  "pessoaDia": 6,
  "integrantes": [
    { "usuarioId": 15, "nome": "Bruno Lima", "dataEntrada": "2026-10-19", "dataSaida": "2026-10-21" },
    { "usuarioId": 18, "nome": "Carlos Reis", "dataEntrada": "2026-10-19", "dataSaida": "2026-10-21" }
  ]
}
```

#### 26. `GET /api/instaladores/disponibilidade`
- **Descrição:** Lista os instaladores de campo ativos, para montar a equipe. Com `dataInicio` e `dataFim`, marca quem está ocupado no período e em quais obras. (RF-07)
- **Perfis:** `Administrador`, `Engenharia`
- **Query params:** `dataInicio`, `dataFim` (opcionais, mas informados juntos)
- **Saída (200):**
```json
[
  { "usuarioId": 15, "nome": "Bruno Lima", "ocupado": true, "ocupacoes": [{ "obraId": 301, "dataInicio": "2026-10-19", "dataFim": "2026-10-21" }] },
  { "usuarioId": 22, "nome": "Diego Alves", "ocupado": false, "ocupacoes": [] }
]
```
- **Erros:** `400 INVALID_PARAMETER` (só uma das datas, ou `dataFim` antes de `dataInicio`), `403 ACCESS_DENIED`.

#### 27. `POST /api/programacoes/{id}/integrantes`
- **Descrição:** Inclui um instalador na equipe da programação. Sem datas, ele cobre o período inteiro. Grava `audit_log`. Substitui `POST /api/equipes`. (RF-07)
- **Perfis:** `Administrador`, `Engenharia`
- **Entrada:**
```json
{ "usuarioId": 21, "dataEntrada": "2026-10-20" }
```
- **Saída (200):** o objeto `equipe` atualizado.
- **Erros:** `400 INTEGRANTE_INVALIDO` (inativo, perfil diferente de `InstaladorCampo`, datas fora do período, já integra a equipe), `404 PROGRAMACAO_NOT_FOUND`, `404 USUARIO_NOT_FOUND`, `409 SCHEDULE_CONFLICT`, `403 ACCESS_DENIED`.

#### 27a. `PATCH /api/programacoes/{id}/integrantes/{usuarioId}`
- **Descrição:** Altera as datas de entrada e saída do integrante, validando conflito. Grava `audit_log`. (RF-07)
- **Perfis:** `Administrador`, `Engenharia`
- **Entrada:**
```json
{ "dataEntrada": "2026-10-20", "dataSaida": "2026-10-21" }
```
- **Saída (200):** o objeto `equipe` atualizado.
- **Erros:** `400 INTEGRANTE_INVALIDO` (datas fora do período ou saída antes da entrada), `404 PROGRAMACAO_NOT_FOUND`, `404 INTEGRANTE_NOT_FOUND`, `409 SCHEDULE_CONFLICT`, `403 ACCESS_DENIED`.

#### 27b. `DELETE /api/programacoes/{id}/integrantes/{usuarioId}`
- **Descrição:** Remove o integrante. Antes da data de entrada, apaga o vínculo. Depois do início, exige `?dataSaida=` e encerra o vínculo nessa data, preservando os dias trabalhados no `pessoaDia`. Grava `audit_log`. (RF-07)
- **Perfis:** `Administrador`, `Engenharia`
- **Query params:** `dataSaida` (obrigatório se a entrada do integrante já passou)
- **Saída (200):** o objeto `equipe` atualizado.
- **Erros:** `400 VALIDATION_ERROR` (falta `dataSaida` depois do início, ou data fora do vínculo), `404 PROGRAMACAO_NOT_FOUND`, `404 INTEGRANTE_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 27c. `PATCH /api/programacoes/{id}/equipe`
- **Descrição:** Altera a quantidade de pessoas previstas, que precisa ser maior que zero. Grava `audit_log`. (RF-07)
- **Perfis:** `Administrador`, `Engenharia`
- **Entrada:**
```json
{ "pessoasPrevistas": 4 }
```
- **Saída (200):** o objeto `equipe` atualizado.
- **Erros:** `400 VALIDATION_ERROR` (`pessoasPrevistas` ≤ 0), `404 PROGRAMACAO_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 28. `GET /api/programacoes`
- **Descrição:** Cronograma consolidado (visão Gantt): uma linha por obra programada, com a equipe como atributo da barra (ex.: 2/3). Obras excluídas não aparecem. O instalador vê só as programações cujas equipes integra. (RF-07, RF-08)
- **Perfis:** `Administrador`, `Engenharia`, `Financeiro`; `InstaladorCampo` **E**
- **Query params:** `dataInicio`, `dataFim`, `instaladorId` (opcionais)
- **Saída (200):**
```json
[
  {
    "id": 601,
    "obraId": 301,
    "dataInicio": "2026-10-19",
    "dataFim": "2026-10-21",
    "prioridade": 1,
    "duracaoEstimadaDias": 2.5,
    "equipe": { "pessoasPrevistas": 3, "pessoasAlocadas": 2, "pessoasFaltantes": 1, "pessoaDia": 6, "integrantes": [] }
  }
]
```
- **Erros:** `400 INVALID_PARAMETER`, `403 ACCESS_DENIED`.

#### 28a. `GET /api/gantt/ocupacao`
- **Descrição:** Ocupação dos instaladores no período: por dia (alocados, livres e faltantes nas equipes) e por instalador (dias alocados e percentual de ocupação = dias úteis em equipes ÷ dias úteis do período, RN-10). (RF-07)
- **Perfis:** `Administrador`, `Engenharia`, `Financeiro`
- **Query params:** `dataInicio`, `dataFim` (obrigatórios)
- **Saída (200):**
```json
{
  "porDia": [
    { "data": "2026-10-19", "instaladoresAtivos": 5, "alocados": 3, "livres": 2, "faltantes": 1 }
  ],
  "porInstalador": [
    { "usuarioId": 15, "nome": "Bruno Lima", "diasUteis": 5, "diasAlocados": 3, "ocupacaoPercentual": 60 }
  ]
}
```
- **Erros:** `400 INVALID_PARAMETER`, `403 ACCESS_DENIED`.

#### 29. `POST /api/programacoes`
- **Descrição:** Programa a obra no Gantt a partir de `dataInicio` (dia útil), com a quantidade de pessoas previstas e, se quiser, os integrantes. A duração é calculada pela quantidade de painéis (9 painéis por dia, RN-01) e o término em dias úteis, contando o início como primeiro dia (RN-02). A obra precisa estar apta: status `Separado`, `EmAndamento` ou `Assistencia`. Programar uma obra `Separado` leva o cartão para `EmAndamento` (RF-10). Se algum integrante estiver ocupado, nada é gravado. (RF-07, RF-08, RF-10)
- **Perfis:** `Administrador`, `Engenharia`
- **Entrada:**
```json
{ "obraId": 301, "dataInicio": "2026-10-19", "prioridade": 1, "pessoasPrevistas": 3, "integrantesIds": [15, 18] }
```
- **Saída (201):**
```json
{
  "id": 601,
  "obraId": 301,
  "dataInicio": "2026-10-19",
  "dataFim": "2026-10-21",
  "duracaoEstimadaDias": 2.5,
  "prioridade": 1,
  "equipe": {
    "pessoasPrevistas": 3,
    "pessoasAlocadas": 2,
    "pessoasFaltantes": 1,
    "pessoaDia": 6,
    "integrantes": [
      { "usuarioId": 15, "nome": "Bruno Lima", "dataEntrada": "2026-10-19", "dataSaida": "2026-10-21" },
      { "usuarioId": 18, "nome": "Carlos Reis", "dataEntrada": "2026-10-19", "dataSaida": "2026-10-21" }
    ]
  }
}
```
- **Erros:** `400 VALIDATION_ERROR` (obra não apta, sem quantidade de painéis, início em fim de semana, `pessoasPrevistas` ≤ 0), `400 INTEGRANTE_INVALIDO`, `404 OBRA_NOT_FOUND`, `409 SCHEDULE_CONFLICT`, `403 ACCESS_DENIED`.

#### 30. `PUT /api/programacoes/{id}/reordenar`
- **Descrição:** Reordena uma programação no Gantt e propaga o deslocamento, em dias úteis e em cadeia, para as programações seguintes que têm integrantes em comum, na ordem de prioridade (proposta Q10). As datas dos integrantes que cobriam o período inteiro acompanham; integrantes com datas parciais ficam para revisão. O horário de cada tarefa é preservado. (RF-09)
- **Perfis:** `Administrador`, `Engenharia`
- **Entrada:**
```json
{ "novaDataInicio": "2026-10-21" }
```
- **Saída (200):**
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
- **Erros:** `400 VALIDATION_ERROR`, `404 PROGRAMACAO_NOT_FOUND`, `409 SCHEDULE_CONFLICT`, `403 ACCESS_DENIED`.

---

### 4.8 Financeiro (RF-14, RF-15, RF-20, RF-26)

Valores só aparecem aqui, para `Administrador` e `Financeiro`.

#### 31. `GET /api/obras/{id}/custos`
- **Descrição:** Precificação da obra (mão de obra, insumos, valor cobrado e data de confirmação do pagamento) e os materiais com custo unitário. Indica se a precificação está completa. (RF-14)
- **Perfis:** `Administrador`, `Financeiro`
- **Saída (200):**
```json
{
  "obraId": 301,
  "custoMaoObra": 8500.00,
  "custoInsumos": 21300.50,
  "valorObra": 38000.00,
  "dataConfirmacaoPagamento": "2026-09-15",
  "precificacaoCompleta": true,
  "materiais": [
    { "id": 501, "produtoNome": "Painel Solar 550W", "quantidade": 45, "custoUnitario": 780.00 }
  ]
}
```
- **Erros:** `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 32. `POST /api/obras/{id}/custos`
- **Descrição:** Registra ou atualiza custos, valor da obra e data de confirmação do pagamento. Campos omitidos mantêm o valor atual. Toda gravação registra `historico_obra` (`AlteracaoFinanceira`) e `audit_log`. (RF-14, RF-26)
- **Perfis:** `Financeiro`
- **Entrada:**
```json
{ "custoMaoObra": 8500.00, "custoInsumos": 21300.50, "valorObra": 38000.00, "dataConfirmacaoPagamento": "2026-09-15" }
```
- **Saída (200):** mesmo formato da rota 31.
- **Erros:** `400 VALIDATION_ERROR` (valor negativo), `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 33. `GET /api/obras/{id}/relatorio-custo`
- **Descrição:** Custo total (soma dos itens de custo) com balanço de materiais. Só para obra `Concluido` com precificação completa. (RF-14, RN-03)
- **Perfis:** `Administrador`, `Financeiro`
- **Saída (200):**
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
- **Erros:** `400 VALIDATION_ERROR` (obra não concluída ou precificação incompleta, com o motivo), `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 34. `GET /api/obras/{id}/dre`
- **Descrição:** DRE da obra: valor, custo total e resultado (valor − custo total). Só para obra `Concluido` com precificação completa. (RF-20, RN-03)
- **Perfis:** `Administrador`, `Financeiro`
- **Saída (200):**
```json
{
  "obraId": 307,
  "valorObra": 38000.00,
  "custoMaoObra": 9200.00,
  "custoInsumos": 22500.00,
  "custoTotal": 31700.00,
  "resultado": 6300.00
}
```
- **Erros:** `400 VALIDATION_ERROR`, `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 35. `GET /api/relatorios/export`
- **Descrição:** Exporta o relatório financeiro ou o cronograma em PDF ou Excel, filtrado por período. Até 1.000 registros em no máximo 5 segundos (RNF-05). (RF-15)
- **Perfis:** `Administrador`, `Financeiro`
- **Query params:** `tipo` (`financeiro` | `cronograma`), `dataInicio`, `dataFim`, `formato` (`pdf` | `xlsx`)
- **Saída (200):** arquivo (`application/pdf` ou `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`), sem corpo JSON.
- **Erros:** `400 INVALID_PARAMETER`, `403 ACCESS_DENIED`.

#### 36. `GET /api/obras/{id}/instalacao/export`
- **Descrição:** Exporta os detalhes da instalação (kit, endereço, equipe, período e instruções), **sem valores**. (RF-15, RF-26)
- **Perfis:** `Administrador`
- **Query params:** `formato` (`pdf` | `xlsx`)
- **Saída (200):** arquivo, como na rota 35.
- **Erros:** `400 INVALID_PARAMETER`, `404 OBRA_NOT_FOUND`, `403 ACCESS_DENIED`.

---

### 4.9 Instalador de campo (RF-05, RF-19)

O instalador faz login como qualquer usuário (perfil `InstaladorCampo`) e só vê as obras cujas equipes integra ou integrou. A tela não mostra valores e ele não acessa telas administrativas ou financeiras (RN-04, RF-26). A identificação vem sempre do token, nunca de parâmetro da requisição.

#### 37. `GET /api/instalador/instalacoes`
- **Descrição:** Instalações das obras cujas equipes o usuário integra, com o período da programação e o período em que ele está escalado. Instalador sem equipe recebe lista vazia. (RF-19)
- **Perfis:** `InstaladorCampo`
- **Saída (200):**
```json
[
  {
    "obraId": 301,
    "clienteNome": "Rede Alfa Supermercados",
    "endereco": "Av. das Palmeiras, 500 - Campinas/SP",
    "status": "EmAndamento",
    "dataInicio": "2026-10-19",
    "dataFim": "2026-10-21",
    "dataEntrada": "2026-10-19",
    "dataSaida": "2026-10-21"
  }
]
```
- **Erros:** `401 UNAUTHORIZED`, `403 ACCESS_DENIED` (outros perfis).

#### 38. `GET /api/instalador/instalacoes/{obraId}`
- **Descrição:** Detalhe da instalação: kit de materiais (produto e quantidade, **sem preço**), endereço, projeto, instruções e `linkNavegacao`, usado pelo botão "Abrir rota" para abrir o aplicativo de mapas. (RF-19)
- **Perfis:** `InstaladorCampo` **E**
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
- **Erros:** `404 OBRA_NOT_FOUND` (obra inexistente ou excluída), `403 ACCESS_DENIED` (obra de equipe que ele não integra, ou outro perfil; grava `audit_log`).

#### 39. `GET /api/instalador/manutencoes`
- **Descrição:** Manutenções das obras cujas equipes o usuário integrou. (RF-05, RF-19)
- **Perfis:** `InstaladorCampo` **E**
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
- **Erros:** `400 INVALID_PARAMETER` (status fora da lista), `403 ACCESS_DENIED`.

#### 40. `PATCH /api/manutencoes/{id}/concluir`
- **Descrição:** Conclui a manutenção com o serviço executado, muda o status para `Concluida` e grava `historico_obra` (`ManutencaoConcluida`) e `audit_log`. Outros perfis não concluem manutenção. (RF-05)
- **Perfis:** `InstaladorCampo` **E**
- **Entrada:**
```json
{ "servicoExecutado": "Substituído o disjuntor do inversor." }
```
- **Saída (200):**
```json
{ "id": 41, "status": "Concluida", "dataConclusao": "2026-10-10T17:40:00Z" }
```
- **Erros:** `400 VALIDATION_ERROR` (serviço vazio, manutenção já concluída), `404 MANUTENCAO_NOT_FOUND`, `403 ACCESS_DENIED`.

#### 41. `POST /api/manutencoes/{id}/comentarios`
- **Descrição:** Comenta a manutenção. O comentário não pode ser vazio e guarda autor, data e hora; é gravado em `comentario` com tipo `Manutencao`. (RF-05)
- **Perfis:** `InstaladorCampo` **E**
- **Entrada:**
```json
{ "descricao": "Cliente pediu para voltar na próxima semana." }
```
- **Saída (201):** o comentário criado, no formato de um item da rota 22, com `tipo` `Manutencao`.
- **Erros:** `400 VALIDATION_ERROR` (descrição vazia), `404 MANUTENCAO_NOT_FOUND`, `403 ACCESS_DENIED`.

---

### 4.10 Cronograma compartilhado (RF-16)

#### 42. `POST /api/cronograma/compartilhado`
- **Descrição:** Gera um token único para o link público do cronograma. (RF-16)
- **Perfis:** `Administrador`, `Engenharia`
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

#### 43. `GET /api/cronograma/compartilhado/{token}`
- **Descrição:** Cronograma público, somente leitura, com filtro de data. Não exige login e não expõe custos, DRE, cliente nem usuários: mesmo formato da rota 28, sem `equipe.integrantes`. (RF-16, RF-26)
- **Perfis:** Público, com token
- **Query params:** `dataInicio`, `dataFim`
- **Saída (200):** como a rota 28, sem dados sensíveis.
- **Erros:** `404 ROUTE_NOT_FOUND` com mensagem de link inválido (token inexistente ou expirado).

---

## 5. Status da implementação

Situação em 09/11/2026 no backend (`backend/Backend.Api`, .NET 8, PostgreSQL). Exemplos de chamadas em `backend/Backend.Api/Backend.Api.http` e no Swagger (`/api/docs`).

Legenda: ✅ implementada e alinhada a este contrato · ⚠️ implementada na versão anterior do contrato, falta ajustar à revisão de 07/11 · 🔀 implementada em PR aberto · ⏳ pendente.

| # | Rota | Situação |
|---|---|---|
| 1 | `POST /api/auth/login` | ⚠️ a resposta ainda leva `equipeId` (e o token também) |
| 2 | `GET /api/auth/me` | ⚠️ ainda leva `equipeId` |
| 3–5 | Senha (esqueci, redefinir, alterar) | ⏳ |
| 6, 8, 9 | Usuários (listar, editar, ativar) | ⏳ |
| 7 | `POST /api/usuarios` | ⏳ controller; a camada de dados (`BancoDados.Usuarios.cs`) recebe senha e `equipeId`, que saíram do contrato |
| 10, 11 | Clientes (listar, cadastrar) | ⏳ controller; camada de dados pronta (`BancoDados.Clientes.cs`), ainda sem `quantidadeObras` e usando `CPF_CNPJ_ALREADY_EXISTS` |
| 10a, 10b | Clientes (editar, excluir) | ⏳ |
| 12 | `GET /api/obras` | ✅ |
| 13 | `POST /api/obras` | ⚠️ ainda aceita criar cliente junto e recebe `pagamento.dataConfirmacao` |
| 14 | `GET /api/obras/{id}` | ⚠️ ainda devolve `pagamento.dataConfirmacao` para Engenharia e Instalador (RF-26) |
| 15 | `PUT /api/obras/{id}` | ⚠️ ainda recebe `pagamento.dataConfirmacao` |
| 16 | `DELETE /api/obras/{id}` | ⏳ |
| 17 | `PATCH /api/obras/{id}/status` | ✅ (`emailNotificacaoEnviado` sempre `false`: e-mail não implementado) |
| 18 | `GET /api/obras/{id}/materiais` | ⚠️ ainda usa `tipo` livre e devolve `custoUnitario` para todos |
| 19 | `POST /api/obras/{id}/materiais` | ⚠️ ainda recebe `tipo` e `custoUnitario` em vez de `produtoId` |
| 20 | `PATCH /api/materiais/{id}` | ⏳ |
| 20a–20c | Produtos | ⏳ (depende da tabela `produto`) |
| 21 | `GET /api/obras/{id}/historico` | ✅ |
| 22–25 | Comentários | ✅ |
| 26, 27–27c, 28a | Disponibilidade, integrantes, equipe, ocupação | ⏳ (dependem de `equipe_integrante`) |
| 28 | `GET /api/programacoes` | ⚠️ equipe fixa (`equipeId`), sem o objeto `equipe` |
| 29 | `POST /api/programacoes` | ⚠️ recebe `equipeId` fixo em vez de `pessoasPrevistas`/`integrantesIds` |
| 30 | `PUT /api/programacoes/{id}/reordenar` | ⚠️ propaga pela mesma equipe fixa, não por integrantes em comum |
| 31, 32 | Custos | ⏳ controller; camada de dados pronta (`BancoDados.Custos.cs`) |
| 33, 34 | Relatório de custo e DRE | 🔀 PR #112 (`feat/backend-autorizacao-backup`) |
| 35, 36 | Exportações | ⏳ |
| 37 | `GET /api/instalador/instalacoes` | ✅ com a ressalva abaixo (sem `dataEntrada`/`dataSaida`) |
| 38 | `GET /api/instalador/instalacoes/{obraId}` | ✅ com a ressalva abaixo |
| 39 | `GET /api/instalador/manutencoes` | ✅ com a ressalva abaixo |
| 40, 41 | Concluir e comentar manutenção | ⏳ controller; camada de dados pronta (`BancoDados.Manutencoes.cs`) |
| 42, 43 | Cronograma compartilhado | ⏳ |
| — | `GET /api/equipes` | Implementada na versão anterior; sai com a equipe temporal |

**Ressalva das rotas 37 a 39:** enquanto o banco tiver equipe fixa (`usuario.id_equipe`, `programacao_obra.id_equipe`), o backend identifica a equipe do instalador pelo token e filtra por ela. O resultado é o mesmo do contrato para quem está numa equipe fixa: as datas da programação são o período em que ele está escalado. Quando `equipe_integrante` existir, só a consulta muda: o filtro passa a ser "integra ou integrou a equipe da programação" e a rota 37 ganha `dataEntrada`/`dataSaida`. O formato da resposta e as regras de acesso não mudam.

### 5.1 Correspondência com a numeração anterior

A versão anterior deste contrato tinha 37 rotas numeradas em sequência. Correspondência:

| Nº anterior | Nº atual | Rota |
|---|---|---|
| 1, 2 | 1, 2 | Login e `me` |
| 3 | 7 | `POST /api/usuarios` |
| 4, 5 | 10, 11 | Clientes (listar, cadastrar) |
| 6–11 | 12–17 | Obras |
| 12–14 | 18–20 | Materiais |
| 15–19 | 21–25 | Histórico e comentários |
| 20 | — | `GET /api/equipes`: removida (equipe temporal); disponibilidade na rota 26 |
| 21 | — | `POST /api/equipes`: removida; substituída pelas rotas 27 a 27c |
| 22–24 | 28–30 | Programações |
| 25–30 | 31–36 | Financeiro e exportações |
| 31–35 | 37–41 | Instalador de campo |
| 36, 37 | 42, 43 | Cronograma compartilhado |

## 6. Divergências em aberto com o banco

O schema atual (`database/01_schema.sql` + migrations) ainda segue o modelo anterior à revisão de 07/11/2026. Para implementar as rotas novas, o banco precisa de:

- **Equipe temporal:** `equipe` ligada 1:1 a `programacao_obra` (`id_programacao`, `pessoas_previstas`) e a tabela `equipe_integrante` (`id_equipe`, `id_usuario`, `data_entrada`, `data_saida`), com a restrição de sobreposição por instalador. Hoje existem `usuario.id_equipe`, `programacao_obra.id_equipe` e `equipe_instalador` (equipe fixa). Afeta as rotas 1, 2, 7, 26 a 30 e 37 a 41.
- **Catálogo de produtos:** tabela `produto` (`nome`, `tipo`, `unidade`, `preco_unitario`, `ativo`) e `material.id_produto` no lugar de `material.tipo`. Afeta as rotas 18 a 20c, 33 e 38.
- **Status `EmSolicitacao`** em `status_logistico_enum`, como status inicial do material. Afeta as rotas 19 e 20.
- **Senha (RF-21) e invalidação de tokens (RF-22):** tabela para os tokens de redefinição (hash do token, usuário, expiração, uso) e um marcador por usuário para invalidar os JWT emitidos antes de uma troca de senha, perfil ou desativação (ex.: `usuario.tokens_validos_desde`). Afeta as rotas 3 a 5, 8 e 9.
- **Perfil `VisualizadorLeitor`:** continua no schema e no seed, mas fora da matriz de permissões (Q4). Nenhuma rota concede acesso a ele.

## 7. Próximos passos

- Implementar os controllers das rotas que já têm camada de dados: clientes (10, 11), custos (31, 32) e manutenção (40, 41).
- Repassar à pessoa do banco a lista da seção 6 e, com o schema novo, migrar as rotas marcadas com ⚠️.
- Resolver as questões em aberto que afetam a API: Q1 (arredondamento da duração), Q2 (feriados), Q10 (propagação com equipes flexíveis), Q12 (pulo/retorno de status do material) e Q13 (custo do material).
- Atualizar este documento sempre que um requisito ou caso de uso for adicionado ou alterado.
