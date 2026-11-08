Execução dos Casos de Teste (Sprint 3)

Projeto: ZL Engenharia Solar, Equipe 5
Responsável: QA
Data da execução: 21/10/2026
Versão testada: última versão do GitHub em 21/10/2026
Execução anterior: 20/10/2026

Como foi feito:

- O sistema foi testado no ambiente de desenvolvimento, com o banco de dados zerado antes de começar.
- Foram usados o servidor e o banco reais, sem dados de exemplo.
- Os passos que conversam direto com o servidor foram executados pelo arquivo executar_testes_api.sh.
- Os passos de tela foram feitos no navegador.
- O resultado completo da execução está na pasta evidencias.

Como os resultados foram marcados:

| Resultado | Quando usar |
| Passou | Todos os passos deram o resultado esperado |
| Passou com observação | Passou, mas apareceu algo que precisa de ajuste |
| Falhou | Pelo menos um passo deu resultado diferente do esperado |
| Parado | Não deu para testar porque a parte do sistema ainda não existe |

Resumo:

| Caso | Requisito | Resultado | Problema |
| CT-01 Login | RF-01 | Passou | - |
| CT-02 Permissões por perfil | RF-02 | Falhou | Problemas 2 e 3 |
| CT-03 Quadro de obras | RF-04 | Passou com observação | - |
| CT-04 Cronograma | RF-07 | Falhou | Caso precisa ser atualizado |
| CT-05 Custo da obra | RF-14 | Parado | Problema 3 |
| CT-06 Cadastro com cliente | RF-03 | Passou | - |
| CT-08 Acesso do instalador | RF-19 | Passou com observação | Problema 5 |
| CT-09 Atraso no cronograma | RF-09 | Passou | - |
| CT-10 Agendamento de obra | RF-07, RF-10 | Passou | - |
| CT-15 Comentários e histórico | RF-11, RF-12 | Passou | - |

Das 61 verificações feitas direto no servidor, 54 deram certo e 7 deram errado.

Fora dos casos, foi encontrado um problema grave: quem entra com o perfil da Engenharia recebe acesso negado em todas as telas (problema 1).

Detalhe dos 5 casos da sprint anterior

CT-01 Login: Passou

| Passo | O que aconteceu |
| Tela de login | Os campos de e-mail e senha abrem vazios |
| 1, login do administrador | Entrou e foi para o quadro de obras |
| 2, login do instalador | Foi para a tela do instalador |
| 3, senha errada | Continuou no login com a mensagem "E-mail ou senha incorretos" |
| 4, e-mail que não existe | Mesma mensagem do passo 3 |
| 5, login pelo servidor | Entrou como Administrador e a senha não aparece na resposta |
| 6, senha errada pelo servidor | Não entrou |
| 7, acessar sem estar logado | O sistema não deixou |

O problema da sprint passada, em que a senha errada também entrava no sistema, foi resolvido.

CT-02 Permissões por perfil: Falhou

| Passo | O que aconteceu |
| 1, leitor abre o quadro de obras | Acesso negado. O perfil Leitor ainda está sem nenhuma permissão, porque a equipe ainda não decidiu o que ele pode fazer |
| 2, leitor abre o cadastro de obra | Acesso negado |
| 3, leitor tenta cadastrar obra | Acesso negado |
| 4, instalador tenta mudar a etapa de uma obra | Acesso negado |
| 5, Engenharia tenta ver o custo da obra | O sistema respondeu que essa parte não existe. O esperado era acesso negado |
| 6, Financeiro tenta ver o custo da obra | O sistema respondeu que essa parte não existe. O esperado era mostrar o custo |
| 7, Engenharia tenta apagar um comentário | Acesso negado |
| 8, administrador apaga um comentário | Apagou. Foi usado o comentário 711, porque o 712 da proposta de dados não foi incluído |
| 9, Financeiro abre cada item do menu | Configurações abre uma tela vazia |

CT-03 Quadro de obras: Passou com observação

| Passo | O que aconteceu |
| 1, abrir o quadro | Material Comprado 3, No Depósito 2, Separado 1, Em Andamento 2 e Assistência 1. A coluna Concluído mostra 0 e o aviso "+1 arquivadas" |
| 2, pular uma etapa | Na tela, a opção "Mover para" só mostra a próxima etapa. Pelo servidor, o sistema também não deixou |
| 3, voltar uma obra concluída para o início | O sistema não deixou |
| 4, mover a obra 301 para No Depósito | Moveu |
| 5, recarregar a página | A obra continuou em No Depósito |
| 6, histórico da obra 301 | 2 registros |
| 7, filtrar obras em andamento | Obras 305 e 306 |

Observação: a obra 307, que já foi concluída, não aparece na coluna, só no aviso de arquivadas. O caso esperava ela na coluna Concluído.

CT-04 Cronograma: Falhou

| Passo | O que aconteceu |
| 1, abrir o cronograma | As obras aparecem por equipe |
| 2, filtrar a Equipe 01 | Obras 601, 602 e 607 |
| 3 e 4, agendar a obra 310 na Equipe 05 | O sistema não deixou, porque o material da obra 310 ainda não foi separado |
| 5, agendar a Equipe 01 num período ocupado | O sistema avisou que a equipe já está ocupada |
| 6, tela do celular | Dá para usar, sem a página escapar para os lados |

A falha veio de uma regra nova: agora só obra com material separado pode ser agendada. O sistema está certo e o caso de teste é que precisa ser atualizado. A conta dos dias de trabalho foi testada no CT-10 com a obra 304 e deu certo.

CT-05 Custo da obra: Parado

| Passo | O que aconteceu |
| 1, conta feita à mão | 9.200,00 + 22.500,00 = 31.700,00 |
| 2, 3, 5 e 6, consultar o custo | O sistema respondeu que essa parte não existe |
| 4, tela Financeiro com a obra 307 | Mostra "Sem dados financeiros para esta obra." |

Detalhe dos 5 casos novos

CT-06 Cadastro com cliente: Passou

Todos os passos deram certo: cadastro com cliente existente, recusa sem cliente, recusa com cliente que não existe, recusa com CNPJ inválido, recusa com CNPJ repetido, cadastro com cliente novo e histórico com 1 registro. Na tela, salvar com os campos vazios deixa os campos em vermelho.

Na execução de 20/10, salvar uma obra pela tela dava erro. Na versão de 21/10 o formulário ganhou a opção de escolher um cliente cadastrado ou um cliente novo, além de endereço, categoria e inversores, e a obra foi cadastrada pela tela sem problemas.

CT-08 Acesso do instalador: Passou com observação

Todos os passos deram certo: o instalador só vê as obras 304 e 306, abre a obra 304 e recebe acesso negado na obra 301, na lista geral, ao tentar mudar a etapa e ao tentar ver o histórico. Ao abrir o quadro de obras, aparece a mensagem "Acesso Proibido".

Observação: a tela do instalador ainda mostra sempre a mesma obra de exemplo ("Sítio Alvorada", em Crateús-CE) e não as obras da Equipe 03.

CT-09 Atraso no cronograma: Passou

Mudar a obra 601 para 05/10 deixou a 601 de 05/10 a 06/10, a 602 de 08/10 a 13/10 e a 607 de 15/10 a 20/10, igual à conta feita à mão. O sábado não foi aceito e o Financeiro não conseguiu mudar as datas. O cronograma da tela mostrou as datas novas.

CT-10 Agendamento de obra: Passou

A obra 310 não foi aceita. A obra 304 foi agendada na Equipe 05 com 9 dias de trabalho, terminando em 12/11. A obra 304 passou para Em Andamento e o histórico registrou a mudança. O choque de agenda e o sábado foram bloqueados. Na tela, a obra apareceu na coluna Em Andamento.

CT-15 Comentários e histórico: Passou

O comentário em branco não foi aceito. A Engenharia comentou. O Financeiro não conseguiu comentar no cartão, mas conseguiu na linha do tempo. A Engenharia não conseguiu editar. O administrador editou e apagou. No banco de dados, não foi possível alterar o histórico nem apagar os registros de auditoria.

O que mudou desde a execução anterior

- O servidor e o banco de dados não mudaram.
- As telas foram reorganizadas e o formulário de cadastro de obra ficou novo.
- O resultado no servidor foi o mesmo: 54 de 61 verificações deram certo.
- O problema 4 foi resolvido. Os problemas 1, 2, 3 e 5 continuam.

Problemas encontrados

| Número | Problema | Gravidade | Quem resolve |
| 1 | Quem entra com o perfil da Engenharia recebe acesso negado em todas as telas. O nome do perfil está escrito de um jeito na tela e de outro no servidor | Muito alta | Frontend |
| 2 | A tela de Configurações abre vazia | Média | Frontend |
| 3 | A parte de custo e resultado da obra ainda não foi feita, e a tela Financeiro fica sem dados | Alta | Backend |
| 4 | O cadastro de obra pela tela dava erro | Alta | Resolvido em 21/10 |
| 5 | A tela do instalador mostra sempre a mesma obra de exemplo | Alta | Frontend e Backend |

O que fica para a próxima rodada

- Atualizar o CT-04 para usar uma obra com material separado.
- Definir o que o perfil Leitor pode fazer e ajustar o CT-02.
- Incluir nos dados de teste o comentário 712 e a obra 316 da proposta do QA.
- Testar o CT-05 quando a parte de custo ficar pronta.
- Repetir os testes de tela com o usuário da Engenharia depois que o problema 1 for resolvido.
