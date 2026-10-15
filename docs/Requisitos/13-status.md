# Status do Projeto

Situação por módulo. Atualize esta tabela a cada entrega.

## Módulos

| Módulo | Situação | Pendências |
| :---- | :---- | :---- |
| Autenticação | Em andamento | Autorização por perfil em todas as rotas; bloqueio após 5 falhas; tratamento de erro no cliente |
| Cadastros (usuários, clientes) | Pendente | Rotas de usuários e clientes |
| Obras e Kanban | Em andamento | Regra completa de transições; edição; exclusão lógica; comentários com perfis corretos |
| Gantt e equipes | Em andamento | Conflito de agenda; equipes com instaladores e responsável; dias úteis e feriados |
| Timeline | Em andamento | Registro de cadastro e comentários; comentário geral do Financeiro |
| Materiais | Em andamento | Atualização de status logístico |
| Instalador de campo | Em andamento | Rota com JWT; manutenção; projeto e instruções |
| Financeiro | Pendente | Registro de custos; DRE; tela financeira |
| Exportações | Pendente | PDF e Excel; detalhes da instalação; cronograma |
| Cronograma compartilhado | Pendente | Geração de token; visualização somente leitura |
| Notificações | Pendente | E-mail de conclusão |
| Modo display | Pendente | Tela cheia somente leitura |
| Usabilidade | Em andamento | Avaliação heurística concluída; sessões com usuários pendentes; achados de severidade 4 a corrigir |
| Dados de teste | Em andamento | Seed atual com inconsistências registradas; complemento aguardando aprovação do Backend |
| Homologação | Fora do escopo | — |

## Critérios de conclusão

O projeto é considerado concluído quando todos os itens abaixo forem atendidos:

1. Todos os requisitos "Must" estão concluídos e testados.
2. Casos de teste CT-01 a CT-14 executados com sucesso, na interface e na API.
3. Casos de teste de RNF executados, com medição de desempenho e de HTTPS.
4. Nenhuma rota protegida sem validação de token e perfil.
5. Nenhuma credencial ou segredo no código.
6. Nenhum item de menu leva a tela inexistente.
7. Questões em aberto de [visão de negócio](01-visao-negocio.md#questões-em-aberto) resolvidas e refletidas nos documentos.
8. Usuários de cada perfil concluem as tarefas principais, com taxa de sucesso de pelo menos 80%.
9. Pipeline de build, testes e análise de segurança em execução.
10. Riscos de severidade alta com mitigação concluída ou aceita por escrito.
11. Achados de usabilidade de severidade 4 corrigidos e verificados.

## Próximos passos

1. Resolver as questões Q1 a Q6 de [visão de negócio](01-visao-negocio.md#questões-em-aberto).
2. Corrigir os itens de maior severidade de [riscos](12-riscos.md): login, autorização no servidor e acesso do instalador.
3. Implementar cadastros de usuários e clientes.
4. Implementar conflito de agenda e a regra completa de transições.
5. Implementar exportações, custos e DRE.
6. Implementar o módulo do instalador com login.
7. Executar os casos de teste e registrar os resultados em [testes](10-testes.md).
8. Definir provedor, RTO, RPO e pipeline de entrega.
9. Confirmar o hash das senhas do seed.
10. Aprovar ou recusar o complemento de dados de teste.
11. Decidir o escopo de homologação (RF-17) e o acesso do instalador (RF-19).
12. Corrigir os achados de usabilidade de severidade 4 e realizar as sessões com usuários.
