# Documento de Requisitos Funcionais e Não Funcionais

**ZL Engenharia — Especificação de Requisitos de Software v1.1**

## Controle do Documento

| Campo | Valor |
| --- | --- |
| Versão do documento | 1.1 |
| Data | 05/10/2026 |
| Status | Versão corrigida e alinhada com os Casos de Uso |
| Projeto | Projeto Integrador IV (UFC) |
| Cliente | ZL Engenharia |
| Documento anterior | Especificacao_de_Requisitos_ZL_Engenharia_v1.0.md |
| Documentos relacionados | Casos-de-Uso-ZL-Eng.md, ZLEng.puml |

### Templates Utilizados

| Elemento | Template adotado |
| --- | --- |
| Estrutura do documento | ISO/IEC/IEEE 29148:2018 |
| Requisitos funcionais (RF) | Wiegers (Software Requirements): ID, nome, descrição, prioridade, origem, dependências, UC relacionado e critério de aceite |
| Requisitos não funcionais (RNF) | ISO/IEC 25010 (característica de qualidade) + Planguage de Gilb (Gist, Scale, Meter, Must) |
| Regras de negócio (RN) | Catálogo com ID próprio e tipo, na taxonomia de Ross / Business Rules Group |
| Critérios de aceite | Gherkin (Dado/Quando/Então), em português |
| Priorização | MoSCoW (Must/Should/Could/Won't), com equivalência às prioridades Alta, Média e Baixa |
| Casos de uso | Cockburn (Writing Effective Use Cases), conforme Casos-de-Uso-ZL-Eng.md |
| Rastreabilidade | Matriz RF ↔ UC ↔ RN ↔ cenários Gherkin (Apêndice A) |

### Histórico de Versões

| Versão | Data | Descrição |
| --- | --- | --- |
| 0.x | — | Rascunho: RF-01 a RF-20, RNF-01 a RNF-08, perfis, regras de negócio e Gherkin (Documentacao_de_Requisitos_ZL_Engenharia.md). |
| 1.0 | 05/10/2026 | Reestruturação na ISO/IEC/IEEE 29148. RFs no template do Wiegers, RNFs em Planguage, regras de negócio em catálogo tipado e prioridade MoSCoW. |
| 1.1 | 05/10/2026 | Correção de divergências e alinhamento total com Casos-de-Uso-ZL-Eng.md (detalhes abaixo). |

Alterações da versão 1.1:

1. Remoção do perfil inconsistente "Visualizador/Leitor".
2. Correção do perfil Instalador de Campo, definindo-o formalmente como usuário cadastrado no sistema com login e senha (UC-01, UC-03, UC-09).
3. Inclusão dos fluxos de cadastro de clientes (UC-08), cadastro de instaladores (UC-09), exclusão lógica de obras (UC-11), gerenciamento de equipes (UC-21), alocação no Gantt (UC-22), exportação de detalhes (UC-23), consulta de instalação (UC-24), realização de manutenção (UC-25) e abertura de rota (UC-26).
4. Atualização integral da Matriz de Rastreabilidade (Apêndice A) e resolução das divergências registradas.

## 1. Visão Geral do Produto

### 1.1 Perspectiva do Produto

Sistema web em nuvem para a gestão integrada de obras da ZL Engenharia. O sistema centraliza desde o cadastro de clientes e projetos até a execução em campo e fechamento financeiro. Os instaladores de campo possuem conta no sistema, acessando suas tarefas diretamente por login em interface adaptada para dispositivos móveis.

### 1.2 Funções do Produto

| Função | Requisitos | Casos de uso |
| --- | --- | --- |
| Autenticação e Permissões | RF-01, RF-02 | UC-01 a UC-07, UC-09 |
| Clientes e Obras | RF-03 | UC-08, UC-10, UC-11 |
| Funil Kanban | RF-04, RF-05, RF-06, RF-10 | UC-12, UC-15 a UC-19 |
| Cronograma e Equipes (Gantt) | RF-07, RF-08, RF-09 | UC-13, UC-21, UC-22 |
| Histórico e Auditoria | RF-11, RF-12 | UC-20 |
| Módulo do Instalador de Campo | RF-19 | UC-14, UC-24, UC-25, UC-26 |
| Relatórios e Financeiro | RF-14, RF-15, RF-20 | UC-23 |
| Modo Display e Compartilhamento | RF-16, RF-18 | — |
| Homologação (fase futura) | RF-17 | — |

### 1.3 Perfis de Usuário (Atores do Sistema)

| Perfil | Descrição | Pode | Não pode | UC relacionados |
| --- | --- | --- | --- | --- |
| Administrador | Gestão geral do sistema. | Cadastrar usuários de todos os perfis (UC-05 a UC-07, UC-09), clientes (UC-08), obras (UC-10), apagar obras (UC-11), gerenciar cartões Kanban (UC-15 a UC-19), criar equipes (UC-21), alocar no Gantt (UC-22), exportar detalhes (UC-23), ver financeiro/DRE e editar timeline. | — | UC-01 a UC-13, UC-15 a UC-23 |
| Engenharia / Obras | Planejamento e execução de obras. | Cadastrar obras (UC-10), apagar obras (UC-11), gerenciar/mover cartões no Kanban (UC-17, UC-18, UC-19), definir obras para instalação (UC-13), criar equipes (UC-21), alocar no Gantt (UC-22), acompanhar linha do tempo (UC-20). | Cadastrar usuários, acessar relatórios financeiros/DRE e editar/excluir histórico da timeline. | UC-01 a UC-04, UC-10 a UC-13, UC-17 a UC-22 |
| Financeiro | Controle de custos e resultado. | Consultar obras, Kanban, Gantt e linha do tempo em modo leitura; consultar e calcular custos (RF-14), emitir DRE da obra (RF-20), exportar relatórios financeiros (RF-15) e incluir comentários na timeline. | Cadastrar/apagar obras, mover cartões no Kanban, alocar equipes no Gantt e gerenciar usuários. | UC-01 a UC-04, UC-07 |
| Instalador de Campo | Execução e manutenção das instalações no campo. | Fazer login (UC-01), acessar seus recursos (UC-03), visualizar detalhes das instalações de sua equipe (kit, endereço, projeto, instruções) (UC-24), abrir rota no GPS (UC-26), registrar e concluir manutenções (UC-25) e incluir comentários sobre manutenções (UC-14). | Acessar dados financeiros, DRE, criar/apagar obras, mover cartões gerais do Kanban, gerenciar equipes ou usuários. | UC-01 a UC-04, UC-14, UC-24, UC-25, UC-26 |

## 2. Requisitos Funcionais

<a id="rf-01"></a>

### RF-01: Autenticação de Usuários e Gestão de Perfis

| ID | RF-01 |
| --- | --- |
| Prioridade (MoSCoW) | Must |
| Origem | Casos-de-Uso-ZL-Eng.md (UC-01, UC-02, UC-05, UC-06, UC-07, UC-09) |
| Dependências | — |
| Regras de Negócio | RN-04 |
| UC Relacionado | UC-01, UC-02, UC-05, UC-06, UC-07, UC-09 |

**Descrição:**
O sistema deve autenticar os usuários por e-mail e senha e emitir token de acesso contendo o perfil do usuário. O Administrador é responsável por cadastrar novos usuários e atribuir seus perfis: Administrador (UC-05), Engenharia (UC-06), Financeiro (UC-07) ou Instalador de Campo (UC-09).

**Atores:**
Administrador, Engenharia, Financeiro, Instalador de Campo.

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

<a id="rf-02"></a>

### RF-02: Controle de Autorização e Acesso a Recursos (RBAC)

| ID | RF-02 |
| --- | --- |
| Prioridade (MoSCoW) | Must |
| Origem | Casos-de-Uso-ZL-Eng.md (UC-03, UC-04) |
| Dependências | RF-01 |
| Regras de Negócio | RN-04, RN-05 |
| UC Relacionado | UC-03, UC-04 |

**Descrição:**
O sistema deve validar a autorização a cada requisição (UC-04), garantindo que o perfil contido no token possui permissão para acessar o recurso solicitado (UC-03).

**Matriz de Permissões por Perfil:**

| Funcionalidade / Recurso | Adm. | Eng. | Fin. | Instalador |
| --- | --- | --- | --- | --- |
| Autenticação e acesso ao sistema (UC-01, UC-03) | Sim | Sim | Sim | Sim |
| Cadastrar Administrador, Engenheiro, Financeiro, Instalador (UC-05 a UC-09) | Sim | Não | Não | Não |
| Cadastrar Cliente e Cadastrar Obra (UC-08, UC-10) | Sim | Sim | Não | Não |
| Apagar Obra (UC-11) | Sim | Sim | Não | Não |
| Mover / Editar Cartões no Kanban (UC-17, UC-18, UC-19) | Sim | Sim | Não | Não |
| Criar Equipe de Campo e Alocar no Gantt (UC-21, UC-22) | Sim | Sim | Não | Não |
| Exportar Detalhes de Instalação (UC-23) | Sim | Não | Não | Não |
| Visualizar Detalhes da Instalação, Kits e Rota (UC-24, UC-26) | Sim | Sim | Não | Sim |
| Realizar / Concluir Manutenção e Comentar Manutenção (UC-14, UC-25) | Não | Não | Não | Sim |
| Consultar Custo Total e DRE da Obra (RF-14, RF-20) | Sim | Não | Sim | Não |
| Editar/Excluir registros da Timeline (RF-12) | Sim | Não | Não | Não |

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

<a id="rf-03"></a>

### RF-03: Cadastro de Clientes e Gestão de Obras

| ID | RF-03 |
| --- | --- |
| Prioridade (MoSCoW) | Must |
| Origem | Casos-de-Uso-ZL-Eng.md (UC-08, UC-10, UC-11) |
| Dependências | RF-01, RF-02 |
| Regras de Negócio | RN-03 |
| UC Relacionado | UC-08, UC-10, UC-11, UC-15, UC-16, UC-20 |

**Descrição:**
O sistema deve permitir cadastrar clientes (UC-08) com nome, CPF/CNPJ, telefone, e-mail e endereço. Permite cadastrar obras vinculadas obrigatoriamente a um cliente (UC-10), criando o cartão no Kanban (UC-15) e registrando a ação na linha do tempo (UC-20). Permite também a exclusão lógica de obras (UC-11) e do cartão correspondente (UC-16).

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

<a id="rf-04"></a>

### RF-04: Gerenciamento do Funil Kanban (Cartões e Status)

| ID | RF-04 |
| --- | --- |
| Prioridade (MoSCoW) | Must |
| Origem | Casos-de-Uso-ZL-Eng.md (UC-12, UC-15, UC-16, UC-17, UC-18, UC-19) |
| Dependências | RF-03 |
| Regras de Negócio | RN-03, RN-05 |
| UC Relacionado | UC-12, UC-15, UC-16, UC-17, UC-18, UC-19, UC-20 |

**Descrição:**
O sistema deve manter o quadro Kanban de obras. Movimentar um cartão entre colunas (UC-18) altera automaticamente o status da obra (UC-12) e grava a ação na linha do tempo (UC-20). Permite editar dados do cartão (UC-17) e incluir comentários (UC-19).

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

<a id="rf-05"></a>

### RF-05: Raia de Assistência e Módulo de Manutenção

| ID | RF-05 |
| --- | --- |
| Prioridade (MoSCoW) | Should |
| Origem | Casos-de-Uso-ZL-Eng.md (UC-14, UC-25) |
| Dependências | RF-04 |
| Regras de Negócio | RN-05 |
| UC Relacionado | UC-14, UC-20, UC-25 |

**Descrição:**
O sistema deve prover uma raia no Kanban para assistência pós-instalação. O Instalador de Campo autenticado acessa as manutenções atribuídas à sua equipe, registra a execução do serviço, adiciona comentários opcionais (UC-14), marca a manutenção como concluída (UC-25) e o sistema grava o evento na linha do tempo (UC-20).

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

<a id="rf-06"></a>

### RF-06: Status do Material

| ID | RF-06 |
| --- | --- |
| Prioridade (MoSCoW) | Should |
| Origem | Levantamento com cliente ZL Engenharia |
| Dependências | RF-03 |
| Regras de Negócio | — |
| UC Relacionado | UC-17 |

**Descrição:**
Registrar a situação dos materiais da obra (painéis e inversores) exibindo cores e rótulos no card do Kanban e no Gantt (comprado, em trânsito, disponível no depósito).

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

<a id="rf-07"></a>

### RF-07: Gestão de Equipes e Alocação no Diagrama de Gantt

| ID | RF-07 |
| --- | --- |
| Prioridade (MoSCoW) | Must |
| Origem | Casos-de-Uso-ZL-Eng.md (UC-13, UC-21, UC-22) |
| Dependências | RF-03, RF-08 |
| Regras de Negócio | RN-01, RN-02 |
| UC Relacionado | UC-13, UC-21, UC-22 |

**Descrição:**
Permite criar equipes de campo selecionando os instaladores cadastrados e definindo um responsável (UC-21). Permite alocar a equipe a uma obra em um período no Gantt (UC-22), definindo a obra para instalação (UC-13) e impedindo conflitos de agenda (uma equipe não pode ter duas obras no mesmo período).

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

<a id="rf-08"></a>

### RF-08: Estimativa Automática de Duração da Instalação

| ID | RF-08 |
| --- | --- |
| Prioridade (MoSCoW) | Should |
| Origem | Rascunho de requisitos / Regra de produtividade |
| Dependências | RF-03, RF-07 |
| Regras de Negócio | RN-01 |
| UC Relacionado | UC-22 |

**Descrição:**
Calcula a duração prevista da obra com base no número de painéis e na produtividade padrão de 9 painéis/dia (arredondada para múltiplos de 0,5 dia).

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

<a id="rf-09"></a>

### RF-09: Reordenação e Propagação de Atrasos no Gantt

| ID | RF-09 |
| --- | --- |
| Prioridade (MoSCoW) | Must |
| Origem | Regras operacionais do Gantt |
| Dependências | RF-07 |
| Regras de Negócio | RN-02 |
| UC Relacionado | UC-22 |

**Descrição:**
Permite reagendar barras no Gantt propagando alterações em cadeia para obras vinculadas e desconsiderando sábados e domingos na contagem de dias úteis.

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

<a id="rf-10"></a>

### RF-10: Sincronização entre Gantt e Funil Kanban

| ID | RF-10 |
| --- | --- |
| Prioridade (MoSCoW) | Should |
| Origem | Fluxo de automação |
| Dependências | RF-04, RF-07 |
| Regras de Negócio | — |
| UC Relacionado | UC-12, UC-13, UC-18 |

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

<a id="rf-11"></a>

### RF-11: Histórico da Obra e Linha do Tempo (Timeline)

| ID | RF-11 |
| --- | --- |
| Prioridade (MoSCoW) | Should |
| Origem | Casos-de-Uso-ZL-Eng.md (UC-20) |
| Dependências | RF-01 |
| Regras de Negócio | RN-05 |
| UC Relacionado | UC-19, UC-20 |

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

<a id="rf-12"></a>

### RF-12: Proteção e Imutabilidade da Timeline

| ID | RF-12 |
| --- | --- |
| Prioridade (MoSCoW) | Should |
| Origem | Regra de Auditoria (RN-05) |
| Dependências | RF-11 |
| Regras de Negócio | RN-05 |
| UC Relacionado | UC-20 |

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

<a id="rf-13"></a>

### RF-13: Notificação por E-mail

| ID | RF-13 |
| --- | --- |
| Prioridade (MoSCoW) | Could |
| Origem | Requisito complementar |
| Dependências | RF-04 |
| Regras de Negócio | — |
| UC Relacionado | — |

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

<a id="rf-14"></a>

### RF-14: Apuração de Custo Total da Obra

| ID | RF-14 |
| --- | --- |
| Prioridade (MoSCoW) | Must |
| Origem | Módulo Financeiro ZL Engenharia |
| Dependências | RF-04 |
| Regras de Negócio | RN-03 |
| UC Relacionado | — |

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

<a id="rf-15"></a>

### RF-15: Exportação de Relatórios e Detalhes de Instalação

| ID | RF-15 |
| --- | --- |
| Prioridade (MoSCoW) | Must |
| Origem | Casos-de-Uso-ZL-Eng.md (UC-23) |
| Dependências | RF-14, RF-20 |
| Regras de Negócio | — |
| UC Relacionado | UC-23 |

**Descrição:**
O sistema deve permitir exportar relatórios financeiros/cronogramas em PDF/Excel e exportar os detalhes da instalação (kit, endereço, equipe e instruções) (UC-23).

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

<a id="rf-16"></a>

### RF-16: Link Compartilhável do Cronograma

| ID | RF-16 |
| --- | --- |
| Prioridade (MoSCoW) | Should |
| Origem | Visualização externa somente leitura |
| Dependências | RF-07 |
| Regras de Negócio | RN-04 |
| UC Relacionado | — |

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

<a id="rf-17"></a>

### RF-17: Acompanhamento de Homologação

| ID | RF-17 |
| --- | --- |
| Prioridade (MoSCoW) | Won't |
| Origem | Fase futura |
| Dependências | RF-03 |
| Regras de Negócio | — |
| UC Relacionado | — |

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

<a id="rf-18"></a>

### RF-18: Modo Display para Monitores

| ID | RF-18 |
| --- | --- |
| Prioridade (MoSCoW) | Could |
| Origem | Exibição em tela cheia |
| Dependências | RF-07 |
| Regras de Negócio | RN-04 |
| UC Relacionado | — |

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

<a id="rf-19"></a>

### RF-19: Módulo de Interface e Operações do Instalador de Campo

| ID | RF-19 |
| --- | --- |
| Prioridade (MoSCoW) | Must |
| Origem | Casos-de-Uso-ZL-Eng.md (UC-14, UC-24, UC-25, UC-26) |
| Dependências | RF-01, RF-02, RF-03, RF-07 |
| Regras de Negócio | RN-04 |
| UC Relacionado | UC-01, UC-03, UC-14, UC-24, UC-25, UC-26 |

**Descrição:**
O sistema deve prover uma interface otimizada para o **Instalador de Campo** autenticado por login (UC-01, UC-03). A interface apresenta a lista das instalações alocadas para sua equipe, permitindo:

1. Consultar kit de materiais, endereço da obra, projeto e instruções de instalação (UC-24).
2. Acionar o botão "Abrir Rota", integrando com o aplicativo de mapas padrão do dispositivo (UC-26).
3. Registrar a execução de serviços de manutenção e marcá-los como concluídos (UC-25).
4. Incluir comentários detalhados sobre as manutenções executadas (UC-14).

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

<a id="rf-20"></a>

### RF-20: Relatório Financeiro da Obra (DRE da Obra)

| ID | RF-20 |
| --- | --- |
| Prioridade (MoSCoW) | Must |
| Origem | Módulo Financeiro ZL Engenharia |
| Dependências | RF-14 |
| Regras de Negócio | RN-03 |
| UC Relacionado | — |

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

## 3. Interfaces Externas

- Navegador Web e Dispositivos Móveis: Interface responsiva adaptada para computadores (Administrador, Engenharia, Financeiro) e celulares/tablets (Instalador de Campo).
- Aplicativos de Mapas (GPS): Integração para envio de destino via botão "Abrir Rota" (UC-26).
- Serviço de E-mail: Envio de notificações de conclusão e redefinição.
- Entrada/Saída de Arquivos: Leitura de projetos/ART em PDF e exportação de relatórios em PDF e Excel.

## 4. Requisitos Não Funcionais (ISO/IEC 25010 & Planguage de Gilb)

<a id="rnf-01"></a>

### RNF-01: Responsividade e Adaptabilidade Mobile

| Tag | RNF-01 |
| --- | --- |
| Característica (ISO 25010) | Portabilidade (adaptabilidade); Usabilidade |
| Gist | Aplicação web responsiva, acessível pelo navegador sem instalação local. |
| Scale | Faixa de largura de tela e navegadores suportados. |
| Meter | Teste de renderização de 360 px a 1920 px de largura nos navegadores modernos. |
| Must | Uso completo em telas de 360 px a 1920 px de largura. A interface do Instalador de Campo é desenhada sob o conceito mobile-first. |
| Prioridade | Must (Alta) |

<a id="rnf-02"></a>

### RNF-02: Hospedagem em Nuvem e Criptografia

| Tag | RNF-02 |
| --- | --- |
| Característica (ISO 25010) | Portabilidade; Segurança (confidencialidade) |
| Gist | Sistema hospedado em nuvem garantindo acesso remoto seguro. |
| Scale | Percentual de tráfego criptografado. |
| Meter | Verificação de cabeçalhos de segurança e HTTPS. |
| Must | 100% do tráfego criptografado via HTTPS em nuvem, sem necessidade de VPN. |
| Prioridade | Must (Alta) |

<a id="rnf-03"></a>

### RNF-03: Segurança e Controle RBAC

| Tag | RNF-03 |
| --- | --- |
| Característica (ISO 25010) | Segurança (confidencialidade, controle de acesso) |
| Gist | Controle de acesso por perfis impedindo ações não autorizadas. |
| Scale | Percentual de rotas protegidas que validam o perfil no servidor. |
| Meter | Testes de requisições por perfil e por rota. |
| Must | 100% das rotas protegidas por validação de token no servidor (UC-04). Perfis sem permissão recebem resposta de acesso negado e geram registro em log. |
| Prioridade | Must (Alta) |

<a id="rnf-04"></a>

### RNF-04: Registro de Auditoria (Logs)

| Tag | RNF-04 |
| --- | --- |
| Característica (ISO 25010) | Segurança (responsabilização, não repúdio) |
| Gist | Registro de auditoria para operações críticas. |
| Scale | Percentual das operações de alteração/exclusão registradas. |
| Meter | Verificação da base de logs após operações. |
| Must | Operações de exclusão, alteração de status e alterações financeiras gravam log irremovível com ID do usuário e timestamp. |
| Prioridade | Must (Alta) |

<a id="rnf-05"></a>

### RNF-05: Desempenho de Relatórios

| Tag | RNF-05 |
| --- | --- |
| Característica (ISO 25010) | Eficiência de desempenho |
| Gist | Geração rápida de relatórios financeiros e de cronograma. |
| Scale | Tempo decorrido para download do arquivo. |
| Meter | Medição de tempo com volume de 1.000 obras. |
| Must | Exportação e geração de relatórios em no máximo 5 segundos para até 1.000 registros. |
| Prioridade | Must (Alta) |

## 5. Regras de Negócio

| ID | Tipo | Regra | Requisitos / UCs |
| --- | --- | --- | --- |
| RN-01 | Derivação | A duração estimada é quantidade de painéis ÷ produtividade (padrão 9/dia), arredondada para cima em múltiplos de 0,5 dia. | RF-08, UC-22 |
| RN-02 | Restrição | Uma equipe não pode ter duas obras alocadas no mesmo período (conflito de agenda). Fins de semana não contam como dias úteis. | RF-07, RF-09, UC-13, UC-21, UC-22 |
| RN-03 | Restrição | Toda obra deve estar vinculada a um cliente (UC-08, UC-10). O custo total e DRE só podem ser apurados para obras concluídas com precificação completa. | RF-03, RF-04, RF-14, RF-20, UC-08, UC-10 |
| RN-04 | Restrição | O Instalador de Campo é um usuário cadastrado e autenticado via login (UC-01, UC-09). Seu perfil autoriza exclusivamente a navegação em suas instalações (UC-24), abertura de rota (UC-26), realização e conclusão de manutenções (UC-25) e inserção de comentários (UC-14). O perfil não possui acesso a dados financeiros, DRE ou gerenciamento geral do Kanban. | RF-01, RF-02, RF-19, UC-01, UC-03, UC-04, UC-09, UC-14, UC-24, UC-25, UC-26 |
| RN-05 | Restrição | Ações registradas na linha do tempo (UC-20) e logs de auditoria são imutáveis e irremovíveis. Edição e exclusão de itens gerais da timeline são restritas ao Administrador. | RF-11, RF-12, UC-20 |

## Apêndice A: Matriz de Rastreabilidade

| Requisito Funcional (RF) | Casos de Uso Relacionados (UC) | Regras de Negócio (RN) | Prioridade | Cenários Gherkin |
| --- | --- | --- | --- | --- |
| RF-01 (Autenticação e Perfis) | UC-01, UC-02, UC-05, UC-06, UC-07, UC-09 | RN-04 | Must | 6 |
| RF-02 (Controle de Autorização RBAC) | UC-03, UC-04 | RN-04, RN-05 | Must | 4 |
| RF-03 (Cadastro de Clientes e Obras) | UC-08, UC-10, UC-11, UC-15, UC-16 | RN-03 | Must | 6 |
| RF-04 (Funil Kanban) | UC-12, UC-15, UC-16, UC-17, UC-18, UC-19 | RN-03, RN-05 | Must | 4 |
| RF-05 (Raia de Assistência e Manutenção) | UC-14, UC-20, UC-25 | RN-05 | Should | 5 |
| RF-06 (Status do Material) | UC-17 | — | Should | 2 |
| RF-07 (Alocação de Equipes no Gantt) | UC-13, UC-21, UC-22 | RN-01, RN-02 | Must | 5 |
| RF-08 (Estimativa de Duração) | UC-22 | RN-01 | Should | 3 |
| RF-09 (Reordenação de Obras no Gantt) | UC-22 | RN-02 | Must | 3 |
| RF-10 (Sincronização Gantt-Kanban) | UC-12, UC-13, UC-18 | — | Should | 3 |
| RF-11 (Histórico e Linha do Tempo) | UC-19, UC-20 | RN-05 | Should | 3 |
| RF-12 (Proteção da Timeline) | UC-20 | RN-05 | Should | 4 |
| RF-13 (Notificação por E-mail) | — | — | Could | 2 |
| RF-14 (Cálculo de Custo Total) | — | RN-03 | Must | 5 |
| RF-15 (Exportação de Relatórios e Detalhes) | UC-23 | — | Must | 5 |
| RF-16 (Link Compartilhável do Cronograma) | — | RN-04 | Should | 4 |
| RF-17 (Homologação) | — | — | Won't | 1 |
| RF-18 (Modo Display) | — | RN-04 | Could | 3 |
| RF-19 (Módulo do Instalador de Campo) | UC-01, UC-03, UC-14, UC-24, UC-25, UC-26 | RN-04 | Must | 6 |
| RF-20 (DRE da Obra) | — | RN-03 | Must | 5 |
