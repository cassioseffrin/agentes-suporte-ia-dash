"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  CircularProgress,
  Tooltip,
  Chip,
  InputAdornment,
  keyframes,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import StarIcon from "@mui/icons-material/Star";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SendIcon from "@mui/icons-material/Send";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import QuizIcon from "@mui/icons-material/Quiz";
import ReactMarkdown from "react-markdown";
import axios from "axios";
import { useAuditor } from "../context/AuditorContext";

const BASE_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://assistant.arpasistemas.com.br";
const BACKEND_API_KEY = process.env.NEXT_PUBLIC_BACKEND_API_KEY || "";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const pulseOnline = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6); }
  70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
`;

interface ThreadItem {
  thread_id: string;
  subject: string;
  agent_name: string;
  agent_title: string;
  user_name: string;
  user_email: string;
  created_at: string;
  message_count: number;
  feedback_rating: number | null;
  has_auditor?: boolean;
}

interface ChatMessage {
  id: number;
  role: string;
  content: string;
  feedback_thumb?: number | null;
  feedback_text?: string | null;
  feedback_rating?: number | null;
  isAuditor?: boolean;
}

const PAGE_SIZE = 15;

// Helper: render auditor avatar (custom SVG or fallback icon)
function AuditorAvatar({ iconSvg, size = 32 }: { iconSvg?: string | null; size?: number }) {
  if (iconSvg) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        dangerouslySetInnerHTML={{ __html: iconSvg }}
      />
    );
  }
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <SupportAgentIcon sx={{ color: "#fff", fontSize: size * 0.53 }} />
    </Box>
  );
}

export default function ChatAuditList() {
  const { auditor } = useAuditor();
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [auditorOnly, setAuditorOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  // Audit view state
  const [selectedThread, setSelectedThread] = useState<ThreadItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const presenceRef = useRef<EventSource | null>(null);

  // Auditor messaging state
  const [auditorInput, setAuditorInput] = useState("");
  const [isUserOnline, setIsUserOnline] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // FAQ state
  const [faqStatus, setFaqStatus] = useState<{ faq_added: boolean; has_auditor: boolean } | null>(null);
  const [faqLoading, setFaqLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({ open: false, message: "", severity: "info" });

  const fetchThreads = useCallback(
    async (p: number, q: string, auditor_only: boolean) => {
      setLoading(true);
      try {
        const res = await axios.get(`${BASE_API_URL}/admin/threads`, {
          params: { page: p, limit: PAGE_SIZE, search: q, auditor_only },
          headers: { Authorization: `Bearer ${BACKEND_API_KEY}` },
        });
        if (res.status === 200) {
          setThreads(res.data.threads || []);
          setTotal(res.data.total || 0);
          setPages(res.data.pages || 1);
        }
      } catch (e) {
        console.error("Erro ao buscar threads:", e);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchThreads(page, search, auditorOnly);
  }, [page, search, auditorOnly, fetchThreads]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1);
      setSearch(value);
    }, 400);
  };

  const handleSelectThread = async (thread: ThreadItem) => {
    setSelectedThread(thread);
    setLoadingMessages(true);
    try {
      const res = await axios.get(
        `${BASE_API_URL}/thread/${thread.thread_id}/messages`,
        { headers: { Authorization: `Bearer ${BACKEND_API_KEY}` } }
      );
      if (res.status === 200) {
        setMessages(res.data.messages || []);
      }
    } catch (e) {
      console.error("Erro ao buscar mensagens:", e);
    } finally {
      setLoadingMessages(false);
    }

    // Buscar status de FAQ da thread
    try {
      const faqRes = await axios.get(
        `${BASE_API_URL}/thread/${thread.thread_id}/faq-status`,
        { headers: { Authorization: `Bearer ${BACKEND_API_KEY}` } }
      );
      if (faqRes.status === 200) {
        setFaqStatus(faqRes.data);
      }
    } catch (e) {
      console.error("Erro ao buscar status FAQ:", e);
      setFaqStatus(null);
    }
  };

  const handleBack = () => {
    setSelectedThread(null);
    setMessages([]);
    setAuditorInput("");
    setIsUserOnline(false);
    setFaqStatus(null);
    setFaqLoading(false);
    // Fechar SSE de presença
    if (presenceRef.current) {
      presenceRef.current.close();
      presenceRef.current = null;
    }
  };

  // --- Conectar ao SSE de presença quando uma thread é selecionada ---
  useEffect(() => {
    if (!selectedThread) return;

    // Fechar conexão anterior
    if (presenceRef.current) {
      presenceRef.current.close();
    }

    const es = new EventSource(
      `${BASE_API_URL}/thread/${selectedThread.thread_id}/presence`
    );
    presenceRef.current = es;

    es.addEventListener("presence", (e) => {
      try {
        const data = JSON.parse(e.data);
        setIsUserOnline(data.online === true);
      } catch {}
    });

    es.addEventListener("auditor_message_sent", (e) => {
      try {
        const data = JSON.parse(e.data);
        // Adicionar confirmação visual da mensagem enviada
        setMessages((prev) => [
          ...prev,
          {
            id: data.chat_id,
            role: "auditor",
            content: data.message,
            isAuditor: true,
          },
        ]);
      } catch {}
    });

    es.addEventListener("new_message", (e) => {
      try {
        const data = JSON.parse(e.data);
        setMessages((prev) => {
          // Evitar duplicatas (se a mensagem já existe pelo id)
          if (data.chat_id && prev.some((m) => m.id === data.chat_id)) {
            return prev;
          }
          return [
            ...prev,
            {
              id: data.chat_id || Date.now(),
              role: data.role,
              content: data.message,
              isAuditor: data.role === "auditor",
            },
          ];
        });
      } catch {}
    });

    es.onerror = () => {
      console.warn("[presence] SSE desconectado");
    };

    return () => {
      es.close();
      presenceRef.current = null;
    };
  }, [selectedThread]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Enviar mensagem do auditor ---
  const handleSendAuditorMessage = async () => {
    const text = auditorInput.trim();
    if (!text || !selectedThread || sendingMessage) return;

    setSendingMessage(true);
    try {
      await axios.post(
        `${BASE_API_URL}/thread/${selectedThread.thread_id}/auditor-message`,
        {
          message: text,
          // Inclui auditor_id do usuário logado para rastreabilidade
          auditor_id: auditor?.id ?? null,
        },
        { headers: { Authorization: `Bearer ${BACKEND_API_KEY}` } }
      );
      setAuditorInput("");
    } catch (e) {
      console.error("Erro ao enviar mensagem do auditor:", e);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAuditorKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendAuditorMessage();
    }
  };

  // --- Adicionar a FAQ ---
  const handleAddToFaq = async () => {
    if (!selectedThread || faqLoading) return;
    setFaqLoading(true);
    try {
      const res = await axios.post(
        `${BASE_API_URL}/thread/${selectedThread.thread_id}/add-to-faq`,
        {},
        { headers: { Authorization: `Bearer ${BACKEND_API_KEY}` } }
      );
      if (res.status === 200) {
        setFaqStatus({ faq_added: true, has_auditor: true });
        setSnackbar({
          open: true,
          message: `FAQ gerada com sucesso para ${res.data.agent_title || "o agente"}!`,
          severity: "success",
        });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string }; status?: number } };
      const detail = err?.response?.data?.detail || "Erro ao gerar FAQ";
      const severity = err?.response?.status === 409 ? "info" : "error";
      setSnackbar({ open: true, message: detail, severity });
      if (err?.response?.status === 409) {
        setFaqStatus((prev) => prev ? { ...prev, faq_added: true } : prev);
      }
    } finally {
      setFaqLoading(false);
    }
  };

  const isFaqButtonEnabled = faqStatus !== null && faqStatus.has_auditor && !faqStatus.faq_added && !faqLoading;

  // ─── Fullscreen Audit View ───
  if (selectedThread) {
    return (
      <Box sx={{ animation: `${fadeIn} 0.3s ease`, minHeight: "70vh" }}>
        {/* Header bar */}
        <Box
          sx={{
            background: "linear-gradient(135deg, var(--accent, #bd4140) 0%, var(--accent-hover, #a03534) 100%)",
            borderRadius: "16px 16px 0 0",
            px: 3,
            py: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Button
            onClick={handleBack}
            startIcon={<ArrowBackIcon />}
            sx={{
              color: "var(--accent, #bd4140)",
              textTransform: "none",
              fontWeight: 700,
              bgcolor: "#fff",
              borderRadius: 2,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              "&:hover": { bgcolor: "#f8f9ff" },
              mr: 1,
              flexShrink: 0,
            }}
          >
            Voltar
          </Button>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              sx={{
                color: "#fff",
                fontWeight: 700,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {selectedThread.subject || "Sem assunto"}
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 0.5 }}>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)" }}>
                <PersonIcon sx={{ fontSize: 13, mr: 0.5, verticalAlign: "middle" }} />
                {selectedThread.user_name || selectedThread.user_email}
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)" }}>
                <SmartToyIcon sx={{ fontSize: 13, mr: 0.5, verticalAlign: "middle" }} />
                {selectedThread.agent_title}
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                {new Date(selectedThread.created_at).toLocaleString("pt-BR")}
              </Typography>
            </Box>
          </Box>
          {selectedThread.feedback_rating && (
            <Chip
              icon={<StarIcon sx={{ color: "#f59e0b !important", fontSize: 16 }} />}
              label={`${selectedThread.feedback_rating}/5`}
              size="small"
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                color: "#fff",
                fontWeight: 600,
                backdropFilter: "blur(8px)",
              }}
            />
          )}
          {/* Online/Offline indicator */}
          <Tooltip title={isUserOnline ? "Usuário online agora" : "Usuário offline"}>
            <Chip
              icon={
                <FiberManualRecordIcon
                  sx={{
                    fontSize: "12px !important",
                    color: isUserOnline ? "#10b981 !important" : "#9ca3af !important",
                    animation: isUserOnline ? `${pulseOnline} 2s infinite` : "none",
                  }}
                />
              }
              label={isUserOnline ? "Online" : "Offline"}
              size="small"
              sx={{
                bgcolor: isUserOnline ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.15)",
                color: "#fff",
                fontWeight: 600,
                backdropFilter: "blur(8px)",
                transition: "all 0.3s ease",
              }}
            />
          </Tooltip>
          {/* FAQ Button */}
          <Tooltip
            title={
              !faqStatus
                ? "Carregando status..."
                : faqStatus.faq_added
                  ? "FAQ já adicionada para esta conversa"
                  : !faqStatus.has_auditor
                    ? "Necessário interação do auditor para gerar FAQ"
                    : "Gerar FAQ a partir desta conversa"
            }
          >
            <span>
              <Button
                onClick={handleAddToFaq}
                disabled={!isFaqButtonEnabled}
                startIcon={
                  faqLoading ? (
                    <CircularProgress size={16} sx={{ color: "#fff" }} />
                  ) : (
                    <QuizIcon />
                  )
                }
                size="small"
                sx={{
                  color: faqStatus?.faq_added ? "#6b7280" : "#fff",
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: 12,
                  bgcolor: faqStatus?.faq_added
                    ? "rgba(255,255,255,0.15)"
                    : isFaqButtonEnabled
                      ? "rgba(16,185,129,0.85)"
                      : "rgba(255,255,255,0.15)",
                  borderRadius: 2,
                  px: 1.5,
                  backdropFilter: "blur(8px)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    bgcolor: isFaqButtonEnabled
                      ? "rgba(16,185,129,1)"
                      : "rgba(255,255,255,0.15)",
                  },
                  "&.Mui-disabled": {
                    color: "rgba(255,255,255,0.45)",
                  },
                }}
              >
                {faqLoading
                  ? "Gerando..."
                  : faqStatus?.faq_added
                    ? "FAQ Adicionada ✓"
                    : "Adicionar a FAQ"}
              </Button>
            </span>
          </Tooltip>
        </Box>

        {/* Messages area */}
        <Box
          sx={{
            bgcolor: "var(--bg-card)",
            borderRadius: "0 0 16px 16px",
            border: "1px solid var(--border, #e5e7eb)",
            borderTop: "none",
            p: 3,
            minHeight: 400,
            maxHeight: "calc(100vh - 340px)",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            "&::-webkit-scrollbar": { width: 6 },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "#e5908e",
              borderRadius: 3,
            },
          }}
        >
          {loadingMessages ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                py: 8,
              }}
            >
              <CircularProgress sx={{ color: "var(--accent, #bd4140)" }} />
            </Box>
          ) : messages.length === 0 ? (
            <Typography
              variant="body2"
              sx={{ textAlign: "center", color: "#9ca3af", py: 8 }}
            >
              Nenhuma mensagem encontrada nesta conversa.
            </Typography>
          ) : (
            messages.map((msg, i) => {
              const isUser = msg.role === "user";
              const isAuditor = msg.role === "auditor";
              return (
                <Box
                  key={msg.id || i}
                  sx={{
                    display: "flex",
                    justifyContent: isUser ? "flex-end" : "flex-start",
                    alignItems: "flex-end",
                    gap: 1,
                    animation: `${fadeIn} 0.2s ease ${i * 0.03}s both`,
                  }}
                >
                  {!isUser && (
                    isAuditor ? (
                      <AuditorAvatar iconSvg={auditor?.icon_svg} size={32} />
                    ) : (
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, var(--accent, #bd4140) 0%, var(--accent-hover, #a03534) 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <SmartToyIcon sx={{ color: "#fff", fontSize: 17 }} />
                      </Box>
                    )
                  )}
                  <Box sx={{ maxWidth: "75%", display: "flex", flexDirection: "column" }}>
                    <Box
                      sx={{
                        px: 2,
                        py: 1.2,
                        borderRadius: isUser
                          ? "18px 18px 4px 18px"
                          : "18px 18px 18px 4px",
                        background: isUser
                          ? "linear-gradient(135deg, var(--accent, #bd4140) 0%, var(--accent-hover, #a03534) 100%)"
                          : isAuditor
                            ? "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)"
                            : "var(--bg-hover)",
                        color: isUser ? "#fff" : isAuditor ? "#92400e" : "var(--text-primary)",
                        border: isAuditor ? "1px solid #f59e0b" : "none",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                        fontSize: 14,
                        lineHeight: 1.6,
                        wordBreak: "break-word",
                        "& p": { margin: 0, lineHeight: 1.6 },
                        "& p + p": { mt: 0.5 },
                        "& strong": { fontWeight: 700 },
                        "& ul, & ol": { pl: 2.5, mt: 0.5, mb: 0.5 },
                        "& li": { mb: 0.25 },
                        "& code": {
                          fontFamily: "monospace",
                          fontSize: 12,
                          bgcolor: isUser
                            ? "rgba(255,255,255,0.2)"
                            : "#f3f4f6",
                          color: isUser ? "#fff" : "var(--accent, #bd4140)",
                          px: 0.6,
                          py: 0.2,
                          borderRadius: 1,
                        },
                        "& pre": {
                          bgcolor: isUser
                            ? "rgba(0,0,0,0.2)"
                            : "#f3f4f6",
                          borderRadius: 1,
                          p: 1,
                          overflowX: "auto",
                          mt: 0.5,
                          mb: 0.5,
                          "& code": { bgcolor: "transparent", p: 0 },
                        },
                        "& blockquote": {
                          borderLeft: isUser
                            ? "3px solid rgba(255,255,255,0.5)"
                            : "3px solid var(--accent, #bd4140)",
                          pl: 1.5,
                          ml: 0,
                          my: 0.5,
                          opacity: 0.85,
                        },
                        "& a": {
                          color: isUser ? "#f5d5d4" : "var(--accent, #bd4140)",
                          textDecoration: "underline",
                        },
                      }}
                    >
                      {isUser ? (
                        msg.content
                      ) : (
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      )}
                    </Box>

                    {/* Feedback indicators (read-only) */}
                    {!isUser && (msg.feedback_thumb || msg.feedback_text) && (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          mt: 0.5,
                          ml: 1,
                        }}
                      >
                        {msg.feedback_thumb === 1 && (
                          <Tooltip title="Usuário gostou">
                            <ThumbUpIcon
                              sx={{ fontSize: 14, color: "#10b981" }}
                            />
                          </Tooltip>
                        )}
                        {msg.feedback_thumb === -1 && (
                          <Tooltip
                            title={
                              msg.feedback_text
                                ? `Feedback: ${msg.feedback_text}`
                                : "Usuário não gostou"
                            }
                          >
                            <ThumbDownIcon
                              sx={{ fontSize: 14, color: "#ef4444" }}
                            />
                          </Tooltip>
                        )}
                        {msg.feedback_text && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: "#9ca3af",
                              fontStyle: "italic",
                              fontSize: 11,
                              ml: 0.5,
                              maxWidth: 300,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            &ldquo;{msg.feedback_text}&rdquo;
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                  {isUser && (
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <PersonIcon sx={{ color: "#fff", fontSize: 17 }} />
                    </Box>
                  )}
                </Box>
              );
            })
          )}
          <div ref={bottomRef} />
        </Box>

        {/* Auditor message input */}
        <Box
          sx={{
            bgcolor: "var(--bg-surface, #fff)",
            borderRadius: "0 0 16px 16px",
            border: "1px solid var(--border, #e5e7eb)",
            borderTop: "none",
            p: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          {/* Ícone do auditor logado — SVG customizado ou SupportAgentIcon padrão */}
          <AuditorAvatar iconSvg={auditor?.icon_svg} size={36} />
          <TextField
            fullWidth
            size="small"
            placeholder={
              isUserOnline
                ? "Enviar mensagem para o usuário (online agora)..."
                : "Enviar mensagem para o usuário (offline - verá ao voltar)..."
            }
            value={auditorInput}
            onChange={(e) => setAuditorInput(e.target.value)}
            onKeyDown={handleAuditorKeyDown}
            multiline
            maxRows={3}
            disabled={sendingMessage}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
                fontSize: 14,
                bgcolor: "var(--bg-surface, #fff)",
                color: "#fff",
                "& fieldset": { borderColor: isUserOnline ? "#10b981" : "var(--border, #e5e7eb)" },
                "&:hover fieldset": { borderColor: "#f59e0b" },
                "&.Mui-focused fieldset": { borderColor: "#f59e0b" },
              },
            }}
          />
          <Tooltip title={isUserOnline ? "Enviar (usuário verá em tempo real)" : "Enviar (usuário verá quando voltar)"}>
            <span>
              <IconButton
                onClick={handleSendAuditorMessage}
                disabled={!auditorInput.trim() || sendingMessage}
                sx={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  background:
                    !auditorInput.trim() || sendingMessage
                      ? "#e0e0e0"
                      : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  color: "#fff",
                  "&:hover": {
                    background:
                      !auditorInput.trim() || sendingMessage
                        ? "#e0e0e0"
                        : "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
                  },
                  "&.Mui-disabled": { color: "#bbb" },
                }}
              >
                {sendingMessage ? (
                  <CircularProgress size={18} sx={{ color: "#f59e0b" }} />
                ) : (
                  <SendIcon fontSize="small" />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* Snackbar de feedback */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={5000}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: "100%", fontWeight: 600 }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  // ─── Thread List View ───
  return (
    <Box sx={{ animation: `${fadeIn} 0.3s ease` }}>
      {/* Search bar */}
      <Box sx={{ mb: 2.5, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
        <TextField
          size="small"
          placeholder="Buscar por assunto, usuário, email ou thread ID..."
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "#9ca3af", fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            flex: 1,
            minWidth: 280,
            maxWidth: 500,
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              fontSize: 14,
              color: "#fff",
              bgcolor: "var(--bg-surface, #fff)",
              "& fieldset": { borderColor: "var(--border, #e5e7eb)" },
              "&:hover fieldset": { borderColor: "var(--accent, #bd4140)" },
              "&.Mui-focused fieldset": { borderColor: "var(--accent, #bd4140)" },
            },
          }}
        />
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "var(--text-secondary)",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={auditorOnly}
            onChange={(e) => {
              setAuditorOnly(e.target.checked);
              setPage(1);
            }}
            style={{ accentColor: "var(--accent, #bd4140)", width: 16, height: 16 }}
          />
          🛡️ Intervenção do Auditor
        </label>
      </Box>

      {/* Stats */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Typography variant="body2" sx={{ color: "var(--text-secondary, #6b7280)" }}>
          {total} conversa{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""}
        </Typography>
        {loading && <CircularProgress size={16} sx={{ color: "var(--accent, #bd4140)" }} />}
      </Box>

      {/* Thread cards */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {threads.map((t, idx) => (
          <Box
            key={t.thread_id}
            onClick={() => handleSelectThread(t)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              p: 2,
              borderRadius: 3,
              bgcolor: "var(--bg-surface, #fff)",
              border: "1px solid var(--border, #e5e7eb)",
              cursor: "pointer",
              transition: "all 0.2s ease",
              animation: `${fadeIn} 0.25s ease ${idx * 0.03}s both`,
              "&:hover": {
                borderColor: "var(--accent)",
                bgcolor: "var(--bg-hover)",
                transform: "translateY(-1px)",
                boxShadow: "0 4px 12px rgba(189, 65, 64, 0.1)",
              },
            }}
          >
            {/* Icon */}
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, var(--accent, #bd4140) 0%, var(--accent-hover, #a03534) 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ChatBubbleOutlineIcon sx={{ color: "#fff", fontSize: 18 }} />
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: "var(--text-primary, #1e1b4b)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: 14,
                }}
              >
                {t.subject || "Sem assunto"}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  gap: 1.5,
                  mt: 0.5,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: "var(--text-secondary, #6b7280)",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.3,
                  }}
                >
                  <PersonIcon sx={{ fontSize: 13 }} />
                  {t.user_name || t.user_email}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#fca5a5",
                    fontSize: 14,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.3,
                  }}
                >
                  <SmartToyIcon sx={{ fontSize: 13 }} />
                  {t.agent_title}
                </Typography>
              </Box>
            </Box>

            {/* Right-side metadata */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 0.5,
                flexShrink: 0,
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: "var(--text-secondary)", fontSize: 11 }}
              >
                {new Date(t.created_at).toLocaleString("pt-BR")}
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                <Chip
                  label={`${t.message_count} msg`}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    bgcolor: "rgba(189, 65, 64, 0.15)",
                    color: "var(--accent, #bd4140)",
                  }}
                />
                {t.feedback_rating && (
                  <Chip
                    icon={
                      <StarIcon
                        sx={{ color: "#f59e0b !important", fontSize: 13 }}
                      />
                    }
                    label={t.feedback_rating}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      bgcolor: "rgba(245, 158, 11, 0.15)",
                      color: "#fcd34d",
                    }}
                  />
                )}
                {t.has_auditor && (
                  <Chip
                    icon={<SupportAgentIcon sx={{ color: "#d97706 !important", fontSize: 13 }} />}
                    label="Auditor"
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      bgcolor: "#fef3c7",
                      color: "#b45309",
                      border: "1px solid #fde68a"
                    }}
                  />
                )}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: 10,
                  color: "var(--text-secondary)",
                  fontFamily: "monospace",
                  opacity: 0.6,
                }}
              >
                {t.thread_id.slice(0, 8)}...
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Empty state */}
      {!loading && threads.length === 0 && (
        <Box
          sx={{
            textAlign: "center",
            py: 6,
            color: "var(--text-secondary, #6b7280)",
          }}
        >
          <ChatBubbleOutlineIcon
            sx={{ fontSize: 48, color: "#d1d5db", mb: 2 }}
          />
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            Nenhuma conversa encontrada
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {search
              ? "Tente ajustar os termos de busca."
              : "Ainda não há conversas registradas."}
          </Typography>
        </Box>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
            mt: 3,
            pt: 2,
            borderTop: "1px solid var(--border, #e5e7eb)",
          }}
        >
          <IconButton
            size="small"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            sx={{
              color: "var(--accent, #bd4140)",
              "&.Mui-disabled": { color: "#d1d5db" },
            }}
          >
            <NavigateBeforeIcon />
          </IconButton>
          <Typography
            variant="body2"
            sx={{
              color: "var(--text-secondary, #6b7280)",
              fontWeight: 500,
            }}
          >
            Página {page} de {pages}
          </Typography>
          <IconButton
            size="small"
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            sx={{
              color: "var(--accent, #bd4140)",
              "&.Mui-disabled": { color: "#d1d5db" },
            }}
          >
            <NavigateNextIcon />
          </IconButton>
        </Box>
      )}
    </Box>
  );
}
