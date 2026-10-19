# 5. MODELO ENTIDADE-RELACIONAMENTO

**Versão 2.1 — Sprint 2 | Sistema de Gestão de Obras (ZL Engenharia Solar)**

Abaixo é apresentado o modelo textual atualizado, refletindo o fluxo de gestão das obras de instalação de sistemas de energia solar, incluindo o acompanhamento de materiais, a programação das obras, o histórico das alterações, os comentários, os usuários e a consolidação dos custos. Esta versão alinha o modelo de dados com a documentação de requisitos canônica (`docs/Requisitos/06-modelo-dados.md`):

- **OBRA**: campos `categoria` (String, opcional: *Residencial*, *Comercial*), `quantidade_paineis` (Int), `quantidade_inversores` (Int, opcional) e `endereco` (String) — necessários para o Kanban, link de rotas no módulo de instaladores (RF-19) e para o cálculo de duração estimada (RF-08).
- **PROGRAMACAO_OBRA**: campo `duracao_estimada_dias` (Decimal) — usado na lógica de reordenação com propagação de atrasos em dias úteis (RF-09).
- **MATERIAL**: campos `quantidade_utilizada` (Int, opcional), `custo_unitario` (Decimal(12,2), opcional) e status logístico (`Comprado`, `EmTransito`, `Disponivel`, `Utilizado`).
- **HISTORICO_OBRA**: campo `tipo_acao` (String: `Cadastro`, `MudancaStatus`, `Comentario`, `ManutencaoConcluida`, `AlteracaoFinanceira`).
- **HOMOLOGAÇÃO (RF-17)**: A entidade `HOMOLOGACAO` e seu relacionamento 1:1 foram retirados do escopo ativo da fase atual, em conformidade com [docs/Requisitos/02-requisitos.md](file:///c:/Users/jakel/Music/Ciência%20da%20Computação/CC%202026.2/PI%20-%20IV/pi4-2026-2-equipe-5/docs/Requisitos/02-requisitos.md).

## 5.1. Relacionamentos principais

- **Cliente** 1:N **Obra**
- **Obra** 1:1 **Pagamento**
- **Obra** 1:N **Material**
- **Obra** 1:N **Comentario**
- **Obra** 1:N **Historico_Obra**
- **Obra** 1:N **Programacao_Obra**
- **Obra** 1:1 **Relatorio_Custo**
- **Equipe** 1:N **Programacao_Obra**
- **Equipe** 1:N **Usuario**
- **Perfil_Acesso** 1:N **Usuario**
- **Usuario** 1:N **Comentario**
- **Usuario** 1:N **Historico_Obra**

## 5.2. Entidades e atributos

### Cliente
| Atributo | Tipo |
|---|---|
| id | Int (Serial) PK |
| nome | String |
| cidade | String, opcional |
| dados_contrato | Text, opcional |

### Equipe
| Atributo | Tipo |
|---|---|
| id | Int (Serial) PK |
| nome | String |
| especialidade | String, opcional |

### Perfil_Acesso
| Atributo | Tipo |
|---|---|
| id | Int (Serial) PK |
| nome_perfil | String (`Administrador`, `Engenharia`, `Financeiro`, `InstaladorCampo`) |
| permissoes | Text, opcional |

### Obra
| Atributo | Tipo |
|---|---|
| id | Int (Serial) PK |
| status | String (`MaterialComprado`, `NoDeposito`, `Separado`, `EmAndamento`, `Concluido`, `Assistencia`) |
| categoria | String, opcional (`Residencial`, `Comercial`) |
| quantidade_paineis | Int |
| quantidade_inversores | Int, opcional |
| endereco | String, opcional |
| data_inicio_estimada | Date, opcional |
| data_fim_estimada | Date, opcional |
| data_inicio_real | Date, opcional |
| data_fim_real | Date, opcional |
| id_cliente | Int, FK > Cliente |

### Pagamento
| Atributo | Tipo |
|---|---|
| id | Int (Serial) PK |
| data_confirmacao | Date |
| prazo_contratual_dias | Int |
| id_obra | Int, FK > Obra, único |

### Material
| Atributo | Tipo |
|---|---|
| id | Int (Serial) PK |
| tipo | String |
| quantidade | Int |
| quantidade_utilizada | Int, opcional |
| custo_unitario | Decimal(12,2), opcional |
| status_logistico | String, opcional (`Comprado`, `EmTransito`, `Disponivel`, `Utilizado`) |
| id_obra | Int, FK > Obra |

### Usuario
| Atributo | Tipo |
|---|---|
| id | Int (Serial) PK |
| nome | String |
| email | String, único |
| senha | String (hash) |
| id_perfil | Int, FK > Perfil_Acesso |
| id_equipe | Int, FK > Equipe, opcional |

### Comentario
| Atributo | Tipo |
|---|---|
| id | Int (Serial) PK |
| descricao | Text |
| data_registro | DateTime, opcional |
| id_obra | Int, FK > Obra |
| id_usuario | Int, FK > Usuario |

### Historico_Obra
| Atributo | Tipo |
|---|---|
| id | Int (Serial) PK |
| tipo_acao | String (`Cadastro`, `MudancaStatus`, `Comentario`, `ManutencaoConcluida`, `AlteracaoFinanceira`) |
| status_anterior | String, opcional |
| status_novo | String |
| data_alteracao | DateTime |
| observacao | Text, opcional |
| id_obra | Int, FK > Obra |
| id_usuario | Int, FK > Usuario |

### Programacao_Obra
| Atributo | Tipo |
|---|---|
| id | Int (Serial) PK |
| data_inicio | Date |
| data_fim | Date |
| prioridade | Int, opcional |
| duracao_estimada_dias | Decimal(5,1), opcional |
| id_obra | Int, FK > Obra |
| id_equipe | Int, FK > Equipe |

### Relatorio_Custo
| Atributo | Tipo |
|---|---|
| id | Int (Serial) PK |
| custo_mao_obra | Decimal, opcional |
| custo_insumos | Decimal, opcional |
| custo_total | Decimal, opcional |
| id_obra | Int, FK > Obra, único |

## 5.3. Resumo das cardinalidades

- **Cliente** 1:N **Obra**
- **Obra** 1:1 **Pagamento**
- **Obra** 1:N **Material**
- **Obra** 1:N **Comentario**
- **Obra** 1:N **Historico_Obra**
- **Obra** 1:N **Programacao_Obra**
- **Obra** 1:1 **Relatorio_Custo**
- **Equipe** 1:N **Programacao_Obra**
- **Equipe** 1:N **Usuario**
- **Perfil_Acesso** 1:N **Usuario**
- **Usuario** 1:N **Comentario**
- **Usuario** 1:N **Historico_Obra**