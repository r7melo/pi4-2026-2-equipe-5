# 5. MODELO ENTIDADE-RELACIONAMENTO

**Versão 2.0 — Sprint 2 | Sistema de Gestão de Obras (ZL Engenharia Solar)**

Abaixo é apresentado o modelo atualizado, refletindo o fluxo de gestão das obras de instalação de sistemas de energia solar, incluindo o acompanhamento de materiais, a programação das obras, o histórico das alterações, os comentários, os usuários e a consolidação dos custos. Esta versão incorpora as seguintes correções em relação à versão anterior (v1.0):

- **OBRA**: adicionados os campos `categoria` (String, opcional) e `quantidade_paineis` (Int) — necessários para o Kanban e para o cálculo de duração da Programação de Obra.
- **PROGRAMACAO_OBRA**: adicionado o campo `duracao_estimada_dias` (Decimal) — usado na lógica de reordenação com propagação de atrasos em dias úteis (RF-09).
- Nova entidade **HOMOLOGACAO** (1:1 com Obra) — suporte ao acompanhamento do processo de homologação junto à concessionária (UC-04, RF-17).
- Relacionamento Obra 1:1 Homologacao adicionado às seções 5.1 e 5.3.

## 5.1. Relacionamentos principais

- **Cliente** 1:N **Obra**
- **Obra** 1:1 **Pagamento**
- **Obra** 1:N **Material**
- **Obra** 1:N **Comentario**
- **Obra** 1:N **Historico_Obra**
- **Obra** 1:N **Programacao_Obra**
- **Obra** 1:1 **Relatorio_Custo**
- **Obra** 1:1 **Homologacao**
- **Equipe** 1:N **Programacao_Obra**
- **Equipe** 1:N **Usuario**
- **Perfil_Acesso** 1:N **Usuario**
- **Usuario** 1:N **Comentario**
- **Usuario** 1:N **Historico_Obra**

## 5.2. Entidades e atributos

Legenda:
- **(Novo)**: Campo novo adicionado nesta versão
- **[NOVA ENTIDADE]**: Entidade nova nesta versão

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
| nome_perfil | String |
| permissoes | Text, opcional |

### Obra
| Atributo | Tipo |
|---|---|
| id | Int (Serial) PK |
| status | String |
| categoria **(Novo)** | String, opcional |
| quantidade_paineis **(Novo)** | Int |
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
| status_logistico | String, opcional |
| id_obra | Int, FK > Obra |

### Usuario
| Atributo | Tipo |
|---|---|
| id | Int (Serial) PK |
| nome | String |
| email | String, único |
| senha | String |
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
| duracao_estimada_dias **(Novo)** | Decimal(5,1), opcional |
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

### Homologacao [NOVA ENTIDADE]
| Atributo | Tipo |
|---|---|
| id | Int (Serial) PK |
| parecer_acesso | String, opcional |
| art_trt | String, opcional |
| prazo_vistoria | Date, opcional |
| atualizado_em | DateTime, default NOW() |
| id_obra | Int, FK > Obra, único |

## 5.3. Resumo das cardinalidades

- **Cliente** 1:N **Obra**
- **Obra** 1:1 **Pagamento**
- **Obra** 1:N **Material**
- **Obra** 1:N **Comentario**
- **Obra** 1:N **Historico_Obra**
- **Obra** 1:N **Programacao_Obra**
- **Obra** 1:1 **Relatorio_Custo**
- **Obra** 1:1 **Homologacao**
- **Equipe** 1:N **Programacao_Obra**
- **Equipe** 1:N **Usuario**
- **Perfil_Acesso** 1:N **Usuario**
- **Usuario** 1:N **Comentario**
- **Usuario** 1:N **Historico_Obra**