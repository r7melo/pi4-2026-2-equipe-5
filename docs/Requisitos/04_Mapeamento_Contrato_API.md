# Mapeamento do Contrato de API aos Requisitos

**ZL Engenharia - Especificação de Requisitos de Software v1.1**

## Controle do Documento

| Campo | Valor |
| --- | --- |
| Documento | Complementar às partes 1, 2 e 3 da especificação |
| Data | 05/10/2026 |
| Projeto | Projeto Integrador IV (UFC) |
| Cliente | ZL Engenharia |
| Fonte analisada | Contrato_API.md (21 linhas de rota, 24 operações) |
| Documentos relacionados | [Requisitos Funcionais e Não Funcionais](01_Requisitos_Funcionais_e_Nao_Funcionais.md); [Casos de Uso](02_Casos_de_Uso.md); [Regras de Negócio](03_Regras_de_Negocio.md) |

## 1. Resumo

As rotas do contrato foram cruzadas com os RF, UC, RN e RNF da v1.1. O contrato cita a numeração antiga de casos de uso (UC-01 a UC-06). Os UCs de cada rota foram refeitos pela descrição de cada rota, conforme a seção 3.

Situação das 24 operações:

- Coberta: 5
- Parcial: 5
- Ajustar: 11
- Diverge: 1
- Fora de escopo: 2

Situação dos 20 RFs no contrato:

- Coberta: 4
- Parcial: 12
- Sem rota: 1
- Diverge: 1
- Fora de escopo: 1
- Sem API: 1

Casos de uso sem nenhuma rota: UC-05, UC-06, UC-07, UC-08, UC-09, UC-11, UC-14, UC-16, UC-23, UC-25.

Legenda da situação das rotas:

- Coberta: a rota atende o requisito como escrito.
- Parcial: atende parte do requisito e falta algo.
- Ajustar: existe, mas diverge em perfil, campos, erros ou regra.
- Diverge: contradiz a especificação.
- Fora de escopo: o requisito é Won't na v1.1.

## 2. Mapeamento rota → requisitos

| # | Operação | RF | UC | RN | RNF | Situação | Divergências |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `POST /api/auth/login` | [RF-01](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-01) | [UC-01](02_Casos_de_Uso.md#uc-01), [UC-02](02_Casos_de_Uso.md#uc-02) | [RN-04](03_Regras_de_Negocio.md#rn-04) | [RNF-02](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rnf-02), [RNF-03](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rnf-03) | Parcial | [D-06](#d-06) |
| 2 | `GET /api/auth/me` | [RF-01](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-01), [RF-02](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-02) | [UC-03](02_Casos_de_Uso.md#uc-03), [UC-04](02_Casos_de_Uso.md#uc-04) | [RN-04](03_Regras_de_Negocio.md#rn-04) | [RNF-03](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rnf-03) | Coberta | - |
| 3 | `POST /api/obras` | [RF-03](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-03), [RF-04](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-04) | [UC-10](02_Casos_de_Uso.md#uc-10), [UC-15](02_Casos_de_Uso.md#uc-15), [UC-20](02_Casos_de_Uso.md#uc-20) | [RN-03](03_Regras_de_Negocio.md#rn-03) | - | Ajustar | [D-04](#d-04), [D-05](#d-05), [D-08](#d-08), [D-12](#d-12) |
| 4 | `GET /api/obras` | [RF-04](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-04) | - | - | - | Ajustar | [D-02](#d-02) |
| 5 | `GET /api/obras/{id}` | [RF-03](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-03), [RF-04](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-04) | [UC-24](02_Casos_de_Uso.md#uc-24) | [RN-04](03_Regras_de_Negocio.md#rn-04) | - | Ajustar | [D-02](#d-02) |
| 6 | `PUT /api/obras/{id}` | [RF-04](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-04) | [UC-17](02_Casos_de_Uso.md#uc-17) | - | - | Ajustar | [D-07](#d-07) |
| 7 | `PATCH /api/obras/{id}/status` | [RF-04](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-04), [RF-10](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-10), [RF-13](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-13) | [UC-12](02_Casos_de_Uso.md#uc-12), [UC-18](02_Casos_de_Uso.md#uc-18), [UC-20](02_Casos_de_Uso.md#uc-20) | [RN-05](03_Regras_de_Negocio.md#rn-05) | [RNF-04](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rnf-04) | Ajustar | [D-05](#d-05), [D-10](#d-10) |
| 8 | `GET /api/obras/{id}/materiais` | [RF-06](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-06) | [UC-17](02_Casos_de_Uso.md#uc-17) | - | - | Coberta | [D-02](#d-02) |
| 9 | `POST /api/obras/{id}/materiais` | [RF-06](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-06) | [UC-17](02_Casos_de_Uso.md#uc-17) | - | - | Parcial | [D-11](#d-11) |
| 10 | `GET /api/obras/{id}/historico` | [RF-11](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-11) | [UC-20](02_Casos_de_Uso.md#uc-20) | [RN-05](03_Regras_de_Negocio.md#rn-05) | [RNF-04](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rnf-04) | Ajustar | [D-12](#d-12) |
| 11a | `GET /api/obras/{id}/comentarios` | [RF-11](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-11) | [UC-19](02_Casos_de_Uso.md#uc-19) | - | - | Coberta | [D-02](#d-02) |
| 11b | `POST /api/obras/{id}/comentarios` | [RF-04](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-04), [RF-11](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-11) | [UC-19](02_Casos_de_Uso.md#uc-19) | - | - | Ajustar | [D-13](#d-13) |
| 12 | `DELETE /api/comentarios/{id}` | [RF-12](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-12) | [UC-20](02_Casos_de_Uso.md#uc-20) | [RN-05](03_Regras_de_Negocio.md#rn-05) | [RNF-04](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rnf-04) | Parcial | [D-14](#d-14) |
| 13a | `GET /api/equipes` | [RF-07](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-07) | [UC-21](02_Casos_de_Uso.md#uc-21) | - | - | Coberta | - |
| 13b | `POST /api/equipes` | [RF-07](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-07) | [UC-21](02_Casos_de_Uso.md#uc-21) | - | - | Ajustar | [D-15](#d-15) |
| 14 | `GET /api/programacoes` | [RF-07](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-07), [RF-08](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-08) | [UC-22](02_Casos_de_Uso.md#uc-22) | [RN-01](03_Regras_de_Negocio.md#rn-01), [RN-02](03_Regras_de_Negocio.md#rn-02) | - | Ajustar | [D-02](#d-02), [D-16](#d-16) |
| 15 | `POST /api/programacoes` | [RF-07](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-07), [RF-08](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-08), [RF-10](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-10) | [UC-22](02_Casos_de_Uso.md#uc-22), [UC-13](02_Casos_de_Uso.md#uc-13) | [RN-01](03_Regras_de_Negocio.md#rn-01), [RN-02](03_Regras_de_Negocio.md#rn-02) | - | Ajustar | [D-16](#d-16), [D-17](#d-17) |
| 16 | `PUT /api/programacoes/{id}/reordenar` | [RF-09](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-09) | [UC-22](02_Casos_de_Uso.md#uc-22) | [RN-02](03_Regras_de_Negocio.md#rn-02) | - | Coberta | - |
| 17a | `GET /api/obras/{id}/homologacao` | [RF-17](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-17) | - | - | - | Fora de escopo | [D-03](#d-03) |
| 17b | `PUT /api/obras/{id}/homologacao` | [RF-17](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-17) | - | - | - | Fora de escopo | [D-03](#d-03) |
| 18 | `GET /api/obras/{id}/relatorio-custo` | [RF-14](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-14), [RF-20](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-20) | - | [RN-03](03_Regras_de_Negocio.md#rn-03) | [RNF-04](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rnf-04) | Ajustar | [D-18](#d-18) |
| 19 | `GET /api/relatorios/export` | [RF-15](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-15) | - | - | [RNF-05](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rnf-05) | Parcial | [D-19](#d-19) |
| 20 | `GET /api/mobile/{token}` | [RF-19](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-19) | [UC-24](02_Casos_de_Uso.md#uc-24), [UC-26](02_Casos_de_Uso.md#uc-26) | [RN-04](03_Regras_de_Negocio.md#rn-04) | [RNF-01](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rnf-01) | Diverge | [D-01](#d-01) |
| 21 | `GET /api/cronograma/compartilhado/{token}` | [RF-16](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-16) | - | - | - | Parcial | [D-20](#d-20) |

## 3. Renumeração dos casos de uso do contrato

| UC citado no contrato | Correspondência na v1.1 |
| --- | --- |
| UC-01 (cadastrar obra / contrato) | UC-10; inclui UC-15 e UC-20; edição em UC-17 |
| UC-02 (Kanban) | UC-12, UC-17, UC-18, UC-19 |
| UC-03 (equipes e Gantt) | UC-13, UC-21, UC-22 |
| UC-04 (homologação) | Sem UC. RF-17 é Won't (fase futura). Na v1.1 o UC-04 é "Validar Autorização de Acesso". |
| UC-05 (financeiro / DRE) | Sem UC. RF-14 e RF-20 não têm caso de uso. Na v1.1 o UC-05 é "Cadastrar Administrador". |
| UC-06 (instalador mobile) | UC-24, UC-25, UC-26, UC-14. Na v1.1 o UC-06 é "Cadastrar Engenheiro". |

## 4. Cobertura por requisito funcional

| RF | Rotas | Situação | Observação |
| --- | --- | --- | --- |
| [RF-01](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-01) | #1, #2 | Parcial | Sem rota de cadastro de usuários (UC-05, UC-06, UC-07, UC-09). |
| [RF-02](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-02) | #2 (e perfis de cada rota) | Parcial | Sem código 403 no contrato e sem log de acesso negado (RNF-03). RBAC ainda não implementado (§5 do contrato). |
| [RF-03](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-03) | #3, #6 | Parcial | Sem rotas de clientes (UC-08) nem de exclusão lógica de obra (UC-11, UC-16). |
| [RF-04](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-04) | #3, #4, #5, #6, #7, #11b | Coberta | Edição do cartão via #6; comentário via #11b. |
| [RF-05](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-05) | - | Sem rota | Nenhuma rota de manutenção (UC-25, UC-14). Só existe o status `Assistencia` no funil. |
| [RF-06](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-06) | #8, #9 | Parcial | Sem rota para atualizar o status logístico de um material. |
| [RF-07](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-07) | #13a, #13b, #14, #15 | Parcial | Equipe sem instaladores e sem responsável; escrita só para Administrador. |
| [RF-08](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-08) | #14, #15 | Coberta | Duração calculada pelo backend (RN-01). Exemplos do contrato incoerentes (D-16). |
| [RF-09](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-09) | #16 | Coberta | Propagação em cadeia na mesma equipe. |
| [RF-10](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-10) | #7, #15 | Parcial | A sincronização Gantt → Kanban não está descrita em #15. |
| [RF-11](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-11) | #10, #11a, #11b | Parcial | Histórico só registra mudanças de status. |
| [RF-12](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-12) | #12 | Parcial | Só exclusão; sem rota de edição (Administrador). |
| [RF-13](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-13) | #7 | Coberta | Dispara no status `Concluido`; envio ainda não implementado. |
| [RF-14](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-14) | #18 | Parcial | Sem rota de lançamento de custos/precificação; sem validação de obra concluída (RN-03). |
| [RF-15](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-15) | #19 | Parcial | Sem exportação de cronograma e de detalhes da instalação (UC-23). |
| [RF-16](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-16) | #21 | Parcial | Sem rota para gerar o token do link. |
| [RF-17](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-17) | #17a, #17b | Fora de escopo | Won't na v1.1, mas o contrato prevê as rotas. |
| [RF-18](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-18) | - | Sem API | Funcionalidade somente de interface (tela cheia). |
| [RF-19](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-19) | #20 | Diverge | Rota pública por token em vez de login; sem manutenção, projeto e instruções. |
| [RF-20](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-20) | #18 | Parcial | Mesma rota do RF-14; resposta sem receita/resultado. |

## 5. Cobertura por caso de uso

| UC | Rotas | Situação |
| --- | --- | --- |
| [UC-01](02_Casos_de_Uso.md#uc-01) | #1 | Coberto |
| [UC-02](02_Casos_de_Uso.md#uc-02) | #1 | Coberto |
| [UC-03](02_Casos_de_Uso.md#uc-03) | #2 | Coberto |
| [UC-04](02_Casos_de_Uso.md#uc-04) | #2 (validação em todas as rotas) | Parcial |
| [UC-05](02_Casos_de_Uso.md#uc-05) | - | Sem rota |
| [UC-06](02_Casos_de_Uso.md#uc-06) | - | Sem rota |
| [UC-07](02_Casos_de_Uso.md#uc-07) | - | Sem rota |
| [UC-08](02_Casos_de_Uso.md#uc-08) | - (cliente criado dentro de #3) | Sem rota |
| [UC-09](02_Casos_de_Uso.md#uc-09) | - | Sem rota |
| [UC-10](02_Casos_de_Uso.md#uc-10) | #3 | Coberto |
| [UC-11](02_Casos_de_Uso.md#uc-11) | - | Sem rota |
| [UC-12](02_Casos_de_Uso.md#uc-12) | #7 | Coberto |
| [UC-13](02_Casos_de_Uso.md#uc-13) | #15 | Parcial |
| [UC-14](02_Casos_de_Uso.md#uc-14) | - | Sem rota |
| [UC-15](02_Casos_de_Uso.md#uc-15) | #3 (implícito) | Parcial |
| [UC-16](02_Casos_de_Uso.md#uc-16) | - | Sem rota |
| [UC-17](02_Casos_de_Uso.md#uc-17) | #6, #8, #9 | Parcial |
| [UC-18](02_Casos_de_Uso.md#uc-18) | #7 | Coberto |
| [UC-19](02_Casos_de_Uso.md#uc-19) | #11a, #11b | Coberto |
| [UC-20](02_Casos_de_Uso.md#uc-20) | #7, #10 (implícito em #3) | Parcial |
| [UC-21](02_Casos_de_Uso.md#uc-21) | #13a, #13b | Parcial |
| [UC-22](02_Casos_de_Uso.md#uc-22) | #14, #15, #16 | Coberto |
| [UC-23](02_Casos_de_Uso.md#uc-23) | - | Sem rota |
| [UC-24](02_Casos_de_Uso.md#uc-24) | #5, #20 | Parcial |
| [UC-25](02_Casos_de_Uso.md#uc-25) | - | Sem rota |
| [UC-26](02_Casos_de_Uso.md#uc-26) | #20 (campo `linkNavegacao`) | Parcial |

## 6. Requisitos sem rota (rotas sugeridas)

As rotas abaixo são sugestões para fechar as lacunas, e os nomes devem ser validados com o time de Backend.

| Requisito | Lacuna | Rota sugerida |
| --- | --- | --- |
| [RF-01](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-01), [UC-05](02_Casos_de_Uso.md#uc-05), [UC-06](02_Casos_de_Uso.md#uc-06), [UC-07](02_Casos_de_Uso.md#uc-07), [UC-09](02_Casos_de_Uso.md#uc-09) | Cadastro de usuários e perfis, incluindo ativar/inativar (UC-01 FA2) | `POST /api/usuarios` (Administrador) |
| [RF-03](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-03), [UC-08](02_Casos_de_Uso.md#uc-08) | Cadastro de clientes | `GET /api/clientes`, `POST /api/clientes` |
| [RF-03](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-03), [UC-11](02_Casos_de_Uso.md#uc-11), [UC-16](02_Casos_de_Uso.md#uc-16) | Exclusão lógica de obra e do cartão | `DELETE /api/obras/{id}` (Administrador, Engenharia) |
| [RF-07](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-07), [UC-21](02_Casos_de_Uso.md#uc-21) | Instaladores e responsável da equipe | estender `POST /api/equipes` com `instaladorIds` e `responsavelId` |
| [RF-19](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-19), [UC-24](02_Casos_de_Uso.md#uc-24) | Lista e detalhe das instalações da equipe do instalador logado, com projeto e instruções | `GET /api/instalacoes`, `GET /api/instalacoes/{obraId}` |
| [RF-05](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-05), [RF-19](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-19), [UC-25](02_Casos_de_Uso.md#uc-25), [UC-14](02_Casos_de_Uso.md#uc-14) | Manutenções: listar, concluir e comentar | `GET /api/manutencoes`, `PATCH /api/manutencoes/{id}/concluir`, `POST /api/manutencoes/{id}/comentarios` |
| [RF-15](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-15), [UC-23](02_Casos_de_Uso.md#uc-23) | Exportar detalhes da instalação (Administrador) | `GET /api/obras/{id}/instalacao/export` |
| [RF-06](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-06) | Atualizar status logístico do material | `PATCH /api/materiais/{id}` |
| [RF-12](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-12) | Editar comentário (Administrador) | `PUT /api/comentarios/{id}` |
| [RF-16](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-16) | Gerar token do link compartilhável | `POST /api/cronograma/compartilhado` |
| [RF-14](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-14), [RF-20](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-20) | Registrar custos e precificação da obra | `POST /api/obras/{id}/custos` |

## 7. Divergências

| ID | Gravidade | Onde | Descrição |
| --- | --- | --- | --- |
| <a id="d-01"></a>**D-01** | Crítica | Rota #20 (instalador sem login) | O contrato dá acesso ao Instalador por token público, "sem necessidade de conta de usuário". Na v1.1 o Instalador é usuário cadastrado, com login e senha (RF-01, RF-19, RN-04, UC-01, UC-03, UC-09). A rota #20 precisa de JWT e deve devolver só as instalações da equipe do usuário (UC-24 RN1). É o mesmo erro corrigido na v1.1 (Apêndice B do HTML). |
| <a id="d-02"></a>**D-02** | Crítica | Perfis e leitura aberta | O contrato lista o perfil `VisualizadorLeitor`, removido na v1.1. Os perfis válidos são `Administrador`, `Engenharia`, `Financeiro` e `InstaladorCampo`. Além disso, as rotas #4, #5, #8, #10, #11a e #14 estão abertas a "todos os perfis", o que deixa o Instalador ver obras, Kanban e Gantt de outras equipes. RN-04 e UC-24 RN1 restringem o Instalador às instalações da sua equipe. |
| <a id="d-03"></a>**D-03** | Crítica | Rotas #17a e #17b (homologação) | RF-17 é Won't e a homologação está fora do escopo desta fase (seção 1.2 do HTML, entrevista com o cliente). As rotas não devem ser implementadas agora. O próprio contrato já marca a entidade como proposta, sem MER. |
| <a id="d-04"></a>**D-04** | Alta | Rota #3 (cliente implícito) | `POST /api/obras` cadastra um cliente novo quando o `clienteId` não existe (§5 do contrato). O UC-10 exige cliente já cadastrado e usa o UC-08 para cadastrar, e a RN-03 exige vínculo obrigatório. Faltam as rotas de clientes. |
| <a id="d-05"></a>**D-05** | Alta | Fluxo de status (#3 e #7) | O funil do contrato é `MaterialComprado → NoDeposito → Separado → EmAndamento → Concluido`, com `Assistencia`. O UC-12 RN1 define o fluxo como pagamento, compra/chegada de material, programação e execução. O contrato não tem etapa de pagamento nem de programação. A v1.1 também não nomeia as colunas do Kanban, então é preciso definir a lista oficial e atualizar UC-12 e contrato juntos. |
| <a id="d-06"></a>**D-06** | Média | Erros de login e 403 | UC-01 prevê bloqueio após 5 tentativas (FA3, RN2) e usuário inativo (FA2), e o contrato não tem código para nenhum dos dois. A tabela de erros (§2.1) também não tem `403`, embora as rotas o usem (RF-02 "Acesso Proibido", RNF-03). |
| <a id="d-07"></a>**D-07** | Média | Rota #6 (editar obra) | O RF-03 não prevê edição de obra. O UC-17 permite editar só título, descrição, responsável e datas, e o contrato edita cidade e prazo contratual. |
| <a id="d-08"></a>**D-08** | Média | Campos de `POST /api/obras` | O UC-10 pede cliente, endereço da obra, descrição e dados do projeto. O contrato envia cidade, `quantidadePaineis`, datas e `pagamento.prazoContratualDias`, sem endereço nem descrição. O endereço é necessário para o UC-26 (RN1). |
| <a id="d-09"></a>**D-09** | Média | Pagamento sem requisito | O contrato e o MER têm `Pagamento` (`dataConfirmacao`, `prazoContratualDias`), mas nenhum RF ou UC da v1.1 cobre pagamento. Ele só aparece como etapa do fluxo (UC-12 RN1) e na precificação da RN-03. |
| <a id="d-10"></a>**D-10** | Baixa | Rota #7 cita RF-06 | O RF-06 trata do status do material (#8 e #9), não da movimentação do card. Além disso, a movimentação do Kanban deveria refletir no Gantt (RF-10). |
| <a id="d-11"></a>**D-11** | Média | Materiais (#8 e #9) | Não há rota para atualizar o `statusLogistico`. O RF-06 fala de painéis e inversores, mas o contrato aceita qualquer tipo. Os valores `Comprado`, `EmTransito` e `Disponivel` devem seguir os rótulos do RF-06 (comprado, em trânsito, disponível no depósito). O status `NoDeposito` do funil parece sobrepor "disponível no depósito". |
| <a id="d-12"></a>**D-12** | Média | Histórico (#10) | O histórico só guarda `statusAnterior` e `statusNovo`. O RF-11 e o UC-20 exigem registro de cadastro de obra (UC-10), comentários e manutenções concluídas (UC-25 RN2), e o contrato não indica essa gravação em #3, #11b nem em manutenções. |
| <a id="d-13"></a>**D-13** | Média | Comentários (#11b) | O contrato permite escrita a Administrador, Engenharia e Financeiro. O UC-19 lista só Administrador e Engenharia, e a seção 2.3 do HTML inclui o Financeiro, então os documentos divergem entre si. O comentário de manutenção do Instalador (UC-14) não tem rota. |
| <a id="d-14"></a>**D-14** | Baixa | Rota #12 | Só existe exclusão. O RF-12 e a RN-05 também permitem edição por Administrador, sem rota correspondente. |
| <a id="d-15"></a>**D-15** | Alta | Equipes (#13b) | O contrato limita a escrita ao Administrador, mas RF-02 e UC-21 autorizam também Engenharia. O payload (`nome`, `especialidade`) não leva instaladores nem responsável, exigidos pelo UC-21 RN1, e não trata a RN2 (instalador em duas equipes no mesmo período). |
| <a id="d-16"></a>**D-16** | Média | Exemplos de #14 e #15 | A obra 301 tem 45 painéis, o que daria 45 ÷ 9 = 5 dias pela RN-01, mas os exemplos mostram `duracaoEstimadaDias` 2,5. O `dataFim` 2026-10-03 é um sábado, e a RN-02 não conta fins de semana. |
| <a id="d-17"></a>**D-17** | Média | Erros de alocação (#15) | Não há código para conflito de agenda (RN-02, UC-22 FA1) nem para obra não apta à instalação (UC-22 FA2, UC-13 RN1). |
| <a id="d-18"></a>**D-18** | Alta | Rota #18 (custo/DRE) | A RN-03 só permite apurar custo e DRE de obra concluída com precificação completa, e o contrato só prevê `404` sem lançamentos. RF-14 e RF-20 usam a mesma rota, e a resposta não traz receita nem resultado. Falta uma rota para registrar custos e precificação (RNF-04 exige log de alterações financeiras). |
| <a id="d-19"></a>**D-19** | Média | Rota #19 (exportação) | O RF-15 cobre relatórios financeiros e cronogramas, mas a rota não tem parâmetro de tipo. A exportação dos detalhes da instalação (UC-23, só Administrador) não tem rota. |
| <a id="d-20"></a>**D-20** | Média | Rota #21 (link compartilhável) | O token é "gerado sob demanda por um usuário autenticado", mas não há rota para gerar o token. O mesmo vale para o token da rota #20, que deixa de existir ao resolver D-01. |
| <a id="d-21"></a>**D-21** | Alta | Referências do contrato | O contrato cita UC-01 a UC-06 (numeração antiga), RNF-01 a RNF-08 (a v1.1 tem RNF-01 a RNF-05) e PDFs. A coluna "UC / RF" do §3 deve ser trocada pela renumeração da seção 3 deste documento. |
| <a id="d-22"></a>**D-22** | Informativa | Status de implementação (§5) | As rotas #1 a #10 estão sem JWT/RBAC e com dados em memória, o que ainda não atende RF-02 e RNF-03 (100% das rotas protegidas). O envio de e-mail do RF-13 também não está implementado. |
