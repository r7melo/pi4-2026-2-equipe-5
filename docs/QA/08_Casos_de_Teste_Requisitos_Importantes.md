Sprint 5

Casos de Teste dos Requisitos Importantes (Sprint 5)

Projeto: ZL Engenharia Solar, Equipe 5
Responsável: QA

Objetivo

Escrever os casos de teste dos requisitos marcados como Importantes (prioridade Should) no documento de requisitos. Os números seguem a lista do documento de testes da equipe de Requisitos (10-testes.md).

| Caso | O que é testado | Requisito |
|------|-----------------|-----------|
| CT-07 | Manutenção feita pelo instalador | RF-05 |
| CT-12 | Link do cronograma para quem não tem login | RF-16 |
| CT-13 | Situação dos materiais da obra | RF-06 |
| CT-15 | Esqueci a senha e troca de senha | RF-21 |
| CT-18 | Página não encontrada e listas vazias | RF-24 |

Os requisitos Importantes RF-08 (duração da obra), RF-09 (atraso no cronograma), RF-10 (cronograma ligado ao quadro de obras), RF-11 e RF-12 (histórico e comentários) já são cobertos pelos casos CT-09, CT-10 e CT-27.

Preparação

1. Zerar o banco de dados e subir o sistema de novo antes de começar.
2. Usar o sistema conectado ao banco real, sem dados de exemplo.
3. A senha de todos os usuários de teste é Senha123!

CT-07 Manutenção feita pelo instalador

Regra: o instalador vê só as manutenções das obras da sua equipe. Ao concluir, a manutenção muda de situação e fica registrada no histórico da obra. Outros perfis não concluem manutenção.
Usuários: instalador07@zl.com.br (Equipe 07) e instalador@zl.com.br (Equipe 03)
Dados usados: a manutenção 1 (revisão do inversor da Granja Silva, obra 308) é da Equipe 07 e está pendente.

| Passo | O que fazer | O que deve acontecer |
|-------|-------------|----------------------|
| 1 | Abrir o quadro de obras como administrador | A Granja Silva aparece na faixa de Assistência |
| 2 | Entrar como instalador da Equipe 07 e ver as manutenções | Aparece a manutenção 1, pendente |
| 3 | Entrar como instalador da Equipe 03 e ver as manutenções | A manutenção 1 não aparece |
| 4 | Como instalador da Equipe 07, comentar a manutenção com um texto | O comentário é salvo com nome, data e hora |
| 5 | Tentar comentar com o texto em branco | O sistema não aceita |
| 6 | Concluir a manutenção 1 | A manutenção passa para concluída |
| 7 | Abrir o histórico da obra 308 como administrador | Aparece o registro da manutenção concluída |
| 8 | Tentar concluir a manutenção com o usuário da Engenharia | Acesso negado |
| 9 | Instalador da Equipe 03 tenta concluir a manutenção 1 | Acesso negado |

Para passar: só o instalador da equipe certa vê e conclui a manutenção, e a conclusão vai para o histórico.

CT-12 Link do cronograma para quem não tem login

Regra: um usuário logado gera um link do cronograma. O link abre o cronograma só para ver, sem login, sem valores e sem dados de usuários.
Usuário: admin@zl.com.br

| Passo | O que fazer | O que deve acontecer |
|-------|-------------|----------------------|
| 1 | No cronograma, clicar em Compartilhar e escolher o período de outubro | O sistema mostra um link para copiar |
| 2 | Abrir o link numa janela anônima, sem login | O cronograma aparece |
| 3 | Tentar arrastar ou editar uma barra | Nada pode ser mudado |
| 4 | Procurar valores em dinheiro, e-mails ou nomes de usuários na tela | Nada disso aparece |
| 5 | Abrir o link trocando uma letra do código | Aparece a mensagem de link inválido |
| 6 | Tentar gerar o link com o usuário do Financeiro | O sistema não deixa |

Para passar: o link mostra o cronograma só para leitura e não mostra nenhum dado sensível.

CT-13 Situação dos materiais da obra

Regra: todo material nasce como "em solicitação" e segue a ordem comprado, em trânsito, disponível e utilizado. Só o Financeiro e o Administrador mudam a situação. A situação aparece com cor no quadro de obras e no cronograma.
Usuários: Engenharia, Financeiro e Administrador
Dados usados: obra 303 (Residencial Vista Verde)

| Passo | O que fazer | O que deve acontecer |
|-------|-------------|----------------------|
| 1 | Como Engenharia, incluir um material na obra 303 escolhendo um produto do catálogo | O material aparece como "em solicitação" |
| 2 | Conferir a tela da Engenharia | O preço do produto não aparece |
| 3 | Tentar mudar a situação do material com a Engenharia | O sistema não deixa |
| 4 | Como Financeiro, mudar a situação para comprado | A situação muda |
| 5 | Tentar pular direto de comprado para utilizado | O sistema não deixa |
| 6 | Mudar para em trânsito | A situação muda |
| 7 | Abrir o quadro de obras e o cronograma | O cartão e a barra da obra 303 mostram "em trânsito" com a mesma cor |
| 8 | Tentar incluir um material com um produto desativado | O sistema não deixa |

Para passar: a situação segue a ordem, só quem pode consegue mudar e a cor aparece igual nos dois lugares.

CT-15 Esqueci a senha e troca de senha

Regra: quem esqueceu a senha recebe um link por e-mail, que vale 1 hora e só pode ser usado uma vez. A mensagem é a mesma exista o e-mail ou não. A senha nova precisa ter pelo menos 8 caracteres, uma letra maiúscula, uma minúscula e um número.
Usuário: julia.eng@zl.com.br

| Passo | O que fazer | O que deve acontecer |
|-------|-------------|----------------------|
| 1 | Na tela de login, clicar em Esqueci minha senha e informar o e-mail da Julia | Aparece "Se o e-mail informado estiver cadastrado, você receberá as instruções de redefinição" |
| 2 | Repetir com um e-mail que não existe | Aparece exatamente a mesma mensagem |
| 3 | Abrir o link recebido e tentar a senha "abc" | O sistema não aceita e explica a regra da senha |
| 4 | Informar uma senha nova válida com a confirmação diferente | O sistema avisa que as senhas não conferem |
| 5 | Informar uma senha nova válida e a confirmação igual | A senha é trocada |
| 6 | Abrir o mesmo link de novo | Aparece "Link inválido ou expirado" |
| 7 | Entrar com a senha antiga | Não entra |
| 8 | Entrar com a senha nova | Entra |
| 9 | Já logada, ir em Configurações e trocar a senha informando a senha atual certa | Aparece só a mensagem de sucesso |
| 10 | Trocar a senha informando a senha atual errada | Aparece só a mensagem de erro, sem falar em link, e a senha anterior continua valendo |

Para passar: o link funciona uma vez só, a mensagem não revela se o e-mail existe e a troca de senha mostra um resultado só.

CT-18 Página não encontrada e listas vazias

Regra: endereço que não existe mostra "Página não encontrada" com botão para voltar. Lista vazia mostra uma mensagem explicando. Erro do servidor aparece com mensagem simples, sem detalhes técnicos.

| Passo | O que fazer | O que deve acontecer |
|-------|-------------|----------------------|
| 1 | Logado como administrador, abrir um endereço que não existe, como /qualquercoisa | Aparece "Página não encontrada" com botão para voltar à tela principal |
| 2 | Clicar no botão de voltar | Volta para a tela principal do perfil |
| 3 | Clicar em cada item do menu com cada perfil | Nenhum item leva a tela em branco |
| 4 | Filtrar o quadro de obras por um cliente que não existe | Aparece uma mensagem de que não há obras |
| 5 | Com o banco sem nenhuma obra, abrir o quadro como Engenharia | Aparece "Nenhuma obra cadastrada" e o botão "Cadastrar primeira obra" |
| 6 | Desligar o servidor e tentar carregar o quadro de obras | Aparece uma mensagem simples de erro, com opção de tentar de novo |

Para passar: nenhuma tela fica em branco e nenhuma mensagem mostra detalhes técnicos.

Ligação com os requisitos

| Caso | Requisito | Regra |
|------|-----------|-------|
| CT-07 | RF-05 | RN-04, RN-05 |
| CT-12 | RF-16 | RN-04 |
| CT-13 | RF-06, RF-25 | RN-07 |
| CT-15 | RF-21 | RN-06.15 a RN-06.17 |
| CT-18 | RF-24 | - |
