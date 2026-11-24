Sprint 5

Execução dos Casos de Teste da Sprint 5

Projeto: ZL Engenharia Solar, Equipe 5
Responsável: QA
Data da execução: 19/11/2026
Versão testada: última versão do GitHub em 19/11/2026 (commit 2562e91)

Situação: esta é a primeira rodada dos casos dos requisitos Importantes. A sessão com o cliente ainda não aconteceu, então a reverificação do retorno foi feita com os pontos que o cliente apontou em 07/11/2026. Depois da sessão, este documento deve ser atualizado com os ajustes pedidos nela.

Resumo dos casos dos requisitos Importantes

| Caso | Requisito | Resultado | Motivo |
|------|-----------|-----------|--------|
| CT-07 Manutenção feita pelo instalador | RF-05 | Parado | O instalador já vê as manutenções certas, mas concluir e comentar a manutenção ainda não existem no servidor |
| CT-12 Link do cronograma | RF-16 | Parado | Gerar e abrir o link ainda não existem no servidor |
| CT-13 Situação dos materiais | RF-06 | Parado | Catálogo de produtos e mudança de situação do material ainda não existem no servidor |
| CT-15 Esqueci a senha e troca de senha | RF-21 | Falhou | Nenhuma das partes de senha existe no servidor, e a tela mostra uma mensagem confusa |
| CT-18 Página não encontrada e listas vazias | RF-24 | Falhou | Endereço que não existe abre tela em branco |

Detalhe

CT-07 Manutenção feita pelo instalador: Parado

| Passo | O que aconteceu |
|-------|-----------------|
| 2 | O instalador da Equipe 07 vê a manutenção 1 da Granja Silva, pendente |
| 3 | O instalador da Equipe 03 não vê a manutenção 1 |
| 4 a 9 | Não deu para testar: comentar e concluir manutenção ainda não existem no servidor |

CT-12 Link do cronograma: Parado

Gerar o link e abrir o link sem login ainda não existem no servidor. Nenhum passo pôde ser feito.

CT-13 Situação dos materiais: Parado

O catálogo de produtos e a mudança de situação do material ainda não existem no servidor. Nenhum passo pôde ser feito.

CT-15 Esqueci a senha e troca de senha: Falhou

| Passo | O que aconteceu |
|-------|-----------------|
| 1 a 8 | Não deu para testar: o envio do link de troca de senha ainda não existe no servidor |
| 9 | Em Configurações, com a senha atual certa e uma senha nova válida, apareceu "Não foi possível confirmar a troca. Tente entrar com a nova senha; se necessário, solicite outro link" |
| 10 | Não deu para testar, pelo mesmo motivo do passo 9 |

A tela de troca de senha mostra direitinho as regras da senha (8 caracteres, maiúscula, minúscula e número) enquanto a pessoa digita.

CT-18 Página não encontrada e listas vazias: Falhou

| Passo | O que aconteceu |
|-------|-----------------|
| 1 e 2 | O endereço /qualquercoisa abriu uma tela em branco, sem "Página não encontrada" e sem botão de voltar |
| 3 | Nenhum item do menu levou a tela em branco, com os 4 perfis |
| 4 e 5 | Não testado nesta rodada |
| 6 | As telas de Usuários e de cadastro de obra mostram "Não foi possível carregar os dados" com botão de tentar de novo. A tela Financeiro mostra uma mensagem técnica |

Reverificação do retorno do cliente de 07/11/2026

| Item | O que o cliente apontou | Situação em 19/11 |
|------|-------------------------|-------------------|
| R-03 | Troca de senha com mensagem confusa | Continua igual (CT-15 passo 9) |
| R-05 | Cliente cadastrado não aparecia na escolha de cliente da obra | Continua: agora a lista de clientes nem carrega |
| R-07 | Cadastro de usuário indisponível | Melhorou em parte: a tela existe, mas a lista e o cadastro ainda não funcionam porque falta a parte do servidor |
| R-08 | Painel da obra mostrava valor de exemplo | Corrigido: a Engenharia não vê nenhum valor em dinheiro no detalhe da obra |
| R-09 | Menu "Mover para" com defeito | Não reverificado nesta rodada |
| R-10 | Arrastar o cartão livremente | Não reverificado nesta rodada |

Problemas abertos a partir desta rodada

| Número | Problema | Gravidade | Quem resolve |
|--------|----------|-----------|--------------|
| 8 | Endereço que não existe abre tela em branco | Média | Frontend |
| 10 | Troca de senha não funciona e mostra mensagem confusa | Alta | Backend e Frontend |
| 11 | Partes dos requisitos Importantes que ainda não existem no servidor: concluir e comentar manutenção, link do cronograma, catálogo de produtos e situação do material, envio do link de troca de senha | Alta | Backend |

Os problemas 8 e 10 são os mesmos registrados na execução da Sprint 4.
