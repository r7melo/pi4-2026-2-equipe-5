# Definição dos Dados de Carga Inicial (QA + Backend 1)

**ZL Engenharia Solar | QA - Equipe 5**
**Responsável QA:** Luis | **Responsável Backend 1:** a preencher
**Base:** `database/01_schema.sql`, `database/02_seed.sql`, `database/GUIA_QA.md`
**Proposta de complemento:** `docs/qa/proposta_03_seed_qa.sql`

---

## 1. Objetivo

Registrar quais dados de carga inicial são necessários para executar os casos de teste CT-01 a CT-05 (documento 01), o que o seed atual já cobre, as inconsistências encontradas e o que precisa ser adicionado ou decidido junto ao Backend 1.

## 2. Mapa caso de teste x dados do seed

| Caso | Dados necessários | Registros do seed | Cobre? |
|------|-------------------|-------------------|--------|
| CT-01 | 1 usuário por perfil com senha conhecida; e-mail inexistente | usuários 1 a 10 (`Senha123!`) | Sim, desde que o hash seja confirmado (D-01) |
| CT-02 | Tokens de leitor, instalador, engenharia, financeiro e admin; obra em andamento; obra com custo; comentário para exclusão | usuários 1 a 5; obras 305 e 307; comentário 710 | Sim, com dependência de ordem no comentário 710 (D-09) |
| CT-03 | Obra no início do funil com 1 registro de histórico; obra concluída | obras 301 e 307; histórico 9001 | Sim |
| CT-04 | Obra sem programação; equipe livre; equipe com alocação conhecida para gerar conflito | obra 310 (já tem programação 608); equipe 05 livre; equipe 01 com 601, 602 e 607 | Parcial (D-02, D-03, D-04) |
| CT-05 | Obra concluída com custo; obra sem custo | obra 307 com custo; nenhuma obra sem custo | Parcial (D-06) |

## 3. Inconsistências encontradas no seed

| ID | Item | Situação atual | Impacto nos testes | Proposta |
|----|------|----------------|--------------------|----------|
| D-01 | Hash de senha | Todos os usuários usam o mesmo hash bcrypt `$2b$12$LQv3c1...`. O QA não conseguiu confirmar localmente que ele corresponde a `Senha123!` | Se não corresponder, todo o CT-01 e todos os testes autenticados ficam bloqueados | Backend 1 confirma com `BCrypt.Verify("Senha123!", hash)` ou gera o hash novamente com a mesma biblioteca usada na API |
| D-02 | `duracao_estimada_dias` (RF-08) | Valores não seguem a regra de 9 painéis/dia usada no frontend. Ex.: 601 (45 painéis) = 2,0 (regra: 5); 602 (120) = 4,0 (regra: 14); 608 (200) = 14,0 (regra: 23) | Impossível definir resultado esperado para cálculo de duração e propagação | Definir a fórmula oficial (divisor e arredondamento) e recalcular as 10 programações |
| D-03 | Datas em fim de semana (RF-09) | 601, 602, 604, 606, 607 e 608 terminam em sábado; 610 termina em domingo; 609 ocorre inteira em sábado/domingo (10 e 11/10/2026) | Contradiz a regra "desconsiderar finais de semana"; o recálculo do backend vai divergir do seed | Ajustar para dias úteis (ver seção 4 da proposta SQL) |
| D-04 | Resultado esperado do RF-09 | O guia diz apenas "602 deve ser empurrada" | Teste sem valor de comparação | Fixar: reordenar 601 para 2026-10-05 resulta em 601 = 05/10 a 06/10; 602 = 07/10 a 12/10; 607 sem alteração (considerando durações de 2 e 4 dias úteis) |
| D-05 | Histórico incompleto (RF-11, RNF-04) | Obras 306, 307 e 308 têm só a última transição; 309 e 310 não têm nenhum registro, nem o de criação; 308 vai de `Concluido` para `Assistencia` sem registro de conclusão | Timeline mostra obras "pulando" etapas; quebra o teste de ordenação do histórico | Incluir registros de criação para 309 e 310 (proposta SQL) e completar 306 a 308 |
| D-06 | Custo de obras não concluídas (RF-14) | `relatorio_custo` tem linha para as 10 obras, inclusive as que nem começaram | Não existe obra para o cenário 404; conflito com a pré-condição "obra concluída" do RF-14 | Decidir: (a) manter custos parciais e o endpoint aceita qualquer obra, ou (b) só obras 307 e 308 têm custo. A proposta SQL cria a obra 316 sem custo, que atende aos dois casos |
| D-07 | Programação x status do Kanban (RF-10) | Hoje é 04/10/2026: 601 (obra 301) e 605 (obra 304) já começaram no Gantt, mas as obras continuam em `MaterialComprado` e `Separado`. 604 aloca obra 305 em 07/10, embora ela esteja em andamento desde 26/09. Obra 302 está em duas programações (602 e 610) | Testes futuros de RF-10 vão dar resultados contraditórios | Backend 1 revisar datas das programações para ficarem coerentes com o status de cada obra |
| D-08 | Materiais para o DRE (RF-20) | Obra 307 só tem painéis; não há cabos nem disjuntores. O schema não tem quantidade comprada x utilizada nem custo unitário | `balancoMateriais` do contrato não pode ser testado; fluxo alternativo do RF-14 ("dados de precificação incompletos") também não | Curto prazo: adicionar cabo e disjuntor à obra 307 (proposta SQL). Médio prazo: avaliar colunas `quantidade_utilizada` e `custo_unitario` na tabela `material` |
| D-09 | Comentário 710 usado em dois testes | O teste de exclusão com admin (204) apaga o mesmo registro usado no teste de bloqueio (403) | Ordem de execução influencia o resultado | Criar comentário 712 só para o teste de exclusão pelo admin |
| D-10 | Cliente do cadastro de obra | Frontend envia `clienteId: 45`; seed só tem clientes 1 a 10 | Com backend real o cadastro (RF-03) falha por chave estrangeira | Backend 1 decide: criar cliente pelo `clienteNome` quando não houver `clienteId`, ou frontend passa a escolher cliente existente |
| D-11 | Cadeia para RF-09 | Backlog do QA pede "cadeia de 5 obras dependentes"; seed tem no máximo 3 por equipe | Teste de propagação em cascata incompleto | Criar obras 311 a 315 encadeadas na Equipe 06 (proposta SQL) |
| D-12 | Estado de lista vazia | Guia usa filtro por `categoria`, mas o contrato de `GET /api/obras` só tem `status` e `clienteNome` | Cenário não executável pela API | Usar `GET /api/obras?clienteNome=inexistente` ou incluir `categoria` no contrato |
| D-13 | Expiração de sessão (RF-01) | Não existe variável de ambiente para o tempo de expiração do JWT | Teste de expiração de login (backlog do QA) exige esperar o tempo real | Criar `JWT_EXPIRES_MINUTES` no `env.example`; no ambiente de QA usar 2 minutos |
| D-14 | Endereço para rota (RF-19) | Tabelas `cliente` e `obra` não têm endereço nem coordenadas | Botão de rota do link mobile não tem dado real | Avaliar coluna `endereco` em `obra` ou `cliente` |

## 4. Dados adicionais propostos

Detalhados em `docs/qa/proposta_03_seed_qa.sql`. O arquivo **não** foi colocado em `database/` de propósito: tudo que está lá roda automaticamente no `docker compose up`, então a inclusão deve ser decidida pelo Backend 1.

| Registro | Finalidade | Caso de teste |
|----------|-----------|---------------|
| Clientes 11 a 16 | Clientes das novas obras | - |
| Obras 311 a 315 (Separado, 18/27/9/18/36 painéis) | Cadeia de 5 programações na Equipe 06 | RF-09 (futuro CT) |
| Obra 316 (MaterialComprado, 90 painéis, sem programação e sem custo) | Alocação limpa no Gantt e cenário 404 de custo | CT-04, CT-05 |
| Pagamento e homologação das obras 311 a 316 | Manter 1:1 com obra | - |
| Programações 611 a 615 (Equipe 06, 19/10 a 03/11, só dias úteis) | Cadeia para propagação | RF-09 |
| Histórico de criação para obras 309, 310 e 311 a 316 | Timeline consistente | RF-11 |
| Comentário 712 (obra 303, autor Ana Souza) | Teste de exclusão pelo admin sem afetar o 710 | CT-02 |
| Materiais 516 e 517 (cabo e disjuntor da obra 307) | Balanço de materiais do DRE | CT-05 / RF-20 |

### Resultado esperado da cadeia (RF-09)

Reordenar a programação 611 para começar em 2026-10-21 (2 dias úteis depois):

| Programação | Duração (dias úteis) | Antes | Depois (só sábado/domingo) | Depois (com feriado 02/11) |
|-------------|----------------------|-------|----------------------------|----------------------------|
| 611 | 2 | 19/10 a 20/10 | 21/10 a 22/10 | 21/10 a 22/10 |
| 612 | 3 | 21/10 a 23/10 | 23/10 a 27/10 | 23/10 a 27/10 |
| 613 | 1 | 26/10 | 28/10 | 28/10 |
| 614 | 2 | 27/10 a 28/10 | 29/10 a 30/10 | 29/10 a 30/10 |
| 615 | 4 | 29/10 a 03/11 | 02/11 a 05/11 | 03/11 a 06/11 |

A última coluna só vale se a decisão sobre feriados (pendente no backlog do RF-09) for considerá-los.

## 5. Decisões pendentes com o Backend 1

| # | Pergunta | Decisão | Data |
|---|----------|---------|------|
| 1 | O hash do seed corresponde a `Senha123!`? (D-01) | | |
| 2 | Fórmula oficial do RF-08: divisor e arredondamento (D-02) | | |
| 3 | Feriados entram no cálculo do RF-09? (D-04) | | |
| 4 | Relatório de custo para obras não concluídas: retorna dado parcial ou 404? (D-06) | | |
| 5 | Inclui a proposta `proposta_03_seed_qa.sql` como `database/03_seed_qa.sql`? | | |
| 6 | Como tratar `clienteId` no cadastro de obra? (D-10) | | |

## 6. Como recarregar o banco para cada rodada de testes

```bash
docker compose down -v
docker compose up --build
```

Conferência rápida depois de subir:

```bash
docker exec -it <nome_container_db> psql -U pi4_user -d pi4_db -c "SELECT status, COUNT(*) FROM obra GROUP BY status ORDER BY status;"
```

Resultado esperado com o seed atual (na ordem do enum): MaterialComprado 3, NoDeposito 2, Separado 1, EmAndamento 2, Concluido 1, Assistencia 1.
