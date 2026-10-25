import type MockAdapter from "axios-mock-adapter";
import { obterObrasArmazenadas } from "../dados/obras";
import { obterCronogramaCompartilhadoFixture } from "../dados/programacoes";

export function registrarCronogramaPublico(mock: MockAdapter): void {
  // GET /cronograma/compartilhado/{token} (RF-16: Cronograma/Relatório Público em modo leitura)
  mock.onGet(/\/cronograma\/compartilhado\/[^/]+/).reply((config) => {
    const match = config.url?.match(/\/cronograma\/compartilhado\/([^/?]+)/);
    const token = match ? match[1] : "";
    if (!token || token === "invalido") {
      return [
        401,
        { error: { code: "UNAUTHORIZED", message: "Token de cronograma inválido ou expirado." } },
      ];
    }
  
    try {
      const decoded = atob(token);
      if (decoded.includes("|")) {
        const [periodoInicio, periodoFim, clienteFiltro] = decoded.split("|");
        const obrasArmazenadas = obterObrasArmazenadas();
        
        const obrasFiltradas = obrasArmazenadas.filter((o) => {
          const passaCliente = !clienteFiltro || clienteFiltro === "todos" || o.clienteNome.toLowerCase() === clienteFiltro.toLowerCase();
          return passaCliente;
        });
  
        const totalPaineis = obrasFiltradas.reduce((acc, o) => acc + (o.quantidadePaineis || 0), 0);
  
        return [
          200,
          {
            periodoInicio: periodoInicio || "",
            periodoFim: periodoFim || "",
            clienteFiltro: clienteFiltro || "todos",
            obras: obrasFiltradas,
            totalObras: obrasFiltradas.length,
            obrasConcluidas: obrasFiltradas.filter((o) => o.status === "Concluido").length,
            totalPaineis,
          },
        ];
      }
    } catch {
      // Continua para o Gantt fixture caso não seja token do relatório em base64
    }
  
    const params = config.params as { dataInicio?: string; dataFim?: string } | undefined;
    const dados = obterCronogramaCompartilhadoFixture(token, params);
    return [200, dados];
  });
}
