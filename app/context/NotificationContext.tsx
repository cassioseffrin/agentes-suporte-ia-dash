"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { Snackbar, Box, Typography, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import axios from "axios";
import { useAuditor } from "./AuditorContext";

const BASE_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://assistant.arpasistemas.com.br";
const BACKEND_API_KEY = process.env.NEXT_PUBLIC_BACKEND_API_KEY || "";

export type VoiceOption = "openai" | "dora" | "kokoro";

interface NotificationContextValue {
  ttsEnabled: boolean;
  setTtsEnabled: (enabled: boolean) => void;
  selectedVoice: VoiceOption;
  setSelectedVoice: (voice: VoiceOption) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  ttsInteractionRequired: boolean;
  setTtsInteractionRequired: (required: boolean) => void;
  lastThreadUpdate: { threadId: string; timestamp: number } | null;
}

const NotificationContext = createContext<NotificationContextValue>({
  ttsEnabled: true,
  setTtsEnabled: () => { },
  selectedVoice: "openai",
  setSelectedVoice: () => { },
  playbackSpeed: 1.25,
  setPlaybackSpeed: () => { },
  ttsInteractionRequired: false,
  setTtsInteractionRequired: () => { },
  lastThreadUpdate: null,
});

interface ToastState {
  open: boolean;
  clientName: string;
  agentName: string;
  firstMessage: string;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { auditor } = useAuditor();
  const [ttsEnabled, setTtsEnabledState] = useState<boolean>(true);
  const [selectedVoice, setSelectedVoiceState] = useState<VoiceOption>("openai");
  const [playbackSpeed, setPlaybackSpeedState] = useState<number>(1.25);
  const [ttsInteractionRequired, setTtsInteractionRequired] = useState<boolean>(false);
  const [lastThreadUpdate, setLastThreadUpdate] = useState<{ threadId: string; timestamp: number } | null>(null);
  const [toast, setToast] = useState<ToastState>({
    open: false,
    clientName: "",
    agentName: "",
    firstMessage: "",
  });

  const ttsEnabledRef = useRef<boolean>(true);
  const selectedVoiceRef = useRef<VoiceOption>("openai");
  const playbackSpeedRef = useRef<number>(1.25);
  const ttsQueueRef = useRef<string[]>([]);
  const ttsPlayingRef = useRef<boolean>(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const storedEnabled = localStorage.getItem("ttsEnabled");
    if (storedEnabled !== null) {
      const enabled = storedEnabled === "true";
      setTtsEnabledState(enabled);
      ttsEnabledRef.current = enabled;
    }

    const storedVoice = localStorage.getItem("selectedVoice") as VoiceOption | null;
    if (storedVoice === "openai" || storedVoice === "dora" || storedVoice === "kokoro") {
      setSelectedVoiceState(storedVoice);
      selectedVoiceRef.current = storedVoice;
    }

    const storedSpeed = localStorage.getItem("playbackSpeed");
    if (storedSpeed !== null) {
      const speed = parseFloat(storedSpeed);
      if (!isNaN(speed) && speed > 0) {
        setPlaybackSpeedState(speed);
        playbackSpeedRef.current = speed;
      }
    }
  }, []);

  const setTtsEnabled = (enabled: boolean) => {
    setTtsEnabledState(enabled);
    ttsEnabledRef.current = enabled;
    localStorage.setItem("ttsEnabled", enabled ? "true" : "false");
  };

  const setSelectedVoice = (voice: VoiceOption) => {
    setSelectedVoiceState(voice);
    selectedVoiceRef.current = voice;
    localStorage.setItem("selectedVoice", voice);
  };

  const setPlaybackSpeed = (speed: number) => {
    setPlaybackSpeedState(speed);
    playbackSpeedRef.current = speed;
    localStorage.setItem("playbackSpeed", speed.toString());
  };

  const playNotificationBeep = () => {
    return new Promise<void>((resolve) => {
      if (typeof window === "undefined") {
        resolve();
        return;
      }
      try {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
          resolve();
          return;
        }
        const ctx = new AudioContextClass();

        const playChime = (time: number, freq: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, time);

          gainNode.gain.setValueAtTime(0, time);
          gainNode.gain.linearRampToValueAtTime(0.2, time + 0.02);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);

          osc.connect(gainNode);
          gainNode.connect(ctx.destination);

          osc.start(time);
          osc.stop(time + duration);
        };

        const now = ctx.currentTime;
        // High-quality double chime: E6 (1318.51 Hz) then A6 (1760.00 Hz)
        playChime(now, 1318.51, 0.15);
        playChime(now + 0.07, 1760.00, 0.25);

        setTimeout(() => {
          ctx.close();
          resolve();
        }, 400);
      } catch (e) {
        console.error("[TTS] Erro ao reproduzir beep:", e);
        resolve();
      }
    });
  };

  const playTtsNotification = async (text: string) => {
    let audioUrl = "";
    try {
      // 1. Play premium WhatsApp-like chime beep
      await playNotificationBeep();

      // 2. Play the spoken info via TTS using selected voice engine
      const res = await axios.post(
        `${BASE_API_URL}/admin/tts`,
        { text, voice: selectedVoiceRef.current },
        {
          headers: { Authorization: `Bearer ${BACKEND_API_KEY}` },
          responseType: "blob",
        }
      );
      const contentType = res.headers["content-type"] || "audio/wav";
      const audioBlob = new Blob([res.data], { type: contentType });
      audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.playbackRate = playbackSpeedRef.current;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }

      return new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
      });
    } catch (e: any) {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (e && (e.name === "NotAllowedError" || (e.message && e.message.includes("interact")))) {
        console.warn("[TTS] Reprodução de áudio automática bloqueada pelo navegador.");
        setTtsInteractionRequired(true);
      } else {
        console.error("[TTS] Erro ao reproduzir áudio:", e);
      }
    }
  };

  const processTtsQueue = async () => {
    if (ttsPlayingRef.current) return;
    ttsPlayingRef.current = true;
    while (ttsQueueRef.current.length > 0) {
      const text = ttsQueueRef.current.shift()!;
      if (ttsEnabledRef.current) {
        await playTtsNotification(text);
      }
    }
    ttsPlayingRef.current = false;
  };

  const enqueueTts = (text: string) => {
    if (!ttsEnabledRef.current) return;

    // Evitar reprodução duplicada do mesmo áudio num curto intervalo (ex: multiplas abas)
    const cleanText = text.trim();
    const key = `tts_last_played_${cleanText}`;
    const lastPlayed = localStorage.getItem(key);
    const now = Date.now();
    if (lastPlayed && now - parseInt(lastPlayed, 10) < 4000) {
      console.log("[TTS] Ignorando áudio duplicado recente:", cleanText);
      return;
    }
    localStorage.setItem(key, now.toString());

    ttsQueueRef.current.push(text);
    processTtsQueue();
  };

  // SSE connection hook
  useEffect(() => {
    if (!auditor) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const connectSSE = () => {
      // Fechar conexão existente para evitar múltiplas conexões
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      console.log("[NotificationProvider] Conectando EventSource ao SSE:", `${BASE_API_URL}/admin/events`);

      const es = new EventSource(
        `${BASE_API_URL}/admin/events?token=${encodeURIComponent(BACKEND_API_KEY)}`
      );
      eventSourceRef.current = es;

      es.onopen = () => {
        console.log("[NotificationProvider] SSE conectado com sucesso!");
      };

      es.addEventListener("new_chat", (e) => {
        console.log("[NotificationProvider] Evento new_chat recebido:", e.data);
        try {
          const data = JSON.parse(e.data);
          const { user_name, agent_name, first_message, thread_id } = data;

          setToast({
            open: true,
            clientName: user_name || "Cliente desconhecido",
            agentName: agent_name || "Agente",
            firstMessage: first_message || "",
          });

          const clientNameClean = user_name || "Cliente desconhecido";
          const agentNameClean = agent_name || "Agente";
          const messageText = first_message || "";
          const messageLimited = messageText.length > 250
            ? `${messageText.substring(0, 250)}, ... abreviado.`
            : messageText;
          const ttsText = `cliente: ${clientNameClean}, ${agentNameClean}, ${messageLimited}`;
          enqueueTts(ttsText);

          setLastThreadUpdate({
            threadId: thread_id || "",
            timestamp: Date.now(),
          });
        } catch (err) {
          console.error("[SSE] Erro ao processar evento new_chat:", err);
        }
      });

      es.addEventListener("thread_updated", (e) => {
        console.log("[NotificationProvider] Evento thread_updated recebido:", e.data);
        try {
          const data = JSON.parse(e.data);
          const { thread_id } = data;
          setLastThreadUpdate({
            threadId: thread_id || "",
            timestamp: Date.now(),
          });
        } catch (err) {
          console.error("[SSE] Erro ao processar evento thread_updated:", err);
        }
      });

      es.onerror = (err) => {
        console.error("[NotificationProvider] Erro/desconexão no EventSource de /admin/events:", err);
      };
    };

    connectSSE();

    // Health check/reconnect listeners for network state and wake from sleep
    const handleReconnectIfNeeded = () => {
      const es = eventSourceRef.current;
      console.log("[NotificationProvider] Verificando conexão SSE após alteração de rede/visibilidade. Estado atual:", es ? es.readyState : "NULO");
      if (!es || es.readyState !== EventSource.OPEN) {
        console.log("[NotificationProvider] Conexão inativa ou inexistente. Recriando conexão SSE...");
        connectSSE();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleReconnectIfNeeded();
      }
    };

    window.addEventListener("online", handleReconnectIfNeeded);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("online", handleReconnectIfNeeded);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [auditor]);

  // Audio unlock listener
  useEffect(() => {
    const unlockAudio = () => {
      const audio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA");
      audio.play()
        .then(() => {
          setTtsInteractionRequired(false);
          processTtsQueue();
          window.removeEventListener("click", unlockAudio, { capture: true });
          window.removeEventListener("keydown", unlockAudio, { capture: true });
        })
        .catch(() => {
          // Awaiting proper user gesture
        });
    };

    window.addEventListener("click", unlockAudio, { capture: true });
    window.addEventListener("keydown", unlockAudio, { capture: true });

    return () => {
      window.removeEventListener("click", unlockAudio, { capture: true });
      window.removeEventListener("keydown", unlockAudio, { capture: true });
    };
  }, []);

  const handleCloseToast = () => {
    setToast((prev) => ({ ...prev, open: false }));
  };

  return (
    <NotificationContext.Provider
      value={{
        ttsEnabled,
        setTtsEnabled,
        selectedVoice,
        setSelectedVoice,
        playbackSpeed,
        setPlaybackSpeed,
        ttsInteractionRequired,
        setTtsInteractionRequired,
        lastThreadUpdate,
      }}
    >
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={8000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{ zIndex: 9999 }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 2,
            p: 2.5,
            minWidth: "320px",
            maxWidth: "450px",
            borderRadius: "var(--radius, 12px)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            background: "linear-gradient(135deg, var(--bg-surface, #1a1d27) 0%, var(--bg-card, #21253a) 100%)",
            border: "1px solid var(--border-light, #374167)",
            color: "var(--text-primary, #ffffff)",
            position: "relative",
            animation: "fadeIn 0.3s ease",
          }}
        >
          {/* Icon indicator */}
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "var(--success, #10b981)",
            }}
          >
            <SupportAgentIcon sx={{ fontSize: 20 }} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, pr: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "var(--success, #10b981)", mb: 0.5 }}>
              Nova Conversa Iniciada!
            </Typography>
            <Typography variant="body2" sx={{ color: "var(--text-primary, #ffffff)", fontWeight: 600, fontSize: 13 }}>
              <strong>Cliente:</strong> {toast.clientName}
            </Typography>
            <Typography variant="body2" sx={{ color: "var(--text-secondary, #cbd5e1)", fontSize: 13, mt: 0.2 }}>
              <strong>Agente:</strong> {toast.agentName}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontStyle: "italic",
                mt: 1,
                color: "var(--text-muted, #94a3b8)",
                fontSize: 12,
                maxHeight: "60px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                lineHeight: 1.4,
              }}
            >
              "{toast.firstMessage}"
            </Typography>
          </Box>

          <IconButton
            size="small"
            onClick={handleCloseToast}
            sx={{
              color: "var(--text-muted, #94a3b8)",
              position: "absolute",
              top: 8,
              right: 8,
              "&:hover": {
                color: "var(--text-primary, #ffffff)",
                backgroundColor: "rgba(255,255,255,0.05)",
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
