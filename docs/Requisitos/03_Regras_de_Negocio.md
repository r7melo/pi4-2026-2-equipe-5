# Documento de Regras de Negócio

**ZL Engenharia - Especificação de Requisitos de Software v1.1**

## Controle do Documento

| Campo | Valor |
| --- | --- |
| Versão do documento | 1.1 |
| Data | 05/10/2026 |
| Status | Vigente |
| Projeto | Projeto Integrador IV (UFC) |
| Cliente | ZL Engenharia |
| Parte da especificação | 3 de 3 - Regras de Negócio |
| Documento anterior | - |
| Documentos relacionados | [Requisitos Funcionais e Não Funcionais](01_Requisitos_Funcionais_e_Nao_Funcionais.md); [Casos de Uso](02_Casos_de_Uso.md) |

### Templates Utilizados

| Elemento | Template adotado |
| --- | --- |
| Estrutura do documento | ISO/IEC/IEEE 29148:2018 |
| Regras de negócio (RN) | Catálogo com ID próprio e tipo, na taxonomia de Ross / Business Rules Group |
| Rastreabilidade | Matriz RF ↔ UC ↔ RN ↔ cenários Gherkin (Apêndice A) |

## 1. Catálogo de Regras de Negócio

| ID | Tipo | Regra | RF relacionados | UC relacionados |
| --- | --- | --- | --- | --- |
| <a id="rn-01"></a>**RN-01** | Derivação | A duração estimada é quantidade de painéis ÷ produtividade (padrão 9/dia), arredondada para cima em múltiplos de 0,5 dia. | [RF-08](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-08) | [UC-22](02_Casos_de_Uso.md#uc-22) |
| <a id="rn-02"></a>**RN-02** | Restrição | Uma equipe não pode ter duas obras alocadas no mesmo período (conflito de agenda). Fins de semana não contam como dias úteis. | [RF-07](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-07), [RF-09](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-09) | [UC-13](02_Casos_de_Uso.md#uc-13), [UC-21](02_Casos_de_Uso.md#uc-21), [UC-22](02_Casos_de_Uso.md#uc-22) |
| <a id="rn-03"></a>**RN-03** | Restrição | Toda obra deve estar vinculada a um cliente ([UC-08](02_Casos_de_Uso.md#uc-08), [UC-10](02_Casos_de_Uso.md#uc-10)). O custo total e DRE só podem ser apurados para obras concluídas com precificação completa. | [RF-03](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-03), [RF-04](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-04), [RF-14](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-14), [RF-20](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-20) | [UC-08](02_Casos_de_Uso.md#uc-08), [UC-10](02_Casos_de_Uso.md#uc-10) |
| <a id="rn-04"></a>**RN-04** | Restrição | O Instalador de Campo é um usuário cadastrado e autenticado via login ([UC-01](02_Casos_de_Uso.md#uc-01), [UC-09](02_Casos_de_Uso.md#uc-09)). Seu perfil autoriza exclusivamente a navegação em suas instalações ([UC-24](02_Casos_de_Uso.md#uc-24)), abertura de rota ([UC-26](02_Casos_de_Uso.md#uc-26)), realização e conclusão de manutenções ([UC-25](02_Casos_de_Uso.md#uc-25)) e inserção de comentários ([UC-14](02_Casos_de_Uso.md#uc-14)). O perfil não possui acesso a dados financeiros, DRE ou gerenciamento geral do Kanban. | [RF-01](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-01), [RF-02](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-02), [RF-19](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-19) | [UC-01](02_Casos_de_Uso.md#uc-01), [UC-03](02_Casos_de_Uso.md#uc-03), [UC-04](02_Casos_de_Uso.md#uc-04), [UC-09](02_Casos_de_Uso.md#uc-09), [UC-14](02_Casos_de_Uso.md#uc-14), [UC-24](02_Casos_de_Uso.md#uc-24), [UC-25](02_Casos_de_Uso.md#uc-25), [UC-26](02_Casos_de_Uso.md#uc-26) |
| <a id="rn-05"></a>**RN-05** | Restrição | Ações registradas na linha do tempo ([UC-20](02_Casos_de_Uso.md#uc-20)) e logs de auditoria são imutáveis e irremovíveis. Edição e exclusão de itens gerais da timeline são restritas ao Administrador. | [RF-11](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-11), [RF-12](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-12) | [UC-20](02_Casos_de_Uso.md#uc-20) |

## 2. Verificação

- Todos os RFs são verificáveis através dos cenários Gherkin alinhados aos fluxos principais e alternativos dos Casos de Uso ([UC-01](02_Casos_de_Uso.md#uc-01) a [UC-26](02_Casos_de_Uso.md#uc-26)).
- As regras de negócio e restrições de segurança RBAC são testadas pelas respostas do servidor a requisições não autorizadas.

## 3. Apêndice A: Matriz de Rastreabilidade Integral

| Requisito Funcional (RF) | Casos de Uso Relacionados (UC) | Regras de Negócio (RN) | Prioridade |
| --- | --- | --- | --- |
| [RF-01](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-01) (Autenticação e Perfis) | [UC-01](02_Casos_de_Uso.md#uc-01), [UC-02](02_Casos_de_Uso.md#uc-02), [UC-05](02_Casos_de_Uso.md#uc-05), [UC-06](02_Casos_de_Uso.md#uc-06), [UC-07](02_Casos_de_Uso.md#uc-07), [UC-09](02_Casos_de_Uso.md#uc-09) | [RN-04](#rn-04) | Must |
| [RF-02](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-02) (Controle de Autorização RBAC) | [UC-03](02_Casos_de_Uso.md#uc-03), [UC-04](02_Casos_de_Uso.md#uc-04) | [RN-04](#rn-04), [RN-05](#rn-05) | Must |
| [RF-03](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-03) (Cadastro de Clientes e Obras) | [UC-08](02_Casos_de_Uso.md#uc-08), [UC-10](02_Casos_de_Uso.md#uc-10), [UC-11](02_Casos_de_Uso.md#uc-11), [UC-15](02_Casos_de_Uso.md#uc-15), [UC-16](02_Casos_de_Uso.md#uc-16) | [RN-03](#rn-03) | Must |
| [RF-04](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-04) (Funil Kanban) | [UC-12](02_Casos_de_Uso.md#uc-12), [UC-15](02_Casos_de_Uso.md#uc-15), [UC-16](02_Casos_de_Uso.md#uc-16), [UC-17](02_Casos_de_Uso.md#uc-17), [UC-18](02_Casos_de_Uso.md#uc-18), [UC-19](02_Casos_de_Uso.md#uc-19) | [RN-03](#rn-03), [RN-05](#rn-05) | Must |
| [RF-05](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-05) (Raia de Assistência e Manutenção) | [UC-14](02_Casos_de_Uso.md#uc-14), [UC-20](02_Casos_de_Uso.md#uc-20), [UC-25](02_Casos_de_Uso.md#uc-25) | [RN-05](#rn-05) | Should |
| [RF-06](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-06) (Status do Material) | [UC-17](02_Casos_de_Uso.md#uc-17) | - | Should |
| [RF-07](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-07) (Alocação de Equipes no Gantt) | [UC-13](02_Casos_de_Uso.md#uc-13), [UC-21](02_Casos_de_Uso.md#uc-21), [UC-22](02_Casos_de_Uso.md#uc-22) | [RN-01](#rn-01), [RN-02](#rn-02) | Must |
| [RF-08](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-08) (Estimativa de Duração) | [UC-22](02_Casos_de_Uso.md#uc-22) | [RN-01](#rn-01) | Should |
| [RF-09](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-09) (Reordenação de Obras no Gantt) | [UC-22](02_Casos_de_Uso.md#uc-22) | [RN-02](#rn-02) | Must |
| [RF-10](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-10) (Sincronização Gantt-Kanban) | [UC-12](02_Casos_de_Uso.md#uc-12), [UC-13](02_Casos_de_Uso.md#uc-13), [UC-18](02_Casos_de_Uso.md#uc-18) | - | Should |
| [RF-11](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-11) (Histórico e Linha do Tempo) | [UC-19](02_Casos_de_Uso.md#uc-19), [UC-20](02_Casos_de_Uso.md#uc-20) | [RN-05](#rn-05) | Should |
| [RF-12](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-12) (Proteção da Timeline) | [UC-20](02_Casos_de_Uso.md#uc-20) | [RN-05](#rn-05) | Should |
| [RF-13](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-13) (Notificação por E-mail) | - | - | Could |
| [RF-14](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-14) (Cálculo de Custo Total) | - | [RN-03](#rn-03) | Must |
| [RF-15](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-15) (Exportação de Relatórios e Detalhes) | [UC-23](02_Casos_de_Uso.md#uc-23) | - | Must |
| [RF-16](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-16) (Link Compartilhável do Cronograma) | - | [RN-04](#rn-04) | Should |
| [RF-17](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-17) (Homologação) | - | - | Won't |
| [RF-18](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-18) (Modo Display) | - | [RN-04](#rn-04) | Could |
| [RF-19](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-19) (Módulo do Instalador de Campo) | [UC-01](02_Casos_de_Uso.md#uc-01), [UC-03](02_Casos_de_Uso.md#uc-03), [UC-14](02_Casos_de_Uso.md#uc-14), [UC-24](02_Casos_de_Uso.md#uc-24), [UC-25](02_Casos_de_Uso.md#uc-25), [UC-26](02_Casos_de_Uso.md#uc-26) | [RN-04](#rn-04) | Must |
| [RF-20](01_Requisitos_Funcionais_e_Nao_Funcionais.md#rf-20) (DRE da Obra) | - | [RN-03](#rn-03) | Must |
