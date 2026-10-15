# Regras de Negócio

## 1. Catálogo

| ID | Tipo | Regra | Requisitos | Casos de uso |
| :---- | :---- | :---- | :---- | :---- |
| RN-01 | Derivação | Duração estimada = quantidade de painéis ÷ produtividade (padrão 9 por dia), arredondada conforme a regra vigente (questão Q1) | RF-08 | UC-22 |
| RN-02 | Restrição | Uma equipe não pode ter duas obras no mesmo período. Sábados e domingos não contam como dias úteis. Feriados conforme Q2 | RF-07, RF-09 | UC-13, UC-21, UC-22 |
| RN-03 | Restrição | Toda obra tem cliente. Custo total e DRE só são apurados para obras concluídas com precificação completa | RF-03, RF-14, RF-20 | UC-08, UC-10, UC-32, UC-33 |
| RN-04 | Restrição | Instalador é usuário com login. Acesso restrito às próprias instalações, rota, manutenção e comentários. Sem acesso a dados financeiros, DRE ou gestão do Kanban | RF-01, RF-02, RF-19 | UC-01, UC-03, UC-14, UC-24, UC-25, UC-26 |
| RN-05 | Restrição | Registros da timeline e logs de auditoria são imutáveis. Edição e exclusão de comentários gerais da timeline são restritas ao Administrador | RF-11, RF-12 | UC-20, UC-29, UC-30 |

## 2. Transições de status da obra

Fluxo do funil:

```
MaterialComprado → NoDeposito → Separado → EmAndamento → Concluido
EmAndamento → Assistencia
Concluido → Assistencia
Assistencia → EmAndamento
```

| Regra | Comportamento |
| :---- | :---- |
| Transição fora da lista | Recusada com `400 INVALID_STATUS_TRANSITION`; a mensagem lista os próximos status permitidos |
| Status inexistente | `400 INVALID_STATUS`; a mensagem lista os valores aceitos |
| `statusNovo` ausente | `400 MISSING_STATUS` |
| Status igual ao atual | Recusado |
| Mudança para `Concluido` | Gera evento de conclusão (e-mail, RF-13) |
| Toda mudança | Grava `historico_obra` e `audit_log` na mesma transação |

## 3. Regras de cálculo do Gantt

| Cálculo | Regra |
| :---- | :---- |
| Duração em dias | `painéis ÷ produtividade`, arredondado para cima (regra de arredondamento em Q1) |
| Data de término | Início + duração em dias úteis. Início conta como primeiro dia |
| Propagação | Ao deslocar uma alocação, as seguintes da mesma equipe são deslocadas em dias úteis, na ordem de prioridade |
| Hora | O horário de cada tarefa é armazenado e preservado. Só edição manual altera |
| Conflito | Sobreposição de período para a mesma equipe é recusada com `409 SCHEDULE_CONFLICT` |

## 4. Matriz de permissões

| Funcionalidade | Administrador | Engenharia | Financeiro | Instalador |
| :---- | :---: | :---: | :---: | :---: |
| Login e acesso ao sistema | ✔ | ✔ | ✔ | ✔ |
| Cadastrar Administrador, Engenharia, Financeiro ou Instalador | ✔ | | | |
| Cadastrar cliente e obra | ✔ | ✔ | | |
| Apagar obra | ✔ | ✔ | | |
| Mover e editar cartões no Kanban | ✔ | ✔ | | |
| Criar equipe e alocar no Gantt | ✔ | ✔ | | |
| Exportar detalhes de instalação | ✔ | | | |
| Ver detalhes da instalação, kit e rota da própria equipe | ✔ | ✔ | | ✔ |
| Concluir manutenção e comentar manutenção | | | | ✔ |
| Registrar custos | | | ✔ | |
| Consultar custo total e DRE | ✔ | | ✔ | |
| Exportar relatório financeiro | ✔ | | ✔ | |
| Editar ou excluir comentário geral da timeline | ✔ | | | |
| Ver obras, Kanban, Gantt e timeline (leitura) | ✔ | ✔ | ✔ | Somente instalações da própria equipe |

Tentativa de ação fora da permissão retorna `403` e gera registro em log de segurança.

## 5. Comentários

| Local | Quem cria | Quem edita ou exclui |
| :---- | :---- | :---- |
| Cartão no Kanban | Administrador, Engenharia | Administrador |
| Manutenção | Instalador | Administrador |
| Timeline da obra | Financeiro (e também Administrador e Engenharia pelo cartão) | Administrador |

Todo comentário guarda autor, data e hora. Comentário vazio é recusado.

## 6. Exclusão e auditoria

- Exclusão de obra é lógica: recebe a data de exclusão, sai das listagens e preserva o histórico.
- Obra em execução não pode ser excluída.
- Alterações de status, exclusões e alterações financeiras geram registro em `audit_log`, que não aceita UPDATE nem DELETE.
- Retenção de dados de clientes de obras excluídas segue a política de LGPD (ver [riscos](12-riscos.md)).
