# Guia de Dados para QA — Sprint 2
**ZL Engenharia Solar | Backend 1 → QA**

Este documento descreve os dados inseridos via `02_seed.sql` e mapeia cada registro aos cenários de teste que ele cobre. Use como referência na hora de montar os casos de teste.

---

## Credenciais de acesso disponíveis

Todos os usuários têm a mesma senha no ambiente de seed: **`Senha123!`**

| ID | Nome | E-mail | Perfil | Equipe |
|----|------|--------|--------|--------|
| 1 | Carlos Administrador | `admin@zl.com.br` | Administrador | — |
| 2 | Ana Souza | `engenharia@zlengenharia.com` | EngenhariaObras | Equipe 03 |
| 3 | Fernanda Financeiro | `financeiro@zl.com.br` | Financeiro | — |
| 4 | Roberto Leitor | `leitor@zl.com.br` | VisualizadorLeitor | — |
| 5 | Marcos Instalador | `instalador@zl.com.br` | InstaladorCampo | Equipe 03 |
| 6 | Paulo Engenheiro | `paulo.eng@zl.com.br` | EngenhariaObras | Equipe 01 |
| 7 | Julia Engenheira | `julia.eng@zl.com.br` | EngenhariaObras | Equipe 02 |
| 8 | Diego Instalador | `diego.campo@zl.com.br` | InstaladorCampo | Equipe 01 |
| 9 | Beatriz Instaladora | `beatriz.campo@zl.com.br` | InstaladorCampo | Equipe 02 |
| 10 | Lucas Financeiro | `lucas.fin@zl.com.br` | Financeiro | — |

---

## Obras disponíveis no banco

| ID | Cliente | Status atual | Categoria | Painéis | Prazo fim |
|----|---------|-------------|-----------|---------|-----------|
| 301 | Rede Alfa Supermercados | `MaterialComprado` | Comercial | 45 | 2026-10-06 |
| 302 | Indústria Metalúrgica Ramos | `MaterialComprado` | Industrial | 120 | 2026-10-25 |
| 303 | Residencial Vista Verde | `NoDeposito` | Residencial | 24 | 2026-10-14 |
| 304 | Fazenda Santa Maria | `Separado` | Rural | 80 | 2026-10-08 |
| 305 | Hospital São Lucas | `EmAndamento` | Comercial | 96 | 2026-10-02 |
| 306 | Condomínio Solar das Flores | `EmAndamento` | Residencial | 36 | 2026-10-04 |
| 307 | Posto Alvorada Combustíveis | `Concluido` | Comercial | 50 | 2026-09-18 |
| 308 | Granja Silva | `Assistencia` | Manutenção | 30 | 2026-10-12 |
| 309 | Escola Estadual Dom Pedro II | `NoDeposito` | Comercial | 60 | 2026-10-20 |
| 310 | Shopping Bela Vista | `MaterialComprado` | Comercial | 200 | 2026-11-10 |

---

## Mapeamento de cenários de teste

### RF-01 — Autenticação

| Cenário | Dado a usar | Resultado esperado |
|---------|------------|-------------------|
| Login com credenciais válidas | `admin@zl.com.br` / `Senha123!` | Token JWT retornado com perfil `Administrador` |
| Login com credenciais válidas (outro perfil) | `instalador@zl.com.br` / `Senha123!` | Token JWT retornado com perfil `InstaladorCampo` |
| Login com senha errada | qualquer e-mail / `senhaerrada` | HTTP 401 |
| Login com e-mail inexistente | `naoexiste@teste.com` / `Senha123!` | HTTP 401 |

---

### RF-02 — Controle de acesso (RBAC)

| Cenário | Dado a usar | Resultado esperado |
|---------|------------|-------------------|
| Administrador acessa tudo | `admin@zl.com.br` | Sem restrição |
| VisualizadorLeitor tenta criar obra | `leitor@zl.com.br` + `POST /api/obras` | HTTP 403 |
| InstaladorCampo tenta mover card | `instalador@zl.com.br` + `PATCH /api/obras/305/status` | HTTP 403 |
| Financeiro acessa relatório de custo | `financeiro@zl.com.br` + `GET /api/obras/307/relatorio-custo` | HTTP 200 |
| EngenhariaObras acessa relatório de custo | `engenharia@zlengenharia.com` + `GET /api/obras/307/relatorio-custo` | HTTP 403 |

---

### RF-03 e RF-04 — Cadastro e funil Kanban

| Cenário | Dado a usar | Resultado esperado |
|---------|------------|-------------------|
| Listar todas as obras | `GET /api/obras` | 10 obras retornadas |
| Filtrar obras por status `EmAndamento` | `GET /api/obras?status=EmAndamento` | Obras 305 e 306 |
| Filtrar obras por cliente | `GET /api/obras?clienteNome=Hospital` | Obra 305 |
| Mover obra para próxima etapa (transição válida) | Obra 301: `MaterialComprado → NoDeposito` | HTTP 200, histórico criado |
| Mover obra para etapa inválida (pular etapa) | Obra 301: `MaterialComprado → EmAndamento` | HTTP 400 |
| Mover obra já concluída para etapa de início | Obra 307: `Concluido → MaterialComprado` | HTTP 400 |

---

### RF-06 — Materiais

| Cenário | Dado a usar | Resultado esperado |
|---------|------------|-------------------|
| Listar materiais de uma obra | `GET /api/obras/301/materiais` | 3 materiais (Painel 550W, Inversor 5kW, Cabo 6mm) |
| Listar materiais de obra sem materiais cadastrados | `GET /api/obras/310/materiais` | Lista vazia `[]` |
| Cadastrar novo material | `POST /api/obras/309/materiais` com payload válido | HTTP 201 |

---

### RF-07 e RF-08 — Cronograma Gantt

| Cenário | Dado a usar | Resultado esperado |
|---------|------------|-------------------|
| Listar cronograma completo | `GET /api/programacoes` | 10 alocações retornadas |
| Filtrar por equipe | `GET /api/programacoes?equipeId=1` | Programações 601, 602, 607 |
| Alocar equipe em nova obra | `POST /api/programacoes` com obraId 310, equipeId 5 | HTTP 201 com `duracaoEstimadaDias` calculada |

---

### RF-09 — Reordenação com propagação

| Cenário | Dado a usar | Resultado esperado |
|---------|------------|-------------------|
| Reordenar alocação sem afetar outras | Programação 607 (Equipe 01, única no período) | HTTP 200, `programacoesAfetadas: []` |
| Reordenar e propagar atraso | Programação 601 (Equipe 01, seguida pela 602) | 602 deve ser empurrada para depois da nova data de 601 |

---

### RF-11 e RF-12 — Histórico e comentários

| Cenário | Dado a usar | Resultado esperado |
|---------|------------|-------------------|
| Ver timeline completa de uma obra | `GET /api/obras/305/historico` | 4 registros (criação → NoDeposito → Separado → EmAndamento) |
| Ver timeline de obra recém-criada | `GET /api/obras/301/historico` | 1 registro (criação) |
| Criar comentário | `POST /api/obras/303/comentarios` com descrição | HTTP 201 |
| Excluir comentário com perfil Administrador | `DELETE /api/comentarios/710` com token admin | HTTP 204 |
| Excluir comentário com perfil EngenhariaObras | `DELETE /api/comentarios/710` com token engenharia | HTTP 403 |

---

### RF-14 e RF-20 — Relatório de custos

| Cenário | Dado a usar | Resultado esperado |
|---------|------------|-------------------|
| Obra com custo cadastrado | `GET /api/obras/307/relatorio-custo` | `custoMaoObra: 9200`, `custoInsumos: 22500`, `custoTotal: 31700` |
| Obra sem custo ainda (não existe na tabela) | criar obra nova e buscar relatório | HTTP 404 |

---

### RF-17 — Homologação

| Cenário | Dado a usar | Resultado esperado |
|---------|------------|-------------------|
| Consultar homologação aprovada | `GET /api/obras/301/homologacao` | `parecerAcesso: Aprovado`, `artTrt: ART-2026-0301` |
| Consultar homologação pendente | `GET /api/obras/302/homologacao` | `parecerAcesso: Pendente` |
| Atualizar status da homologação | `PUT /api/obras/302/homologacao` com `parecerAcesso: EmAnalise` | HTTP 200 com dados atualizados |

---

## Estados de tela importantes para o Design/Frontend

| Estado | Onde encontrar no seed |
|--------|----------------------|
| **Lista vazia** | Filtrar obras por status `Separado` → só obra 304 → filtrar ainda mais por categoria `Residencial` → lista vazia |
| **Obra em andamento** | Obras 305 e 306 |
| **Obra concluída** | Obra 307 |
| **Assistência/manutenção** | Obra 308 |
| **Cronograma cheio** | Equipe 01 tem 3 obras alocadas (601, 602, 607) |
| **Homologação aprovada** | Obras 301, 304, 305, 307 |
| **Homologação pendente** | Obras 302, 308, 309, 310 |

---

## Como subir o banco localmente

```bash
# Na raiz do projeto
docker-compose up db

# O banco já sobe com schema + seed automático
# Para checar se funcionou:
docker exec -it <nome_container_db> psql -U <DB_USER> -d <DB_NAME> -c "SELECT id, status, categoria FROM obra;"
```

Qualquer dúvida sobre os dados, fala com o **Backend 1**.
