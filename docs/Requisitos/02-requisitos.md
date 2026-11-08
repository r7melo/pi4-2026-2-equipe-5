# Requisitos

Prioridades seguem MoSCoW (Must, Should, Could, Won't). A coluna **Situação** indica o estado de implementação na data de atualização deste documento. Os valores são: Concluído, Em andamento, Pendente e Fora do escopo. Os critérios de aceite de cada requisito funcional estão escritos em Gherkin (Dado/Quando/Então), em português.

> **Revisão de 07/11/2026:** equipes passam a ser entidades temporais do Gantt, montadas por programação de obra, com integrantes flexíveis e foco na gestão do tempo de cada instalador (substituem os responsáveis da obra); valores foram isolados no módulo financeiro; a página Obras foi separada do Kanban; materiais passam a sair de um catálogo de produtos. Os achados do teste funcional da mesma data estão tratados em RF-03, RF-21, RF-22 e RF-23. Decisões pendentes estão em [Visão de negócio](01-visao-negocio.md#questões-em-aberto) (Q9 a Q14).

## Requisitos funcionais

| ID | Requisito | Prioridade | Situação |
| :---- | :---- | :---- | :---- |
| RF-01 | Autenticação e gestão de perfis | Must | Concluído |
| RF-02 | Autorização por perfil (RBAC) | Must | Concluído |
| RF-03 | Gestão de obras (página Obras) | Must | Em andamento |
| RF-04 | Funil Kanban (visualização e movimentação) | Must | Em andamento |
| RF-05 | Raia de assistência e manutenção | Should | Pendente |
| RF-06 | Materiais da obra e status de material | Should | Em andamento |
| RF-07 | Equipes de instalação e programação no Gantt | Must | Em andamento |
| RF-08 | Estimativa de duração | Should | Em andamento |
| RF-09 | Reordenação e propagação de atrasos | Must | Em andamento |
| RF-10 | Sincronização Gantt e Kanban | Should | Pendente |
| RF-11 | Histórico e linha do tempo | Should | Em andamento |
| RF-12 | Imutabilidade da timeline | Should | Em andamento |
| RF-13 | Notificação por e-mail | Could | Pendente |
| RF-14 | Custo total da obra | Must | Em andamento |
| RF-15 | Exportação de relatórios e detalhes | Must | Pendente |
| RF-16 | Cronograma compartilhado (somente leitura) | Should | Pendente |
| RF-17 | Acompanhamento de homologação | Won't | Fora do escopo |
| RF-18 | Modo display | Could | Pendente |
| RF-19 | Módulo do instalador de campo | Must | Em andamento |
| RF-20 | DRE da obra | Must | Pendente |
| RF-21 | Recuperação e atualização de senha | Should | Pendente |
| RF-22 | Gestão de usuários (cadastro, listagem e desativação) | Must | Pendente |
| RF-23 | Gestão de clientes (tela dedicada: cadastro, listagem, edição e exclusão) | Must | Pendente |
| RF-24 | Página de erro e estados vazios | Should | Pendente |
| RF-25 | Catálogo de produtos e preços | Must | Pendente |
| RF-26 | Isolamento de valores no módulo financeiro | Must | Pendente |

### RF-01: Autenticação e gestão de perfis

O sistema autentica por e-mail e senha e emite um token de acesso (JWT) com o perfil do usuário. Somente o Administrador cadastra usuários de qualquer perfil.

- Login válido redireciona para a tela do perfil. Instalador vai para a lista de instalações.
- Erro de credencial mostra "E-mail ou senha incorretos", sem indicar qual campo está errado.
- Cinco falhas consecutivas bloqueiam a conta por 15 minutos (HTTP 423 `ACCOUNT_LOCKED`). A mensagem informa o tempo restante.
- Após o bloqueio expirar ou após login bem-sucedido, a contagem de tentativas é zerada.
- Conta inativa retorna a mesma mensagem genérica sem incrementar tentativas.
- Token com validade padrão de 480 minutos (8 horas), configurável por `JWT_EXPIRES_MINUTES`. Sem renovação automática.
- Token expirado ou ausente retorna 401; toda negação (401/403) é registrada em log de segurança com motivo.
- E-mail deve ser único.
- Senhas são armazenadas somente como hash.
- Instalador pode ser cadastrado sem estar em nenhuma equipe. Sem equipe, o login é permitido, mas a lista de instalações fica vazia. A inclusão em equipe é feita na programação do Gantt (RF-07) e não altera o token, que carrega somente o perfil, pois a equipe muda conforme o período. Regra alinhada em 01/11/2026 e revisada em 07/11/2026 (equipes temporais do Gantt).

**Critérios de aceite:**

```gherkin
# language: pt
@RF-01 @UC-01 @UC-02 @UC-05 @UC-06 @UC-07 @UC-09
Funcionalidade: Autenticação e cadastro de usuários

  Cenário: Login bem-sucedido de Instalador de Campo
    Dado que existe um Instalador de Campo ativo cadastrado no sistema
    Quando ele informa e-mail e senha corretos e clica em "Entrar"
    Então o sistema emite um token de acesso válido contendo o perfil "Instalador de Campo"
    E redireciona o usuário para a tela de suas instalações

  Cenário: Tentativas de login inválidas consecutivas
    Dado que existe um usuário cadastrado no sistema
    Quando ele erra a senha por 5 vezes consecutivas
    Então o sistema bloqueia temporariamente novas tentativas de login

  Cenário: Administrador cadastra um Instalador de Campo
    Dado que o Administrador está autenticado no sistema
    Quando ele cadastra um usuário com nome, e-mail, telefone e o perfil "Instalador de Campo"
    Então o sistema salva o novo instalador e permite seu login no sistema

  Esquema do Cenário: Administrador cadastra usuário de cada perfil
    Dado que o Administrador está autenticado no sistema
    Quando ele cadastra um usuário com nome, e-mail e o perfil "<perfil>"
    Então o sistema salva o novo usuário com o perfil "<perfil>"
    E o token emitido no login desse usuário contém o perfil "<perfil>"

    Exemplos:
      | perfil              |
      | Administrador       |
      | Engenharia          |
      | Financeiro          |
      | Instalador de Campo |

  Cenário: Tentativa de cadastro com e-mail duplicado
    Dado que o e-mail "instalador@zl.com.br" já pertence a outro usuário
    Quando o Administrador tenta cadastrar um novo usuário com esse mesmo e-mail
    Então o sistema exibe mensagem de erro e impede o cadastro

  Cenário: Cadastro de instaladores sem equipe
    Dado que o Administrador está autenticado no sistema
    Quando ele cadastra instaladores sem incluí-los em nenhuma equipe
    Então o sistema salva os usuários e permite seu login
    E a lista de instalações de cada instalador fica vazia

  Cenário: Instalador passa a ver a obra quando entra na equipe
    Dado que existe um Instalador de Campo ativo sem equipe
    Quando um usuário autorizado o adiciona à equipe de uma obra programada no Gantt
    Então o sistema grava o integrante na equipe
    E a obra aparece na lista de instalações do instalador

  Cenário: Credenciais incorretas na autenticação
    Dado que o usuário está na tela de login
    Quando o usuário informa e-mail ou senha incorretos
    Então o sistema exibe a mensagem "E-mail ou senha incorretos" sem especificar qual credencial errou
```

### RF-02: Autorização por perfil (RBAC)

Toda rota protegida valida token e perfil no servidor. Sem token: `401`. Perfil sem permissão: `403`. Ambos geram registro em log de segurança.

Matrizes completas nas seções 4 (funcionalidades), 8 (rotas da API) e 9 (telas) de [Regras de negócio](04-regras-negocio.md). Valores (preços, custos e valor da obra) só são retornados a Administrador e Financeiro (RF-26).

**Critérios de aceite:**

```gherkin
# language: pt
@RF-02 @UC-03 @UC-04
Funcionalidade: Controle de acesso aos recursos do sistema

  Cenário: Instalador de Campo tenta acessar relatório financeiro
    Dado que o usuário está autenticado com o perfil "Instalador de Campo"
    Quando ele envia uma requisição para a rota de DRE ou custos financeiros
    Então o sistema nega o acesso com resposta de "Acesso Proibido"
    E registra a tentativa não autorizada em log de segurança

  Cenário: Token de acesso expirado
    Dado que o token de acesso do usuário expirou
    Quando ele tenta realizar qualquer requisição no sistema
    Então o sistema bloqueia a ação e redireciona para a tela de login

  Cenário: Acesso concedido a recurso permitido
    Dado que o Instalador de Campo está autenticado
    Quando ele solicita visualizar os detalhes de uma instalação de obra cuja equipe ele integra
    Então o sistema valida o token e exibe os dados de kit, endereço e projeto

  Esquema do Cenário: Autorização por perfil conforme a matriz de permissões
    Dado que o usuário está autenticado com o perfil "<perfil>"
    Quando ele tenta acessar o recurso "<recurso>"
    Então o sistema responde com "<resultado>"

    Exemplos:
      | perfil              | recurso                              | resultado        |
      | Engenharia          | cadastro de usuários                 | Acesso Proibido  |
      | Engenharia          | exportação de detalhes de instalação | Acesso Proibido  |
      | Engenharia          | DRE da obra                          | Acesso Proibido  |
      | Financeiro          | movimentação de cartões no Kanban    | Acesso Proibido  |
      | Financeiro          | DRE da obra                          | Acesso Concedido |
      | Administrador       | conclusão de manutenção              | Acesso Proibido  |
      | Instalador de Campo | detalhes da instalação de obra cuja equipe integra | Acesso Concedido |
      | Engenharia          | visualização de valores (custos, preços, valor da obra) | Acesso Proibido |
      | Financeiro          | atualização de status de material | Acesso Concedido |
      | Engenharia          | atualização de status de material | Acesso Proibido |
      | Instalador de Campo | cadastro de produtos e preços | Acesso Proibido |
```

### RF-03: Gestão de obras (página Obras)

A página **Obras** é a gestão oficial das obras. Ela aparece no menu lateral e reúne listagem, filtros, cadastro, edição, materiais, comentários e linha do tempo de cada obra.

- Cada obra tem um cliente vinculado, escolhido entre os clientes já cadastrados. O formulário de obra não cria cliente: a criação acontece somente na gestão de clientes (RF-23).
- O seletor de cliente mostra todos os clientes cadastrados e ativos, inclusive os cadastrados há pouco tempo, sem exigir recarregamento da página.
- O formulário de obra informa categoria (Residencial ou Comercial), quantidade de painéis, quantidade de inversores, endereço (origem em definição, Q9), datas estimadas de início e término e prazo contratual em dias.
- O formulário e o detalhe da obra não exibem campos de valor. Valor da obra e data de confirmação de pagamento são lançados pelo Financeiro (RF-26).
- Ao cadastrar uma obra, o sistema cria o cartão no Kanban na primeira coluna e registra a ação na linha do tempo.
- Ao abrir uma obra, a página mostra as abas Dados, Materiais, Histórico e Comentários. Edição e comentários de gestão são feitos aqui, por Administrador e Engenharia.
- O botão "Página da Obra", no cartão do Kanban, é apenas um atalho que abre a obra selecionada nesta página. A navegação até a obra também está disponível pelo item "Obras" do menu lateral.
- Exclusão de obra é lógica: a obra some das listagens, o cartão é removido e o log registra usuário e data.
- Obra em execução não pode ser excluída.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-03 @UC-10 @UC-11 @UC-15 @UC-16 @UC-17 @UC-19 @UC-20
Funcionalidade: Gestão de obras

  Cenário: Cadastro de obra vinculada a um cliente
    Dado que o usuário está autenticado com o perfil "Engenharia"
    E que existe um cliente cadastrado
    Quando ele cadastra uma obra vinculada a esse cliente
    Então o sistema salva a obra
    E cria o cartão correspondente no quadro Kanban
    E registra a ação na linha do tempo da obra

  Cenário: Cadastro de obra sem cliente
    Dado que o usuário está autenticado com o perfil "Engenharia"
    Quando ele tenta cadastrar uma obra sem vincular um cliente
    Então o sistema exibe mensagem de erro informando que a obra deve estar vinculada a um cliente
    E não cria a obra nem o cartão no Kanban

  Cenário: Cliente recém-cadastrado aparece na seleção da obra
    Dado que o usuário cadastrou um novo cliente na gestão de clientes
    Quando ele abre o formulário de nova obra
    Então o cliente aparece na lista "Selecione o Cliente" sem recarregar a página

  Cenário: Formulário de obra não cria cliente
    Dado que o usuário está no formulário de nova obra
    Quando ele visualiza a seção "Identificação do Cliente"
    Então o sistema exibe somente o seletor de cliente
    E não exibe a opção "Novo Cliente" nem os dados de cadastro do cliente

  Cenário: Formulário e detalhe da obra sem campos de valor
    Dado que o usuário está autenticado com o perfil "Engenharia"
    Quando ele abre o formulário de nova obra ou o detalhe de uma obra
    Então o sistema não exibe preço, valor estimado nem data de confirmação de pagamento

  Cenário: Edição de obra na página Obras
    Dado que o usuário está autenticado com o perfil "Engenharia"
    E que existe uma obra cadastrada
    Quando ele edita os dados da obra e salva
    Então o sistema persiste as alterações
    E registra a ação na linha do tempo da obra

  Cenário: Botão "Página da Obra" abre a obra na página Obras
    Dado que o usuário está no Kanban com o resumo de uma obra aberto
    Quando ele aciona "Página da Obra"
    Então o sistema abre a página Obras com essa obra selecionada

  Cenário: Exclusão lógica de obra
    Dado que o usuário está autenticado com o perfil "Administrador"
    E que existe uma obra cadastrada com cartão no Kanban
    Quando ele apaga a obra
    Então o sistema marca a obra como excluída sem remover seus dados da base
    E remove o cartão correspondente do quadro Kanban
    E grava log de auditoria com o ID do usuário e o timestamp

  Cenário: Perfil sem permissão tenta cadastrar obra
    Dado que o usuário está autenticado com o perfil "Financeiro"
    Quando ele tenta cadastrar uma obra
    Então o sistema nega o acesso com resposta de "Acesso Proibido"
```

**Critérios de aceite complementares:**

```gherkin
# language: pt
@RF-03
Funcionalidade: Restrições na exclusão de obras

  Cenário: Tentativa de excluir obra em execução
    Dado que o usuário está autenticado com o perfil "Administrador"
    E que existe uma obra com status "Em Andamento"
    Quando ele tenta excluir essa obra
    Então o sistema recusa a exclusão
    E exibe mensagem informando que obras em execução não podem ser excluídas

  Cenário: Exclusão de obra no início do funil
    Dado que o usuário está autenticado com o perfil "Engenharia"
    E que existe uma obra com status "Material Comprado"
    Quando ele exclui essa obra
    Então o sistema marca a obra como excluída logicamente
    E remove o cartão do Kanban
    E o histórico da obra permanece acessível ao Administrador

  Cenário: Obra excluída não aparece nas listagens
    Dado que uma obra foi excluída logicamente
    Quando qualquer usuário consulta a lista de obras
    Então a obra excluída não aparece na listagem
```

### RF-04: Funil Kanban

O Kanban é a visão simples do fluxo das obras: mostra onde cada obra está e permite movê-la. Edição e comentários ficam na página Obras (RF-03).

- O quadro tem as colunas: Material Comprado, No Depósito, Separado, Em Andamento e Concluído, mais a raia de Assistência.
- O cartão mostra o nome do cliente, a categoria, a quantidade de painéis e o status do material (RF-06). Não mostra valores.
- O arraste é livre: o cartão pode ser solto em qualquer coluna, sem destaque prévio das colunas. Ao soltar, o sistema valida a transição (Q11).
- Mover um cartão para uma transição válida altera o status da obra, grava a ação na linha do tempo e grava log.
- Transição inválida devolve o cartão à coluna de origem e exibe o motivo retornado pela API, com os próximos status permitidos.
- Clicar em um cartão abre um resumo somente leitura, com o botão "Página da Obra" (RF-03).
- Financeiro tem o quadro em modo leitura. Instalador não acessa o Kanban.

**Movimentação pelo menu do cartão ("Mover para...") — Could:** o menu flutuante "Mover para..." está bugado e deve ser pouco usado, por isso não faz parte da entrega. Pode ser reavaliado depois da correção. A movimentação por teclado (sensor de teclado do dnd-kit) continua como requisito a confirmar.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-04 @UC-12 @UC-18 @UC-27
Funcionalidade: Gerenciamento do funil Kanban

  Cenário: Movimentação de cartão altera o status da obra
    Dado que o usuário está autenticado com o perfil "Engenharia"
    E que existe um cartão de obra em uma coluna do Kanban
    Quando ele move o cartão para outra coluna
    Então o sistema altera automaticamente o status da obra para o da nova coluna
    E grava a ação na linha do tempo com usuário, data e hora
    E grava log de auditoria da alteração de status

  Cenário: Arraste livre com transição inválida
    Dado que o usuário está autenticado com o perfil "Engenharia"
    E que existe uma obra na coluna "Material Comprado"
    Quando ele arrasta o cartão e o solta na coluna "Em Andamento"
    Então o sistema recusa a transição e devolve o cartão à coluna "Material Comprado"
    E exibe o motivo informado pela API

  Cenário: Arraste sem destaque prévio de colunas
    Dado que o usuário está autenticado com o perfil "Administrador"
    Quando ele inicia o arraste de um cartão
    Então o sistema não destaca colunas como permitidas ou bloqueadas

  Cenário: Cartão sem valores
    Dado que existe uma obra com valor definido pelo Financeiro
    Quando o usuário com o perfil "Engenharia" visualiza o cartão no Kanban
    Então o cartão não exibe valor da obra nem preço de material

  Cenário: Perfil somente leitura tenta mover cartão
    Dado que o usuário está autenticado com o perfil "Financeiro"
    Quando ele tenta mover um cartão entre colunas
    Então o sistema nega o acesso com resposta de "Acesso Proibido"
    E o status da obra permanece inalterado
```

### RF-05: Raia de assistência e manutenção

- Obras pós-instalação aparecem na raia de Assistência.
- O instalador vê somente as manutenções das obras cujas equipes ele integrou.
- Concluir a manutenção registra o serviço executado, altera o status e grava na timeline.
- Comentário de manutenção é opcional, mas quando enviado não pode ser vazio. Guarda autor, data e hora.
- Outros perfis não concluem manutenção.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-05 @UC-14 @UC-20 @UC-25
Funcionalidade: Raia de assistência e módulo de manutenção

  Cenário: Instalador visualiza manutenções das obras em que trabalhou
    Dado que o Instalador de Campo está autenticado
    E que existem manutenções na raia de assistência de obras cujas equipes ele integrou
    Quando ele acessa a lista de manutenções
    Então o sistema exibe somente as manutenções dessas obras

  Cenário: Conclusão de manutenção com comentário
    Dado que o Instalador de Campo está autenticado
    E que existe uma manutenção de obra cuja equipe ele integrou
    Quando ele registra a execução do serviço, adiciona um comentário e marca a manutenção como concluída
    Então o sistema altera o status da manutenção para concluída
    E grava o evento na linha do tempo da obra

  Cenário: Conclusão de manutenção sem comentário
    Dado que o Instalador de Campo está autenticado
    E que existe uma manutenção de obra cuja equipe ele integrou
    Quando ele registra a execução do serviço sem adicionar comentário e marca a manutenção como concluída
    Então o sistema conclui a manutenção normalmente

  Cenário: Instalador tenta acessar manutenção de obra em que não trabalhou
    Dado que o Instalador de Campo está autenticado
    E que existe uma manutenção de obra sem vínculo com ele
    Quando ele tenta acessar essa manutenção
    Então o sistema nega o acesso com resposta de "Acesso Proibido"

  Cenário: Perfil sem permissão tenta concluir manutenção
    Dado que o usuário está autenticado com o perfil "Administrador"
    Quando ele tenta marcar uma manutenção como concluída
    Então o sistema nega o acesso com resposta de "Acesso Proibido"
```

### RF-06: Materiais da obra e status de material

- Materiais são incluídos na obra somente a partir de produtos cadastrados e ativos (RF-25). A Engenharia escolhe o produto e a quantidade; não digita tipo nem preço.
- Todo material nasce com o status `EmSolicitacao`. Depois, o status segue a ordem: `Comprado`, `EmTransito`, `Disponivel` (já está no depósito) e `Utilizado` (já está na obra).
- Quem altera o status é o Financeiro ou o Administrador. A Engenharia vê o status, mas não o altera. O mecanismo de atualização está em estudo (Q12).
- O status aparece com rótulo e cor no cartão do Kanban e na barra do Gantt, nos dois lugares ao mesmo tempo.
- Toda alteração de status de material grava log de auditoria com usuário, data e hora.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-06 @UC-40 @UC-41
Funcionalidade: Status do material da obra

  Esquema do Cenário: Exibição do status do material no Kanban e no Gantt
    Dado que existe uma obra com material de status "<status>"
    Quando o usuário visualiza o cartão da obra no Kanban e a barra da obra no Gantt
    Então o sistema exibe o rótulo "<status>" com a cor correspondente em ambos

    Exemplos:
      | status                 |
      | em solicitação         |
      | comprado               |
      | em trânsito            |
      | disponível no depósito |
      | utilizado              |

  Cenário: Material nasce em solicitação
    Dado que o usuário está autenticado com o perfil "Engenharia"
    E que existe um produto ativo cadastrado
    Quando ele inclui esse produto como material de uma obra
    Então o material é criado com o status "em solicitação"

  Cenário: Financeiro atualiza o status do material
    Dado que o usuário está autenticado com o perfil "Financeiro"
    E que existe uma obra com material de status "comprado"
    Quando ele altera o status do material para "em trânsito"
    Então o sistema atualiza o rótulo e a cor no cartão do Kanban
    E atualiza o rótulo e a cor na barra do Gantt
    E grava log de auditoria com usuário, data e hora

  Cenário: Engenharia tenta alterar o status do material
    Dado que o usuário está autenticado com o perfil "Engenharia"
    E que existe uma obra com material de status "comprado"
    Quando ele tenta alterar o status do material para "em trânsito"
    Então o sistema nega o acesso com resposta de "Acesso Proibido"
```

### RF-07: Equipes de instalação e programação no Gantt

Equipe é uma entidade temporal do Gantt, não um cadastro fixo (revisão de 07/11/2026, que substitui os "responsáveis da obra"). Cada programação de obra no Gantt tem a sua equipe: o grupo de instaladores que executa aquela instalação naquele período. O objetivo é a gestão do tempo das pessoas: quantas trabalham em cada instalação, quantas ainda faltam e quanto tempo cada trabalhador fica ocupado ou livre.

- Ao programar uma obra no Gantt, o usuário informa o período e a quantidade de pessoas previstas para a instalação. Os integrantes podem ser escolhidos na hora ou depois.
- Integrantes da equipe são usuários ativos com perfil Instalador de Campo.
- Integrantes são adicionados e removidos a qualquer momento, sem recriar a equipe nem a programação. Cada integrante tem data de entrada e de saída dentro do período da programação (padrão: o período inteiro).
- Remover um integrante antes do início apaga o vínculo. Remover durante a execução encerra o vínculo na data informada, preservando os dias já trabalhados.
- Um instalador não pode estar em duas equipes com períodos sobrepostos. O conflito é bloqueado, com mensagem que informa a obra e o período ocupado.
- A lista de instaladores, ao montar a equipe, mostra quem está livre e quem está ocupado no período antes da confirmação.
- A barra da obra no Gantt mostra a equipe no formato alocadas/previstas (ex.: 2/3) e destaca equipe incompleta (faltam pessoas).
- O sistema calcula o esforço da equipe em pessoa-dia: soma dos dias úteis de cada integrante na programação.
- O Gantt oferece a visão de ocupação por instalador (uma linha por pessoa) e, por dia, o total de instaladores alocados, livres e faltantes nas equipes, para maximizar o uso do tempo de cada trabalhador.
- Programar uma obra exige obra apta para instalação (materiais separados).
- Cada alteração na equipe (inclusão, remoção ou mudança de datas de integrante) grava log de auditoria.
- Perfis Financeiro e Instalador de Campo não programam obras nem alteram equipes.
- Duração e reordenação seguem RF-08 e RF-09.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-07 @UC-13 @UC-21 @UC-22
Funcionalidade: Equipes de instalação e programação no Gantt

  Cenário: Programação de obra com equipe
    Dado que o usuário está autenticado com o perfil "Engenharia"
    E que existe uma obra apta para instalação
    E que os instaladores "Carlos" e "Bruno" estão livres de 10/11/2026 a 12/11/2026
    Quando ele programa a obra para 10/11/2026 a 12/11/2026 com 2 pessoas previstas e adiciona "Carlos" e "Bruno" à equipe
    Então o sistema exibe a barra da obra no Gantt no período escolhido com a equipe "2/2"
    E a obra passa a aparecer como definida para instalação no Kanban

  Cenário: Programação com equipe incompleta
    Dado que o usuário está autenticado com o perfil "Engenharia"
    E que existe uma obra apta para instalação
    Quando ele programa a obra com 3 pessoas previstas e adiciona somente "Carlos" à equipe
    Então o sistema salva a programação
    E a barra da obra no Gantt exibe a equipe "1/3" destacada como incompleta

  Cenário: Inclusão de integrante em equipe já programada
    Dado que existe uma obra programada de 10/11/2026 a 12/11/2026 com a equipe "1/2"
    E que o instalador "Bruno" está livre no período
    Quando o usuário adiciona "Bruno" à equipe a partir de 11/11/2026
    Então o sistema grava "Bruno" na equipe de 11/11/2026 a 12/11/2026
    E a barra da obra exibe a equipe "2/2"
    E o esforço da equipe é recalculado em pessoa-dia

  Cenário: Remoção de integrante durante a execução
    Dado que "Carlos" integra a equipe de uma obra programada de 10/11/2026 a 12/11/2026
    Quando o usuário remove "Carlos" da equipe com saída em 11/11/2026
    Então o sistema encerra o vínculo de "Carlos" em 11/11/2026
    E mantém os dias trabalhados por "Carlos" no esforço da equipe
    E "Carlos" passa a aparecer como livre em 12/11/2026

  Cenário: Conflito de agenda do instalador
    Dado que "Carlos" integra a equipe de uma obra programada de 10/11/2026 a 12/11/2026
    Quando o usuário tenta adicionar "Carlos" à equipe de outra obra em 11/11/2026
    Então o sistema impede a inclusão
    E exibe mensagem informando a obra e o período em que "Carlos" está ocupado

  Cenário: Instalador ocupado aparece marcado
    Dado que "Carlos" está ocupado em 11/11/2026
    Quando o usuário abre a lista de instaladores para montar a equipe de uma obra nesse dia
    Então o sistema marca "Carlos" como ocupado antes da confirmação

  Cenário: Ocupação diária dos instaladores
    Dado que existem 5 instaladores ativos
    E que em 11/11/2026 há 3 instaladores em equipes e uma equipe com 1 pessoa faltante
    Quando o usuário consulta a ocupação de 11/11/2026 no Gantt
    Então o sistema exibe 3 instaladores alocados, 2 livres e 1 pessoa faltante

  Cenário: Usuário que não é instalador não entra na equipe
    Dado que o usuário está autenticado com o perfil "Engenharia"
    Quando ele tenta adicionar à equipe um usuário de perfil "Financeiro"
    Então o sistema impede a inclusão
    E exibe mensagem informando que a equipe aceita somente instaladores de campo ativos

  Cenário: Perfil sem permissão tenta programar obra
    Dado que o usuário está autenticado com o perfil "Instalador de Campo"
    Quando ele tenta programar uma obra no Gantt ou alterar uma equipe
    Então o sistema nega o acesso com resposta de "Acesso Proibido"

  Cenário: Financeiro tenta programar obra
    Dado que o usuário está autenticado com o perfil "Financeiro"
    Quando ele tenta programar uma obra no Gantt ou alterar uma equipe
    Então o sistema nega o acesso com resposta de "Acesso Proibido"
```

### RF-08: Estimativa de duração

- Duração = quantidade de painéis ÷ produtividade (padrão 9 painéis por dia).
- Arredondamento e regra final: ver questão Q1 em [Visão de negócio](01-visao-negocio.md#questões-em-aberto).
- Obra sem quantidade de painéis não recebe estimativa; o sistema solicita o preenchimento.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-08 @UC-22
Funcionalidade: Estimativa automática de duração da instalação

  Esquema do Cenário: Cálculo da duração com a produtividade padrão
    Dado que a produtividade padrão é de 9 painéis por dia
    E que a obra possui <painéis> painéis
    Quando o sistema calcula a duração prevista da instalação
    Então a duração estimada é de <duração> dia(s)

    Exemplos:
      | painéis | duração |
      | 4       | 0,5     |
      | 9       | 1       |
      | 10      | 1,5     |
      | 14      | 2       |
      | 20      | 2,5     |
      | 27      | 3       |

  Cenário: Cálculo com produtividade diferente da padrão
    Dado que a produtividade informada para a obra é de 12 painéis por dia
    E que a obra possui 30 painéis
    Quando o sistema calcula a duração prevista da instalação
    Então a duração estimada é de 2,5 dias

  Cenário: Obra sem quantidade de painéis informada
    Dado que a obra não possui a quantidade de painéis informada
    Quando o usuário solicita a estimativa de duração
    Então o sistema não calcula a duração
    E solicita o preenchimento da quantidade de painéis
```

### RF-09: Reordenação e propagação de atrasos

- O Gantt tem uma linha por obra programada; a equipe é atributo da barra. A visão de ocupação por instalador é complementar (RF-07).
- Adiar ou reordenar uma programação recalcula as datas das programações seguintes que têm integrantes em comum, em cadeia (proposta; ver Q10).
- O cálculo de término usa somente dias úteis.
- Reagendamento que deixa um integrante em duas equipes no mesmo período é bloqueado.
- Mudar o período da programação ajusta as datas de entrada e saída dos integrantes que cobriam o período inteiro; integrantes com datas parciais são revisados pelo usuário.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-09 @UC-22
Funcionalidade: Reordenação e propagação de atrasos no Gantt

  Cenário: Propagação de atraso para obras com integrantes em comum
    Dado que o instalador "Carlos" integra as equipes das obras "A" e "B", com a obra "B" iniciando após a obra "A"
    Quando o usuário adia o término da obra "A" em 2 dias úteis
    Então o sistema desloca o início e o término da obra "B" em 2 dias úteis

  Cenário: Fins de semana não contam como dias úteis
    Dado que uma obra de 2 dias de duração inicia em uma sexta-feira
    Quando o sistema calcula a data de término no Gantt
    Então o término ocorre na segunda-feira seguinte
    E sábado e domingo não são contados na duração

  Cenário: Reagendamento que gera conflito de agenda
    Dado que um instalador integra as equipes de duas obras programadas em períodos distintos
    Quando o usuário reagenda uma dessas obras para um período que sobrepõe a outra
    Então o sistema impede o reagendamento
    E exibe mensagem informando o conflito de agenda
```

### RF-10: Sincronização Gantt e Kanban

- Alocar uma obra no Gantt atualiza o status da obra e o cartão no Kanban.
- Mover o cartão atualiza a barra da obra no Gantt.
- As duas visões exibem o mesmo status para a mesma obra.
- Atualização entre as visões acontece por evento em tempo real (SignalR), sem recarregar a página.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-10 @UC-12 @UC-13 @UC-18
Funcionalidade: Sincronização entre Gantt e funil Kanban

  Cenário: Alocação no Gantt atualiza o Kanban
    Dado que existe uma obra com cartão no Kanban
    Quando o usuário define a obra para instalação e a aloca no Gantt
    Então o sistema atualiza o status da obra e o cartão correspondente no Kanban

  Cenário: Movimentação do cartão atualiza o Gantt
    Dado que existe uma obra alocada no Gantt com cartão no Kanban
    Quando o usuário move o cartão para outra coluna do Kanban
    Então o sistema atualiza o status da obra
    E reflete a mudança de status na barra da obra no Gantt

  Cenário: Dados consistentes entre as duas visões
    Dado que existe uma obra alocada no Gantt com cartão no Kanban
    Quando o usuário consulta o Gantt e o Kanban em seguida
    Então ambos exibem o mesmo status para a obra
```

### RF-11: Histórico e linha do tempo

- Toda ação relevante gera um registro com descrição, usuário, data e hora.
- Ações registradas: cadastro de obra, mudança de status, comentário, manutenção concluída, alteração financeira.
- A timeline é exibida em ordem cronológica.
- Financeiro pode incluir comentário geral na timeline.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-11 @UC-19 @UC-20
Funcionalidade: Histórico da obra e linha do tempo

  Cenário: Registro automático de ação na linha do tempo
    Dado que existe uma obra cadastrada
    Quando um usuário autenticado realiza uma ação sobre a obra, como mover o cartão no Kanban
    Então o sistema grava um registro na linha do tempo com a descrição da ação, o usuário, a data e a hora

  Cenário: Consulta da linha do tempo em ordem cronológica
    Dado que a obra possui várias ações registradas
    Quando o usuário autorizado abre a linha do tempo da obra
    Então o sistema exibe os registros em ordem cronológica

  Cenário: Comentário aparece na linha do tempo
    Dado que o usuário está autenticado com o perfil "Financeiro"
    Quando ele inclui um comentário na linha do tempo de uma obra
    Então o sistema grava o comentário na linha do tempo com o seu nome, a data e a hora
```

**Critérios de aceite complementares:**

```gherkin
# language: pt
@RF-11
Funcionalidade: Comentário do Financeiro na timeline da obra

  Cenário: Financeiro comenta na timeline
    Dado que o usuário está autenticado com o perfil "Financeiro"
    E que existe uma obra cadastrada
    Quando ele inclui um comentário na timeline da obra
    Então o sistema salva o comentário com o nome do usuário, a data e a hora
    E exibe o comentário na timeline em ordem cronológica

  Cenário: Financeiro tenta comentar no cartão do Kanban
    Dado que o usuário está autenticado com o perfil "Financeiro"
    Quando ele tenta incluir um comentário no cartão do Kanban
    Então o sistema nega o acesso com resposta de "Acesso Proibido"

  Cenário: Comentário vazio é recusado
    Dado que o usuário está autenticado com qualquer perfil que pode comentar
    Quando ele tenta enviar um comentário vazio ou com apenas espaços
    Então o sistema exibe mensagem de erro e não salva o comentário
```

### RF-12: Imutabilidade da timeline

- Registros automáticos não podem ser editados nem removidos, por nenhum perfil.
- Comentários gerais da timeline: somente o Administrador edita ou exclui, e a edição gera log.
- Logs de auditoria são append-only.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-12 @UC-20
Funcionalidade: Proteção e imutabilidade da linha do tempo

  Cenário: Registro automático de ação não pode ser alterado
    Dado que existe um registro automático de mudança de status na linha do tempo
    Quando qualquer usuário, inclusive o Administrador, tenta editar ou excluir esse registro
    Então o sistema impede a operação
    E o registro permanece inalterado

  Cenário: Perfil sem permissão tenta editar item da linha do tempo
    Dado que o usuário está autenticado com o perfil "Engenharia"
    Quando ele tenta editar ou excluir um item geral da linha do tempo
    Então o sistema nega o acesso com resposta de "Acesso Proibido"

  Cenário: Administrador edita item geral da linha do tempo
    Dado que o usuário está autenticado com o perfil "Administrador"
    E que existe um comentário na linha do tempo
    Quando ele edita o comentário
    Então o sistema salva a edição
    E grava log de auditoria com o ID do usuário e o timestamp

  Cenário: Log de auditoria irremovível
    Dado que existem logs de auditoria registrados
    Quando qualquer usuário tenta removê-los
    Então o sistema impede a remoção
```

### RF-13: Notificação por e-mail

- Ao mudar o status para `Concluido`, o sistema envia e-mail de conclusão.
- Antes de confirmar a mudança para `Concluido`, o sistema pede confirmação do usuário.
- Falha no envio não reverte a mudança de status e é registrada em log.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-13
Funcionalidade: Notificação por e-mail

  Cenário: Notificação de conclusão de obra
    Dado que existe uma obra em andamento com cartão no Kanban
    Quando o status da obra é alterado para concluída
    Então o sistema envia um e-mail de notificação de conclusão da obra

  Cenário: Falha no envio do e-mail
    Dado que o serviço de e-mail está indisponível
    Quando o status da obra é alterado para concluída
    Então o sistema conclui a alteração de status normalmente
    E registra a falha de envio em log
```

### RF-14: Custo total da obra

- O custo total é a soma dos itens de custo registrados na obra.
- Só é apurado para obras concluídas com precificação completa. Caso contrário, retorna erro descritivo.
- Acesso: Administrador e Financeiro.
- Toda criação ou alteração de custo grava log com usuário e timestamp.
- Valor da obra e custos são lançados somente pelo Financeiro (RF-26).

**Critérios de aceite:**

```gherkin
# language: pt
@RF-14
Funcionalidade: Apuração de custo total da obra

  Cenário: Apuração do custo total de obra concluída
    Dado que o usuário está autenticado com o perfil "Financeiro"
    E que existe uma obra concluída com precificação completa
    E que os itens de custo da obra somam R$ 10.000,00 e R$ 4.500,00
    Quando ele solicita o custo total da obra
    Então o sistema exibe o custo total de R$ 14.500,00

  Cenário: Obra não concluída
    Dado que o usuário está autenticado com o perfil "Financeiro"
    E que existe uma obra que ainda não foi concluída
    Quando ele solicita o custo total da obra
    Então o sistema informa que o custo total só pode ser apurado para obras concluídas

  Cenário: Obra concluída com precificação incompleta
    Dado que o usuário está autenticado com o perfil "Financeiro"
    E que existe uma obra concluída com itens sem precificação
    Quando ele solicita o custo total da obra
    Então o sistema não apura o custo total
    E informa que a precificação da obra está incompleta

  Esquema do Cenário: Acesso ao custo total por perfil
    Dado que o usuário está autenticado com o perfil "<perfil>"
    Quando ele solicita o custo total de uma obra
    Então o sistema responde com "<resultado>"

    Exemplos:
      | perfil              | resultado        |
      | Administrador       | Acesso Concedido |
      | Financeiro          | Acesso Concedido |
      | Engenharia          | Acesso Proibido  |
      | Instalador de Campo | Acesso Proibido  |

  Cenário: Alteração financeira gera log de auditoria
    Dado que o usuário está autenticado com o perfil "Financeiro"
    Quando ele altera um valor financeiro da obra
    Então o sistema grava log irremovível com o ID do usuário e o timestamp
```

**Critérios de aceite complementares:**

```gherkin
# language: pt
@RF-14 @RF-20 @RF-02
Funcionalidade: Bloqueio de acesso financeiro para instalador

  Cenário: Instalador tenta acessar custo total
    Dado que o Instalador de Campo está autenticado
    Quando ele tenta acessar o endpoint de custo total de uma obra
    Então o sistema nega o acesso com resposta de "Acesso Proibido"
    E registra a tentativa em log de segurança

  Cenário: Instalador tenta acessar o DRE
    Dado que o Instalador de Campo está autenticado
    Quando ele tenta acessar o endpoint de DRE de uma obra
    Então o sistema nega o acesso com resposta de "Acesso Proibido"
    E registra a tentativa em log de segurança

  Cenário: Engenharia tenta registrar custo
    Dado que o usuário está autenticado com o perfil "Engenharia"
    Quando ele tenta registrar um custo em uma obra
    Então o sistema nega o acesso com resposta de "Acesso Proibido"
```

### RF-15: Exportação de relatórios e detalhes

- Relatórios financeiros e cronograma exportam em PDF ou Excel.
- Detalhes da instalação (kit, endereço, equipe, período e instruções) exportam somente para o Administrador.
- Geração de até 1.000 registros em no máximo 5 segundos (RNF-05).
- Perfis sem permissão recebem `403`.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-15 @UC-23
Funcionalidade: Exportação de relatórios e detalhes de instalação

  Esquema do Cenário: Exportação de relatório financeiro
    Dado que o usuário está autenticado com o perfil "Financeiro"
    Quando ele exporta o relatório financeiro no formato "<formato>"
    Então o sistema gera e disponibiliza o arquivo "<formato>" para download

    Exemplos:
      | formato |
      | PDF     |
      | Excel   |

  Esquema do Cenário: Exportação de cronograma
    Dado que o usuário está autenticado com o perfil "Administrador"
    Quando ele exporta o cronograma no formato "<formato>"
    Então o sistema gera e disponibiliza o arquivo "<formato>" para download

    Exemplos:
      | formato |
      | PDF     |
      | Excel   |

  Cenário: Exportação dos detalhes da instalação
    Dado que o usuário está autenticado com o perfil "Administrador"
    E que existe uma instalação com kit, endereço, equipe e instruções cadastrados
    Quando ele exporta os detalhes da instalação
    Então o arquivo gerado contém o kit, o endereço, a equipe e as instruções da instalação

  Cenário: Perfil sem permissão tenta exportar detalhes da instalação
    Dado que o usuário está autenticado com o perfil "Engenharia"
    Quando ele tenta exportar os detalhes da instalação
    Então o sistema nega o acesso com resposta de "Acesso Proibido"

  Cenário: Tempo de geração do relatório
    Dado que existem 1.000 obras cadastradas
    Quando o usuário autorizado exporta um relatório
    Então o sistema gera o arquivo em no máximo 5 segundos
```

### RF-16: Cronograma compartilhado

- Um usuário autenticado gera um link único do cronograma.
- O link abre o Gantt em modo somente leitura, sem login.
- O link não expõe custos, DRE nem dados de usuários.
- Link inválido exibe mensagem de link inválido.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-16
Funcionalidade: Link compartilhável do cronograma

  Cenário: Geração do link compartilhável
    Dado que o usuário está autenticado com o perfil "Administrador"
    E que existe um cronograma com obras alocadas no Gantt
    Quando ele gera o link compartilhável do cronograma
    Então o sistema exibe um link único para visualização externa

  Cenário: Acesso externo somente leitura
    Dado que existe um link compartilhável válido do cronograma
    Quando uma pessoa sem login acessa o link
    Então o sistema exibe o cronograma em modo somente leitura
    E não permite mover, editar ou alocar obras

  Cenário: Link não expõe dados financeiros
    Dado que existe um link compartilhável válido do cronograma
    Quando uma pessoa sem login acessa o link
    Então o sistema não exibe custos, DRE nem dados de usuários

  Cenário: Link inválido
    Dado que o link informado não corresponde a nenhum cronograma compartilhado
    Quando uma pessoa tenta acessá-lo
    Então o sistema exibe mensagem de link inválido
```

### RF-17: Acompanhamento de homologação

Fora do escopo desta fase. Não há rotas, tela ou entidade de homologação no sistema.

**Critérios de aceite:**

```gherkin
# language: pt
# Fora do escopo desta fase. Os critérios definitivos serão detalhados quando a fase futura for planejada.
@RF-17 @fase-futura
Funcionalidade: Acompanhamento de homologação

  Cenário: Funcionalidade indisponível na fase atual
    Dado que o sistema está na versão da fase atual
    Quando o usuário navega pelos módulos disponíveis
    Então o sistema não exibe opção de acompanhamento de homologação com a concessionária
```

### RF-18: Modo display

- Ativa tela cheia com o Gantt ou o Kanban, ocultando menus e controles de edição.
- Em modo display nenhuma obra pode ser movida ou editada.
- Sair restaura a visualização normal.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-18
Funcionalidade: Modo display para monitores

  Cenário: Ativação do modo display
    Dado que o usuário está autenticado e visualiza o Gantt ou o Kanban
    Quando ele ativa o modo display
    Então o sistema exibe o quadro em tela cheia
    E oculta os menus de navegação e edição

  Cenário: Modo display é somente leitura
    Dado que o modo display está ativo
    Quando o usuário tenta mover ou editar uma obra
    Então o sistema não permite a alteração

  Cenário: Saída do modo display
    Dado que o modo display está ativo
    Quando o usuário solicita sair do modo display
    Então o sistema retorna à visualização normal com os menus
```

### RF-19: Módulo do instalador de campo

- O instalador faz login e acessa a lista de instalações das obras cujas equipes ele integra, com o período em que está escalado em cada uma.
- Cada instalação mostra o kit de materiais (produto e quantidade, sem preços), endereço, projeto e instruções.
- Botão "Abrir rota" envia o endereço ao aplicativo de mapas do dispositivo.
- Instalador registra e conclui manutenções e comenta sobre elas, nas obras cujas equipes ele integrou.
- Instalador não vê obras de equipes que não integra e não acessa telas administrativas ou financeiras.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-19 @UC-01 @UC-03 @UC-14 @UC-24 @UC-25 @UC-26
Funcionalidade: Módulo do Instalador de Campo

  Cenário: Consulta de detalhes da instalação pelo instalador logado
    Dado que o Instalador de Campo fez login no sistema com suas credenciais
    E que ele integra a equipe de uma obra programada
    Quando ele acessa a tela de instalações
    Então o sistema exibe o kit de materiais (produtos e quantidades), o endereço e as instruções dessa obra

  Cenário: Instalador não vê obras de equipes que não integra
    Dado que o Instalador de Campo está autenticado
    E que existem obras sem vínculo com ele
    Quando ele acessa a tela de instalações
    Então o sistema não exibe essas obras

  Cenário: Kit sem preços
    Dado que o Instalador de Campo está visualizando uma instalação
    Quando ele consulta o kit de materiais
    Então o sistema exibe produto e quantidade, sem preços

  Cenário: Abertura de rota no aplicativo de mapas
    Dado que o Instalador de Campo está visualizando uma instalação com endereço cadastrado
    Quando ele clica no botão "Abrir Rota"
    Então o sistema aciona o aplicativo de GPS padrão enviando as coordenadas/endereço da obra

  Cenário: Registro de manutenção concluída
    Dado que o Instalador de Campo está visualizando uma manutenção de obra cuja equipe ele integrou
    Quando ele registra a execução do serviço e marca a manutenção como concluída
    Então o sistema altera o status da manutenção para concluída

  Cenário: Comentário sobre manutenção executada
    Dado que o Instalador de Campo está visualizando uma manutenção de obra cuja equipe ele integrou
    Quando ele inclui um comentário detalhado sobre o serviço executado
    Então o sistema salva o comentário vinculado à manutenção

  Cenário: Tentativa de acesso do instalador a telas administrativas
    Dado que o Instalador de Campo está autenticado
    Quando ele tenta navegar diretamente para a URL do DRE financeiro ou do cadastro de usuários
    Então o sistema bloqueia o acesso e exibe a mensagem de "Acesso Proibido"
```

### RF-20: DRE da obra

- DRE mostra custo total, valor da obra e resultado (valor da obra menos custo total).
- Só para obras concluídas com precificação completa.
- Acesso: Administrador e Financeiro. Exportável em PDF e Excel.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-20
Funcionalidade: Relatório financeiro da obra (DRE da obra)

  Cenário: Emissão do DRE de obra concluída
    Dado que o usuário está autenticado com o perfil "Financeiro"
    E que existe uma obra concluída com precificação completa
    E que o valor da obra é de R$ 30.000,00 e o custo total apurado é de R$ 14.500,00
    Quando ele emite o DRE da obra
    Então o sistema exibe o custo total de R$ 14.500,00
    E exibe o resultado da obra de R$ 15.500,00

  Cenário: DRE de obra não concluída
    Dado que o usuário está autenticado com o perfil "Financeiro"
    E que existe uma obra que ainda não foi concluída
    Quando ele tenta emitir o DRE da obra
    Então o sistema informa que o DRE só pode ser emitido para obras concluídas

  Cenário: DRE de obra com precificação incompleta
    Dado que o usuário está autenticado com o perfil "Financeiro"
    E que existe uma obra concluída com itens sem precificação
    Quando ele tenta emitir o DRE da obra
    Então o sistema não emite o DRE
    E informa que a precificação da obra está incompleta

  Esquema do Cenário: Acesso ao DRE por perfil
    Dado que o usuário está autenticado com o perfil "<perfil>"
    Quando ele tenta emitir o DRE de uma obra concluída
    Então o sistema responde com "<resultado>"

    Exemplos:
      | perfil              | resultado        |
      | Administrador       | Acesso Concedido |
      | Financeiro          | Acesso Concedido |
      | Engenharia          | Acesso Proibido  |
      | Instalador de Campo | Acesso Proibido  |

  Cenário: Exportação do DRE
    Dado que o usuário está autenticado com o perfil "Financeiro"
    E que o DRE de uma obra concluída está emitido
    Quando ele exporta o DRE em PDF ou Excel
    Então o sistema gera e disponibiliza o arquivo para download
```

### RF-21: Recuperação e atualização de senha

- O usuário solicita a recuperação de senha informando seu e-mail cadastrado.
- O sistema envia um e-mail com link de redefinição de senha de uso único e com validade de 1 hora.
- O link expirado ou já utilizado retorna mensagem de link inválido ou expirado.
- O sistema não confirma nem nega se o e-mail existe, sempre exibindo a mesma mensagem de envio (proteção contra enumeração).
- A nova senha deve atender à política mínima de segurança: ao menos 8 caracteres, uma letra maiúscula, uma minúscula e um número.
- Após a redefinição, todos os tokens de acesso do usuário são invalidados.
- Usuário autenticado pode alterar a própria senha informando a senha atual e a nova senha.
- A confirmação da nova senha deve coincidir com a nova senha.
- A alteração autenticada informa o resultado real da operação: sucesso ou falha, nunca os dois. Em falha, a senha anterior continua válida. A mensagem não sugere solicitar novo link, pois esse fluxo é exclusivo da redefinição por e-mail (achado do teste de 07/11/2026).

**Critérios de aceite:**

```gherkin
# language: pt
@RF-21 @UC-35 @UC-36
Funcionalidade: Recuperação e atualização de senha

  Cenário: Solicitação de recuperação de senha com e-mail cadastrado
    Dado que existe um usuário cadastrado com o e-mail "engenharia@zlengenharia.com"
    Quando ele solicita a recuperação de senha informando esse e-mail
    Então o sistema envia um e-mail com link de redefinição de senha
    E exibe a mensagem "Se o e-mail informado estiver cadastrado, você receberá as instruções de redefinição"

  Cenário: Solicitação de recuperação de senha com e-mail não cadastrado
    Dado que o e-mail "naoexiste@zl.com.br" não está cadastrado
    Quando o usuário solicita recuperação de senha informando esse e-mail
    Então o sistema exibe a mesma mensagem "Se o e-mail informado estiver cadastrado, você receberá as instruções de redefinição"
    E não revela se o e-mail existe ou não no sistema

  Cenário: Redefinição de senha com link válido
    Dado que o usuário recebeu um link de redefinição de senha válido
    Quando ele acessa o link e define uma nova senha que atende à política de segurança
    Então o sistema atualiza a senha do usuário
    E invalida todos os tokens de acesso ativos do usuário
    E exibe mensagem de sucesso

  Cenário: Redefinição de senha com link expirado
    Dado que o link de redefinição de senha expirou ou já foi utilizado
    Quando o usuário tenta acessar esse link
    Então o sistema exibe a mensagem "Link inválido ou expirado"
    E não permite a redefinição da senha

  Cenário: Nova senha não atende à política de segurança
    Dado que o usuário está na tela de redefinição de senha com link válido
    Quando ele define uma nova senha que não atende à política mínima de segurança
    Então o sistema exibe mensagem informando os requisitos mínimos da senha
    E não atualiza a senha

  Cenário: Usuário autenticado altera a própria senha
    Dado que o usuário está autenticado no sistema
    Quando ele informa a senha atual correta e uma nova senha que atende à política de segurança
    Então o sistema atualiza a senha
    E invalida todos os tokens de acesso ativos do usuário

  Cenário: Usuário autenticado informa senha atual incorreta
    Dado que o usuário está autenticado no sistema
    Quando ele tenta alterar a senha informando a senha atual incorreta
    Então o sistema rejeita a alteração
    E exibe a mensagem "Senha atual incorreta"
```

**Critérios de aceite complementares:**

```gherkin
# language: pt
@RF-21
Funcionalidade: Invalidação de sessões após mudança de senha

  Cenário: Tokens ativos expiram após redefinição via link
    Dado que o usuário "engenharia@zlengenharia.com" tem uma sessão aberta (token A)
    Quando ele redefine a senha pelo link de recuperação
    Então o token A passa a ser inválido
    E qualquer requisição com o token A recebe resposta "401 UNAUTHORIZED"

  Cenário: Tokens ativos expiram após alteração de senha autenticada
    Dado que o usuário "financeiro@zl.com.br" está autenticado com o token B
    Quando ele altera a própria senha informando a senha atual correta e uma nova senha válida
    Então o token B passa a ser inválido
    E o sistema exige um novo login para continuar

  Cenário: Link de redefinição com senha inválida na política
    Dado que o usuário possui um link de redefinição válido
    Quando ele tenta definir a nova senha como "abc123" (sem letra maiúscula)
    Então o sistema exibe mensagem informando que a senha precisa de ao menos uma letra maiúscula
    E não atualiza a senha

  Cenário: Tentativa de reutilizar link já utilizado
    Dado que o usuário já utilizou o link de redefinição para definir uma nova senha
    Quando ele tenta acessar o mesmo link novamente
    Então o sistema exibe a mensagem "Link inválido ou expirado"
    E não permite nova redefinição com esse link
```

**Critérios de aceite complementares (revisão de 07/11/2026):**

```gherkin
# language: pt
@RF-21 @UC-36
Funcionalidade: Alteração de senha autenticada sem falsa mensagem de erro

  Cenário: Falha na gravação da nova senha
    Dado que o usuário está autenticado e informa a senha atual correta e uma nova senha válida
    Quando o sistema não consegue gravar a nova senha
    Então o sistema exibe "Não foi possível alterar a senha. Tente novamente."
    E não sugere solicitar outro link
    E a senha anterior continua válida para novo login

  Cenário: Alteração bem-sucedida exige novo login
    Dado que o usuário está autenticado e informa a senha atual correta e uma nova senha válida
    Quando o sistema grava a nova senha
    Então o sistema exibe confirmação da alteração
    E invalida os tokens ativos do usuário
    E exige novo login com a nova senha

  Cenário: Confirmação diferente da nova senha
    Dado que o usuário está autenticado
    Quando ele informa uma confirmação diferente da nova senha
    Então o sistema exibe "As senhas não coincidem"
    E não altera a senha
```

### RF-22: Gestão de usuários (cadastro, listagem e desativação)

**Prioridade:** Must | **Situação:** Pendente

O Administrador lista, cadastra, edita e desativa usuários do sistema. Nenhum outro perfil acessa esta tela ou rota.

- A listagem exibe nome, e-mail, perfil e situação (ativo/inativo).
- A tela de cadastro de usuários deve estar disponível ao Administrador. No teste de 07/11/2026, ela estava indisponível.
- O cadastro exige nome completo, e-mail único e perfil. O Instalador de Campo pode ser cadastrado sem obras vinculadas; o vínculo é feito na obra (RF-07).
- E-mail duplicado é recusado com mensagem de erro.
- A senha inicial é gerada automaticamente e enviada por e-mail ao novo usuário (depende do RF-21).
- Desativar um usuário invalida todos os seus tokens ativos e impede novos logins, sem apagar o registro (exclusão lógica).
- Reativar um usuário restaura o acesso com nova senha enviada por e-mail.
- Editar o perfil de um usuário ativo invalida imediatamente os tokens existentes.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-22 @UC-05 @UC-06 @UC-07 @UC-09 @UC-37 @UC-38
Funcionalidade: Gestão de usuários pelo Administrador

  Cenário: Listagem de usuários
    Dado que o Administrador está autenticado
    Quando ele acessa a tela de gestão de usuários
    Então o sistema exibe todos os usuários com nome, e-mail, perfil e situação

  Cenário: Tela de cadastro disponível ao Administrador
    Dado que o Administrador está autenticado
    Quando ele aciona a opção de cadastrar novo usuário
    Então o sistema exibe o formulário de cadastro com nome, e-mail e perfil

  Esquema do Cenário: Administrador cadastra usuário de qualquer perfil
    Dado que o Administrador está autenticado
    Quando ele cadastra um usuário com nome, e-mail e o perfil "<perfil>"
    Então o sistema salva o usuário com status ativo
    E o token emitido no login desse usuário contém o perfil "<perfil>"

    Exemplos:
      | perfil              |
      | Administrador       |
      | Engenharia          |
      | Financeiro          |

  Cenário: Cadastro de usuário com perfil Instalador de Campo
    Dado que o Administrador está autenticado
    Quando ele cadastra um novo usuário com nome, e-mail e o perfil "Instalador de Campo"
    Então o sistema salva o usuário com status ativo, sem obras vinculadas
    E envia um e-mail com a senha inicial para o endereço cadastrado

  Cenário: Tentativa de cadastro com e-mail duplicado
    Dado que o e-mail "engenharia@zlengenharia.com" já pertence a outro usuário
    Quando o Administrador tenta cadastrar um novo usuário com esse mesmo e-mail
    Então o sistema exibe mensagem de erro e impede o cadastro

  Cenário: Tentativa de cadastro sem e-mail
    Dado que o Administrador está autenticado
    Quando ele tenta cadastrar um usuário sem informar o e-mail
    Então o sistema exibe mensagem de validação e não cria o usuário

  Cenário: Desativação de usuário ativo
    Dado que o Administrador está autenticado
    E que existe um usuário ativo com sessão aberta
    Quando o Administrador desativa esse usuário
    Então o sistema marca o usuário como inativo
    E invalida todos os tokens ativos do usuário
    E o usuário não consegue realizar novas ações autenticadas

  Cenário: Reativação de usuário inativo
    Dado que o Administrador está autenticado
    E que existe um usuário inativo
    Quando o Administrador reativa o usuário
    Então o sistema marca o usuário como ativo
    E envia um e-mail com nova senha para o usuário

  Cenário: Edição do perfil de usuário ativo invalida tokens
    Dado que o Administrador está autenticado
    E que existe um usuário ativo com sessão aberta com o perfil "Engenharia"
    Quando o Administrador altera o perfil desse usuário para "Financeiro"
    Então o sistema invalida todos os tokens ativos do usuário
    E o usuário precisa fazer login novamente

  Cenário: Perfil sem permissão tenta acessar gestão de usuários
    Dado que o usuário está autenticado com o perfil "Engenharia"
    Quando ele tenta acessar a tela ou rota de gestão de usuários
    Então o sistema nega o acesso com resposta de "Acesso Proibido"
```

### RF-23: Gestão de clientes (tela dedicada)

**Prioridade:** Must | **Situação:** Pendente

> **Nota:** O cadastro de clientes existia como sub-fluxo do cadastro de obras (RF-03). Pela revisão de 07/11/2026, passa a ser uma área própria, com cadastro, listagem, edição e exclusão (CRUD). O formulário de obra só seleciona clientes já cadastrados. A rota já era referenciada no código (`GET /api/clientes`, `POST /api/clientes`).

- A listagem de clientes exibe nome, CPF/CNPJ, cidade e quantidade de obras vinculadas.
- Cadastro, edição e exclusão ficam somente nesta tela.
- O cadastro exige nome e CPF/CNPJ; demais campos são opcionais.
- CPF/CNPJ deve ser válido nos dígitos verificadores e único no sistema.
- Não é possível excluir um cliente que tenha obras vinculadas, inclusive obras excluídas logicamente (`409 CLIENTE_COM_OBRAS`).
- Administrador e Engenharia acessam essa funcionalidade.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-23 @UC-08
Funcionalidade: Gestão de clientes

  Cenário: Listagem de clientes
    Dado que o usuário está autenticado com o perfil "Engenharia"
    Quando ele acessa a tela de clientes
    Então o sistema exibe a lista de clientes com nome, CPF/CNPJ e quantidade de obras

  Cenário: Cadastro de cliente com CPF válido
    Dado que o usuário está autenticado com o perfil "Engenharia"
    Quando ele cadastra um cliente com nome "João da Silva" e CPF "529.982.247-25"
    Então o sistema salva o cliente e o disponibiliza para vínculo com obras

  Cenário: Cadastro de cliente sem CPF/CNPJ
    Dado que o usuário está autenticado com o perfil "Engenharia"
    Quando ele tenta cadastrar um cliente sem informar o CPF/CNPJ
    Então o sistema exibe mensagem de erro indicando o campo obrigatório
    E não salva o cliente

  Cenário: CPF/CNPJ com dígitos verificadores inválidos
    Dado que o usuário está autenticado com o perfil "Engenharia"
    Quando ele tenta cadastrar um cliente com CPF "111.111.111-11"
    Então o sistema exibe mensagem de erro e não salva o cliente

  Cenário: CPF/CNPJ duplicado
    Dado que o CPF "529.982.247-25" já pertence a outro cliente
    Quando o usuário tenta cadastrar um segundo cliente com o mesmo CPF
    Então o sistema exibe mensagem de erro informando que o CPF/CNPJ já está cadastrado

  Cenário: Edição de cliente
    Dado que o usuário está autenticado com o perfil "Engenharia"
    E que existe o cliente "João da Silva" cadastrado
    Quando ele altera o telefone desse cliente e salva
    Então o sistema persiste a alteração
    E o cliente continua disponível para vínculo com obras

  Cenário: Exclusão de cliente sem obras
    Dado que o usuário está autenticado com o perfil "Administrador"
    E que existe um cliente sem obras vinculadas
    Quando ele exclui esse cliente
    Então o sistema remove o cliente da listagem

  Cenário: Exclusão de cliente com obras vinculadas é bloqueada
    Dado que o usuário está autenticado com o perfil "Administrador"
    E que existe um cliente com uma obra excluída logicamente
    Quando ele tenta excluir esse cliente
    Então o sistema recusa a exclusão com a mensagem "Cliente possui obras vinculadas"

  Cenário: Perfil sem permissão tenta acessar clientes
    Dado que o usuário está autenticado com o perfil "Financeiro"
    Quando ele tenta acessar a tela ou rota de clientes
    Então o sistema nega o acesso com resposta de "Acesso Proibido"
```

### RF-24: Página de erro e estados vazios

**Prioridade:** Should | **Situação:** Pendente

> **Nota:** Derivado do achado UX-15 (severidade 4) e UX-17 da avaliação heurística. Itens de menu que levam a rotas inexistentes causam confusão. Este RF estabelece os comportamentos de fallback obrigatórios.

- Rota não encontrada exibe tela "Página não encontrada" com botão para retornar à tela principal do perfil.
- Listas vazias exibem mensagem descritiva e, quando o perfil tem permissão, um botão de ação (ex.: "Cadastrar primeira obra").
- Erros de API exibem mensagem amigável sem expor detalhes técnicos.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-24
Funcionalidade: Estados de erro e listas vazias

  Cenário: Rota inexistente no frontend
    Dado que o usuário está autenticado
    Quando ele navega para uma URL que não existe no sistema
    Então o sistema exibe a tela "Página não encontrada"
    E exibe um botão para retornar à tela principal do seu perfil

  Cenário: Lista vazia com perfil com permissão de cadastro
    Dado que o usuário está autenticado com o perfil "Engenharia"
    E que não existe nenhuma obra cadastrada
    Quando ele abre o quadro Kanban
    Então o sistema exibe a mensagem "Nenhuma obra cadastrada"
    E exibe o botão "Cadastrar primeira obra"

  Cenário: Lista vazia com perfil somente leitura
    Dado que o usuário está autenticado com o perfil "Financeiro"
    E que não existe nenhuma obra cadastrada
    Quando ele abre o quadro Kanban
    Então o sistema exibe a mensagem "Nenhuma obra cadastrada"
    E não exibe botão de cadastro

  Cenário: Erro de API exibe mensagem amigável
    Dado que o serviço de API está indisponível
    Quando o usuário tenta carregar uma lista de obras
    Então o sistema exibe mensagem amigável de erro
    E não exibe stack trace ou detalhes técnicos
```

### RF-25: Catálogo de produtos e preços

**Prioridade:** Must | **Situação:** Pendente

O Financeiro e o Administrador mantêm o catálogo de produtos, com preço. A Engenharia usa o catálogo para incluir materiais nas obras, sem ver preços. O cadastro de produtos sai da gestão de obras e passa para o financeiro (revisão de 07/11/2026).

- Produto tem nome, tipo (painel, inversor, cabo, disjuntor etc.), unidade e preço unitário.
- A Engenharia vê a lista de produtos com nome, tipo e unidade, sem preço.
- Produto desativado não aparece para novas inclusões de material. Materiais já incluídos mantêm o produto.
- Alterar o preço de um produto não altera o custo de materiais já incluídos nas obras (ver Q13).

**Critérios de aceite:**

```gherkin
# language: pt
@RF-25 @UC-39 @UC-40
Funcionalidade: Catálogo de produtos

  Cenário: Financeiro cadastra produto com preço
    Dado que o usuário está autenticado com o perfil "Financeiro"
    Quando ele cadastra o produto "Painel Solar 550W", tipo "painel", unidade "un" e preço unitário "R$ 780,00"
    Então o sistema salva o produto e o disponibiliza para inclusão em obras

  Cenário: Engenharia vê produtos sem preço
    Dado que o usuário está autenticado com o perfil "Engenharia"
    E que existe o produto "Painel Solar 550W" cadastrado
    Quando ele consulta a lista de produtos
    Então o sistema exibe nome, tipo e unidade do produto
    E não exibe o preço

  Cenário: Engenharia inclui material a partir de produto cadastrado
    Dado que o usuário está autenticado com o perfil "Engenharia"
    E que existe uma obra cadastrada
    Quando ele inclui 2 unidades de "Painel Solar 550W" na obra
    Então o sistema cria o material com o status "em solicitação"

  Cenário: Inclusão de material fora do catálogo
    Dado que o usuário está autenticado com o perfil "Engenharia"
    Quando ele tenta incluir um material que não é um produto cadastrado
    Então o sistema recusa a inclusão e exige a escolha de um produto da lista

  Cenário: Produto desativado não aparece para novas inclusões
    Dado que o produto "Cabo Solar 6mm" está desativado
    Quando a Engenharia abre a lista para incluir material em uma obra
    Então o produto não aparece na lista

  Esquema do Cenário: Acesso ao catálogo por perfil
    Dado que o usuário está autenticado com o perfil "<perfil>"
    Quando ele tenta cadastrar ou alterar um produto
    Então o sistema responde com "<resultado>"

    Exemplos:
      | perfil              | resultado        |
      | Administrador       | Acesso Concedido |
      | Financeiro          | Acesso Concedido |
      | Engenharia          | Acesso Proibido  |
      | Instalador de Campo | Acesso Proibido  |
```

### RF-26: Isolamento de valores no módulo financeiro

**Prioridade:** Must | **Situação:** Pendente

Valores (preços de produtos, custos, valor da obra, custo total e DRE) são visíveis somente ao Administrador e ao Financeiro, e somente no módulo financeiro. Gestão de obras, Kanban, Gantt, materiais e a tela do instalador não mostram valores (revisão de 07/11/2026).

- O valor estimado mockado exibido no painel da obra é removido.
- Os campos de preço e de valor da obra não aparecem no cadastro ou na edição de obra.
- As respostas da API para Engenharia e Instalador de Campo não contêm campos de valor, preço ou custo (listagens e detalhes de obras, materiais, Gantt, instalação e cronograma compartilhado).
- A exportação de detalhes de instalação não contém valores.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-26 @UC-10 @UC-31 @UC-32 @UC-33
Funcionalidade: Isolamento de valores no módulo financeiro

  Cenário: Painel da obra sem valor estimado
    Dado que o usuário está autenticado com o perfil "Administrador"
    E que existe uma obra cadastrada
    Quando ele abre o painel lateral da obra no Kanban
    Então o sistema não exibe valor estimado nem valor da obra

  Cenário: Financeiro define o valor da obra
    Dado que o usuário está autenticado com o perfil "Financeiro"
    Quando ele informa o valor da obra no módulo financeiro
    Então o sistema salva o valor e grava log de auditoria

  Esquema do Cenário: Visibilidade de valores por perfil
    Dado que o usuário está autenticado com o perfil "<perfil>"
    Quando ele consulta o valor de uma obra ou o preço de um produto
    Então o sistema responde com "<resultado>"

    Exemplos:
      | perfil              | resultado        |
      | Administrador       | Acesso Concedido |
      | Financeiro          | Acesso Concedido |
      | Engenharia          | Acesso Proibido  |
      | Instalador de Campo | Acesso Proibido  |

  Cenário: Resposta da API sem campos de valor para a Engenharia
    Dado que o usuário está autenticado com o perfil "Engenharia"
    Quando ele consulta o detalhe de uma obra ou a lista de materiais
    Então a resposta não contém campos de valor, preço ou custo
```

## Requisitos não funcionais

| ID | Característica (ISO/IEC 25010) | Requisito | Medida | Situação |
| :---- | :---- | :---- | :---- | :---- |
| RNF-01 | Portabilidade e usabilidade | Layout funcional de 360 px a 1920 px. Instalador com interface mobile-first | Teste de renderização em 360, 768, 1280 e 1920 px nos navegadores Chrome, Firefox e Safari | Em andamento |
| RNF-02 | Segurança (confidencialidade) | 100% do tráfego em HTTPS (TLS 1.2+), sem VPN | Nenhuma rota HTTP acessível em produção | Pendente |
| RNF-03 | Segurança (controle de acesso) | 100% das rotas protegidas validam token e perfil no servidor | 401 sem token; 403 com perfil sem permissão; ambos com log | Pendente |
| RNF-04 | Segurança (responsabilização) | Log irremovível para exclusões, mudanças de status e alterações financeiras | Registro com `userId` e `timestamp` após cada operação crítica | Pendente |
| RNF-05 | Eficiência de desempenho | Exportação em até 5 s para 1.000 registros | P95 ≤ 5 s com 1.000 obras no banco | Pendente |
| RNF-06 | Usabilidade (ISO/IEC 25010) | Usuário sem treinamento extenso conclui as tarefas principais do seu perfil | Taxa de sucesso ≥ 80% por tarefa; escala SUS ≥ 68; taxa de erro < 5%; primeiro uso concluído em menos de 2 h de treinamento | Em andamento |

## Interfaces externas

- **Navegador e celular:** interface responsiva. Desktop para Administrador, Engenharia e Financeiro; celular para o instalador.
- **Aplicativo de mapas:** link de navegação gerado a partir do endereço da obra.
- **Serviço de e-mail:** envio de notificação de conclusão.
- **Arquivos:** exportação em PDF e Excel.
