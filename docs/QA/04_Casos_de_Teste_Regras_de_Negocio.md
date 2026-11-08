Casos de Teste com Base nas Regras de Negócio (Sprint 3)

Projeto: ZL Engenharia Solar, Equipe 5
Responsável: QA

Objetivo:

Criar mais 5 casos de teste a partir das regras de negócio definidas pela equipe de Requisitos. Os números seguem a lista de casos planejados no documento de testes da equipe.

| Caso | O que é testado | Regra de negócio | Requisito |
|------|-----------------|------------------|-----------|
| CT-06 | Toda obra precisa ter um cliente válido | RN-03 | RF-03 |
| CT-08 | O instalador só vê as obras da própria equipe | RN-04 | RF-02, RF-19 |
| CT-09 | Atraso no cronograma empurra as próximas obras da equipe | RN-02 | RF-09 |
| CT-10 | Cálculo dos dias de trabalho, choque de agenda e obra pronta para agendar | RN-01, RN-02 | RF-07, RF-08, RF-10 |
| CT-15 | Comentários e histórico da obra | RN-05 | RF-11, RF-12 |

O caso CT-07, sobre manutenção, ficou para a próxima sprint, porque essa parte do sistema ainda não foi feita.

Preparação:

1. Zerar o banco de dados e subir o sistema de novo antes de começar.
2. Usar o sistema conectado ao banco real, sem dados de exemplo.
3. A senha de todos os usuários de teste é Senha123!

CT-06 Cadastro de obra com cliente

Regra: toda obra precisa ter um cliente.
Usuário: engenharia@zlengenharia.com
Dados usados: cliente 1 (Rede Alfa Supermercados), um CNPJ novo válido (11222333000181), um CNPJ inválido (11222333000182) e um CNPJ que já existe (12345678000195).

| Passo | O que fazer | O que deve acontecer |
| 1 | Cadastrar uma obra para o cliente 1 | A obra é criada na primeira etapa, Material Comprado |
| 2 | Tentar cadastrar uma obra sem informar cliente | O sistema não deixa e pede o cliente |
| 3 | Tentar cadastrar uma obra para um cliente que não existe | O sistema avisa que o cliente não foi encontrado |
| 4 | Tentar cadastrar um cliente novo com o CNPJ inválido | O sistema avisa que o CNPJ está errado |
| 5 | Tentar cadastrar um cliente novo com um CNPJ que já existe | O sistema avisa que o CNPJ já está cadastrado |
| 6 | Cadastrar um cliente novo com o CNPJ válido | A obra é criada com o cliente novo |
| 7 | Abrir o histórico da obra criada no passo 6 | Aparece um registro de cadastro |
| 8 | Abrir a tela de nova obra e clicar em salvar sem preencher nada | Os campos obrigatórios ficam em vermelho e nada é salvo |

Para passar: nenhuma obra pode ser criada sem um cliente válido.

CT-08 Acesso do instalador só à própria equipe

Regra: o instalador só acessa as instalações da sua equipe e não mexe na parte financeira nem no quadro de obras.
Usuário: instalador@zl.com.br (Equipe 03)
Dados usados: a Equipe 03 está agendada nas obras 304 (Fazenda Santa Maria) e 306 (Condomínio Solar das Flores).

| Passo | O que fazer | O que deve acontecer |
| 1 | Entrar com o usuário do instalador | Entra como instalador da Equipe 03 |
| 2 | Ver o cronograma | Aparecem só as obras 304 e 306 |
| 3 | Abrir a obra 304 | Abre normalmente |
| 4 | Abrir a obra 301, que é de outra equipe | Acesso negado |
| 5 | Abrir a lista geral de obras | Acesso negado |
| 6 | Tentar mudar a etapa da obra 304 | Acesso negado e a obra não muda |
| 7 | Tentar ver o histórico da obra 304 | Acesso negado |
| 8 | Tentar abrir o quadro de obras pela barra de endereço | Aparece a mensagem de acesso negado |

Para passar: o instalador não vê obra de outra equipe e não consegue fazer nada de gestão.

CT-09 Atraso no cronograma em dias úteis

Regra: quando uma obra muda de data, as próximas da mesma equipe andam a mesma quantidade de dias úteis.
Usuário: engenharia@zlengenharia.com
Dados usados: a Equipe 01 tem três obras agendadas: 601 (01/10 a 03/10), 602 (06/10 a 10/10) e 607 (13/10 a 17/10).

| Passo | O que fazer | O que deve acontecer |
| 1 | Ver o cronograma da Equipe 01 | Aparecem as três obras com as datas acima |
| 2 | Mudar o início da obra 601 para 05/10 | A obra 601 passa a ser de 05/10 a 06/10 |
| 3 | Conferir as outras obras da equipe | A 602 passa para 08/10 a 13/10 e a 607 para 15/10 a 20/10 |
| 4 | Tentar mudar o início da 601 para 10/10, que é sábado | O sistema não deixa, porque precisa ser dia útil |
| 5 | Tentar mudar a data com o usuário do Financeiro | Acesso negado |
| 6 | Abrir o cronograma na tela | As barras da Equipe 01 aparecem nas datas novas |

Conta feita à mão: de quinta 01/10 até segunda 05/10 são 2 dias úteis. Todas as obras andam 2 dias úteis e continuam com a mesma quantidade de dias de trabalho (601 com 2, 602 com 4 e 607 com 4).

Para passar: as datas batem com a conta feita à mão e nenhuma data nova cai em sábado ou domingo.

CT-10 Agendamento de obra pronta, dias de trabalho e choque de agenda

Regra: a duração é a quantidade de painéis dividida por 9, arredondada para cima. Uma equipe não pode estar em duas obras ao mesmo tempo. Só pode ser agendada obra com o material já separado.
Usuário: engenharia@zlengenharia.com
Dados usados: Equipe 05 (sem obras), obra 304 (material separado, 80 painéis), obra 310 (material só comprado) e obra 306 (já em andamento).

| Passo | O que fazer | O que deve acontecer |
| 1 | Agendar a obra 310 na Equipe 05 a partir de 02/11 | O sistema não deixa, porque o material ainda não foi separado |
| 2 | Agendar a obra 304 na Equipe 05 a partir de 02/11 | Agenda com 9 dias de trabalho, terminando em 12/11 |
| 3 | Abrir a obra 304 | Ela passou para a etapa Em Andamento |
| 4 | Abrir o histórico da obra 304 | Aparece a mudança de Separado para Em Andamento |
| 5 | Agendar a obra 306 na Equipe 05 a partir de 05/11 | O sistema avisa que a equipe já está ocupada nesse período |
| 6 | Agendar a obra 306 na Equipe 05 a partir de 07/11, que é sábado | O sistema não deixa, porque precisa ser dia útil |
| 7 | Abrir o quadro de obras | A obra 304 aparece na coluna Em Andamento |

Conta feita à mão: 80 painéis divididos por 9 dá 8,9, arredondado para 9 dias. Contando só dias úteis a partir de segunda 02/11: 02, 03, 04, 05, 06, 09, 10, 11 e 12/11.

Para passar: duração e data final corretas, choque de agenda bloqueado e quadro de obras atualizado.

CT-15 Comentários e histórico da obra

Regra: o histórico da obra não pode ser alterado, só o administrador edita ou apaga comentários e comentário vazio não é aceito.
Usuários: Engenharia, Financeiro e Administrador
Dados usados: obra 303 (Residencial Vista Verde)

| Passo | O que fazer | O que deve acontecer |
| 1 | Engenharia tenta enviar um comentário em branco | O sistema não aceita |
| 2 | Engenharia envia o comentário "Teste QA" | O comentário é salvo com o nome de quem escreveu, a data e a hora |
| 3 | Financeiro tenta comentar no cartão da obra | Acesso negado |
| 4 | Financeiro comenta na linha do tempo da obra | O comentário é salvo |
| 5 | Engenharia tenta editar o comentário do passo 2 | Acesso negado |
| 6 | Administrador edita o mesmo comentário | O texto é alterado |
| 7 | Administrador apaga o mesmo comentário | O comentário some da obra |
| 8 | Tentar alterar um registro do histórico direto no banco de dados | O banco não deixa |
| 9 | Tentar apagar os registros de auditoria direto no banco de dados | O banco não deixa |

Para passar: só o administrador mexe nos comentários e ninguém consegue mudar o histórico.

Ligação com os requisitos

| Caso | Regra | Requisito |
| CT-06 | RN-03 | RF-03 |
| CT-08 | RN-04 | RF-02, RF-19 |
| CT-09 | RN-02 | RF-09 |
| CT-10 | RN-01, RN-02 | RF-07, RF-08, RF-10 |
| CT-15 | RN-05 | RF-11, RF-12 |
