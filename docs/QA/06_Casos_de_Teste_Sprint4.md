Sprint 4

Casos de Teste da Sprint 4

Projeto: ZL Engenharia Solar, Equipe 5
Responsável: QA

Objetivo

Escrever os casos de teste do que foi entregue na Sprint 4: as regras de login, o controle de acesso por perfil, o tratamento de sessão expirada e as telas do instalador. Também foram criados casos para testar um perfil tentando entrar no que é de outro perfil.

Os números continuam a lista do documento de testes da equipe de Requisitos (10-testes.md), que vai até o CT-21. Para não repetir número, o caso de comentários que na sprint passada se chamava CT-15 passa a se chamar CT-27, porque o CT-15 da lista de Requisitos é o de troca de senha.

| Caso | O que é testado | Requisito | Regra |
|------|-----------------|-----------|-------|
| CT-22 | Regras do login: mensagem de erro, bloqueio depois de 5 tentativas e sessão vencida | RF-01 | RN-06 |
| CT-23 | Um perfil tentando usar o que é de outro perfil, pelo servidor | RF-02 | Matriz de autorização das rotas |
| CT-24 | Um perfil tentando abrir a tela de outro perfil | RF-02 | Matriz de autorização das telas |
| CT-25 | Sessão vencida e mensagens de acesso negado nas telas | RF-01, RF-02 | RN-06.5 a RN-06.8 |
| CT-26 | Telas e dados do instalador de campo | RF-19 | RN-04, RN-06.12 |

Preparação

1. Zerar o banco de dados e subir o sistema de novo antes de começar.
2. Usar o sistema conectado ao banco real, sem dados de exemplo.
3. A senha de todos os usuários de teste é Senha123!
4. Usuários usados: admin@zl.com.br (Administrador), engenharia@zlengenharia.com (Engenharia), financeiro@zl.com.br (Financeiro) e instalador@zl.com.br (Instalador da Equipe 03).

CT-22 Regras do login

Regra: quem erra a senha não fica sabendo se errou o e-mail ou a senha. Depois de 5 erros seguidos a conta fica bloqueada por 15 minutos. A sessão vale 8 horas.
Usuário de teste: paulo.eng@zl.com.br (para não bloquear os usuários usados nos outros casos)

| Passo | O que fazer | O que deve acontecer |
|-------|-------------|----------------------|
| 1 | Abrir a tela de login | Os campos de e-mail e senha aparecem vazios |
| 2 | Entrar com a senha errada | Aparece "E-mail ou senha incorretos" e o usuário continua na tela de login |
| 3 | Entrar com um e-mail que não existe | Aparece a mesma mensagem do passo 2 |
| 4 | Errar a senha mais 4 vezes seguidas (5 no total) | A conta fica bloqueada |
| 5 | Tentar entrar com a senha certa logo depois | O sistema não deixa e avisa quantos minutos faltam para liberar |
| 6 | Entrar com outro usuário que não foi bloqueado | Entra normalmente, o bloqueio é só da conta que errou |
| 7 | Conferir a resposta do login do administrador | A senha não aparece em nenhum lugar da resposta |
| 8 | Tentar usar o sistema sem estar logado | O sistema pede login |
| 9 | Tentar usar o sistema com uma chave de acesso falsa ou alterada | O sistema pede login |
| 10 | Conferir no banco se a senha está guardada embaralhada | Nenhuma senha aparece em texto normal |

Para passar: a mensagem de erro é sempre a mesma, o bloqueio acontece na quinta tentativa e nenhuma senha aparece em texto normal.

CT-23 Um perfil tentando usar o que é de outro perfil (servidor)

Regra: cada perfil só pode fazer o que está na matriz de autorização das rotas. Quando não pode, o sistema responde acesso negado e guarda o registro dessa tentativa.
Como testar: com o usuário de cada perfil, chamar todas as partes do servidor que já estão prontas e comparar com a matriz.

| Ação | Administrador | Engenharia | Financeiro | Instalador |
|------|---------------|------------|------------|------------|
| Ver os próprios dados de login | Pode | Pode | Pode | Pode |
| Ver a lista de obras | Pode | Pode | Pode | Negado |
| Cadastrar obra | Pode | Pode | Negado | Negado |
| Editar obra | Pode | Pode | Negado | Negado |
| Mudar a etapa da obra | Pode | Pode | Negado | Negado |
| Ver os materiais de uma obra | Pode | Pode | Pode | Só da própria equipe |
| Incluir material | Pode | Pode | Negado | Negado |
| Ver o histórico da obra | Pode | Pode | Pode | Negado |
| Ver comentários | Pode | Pode | Pode | Pode |
| Comentar no cartão da obra | Pode | Pode | Negado | Negado |
| Editar ou apagar comentário | Pode | Negado | Negado | Negado |
| Ver o cronograma | Pode | Pode | Pode | Só da própria equipe |
| Agendar obra ou mudar datas | Pode | Pode | Negado | Negado |
| Ver as instalações do instalador | Negado | Negado | Negado | Pode |
| Ver o detalhe de uma instalação | Negado | Negado | Negado | Só da própria equipe |
| Ver as manutenções do instalador | Negado | Negado | Negado | Pode |

| Passo | O que fazer | O que deve acontecer |
|-------|-------------|----------------------|
| 1 | Entrar com cada um dos 4 perfis | Os 4 entram |
| 2 | Com cada perfil, tentar cada ação da tabela acima | O resultado bate com a tabela |
| 3 | Para cada "Negado", conferir que nada mudou no banco | Nenhuma obra, comentário ou data foi alterada |
| 4 | Conferir o registro de tentativas negadas no banco | Cada acesso negado ficou registrado com o perfil e o motivo |

Para passar: nenhuma ação negada na matriz é permitida e nenhuma ação permitida é negada.

CT-24 Um perfil tentando abrir a tela de outro perfil

Regra: cada perfil só vê as telas da matriz de autorização das telas. O que o usuário não pode fazer não aparece na tela.

| Tela | Administrador | Engenharia | Financeiro | Instalador |
|------|---------------|------------|------------|------------|
| Quadro de obras | Abre e move cartões | Abre e move cartões | Abre só para ver | Negado |
| Cadastro de obra | Abre | Abre | Negado | Negado |
| Cronograma | Abre e edita | Abre e edita | Abre só para ver | Negado |
| Usuários | Abre | Negado | Negado | Negado |
| Financeiro | Abre | Negado | Abre | Negado |
| Relatórios | Abre | Negado | Abre | Negado |
| Tela do instalador | Abre | Negado | Negado | Abre |

| Passo | O que fazer | O que deve acontecer |
|-------|-------------|----------------------|
| 1 | Entrar com cada perfil e olhar o menu | O menu só mostra as telas que o perfil pode abrir |
| 2 | Com cada perfil, digitar na barra de endereço o caminho de cada tela da tabela | As telas negadas mostram a tela de sem permissão |
| 3 | Com o Financeiro, abrir o quadro de obras | Os cartões não podem ser arrastados e o botão de nova obra não aparece |
| 4 | Com a Engenharia, abrir o detalhe de uma obra | Não aparece nenhum valor em dinheiro |
| 5 | Com o instalador, tentar abrir o quadro de obras | Aparece a mensagem de acesso negado |

Para passar: nenhum perfil abre tela que não é dele e os botões de ações proibidas não aparecem.

CT-25 Sessão vencida e mensagens de acesso negado nas telas

Regra: quando a sessão vence, o usuário volta para o login com uma mensagem. Quando tenta algo que não pode, aparece uma mensagem de acesso negado sem derrubar a sessão.

| Passo | O que fazer | O que deve acontecer |
|-------|-------------|----------------------|
| 1 | Abrir o quadro de obras sem estar logado | O sistema leva para a tela de login |
| 2 | Entrar como administrador e apagar a chave de acesso guardada no navegador | Na próxima ação, o sistema leva para o login |
| 3 | Entrar de novo e trocar a chave guardada por uma vencida ou falsa | Aparece "Sua sessão expirou. Faça login novamente para continuar." e o sistema leva para o login |
| 4 | Entrar como Financeiro e tentar uma ação que só a Engenharia pode fazer | Aparece um aviso de acesso negado e o usuário continua logado |
| 5 | Abrir uma tela nova do sistema e esperar carregar | Aparece um aviso de carregando enquanto busca os dados |
| 6 | Abrir uma lista que não tem nenhum item | Aparece uma mensagem de lista vazia |

Para passar: a sessão vencida sempre leva para o login com mensagem, e o acesso negado não derruba a sessão.

CT-26 Telas e dados do instalador de campo

Regra: o instalador vê só as instalações da própria equipe, sem preços, com o endereço e o botão para abrir o mapa.
Usuários: instalador@zl.com.br (Equipe 03) e instalador04@zl.com.br (Equipe 04)
Dados usados: a Equipe 03 está nas obras 304 e 306, e a Equipe 04 está na obra 302.

| Passo | O que fazer | O que deve acontecer |
|-------|-------------|----------------------|
| 1 | Entrar como instalador da Equipe 03 | Vai direto para a tela do instalador |
| 2 | Ver a lista de instalações | Aparecem só as obras 304 e 306 |
| 3 | Abrir a instalação da obra 304 | Aparecem o cliente, o endereço, o kit de materiais e o link do mapa |
| 4 | Conferir o kit | Nenhum preço aparece |
| 5 | Tentar abrir a instalação da obra 301, de outra equipe | Acesso negado |
| 6 | Tentar abrir uma obra que não existe | O sistema avisa que a obra não foi encontrada |
| 7 | Ver as manutenções | A lista vem vazia, porque a Equipe 03 não tem manutenção. As manutenções das Equipes 07 e 10 não aparecem |
| 8 | Filtrar as manutenções por uma situação que não existe | O sistema avisa que o filtro é inválido |
| 9 | Entrar como instalador da Equipe 04 | Aparece só a obra 302 |
| 10 | Abrir a tela do instalador no celular | A tela cabe no celular e o botão do mapa abre o aplicativo de mapas |

Para passar: o instalador só vê a própria equipe e nunca vê preços.

Ligação com os requisitos

| Caso | Requisito | Regra |
|------|-----------|-------|
| CT-22 | RF-01 | RN-06.1 a RN-06.11 |
| CT-23 | RF-02 | Matriz de autorização das rotas |
| CT-24 | RF-02, RF-26 | Matriz de autorização das telas |
| CT-25 | RF-01, RF-02, RF-24 | RN-06.5 a RN-06.8 |
| CT-26 | RF-19 | RN-04, RN-06.12 |
