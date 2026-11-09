/**
 * Predicado de prontidão logística de materiais (RF-08, G-03).
 * Avalia se o status da obra indica que os materiais estão prontos
 * para a execução dos serviços de instalação da equipe.
 *
 * @param status Status atual da obra no funil/esteira.
 * @returns true se o status for 'Separado', 'EmAndamento' ou 'Concluido'.
 */
export function materialEstaPronto(status: string | null | undefined): boolean {
  return status === "Separado" || status === "EmAndamento" || status === "Concluido";
}
