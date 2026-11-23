Sprint 4

Execução dos Casos de Teste da Sprint 4

Projeto: ZL Engenharia Solar, Equipe 5
Responsável: QA
Data da execução: 19/11/2026
Versão testada: última versão do GitHub em 19/11/2026 (commit 2562e91)

Como foi feito

- O sistema foi testado no ambiente de desenvolvimento, com o banco de dados zerado antes de começar.
- Foram usados o servidor e o banco reais, sem dados de exemplo.
- Os casos da sprint anterior foram executados com o arquivo docs/QA/executar_testes_api.sh.
- O controle de acesso foi executado com o arquivo docs/QA/sprint-4/testar_controle_acesso.sh.
- Os passos de tela foram feitos no navegador, também no tamanho de celular.
- Os resultados completos estão na pasta docs/QA/sprint-4/evidencias.

Resumo

| Caso | Requisito | Resultado |
|------|-----------|-----------|
| CT-22 Regras do login | RF-01 | Passou |
| CT-23 Um perfil usando o que é de outro, no servidor | RF-02 | Passou |
| CT-24 Um perfil abrindo a tela de outro | RF-02 | Passou com observação |
| CT-25 Sessão vencida e acesso negado nas telas | RF-01, RF-02 | Passou com observação |
| CT-26 Telas e dados do instalador | RF-19 | Passou |

Casos da sprint anterior, executados de novo

| Caso | Resultado em 21/10 | Resultado em 19/11 |
|------|--------------------|--------------------|
| CT-01 Login | Passou | Passou |
| CT-02 Permissões por perfil | Falhou | Falhou, só porque a parte de custo da obra ainda não existe no servidor |
| CT-03 Quadro de obras | Passou com observação | Passou com observação |
| CT-04 Cronograma | Falhou | Falhou, o caso ainda precisa ser atualizado para usar uma obra com material separado |
| CT-05 Custo da obra | Parado | Parado, a parte de custo ainda não existe no servidor |
| CT-06 Cadastro com cliente | Passou | Passou pelo servidor, mas a tela não carrega a lista de clientes (problema 6) |
| CT-08 Acesso do instalador | Passou com observação | Passou |
| CT-09 Atraso no cronograma | Passou | Passou |
| CT-10 Agendamento de obra | Passou | Passou |
| CT-27 Comentários e histórico (antigo CT-15) | Passou | Passou |

Pelo servidor, 54 de 61 verificações dos casos antigos deram certo. As 7 que deram errado são as mesmas de outubro: 6 sobre o custo da obra e 1 do CT-04 desatualizado.

Detalhe dos casos novos

CT-22 Regras do login: Passou

| Passo | O que aconteceu |
|-------|-----------------|
| 1 | Os campos de e-mail e senha abrem vazios |
| 2 | Senha errada mostra "E-mail ou senha incorretos." |
| 3 | E-mail que não existe mostra a mesma mensagem |
| 4 | Na quinta senha errada a conta foi bloqueada |
| 5 | Com a senha certa, o sistema não deixou entrar e avisou "Tente novamente em 15 minuto(s)" |
| 6 | Outro usuário entrou normalmente |
| 7 | A senha não aparece na resposta do login |
| 8 | Sem login, o sistema pede login |
| 9 | Com chave falsa, o sistema pede login. Com chave vencida, responde "Token expirado. Faça login novamente" e guarda o motivo no registro |
| 10 | As 17 senhas do banco estão guardadas embaralhadas, nenhuma em texto normal |

CT-23 Um perfil usando o que é de outro, no servidor: Passou

Foram testadas 23 ações com os 4 perfis, num total de 92 verificações. As 92 bateram com a matriz de autorização. Todo acesso negado ficou registrado no banco com o perfil e o motivo (perfil sem permissão, obra de outra equipe ou Financeiro fora da linha do tempo). Nenhum dado foi alterado nas tentativas negadas.

CT-24 Um perfil abrindo a tela de outro: Passou com observação

| Passo | O que aconteceu |
|-------|-----------------|
| 1 | O menu do Administrador mostra Obras, Equipes, Financeiro, Relatórios, Usuários e Configurações. O da Engenharia mostra Obras, Equipes e Configurações. O do Financeiro mostra Obras, Equipes, Financeiro, Relatórios e Configurações |
| 2 | Engenharia em Usuários, Financeiro e tela do instalador: tela de sem permissão. Financeiro em Cadastro de obra e Usuários: tela de sem permissão. Instalador no quadro de obras: tela de sem permissão |
| 3 | O Financeiro vê o quadro de obras sem o botão de nova obra e sem poder arrastar os cartões |
| 4 | A Engenharia abre o detalhe da obra 304 sem nenhum valor em dinheiro |
| 5 | O instalador recebe a tela de sem permissão no quadro de obras |

Observação: a tela de sem permissão aparece certinha, mas um endereço que não existe (por exemplo /qualquercoisa) abre uma tela em branco (problema 8).

CT-25 Sessão vencida e acesso negado nas telas: Passou com observação

| Passo | O que aconteceu |
|-------|-----------------|
| 1 | Sem login, o quadro de obras leva para a tela de login |
| 2 e 3 | Com a chave vencida guardada no navegador, a próxima tela levou para o login com "Sua sessão expirou. Faça login novamente para continuar." |
| 4 | Não foi possível testar pela tela, porque os botões das ações proibidas não aparecem. Pelo servidor, o acesso negado não derruba a sessão |
| 5 e 6 | A tela de Usuários mostrou "Não foi possível carregar os dados" com o botão "Tentar novamente", sem derrubar a sessão |

Observação: a tela Financeiro, quando dá erro, mostra a mensagem técnica "A rota GET /api/obras/307/dre não existe." (problema 9).

CT-26 Telas e dados do instalador: Passou

O instalador da Equipe 03 entra direto na tela dele e vê só as obras 304 e 306. O detalhe da obra 304 mostra cliente, endereço, kit e link do mapa, sem nenhum preço. A obra 301 dá acesso negado e uma obra que não existe dá "não encontrada". A lista de manutenções vem vazia e o filtro inválido é recusado. O instalador da Equipe 04 vê só a obra 302. No tamanho de celular a tela cabe sem escapar para os lados e o botão "Iniciar Rota" abre o Google Maps no endereço da obra.

Reverificação dos defeitos

| Número | Problema | Situação em 21/10 | Situação em 19/11 |
|--------|----------|-------------------|-------------------|
| 1 | Engenharia recebia acesso negado em todas as telas | Aberto | Corrigido e verificado |
| 2 | Tela de Configurações abria vazia | Aberto | Corrigido e verificado |
| 3 | Parte de custo e resultado da obra não existe no servidor | Aberto | Continua aberto |
| 4 | Cadastro de obra pela tela dava erro | Corrigido | Voltou a dar problema, ver problema 6 |
| 5 | Tela do instalador mostrava sempre a mesma obra | Aberto | Corrigido e verificado |

Problemas novos

| Número | Problema | Gravidade | Quem resolve |
|--------|----------|-----------|--------------|
| 6 | O cadastro de obra não carrega a lista de clientes ("Não foi possível carregar os dados"), porque a parte de clientes não existe no servidor | Alta | Backend |
| 7 | A tela de Usuários não carrega a lista, porque a parte de usuários não existe no servidor | Alta | Backend |
| 8 | Endereço que não existe abre uma tela em branco, sem "Página não encontrada" | Média | Frontend |
| 9 | A tela Financeiro mostra mensagem técnica quando dá erro | Média | Frontend |
| 10 | A troca de senha em Configurações mostra "Não foi possível confirmar a troca. Tente entrar com a nova senha; se necessário, solicite outro link", porque a parte de troca de senha não existe no servidor. É o mesmo ponto que o cliente reclamou em 07/11 | Alta | Backend e Frontend |

O que fica para a próxima rodada

- Atualizar o CT-04 para usar uma obra com material separado.
- Testar o CT-05 e o CT-14 quando a parte de custo ficar pronta.
- Testar a tela de Usuários e o cadastro de obra de novo quando as partes de usuários e clientes ficarem prontas.
