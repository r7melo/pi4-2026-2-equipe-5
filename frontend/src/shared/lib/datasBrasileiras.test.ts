import { describe, expect, it } from "vitest";
import { dataBRParaIso, isoParaDataBR, mascararDataBR } from "./datasBrasileiras";

describe("datasBrasileiras", () => {
  it("converte ida e volta entre ISO civil e formato dd/mm/aaaa", () => {
    expect(isoParaDataBR("2026-11-26")).toBe("26/11/2026");
    expect(isoParaDataBR("2026-11-26T14:30:00Z")).toBe("26/11/2026");
    expect(isoParaDataBR("")).toBe("");
    expect(dataBRParaIso("26/11/2026")).toBe("2026-11-26");
  });

  it("aplica máscara incremental preservando apenas dígitos até 8 caracteres", () => {
    expect(mascararDataBR("26")).toBe("26");
    expect(mascararDataBR("2611")).toBe("26/11");
    expect(mascararDataBR("26112026")).toBe("26/11/2026");
    expect(mascararDataBR("26-11-2026 extra 99")).toBe("26/11/2026");
  });

  it("rejeita datas inválidas no calendário civil como 31/02/2026 ou formatos incompletos", () => {
    expect(dataBRParaIso("31/02/2026")).toBeNull();
    expect(dataBRParaIso("26/11/26")).toBeNull();
    expect(isoParaDataBR("2026-02-31")).toBe("");
  });
});
