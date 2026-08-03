"use client";
import { useState, useRef, useEffect } from "react";
import {
  Box,
  Fab,
  Paper,
  Typography,
  TextField,
  IconButton,
  CircularProgress,
  Button,
  LinearProgress,
  keyframes,
  useTheme,
  useMediaQuery,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import AddCommentOutlinedIcon from "@mui/icons-material/AddCommentOutlined";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import HistoryIcon from "@mui/icons-material/History";
import DeleteIcon from "@mui/icons-material/Delete";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownOutlinedIcon from "@mui/icons-material/ThumbDownOutlined";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ReactMarkdown from "react-markdown";
import axios from "axios";

 
const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || "https://assistant.arpasistemas.com.br";
const BACKEND_API_KEY = process.env.NEXT_PUBLIC_BACKEND_API_KEY || "";

const pulseIA = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(189, 65, 64, 0.6); }
  70%  { box-shadow: 0 0 0 16px rgba(99, 102, 241, 0); }
  100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(16px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const dotBounce = keyframes`
  0%, 80%, 100% { transform: translateY(0); }
  40%            { transform: translateY(-6px); }
`;

const formatDateTimePtBr = (dateInput?: Date | string | number) => {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";
  const pad = (num: number, size: number) => num.toString().padStart(size, '0');
  const d = pad(date.getDate(), 2);
  const m = pad(date.getMonth() + 1, 2);
  const y = date.getFullYear();
  const h = pad(date.getHours(), 2);
  const min = pad(date.getMinutes(), 2);
  const s = pad(date.getSeconds(), 2);
  const ms = pad(date.getMilliseconds(), 3);
  return `${d}/${m}/${y} ${h}:${min}:${s}.${ms}`;
};

interface ChatMessage {
  text: string;
  isUser: boolean;
  isAuditor?: boolean;
  id?: number;
  feedback_thumb?: number;
  feedback_text?: string;
  /** SVG string for the auditor's custom avatar (null = use SupportAgentIcon) */
  auditor_icon_svg?: string | null;
  /** Nickname do auditor que enviou a mensagem */
  auditor_nickname?: string | null;
  timestamp?: Date;
}

interface ChatIAProps {
  session?: any;
}

const ChatIA = ({ session }: ChatIAProps) => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("md"));
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [threadId, setThreadId] = useState("");
  const [threadError, setThreadError] = useState(0);
  const [consentGiven, setConsentGiven] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [agents, setAgents] = useState<{ id: string; name: string; title: string; logo_base64?: string | null }[]>([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const activeAgent = agents.find((a) => a.name === selectedAgent);
  const [showAgentSelection, setShowAgentSelection] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const userEventsRef = useRef<EventSource | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyHasMore, setHistoryHasMore] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackDialogChatId, setFeedbackDialogChatId] = useState<number | null>(null);
  const [feedbackDialogText, setFeedbackDialogText] = useState("");

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await axios.get(`${BASE_API_URL}/agents`);
      if (res.status === 200) {
        setAgents(res.data.agents || []);
      }
    } catch (e) {
      console.error("Erro ao carregar agentes:", e);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // --- SSE: Conectar ao canal de eventos do usuário para receber mensagens do auditor ---
  useEffect(() => {
    // Fechar conexão anterior
    if (userEventsRef.current) {
      userEventsRef.current.close();
      userEventsRef.current = null;
    }

    if (!threadId || !open) return;

    const es = new EventSource(`${BASE_API_URL}/thread/${threadId}/user-events`);
    userEventsRef.current = es;

    es.addEventListener("auditor_message", (e) => {
      try {
        const data = JSON.parse(e.data);
        setMessages((prev) => [
          ...prev,
          {
            text: data.message,
            isUser: false,
            isAuditor: true,
            id: data.chat_id || undefined,
            // Persist the auditor's custom icon so the bubble renders correctly
            auditor_icon_svg: data.auditor_icon_svg ?? null,
            auditor_nickname: data.auditor_nickname ?? data.auditor_name ?? null,
            timestamp: data.created_at ? new Date(data.created_at) : new Date(),
          },
        ]);
      } catch {}
    });

    // Escuta respostas da IA que chegam via SSE (ex: quando a conexão stream caiu
    // mas o backend continuou processando e salvou a resposta)
    es.addEventListener("agent_message", (e) => {
      try {
        const data = JSON.parse(e.data);
        // Evita duplicar se o chat_id ou o texto da última mensagem bater
        setMessages((prev) => {
          const exists = prev.some(
            (m) => m.id === data.chat_id || (m.text === data.message && !m.isUser)
          );
          if (exists) return prev;
          // Inline text cleaning (mesma lógica de cleanText)
          let cleaned = data.message;
          [/,\s*:\n/g, /,\s*:\s/g, /,\s*:/g, /-\s*:/g].forEach(
            (p) => (cleaned = cleaned.replace(p, ""))
          );
          cleaned = cleaned.replace(/ +/g, " ").trim();
          return [
            ...prev,
            {
              text: cleaned,
              isUser: false,
              id: data.chat_id || undefined,
              timestamp: data.created_at ? new Date(data.created_at) : new Date(),
            },
          ];
        });
        setIsTyping(false);
        setStatusText("");
        setStreamingText("");
      } catch {}
    });

    es.onerror = () => {
      // Reconectar silenciosamente em caso de erro
      console.warn("[user-events] SSE desconectado, tentando reconectar...");
    };

    return () => {
      es.close();
      userEventsRef.current = null;
    };
  }, [threadId, open]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, streamingText]);

  const createNewThread = async (overrideAgent?: string) => {
    try {
      const email = session?.user.userAuthentication.username || "";
      const name = session?.user.userAuthentication.nome || "";
      const cnpj = session?.user?.userAuthentication?.tenantId?.schemaFilial || "";

      const query = new URLSearchParams();
      if (email) query.append("email", email);
      if (name) query.append("name", name);
      if (cnpj) query.append("cnpj", cnpj);
      const agentToUse = overrideAgent || selectedAgent;
      if (agentToUse) query.append("agentName", agentToUse);

      const queryString = query.toString();
      const endpoint = `/createNewThread${queryString ? `?${queryString}` : ""}`;

      const res = await axios.get(endpoint, { baseURL: BASE_API_URL });
      if (res.status === 200) {
        setThreadId(res.data.threadId);
        setMessages([
          {
            text: "Olá! Sou seu assistente virtual, como posso lhe ajudar?",
            isUser: false,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (e) {
      console.error("Erro ao criar thread:", e);
    }
  };

  const fetchHistory = async (page = 1) => {
    setLoadingHistory(true);
    try {
      const email = session?.user?.userAuthentication?.username;
      if (!email) {
        setLoadingHistory(false);
        return;
      }

      const res = await axios.get(
        `${BASE_API_URL}/history?email=${encodeURIComponent(email)}&page=${page}&limit=30`,
        { headers: { Authorization: `Bearer ${BACKEND_API_KEY}` } }
      );
      if (res.status === 200) {
        const data = res.data;
        if (page === 1) {
          setHistory(data.threads || []);
        } else {
          setHistory(prev => [...prev, ...(data.threads || [])]);
        }
        setHistoryHasMore((data.threads?.length || 0) > 0);
      }
    } catch (e) {
      console.error("Erro ao buscar historico", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenHistory = () => {
    setShowHistory(true);
    setHistoryPage(1);
    fetchHistory(1);
  };

  const handleScrollHistory = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
      if (!loadingHistory && historyHasMore) {
        const nextPage = historyPage + 1;
        setHistoryPage(nextPage);
        fetchHistory(nextPage);
      }
    }
  };

  const handleSelectHistoryThread = async (tId: string, agentName: string) => {
    try {
      const res = await axios.get(`/thread/${tId}/messages`, {
        baseURL: BASE_API_URL,
        headers: { Authorization: `Bearer ${BACKEND_API_KEY}` },
      });
      if (res.status === 200) {
        const data = res.data;
        const loadedMessages = data.messages.map((m: any) => ({
          id: m.id,
          text: m.content,
          isUser: m.role === "user",
          isAuditor: m.role === "auditor",
          feedback_thumb: m.feedback_thumb,
          feedback_text: m.feedback_text,
          timestamp: m.created_at ? new Date(m.created_at) : new Date(),
        }));
        const greeting: ChatMessage = {
          text: "Olá! Sou seu assistente virtual, como posso lhe ajudar?",
          isUser: false,
          timestamp: data.messages[0]?.created_at
            ? new Date(new Date(data.messages[0].created_at).getTime() - 1000)
            : new Date(),
        };
        const existingRating = data.messages.find(
          (m: any) => m.feedback_rating != null,
        )?.feedback_rating ?? 0;
        setThreadId(tId);
        setSelectedAgent(agentName);
        setMessages([greeting, ...loadedMessages]);
        setFeedbackRating(existingRating);
        setFeedbackSent(existingRating > 0);
        setShowHistory(false);
        setShowAgentSelection(false);
        setShowConsent(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteThread = async (e: React.MouseEvent, tId: string) => {
    e.stopPropagation();
    if (!confirm("Deseja excluir esta conversa? Esta ação não pode ser desfeita.")) return;
    try {
      const res = await axios.delete(`/thread/${tId}`, {
        baseURL: BASE_API_URL,
        headers: { Authorization: `Bearer ${BACKEND_API_KEY}` },
      });
      if (res.status === 200) {
        setHistory(prev => prev.filter(t => t.thread_id !== tId));
        // Se for a thread ativa, reseta o chat
        if (threadId === tId) {
          setMessages([]);
          setThreadId("");
          setShowAgentSelection(true);
        }
      }
    } catch (e) {
      console.error("Erro ao excluir thread:", e);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    const storedConsent = localStorage.getItem("ia_consent") === "true";
    if (!storedConsent) {
      setShowConsent(true);
    } else {
      setConsentGiven(true);
      if (!selectedAgent) {
        setShowAgentSelection(true);
      } else if (!threadId) {
        createNewThread();
      }
    }
  };

  const handleAcceptConsent = () => {
    localStorage.setItem("ia_consent", "true");
    setConsentGiven(true);
    setShowConsent(false);
    setShowAgentSelection(true);
  };

  const handleSelectAgent = (agentName: string) => {
    setSelectedAgent(agentName);
    setShowAgentSelection(false);
    createNewThread(agentName);
  };

  const handleDeclineConsent = () => {
    setShowConsent(false);
    setOpen(false);
  };

  const handleReset = () => {
    setMessages([]);
    setThreadId("");
    setThreadError(0);
    setSelectedAgent("");
    setShowHistory(false);
    setShowAgentSelection(true);
    setFeedbackRating(0);
    setFeedbackSent(false);
  };

  const sendFeedback = async (rating: number) => {
    if (!threadId || feedbackSent) return;
    setFeedbackRating(rating);
    try {
      const res = await axios.put(
        `${BASE_API_URL}/thread/${threadId}/feedback`,
        { rating },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${BACKEND_API_KEY}`,
          },
        }
      );
      if (res.status === 200) {
        setFeedbackSent(true);
      }
    } catch (e) {
      console.error("Erro ao enviar feedback:", e);
    }
  };

  const fetchResponseStream = async (
    message: string,
    currentThreadId: string,
    onToken: (token: string) => void,
    onStatus: (detail: string) => void,
    onDone: (result: { content: string; chat_id: number | null; was_fallback: boolean }) => void,
    onFallback: (content: string, reason: string) => void,
    onError: (detail: string) => void,
  ) => {
    // ─── Timeout de 4 minutos (240s) - alinhado ao diagrama de sequência ───
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4 * 60 * 1000);

    try {
      const res = await fetch(`${BASE_API_URL}/chat/stream`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BACKEND_API_KEY}`,
        },
        body: JSON.stringify({
          threadId: currentThreadId,
          message,
          assistantName: selectedAgent,
        }),
      });

      if (!res.ok || !res.body) {
        onError("Erro na conexão com o servidor.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events are delimited by double newlines (\n\n).
        // Splitting on \n\n ensures event type + data are always
        // processed as an atomic unit, even when a long data line
        // (e.g. the "done" event with full response content) is
        // split across multiple network chunks.
        const parts = buffer.split("\n\n");
        // Last part may be incomplete — keep it in buffer
        buffer = parts.pop() || "";

        for (const rawEvent of parts) {
          if (!rawEvent.trim()) continue;

          let eventType = "";
          let eventData = "";

          for (const line of rawEvent.split("\n")) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              eventData = line.slice(6);
            }
          }

          if (!eventType || !eventData) continue;

          try {
            const data = JSON.parse(eventData);
            switch (eventType) {
              case "status":
                onStatus(data.detail || "");
                break;
              case "token":
                onToken(data.text || "");
                break;
              case "done":
                onDone({
                  content: data.content || "",
                  chat_id: data.chat_id ?? null,
                  was_fallback: data.was_fallback || false,
                });
                break;
              case "fallback":
                onFallback(data.content || "", data.reason || "");
                break;
              case "error":
                onError(data.detail || "Erro desconhecido.");
                break;
            }
          } catch (e) {
            console.warn("[SSE] Falha ao processar evento:", eventType, e);
          }
        }
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        onError("A requisição expirou (timeout de 4 minutos). Tente novamente.");
      } else {
        // Para erros de conexão (não timeout), NÃO chamar onError.
        // Deixar o safety net em handleSend tentar o fallback ou
        // aguardar a resposta via user-events SSE (agent_message).
        console.warn("[ChatIA] Conexão SSE interrompida, tentando fallback...", err);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // Fallback: non-streaming fetch (used when SSE fails to connect)
  const fetchResponseFallback = async (
    message: string,
    currentThreadId: string
  ): Promise<{ content: string; chat_id: number | null } | null> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4 * 60 * 1000);
    try {
      const res = await axios.request({
        url: `${BASE_API_URL}/chat`,
        method: "POST",
        timeout: 0,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BACKEND_API_KEY}`,
        },
        data: JSON.stringify({
          threadId: currentThreadId,
          message,
          assistantName: selectedAgent,
        }),
      });
      if (res.status === 200) {
        const data = res.data;
        return {
          content: data?.content?.[0] ?? "",
          chat_id: data?.chat_id ?? null,
        };
      }
      return null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    setMessages((prev) => [...prev, { text, isUser: true, timestamp: new Date() }]);
    setInput("");
    setIsTyping(true);
    setStatusText("");
    setStreamingText("");

    let tid = threadId;
    if (!tid && threadError < 2) {
      await createNewThread();
      setThreadError((e) => e + 1);
      tid = threadId;
    }

    let accumulated = "";
    let finished = false;

    await fetchResponseStream(
      text,
      tid,
      // onToken - progressively build assistant response
      (token) => {
        accumulated += token;
        setStreamingText(accumulated);
      },
      // onStatus - show current processing stage
      (detail) => {
        setStatusText(detail);
      },
      // onDone - finalize the message
      (result) => {
        finished = true;
        setIsTyping(false);
        setStatusText("");
        setStreamingText("");
        if (result.content) {
          setMessages((prev) => [
            ...prev,
            {
              text: cleanText(result.content),
              isUser: false,
              id: result.chat_id || undefined,
              timestamp: new Date(),
            },
          ]);
        }
      },
      // onFallback - OpenAI failed, show NotebookLM raw response
      (content, reason) => {
        finished = true;
        setIsTyping(false);
        setStatusText("");
        setStreamingText("");
        setMessages((prev) => [
          ...prev,
          {
            text: content,
            isUser: false,
            timestamp: new Date(),
          },
        ]);
      },
      // onError - something went wrong
      (detail) => {
        if (!finished) {
          finished = true;
          setIsTyping(false);
          setStatusText("");
          setStreamingText("");
          setMessages((prev) => [
            ...prev,
            {
              text: detail || "Desculpe, não consegui processar isso. Tente novamente.",
              isUser: false,
              timestamp: new Date(),
            },
          ]);
        }
      },
    );

    // Safety net: if no done/fallback/error event was received
    if (!finished) {
      setIsTyping(false);
      setStatusText("");
      if (accumulated) {
        // We got tokens but no done event - show what we have
        setStreamingText("");
        setMessages((prev) => [
          ...prev,
          { text: cleanText(accumulated), isUser: false, timestamp: new Date() },
        ]);
      } else {
        // Total failure - try fallback non-streaming endpoint
        setStatusText("Tentando conexão alternativa...");
        setIsTyping(true);
        const reply = await fetchResponseFallback(text, tid);
        setIsTyping(false);
        setStatusText("");
        if (reply && reply.content) {
          setMessages((prev) => [
            ...prev,
            { text: cleanText(reply.content), isUser: false, id: reply.chat_id || undefined, timestamp: new Date() },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { text: "Desculpe, não consegui processar isso. Tente novamente.", isUser: false, timestamp: new Date() },
          ]);
        }
      }
    }
  };

  const cleanText = (text: string) => {
    const patterns = [/,\s*:\n/g, /,\s*:\s/g, /,\s*:/g, /-\s*:/g];
    let t = text;
    patterns.forEach((p) => (t = t.replace(p, "")));
    t = t.replace(/ +/g, " ").trim();
    return t;
  };

  const handleMessageFeedback = async (chatId: number, thumb: number, text?: string) => {
    try {
      await axios.put(
        `${BASE_API_URL}/chat/${chatId}/feedback`,
        { thumb, text },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${BACKEND_API_KEY}`,
          },
        }
      );
      setMessages((prev) =>
        prev.map((m) =>
          m.id === chatId
            ? { ...m, feedback_thumb: thumb, feedback_text: text || m.feedback_text }
            : m
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  const openFeedbackDialog = (chatId: number) => {
    const msg = messages.find(m => m.id === chatId);
    setFeedbackDialogChatId(chatId);
    setFeedbackDialogText(msg?.feedback_text || "");
    setFeedbackDialogOpen(true);
  };

  const submitFeedbackDialog = () => {
    if (feedbackDialogChatId) {
      handleMessageFeedback(feedbackDialogChatId, -1, feedbackDialogText);
    }
    setFeedbackDialogOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const chatWidth = isExpanded ? "calc(100vw - 32px)" : isSmall ? "calc(100vw - 24px)" : 380;
  const chatHeight = isExpanded ? "calc(100vh - 32px)" : isSmall ? "70vh" : 560;
  const rightOffset = isExpanded ? 16 : isSmall ? 8 : 24;
  const bottomOffset = isExpanded ? 16 : isSmall ? 132 : 144;

  return (
    <>
      <Tooltip title="Assistente IA" placement="left">
        <Fab
          aria-label="assistente ia"
          onClick={handleOpen}
          size={isSmall ? "small" : "medium"}
          sx={{
            position: "fixed",
            bottom: isSmall ? 76 : 84,
            right: { xs: 8, md: 24 },
            zIndex: 1000,
            background: "linear-gradient(135deg, var(--accent, #bd4140) 0%, var(--accent-hover, #a03534) 100%)",
            color: "#fff",
            animation: open ? "none" : `${pulseIA} 2.4s infinite`,
            "&:hover": {
              background: "linear-gradient(135deg, var(--accent-hover, #a03534) 0%, #8a2b29 100%)",
              animation: "none",
            },
          }}
        >
          <AutoAwesomeIcon />
        </Fab>
      </Tooltip>

      {open && (
        <Paper
          elevation={12}
          sx={{
            position: "fixed",
            bottom: bottomOffset,
            right: rightOffset,
            width: chatWidth,
            height: chatHeight,
            zIndex: 1300,
            borderRadius: isExpanded ? 2 : 3,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            animation: `${fadeInUp} 0.25s ease-out`,
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "0 24px 64px rgba(189, 65, 64, 0.25)",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              background: "linear-gradient(135deg, var(--accent, #bd4140) 0%, var(--accent-hover, #a03534) 100%)",
              px: 2,
              py: 1.5,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexShrink: 0,
            }}
          >
            {activeAgent?.logo_base64 && (
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: "10px",
                  bgcolor: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  flexShrink: 0,
                  p: 0.3,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                }}
              >
                <Box
                  component="img"
                  src={activeAgent.logo_base64}
                  alt={activeAgent.title}
                  sx={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </Box>
            )}
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{ color: "#fff", fontWeight: 700, lineHeight: 1.2 }}
              >
                {activeAgent ? activeAgent.title : "Assistente IA"}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "rgba(255,255,255,0.8)" }}
              >
                {selectedAgent ? `Agente: ${selectedAgent}` : "Selecione um Agente"}
              </Typography>
            </Box>

            <Tooltip title="Histórico de Conversas">
              <IconButton size="small" onClick={showHistory ? () => setShowHistory(false) : handleOpenHistory} sx={{ color: "#fff" }}>
                <svg width="22" height="22" viewBox="0 0 33 31" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: "middle" }}>
                  <path d="M10.5063 11.0772H23.3554M13.375 16.7229L23.3556 16.7229M10.5064 21.5L19.4646 21.5M24.8547 27.2726C27.3136 25.7263 29.2301 23.5286 30.3618 20.9572C31.4935 18.3859 31.7896 15.5565 31.2127 12.8268C30.6357 10.097 29.2117 7.58964 27.1205 5.62162C25.0294 3.65361 22.3651 2.31337 19.4646 1.7704C16.5641 1.22742 13.5576 1.5061 10.8254 2.57118C8.09319 3.63626 5.75792 5.43992 4.11492 7.75406C1.09687 12.0049 1.59681 16.2692 2.60968 18.9463C3.43858 21.1371 2.17978 23.8378 1.59687 25.8882C1.46773 26.3416 1.46771 26.8191 1.59681 27.2726C1.7259 27.7261 1.97957 28.1396 2.33231 28.4716C2.68505 28.8035 3.12443 29.0423 3.60628 29.1638C4.08813 29.2853 4.59548 29.2852 5.07732 29.1637C7.25594 28.6151 10.2409 27.1751 12.4535 28.2128C16.7246 30.2134 20.7267 29.8684 24.8547 27.2726Z" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </IconButton>
            </Tooltip>

            <Tooltip title="Novo Chat">
              <IconButton size="small" onClick={handleReset} sx={{ color: "#fff" }}>
                <svg width="22" height="22" viewBox="0 0 33 31" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: "middle" }}>
                  <path d="M10.5636 15.5574H23.4364M17 9.5V21.6149M24.8547 27.2726C27.3136 25.7263 29.2301 23.5286 30.3618 20.9572C31.4935 18.3859 31.7896 15.5565 31.2127 12.8268C30.6357 10.097 29.2117 7.58964 27.1205 5.62162C25.0294 3.65361 22.3651 2.31337 19.4646 1.7704C16.5641 1.22742 13.5576 1.5061 10.8254 2.57118C8.09319 3.63626 5.75792 5.43992 4.11492 7.75406C1.09687 12.0049 1.59681 16.2692 2.60968 18.9463C3.43858 21.1371 2.17978 23.8378 1.59687 25.8882C1.46773 26.3416 1.46771 26.8191 1.59681 27.2726C1.7259 27.7261 1.97957 28.1396 2.33231 28.4716C2.68505 28.8035 3.12443 29.0423 3.60628 29.1638C4.08813 29.2853 4.59548 29.2852 5.07732 29.1637C7.25594 28.6151 10.2409 27.1751 12.4535 28.2128C16.7246 30.2134 20.7267 29.8684 24.8547 27.2726Z" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </IconButton>
            </Tooltip>

            <Tooltip title={isExpanded ? "Recolher" : "Expandir"}>
              <IconButton
                size="small"
                onClick={() => setIsExpanded((v) => !v)}
                sx={{ color: "#fff" }}
              >
                {isExpanded ? (
                  <CloseFullscreenIcon fontSize="small" />
                ) : (
                  <OpenInFullIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>

            <Tooltip title="Fechar">
              <IconButton
                size="small"
                onClick={() => setOpen(false)}
                sx={{ color: "#fff" }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          {showConsent ? (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                p: 3,
                gap: 2,
                bgcolor: "var(--bg-card)",
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, var(--accent, #bd4140) 0%, var(--accent-hover, #a03534) 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <SmartToyIcon sx={{ color: "#fff", fontSize: 32 }} />
              </Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, textAlign: "center", color: "var(--text-primary)" }}
              >
                Aviso de Privacidade e IA
              </Typography>
              <Typography
                variant="body2"
                sx={{ textAlign: "center", color: "#6b7280" }}
              >
                Este assistente utiliza inteligência artificial fornecida pela
                OpenAI. Suas mensagens serão enviadas para processamento. Seus
                dados{" "}
                <strong>não</strong> são usados para treinar modelos da OpenAI.
              </Typography>
              <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                <Box
                  component="button"
                  onClick={handleDeclineConsent}
                  sx={{
                    border: "1px solid #e0e0e0",
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    cursor: "pointer",
                    bgcolor: "transparent",
                    color: "#ef4444",
                    fontWeight: 600,
                    fontSize: 14,
                    "&:hover": { bgcolor: "#fef2f2" },
                  }}
                >
                  Não aceito
                </Box>
                <Box
                  component="button"
                  onClick={handleAcceptConsent}
                  sx={{
                    border: "none",
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    cursor: "pointer",
                    background:
                      "linear-gradient(135deg, var(--accent, #bd4140) 0%, var(--accent-hover, #a03534) 100%)",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 14,
                    "&:hover": { opacity: 0.9 },
                  }}
                >
                  Aceito
                </Box>
              </Box>
            </Box>
          ) : showHistory ? (
            <Box
              onScroll={handleScrollHistory}
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                p: 3,
                gap: 1.5,
                bgcolor: "var(--bg-card)",
                overflowY: "auto",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", mb: 1, gap: 1 }}>
                <HistoryIcon sx={{ color: "var(--accent, #bd4140)" }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--text-primary)" }}>
                  Histórico de Conversas
                </Typography>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {history.map((t, idx) => (
                  <Box
                    key={t.thread_id}
                    onClick={() => handleSelectHistoryThread(t.thread_id, t.agent_name)}
                    sx={{
                      textTransform: "none",
                      justifyContent: "flex-start",
                      textAlign: "left",
                      py: 1.5,
                      px: 2,
                      borderRadius: 2,
                      borderColor: "#e8eaff",
                      color: "var(--text-primary)",
                      bgcolor: "var(--bg-surface)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      "&:hover": { borderColor: "var(--accent, #bd4140)", bgcolor: "var(--bg-hover)",
                        "& .delete-btn": { opacity: 1 }
                      }
                    }}
                  >
                    <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {t.subject}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "var(--accent, #bd4140)", fontWeight: 500, mt: 0.5 }}>
                        {t.agent_title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#6b7280", mt: 0.5 }}>
                        {new Date(t.created_at).toLocaleString("pt-BR")}
                      </Typography>
                    </Box>
                    <Tooltip title="Excluir conversa">
                      <IconButton
                        className="delete-btn"
                        size="small"
                        onClick={(e) => handleDeleteThread(e, t.thread_id)}
                        sx={{
                          opacity: 0,
                          transition: "opacity 0.2s",
                          color: "#ef4444",
                          flexShrink: 0,
                          "&:hover": { bgcolor: "#fef2f2" }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Box>
              {loadingHistory && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              )}
              {!loadingHistory && history.length === 0 && (
                <Typography variant="body2" sx={{ textAlign: "center", color: "#6b7280", mt: 4 }}>
                  Nenhum histórico encontrado.
                </Typography>
              )}
            </Box>

          ) : showAgentSelection ? (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                p: 2,
                gap: 1.25,
                bgcolor: "var(--bg-card)",
                minHeight: 0,
                overflowY: "auto",
                "&::-webkit-scrollbar": { width: 4 },
                "&::-webkit-scrollbar-thumb": {
                  bgcolor: "#e5908e",
                  borderRadius: 2,
                },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  mb: 0.5,
                  flexShrink: 0,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}
                >
                  Escolha o assistente para conversar:
                </Typography>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, flex: 1, minHeight: 0 }}>
                {agents.length === 0 ? (
                  <LinearProgress sx={{ mt: 2 }} />
                ) : (
                  agents.map((agent) => (
                    <Button
                      key={agent.id}
                      onClick={() => handleSelectAgent(agent.name)}
                      sx={{
                        textTransform: "none",
                        justifyContent: "flex-start",
                        textAlign: "left",
                        py: 1.25,
                        px: 1.75,
                        minHeight: 56,
                        borderRadius: "14px",
                        border: "1px solid",
                        borderColor: "var(--border, #2d3352)",
                        color: "var(--text-primary, #f1f5f9)",
                        bgcolor: "var(--bg-surface, #1a1d27)",
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        "&:hover": {
                          borderColor: "var(--accent, #bd4140)",
                          bgcolor: "rgba(189,65,64,0.12)",
                          boxShadow: "0 4px 12px rgba(189,65,64,0.15)",
                          transform: "translateY(-1px)",
                        },
                      }}
                    >
                      {/* Thumbnail Logo estilo Minimal Dashboard */}
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: "10px",
                          background: agent.logo_base64
                            ? "#ffffff"
                            : "linear-gradient(135deg, var(--accent, #bd4140) 0%, var(--accent-hover, #a03534) 100%)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          overflow: "hidden",
                        }}
                      >
                        {agent.logo_base64 ? (
                          <Box
                            component="img"
                            src={agent.logo_base64}
                            alt={agent.title}
                            sx={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                              p: 0.25,
                            }}
                          />
                        ) : (
                          <SmartToyIcon sx={{ color: "#fff", fontSize: 20 }} />
                        )}
                      </Box>
                      <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 600,
                            fontSize: 14,
                            lineHeight: 1.35,
                            color: "var(--text-primary, #f1f5f9)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {agent.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "var(--text-secondary, #94a3b8)", fontSize: 11.5, mt: 0.25 }}
                        >
                          Agente: {agent.name}
                        </Typography>
                      </Box>
                    </Button>
                  ))
                )}
              </Box>
            </Box>
          ) : (
            <>
              <Box
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  p: 2,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  bgcolor: "var(--bg-card)",
                  "&::-webkit-scrollbar": { width: 4 },
                  "&::-webkit-scrollbar-thumb": {
                    bgcolor: "#e5908e",
                    borderRadius: 2,
                  },
                }}
              >
                {messages.length === 0 && (
                  <Box
                    sx={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1.5,
                      py: 4,
                    }}
                  >
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background:
                          "linear-gradient(135deg, var(--accent, #bd4140) 0%, var(--accent-hover, #a03534) 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <SmartToyIcon sx={{ color: "#fff", fontSize: 32 }} />
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700, color: "var(--text-primary)" }}
                    >
                      Assistente IA
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "#6b7280", textAlign: "center" }}
                    >
                      Como posso ajudar você hoje?
                    </Typography>
                  </Box>
                )}

                {messages.map((msg, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: "flex",
                      justifyContent: msg.isUser ? "flex-end" : "flex-start",
                      alignItems: "flex-end",
                      gap: 1,
                    }}
                  >
                    {!msg.isUser && (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 0.25,
                          flexShrink: 0,
                        }}
                      >
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: msg.isAuditor
                              ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                              : activeAgent?.logo_base64
                                ? "#ffffff"
                                : "linear-gradient(135deg, var(--accent, #bd4140) 0%, var(--accent-hover, #a03534) 100%)",
                            border: activeAgent?.logo_base64 && !msg.isAuditor ? "1px solid #e2e8f0" : "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: msg.isAuditor && msg.auditor_icon_svg ? "hidden" : activeAgent?.logo_base64 ? "hidden" : undefined,
                          }}
                          {...(msg.isAuditor && msg.auditor_icon_svg
                            ? { dangerouslySetInnerHTML: { __html: msg.auditor_icon_svg } }
                            : {})}
                        >
                          {!(msg.isAuditor && msg.auditor_icon_svg) && (
                            msg.isAuditor ? (
                              <SupportAgentIcon sx={{ color: "#fff", fontSize: 15 }} />
                            ) : activeAgent?.logo_base64 ? (
                              <Box
                                component="img"
                                src={activeAgent.logo_base64}
                                alt="Agente logo"
                                sx={{ width: "100%", height: "100%", objectFit: "contain", p: 0.25 }}
                              />
                            ) : (
                              <SmartToyIcon sx={{ color: "#fff", fontSize: 15 }} />
                            )
                          )}
                        </Box>
                        {msg.isAuditor && (
                          <Typography
                            sx={{
                              fontSize: 9,
                              color: "#fff",
                              lineHeight: 1,
                              maxWidth: 40,
                              textAlign: "center",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                            }}
                          >
                            {msg.auditor_nickname || "Suporte"}
                          </Typography>
                        )}
                      </Box>
                    )}
                    <Box
                      sx={{
                        maxWidth: "75%",
                        px: 2,
                        py: 1,
                        borderRadius: msg.isUser
                          ? "18px 18px 4px 18px"
                          : "18px 18px 18px 4px",
                        background: msg.isUser
                          ? "linear-gradient(135deg, var(--accent, #bd4140) 0%, var(--accent-hover, #a03534) 100%)"
                          : msg.isAuditor
                            ? "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)"
                            : "var(--bg-hover)",
                        color: msg.isUser ? "#fff" : msg.isAuditor ? "#92400e" : "var(--text-primary)",
                        border: msg.isAuditor ? "1px solid #f59e0b" : "none",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                        fontSize: 14,
                        lineHeight: 1.5,
                        wordBreak: "break-word",
                        "& p": { margin: 0, lineHeight: 1.6 },
                        "& p + p": { mt: 0.5 },
                        "& strong": { fontWeight: 700 },
                        "& em": { fontStyle: "italic" },
                        "& ul, & ol": { pl: 2.5, mt: 0.5, mb: 0.5 },
                        "& li": { mb: 0.25 },
                        "& code": {
                          fontFamily: "monospace",
                          fontSize: 12,
                          bgcolor: msg.isUser ? "rgba(255,255,255,0.2)" : "#f3f4f6",
                          color: msg.isUser ? "#fff" : "var(--accent, #bd4140)",
                          px: 0.6,
                          py: 0.2,
                          borderRadius: 1,
                        },
                        "& pre": {
                          bgcolor: msg.isUser ? "rgba(0,0,0,0.2)" : "#f3f4f6",
                          borderRadius: 1,
                          p: 1,
                          overflowX: "auto",
                          mt: 0.5,
                          mb: 0.5,
                          "& code": { bgcolor: "transparent", p: 0 },
                        },
                        "& blockquote": {
                          borderLeft: msg.isUser ? "3px solid rgba(255,255,255,0.5)" : "3px solid var(--accent, #bd4140)",
                          pl: 1.5,
                          ml: 0,
                          my: 0.5,
                          opacity: 0.85,
                        },
                        "& h1, & h2, & h3": { mt: 0.5, mb: 0.25, fontWeight: 700, lineHeight: 1.3 },
                        "& a": { color: msg.isUser ? "#f5d5d4" : "var(--accent, #bd4140)", textDecoration: "underline" },
                        "& hr": { border: "none", borderTop: "1px solid rgba(0,0,0,0.1)", my: 1 },
                      }}
                    >
                      {msg.isUser ? (
                        msg.text
                      ) : (
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      )}

                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: 1.5,
                          mt: 1,
                          pt: 0.5,
                          borderTop: msg.isUser
                            ? "1px solid rgba(255, 255, 255, 0.15)"
                            : "1px solid rgba(0, 0, 0, 0.06)",
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: "10px",
                            opacity: 0.7,
                            color: msg.isUser
                              ? "rgba(255,255,255,0.85)"
                              : msg.isAuditor
                                ? "#92400e"
                                : "var(--text-secondary)",
                            fontFamily: "monospace",
                          }}
                        >
                          {formatDateTimePtBr(msg.timestamp || new Date())}
                        </Typography>

                        {!msg.isUser && msg.id && (
                          <Box sx={{ display: "flex", gap: 0.5 }}>
                            <Tooltip title="Copiar">
                              <IconButton size="small" onClick={() => navigator.clipboard.writeText(msg.text)} sx={{ p: 0.5, color: "#9ca3af", "&:hover": { color: "var(--accent, #bd4140)", bgcolor: "rgba(189, 65, 64, 0.1)" }}}>
                                <ContentCopyIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Gostei">
                              <IconButton size="small" onClick={() => handleMessageFeedback(msg.id!, 1)} sx={{ p: 0.5, color: msg.feedback_thumb === 1 ? "#10b981" : "#9ca3af", "&:hover": { color: "#10b981", bgcolor: "rgba(16,185,129,0.1)" }}}>
                                {msg.feedback_thumb === 1 ? <ThumbUpIcon sx={{ fontSize: 14 }} /> : <ThumbUpOutlinedIcon sx={{ fontSize: 14 }} />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Não Gostei">
                              <IconButton size="small" onClick={() => openFeedbackDialog(msg.id!)} sx={{ p: 0.5, color: msg.feedback_thumb === -1 ? "#ef4444" : "#9ca3af", "&:hover": { color: "#ef4444", bgcolor: "rgba(239,68,68,0.1)" }}}>
                                {msg.feedback_thumb === -1 ? <ThumbDownIcon sx={{ fontSize: 14 }} /> : <ThumbDownOutlinedIcon sx={{ fontSize: 14 }} />}
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>
                ))}

                {/* Streaming preview - shows tokens as they arrive */}
                {isTyping && streamingText && (
                  <Box sx={{ display: "flex", justifyContent: "flex-start", alignItems: "flex-end", gap: 1 }}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, var(--accent, #bd4140) 0%, var(--accent-hover, #a03534) 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <SmartToyIcon sx={{ color: "#fff", fontSize: 15 }} />
                    </Box>
                    <Box
                      sx={{
                        maxWidth: "75%",
                        px: 2,
                        py: 1,
                        borderRadius: "18px 18px 18px 4px",
                        background: "var(--bg-hover)",
                        color: "var(--text-primary)",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                        fontSize: 14,
                        lineHeight: 1.5,
                        wordBreak: "break-word",
                        "& p": { margin: 0, lineHeight: 1.6 },
                        "& p + p": { mt: 0.5 },
                        "& strong": { fontWeight: 700 },
                        "& em": { fontStyle: "italic" },
                        "& ul, & ol": { pl: 2.5, mt: 0.5, mb: 0.5 },
                        "& li": { mb: 0.25 },
                        "& code": {
                          fontFamily: "monospace",
                          fontSize: 12,
                          bgcolor: "#f3f4f6",
                          color: "var(--accent, #bd4140)",
                          px: 0.6,
                          py: 0.2,
                          borderRadius: 1,
                        },
                        "& pre": {
                          bgcolor: "#f3f4f6",
                          borderRadius: 1,
                          p: 1,
                          overflowX: "auto",
                          mt: 0.5,
                          mb: 0.5,
                          "& code": { bgcolor: "transparent", p: 0 },
                        },
                        "& blockquote": {
                          borderLeft: "3px solid var(--accent, #bd4140)",
                          pl: 1.5,
                          ml: 0,
                          my: 0.5,
                          opacity: 0.85,
                        },
                        "& h1, & h2, & h3": { mt: 0.5, mb: 0.25, fontWeight: 700, lineHeight: 1.3 },
                        "& a": { color: "var(--accent, #bd4140)", textDecoration: "underline" },
                        "& hr": { border: "none", borderTop: "1px solid rgba(0,0,0,0.1)", my: 1 },
                      }}
                    >
                      <ReactMarkdown>{streamingText}</ReactMarkdown>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          mt: 1,
                          pt: 0.5,
                          borderTop: "1px solid rgba(0, 0, 0, 0.06)",
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: "10px",
                            opacity: 0.7,
                            color: "var(--text-secondary)",
                            fontFamily: "monospace",
                          }}
                        >
                          {formatDateTimePtBr(new Date())}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}

                {/* Typing indicator with status text */}
                {isTyping && (
                  <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
                    {!streamingText && (
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background:
                            "linear-gradient(135deg, var(--accent, #bd4140) 0%, var(--accent-hover, #a03534) 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <SmartToyIcon sx={{ color: "#fff", fontSize: 15 }} />
                      </Box>
                    )}
                    <Box
                      sx={{
                        px: 2,
                        py: 1.2,
                        bgcolor: "var(--bg-surface)",
                        borderRadius: "18px 18px 18px 4px",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                        display: "flex",
                        gap: 0.5,
                        alignItems: "center",
                      }}
                    >
                      {[0, 1, 2].map((d) => (
                        <Box
                          key={d}
                          sx={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            bgcolor: "var(--accent, #bd4140)",
                            animation: `${dotBounce} 1.2s ease-in-out ${d * 0.2}s infinite`,
                          }}
                        />
                      ))}
                      {statusText && (
                        <Typography
                          variant="caption"
                          sx={{
                            ml: 1,
                            color: "#9ca3af",
                            fontSize: 11,
                            fontStyle: "italic",
                            whiteSpace: "nowrap",
                            animation: `${fadeInUp} 0.3s ease-out`,
                          }}
                        >
                          {statusText}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}
                <div ref={bottomRef} />
              </Box>

              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  bgcolor: "var(--bg-surface)",
                  borderTop: "1px solid #e8eaff",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexShrink: 0,
                }}
              >
                <TextField
                  inputRef={inputRef}
                  fullWidth
                  size="small"
                  placeholder="Mensagem..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  multiline
                  maxRows={3}
                  disabled={isTyping}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 3,
                      fontSize: 14,
                      color: "#fff",
                      bgcolor: "var(--bg-surface)",
                      "& fieldset": { borderColor: "#e8eaff" },
                      "&:hover fieldset": { borderColor: "var(--accent, #bd4140)" },
                      "&.Mui-focused fieldset": { borderColor: "var(--accent, #bd4140)" },
                      "&.Mui-disabled fieldset": { borderColor: "#e8eaff" },
                    },
                    "& .MuiInputBase-input::placeholder": {
                      color: "#9ca3af",
                      opacity: 1,
                    },
                    "& .MuiInputBase-input.Mui-disabled": {
                      WebkitTextFillColor: "#fff",
                    },
                  }}
                />
                <IconButton
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  sx={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    background:
                      !input.trim() || isTyping
                        ? "#e0e0e0"
                        : "linear-gradient(135deg, var(--accent, #bd4140) 0%, var(--accent-hover, #a03534) 100%)",
                    color: "#fff",
                    "&:hover": {
                      background:
                        !input.trim() || isTyping
                          ? "#e0e0e0"
                          : "linear-gradient(135deg, var(--accent-hover, #a03534) 0%, #8a2b29 100%)",
                    },
                  }}
                >
                  {isTyping ? (
                    <CircularProgress size={18} sx={{ color: "var(--accent, #bd4140)" }} />
                  ) : (
                    <SendIcon fontSize="small" />
                  )}
                </IconButton>
              </Box>

              {/* Footer - Rating + Disclaimer */}
              {messages.length > 1 && (
                <Box
                  sx={{
                    bgcolor: "var(--bg-surface)",
                    py: 0.5,
                    px: 2,
                    borderTop: "1px solid #f0f0f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.5,
                    flexShrink: 0,
                  }}
                >
                  <Typography variant="caption" sx={{ color: "#9ca3af", mr: 0.5 }}>
                    {feedbackSent ? "Obrigado!" : "Avalie:"}
                  </Typography>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <IconButton
                      key={star}
                      size="small"
                      onClick={() => sendFeedback(star)}
                      disabled={feedbackSent}
                      sx={{ p: 0, minWidth: 0 }}
                    >
                      {star <= feedbackRating ? (
                        <StarIcon sx={{ fontSize: 16, color: "#f59e0b" }} />
                      ) : (
                        <StarBorderIcon sx={{ fontSize: 16, color: "#d1d5db" }} />
                      )}
                    </IconButton>
                  ))}
                </Box>
              )}
              <Box
                sx={{
                  bgcolor: "var(--bg-surface)",
                  py: 0.5,
                  textAlign: "center",
                  borderTop: "1px solid #f0f0f0",
                  flexShrink: 0,
                }}
              >
                <Typography variant="caption" sx={{ color: "#9ca3af" }}>
                  O Assistente de IA pode cometer erros.
                </Typography>
              </Box>
            </>
          )}
        </Paper>
      )}

      <Dialog open={feedbackDialogOpen} onClose={() => setFeedbackDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: "var(--text-primary)" }}>Como podemos melhorar?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "#6b7280", mb: 2 }}>
            Sua opinião é fundamental. Por favor, conte-nos por que essa resposta não foi útil.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Seu feedback"
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={feedbackDialogText}
            onChange={(e) => setFeedbackDialogText(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setFeedbackDialogOpen(false)} sx={{ color: "#6b7280" }}>Cancelar</Button>
          <Button onClick={submitFeedbackDialog} variant="contained" sx={{ background: "linear-gradient(135deg, var(--accent, #bd4140) 0%, var(--accent-hover, #a03534) 100%)" }}>Enviar Feedback</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
export default ChatIA;
