export type TemaSistema = "light" | "dark" | "system";

export interface ThemeUIState {
  tema: TemaSistema;
  setTema: (tema: TemaSistema) => void;
  alternarTema: () => void;
}
