# Contrato de API — Sistema de Gestão de Obras (ZL Engenharia)

## 1. Objetivo

Este documento define o contrato de comunicação entre o **frontend** (React + TypeScript) e o **backend** (ASP.NET Core Web API) do sistema de gestão de obras de energia solar. As rotas abaixo foram derivadas diretamente dos casos de uso (`UC-01` a `UC-06`) e dos requisitos funcionais (`RF-01` a `RF-20`) definidos pela equipe de Requisitos, e os campos de entrada/saída seguem os atributos já modelados no MER do projeto.

Documentos de referência (`docs/documentacao de requisitos/`):
- `Casos_de_Uso.pdf` — UC-01 a UC-06
- `Requisitos_Funcionais_e_Nao_Funcionais.pdf` — RF-01 a RF-20, RNF-01 a RNF-08
- `MER_Textual_-_Sistema_de_Gestao_Solar.pdf` — entidades `Cliente`, `Equipe`, `Perfil_Acesso`, `Usuario`, `Obra`, `Pagamento`, `Material`, `Comentario`, `Historico_Obra`, `Programacao_Obra`, `Relatorio_Custo`

## 2. Convenções gerais

| Aspecto | Convenção |
|---|---|
| Base URL | `/api` |
| Autenticação | Header `Authorization: Bearer <token>` (JWT), obtido via `POST /api/auth/login` |
| Formato de payload | `application/json`, chaves em **camelCase** (padrão de serialização do ASP.NET Core) |
| Datas | ISO 8601 (`yyyy-MM-ddTHH:mm:ssZ` para `DateTime`, `yyyy-MM-dd` para `Date`) |
| Paginação (listagens) | Query params `page` (default 1) e `pageSize` (default 20) |
| Erros | Corpo padrão: `{ "error": { "code": "string", "message": "string" } }` |
| Perfis de acesso (RBAC — RF-01, RF-02) | `Administrador`, `EngenhariaObras`, `Financeiro`, `VisualizadorLeitor`, `InstaladorCampo` |

> **Rastreabilidade de campos:** os atributos de cada JSON abaixo correspondem aos atributos das entidades do MER, convertidos de `snake_case` para `camelCase` (ex.: `data_inicio_estimada` → `dataInicioEstimada`, `id_cliente` → `clienteId`). Campos sensíveis (ex.: `senha` de `Usuario`) nunca são retornados nas respostas.

## 3. Tabela-resumo das rotas

| # | Método | Caminho | Descrição | UC / RF | Entidade(s) MER |
|---|---|---|---|---|---|
| 1 | POST | `/api/auth/login` | Autenticar usuário | RF-01 | Usuario |
| 2 | GET | `/api/auth/me` | Dados do usuário logado e permissões | RF-01, RF-02 | Usuario, Perfil_Acesso |
| 3 | POST | `/api/obras` | Cadastrar nova obra | UC-01, RF-03 | Obra, Cliente, Pagamento |
| 4 | GET | `/api/obras` | Listar/buscar obras (filtro por status, cliente, texto) | UC-02, RF-04 | Obra |
| 5 | GET | `/api/obras/{id}` | Detalhar obra | UC-01 | Obra, Cliente, Pagamento |
| 6 | PUT | `/api/obras/{id}` | Editar dados da obra/contrato | UC-01, RF-03 | Obra, Pagamento |
| 7 | PATCH | `/api/obras/{id}/status` | Mover card entre etapas do funil | UC-02, RF-04, RF-06, RF-10, RF-13 | Obra, Historico_Obra |
| 8 | GET | `/api/obras/{id}/materiais` | Listar materiais da obra | RF-06 | Material |
| 9 | POST | `/api/obras/{id}/materiais` | Registrar material/lote | RF-06 | Material |
| 10 | GET | `/api/obras/{id}/historico` | Timeline cronológica da obra | RF-11 | Historico_Obra |
| 11 | GET / POST | `/api/obras/{id}/comentarios` | Listar / criar comentário | RF-11 | Comentario |
| 12 | DELETE | `/api/comentarios/{id}` | Excluir comentário (somente Administrador) | RF-12 | Comentario |
| 13 | GET / POST | `/api/equipes` | Listar / cadastrar equipes | UC-03 | Equipe |
| 14 | GET | `/api/programacoes` | Cronograma consolidado (visão Gantt) | UC-03, RF-07, RF-08 | Programacao_Obra |
| 15 | POST | `/api/programacoes` | Alocar equipe a uma obra/período | UC-03, RF-07, RF-08 | Programacao_Obra |
| 16 | PUT | `/api/programacoes/{id}/reordenar` | Reordenar cronograma com propagação de atrasos | UC-03, RF-09 | Programacao_Obra |
| 17 | GET / PUT | `/api/obras/{id}/homologacao` | Consultar / atualizar status de homologação | UC-04, RF-17 | *(extensão futura do MER)* |
| 18 | GET | `/api/obras/{id}/relatorio-custo` | DRE / custo consolidado da obra | UC-05, RF-14, RF-20 | Relatorio_Custo |
| 19 | GET | `/api/relatorios/export` | Exportar relatório em PDF/Excel por período | RF-15 | Relatorio_Custo (agregado) |
| 20 | GET | `/api/mobile/{token}` | Link mobile do instalador: kits + rota do dia | UC-06, RF-19 | Programacao_Obra, Material |
| 21 | GET | `/api/cronograma/compartilhado/{token}` | Visualização pública somente leitura do cronograma | RF-16 | Programacao_Obra (agregado) |

---

## 4. Detalhamento das rotas

### 4.1 Autenticação

#### 1. `POST /api/auth/login`
- **Descrição:** Autentica o usuário e retorna um token JWT. (RF-01)
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
- **Erros:** `401` credenciais inválidas.

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

---

### 4.2 Obras (UC-01, UC-02)

#### 3. `POST /api/obras`
- **Descrição:** Cadastra uma nova obra com dados de contrato (cidade, prazo, quantidade de painéis). (UC-01, RF-03)
- **Perfis:** `Administrador`, `EngenhariaObras`
- **Entrada:**
```json
{
  "clienteId": 45,
  "clienteNome": "Rede Alfa Supermercados",
  "cidade": "Campinas",
  "quantidadePaineis": 45,
  "dataInicioEstimada": "2026-10-01",
  "dataFimEstimada": "2026-10-06",
  "pagamento": {
    "prazoContratualDias": 45
  }
}
```
- **Saída (201):**
```json
{
  "id": 301,
  "status": "MaterialComprado",
  "clienteId": 45,
  "dataInicioEstimada": "2026-10-01",
  "dataFimEstimada": "2026-10-06",
  "dataInicioReal": null,
  "dataFimReal": null,
  "criadoEm": "2026-09-20T14:32:00Z"
}
```
- **Erros:** `400` dados inválidos, `403` perfil sem permissão.

#### 4. `GET /api/obras`
- **Descrição:** Lista obras com filtros, usada para montar as colunas do Kanban e a busca por obra/cliente. (UC-02, RF-04)
- **Perfis:** Todos os perfis autenticados (RF-02 restringe apenas ações de escrita)
- **Query params:** `status` (ex.: `MaterialComprado`, `NoDeposito`, `Separado`, `EmAndamento`, `Concluido`, `Assistencia`), `clienteNome` (busca textual), `page`, `pageSize`
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

#### 5. `GET /api/obras/{id}`
- **Descrição:** Detalhe completo de uma obra (dados de contrato e pagamento).
- **Perfis:** Todos os perfis autenticados
- **Saída (200):**
```json
{
  "id": 301,
  "status": "MaterialComprado",
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
- **Erros:** `404` obra não encontrada.

#### 6. `PUT /api/obras/{id}`
- **Descrição:** Edita dados da obra/contrato. (RF-03)
- **Perfis:** `Administrador`, `EngenhariaObras`
- **Entrada:**
```json
{
  "cidade": "Campinas",
  "dataInicioEstimada": "2026-10-02",
  "dataFimEstimada": "2026-10-07",
  "pagamento": {
    "prazoContratualDias": 60
  }
}
```
- **Saída (200):** mesmo formato de `GET /api/obras/{id}`.

#### 7. `PATCH /api/obras/{id}/status`
- **Descrição:** Move o card da obra entre as etapas do funil Kanban. Cria automaticamente um registro em `Historico_Obra` e, se o novo status for `Concluido`, dispara notificação por e-mail. (UC-02, RF-04, RF-06, RF-10, RF-13)
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
- **Erros:** `400` transição de status inválida, `403` perfil sem permissão de mover card.

---

### 4.3 Materiais (RF-06)

#### 8. `GET /api/obras/{id}/materiais`
- **Descrição:** Lista os materiais vinculados à obra e sua situação logística (comprado, em trânsito, disponível).
- **Perfis:** Todos os perfis autenticados
- **Saída (200):**
```json
[
  { "id": 501, "tipo": "Painel Solar 550W", "quantidade": 45, "statusLogistico": "EmTransito" },
  { "id": 502, "tipo": "Inversor 5kW", "quantidade": 2, "statusLogistico": "Disponivel" }
]
```

#### 9. `POST /api/obras/{id}/materiais`
- **Descrição:** Registra um novo material/lote para a obra.
- **Perfis:** `Administrador`, `EngenhariaObras`
- **Entrada:**
```json
{
  "tipo": "Cabo Solar 6mm",
  "quantidade": 200,
  "statusLogistico": "Comprado"
}
```
- **Saída (201):**
```json
{ "id": 503, "tipo": "Cabo Solar 6mm", "quantidade": 200, "statusLogistico": "Comprado", "obraId": 301 }
```

---

### 4.4 Histórico e Comentários (RF-11, RF-12)

#### 10. `GET /api/obras/{id}/historico`
- **Descrição:** Timeline cronológica de alterações de status/dados da obra.
- **Perfis:** Todos os perfis autenticados
- **Saída (200):**
```json
[
  {
    "id": 9001,
    "statusAnterior": "Separado",
    "statusNovo": "EmAndamento",
    "dataAlteracao": "2026-09-20T15:10:00Z",
    "observacao": "Equipe iniciou instalação hoje",
    "usuario": { "id": 12, "nome": "Ana Souza" }
  }
]
```

#### 11. `GET /api/obras/{id}/comentarios` / `POST /api/obras/{id}/comentarios`
- **Descrição:** Lista ou cria comentários vinculados à obra.
- **Perfis:** Todos os perfis autenticados (leitura); escrita para `Administrador`, `EngenhariaObras`, `Financeiro`
- **Entrada (POST):**
```json
{ "descricao": "Cliente confirmou acesso ao telhado para amanhã." }
```
- **Saída (201):**
```json
{
  "id": 701,
  "descricao": "Cliente confirmou acesso ao telhado para amanhã.",
  "dataRegistro": "2026-09-20T15:20:00Z",
  "usuario": { "id": 12, "nome": "Ana Souza" }
}
```

#### 12. `DELETE /api/comentarios/{id}`
- **Descrição:** Exclui um comentário. Restrito a Administrador, conforme regra de bloqueio de edição/exclusão de histórico. (RF-12)
- **Perfis:** `Administrador`
- **Saída:** `204 No Content`
- **Erros:** `403` se o perfil não for Administrador.

---

### 4.5 Equipes e Cronograma / Gantt (UC-03)

#### 13. `GET /api/equipes` / `POST /api/equipes`
- **Descrição:** Lista ou cadastra equipes de instalação, usadas na alocação do Gantt.
- **Perfis:** Leitura para todos; escrita para `Administrador`
- **Entrada (POST):**
```json
{ "nome": "Equipe Sul", "especialidade": "Instalação Residencial" }
```
- **Saída (200 / 201):**
```json
{ "id": 3, "nome": "Equipe Sul", "especialidade": "Instalação Residencial" }
```

#### 14. `GET /api/programacoes`
- **Descrição:** Retorna o cronograma consolidado (visão Gantt) com as alocações de equipe por obra e dia. (RF-07, RF-08)
- **Perfis:** Todos os perfis autenticados
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

#### 15. `POST /api/programacoes`
- **Descrição:** Aloca uma equipe a uma obra em um período. O backend calcula a duração estimada com base na quantidade de painéis (parâmetro configurável, RF-08).
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
  "prioridade": 1
}
```

#### 16. `PUT /api/programacoes/{id}/reordenar`
- **Descrição:** Reordena manualmente uma alocação no Gantt, propagando atrasos em cadeia para as alocações seguintes da mesma equipe e desconsiderando finais de semana no recálculo de datas. (RF-09)
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

---

### 4.6 Homologação (UC-04)

#### 17. `GET /api/obras/{id}/homologacao` / `PUT /api/obras/{id}/homologacao`
- **Descrição:** Consulta e atualiza o andamento do processo de homologação junto à concessionária de energia (parecer de acesso, ART/TRT, prazos de vistoria). (UC-04, RF-17)
- **Perfis:** `Administrador`, `EngenhariaObras`
- **Nota de modelagem:** o MER atual não possui uma tabela dedicada para homologação; os campos abaixo são uma proposta de extensão do modelo de dados (ex.: nova entidade `Homologacao` 1:1 `Obra`) a ser validada com o time de Requisitos/Persistência antes da implementação.
- **Entrada (PUT):**
```json
{
  "parecerAcesso": "Aprovado",
  "artTrt": "Registrado",
  "prazoVistoria": "2026-10-15"
}
```
- **Saída (200):**
```json
{
  "obraId": 301,
  "parecerAcesso": "Aprovado",
  "artTrt": "Registrado",
  "prazoVistoria": "2026-10-15",
  "atualizadoEm": "2026-09-20T16:00:00Z"
}
```

---

### 4.7 Financeiro (UC-05)

#### 18. `GET /api/obras/{id}/relatorio-custo`
- **Descrição:** Retorna o DRE/custo consolidado da obra (mão de obra, insumos e total). (UC-05, RF-14, RF-20)
- **Perfis:** `Financeiro`, `Administrador`
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
- **Erros:** `404` se a obra ainda não possui lançamentos de custo.

#### 19. `GET /api/relatorios/export`
- **Descrição:** Exporta relatório financeiro/operacional em PDF ou Excel, filtrado por período. (RF-15)
- **Perfis:** `Financeiro`, `Administrador`
- **Query params:** `dataInicio`, `dataFim`, `formato` (`pdf` | `xlsx`)
- **Saída (200):** arquivo binário (`Content-Type: application/pdf` ou `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`), sem corpo JSON.

---

### 4.8 Instalador de Campo (UC-06)

#### 20. `GET /api/mobile/{token}`
- **Descrição:** Acesso simplificado e seguro (sem login tradicional) para o instalador de campo consultar os kits do dia e a rota. O `token` é gerado pelo sistema ao alocar a equipe na programação do dia. (UC-06, RF-19)
- **Perfis:** Público via token assinado (sem necessidade de conta de usuário)
- **Saída (200):**
```json
{
  "equipe": "Equipe Sul",
  "data": "2026-10-01",
  "paradas": [
    {
      "obraId": 301,
      "clienteNome": "Rede Alfa Supermercados",
      "endereco": "Av. das Palmeiras, 500 - Campinas/SP",
      "linkNavegacao": "https://maps.google.com/?q=-22.9,-47.06",
      "kits": [
        { "tipo": "Painel Solar 550W", "quantidade": 45 },
        { "tipo": "Inversor 5kW", "quantidade": 2 }
      ]
    }
  ]
}
```
- **Erros:** `401`/`410` token inválido ou expirado.

---

### 4.9 Cronograma público (RF-16)

#### 21. `GET /api/cronograma/compartilhado/{token}`
- **Descrição:** Visualização pública, somente leitura, do cronograma de obras, com filtro de data dinâmico. O `token` é gerado sob demanda por um usuário autenticado. (RF-16)
- **Perfis:** Público via token
- **Query params:** `dataInicio`, `dataFim` (filtro dinâmico aplicado na URL compartilhada)
- **Saída (200):** mesmo formato de `GET /api/programacoes`, sem dados sensíveis de cliente/financeiro.

---

## 5. Próximos passos

- Validar com o time de Requisitos a extensão do MER para a entidade de **Homologação** (rota #17).
- Definir com o time de Backend os nomes exatos dos Controllers/Actions em ASP.NET Core que implementarão cada rota.
- Este documento deve ser atualizado sempre que um novo caso de uso ou requisito for adicionado/alterado.
