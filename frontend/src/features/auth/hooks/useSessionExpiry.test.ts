import { afterEach, describe, expect, it, vi } from "vitest";
import {
  INTERVALO_CHECAGEM_MS,
  iniciarMonitoramentoExpiracao,
} from "@/features/auth/hooks/useSessionExpiry";

describe("iniciarMonitoramentoExpiracao", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("dispara logout imediato, suprime aviso e não aloca listeners/intervalo quando a sessão já expirou na montagem", () => {
    const salvarRotaRetorno = vi.fn();
    const onLogout = vi.fn();
    const onExpirada = vi.fn();
    const onAvisoProximo = vi.fn();
    const agendarIntervalo = vi.fn();
    const limparIntervalo = vi.fn();
    const focusTarget = new EventTarget();
    const visibilityTarget = new EventTarget();
    const focusAddSpy = vi.spyOn(focusTarget, "addEventListener");
    const visAddSpy = vi.spyOn(visibilityTarget, "addEventListener");
    const agoraMs = vi.fn(() => new Date("2026-11-14T10:00:00.000Z").getTime());

    const parar = iniciarMonitoramentoExpiracao({
      expiresAt: "2026-11-14T10:00:00.000Z",
      agoraMs,
      obterRotaAtual: () => "/kanban?obra=12",
      salvarRotaRetorno,
      onLogout,
      onExpirada,
      onAvisoProximo,
      focusTarget,
      visibilityTarget,
      agendarIntervalo,
      limparIntervalo,
    });

    expect(salvarRotaRetorno).toHaveBeenCalledWith("/kanban?obra=12");
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(onExpirada).toHaveBeenCalledTimes(1);
    expect(onAvisoProximo).not.toHaveBeenCalled();
    expect(focusAddSpy).not.toHaveBeenCalled();
    expect(visAddSpy).not.toHaveBeenCalled();
    expect(agendarIntervalo).not.toHaveBeenCalled();
    expect(agoraMs).toHaveBeenCalledTimes(1);

    focusTarget.dispatchEvent(new Event("focus"));
    visibilityTarget.dispatchEvent(new Event("visibilitychange"));
    expect(agoraMs).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledTimes(1);

    parar();
    expect(limparIntervalo).not.toHaveBeenCalled();
  });

  it("emite aviso único nos últimos 3 minutos via visibilitychange e encerra listeners/intervalo assim que expira", () => {
    vi.useFakeTimers();
    let agora = new Date("2026-11-14T10:00:00.000Z").getTime();
    const agoraMs = vi.fn(() => agora);
    const expiresAt = new Date(agora + 4 * 60 * 1000).toISOString();

    const salvarRotaRetorno = vi.fn();
    const onLogout = vi.fn();
    const onExpirada = vi.fn();
    const onAvisoProximo = vi.fn();
    const focusTarget = new EventTarget();
    const visibilityTarget = new EventTarget();
    let sinalCapturado: AbortSignal | undefined;
    const origVisAdd = visibilityTarget.addEventListener.bind(visibilityTarget);
    vi.spyOn(visibilityTarget, "addEventListener").mockImplementation(((
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions
    ) => {
      if (options && typeof options === "object" && "signal" in options) {
        sinalCapturado = options.signal;
      }
      origVisAdd(type, listener, options);
    }) as typeof visibilityTarget.addEventListener);
    const limparSpy = vi.fn((id: ReturnType<typeof globalThis.setInterval>) =>
      globalThis.clearInterval(id)
    );

    const parar = iniciarMonitoramentoExpiracao({
      expiresAt,
      agoraMs,
      obterRotaAtual: () => "/equipes",
      salvarRotaRetorno,
      onLogout,
      onExpirada,
      onAvisoProximo,
      focusTarget,
      visibilityTarget,
      limparIntervalo: limparSpy,
    });

    expect(onAvisoProximo).not.toHaveBeenCalled();
    expect(onLogout).not.toHaveBeenCalled();
    expect(sinalCapturado?.aborted).toBe(false);

    // Faltam 2 minutos -> visibilitychange dispara aviso único; focus subsequente não duplica
    agora += 2 * 60 * 1000;
    visibilityTarget.dispatchEvent(new Event("visibilitychange"));
    focusTarget.dispatchEvent(new Event("focus"));
    expect(onAvisoProximo).toHaveBeenCalledTimes(1);
    expect(onLogout).not.toHaveBeenCalled();

    // Avança além da expiração via intervalo periódico -> limpa timer e aborta AbortSignal na hora
    const chamadasAntesExpirar = agoraMs.mock.calls.length;
    agora += 2 * 60 * 1000;
    vi.advanceTimersByTime(INTERVALO_CHECAGEM_MS);
    expect(agoraMs).toHaveBeenCalledTimes(chamadasAntesExpirar + 1);
    expect(salvarRotaRetorno).toHaveBeenCalledWith("/equipes");
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(onExpirada).toHaveBeenCalledTimes(1);
    expect(limparSpy).toHaveBeenCalledTimes(1);
    expect(sinalCapturado?.aborted).toBe(true);

    // Eventos/ticks após expiração não invocam nem sequer o callback no target nem o temporizador
    focusTarget.dispatchEvent(new Event("focus"));
    visibilityTarget.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(INTERVALO_CHECAGEM_MS * 2);
    expect(agoraMs).toHaveBeenCalledTimes(chamadasAntesExpirar + 1);

    parar();
  });

  it("aborta listeners focus/visibilitychange e limpa o intervalo de forma independente no unmount", () => {
    vi.useFakeTimers();
    let agora = new Date("2026-11-14T10:00:00.000Z").getTime();
    const agoraMs = vi.fn(() => agora);
    const expiresAt = new Date(agora + 10 * 60 * 1000).toISOString();

    const focusTarget = new EventTarget();
    const visibilityTarget = new EventTarget();
    const abortFocusSpy = vi.fn();
    const abortVisSpy = vi.fn();
    const origFocusAdd = focusTarget.addEventListener.bind(focusTarget);
    const origVisAdd = visibilityTarget.addEventListener.bind(visibilityTarget);

    vi.spyOn(focusTarget, "addEventListener").mockImplementation(((
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions
    ) => {
      if (options && typeof options === "object" && "signal" in options && options.signal) {
        options.signal.addEventListener("abort", abortFocusSpy);
      }
      origFocusAdd(type, listener, options);
    }) as typeof focusTarget.addEventListener);

    vi.spyOn(visibilityTarget, "addEventListener").mockImplementation(((
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions
    ) => {
      if (options && typeof options === "object" && "signal" in options && options.signal) {
        options.signal.addEventListener("abort", abortVisSpy);
      }
      origVisAdd(type, listener, options);
    }) as typeof visibilityTarget.addEventListener);

    const limparSpy = vi.fn((id: ReturnType<typeof globalThis.setInterval>) =>
      globalThis.clearInterval(id)
    );
    const onAvisoProximo = vi.fn();
    const onLogout = vi.fn();

    const parar = iniciarMonitoramentoExpiracao({
      expiresAt,
      agoraMs,
      obterRotaAtual: () => "/kanban",
      salvarRotaRetorno: vi.fn(),
      onLogout,
      onExpirada: vi.fn(),
      onAvisoProximo,
      focusTarget,
      visibilityTarget,
      limparIntervalo: limparSpy,
    });

    expect(agoraMs).toHaveBeenCalledTimes(1);
    parar();
    expect(abortFocusSpy).toHaveBeenCalledTimes(1);
    expect(abortVisSpy).toHaveBeenCalledTimes(1);
    expect(limparSpy).toHaveBeenCalledTimes(1);

    // Prova independente do guard interno: os listeners foram realmente removidos do EventTarget
    agora += 15 * 60 * 1000;
    focusTarget.dispatchEvent(new Event("focus"));
    visibilityTarget.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(INTERVALO_CHECAGEM_MS * 3);

    expect(agoraMs).toHaveBeenCalledTimes(1);
    expect(onAvisoProximo).not.toHaveBeenCalled();
    expect(onLogout).not.toHaveBeenCalled();
  });
});
