# Casos de Uso

![](diagrams/casos-de-uso.png)
[fonte PlantUML](diagrams/casos-de-uso.puml)

## Atores

| Ator | Descrição |
| :---- | :---- |
| Usuário | Generalização de todos os atores autenticados |
| Administrador | Gestão geral do sistema |
| Engenharia | Planejamento e execução de obras |
| Financeiro | Custos, DRE e relatórios |
| Instalador de Campo | Execução e manutenção de instalações |
| Sistema | Ator interno, acionado por inclusão de outros casos de uso |

## Matriz de acesso

| Caso de uso | Adm | Eng | Fin | Inst |
| :---- | :---: | :---: | :---: | :---: |
| [UC-01](#uc-01) Login | ✔ | ✔ | ✔ | ✔ |
| [UC-02](#uc-02) Emitir token de acesso | ✔ | ✔ | ✔ | ✔ |
| [UC-03](#uc-03) Acessar recursos | ✔ | ✔ | ✔ | ✔ |
| [UC-04](#uc-04) Validar autorização | ✔ | ✔ | ✔ | ✔ |
| [UC-05](#uc-05) Cadastrar administrador | ✔ | | | |
| [UC-06](#uc-06) Cadastrar engenheiro | ✔ | | | |
| [UC-07](#uc-07) Cadastrar financeiro | ✔ | | | |
| [UC-08](#uc-08) Cadastrar clientes | ✔ | | | |
| [UC-09](#uc-09) Cadastrar instalador de campo | ✔ | | | |
| [UC-10](#uc-10) Cadastrar obra | ✔ | ✔ | | |
| [UC-11](#uc-11) Apagar obra | ✔ | ✔ | | |
| [UC-12](#uc-12) Alterar status da obra | ✔ | ✔ | | |
| [UC-13](#uc-13) Definir obra para instalação | ✔ | ✔ | | |
| [UC-14](#uc-14) Criar comentário sobre a manutenção | | | | ✔ |
| [UC-15](#uc-15) Inserir cartão no Kanban | ✔ | ✔ | | |
| [UC-16](#uc-16) Deletar cartão no Kanban | ✔ | ✔ | | |
| [UC-17](#uc-17) Editar cartão no Kanban | ✔ | ✔ | | |
| [UC-18](#uc-18) Mover cartão no Kanban | ✔ | ✔ | | |
| [UC-19](#uc-19) Adicionar comentário no cartão | ✔ | ✔ | | |
| [UC-20](#uc-20) Registrar ação | ✔ | ✔ | | |
| [UC-21](#uc-21) Criar equipe de campo | ✔ | ✔ | | |
| [UC-22](#uc-22) Alocar equipe | ✔ | ✔ | | |
| [UC-23](#uc-23) Exportar detalhes de instalação | ✔ | | | |
| [UC-24](#uc-24) Visualizar detalhes da instalação | ✔ | ✔ | | ✔ |
| [UC-25](#uc-25) Realizar manutenção | | | | ✔ |
| [UC-26](#uc-26) Abrir rota | ✔ | ✔ | | ✔ |
| [UC-27](#uc-27) Consultar obras e quadro Kanban | | | ✔ | |
| [UC-28](#uc-28) Consultar cronograma (Gantt) | | | ✔ | |
| [UC-29](#uc-29) Consultar linha do tempo | ✔ | ✔ | ✔ | |
| [UC-30](#uc-30) Incluir comentário na linha do tempo | | | ✔ | |
| [UC-31](#uc-31) Registrar custos e precificação | | | ✔ | |
| [UC-32](#uc-32) Apurar custo total | ✔ | | ✔ | |
| [UC-33](#uc-33) Emitir DRE | ✔ | | ✔ | |
| [UC-34](#uc-34) Exportar relatório financeiro | ✔ | | ✔ | |
| [UC-35](#uc-35) Solicitar recuperação de senha | ✔ | ✔ | ✔ | ✔ |
| [UC-36](#uc-36) Atualizar senha | ✔ | ✔ | ✔ | ✔ |

## Descrição dos casos de uso

| ID | Caso de uso | Ator principal | Fluxo principal (resumo) | Regras |
| :---- | :---- | :---- | :---- | :---- |
| [UC-01](#uc-01) | Login | Usuário | Informa e-mail e senha; sistema valida e emite token; redireciona conforme o perfil | Credencial errada não revela qual campo; bloqueio após 5 falhas |
| [UC-02](#uc-02) | Emitir token de acesso | Sistema | Gera token com identificador, perfil e expiração, assinado | Token tem expiração e carrega o perfil |
| [UC-03](#uc-03) | Acessar recursos | Usuário | Solicita recurso; valida autorização (UC-04); exibe o recurso | Acesso depende do perfil; toda requisição exige token |
| [UC-04](#uc-04) | Validar autorização | Sistema | Extrai e valida token; compara perfil com o exigido | Recursos têm perfis definidos; negações são registradas |
| [UC-05](#uc-05) | Cadastrar administrador | Administrador | Informa nome, e-mail e senha inicial; sistema valida e salva | Somente Administrador cadastra Administrador |
| [UC-06](#uc-06) | Cadastrar engenheiro | Administrador | Seleciona perfil Engenharia; informa dados; salva | E-mail único |
| [UC-07](#uc-07) | Cadastrar financeiro | Administrador | Seleciona perfil Financeiro; informa dados; salva | E-mail único |
| [UC-08](#uc-08) | Cadastrar clientes | Administrador | Informa nome, CPF/CNPJ, telefone, e-mail e endereço; salva | CPF/CNPJ válido e único; nome e CPF/CNPJ obrigatórios |
| [UC-09](#uc-09) | Cadastrar instalador de campo | Administrador | Seleciona perfil InstaladorCampo; informa dados; salva | Instalador tem leitura da instalação e registro de manutenção |
| [UC-10](#uc-10) | Cadastrar obra | Administrador, Engenharia | Seleciona cliente; informa endereço, descrição e dados do projeto; salva; cria cartão e registra ação | Toda obra tem cliente; nasce no status inicial |
| [UC-11](#uc-11) | Apagar obra | Administrador, Engenharia | Seleciona obra; confirma; remove cartão; marca obra como excluída | Confirmação explícita; obra em execução não é apagada; exclusão lógica |
| [UC-12](#uc-12) | Alterar status da obra | Sistema | Recebe obra e novo status; valida transição; atualiza; registra ação | Status segue o fluxo; toda mudança é registrada |
| [UC-13](#uc-13) | Definir obra para instalação | Administrador, Engenharia | Seleciona obra; associa equipe e período; move cartão para a coluna de instalação | Obra apta; equipe sem conflito de período |
| [UC-14](#uc-14) | Criar comentário sobre a manutenção | Instalador | Escreve comentário durante a manutenção; sistema salva com autor, data e hora | Comentário é opcional e estende UC-25 |
| [UC-15](#uc-15) | Inserir cartão no Kanban | Sistema | Cria cartão com dados resumidos na primeira coluna | Um cartão por obra |
| [UC-16](#uc-16) | Deletar cartão no Kanban | Sistema | Remove o cartão da coluna | Só junto com a exclusão da obra |
| [UC-17](#uc-17) | Editar cartão no Kanban | Administrador, Engenharia | Altera título, descrição, responsável e datas; salva | Mudança de coluna só por UC-18 |
| [UC-18](#uc-18) | Mover cartão no Kanban | Administrador, Engenharia | Arrasta cartão; sistema valida; executa UC-12; atualiza posição | Respeita a ordem do fluxo; todo movimento altera status e gera registro |
| [UC-19](#uc-19) | Adicionar comentário no cartão | Administrador, Engenharia | Escreve comentário durante a edição; sistema salva | Comentário guarda autor, data e hora |
| [UC-20](#uc-20) | Registrar ação | Sistema | Recebe evento; adiciona data e hora; grava na timeline | Registros não podem ser editados nem removidos; identifica o usuário |
| [UC-21](#uc-21) | Criar equipe de campo | Administrador, Engenharia | Informa nome; seleciona instaladores e responsável; salva; pode definir obra | Equipe tem ao menos um instalador e um responsável; instalador em uma equipe por período |
| [UC-22](#uc-22) | Alocar equipe | Administrador, Engenharia | Seleciona obra, equipe e período; sistema verifica disponibilidade; salva; executa UC-13 | Sem dupla alocação; obra apta |
| [UC-23](#uc-23) | Exportar detalhes de instalação | Administrador | Seleciona obra; sistema reúne kit, endereço, equipe, período e instruções; gera arquivo | Somente dados da obra selecionada |
| [UC-24](#uc-24) | Visualizar detalhes da instalação | Instalador | Abre lista; seleciona instalação; vê kit, endereço, projeto e instruções | Somente instalações da própria equipe; somente leitura |
| [UC-25](#uc-25) | Realizar manutenção | Instalador | Abre manutenção; registra serviço; marca como concluída; sistema salva e registra ação | Somente manutenção da própria equipe; conclusão gera registro |
| [UC-26](#uc-26) | Abrir rota | Instalador | Seleciona instalação; aciona rota; sistema abre o aplicativo de mapas com o endereço | Usa o endereço da obra; só da própria equipe |
| [UC-27](#uc-27) | Consultar obras e quadro Kanban | Financeiro | Abre o quadro; vê cartões e status de material; abre detalhes | Somente leitura |
| [UC-28](#uc-28) | Consultar cronograma (Gantt) | Financeiro | Abre o Gantt; vê barras por equipe e período; abre detalhes | Somente leitura |
| [UC-29](#uc-29) | Consultar linha do tempo | Administrador, Engenharia, Financeiro | Seleciona obra; abre timeline; vê registros em ordem cronológica | Ordem cronológica; registros de ação são imutáveis |
| [UC-30](#uc-30) | Incluir comentário na linha do tempo | Financeiro | Escreve comentário; sistema salva com autor, data e hora | Somente Administrador edita ou exclui |
| [UC-31](#uc-31) | Registrar custos e precificação | Financeiro | Seleciona obra; informa itens de custo e valor da obra; salva; grava log | Precificação completa exige todos os itens e o valor |
| [UC-32](#uc-32) | Apurar custo total | Administrador, Financeiro | Seleciona obra; sistema verifica conclusão e precificação; soma itens | Só obra concluída com precificação completa |
| [UC-33](#uc-33) | Emitir DRE | Administrador, Financeiro | Solicita DRE; executa UC-32; calcula resultado; exibe | Somente obra concluída; somente leitura |
| [UC-34](#uc-34) | Exportar relatório financeiro | Financeiro | Seleciona tipo e período; escolhe PDF ou Excel; gera e disponibiliza | Formatos PDF e Excel; 5 s para 1.000 registros |
| [UC-35](#uc-35) | Solicitar recuperação de senha | Usuário (não autenticado) | Informa e-mail; sistema envia link de uso único por e-mail; exibe mensagem genérica | Link expira em 1 h; resposta idêntica para e-mail existente ou não |
| [UC-36](#uc-36) | Atualizar senha | Usuário | Redefine a senha via link (UC-35) ou altera a senha atual estando autenticado | Nova senha deve atender à política; todos os tokens são invalidados após a alteração |

## Relações entre casos de uso

| Origem | Relação | Destino |
| :---- | :---- | :---- |
| [UC-01](#uc-01) Login | include | UC-02 Emitir token |
| [UC-03](#uc-03) Acessar recursos | include | UC-04 Validar autorização |
| [UC-10](#uc-10) Cadastrar obra | include | UC-15 Inserir cartão; UC-20 Registrar ação |
| [UC-11](#uc-11) Apagar obra | include | UC-16 Deletar cartão |
| [UC-12](#uc-12) Alterar status | include | UC-20 Registrar ação |
| [UC-18](#uc-18) Mover cartão | include | UC-12 Alterar status |
| [UC-13](#uc-13) Definir obra | include | UC-18 Mover cartão |
| [UC-25](#uc-25) Realizar manutenção | include | UC-20 Registrar ação |
| [UC-33](#uc-33) Emitir DRE | include | UC-32 Apurar custo total |
| [UC-14](#uc-14) Comentário de manutenção | extend | UC-25 Realizar manutenção |
| [UC-19](#uc-19) Comentário no cartão | extend | UC-17 Editar cartão |
| [UC-30](#uc-30) Comentário na timeline | extend | UC-29 Consultar linha do tempo |
| [UC-35](#uc-35) Solicitar recuperação de senha | include | UC-36 Atualizar senha |

## Casos de Uso - Textual

<a id="uc-01"></a>

### UC-01 - Login

**Descrição:** Permite que um usuário se autentique no sistema informando suas credenciais.

**Atores:** Usuário (Administrador, Engenharia, Financeiro, Instalador de Campo)

**Pré-condição:** O usuário está cadastrado e ativo no sistema.

**Fluxo principal:**

1. O usuário acessa a tela de login.
2. O usuário informa e-mail e senha.
3. O sistema valida as credenciais.
4. O sistema executa o [UC-02](#uc-02) (Emitir Token de Acesso).
5. O sistema redireciona o usuário para a tela inicial conforme seu perfil.

**Fluxos alternativos:**

- FA1 - Credenciais inválidas (passo 3): o sistema exibe mensagem de erro e retorna ao passo 2.
- FA2 - Usuário inativo (passo 3): o sistema informa que o acesso está desativado e encerra o fluxo.
- FA3 - Tentativas excedidas (passo 3): o sistema bloqueia temporariamente novas tentativas e encerra o fluxo.

**Pós-condição:** O usuário está autenticado e possui um token de acesso válido.

**Regras de negócio:**

- RN1 - A senha deve ser armazenada de forma criptografada (hash).
- RN2 - Após 5 tentativas inválidas consecutivas, o login é bloqueado temporariamente.
- RN3 - A mensagem de erro não deve indicar qual credencial está incorreta.

**Prioridade:** Alta

---

<a id="uc-02"></a>

### UC-02 - Emitir Token de Acesso

**Descrição:** Gera o token que identifica o usuário autenticado e seu perfil nas requisições seguintes.

**Atores:** Sistema (incluído pelo [UC-01](#uc-01))

**Pré-condição:** As credenciais do usuário foram validadas com sucesso.

**Fluxo principal:**

1. O sistema recebe a identificação do usuário autenticado.
2. O sistema gera o token contendo identificador, perfil e data de expiração.
3. O sistema assina o token.
4. O sistema retorna o token ao cliente.

**Fluxos alternativos:**

- FA1 - Falha na geração (passo 2): o sistema registra o erro, informa falha temporária e o login não é concluído.

**Pós-condição:** Um token válido e com prazo de expiração foi emitido para o usuário.

**Regras de negócio:**

- RN1 - O token deve ter tempo de expiração definido.
- RN2 - O token deve conter o perfil do usuário para uso na autorização.

**Prioridade:** Alta

---

<a id="uc-03"></a>

### UC-03 - Acessar Recursos

**Descrição:** Permite que o usuário autenticado acesse as funcionalidades e dados do sistema permitidos ao seu perfil.

**Atores:** Usuário (Administrador, Engenharia, Financeiro, Instalador de Campo)

**Pré-condição:** O usuário está autenticado e possui um token válido.

**Fluxo principal:**

1. O usuário solicita um recurso do sistema.
2. O sistema executa o [UC-04](#uc-04) (Validar Autorização de Acesso).
3. O sistema libera o recurso solicitado.
4. O sistema exibe o recurso ao usuário.

**Fluxos alternativos:**

- FA1 - Token expirado (passo 2): o sistema encerra a sessão e redireciona o usuário para o [UC-01](#uc-01).
- FA2 - Perfil sem permissão (passo 2): o sistema nega o acesso e exibe mensagem de acesso não autorizado.

**Pós-condição:** O recurso é exibido ao usuário ou o acesso é negado.

**Regras de negócio:**

- RN1 - O acesso a cada recurso depende do perfil do usuário.
- RN2 - Toda requisição deve ser acompanhada de token válido.

**Prioridade:** Alta

---

<a id="uc-04"></a>

### UC-04 - Validar Autorização de Acesso

**Descrição:** Verifica se o token apresentado é válido e se o perfil do usuário tem permissão para o recurso solicitado.

**Atores:** Sistema (incluído pelo [UC-03](#uc-03))

**Pré-condição:** Existe uma requisição de acesso a um recurso protegido.

**Fluxo principal:**

1. O sistema extrai o token da requisição.
2. O sistema verifica a assinatura e a validade do token.
3. O sistema identifica o perfil do usuário.
4. O sistema compara o perfil com as permissões exigidas pelo recurso.
5. O sistema autoriza o acesso.

**Fluxos alternativos:**

- FA1 - Token ausente ou inválido (passo 2): o sistema nega o acesso com resposta de não autenticado.
- FA2 - Token expirado (passo 2): o sistema nega o acesso e solicita novo login.
- FA3 - Perfil sem permissão (passo 4): o sistema nega o acesso com resposta de proibido.

**Pós-condição:** O acesso é autorizado ou negado conforme a validação.

**Regras de negócio:**

- RN1 - Cada recurso deve ter a lista de perfis autorizados definida.
- RN2 - Tentativas de acesso negadas devem ser registradas.

**Prioridade:** Alta

---

<a id="uc-05"></a>

### UC-05 - Cadastrar Administrador

**Descrição:** Permite cadastrar um novo usuário com perfil Administrador.

**Atores:** Administrador

**Pré-condição:** O usuário está autenticado com perfil Administrador.

**Fluxo principal:**

1. O Administrador acessa a tela de cadastro de usuários.
2. O Administrador informa nome, e-mail e senha inicial.
3. O Administrador confirma o cadastro.
4. O sistema valida os dados.
5. O sistema salva o novo administrador com status ativo.
6. O sistema exibe mensagem de sucesso.

**Fluxos alternativos:**

- FA1 - E-mail já cadastrado (passo 4): o sistema informa a duplicidade e retorna ao passo 2.
- FA2 - Dados obrigatórios ausentes ou inválidos (passo 4): o sistema destaca os campos e retorna ao passo 2.
- FA3 - Cancelamento (qualquer passo): o sistema descarta os dados e retorna à lista de usuários.

**Pós-condição:** Um novo usuário Administrador está cadastrado e ativo.

**Regras de negócio:**

- RN1 - Somente Administradores podem cadastrar outros Administradores.
- RN2 - O e-mail deve ser único no sistema.
- RN3 - A senha inicial deve atender à política mínima de segurança.

**Prioridade:** Alta

---

<a id="uc-06"></a>

### UC-06 - Cadastrar Engenheiro

**Descrição:** Permite cadastrar um novo usuário com perfil Engenharia.

**Atores:** Administrador

**Pré-condição:** O usuário está autenticado com perfil Administrador.

**Fluxo principal:**

1. O Administrador acessa a tela de cadastro de usuários.
2. O Administrador seleciona o perfil Engenharia.
3. O Administrador informa nome, e-mail e senha inicial.
4. O Administrador confirma o cadastro.
5. O sistema valida os dados.
6. O sistema salva o novo usuário com status ativo.
7. O sistema exibe mensagem de sucesso.

**Fluxos alternativos:**

- FA1 - E-mail já cadastrado (passo 5): o sistema informa a duplicidade e retorna ao passo 3.
- FA2 - Dados obrigatórios ausentes ou inválidos (passo 5): o sistema destaca os campos e retorna ao passo 3.
- FA3 - Cancelamento (qualquer passo): o sistema descarta os dados e retorna à lista de usuários.

**Pós-condição:** Um novo usuário com perfil Engenharia está cadastrado e ativo.

**Regras de negócio:**

- RN1 - Somente Administradores podem cadastrar usuários de Engenharia.
- RN2 - O e-mail deve ser único no sistema.

**Prioridade:** Alta

---

<a id="uc-07"></a>

### UC-07 - Cadastrar Financeiro

**Descrição:** Permite cadastrar um novo usuário com perfil Financeiro.

**Atores:** Administrador

**Pré-condição:** O usuário está autenticado com perfil Administrador.

**Fluxo principal:**

1. O Administrador acessa a tela de cadastro de usuários.
2. O Administrador seleciona o perfil Financeiro.
3. O Administrador informa nome, e-mail e senha inicial.
4. O Administrador confirma o cadastro.
5. O sistema valida os dados.
6. O sistema salva o novo usuário com status ativo.
7. O sistema exibe mensagem de sucesso.

**Fluxos alternativos:**

- FA1 - E-mail já cadastrado (passo 5): o sistema informa a duplicidade e retorna ao passo 3.
- FA2 - Dados obrigatórios ausentes ou inválidos (passo 5): o sistema destaca os campos e retorna ao passo 3.
- FA3 - Cancelamento (qualquer passo): o sistema descarta os dados e retorna à lista de usuários.

**Pós-condição:** Um novo usuário com perfil Financeiro está cadastrado e ativo.

**Regras de negócio:**

- RN1 - Somente Administradores podem cadastrar usuários do Financeiro.
- RN2 - O e-mail deve ser único no sistema.

**Prioridade:** Alta

---

<a id="uc-08"></a>

### UC-08 - Cadastrar Clientes

**Descrição:** Permite cadastrar os clientes da empresa, que serão vinculados às obras.

**Atores:** Administrador

**Pré-condição:** O usuário está autenticado com perfil Administrador.

**Fluxo principal:**

1. O Administrador acessa a tela de cadastro de clientes.
2. O Administrador informa nome, CPF/CNPJ, telefone, e-mail e endereço.
3. O Administrador confirma o cadastro.
4. O sistema valida os dados.
5. O sistema salva o cliente.
6. O sistema exibe mensagem de sucesso.

**Fluxos alternativos:**

- FA1 - CPF/CNPJ inválido (passo 4): o sistema informa o erro e retorna ao passo 2.
- FA2 - Cliente já cadastrado (passo 4): o sistema informa a duplicidade e oferece abrir o cadastro existente.
- FA3 - Cancelamento (qualquer passo): o sistema descarta os dados e retorna à lista de clientes.

**Pós-condição:** O cliente está cadastrado e disponível para vinculação a obras.

**Regras de negócio:**

- RN1 - O CPF/CNPJ deve ser válido e único.
- RN2 - Nome e CPF/CNPJ são obrigatórios.

**Prioridade:** Alta

---

<a id="uc-09"></a>

### UC-09 - Cadastrar Instalador de Campo

**Descrição:** Permite cadastrar um usuário com perfil Instalador de Campo, que consulta instalações e executa manutenções.

**Atores:** Administrador

**Pré-condição:** O usuário está autenticado com perfil Administrador.

**Fluxo principal:**

1. O Administrador acessa a tela de cadastro de usuários.
2. O Administrador seleciona o perfil Instalador de Campo.
3. O Administrador informa nome, e-mail, telefone e senha inicial.
4. O Administrador confirma o cadastro.
5. O sistema valida os dados.
6. O sistema salva o instalador com status ativo.
7. O sistema exibe mensagem de sucesso.

**Fluxos alternativos:**

- FA1 - E-mail já cadastrado (passo 5): o sistema informa a duplicidade e retorna ao passo 3.
- FA2 - Dados obrigatórios ausentes ou inválidos (passo 5): o sistema destaca os campos e retorna ao passo 3.
- FA3 - Cancelamento (qualquer passo): o sistema descarta os dados e retorna à lista de usuários.

**Pós-condição:** O Instalador de Campo está cadastrado e pode ser incluído em equipes de campo.

**Regras de negócio:**

- RN1 - Somente Administradores podem cadastrar Instaladores de Campo.
- RN2 - O Instalador de Campo possui acesso somente de leitura às informações da instalação, além do registro de manutenção.

**Prioridade:** Média

---

<a id="uc-10"></a>

### UC-10 - Cadastrar Obra

**Descrição:** Permite cadastrar uma nova obra de instalação, criando automaticamente seu cartão no Kanban e registrando a ação na linha do tempo.

**Atores:** Administrador, Engenharia

**Pré-condição:** O usuário está autenticado e o cliente da obra já está cadastrado.

**Fluxo principal:**

1. O usuário acessa a tela de cadastro de obras.
2. O usuário seleciona o cliente.
3. O usuário informa endereço da obra, descrição e demais dados do projeto.
4. O usuário confirma o cadastro.
5. O sistema valida os dados.
6. O sistema salva a obra com o status inicial.
7. O sistema executa o [UC-15](#uc-15) (Inserir Cartão de Obra no Kanban).
8. O sistema executa o [UC-20](#uc-20) (Registrar Ação).
9. O sistema exibe mensagem de sucesso.

**Fluxos alternativos:**

- FA1 - Cliente não cadastrado (passo 2): o usuário pode acionar o [UC-08](#uc-08) e retornar ao passo 2.
- FA2 - Dados obrigatórios ausentes (passo 5): o sistema destaca os campos e retorna ao passo 3.
- FA3 - Cancelamento (qualquer passo): o sistema descarta os dados e retorna à lista de obras.

**Pós-condição:** A obra está cadastrada, com cartão na primeira coluna do Kanban e ação registrada na linha do tempo.

**Regras de negócio:**

- RN1 - Toda obra deve estar vinculada a um cliente.
- RN2 - Toda obra nasce com o status inicial do fluxo.
- RN3 - Todo cadastro de obra deve gerar um cartão no Kanban e um registro na linha do tempo.

**Prioridade:** Alta

---

<a id="uc-11"></a>

### UC-11 - Apagar Obra

**Descrição:** Permite remover uma obra do sistema, excluindo também seu cartão no Kanban.

**Atores:** Administrador, Engenharia

**Pré-condição:** O usuário está autenticado e a obra existe.

**Fluxo principal:**

1. O usuário seleciona a obra.
2. O usuário solicita a exclusão.
3. O sistema exibe a confirmação da exclusão.
4. O usuário confirma.
5. O sistema executa o [UC-16](#uc-16) (Deletar Cartão de Obra no Kanban).
6. O sistema remove a obra.
7. O sistema exibe mensagem de sucesso.

**Fluxos alternativos:**

- FA1 - Cancelamento (passo 4): o sistema mantém a obra e retorna à tela anterior.
- FA2 - Obra em instalação ou com equipe alocada (passo 3): o sistema bloqueia a exclusão e informa o motivo.

**Pós-condição:** A obra e seu cartão foram removidos.

**Regras de negócio:**

- RN1 - A exclusão exige confirmação explícita do usuário.
- RN2 - Obras em execução não podem ser apagadas.
- RN3 - A exclusão deve ser lógica, preservando o histórico para auditoria.

**Prioridade:** Média

---

<a id="uc-12"></a>

### UC-12 - Alterar Status da Obra

**Descrição:** Atualiza o status da obra quando seu cartão é movido no Kanban e registra a mudança na linha do tempo.

**Atores:** Sistema (incluído pelo [UC-18](#uc-18))

**Pré-condição:** A obra existe e o cartão foi movido para uma nova coluna.

**Fluxo principal:**

1. O sistema recebe a obra e o novo status.
2. O sistema valida a transição de status.
3. O sistema atualiza o status da obra.
4. O sistema executa o [UC-20](#uc-20) (Registrar Ação).

**Fluxos alternativos:**

- FA1 - Transição inválida (passo 2): o sistema rejeita a alteração, mantém o status e informa o motivo.

**Pós-condição:** O status da obra está atualizado e a mudança foi registrada na linha do tempo.

**Regras de negócio:**

- RN1 - Os status seguem o fluxo da obra: pagamento, compra/chegada de material, programação e execução da instalação.
- RN2 - Toda mudança de status deve ser registrada com usuário, data e hora.

**Prioridade:** Alta

---

<a id="uc-13"></a>

### UC-13 - Definir Obra para Instalação

**Descrição:** Marca uma obra como pronta para instalação, associando-a a uma equipe de campo e movendo seu cartão no Kanban.

**Atores:** Administrador, Engenharia

**Pré-condição:** O usuário está autenticado, a obra está apta para instalação e existe uma equipe de campo criada ou alocada.

**Fluxo principal:**

1. O usuário seleciona a obra.
2. O usuário associa a equipe de campo e o período da instalação.
3. O usuário confirma a definição.
4. O sistema valida as informações.
5. O sistema executa o [UC-18](#uc-18) (Mover Cartão no Kanban) para a coluna de instalação.
6. O sistema exibe mensagem de sucesso.

**Fluxos alternativos:**

- FA1 - Obra não apta (passo 4): o sistema informa a etapa pendente (ex.: material ou pagamento) e cancela o fluxo.
- FA2 - Conflito de agenda da equipe (passo 4): o sistema informa o conflito e retorna ao passo 2.

**Pós-condição:** A obra está definida para instalação e seu cartão foi movido para a coluna correspondente.

**Regras de negócio:**

- RN1 - A obra só pode ser definida para instalação após as etapas anteriores do fluxo.
- RN2 - Uma equipe não pode ter duas obras no mesmo período.

**Prioridade:** Alta

---

<a id="uc-14"></a>

### UC-14 - Criar Comentário sobre a Manutenção

**Descrição:** Permite ao instalador adicionar um comentário opcional a uma manutenção em andamento.

**Atores:** Instalador de Campo

**Pré-condição:** O usuário está autenticado e há uma manutenção em andamento ([UC-25](#uc-25)).

**Fluxo principal:**

1. Durante a manutenção, o instalador escolhe adicionar um comentário.
2. O instalador digita o texto do comentário.
3. O instalador confirma.
4. O sistema valida o texto.
5. O sistema salva o comentário vinculado à manutenção.
6. O sistema exibe o comentário na manutenção.

**Fluxos alternativos:**

- FA1 - Comentário vazio (passo 4): o sistema informa que o texto é obrigatório e retorna ao passo 2.
- FA2 - Cancelamento (passo 3): o sistema descarta o texto e retorna à manutenção.

**Pós-condição:** O comentário está salvo e vinculado à manutenção.

**Regras de negócio:**

- RN1 - O comentário é opcional e estende o [UC-25](#uc-25) (Realizar Manutenção).
- RN2 - O comentário deve guardar autor, data e hora.

**Prioridade:** Média

---

<a id="uc-15"></a>

### UC-15 - Inserir Cartão de Obra no Kanban

**Descrição:** Cria o cartão da obra no quadro Kanban.

**Atores:** Sistema (incluído pelo [UC-10](#uc-10))

**Pré-condição:** A obra foi cadastrada.

**Fluxo principal:**

1. O sistema recebe os dados da obra cadastrada.
2. O sistema cria o cartão com os dados resumidos da obra.
3. O sistema posiciona o cartão na primeira coluna do quadro.
4. O sistema exibe o cartão no Kanban.

**Fluxos alternativos:**

- FA1 - Falha na criação do cartão (passo 2): o sistema registra o erro e permite recriar o cartão posteriormente.

**Pós-condição:** O cartão da obra está visível na primeira coluna do Kanban.

**Regras de negócio:**

- RN1 - Cada obra possui um único cartão no Kanban.
- RN2 - O cartão é criado na coluna correspondente ao status inicial.

**Prioridade:** Alta

---

<a id="uc-16"></a>

### UC-16 - Deletar Cartão de Obra no Kanban

**Descrição:** Remove do quadro Kanban o cartão de uma obra apagada.

**Atores:** Sistema (incluído pelo [UC-11](#uc-11))

**Pré-condição:** A exclusão da obra foi confirmada.

**Fluxo principal:**

1. O sistema localiza o cartão da obra.
2. O sistema remove o cartão da coluna.
3. O sistema atualiza o quadro.

**Fluxos alternativos:**

- FA1 - Cartão não encontrado (passo 1): o sistema registra a ocorrência e prossegue com a exclusão da obra.

**Pós-condição:** O cartão não aparece mais no Kanban.

**Regras de negócio:**

- RN1 - O cartão só pode ser removido junto com a exclusão da obra.

**Prioridade:** Média

---

<a id="uc-17"></a>

### UC-17 - Editar Cartão no Kanban

**Descrição:** Permite alterar as informações de um cartão de obra no Kanban.

**Atores:** Administrador, Engenharia

**Pré-condição:** O usuário está autenticado e o cartão existe.

**Fluxo principal:**

1. O usuário abre o cartão.
2. O usuário altera os campos editáveis (título, descrição, responsável e datas).
3. O usuário salva as alterações.
4. O sistema valida os dados.
5. O sistema atualiza o cartão.
6. O sistema exibe o cartão atualizado.

**Fluxos alternativos:**

- FA1 - Dados inválidos (passo 4): o sistema destaca os campos e retorna ao passo 2.
- FA2 - Cartão alterado por outro usuário (passo 4): o sistema informa o conflito e recarrega os dados atuais.
- FA3 - Adicionar comentário (passo 2): o usuário pode acionar o [UC-19](#uc-19).
- FA4 - Cancelamento (passo 3): o sistema descarta as alterações.

**Pós-condição:** O cartão está atualizado com as novas informações.

**Regras de negócio:**

- RN1 - A mudança de coluna/status só pode ser feita pelo [UC-18](#uc-18).
- RN2 - Somente Administrador e Engenharia podem editar cartões.

**Prioridade:** Média

---

<a id="uc-18"></a>

### UC-18 - Mover Cartão no Kanban

**Descrição:** Permite mover o cartão de uma obra entre as colunas do Kanban, atualizando o status da obra.

**Atores:** Administrador, Engenharia

**Pré-condição:** O usuário está autenticado e o cartão existe.

**Fluxo principal:**

1. O usuário arrasta o cartão para outra coluna.
2. O sistema valida o movimento.
3. O sistema executa o [UC-12](#uc-12) (Alterar Status da Obra).
4. O sistema atualiza a posição do cartão.
5. O sistema exibe o quadro atualizado.

**Fluxos alternativos:**

- FA1 - Movimento não permitido (passo 2): o sistema devolve o cartão à coluna de origem e informa o motivo.
- FA2 - Falha ao atualizar o status (passo 3): o sistema devolve o cartão à coluna de origem e informa o erro.

**Pós-condição:** O cartão está na nova coluna e o status da obra foi atualizado.

**Regras de negócio:**

- RN1 - O movimento deve respeitar a ordem do fluxo da obra.
- RN2 - Todo movimento altera o status da obra e é registrado na linha do tempo.

**Prioridade:** Alta

---

<a id="uc-19"></a>

### UC-19 - Adicionar Comentario no Cartão

**Descrição:** Permite adicionar um comentário a um cartão durante sua edição.

**Atores:** Administrador, Engenharia

**Pré-condição:** O usuário está autenticado e está editando um cartão ([UC-17](#uc-17)).

**Fluxo principal:**

1. Durante a edição do cartão, o usuário escolhe adicionar um comentário.
2. O usuário digita o texto.
3. O usuário confirma.
4. O sistema valida o texto.
5. O sistema salva o comentário no cartão.
6. O sistema exibe o comentário no histórico do cartão.

**Fluxos alternativos:**

- FA1 - Comentário vazio (passo 4): o sistema informa que o texto é obrigatório e retorna ao passo 2.
- FA2 - Cancelamento (passo 3): o sistema descarta o texto.

**Pós-condição:** O comentário está salvo no cartão.

**Regras de negócio:**

- RN1 - O comentário é opcional e estende o [UC-17](#uc-17) (Editar Cartão no Kanban).
- RN2 - O comentário deve guardar autor, data e hora.

**Prioridade:** Baixa

---

<a id="uc-20"></a>

### UC-20 - Registrar Ação

**Descrição:** Registra na linha do tempo da obra as ações relevantes realizadas no sistema.

**Atores:** Sistema (incluído pelos [UC-10](#uc-10), [UC-12](#uc-12) e [UC-25](#uc-25))

**Pré-condição:** Uma ação relevante sobre uma obra foi executada.

**Fluxo principal:**

1. O sistema recebe o evento com tipo da ação, obra, usuário e detalhes.
2. O sistema adiciona data e hora ao evento.
3. O sistema grava o registro na linha do tempo da obra.

**Fluxos alternativos:**

- FA1 - Falha na gravação (passo 3): o sistema registra o erro em log técnico para análise.

**Pós-condição:** A ação está registrada na linha do tempo da obra.

**Regras de negócio:**

- RN1 - Os registros não podem ser editados nem removidos.
- RN2 - A linha do tempo é exibida em ordem cronológica.
- RN3 - Cada registro deve identificar o usuário responsável.

**Prioridade:** Alta

---

<a id="uc-21"></a>

### UC-21 - Criar Equipe de Campo

**Descrição:** Permite montar uma equipe de campo com instaladores para execução das obras.

**Atores:** Administrador, Engenharia

**Pré-condição:** O usuário está autenticado e existem Instaladores de Campo cadastrados.

**Fluxo principal:**

1. O usuário acessa o Gantt e escolhe criar equipe.
2. O usuário informa o nome da equipe.
3. O usuário seleciona os instaladores e define o responsável.
4. O usuário confirma a criação.
5. O sistema valida os dados.
6. O sistema salva a equipe.
7. O sistema oferece executar o [UC-13](#uc-13) (Definir Obra para Instalação).

**Fluxos alternativos:**

- FA1 - Instalador já alocado no mesmo período (passo 5): o sistema informa o conflito e retorna ao passo 3.
- FA2 - Nenhum instalador selecionado (passo 5): o sistema informa que é necessário ao menos um e retorna ao passo 3.
- FA3 - Definir obra agora (passo 7): o usuário aciona o [UC-13](#uc-13).

**Pós-condição:** A equipe de campo está criada e disponível para alocação.

**Regras de negócio:**

- RN1 - Toda equipe deve ter ao menos um instalador e um responsável.
- RN2 - Um instalador não pode estar em duas equipes no mesmo período.

**Prioridade:** Alta

---

<a id="uc-22"></a>

### UC-22 - Alocar Equipe

**Descrição:** Permite alocar uma equipe de campo a uma obra em um período no Gantt.

**Atores:** Administrador, Engenharia

**Pré-condição:** O usuário está autenticado, a equipe existe e há obra aguardando instalação.

**Fluxo principal:**

1. O usuário acessa o Gantt.
2. O usuário seleciona a obra, a equipe e o período.
3. O usuário confirma a alocação.
4. O sistema verifica a disponibilidade da equipe.
5. O sistema salva a alocação.
6. O sistema executa o [UC-13](#uc-13) (Definir Obra para Instalação).
7. O sistema exibe a alocação no Gantt.

**Fluxos alternativos:**

- FA1 - Conflito de agenda (passo 4): o sistema informa o conflito e retorna ao passo 2.
- FA2 - Obra não apta para instalação (passo 4): o sistema informa a etapa pendente e cancela a alocação.

**Pós-condição:** A equipe está alocada à obra no período definido e visível no Gantt.

**Regras de negócio:**

- RN1 - Uma equipe não pode ser alocada a duas obras no mesmo período.
- RN2 - A alocação só é permitida para obras aptas à instalação.

**Prioridade:** Alta

---

<a id="uc-23"></a>

### UC-23 - Exportar Detalhes de Instalação

**Descrição:** Permite exportar em arquivo os detalhes de uma instalação.

**Atores:** Administrador

**Pré-condição:** O usuário está autenticado e a obra possui instalação definida.

**Fluxo principal:**

1. O Administrador seleciona a obra.
2. O Administrador solicita a exportação dos detalhes.
3. O sistema reúne kit, endereço, equipe, período e instruções.
4. O sistema gera o arquivo.
5. O sistema disponibiliza o arquivo para download.

**Fluxos alternativos:**

- FA1 - Dados incompletos (passo 3): o sistema informa as informações faltantes e permite exportar parcialmente ou cancelar.
- FA2 - Falha na geração do arquivo (passo 4): o sistema informa o erro e permite tentar novamente.

**Pós-condição:** O arquivo com os detalhes da instalação foi disponibilizado ao Administrador.

**Regras de negócio:**

- RN1 - A exportação contém somente dados da obra selecionada.
- RN2 - Somente Administradores podem exportar detalhes.

**Prioridade:** Baixa

---

<a id="uc-24"></a>

### UC-24 - Visualizar Detalhes da Instalação

**Descrição:** Permite ao instalador consultar o que levar, onde instalar e como instalar.

**Atores:** Instalador de Campo

**Pré-condição:** O usuário está autenticado e foi alocado a uma instalação.

**Fluxo principal:**

1. O instalador acessa a lista de instalações.
2. O instalador seleciona uma instalação.
3. O sistema exibe o kit de materiais.
4. O sistema exibe o endereço da obra.
5. O sistema exibe o projeto e as instruções de instalação.

**Fluxos alternativos:**

- FA1 - Nenhuma instalação alocada (passo 1): o sistema exibe mensagem informando que não há instalações.
- FA2 - Dados da instalação incompletos (passo 3): o sistema exibe o que estiver disponível e sinaliza o que falta.

**Pós-condição:** O instalador visualizou os detalhes da instalação.

**Regras de negócio:**

- RN1 - O instalador só visualiza instalações da sua equipe.
- RN2 - O acesso é somente de leitura.

**Prioridade:** Alta

---

<a id="uc-25"></a>

### UC-25 - Realizar Manutenção

**Descrição:** Permite ao instalador registrar a execução de uma manutenção em uma instalação.

**Atores:** Instalador de Campo

**Pré-condição:** O usuário está autenticado e há manutenção atribuída à sua equipe.

**Fluxo principal:**

1. O instalador abre a manutenção atribuída.
2. O instalador registra o serviço executado.
3. O instalador marca a manutenção como concluída.
4. O sistema valida as informações.
5. O sistema salva a manutenção.
6. O sistema executa o [UC-20](#uc-20) (Registrar Ação).
7. O sistema exibe mensagem de sucesso.

**Fluxos alternativos:**

- FA1 - Comentário adicional (passo 2): o instalador pode acionar o [UC-14](#uc-14).
- FA2 - Dados obrigatórios ausentes (passo 4): o sistema destaca os campos e retorna ao passo 2.
- FA3 - Cancelamento (passo 3): o sistema mantém a manutenção como pendente.

**Pós-condição:** A manutenção está registrada e a ação consta na linha do tempo da obra.

**Regras de negócio:**

- RN1 - Somente o Instalador de Campo realiza manutenções.
- RN2 - Toda manutenção concluída gera registro na linha do tempo.

**Prioridade:** Média

---

<a id="uc-26"></a>

### UC-26 - Abrir Rota

**Descrição:** Permite ao instalador abrir a rota até o endereço da obra em um aplicativo de mapas.

**Atores:** Instalador de Campo

**Pré-condição:** O usuário está autenticado e a instalação possui endereço cadastrado.

**Fluxo principal:**

1. O instalador seleciona a instalação.
2. O instalador aciona a opção de abrir rota.
3. O sistema obtém o endereço da obra.
4. O sistema abre o aplicativo de mapas com o destino preenchido.

**Fluxos alternativos:**

- FA1 - Endereço ausente (passo 3): o sistema informa que não há endereço cadastrado.
- FA2 - Aplicativo de mapas indisponível ou sem internet (passo 4): o sistema exibe o endereço em texto para consulta.

**Pós-condição:** A rota até a obra foi aberta no aplicativo de mapas.

**Regras de negócio:**

- RN1 - A rota usa o endereço registrado na obra.
- RN2 - O instalador só abre rota de instalações da sua equipe.

**Prioridade:** Média

---

<a id="uc-27"></a>

### UC-27 - Consultar Obras e Quadro Kanban

**Descrição:** Permite consultar as obras e o quadro Kanban em modo somente leitura, incluindo o status do material de cada obra.

**Atores:** Financeiro

**Pré-condição:** O usuário está autenticado com perfil Financeiro.

**Fluxo principal:**

1. O usuário acessa o quadro Kanban.
2. O sistema exibe as colunas com os cartões das obras e o status do material de cada uma.
3. O usuário seleciona um cartão.
4. O sistema exibe os dados da obra, o cliente, o status e os comentários, sem opções de edição.

**Fluxos alternativos:**

- FA1 - Nenhuma obra cadastrada (passo 2): o sistema exibe o quadro vazio com mensagem informativa.
- FA2 - Tentativa de alterar o cartão (passo 3 ou 4): o sistema nega o acesso com resposta de "Acesso Proibido" e registra a tentativa em log de segurança.

**Pós-condição:** As obras e o quadro Kanban foram consultados sem nenhuma alteração.

**Regras de negócio:**

- RN1 - O acesso do Financeiro ao Kanban é somente de leitura.
- RN2 - O Financeiro não cadastra nem apaga obras, e não move nem edita cartões.

**Prioridade:** Média

---

<a id="uc-28"></a>

### UC-28 - Consultar Cronograma (Gantt)

**Descrição:** Permite consultar as alocações de equipes por obra e período no Gantt, em modo somente leitura.

**Atores:** Financeiro

**Pré-condição:** O usuário está autenticado com perfil Financeiro.

**Fluxo principal:**

1. O usuário acessa o Gantt.
2. O sistema exibe as barras das obras por equipe e período, com a duração estimada e o status do material.
3. O usuário seleciona uma barra.
4. O sistema exibe os detalhes da alocação (obra, equipe e período), sem opções de edição.

**Fluxos alternativos:**

- FA1 - Nenhuma alocação cadastrada (passo 2): o sistema exibe o Gantt vazio com mensagem informativa.
- FA2 - Tentativa de alocar ou reagendar (passo 3 ou 4): o sistema nega o acesso com resposta de "Acesso Proibido" e registra a tentativa em log de segurança.

**Pós-condição:** O cronograma foi consultado sem nenhuma alteração.

**Regras de negócio:**

- RN1 - O acesso do Financeiro ao Gantt é somente de leitura.
- RN2 - O Financeiro não cria equipes, não aloca equipes e não reagenda obras.

**Prioridade:** Média

---

<a id="uc-29"></a>

### UC-29 - Consultar Linha do Tempo da Obra

**Descrição:** Permite consultar o histórico cronológico de ações e comentários de uma obra.

**Atores:** Administrador, Engenharia, Financeiro

**Pré-condição:** O usuário está autenticado e a obra existe.

**Fluxo principal:**

1. O usuário seleciona a obra.
2. O usuário aciona a linha do tempo.
3. O sistema exibe os registros em ordem cronológica, com a ação, o usuário, a data e a hora.

**Fluxos alternativos:**

- FA1 - Obra sem registros (passo 3): o sistema informa que não há registros.
- FA2 - Adicionar comentário (passo 3): o Financeiro pode acionar o [UC-30](#uc-30).

**Pós-condição:** A linha do tempo da obra foi consultada.

**Regras de negócio:**

- RN1 - Os registros são exibidos em ordem cronológica.
- RN2 - Os registros de ação não podem ser editados nem removidos por nenhum perfil.

**Prioridade:** Média

---

<a id="uc-30"></a>

### UC-30 - Incluir Comentário na Linha do Tempo

**Descrição:** Permite ao Financeiro adicionar um comentário opcional à linha do tempo de uma obra.

**Atores:** Financeiro

**Pré-condição:** O usuário está autenticado e está consultando a linha do tempo de uma obra ([UC-29](#uc-29)).

**Fluxo principal:**

1. O usuário escolhe adicionar um comentário.
2. O usuário digita o texto.
3. O usuário confirma.
4. O sistema valida o texto.
5. O sistema salva o comentário vinculado à obra.
6. O sistema exibe o comentário na linha do tempo com autor, data e hora.

**Fluxos alternativos:**

- FA1 - Comentário vazio (passo 4): o sistema informa que o texto é obrigatório e retorna ao passo 2.
- FA2 - Cancelamento (passo 3): o sistema descarta o texto e retorna à linha do tempo.

**Pós-condição:** O comentário está salvo e exibido na linha do tempo da obra.

**Regras de negócio:**

- RN1 - O comentário é opcional e estende o [UC-29](#uc-29) (Consultar Linha do Tempo da Obra).
- RN2 - O comentário deve guardar autor, data e hora.
- RN3 - O comentário é um item geral da linha do tempo: somente o Administrador pode editá-lo ou excluí-lo. Administrador e Engenharia comentam pelo [UC-19](#uc-19).

**Prioridade:** Baixa

---

<a id="uc-31"></a>

### UC-31 - Registrar Custos e Precificação da Obra

**Descrição:** Permite registrar os itens de custo e o valor da obra, necessários para apurar o custo total e o DRE.

**Atores:** Financeiro

**Pré-condição:** O usuário está autenticado com perfil Financeiro e a obra existe.

**Fluxo principal:**

1. O usuário seleciona a obra.
2. O usuário acessa a tela de custos.
3. O usuário informa os itens de custo (descrição e valor) e o valor da obra.
4. O usuário confirma o registro.
5. O sistema valida os dados.
6. O sistema salva os custos e a precificação da obra.
7. O sistema grava log de auditoria com o ID do usuário e o timestamp.
8. O sistema exibe mensagem de sucesso.

**Fluxos alternativos:**

- FA1 - Valor inválido (passo 5): o sistema destaca os campos e retorna ao passo 3.
- FA2 - Alteração de lançamento existente (passo 3): o sistema atualiza o item e grava log de auditoria da alteração.
- FA3 - Cancelamento (qualquer passo): o sistema descarta os dados e retorna à obra.

**Pós-condição:** Os custos e a precificação da obra estão registrados e a ação consta no log de auditoria.

**Regras de negócio:**

- RN1 - Somente o Financeiro registra custos e precificação.
- RN2 - A precificação só é completa quando todos os itens de custo e o valor da obra estão informados.
- RN3 - Toda criação ou alteração financeira grava log irremovível com ID do usuário e timestamp.

**Prioridade:** Alta

---

<a id="uc-32"></a>

### UC-32 - Apurar Custo Total da Obra

**Descrição:** Permite apurar e consultar o custo total de uma obra concluída, a partir dos itens de custo registrados.

**Atores:** Administrador, Financeiro

**Pré-condição:** O usuário está autenticado, a obra está concluída e a precificação está completa.

**Fluxo principal:**

1. O usuário seleciona a obra.
2. O usuário solicita o custo total.
3. O sistema verifica se a obra está concluída e com precificação completa.
4. O sistema soma os itens de custo da obra.
5. O sistema exibe o custo total e seus itens.

**Fluxos alternativos:**

- FA1 - Obra não concluída (passo 3): o sistema informa que o custo total só pode ser apurado para obras concluídas e encerra o fluxo.
- FA2 - Precificação incompleta (passo 3): o sistema informa os itens sem precificação e encerra o fluxo.

**Pós-condição:** O custo total da obra foi apurado e exibido.

**Regras de negócio:**

- RN1 - O custo total só pode ser apurado para obras concluídas com precificação completa.
- RN2 - O custo total é a soma dos itens de custo da obra.
- RN3 - Engenharia e Instalador de Campo não têm acesso aos custos.

**Prioridade:** Alta

---

<a id="uc-33"></a>

### UC-33 - Emitir DRE da Obra

**Descrição:** Permite emitir o relatório financeiro de uma obra concluída, com custos e resultado.

**Atores:** Administrador, Financeiro

**Pré-condição:** O usuário está autenticado, a obra está concluída e a precificação está completa.

**Fluxo principal:**

1. O usuário seleciona a obra.
2. O usuário solicita o DRE.
3. O sistema executa o [UC-32](#uc-32) (Apurar Custo Total da Obra).
4. O sistema obtém o valor da obra.
5. O sistema calcula o resultado (valor da obra menos custo total).
6. O sistema exibe o DRE com custos, valor da obra e resultado.

**Fluxos alternativos:**

- FA1 - Obra não concluída ou precificação incompleta (passo 3): o [UC-32](#uc-32) rejeita a apuração, o sistema informa o motivo e encerra o fluxo.
- FA2 - Exportar o DRE (passo 6): o usuário pode acionar o [UC-34](#uc-34).

**Pós-condição:** O DRE da obra foi emitido e exibido.

**Regras de negócio:**

- RN1 - O DRE só pode ser emitido para obras concluídas com precificação completa.
- RN2 - O DRE é somente leitura.
- RN3 - Engenharia e Instalador de Campo não têm acesso ao DRE.

**Prioridade:** Alta

---

<a id="uc-34"></a>

### UC-34 - Exportar Relatório Financeiro

**Descrição:** Permite exportar relatórios financeiros e de cronograma em PDF ou Excel.

**Atores:** Financeiro

**Pré-condição:** O usuário está autenticado com perfil Financeiro.

**Fluxo principal:**

1. O usuário acessa a tela de relatórios.
2. O usuário seleciona o tipo de relatório (financeiro ou cronograma) e o período.
3. O usuário escolhe o formato (PDF ou Excel).
4. O usuário solicita a exportação.
5. O sistema reúne os dados.
6. O sistema gera o arquivo.
7. O sistema disponibiliza o arquivo para download.

**Fluxos alternativos:**

- FA1 - Sem dados no período (passo 5): o sistema informa que não há dados e não gera o arquivo.
- FA2 - Falha na geração do arquivo (passo 6): o sistema informa o erro e permite tentar novamente.
- FA3 - DRE de uma obra (passo 2): o usuário seleciona o DRE emitido pelo [UC-33](#uc-33) e retorna ao passo 3.

**Pós-condição:** O arquivo do relatório foi disponibilizado ao usuário.

**Regras de negócio:**

- RN1 - Os formatos disponíveis são PDF e Excel.
- RN2 - A geração deve levar no máximo 5 segundos para até 1.000 registros.
- RN3 - Somente perfis autorizados exportam dados financeiros.

**Prioridade:** Média

---

<a id="uc-35"></a>

### UC-35 - Solicitar Recuperação de Senha

**Descrição:** Permite que um usuário não autenticado solicite a redefinição de sua senha, recebendo um link de uso único por e-mail.

**Atores:** Usuário (não autenticado)

**Pré-condição:** O usuário acessa a tela de login.

**Fluxo principal:**

1. O usuário clica em "Esqueci minha senha" na tela de login.
2. O usuário informa seu e-mail.
3. O usuário confirma a solicitação.
4. O sistema gera um token de redefinição de uso único com validade de 1 hora.
5. O sistema envia o e-mail com o link de redefinição.
6. O sistema exibe a mensagem "Se o e-mail informado estiver cadastrado, você receberá as instruções de redefinição".

**Fluxos alternativos:**

- FA1 - E-mail não cadastrado (passo 4): o sistema exibe a mesma mensagem genérica do passo 6 sem revelar a inexistência do e-mail.
- FA2 - Falha no envio do e-mail (passo 5): o sistema registra o erro em log técnico e exibe a mesma mensagem genérica.
- FA3 - Cancelamento (qualquer passo): o sistema retorna à tela de login.

**Pós-condição:** Um e-mail com link de redefinição foi enviado (se o e-mail existir) e o usuário recebeu a mensagem genérica.

**Regras de negócio:**

- RN1 - O token de redefinição é de uso único e expira em 1 hora.
- RN2 - A resposta é sempre idêntica, independente de o e-mail existir ou não (proteção contra enumeração de usuários).
- RN3 - O link de redefinição aciona o [UC-36](#uc-36) (Atualizar Senha).

**Prioridade:** Média

---

<a id="uc-36"></a>

### UC-36 - Atualizar Senha

**Descrição:** Permite que o usuário redefina a senha por meio de link de recuperação ou altere a própria senha estando autenticado.

**Atores:** Usuário

**Pré-condição:** O usuário possui um token de redefinição válido (via link do [UC-35](#uc-35)) ou está autenticado no sistema.

**Fluxo principal (via link de recuperação):**

1. O usuário acessa o link de redefinição recebido por e-mail.
2. O sistema valida o token do link.
3. O usuário informa a nova senha e confirma.
4. O sistema valida a política mínima de segurança da nova senha.
5. O sistema atualiza o hash da senha.
6. O sistema invalida todos os tokens de acesso ativos do usuário.
7. O sistema exibe mensagem de sucesso e redireciona para a tela de login.

**Fluxo alternativo A - Alterar senha com usuário autenticado:**

1. O usuário acessa a tela de alteração de senha.
2. O usuário informa a senha atual e a nova senha.
3. O sistema valida a senha atual.
4. O sistema valida a política mínima de segurança da nova senha.
5. O sistema atualiza o hash da senha.
6. O sistema invalida todos os tokens de acesso ativos do usuário.
7. O sistema exibe mensagem de sucesso.

**Fluxos alternativos:**

- FA1 - Token inválido ou expirado (passo 2): o sistema exibe "Link inválido ou expirado" e encerra o fluxo.
- FA2 - Nova senha não atende à política (passo 4): o sistema informa os requisitos mínimos e retorna ao passo 3.
- FA3 - Senha atual incorreta (FA-A, passo 3): o sistema exibe "Senha atual incorreta" e retorna ao passo 2.

**Pós-condição:** A senha do usuário está atualizada e todos os tokens de acesso anteriores foram invalidados.

**Regras de negócio:**

- RN1 - A nova senha deve ter ao menos 8 caracteres, uma letra maiúscula, uma minúscula e um número.
- RN2 - A senha é armazenada somente como hash (bcrypt).
- RN3 - Todos os tokens de acesso ativos são invalidados após a alteração da senha.
- RN4 - O token de redefinição é invalidado após o primeiro uso.

**Prioridade:** Média