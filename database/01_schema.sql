-- ============================================================
--  01_schema.sql
--  Sistema de Gestão de Obras — ZL Engenharia Solar
--  MER versão 2.0 — Sprint 2
--
--  Ordem de criação respeita dependências de FK:
--    1. perfil_acesso
--    2. equipe
--    3. cliente
--    4. usuario         (depende de perfil_acesso, equipe)
--    5. obra            (depende de cliente)
--    6. pagamento       (depende de obra)
--    7. homologacao     (depende de obra)
--    8. material        (depende de obra)
--    9. comentario      (depende de obra, usuario)
--   10. historico_obra  (depende de obra, usuario)
--   11. programacao_obra(depende de obra, equipe)
--   12. relatorio_custo (depende de obra)
-- ============================================================

-- Garante execução limpa em caso de re-run
SET client_encoding = 'UTF8';

-- ──────────────────────────────────────────────────────────────
-- TIPOS ENUMERADOS
-- ──────────────────────────────────────────────────────────────

-- Status do funil Kanban (RF-04)
DO $$ BEGIN
    CREATE TYPE status_obra_enum AS ENUM (
        'MaterialComprado',
        'NoDeposito',
        'Separado',
        'EmAndamento',
        'Concluido',
        'Assistencia'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Status logístico dos materiais (RF-06)
DO $$ BEGIN
    CREATE TYPE status_logistico_enum AS ENUM (
        'Comprado',
        'EmTransito',
        'Disponivel',
        'Utilizado'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Perfis de acesso RBAC (RF-01, RF-02)
DO $$ BEGIN
    CREATE TYPE nome_perfil_enum AS ENUM (
        'Administrador',
        'EngenhariaObras',
        'Financeiro',
        'VisualizadorLeitor',
        'InstaladorCampo'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Parecer de homologação (UC-04, RF-17)
DO $$ BEGIN
    CREATE TYPE parecer_enum AS ENUM (
        'Pendente',
        'EmAnalise',
        'Aprovado',
        'Reprovado'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ──────────────────────────────────────────────────────────────
-- 1. PERFIL_ACESSO
--    Define os papéis do sistema (RBAC — RF-01, RF-02)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS perfil_acesso (
    id          SERIAL              PRIMARY KEY,
    nome_perfil nome_perfil_enum    NOT NULL UNIQUE,
    permissoes  TEXT                            -- lista CSV ou JSON de permissões
);

COMMENT ON TABLE  perfil_acesso             IS 'Papéis de acesso RBAC do sistema (RF-01, RF-02)';
COMMENT ON COLUMN perfil_acesso.nome_perfil IS 'Nome único do perfil: Administrador, EngenhariaObras, etc.';
COMMENT ON COLUMN perfil_acesso.permissoes  IS 'Lista de permissões associadas ao perfil (ex: obras:criar,obras:mover)';


-- ──────────────────────────────────────────────────────────────
-- 2. EQUIPE
--    Equipes de instalação (UC-03, RF-07)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipe (
    id           SERIAL       PRIMARY KEY,
    nome         VARCHAR(100) NOT NULL,
    especialidade VARCHAR(100)             -- ex: 'Instalação Residencial', 'Industrial'
);

COMMENT ON TABLE  equipe              IS 'Equipes de instaladores alocadas nas obras (UC-03)';
COMMENT ON COLUMN equipe.especialidade IS 'Tipo de obra em que a equipe se especializa (opcional)';


-- ──────────────────────────────────────────────────────────────
-- 3. CLIENTE
--    Contratantes das obras (UC-01, RF-03)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cliente (
    id              SERIAL       PRIMARY KEY,
    nome            VARCHAR(200) NOT NULL,
    cidade          VARCHAR(100),
    dados_contrato  TEXT                    -- informações contratuais complementares
);

COMMENT ON TABLE  cliente               IS 'Clientes contratantes das obras de energia solar (UC-01)';
COMMENT ON COLUMN cliente.dados_contrato IS 'Campo livre para informações adicionais do contrato';


-- ──────────────────────────────────────────────────────────────
-- 4. USUARIO
--    Contas de acesso ao sistema (RF-01)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuario (
    id         SERIAL       PRIMARY KEY,
    nome       VARCHAR(200) NOT NULL,
    email      VARCHAR(200) NOT NULL UNIQUE,
    senha      VARCHAR(255) NOT NULL,           -- hash bcrypt
    id_perfil  INT          NOT NULL REFERENCES perfil_acesso(id) ON DELETE RESTRICT,
    id_equipe  INT                   REFERENCES equipe(id)         ON DELETE SET NULL
);

COMMENT ON TABLE  usuario          IS 'Usuários do sistema com autenticação JWT (RF-01)';
COMMENT ON COLUMN usuario.senha    IS 'Hash bcrypt da senha — nunca texto puro';
COMMENT ON COLUMN usuario.id_equipe IS 'Equipe à qual o usuário pertence (preenchido para InstaladorCampo)';


-- ──────────────────────────────────────────────────────────────
-- 5. OBRA
--    Entidade central — funil Kanban (UC-01, UC-02, RF-03, RF-04)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS obra (
    id                    SERIAL             PRIMARY KEY,
    status                status_obra_enum   NOT NULL DEFAULT 'MaterialComprado',
    categoria             VARCHAR(50),                  -- Residencial, Comercial, Industrial, Rural, Manutenção
    quantidade_paineis    INT                NOT NULL CHECK (quantidade_paineis > 0),
    data_inicio_estimada  DATE,
    data_fim_estimada     DATE,
    data_inicio_real      DATE,
    data_fim_real         DATE,
    id_cliente            INT                NOT NULL REFERENCES cliente(id) ON DELETE RESTRICT,

    -- Garante que data fim não é anterior à data início
    CONSTRAINT ck_obra_datas_estimadas CHECK (
        data_fim_estimada IS NULL OR data_inicio_estimada IS NULL
        OR data_fim_estimada >= data_inicio_estimada
    ),
    CONSTRAINT ck_obra_datas_reais CHECK (
        data_fim_real IS NULL OR data_inicio_real IS NULL
        OR data_fim_real >= data_inicio_real
    )
);

COMMENT ON TABLE  obra                     IS 'Obras de instalação solar — entidade central do sistema (UC-01, UC-02)';
COMMENT ON COLUMN obra.status              IS 'Etapa atual no funil Kanban (RF-04)';
COMMENT ON COLUMN obra.categoria           IS 'Classificação da obra: Residencial, Comercial, Industrial, Rural ou Manutenção';
COMMENT ON COLUMN obra.quantidade_paineis  IS 'Quantidade de painéis solares do projeto (base para cálculo de duração — RF-08)';


-- ──────────────────────────────────────────────────────────────
-- 6. PAGAMENTO
--    Dados financeiros do contrato (1:1 com Obra)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pagamento (
    id                    SERIAL  PRIMARY KEY,
    data_confirmacao      DATE,
    prazo_contratual_dias INT     NOT NULL CHECK (prazo_contratual_dias > 0),
    id_obra               INT     NOT NULL UNIQUE REFERENCES obra(id) ON DELETE CASCADE
);

COMMENT ON TABLE  pagamento                    IS 'Dados de pagamento e contrato da obra (1:1 com Obra)';
COMMENT ON COLUMN pagamento.id_obra            IS 'UNIQUE garante relação 1:1 com a tabela obra';
COMMENT ON COLUMN pagamento.prazo_contratual_dias IS 'Prazo em dias corridos definido em contrato com o cliente';


-- ──────────────────────────────────────────────────────────────
-- 7. HOMOLOGACAO
--    Acompanhamento junto à concessionária (UC-04, RF-17)
--    NOVA ENTIDADE — Sprint 2
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS homologacao (
    id              SERIAL        PRIMARY KEY,
    parecer_acesso  parecer_enum  NOT NULL DEFAULT 'Pendente',
    art_trt         VARCHAR(100),            -- ex: 'Registrado', 'Pendente', número ART
    prazo_vistoria  DATE,
    atualizado_em   TIMESTAMP     NOT NULL DEFAULT NOW(),
    id_obra         INT           NOT NULL UNIQUE REFERENCES obra(id) ON DELETE CASCADE
);

COMMENT ON TABLE  homologacao              IS 'Processo de homologação junto à concessionária de energia (UC-04, RF-17)';
COMMENT ON COLUMN homologacao.parecer_acesso IS 'Parecer da concessionária: Pendente, EmAnalise, Aprovado ou Reprovado';
COMMENT ON COLUMN homologacao.art_trt        IS 'Situação ou número do registro ART/TRT';
COMMENT ON COLUMN homologacao.prazo_vistoria IS 'Data estimada para vistoria presencial da concessionária';
COMMENT ON COLUMN homologacao.id_obra        IS 'UNIQUE garante relação 1:1 com a tabela obra';


-- ──────────────────────────────────────────────────────────────
-- 8. MATERIAL
--    Kits e insumos da obra (RF-06)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS material (
    id               SERIAL               PRIMARY KEY,
    tipo             VARCHAR(200)         NOT NULL,
    quantidade       INT                  NOT NULL CHECK (quantidade >= 0),
    status_logistico status_logistico_enum,
    id_obra          INT                  NOT NULL REFERENCES obra(id) ON DELETE CASCADE
);

COMMENT ON TABLE  material               IS 'Materiais e kits vinculados à obra (RF-06)';
COMMENT ON COLUMN material.tipo          IS 'Descrição do material (ex: Painel Solar 550W, Inversor 5kW)';
COMMENT ON COLUMN material.quantidade    IS 'Quantidade de unidades do lote';
COMMENT ON COLUMN material.status_logistico IS 'Situação logística: Comprado, EmTransito, Disponivel ou Utilizado';


-- ──────────────────────────────────────────────────────────────
-- 9. COMENTARIO
--    Comentários colaborativos na obra (RF-11, RF-12)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comentario (
    id             SERIAL      PRIMARY KEY,
    descricao      TEXT        NOT NULL,
    data_registro  TIMESTAMP   NOT NULL DEFAULT NOW(),
    id_obra        INT         NOT NULL REFERENCES obra(id)    ON DELETE CASCADE,
    id_usuario     INT         NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT
);

COMMENT ON TABLE  comentario             IS 'Comentários e anotações colaborativas na obra (RF-11)';
COMMENT ON COLUMN comentario.descricao   IS 'Conteúdo do comentário registrado pelo usuário';
COMMENT ON COLUMN comentario.id_usuario  IS 'Somente Administrador pode excluir comentários de outros (RF-12)';


-- ──────────────────────────────────────────────────────────────
-- 10. HISTORICO_OBRA
--     Timeline de mudanças de status (RF-11)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS historico_obra (
    id              SERIAL      PRIMARY KEY,
    status_anterior VARCHAR(50),             -- nulo quando obra é criada
    status_novo     VARCHAR(50) NOT NULL,
    data_alteracao  TIMESTAMP   NOT NULL DEFAULT NOW(),
    observacao      TEXT,
    id_obra         INT         NOT NULL REFERENCES obra(id)    ON DELETE CASCADE,
    id_usuario      INT         NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT
);

COMMENT ON TABLE  historico_obra                IS 'Registro imutável de todas as mudanças de status da obra (RF-11)';
COMMENT ON COLUMN historico_obra.status_anterior IS 'Status antes da transição (NULL no primeiro registro)';
COMMENT ON COLUMN historico_obra.observacao      IS 'Justificativa ou nota livre sobre a mudança';


-- ──────────────────────────────────────────────────────────────
-- 11. PROGRAMACAO_OBRA
--     Alocação de equipes no cronograma Gantt (UC-03, RF-07, RF-08, RF-09)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS programacao_obra (
    id                    SERIAL  PRIMARY KEY,
    data_inicio           DATE    NOT NULL,
    data_fim              DATE    NOT NULL,
    prioridade            INT     DEFAULT 1 CHECK (prioridade > 0),
    duracao_estimada_dias DECIMAL(5,1),      -- calculado com base em quantidade_paineis (RF-08)
    id_obra               INT     NOT NULL REFERENCES obra(id)   ON DELETE CASCADE,
    id_equipe             INT     NOT NULL REFERENCES equipe(id)  ON DELETE RESTRICT,

    CONSTRAINT ck_programacao_datas CHECK (data_fim >= data_inicio)
);

COMMENT ON TABLE  programacao_obra                    IS 'Alocação de equipe a uma obra em um período — base do Gantt (UC-03)';
COMMENT ON COLUMN programacao_obra.prioridade          IS 'Ordem de execução da equipe (1 = maior prioridade)';
COMMENT ON COLUMN programacao_obra.duracao_estimada_dias IS 'Duração em dias úteis calculada via quantidade de painéis (RF-08, RF-09)';


-- ──────────────────────────────────────────────────────────────
-- 12. RELATORIO_CUSTO
--     DRE financeiro da obra (UC-05, RF-14, RF-20)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS relatorio_custo (
    id              SERIAL          PRIMARY KEY,
    custo_mao_obra  DECIMAL(12, 2)  DEFAULT 0.00,
    custo_insumos   DECIMAL(12, 2)  DEFAULT 0.00,
    custo_total     DECIMAL(12, 2)  GENERATED ALWAYS AS (custo_mao_obra + custo_insumos) STORED,
    id_obra         INT             NOT NULL UNIQUE REFERENCES obra(id) ON DELETE CASCADE
);

COMMENT ON TABLE  relatorio_custo             IS 'Consolidação financeira (DRE) da obra (UC-05, RF-14, RF-20)';
COMMENT ON COLUMN relatorio_custo.custo_total IS 'Calculado automaticamente: custo_mao_obra + custo_insumos (coluna gerada)';
COMMENT ON COLUMN relatorio_custo.id_obra     IS 'UNIQUE garante relação 1:1 com a tabela obra';


-- ──────────────────────────────────────────────────────────────
-- ÍNDICES — Melhora performance das queries mais comuns
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_obra_status        ON obra(status);
CREATE INDEX IF NOT EXISTS idx_obra_cliente       ON obra(id_cliente);
CREATE INDEX IF NOT EXISTS idx_material_obra      ON material(id_obra);
CREATE INDEX IF NOT EXISTS idx_comentario_obra    ON comentario(id_obra);
CREATE INDEX IF NOT EXISTS idx_historico_obra     ON historico_obra(id_obra);
CREATE INDEX IF NOT EXISTS idx_programacao_obra   ON programacao_obra(id_obra);
CREATE INDEX IF NOT EXISTS idx_programacao_equipe ON programacao_obra(id_equipe);
CREATE INDEX IF NOT EXISTS idx_usuario_email      ON usuario(email);
