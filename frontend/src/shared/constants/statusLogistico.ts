import type { NomePerfil } from "@/shared/types/autorizacao";
import type { StatusLogistico } from "@/shared/types/materiais";

export interface MetaStatusLogistico {
  valor: StatusLogistico;
  rotulo: string;
  rotuloTitulo: string;
  rotuloTabela: string;
  badgeClasse: string;
  classeBotaoLote: string;
}

/** Metadados canônicos de StatusLogistico e contrastes WCAG AA claro/escuro (RF-06, RN-08). */
export const STATUS_LOGISTICO_OPCOES: ReadonlyArray<MetaStatusLogistico> = [
  {
    valor: "EmSolicitacao",
    rotulo: "Em Solicitação",
    rotuloTitulo: "Em Solicitação",
    rotuloTabela: "Em Solicitação",
    badgeClasse: "bg-accent-light text-accent border-accent-border",
    classeBotaoLote:
      "border-accent-border bg-accent-light text-accent hover:bg-accent hover:text-primary-foreground",
  },
  {
    valor: "Comprado",
    rotulo: "Comprado",
    rotuloTitulo: "Comprado",
    rotuloTabela: "Pedido Comprado",
    badgeClasse: "bg-warning-light text-warning border-warning-border",
    classeBotaoLote:
      "border-warning-border bg-warning-light text-warning hover:bg-warning hover:text-primary-foreground",
  },
  {
    valor: "EmTransito",
    rotulo: "Em trânsito",
    rotuloTitulo: "Em Trânsito",
    rotuloTabela: "Em Trânsito",
    badgeClasse: "bg-info-light text-info border-info-border",
    classeBotaoLote:
      "border-info-border bg-info-light text-info hover:bg-info hover:text-primary-foreground",
  },
  {
    valor: "Disponivel",
    rotulo: "Disponível",
    rotuloTitulo: "Disponível",
    rotuloTabela: "Disponível no Depósito",
    badgeClasse: "bg-success-light text-success border-success-border",
    classeBotaoLote:
      "border-success-border bg-success-light text-success hover:bg-success hover:text-primary-foreground",
  },
  {
    valor: "Utilizado",
    rotulo: "Utilizado",
    rotuloTitulo: "Utilizado",
    rotuloTabela: "Instalado na Obra",
    badgeClasse: "bg-muted text-foreground-muted border-border-subtle",
    classeBotaoLote:
      "border-border-subtle bg-muted text-foreground-muted hover:bg-foreground-muted hover:text-primary-foreground",
  },
];

/** Etapas operacionais pós-solicitação usadas nas ações em lote e no filtro gargalo do Kanban. */
export const STATUS_LOGISTICO_OPERACIONAIS: ReadonlyArray<MetaStatusLogistico> =
  STATUS_LOGISTICO_OPCOES.filter((opcao) => opcao.valor !== "EmSolicitacao");

/** Retorna metadados do status logístico preservando fallback em Comprado para nulos/desconhecidos. */
export function obterMetaStatusLogistico(status?: StatusLogistico | null): MetaStatusLogistico {
  return (
    STATUS_LOGISTICO_OPCOES.find((opcao) => opcao.valor === status) ?? STATUS_LOGISTICO_OPCOES[1]
  );
}

/** RF-06 / RN-08: inclusão, edição cadastral e exclusão de insumos. */
export function podeGerenciarCadastroMaterial(perfil?: NomePerfil | null): boolean {
  return perfil === "Administrador" || perfil === "Engenharia";
}

/** RF-06 / 04-regras-negocio.md:239: alteração de status logístico na tela /obras/:id/materiais. */
export function podeAlterarStatusMaterialObra(perfil?: NomePerfil | null): boolean {
  return perfil === "Administrador" || perfil === "Financeiro";
}

/** RF-06 / RN-08: edição de status durante modal/drawer cadastral (Financeiro é leitura no Kanban). */
export function podeAlterarStatusEmEdicaoCadastral(perfil?: NomePerfil | null): boolean {
  return perfil === "Administrador";
}
