"use client";

import {
  CameraOff,
  Eye,
  FlipHorizontal2,
  LoaderCircle,
  MessageCirclePlus,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatLanguage } from "./ChatWorkspace";

const AUTO_OBSERVE_INTERVAL_MS = 8_000;
const MAX_AUTO_OBSERVATIONS = 10;
const MAX_FRAME_EDGE = 1_280;

type CameraState = "requesting" | "active" | "paused" | "error";
type FacingMode = "environment" | "user";

const text = {
  en: {
    title: "ALMA Live Camera",
    subtitle: "Show ALMA what you see and get guidance in the moment.",
    close: "End live camera",
    flip: "Switch camera",
    pause: "Pause camera",
    resume: "Resume camera",
    analyze: "Analyze now",
    analyzing: "ALMA is looking...",
    auto: "Auto Observe",
    autoHint: "One private snapshot every 8 seconds, up to 10 per session.",
    question: "What should ALMA look for?",
    placeholder:
      "What am I looking at? What matters, and what should I do next?",
    latest: "Latest observation",
    waiting: "Point the camera at something, then ask ALMA to analyze it.",
    save: "Add to chat",
    saved: "Added to chat",
    privacy:
      "Video stays on this device. Only compressed snapshots are sent for analysis; raw video is not stored.",
    permission:
      "Camera access is blocked. Allow camera access in your browser or iPhone settings, then try again.",
    unavailable: "Live Camera is not supported in this browser.",
    failed: "ALMA could not analyze this frame. Try again in a moment.",
    limit: "Auto Observe finished its 10-observation safety limit.",
    observation: "observation",
  },
  es: {
    title: "Cámara en vivo de ALMA",
    subtitle: "Muéstrale a ALMA lo que ves y recibe ayuda en el momento.",
    close: "Terminar cámara en vivo",
    flip: "Cambiar cámara",
    pause: "Pausar cámara",
    resume: "Reanudar cámara",
    analyze: "Analizar ahora",
    analyzing: "ALMA está observando...",
    auto: "Observación automática",
    autoHint: "Una imagen privada cada 8 segundos, hasta 10 por sesión.",
    question: "¿Qué debe buscar ALMA?",
    placeholder: "¿Qué estoy viendo? ¿Qué importa y qué debo hacer ahora?",
    latest: "Observación más reciente",
    waiting: "Apunta la cámara a algo y pídele a ALMA que lo analice.",
    save: "Agregar al chat",
    saved: "Agregado al chat",
    privacy:
      "El video permanece en este dispositivo. Solo se envían imágenes comprimidas para análisis; el video no se guarda.",
    permission:
      "El acceso a la cámara está bloqueado. Permítelo en el navegador o en la configuración del iPhone e inténtalo otra vez.",
    unavailable: "La cámara en vivo no es compatible con este navegador.",
    failed:
      "ALMA no pudo analizar esta imagen. Inténtalo de nuevo en un momento.",
    limit:
      "La observación automática llegó al límite de seguridad de 10 análisis.",
    observation: "observación",
  },
} as const;

function requestId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export default function LiveCameraSession({
  language,
  onClose,
  onAddToChat,
}: {
  language: ChatLanguage;
  onClose: () => void;
  onAddToChat: (answer: string) => void;
}) {
  const copy = text[language];
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyzingRef = useRef(false);
  const observationCountRef = useRef(0);
  const mountedRef = useRef(true);
  const [cameraState, setCameraState] = useState<CameraState>("requesting");
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [autoObserve, setAutoObserve] = useState(false);
  const [question, setQuestion] = useState<string>(copy.placeholder);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [observationCount, setObservationCount] = useState(0);
  const [saved, setSaved] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(
    async (nextFacingMode: FacingMode) => {
      setCameraState("requesting");
      setError("");
      stopCamera();

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState("error");
        setError(copy.unavailable);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: nextFacingMode },
            width: { ideal: 1_920 },
            height: { ideal: 1_080 },
          },
        });
        if (!mountedRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setFacingMode(nextFacingMode);
        setCameraState("active");
      } catch {
        setCameraState("error");
        setError(copy.permission);
      }
    },
    [copy.permission, copy.unavailable, stopCamera],
  );

  const captureFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (
      !video ||
      !canvas ||
      cameraState !== "active" ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      return null;
    }

    const scale = Math.min(
      1,
      MAX_FRAME_EDGE / Math.max(video.videoWidth, video.videoHeight),
    );
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.78);
    });
  }, [cameraState]);

  const analyzeFrame = useCallback(
    async (automatic = false) => {
      if (analyzingRef.current || cameraState !== "active") return;
      if (observationCountRef.current >= MAX_AUTO_OBSERVATIONS) {
        setAutoObserve(false);
        setError(copy.limit);
        return;
      }

      analyzingRef.current = true;
      setAnalyzing(true);
      setSaved(false);
      setError("");
      try {
        const blob = await captureFrame();
        if (!blob) throw new Error("frame_unavailable");
        const form = new FormData();
        form.append(
          "file",
          new File([blob], `alma-live-camera-${Date.now()}.jpg`, {
            type: "image/jpeg",
          }),
        );
        form.append("source", "live_camera");
        form.append("observation", automatic ? "auto" : "manual");
        form.append("language", language);
        form.append("question", question.trim() || copy.placeholder);

        const response = await fetch("/api/files/analyze", {
          method: "POST",
          headers: { "x-idempotency-key": requestId() },
          body: form,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || typeof payload.answer !== "string") {
          throw new Error(
            typeof payload.error === "string"
              ? payload.error
              : "analysis_failed",
          );
        }
        if (!mountedRef.current) return;
        setAnswer(payload.answer);
        observationCountRef.current += 1;
        setObservationCount(observationCountRef.current);
        if (observationCountRef.current >= MAX_AUTO_OBSERVATIONS) {
          setAutoObserve(false);
        }
      } catch {
        if (mountedRef.current) setError(copy.failed);
      } finally {
        analyzingRef.current = false;
        if (mountedRef.current) setAnalyzing(false);
      }
    },
    [
      cameraState,
      captureFrame,
      copy.failed,
      copy.limit,
      copy.placeholder,
      language,
      question,
    ],
  );

  useEffect(() => {
    mountedRef.current = true;
    const frame = window.requestAnimationFrame(() => {
      void startCamera("environment");
    });
    return () => {
      window.cancelAnimationFrame(frame);
      mountedRef.current = false;
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  useEffect(() => {
    if (!autoObserve || cameraState !== "active") return;
    const timer = window.setInterval(() => {
      void analyzeFrame(true);
    }, AUTO_OBSERVE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [analyzeFrame, autoObserve, cameraState]);

  useEffect(() => {
    function handleVisibility() {
      if (document.hidden && cameraState === "active") {
        streamRef.current?.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
        setCameraState("paused");
        setAutoObserve(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("keydown", handleKey);
    };
  }, [cameraState, onClose]);

  function togglePause() {
    const shouldPause = cameraState === "active";
    streamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = !shouldPause;
    });
    setCameraState(shouldPause ? "paused" : "active");
    if (shouldPause) setAutoObserve(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-[#05070A] text-white"
    >
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`h-full w-full object-cover transition-opacity duration-300 ${cameraState === "active" ? "opacity-100" : "opacity-35"}`}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,10,0.86)_0%,rgba(5,7,10,0.04)_30%,rgba(5,7,10,0.1)_55%,rgba(5,7,10,0.96)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_0%,transparent_42%,rgba(5,7,10,0.28)_100%)]" />
      </div>

      <header className="relative z-10 flex items-start justify-between gap-4 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#38E8B0] shadow-[0_0_18px_rgba(56,232,176,0.9)]" />
            <h2 className="text-lg font-semibold tracking-tight">
              {copy.title}
            </h2>
          </div>
          <p className="mt-1 max-w-lg text-xs text-white/65">{copy.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.close}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 bg-black/35 backdrop-blur-xl hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-4">
        {cameraState === "requesting" ? (
          <div className="rounded-3xl border border-white/10 bg-black/45 px-6 py-5 text-center backdrop-blur-xl">
            <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-[#38E8B0]" />
            <p className="mt-3 text-sm text-white/75">{copy.analyzing}</p>
          </div>
        ) : null}
        {cameraState === "paused" ? (
          <div className="rounded-3xl border border-white/10 bg-black/45 px-6 py-5 text-center backdrop-blur-xl">
            <CameraOff className="mx-auto h-7 w-7 text-white/70" />
            <p className="mt-3 text-sm text-white/75">{copy.pause}</p>
          </div>
        ) : null}
        {cameraState === "error" ? (
          <div className="max-w-md rounded-3xl border border-red-300/20 bg-red-950/55 px-6 py-5 text-center backdrop-blur-xl">
            <CameraOff className="mx-auto h-7 w-7 text-red-200" />
            <p className="mt-3 text-sm text-red-100">{error}</p>
            <button
              type="button"
              onClick={() => void startCamera(facingMode)}
              className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-medium text-black"
            >
              {language === "es" ? "Intentar otra vez" : "Try again"}
            </button>
          </div>
        ) : null}
      </div>

      <section className="relative z-10 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
        <div className="mx-auto max-w-4xl rounded-[1.75rem] border border-white/12 bg-[#0B0F14]/88 p-3 shadow-2xl backdrop-blur-2xl sm:p-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-3">
            <button
              type="button"
              disabled={cameraState === "error" || cameraState === "requesting"}
              onClick={() =>
                void startCamera(
                  facingMode === "environment" ? "user" : "environment",
                )
              }
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-white/12 bg-white/7 px-3 text-xs font-medium disabled:opacity-40"
            >
              <FlipHorizontal2 className="h-4 w-4" />
              {copy.flip}
            </button>
            <button
              type="button"
              disabled={cameraState === "error" || cameraState === "requesting"}
              onClick={togglePause}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-white/12 bg-white/7 px-3 text-xs font-medium disabled:opacity-40"
            >
              {cameraState === "paused" ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
              {cameraState === "paused" ? copy.resume : copy.pause}
            </button>
            <button
              type="button"
              disabled={
                cameraState !== "active" ||
                analyzing ||
                observationCount >= MAX_AUTO_OBSERVATIONS
              }
              aria-pressed={autoObserve}
              onClick={() => setAutoObserve((current) => !current)}
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-medium disabled:opacity-40 ${autoObserve ? "border-[#38E8B0]/60 bg-[#123E33] text-[#8CF5D5]" : "border-white/12 bg-white/7"}`}
            >
              <Eye className="h-4 w-4" />
              {copy.auto}
              <span className="text-[10px] opacity-65">
                {observationCount}/{MAX_AUTO_OBSERVATIONS}
              </span>
            </button>
          </div>

          <label className="block text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">
            {copy.question}
          </label>
          <div className="mt-2 flex gap-2">
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={2_000}
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/7 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#38E8B0]/60"
              placeholder={copy.placeholder}
            />
            <button
              type="button"
              disabled={
                cameraState !== "active" ||
                analyzing ||
                observationCount >= MAX_AUTO_OBSERVATIONS
              }
              onClick={() => void analyzeFrame(false)}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#38E8B0] px-4 text-sm font-semibold text-[#052019] hover:bg-[#6AF0C8] disabled:opacity-45"
            >
              {analyzing ? (
                <LoaderCircle className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              <span className="hidden sm:inline">
                {analyzing ? copy.analyzing : copy.analyze}
              </span>
            </button>
          </div>

          <div className="mt-3 max-h-40 overflow-y-auto rounded-2xl border border-white/8 bg-black/25 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#38E8B0]">
                  {copy.latest}
                </p>
                <p
                  className="mt-1 whitespace-pre-wrap text-sm leading-5 text-white/80"
                  aria-live="polite"
                >
                  {answer || (analyzing ? copy.analyzing : copy.waiting)}
                </p>
              </div>
              {answer ? (
                <button
                  type="button"
                  onClick={() => {
                    onAddToChat(answer);
                    setSaved(true);
                  }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/12 px-3 py-2 text-[11px] font-medium hover:bg-white/8"
                >
                  <MessageCirclePlus className="h-3.5 w-3.5" />
                  {saved ? copy.saved : copy.save}
                </button>
              ) : null}
            </div>
          </div>

          {error && cameraState !== "error" ? (
            <p className="mt-2 text-xs text-red-200" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-3 flex items-start gap-2 text-[10px] leading-4 text-white/45">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#38E8B0]" />
            <span>
              {copy.privacy} {copy.autoHint}
            </span>
          </div>
        </div>
      </section>
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
    </div>
  );
}
