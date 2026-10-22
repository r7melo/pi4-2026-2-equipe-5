# Requisitos

Prioridades seguem MoSCoW (Must, Should, Could, Won't). A coluna **Situação** indica o estado de implementação na data de atualização deste documento. Os valores são: Concluído, Em andamento, Pendente e Fora do escopo. Os critérios de aceite de cada requisito funcional estão escritos em Gherkin (Dado/Quando/Então), em português.

## Requisitos funcionais

| ID | Requisito | Prioridade | Situação |
| :---- | :---- | :---- | :---- |
| RF-01 | Autenticação e gestão de perfis | Must | Em andamento |
| RF-02 | Autorização por perfil (RBAC) | Must | Pendente |
| RF-03 | Cadastro de clientes e gestão de obras | Must | Em andamento |
| RF-04 | Funil Kanban | Must | Em andamento |
| RF-05 | Raia de assistência e manutenção | Should | Pendente |
| RF-06 | Status de material | Should | Em andamento |
| RF-07 | Equipes e alocação no Gantt | Must | Em andamento |
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

### RF-01: Autenticação e gestão de perfis

O sistema autentica por e-mail e senha e emite um token de acesso (JWT) com o perfil do usuário. Somente o Administrador cadastra usuários de qualquer perfil.

- Login válido redireciona para a tela do perfil. Instalador vai para a lista de instalações.
- Erro de credencial mostra "E-mail ou senha incorretos", sem indicar qual campo está errado.
- Cinco falhas consecutivas bloqueiam novas tentativas por tempo determinado.
- E-mail deve ser único.
- Senhas são armazenadas somente como hash.
- O tempo de expiração do token é configurável por `JWT_EXPIRES_MINUTES`.

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

  Cenário: Credenciais incorretas na autenticação
    Dado que o usuário está na tela de login
    Quando o usuário informa e-mail ou senha incorretos
    Então o sistema exibe a mensagem "E-mail ou senha incorretos" sem especificar qual credencial errou
```

### RF-02: Autorização por perfil (RBAC)

Toda rota protegida valida token e perfil no servidor. Sem token: `401`. Perfil sem permissão: `403`. Ambos geram registro em log de segurança.

Matriz completa na seção 4 de [Regras de negócio](04-regras-negocio.md).

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
    Quando ele solicita visualizar os detalhes de uma instalação atribuída à sua equipe
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
      | Instalador de Campo | detalhes da instalação da sua equipe | Acesso Concedido |
```

### RF-03: Cadastro de clientes e gestão de obras

- Cliente tem nome e CPF/CNPJ obrigatórios. CPF/CNPJ é único.
- Obra exige cliente vinculado, escolhido entre os clientes cadastrados ou criado na própria tela de obra.
- O formulário de obra informa categoria (Residencial ou Comercial), quantidade de painéis, quantidade de inversores e dados de pagamento (data de confirmação e prazo contratual).
- Ao cadastrar uma obra, o sistema cria o cartão no Kanban na primeira coluna e registra a ação na timeline.
- Exclusão de obra é lógica: a obra some das listagens, o cartão é removido e o log registra usuário e data.
- Obra em execução não pode ser excluída.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-03 @UC-08 @UC-10 @UC-11 @UC-15 @UC-16 @UC-20
Funcionalidade: Cadastro de clientes e gestão de obras

  Cenário: Cadastro de cliente com dados completos
    Dado que o usuário está autenticado com o perfil "Engenharia"
    Quando ele cadastra um cliente com nome, CPF/CNPJ, telefone, e-mail e endereço
    Então o sistema salva o cliente e o disponibiliza para vínculo com obras

  Cenário: Cadastro de cliente sem CPF/CNPJ
    Dado que o usuário está autenticado com o perfil "Engenharia"
    Quando ele tenta cadastrar um cliente sem informar o CPF/CNPJ
    Então o sistema exibe mensagem de erro indicando o campo obrigatório
    E não salva o cliente

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

### RF-04: Funil Kanban

- O quadro tem as colunas: Material Comprado, No Depósito, Separado, Em Andamento e Concluído, mais a raia de Assistência.
- Mover um cartão altera o status da obra, grava a ação na timeline e grava log.
- Transições fora do fluxo são recusadas, e o cartão volta para a coluna de origem com o motivo.
- Edição do cartão e comentários: somente Administrador e Engenharia.
- Ao arrastar um cartão, somente as colunas permitidas para aquela obra ficam destacadas.
- Movimentação alternativa pelo menu do cartão ("Mover para..."), para teclado e celular.
- Ao clicar no cartão, abre painel com as abas Dados, Materiais, Histórico e Comentários.
- Financeiro e Instalador têm o quadro em modo leitura.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-04 @UC-12 @UC-15 @UC-16 @UC-17 @UC-18 @UC-19 @UC-20
Funcionalidade: Gerenciamento do funil Kanban

  Cenário: Movimentação de cartão altera o status da obra
    Dado que o usuário está autenticado com o perfil "Engenharia"
    E que existe um cartão de obra em uma coluna do Kanban
    Quando ele move o cartão para outra coluna
    Então o sistema altera automaticamente o status da obra para o da nova coluna
    E grava a ação na linha do tempo com usuário, data e hora
    E grava log de auditoria da alteração de status

  Cenário: Edição de dados do cartão
    Dado que o usuário está autenticado com o perfil "Administrador"
    E que existe um cartão de obra no Kanban
    Quando ele edita os dados do cartão e salva
    Então o sistema persiste os novos dados no cartão

  Cenário: Inclusão de comentário no cartão
    Dado que o usuário está autenticado com o perfil "Engenharia"
    E que existe um cartão de obra no Kanban
    Quando ele inclui um comentário no cartão
    Então o sistema exibe o comentário no cartão
    E registra o comentário na linha do tempo da obra

  Cenário: Perfil somente leitura tenta mover cartão
    Dado que o usuário está autenticado com o perfil "Financeiro"
    Quando ele tenta mover um cartão entre colunas
    Então o sistema nega o acesso com resposta de "Acesso Proibido"
    E o status da obra permanece inalterado
```

### RF-05: Raia de assistência e manutenção

- Obras pós-instalação aparecem na raia de Assistência.
- O instalador vê somente as manutenções da própria equipe.
- Concluir a manutenção registra o serviço executado, altera o status e grava na timeline.
- Comentário de manutenção é opcional, mas quando enviado não pode ser vazio. Guarda autor, data e hora.
- Outros perfis não concluem manutenção.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-05 @UC-14 @UC-20 @UC-25
Funcionalidade: Raia de assistência e módulo de manutenção

  Cenário: Instalador visualiza manutenções atribuídas à sua equipe
    Dado que o Instalador de Campo está autenticado
    E que existem manutenções na raia de assistência atribuídas à sua equipe
    Quando ele acessa a lista de manutenções
    Então o sistema exibe somente as manutenções atribuídas à sua equipe

  Cenário: Conclusão de manutenção com comentário
    Dado que o Instalador de Campo está autenticado
    E que existe uma manutenção atribuída à sua equipe
    Quando ele registra a execução do serviço, adiciona um comentário e marca a manutenção como concluída
    Então o sistema altera o status da manutenção para concluída
    E grava o evento na linha do tempo da obra

  Cenário: Conclusão de manutenção sem comentário
    Dado que o Instalador de Campo está autenticado
    E que existe uma manutenção atribuída à sua equipe
    Quando ele registra a execução do serviço sem adicionar comentário e marca a manutenção como concluída
    Então o sistema conclui a manutenção normalmente

  Cenário: Instalador tenta acessar manutenção de outra equipe
    Dado que o Instalador de Campo está autenticado
    E que existe uma manutenção atribuída a outra equipe
    Quando ele tenta acessar essa manutenção
    Então o sistema nega o acesso com resposta de "Acesso Proibido"

  Cenário: Perfil sem permissão tenta concluir manutenção
    Dado que o usuário está autenticado com o perfil "Administrador"
    Quando ele tenta marcar uma manutenção como concluída
    Então o sistema nega o acesso com resposta de "Acesso Proibido"
```

### RF-06: Status de material

- Cada material tem um status logístico: `Comprado`, `EmTransito`, `Disponivel` ou `Utilizado` (material consumido na instalação).
- O status aparece com rótulo e cor no cartão do Kanban e na barra do Gantt, nos dois lugares ao mesmo tempo.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-06 @UC-17
Funcionalidade: Status do material da obra

  Esquema do Cenário: Exibição do status do material no Kanban e no Gantt
    Dado que existe uma obra com material de status "<status>"
    Quando o usuário visualiza o cartão da obra no Kanban e a barra da obra no Gantt
    Então o sistema exibe o rótulo "<status>" com a cor correspondente em ambos

    Exemplos:
      | status                 |
      | comprado               |
      | em trânsito            |
      | disponível no depósito |

  Cenário: Atualização do status do material
    Dado que o usuário está autenticado com o perfil "Engenharia"
    E que existe uma obra com material de status "comprado"
    Quando ele altera o status do material para "em trânsito"
    Então o sistema atualiza o rótulo e a cor no cartão do Kanban
    E atualiza o rótulo e a cor na barra do Gantt
```

### RF-07: Equipes e alocação no Gantt

- Equipe tem nome, ao menos um instalador e um responsável (que deve estar entre os instaladores).
- Um instalador não pode estar em duas equipes no mesmo período.
- Alocar equipe a uma obra define o período da instalação no Gantt.
- Conflito de agenda da equipe é bloqueado, com mensagem informando o período ocupado.
- A lista de equipes indica as equipes ocupadas no período antes da confirmação.
- Obra só pode ser alocada se estiver apta (materiais separados).
- Perfis Financeiro e Instalador não alocam equipes.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-07 @UC-13 @UC-21 @UC-22
Funcionalidade: Gestão de equipes e alocação no Gantt

  Cenário: Criação de equipe de campo com responsável
    Dado que o usuário está autenticado com o perfil "Engenharia"
    E que existem instaladores cadastrados no sistema
    Quando ele cria uma equipe selecionando instaladores e definindo um responsável
    Então o sistema salva a equipe com seus integrantes e o responsável

  Cenário: Criação de equipe sem responsável
    Dado que o usuário está autenticado com o perfil "Engenharia"
    Quando ele tenta criar uma equipe sem definir um responsável
    Então o sistema exibe mensagem de erro e não cria a equipe

  Cenário: Alocação de equipe a uma obra no Gantt
    Dado que o usuário está autenticado com o perfil "Engenharia"
    E que existe uma obra definida para instalação
    E que existe uma equipe sem obras no período desejado
    Quando ele aloca a equipe à obra no período desejado
    Então o sistema exibe a barra da obra no Gantt para a equipe e o período escolhidos

  Cenário: Conflito de agenda da equipe
    Dado que a equipe "Equipe A" já está alocada a uma obra de 10/11/2026 a 12/11/2026
    Quando o usuário tenta alocar a "Equipe A" a outra obra em 11/11/2026
    Então o sistema impede a alocação
    E exibe mensagem informando o conflito de agenda

  Cenário: Perfil sem permissão tenta alocar equipe
    Dado que o usuário está autenticado com o perfil "Instalador de Campo"
    Quando ele tenta alocar uma equipe a uma obra no Gantt
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

- Reordenar uma alocação recalcula as datas das alocações seguintes da mesma equipe.
- O cálculo de término usa somente dias úteis.
- Reagendamento que sobrepõe outra alocação da mesma equipe é bloqueado.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-09 @UC-22
Funcionalidade: Reordenação e propagação de atrasos no Gantt

  Cenário: Propagação de atraso para obras vinculadas
    Dado que a obra "A" e a obra "B" estão vinculadas na mesma equipe, com a obra "B" iniciando após a obra "A"
    Quando o usuário adia o término da obra "A" em 2 dias úteis
    Então o sistema desloca o início e o término da obra "B" em 2 dias úteis

  Cenário: Fins de semana não contam como dias úteis
    Dado que uma obra de 2 dias de duração inicia em uma sexta-feira
    Quando o sistema calcula a data de término no Gantt
    Então o término ocorre na segunda-feira seguinte
    E sábado e domingo não são contados na duração

  Cenário: Reagendamento que gera conflito de agenda
    Dado que a equipe possui duas obras alocadas em períodos distintos
    Quando o usuário reagenda uma das obras para um período que sobrepõe a outra
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

- O instalador faz login e acessa a lista de instalações da sua equipe.
- Cada instalação mostra kit de materiais, endereço, projeto e instruções.
- Botão "Abrir rota" envia o endereço ao aplicativo de mapas do dispositivo.
- Instalador registra e conclui manutenções e comenta sobre elas.
- Instalador não vê instalações de outras equipes e não acessa telas administrativas ou financeiras.

**Critérios de aceite:**

```gherkin
# language: pt
@RF-19 @UC-01 @UC-03 @UC-14 @UC-24 @UC-25 @UC-26
Funcionalidade: Módulo do Instalador de Campo

  Cenário: Consulta de detalhes da instalação pelo instalador logado
    Dado que o Instalador de Campo fez login no sistema com suas credenciais
    Quando ele acessa a tela de instalações
    Então o sistema exibe os kits de materiais, o endereço e as instruções das obras alocadas à sua equipe

  Cenário: Instalador não vê instalações de outras equipes
    Dado que o Instalador de Campo está autenticado
    E que existem instalações alocadas a outras equipes
    Quando ele acessa a tela de instalações
    Então o sistema não exibe as instalações das outras equipes

  Cenário: Abertura de rota no aplicativo de mapas
    Dado que o Instalador de Campo está visualizando uma instalação com endereço cadastrado
    Quando ele clica no botão "Abrir Rota"
    Então o sistema aciona o aplicativo de GPS padrão enviando as coordenadas/endereço da obra

  Cenário: Registro de manutenção concluída
    Dado que o Instalador de Campo está visualizando uma manutenção atribuída à sua equipe
    Quando ele registra a execução do serviço e marca a manutenção como concluída
    Então o sistema altera o status da manutenção para concluída

  Cenário: Comentário sobre manutenção executada
    Dado que o Instalador de Campo está visualizando uma manutenção atribuída à sua equipe
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
