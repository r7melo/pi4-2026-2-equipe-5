-- 01_schema.sql
-- ZL Engenharia Solar — banco de dados principal
-- Sprint 2 | MER v2.0
--
-- Ordem de criação (respeita dependências de FK):
--   perfil_acesso → equipe → cliente → usuario → obra
--   obra → pagamento, homologacao, material, comentario,
--          historico_obra, programacao_obra, relatorio_custo

SET client_encoding = 'UTF8';

-- ---------------------------------------------------------
-- ENUMs
-- ---------------------------------------------------------

-- Etapas do funil Kanban
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

-- Situação logística dos materiais
DO $$ BEGIN
    CREATE TYPE status_logistico_enum AS ENUM (
        'Comprado',
        'EmTransito',
        'Disponivel',
        'Utilizado'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Perfis de acesso (RBAC)
DO $$ BEGIN
    CREATE TYPE nome_perfil_enum AS ENUM (
        'Administrador',
        'EngenhariaObras',
        'Financeiro',
        'VisualizadorLeitor',
        'InstaladorCampo'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Status do processo de homologação junto à concessionária
DO $$ BEGIN
    CREATE TYPE parecer_enum AS ENUM (
        'Pendente',
        'EmAnalise',
        'Aprovado',
        'Reprovado'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ---------------------------------------------------------
-- 1. PERFIL_ACESSO
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS perfil_acesso (
    id          SERIAL           PRIMARY KEY,
    nome_perfil nome_perfil_enum NOT NULL UNIQUE,
    permissoes  TEXT  -- ex: 'obras:criar,obras:mover,programacoes:editar'
);


-- ---------------------------------------------------------
-- 2. EQUIPE
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipe (
    id            SERIAL       PRIMARY KEY,
    nome          VARCHAR(100) NOT NULL,
    especialidade VARCHAR(100)  -- ex: 'Instalação Residencial', 'Industrial'
);


-- ---------------------------------------------------------
-- 3. CLIENTE
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS cliente (
    id             SERIAL       PRIMARY KEY,
    nome           VARCHAR(200) NOT NULL,
    cidade         VARCHAR(100),
    dados_contrato TEXT          -- informações extras do contrato, se necessário
);


-- ---------------------------------------------------------
-- 4. USUARIO
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario (
    id        SERIAL       PRIMARY KEY,
    nome      VARCHAR(200) NOT NULL,
    email     VARCHAR(200) NOT NULL UNIQUE,
    senha     VARCHAR(255) NOT NULL, -- bcrypt, nunca texto puro
    id_perfil INT          NOT NULL REFERENCES perfil_acesso(id) ON DELETE RESTRICT,
    id_equipe INT                   REFERENCES equipe(id)         ON DELETE SET NULL
);


-- ---------------------------------------------------------
-- 5. OBRA
-- Entidade central do sistema — alimenta o Kanban e o Gantt
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS obra (
    id                   SERIAL           PRIMARY KEY,
    status               status_obra_enum NOT NULL DEFAULT 'MaterialComprado',
    categoria            VARCHAR(50),      -- Residencial, Comercial, Industrial, Rural, Manutenção
    quantidade_paineis   INT              NOT NULL CHECK (quantidade_paineis > 0),
    data_inicio_estimada DATE,
    data_fim_estimada    DATE,
    data_inicio_real     DATE,
    data_fim_real        DATE,
    id_cliente           INT              NOT NULL REFERENCES cliente(id) ON DELETE RESTRICT,

    CONSTRAINT ck_obra_datas_estimadas CHECK (
        data_fim_estimada    IS NULL OR data_inicio_estimada IS NULL
        OR data_fim_estimada >= data_inicio_estimada
    ),
    CONSTRAINT ck_obra_datas_reais CHECK (
        data_fim_real    IS NULL OR data_inicio_real IS NULL
        OR data_fim_real >= data_inicio_real
    )
);


-- ---------------------------------------------------------
-- 6. PAGAMENTO
-- 1:1 com Obra — dados do contrato financeiro
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS pagamento (
    id                    SERIAL PRIMARY KEY,
    data_confirmacao      DATE,
    prazo_contratual_dias INT    NOT NULL CHECK (prazo_contratual_dias > 0),
    id_obra               INT    NOT NULL UNIQUE REFERENCES obra(id) ON DELETE CASCADE
);


-- ---------------------------------------------------------
-- 7. HOMOLOGACAO
-- 1:1 com Obra — acompanhamento junto à concessionária
-- Adicionado na Sprint 2 (ver MER v2.0)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS homologacao (
    id             SERIAL       PRIMARY KEY,
    parecer_acesso parecer_enum NOT NULL DEFAULT 'Pendente',
    art_trt        VARCHAR(100),  -- número ou situação do registro ART/TRT
    prazo_vistoria DATE,
    atualizado_em  TIMESTAMP    NOT NULL DEFAULT NOW(),
    id_obra        INT          NOT NULL UNIQUE REFERENCES obra(id) ON DELETE CASCADE
);


-- ---------------------------------------------------------
-- 8. MATERIAL
-- Kits e insumos vinculados a uma obra
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS material (
    id               SERIAL                PRIMARY KEY,
    tipo             VARCHAR(200)          NOT NULL, -- ex: 'Painel Solar 550W', 'Inversor 5kW'
    quantidade       INT                   NOT NULL CHECK (quantidade >= 0),
    status_logistico status_logistico_enum,
    id_obra          INT                   NOT NULL REFERENCES obra(id) ON DELETE CASCADE
);


-- ---------------------------------------------------------
-- 9. COMENTARIO
-- Anotações dos usuários em uma obra
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS comentario (
    id            SERIAL    PRIMARY KEY,
    descricao     TEXT      NOT NULL,
    data_registro TIMESTAMP NOT NULL DEFAULT NOW(),
    id_obra       INT       NOT NULL REFERENCES obra(id)    ON DELETE CASCADE,
    id_usuario    INT       NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT
);


-- ---------------------------------------------------------
-- 10. HISTORICO_OBRA
-- Toda mudança de status gera um registro aqui — não se apaga
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS historico_obra (
    id              SERIAL      PRIMARY KEY,
    status_anterior VARCHAR(50),  -- null na criação da obra
    status_novo     VARCHAR(50) NOT NULL,
    data_alteracao  TIMESTAMP   NOT NULL DEFAULT NOW(),
    observacao      TEXT,
    id_obra         INT         NOT NULL REFERENCES obra(id)    ON DELETE CASCADE,
    id_usuario      INT         NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT
);


-- ---------------------------------------------------------
-- 11. PROGRAMACAO_OBRA
-- Alocação de equipe num período — base do Gantt
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS programacao_obra (
    id                    SERIAL      PRIMARY KEY,
    data_inicio           DATE        NOT NULL,
    data_fim              DATE        NOT NULL,
    prioridade            INT         DEFAULT 1 CHECK (prioridade > 0),
    duracao_estimada_dias DECIMAL(5,1), -- calculado via quantidade_paineis da obra (RF-08)
    id_obra               INT         NOT NULL REFERENCES obra(id)   ON DELETE CASCADE,
    id_equipe             INT         NOT NULL REFERENCES equipe(id)  ON DELETE RESTRICT,

    CONSTRAINT ck_programacao_datas CHECK (data_fim >= data_inicio)
);


-- ---------------------------------------------------------
-- 12. RELATORIO_CUSTO
-- 1:1 com Obra — custo_total é calculado automaticamente pelo banco
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS relatorio_custo (
    id             SERIAL         PRIMARY KEY,
    custo_mao_obra DECIMAL(12, 2) DEFAULT 0.00,
    custo_insumos  DECIMAL(12, 2) DEFAULT 0.00,
    custo_total    DECIMAL(12, 2) GENERATED ALWAYS AS (custo_mao_obra + custo_insumos) STORED,
    id_obra        INT            NOT NULL UNIQUE REFERENCES obra(id) ON DELETE CASCADE
);


-- ---------------------------------------------------------
-- ÍNDICES
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_obra_status        ON obra(status);
CREATE INDEX IF NOT EXISTS idx_obra_cliente       ON obra(id_cliente);
CREATE INDEX IF NOT EXISTS idx_material_obra      ON material(id_obra);
CREATE INDEX IF NOT EXISTS idx_comentario_obra    ON comentario(id_obra);
CREATE INDEX IF NOT EXISTS idx_historico_obra     ON historico_obra(id_obra);
CREATE INDEX IF NOT EXISTS idx_programacao_obra   ON programacao_obra(id_obra);
CREATE INDEX IF NOT EXISTS idx_programacao_equipe ON programacao_obra(id_equipe);
CREATE INDEX IF NOT EXISTS idx_usuario_email      ON usuario(email);
