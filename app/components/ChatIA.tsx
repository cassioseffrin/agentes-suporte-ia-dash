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
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import AddCommentOutlinedIcon from "@mui/icons-material/AddCommentOutlined";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import HistoryIcon from "@mui/icons-material/History";
import DeleteIcon from "@mui/icons-material/Delete";
import ReactMarkdown from "react-markdown";

// const BASE_API_URL = "http://localhost:8000";
const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || "https://assistant.arpasistemas.com.br";
const BACKEND_API_KEY = process.env.NEXT_PUBLIC_BACKEND_API_KEY || "";

const pulseIA = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.6); }
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

interface ChatMessage {
  text: string;
  isUser: boolean;
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
  const [threadId, setThreadId] = useState("");
  const [threadError, setThreadError] = useState(0);
  const [consentGiven, setConsentGiven] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [agents, setAgents] = useState<{ id: string; name: string; title: string }[]>([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [showAgentSelection, setShowAgentSelection] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyHasMore, setHistoryHasMore] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${BASE_API_URL}/agents`);
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
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

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

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
      const endpoint = `${BASE_API_URL}/createNewThread${queryString ? `?${queryString}` : ""}`;

      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setThreadId(data.threadId);
        setMessages([
          {
            text: "Olá! Sou seu assistente virtual, como posso lhe ajudar?",
            isUser: false,
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

      const res = await fetch(`${BASE_API_URL}/history?email=${encodeURIComponent(email)}&page=${page}&limit=30`, {
        headers: { Authorization: `Bearer ${BACKEND_API_KEY}` }
      });
      if (res.ok) {
        const data = await res.json();
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
      const res = await fetch(`${BASE_API_URL}/thread/${tId}/messages`, {
        headers: { Authorization: `Bearer ${BACKEND_API_KEY}` }
      });
      if (res.ok) {
        const data = await res.json();
        const loadedMessages = data.messages.map((m: any) => ({
          text: m.content,
          isUser: m.role === "user"
        }));
        setThreadId(tId);
        setSelectedAgent(agentName);
        setMessages(loadedMessages);
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
      const res = await fetch(`${BASE_API_URL}/thread/${tId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${BACKEND_API_KEY}` }
      });
      if (res.ok) {
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
      const res = await fetch(`${BASE_API_URL}/thread/${threadId}/feedback`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BACKEND_API_KEY}`,
        },
        body: JSON.stringify({ rating }),
      });
      if (res.ok) {
        setFeedbackSent(true);
      }
    } catch (e) {
      console.error("Erro ao enviar feedback:", e);
    }
  };

  const fetchResponse = async (
    message: string,
    currentThreadId: string
  ): Promise<string | null> => {
    try {
      const res = await fetch(`${BASE_API_URL}/chat`, {
        method: "POST",
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
      if (res.ok) {
        const data = await res.json();
        return data?.content?.[0] ?? null;
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    setMessages((prev) => [...prev, { text, isUser: true }]);
    setInput("");
    setIsTyping(true);

    let tid = threadId;
    if (!tid && threadError < 2) {
      await createNewThread();
      setThreadError((e) => e + 1);
      tid = threadId;
    }

    const reply = await fetchResponse(text, tid);
    setIsTyping(false);

    if (reply) {
      setMessages((prev) => [
        ...prev,
        { text: cleanText(reply), isUser: false },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          text: "Desculpe, não consegui processar isso. Tente novamente.",
          isUser: false,
        },
      ]);
    }
  };

  const cleanText = (text: string) => {
    const patterns = [/,\s*:\n/g, /,\s*:\s/g, /,\s*:/g, /-\s*:/g];
    let t = text;
    patterns.forEach((p) => (t = t.replace(p, "")));
    t = t.replace(/ +/g, " ").trim();
    return t;
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
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            color: "#fff",
            animation: open ? "none" : `${pulseIA} 2.4s infinite`,
            "&:hover": {
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
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
            boxShadow: "0 24px 64px rgba(99,102,241,0.25)",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              px: 2,
              py: 1.5,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexShrink: 0,
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{ color: "#fff", fontWeight: 700, lineHeight: 1.2 }}
              >
                Assistente IA
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
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Novo Chat">
              <IconButton size="small" onClick={handleReset} sx={{ color: "#fff" }}>
                <AddCommentOutlinedIcon fontSize="small" />
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
                bgcolor: "#fafafa",
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <SmartToyIcon sx={{ color: "#fff", fontSize: 32 }} />
              </Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, textAlign: "center", color: "#1e1b4b" }}
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
                      "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
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
                bgcolor: "#fafafa",
                overflowY: "auto",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", mb: 1, gap: 1 }}>
                <HistoryIcon sx={{ color: "#6366f1" }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e1b4b" }}>
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
                      color: "#1e1b4b",
                      bgcolor: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      "&:hover": { borderColor: "#a5b4fc", bgcolor: "#f5f3ff",
                        "& .delete-btn": { opacity: 1 }
                      }
                    }}
                  >
                    <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {t.subject}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "var(--mui-palette-primary-main, #6366f1)", fontWeight: 500, mt: 0.5 }}>
                        {t.agent_title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#6b7280", mt: 0.5 }}>
                        {new Date(t.created_at).toLocaleString()}
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
                justifyContent: "center",
                p: 3,
                gap: 2,
                bgcolor: "#fafafa",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 1.5,
                  }}
                >
                  <SmartToyIcon sx={{ color: "#fff", fontSize: 28 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e1b4b" }}>
                  Escolha o Assistente
                </Typography>
                <Typography variant="body2" sx={{ color: "#6b7280", textAlign: "center" }}>
                  Sobre qual assunto ou manual você deseja falar?
                </Typography>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, overflowY: "auto", maxHeight: "100%" }}>
                {agents.length === 0 ? (
                  <LinearProgress sx={{ mt: 2 }} />
                ) : (
                  agents.map((agent) => (
                    <Button
                      key={agent.id}
                      variant="outlined"
                      onClick={() => handleSelectAgent(agent.name)}
                      sx={{
                        textTransform: "none",
                        justifyContent: "flex-start",
                        textAlign: "left",
                        py: 1.5,
                        px: 2,
                        borderRadius: 2,
                        borderColor: "#e8eaff",
                        color: "#1e1b4b",
                        "&:hover": {
                          borderColor: "#a5b4fc",
                          bgcolor: "#f5f3ff",
                        },
                      }}
                    >
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {agent.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#6b7280" }}>
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
                  bgcolor: "#f8f9ff",
                  "&::-webkit-scrollbar": { width: 4 },
                  "&::-webkit-scrollbar-thumb": {
                    bgcolor: "#c7d2fe",
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
                          "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <SmartToyIcon sx={{ color: "#fff", fontSize: 32 }} />
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700, color: "#1e1b4b" }}
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
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background:
                            "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
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
                        maxWidth: "75%",
                        px: 2,
                        py: 1,
                        borderRadius: msg.isUser
                          ? "18px 18px 4px 18px"
                          : "18px 18px 18px 4px",
                        background: msg.isUser
                          ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                          : "#fff",
                        color: msg.isUser ? "#fff" : "#1e1b4b",
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
                          color: msg.isUser ? "#fff" : "#6366f1",
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
                          borderLeft: msg.isUser ? "3px solid rgba(255,255,255,0.5)" : "3px solid #a5b4fc",
                          pl: 1.5,
                          ml: 0,
                          my: 0.5,
                          opacity: 0.85,
                        },
                        "& h1, & h2, & h3": { mt: 0.5, mb: 0.25, fontWeight: 700, lineHeight: 1.3 },
                        "& a": { color: msg.isUser ? "#e0e7ff" : "#6366f1", textDecoration: "underline" },
                        "& hr": { border: "none", borderTop: "1px solid rgba(0,0,0,0.1)", my: 1 },
                      }}
                    >
                      {msg.isUser ? (
                        msg.text
                      ) : (
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      )}
                    </Box>
                  </Box>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background:
                          "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
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
                        px: 2,
                        py: 1.2,
                        bgcolor: "#fff",
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
                            bgcolor: "#a5b4fc",
                            animation: `${dotBounce} 1.2s ease-in-out ${d * 0.2}s infinite`,
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
                <div ref={bottomRef} />
              </Box>

              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  bgcolor: "#fff",
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
                      color: "#1e1b4b",
                      bgcolor: "#fff",
                      "& fieldset": { borderColor: "#e8eaff" },
                      "&:hover fieldset": { borderColor: "#a5b4fc" },
                      "&.Mui-focused fieldset": { borderColor: "#6366f1" },
                    },
                    "& .MuiInputBase-input::placeholder": {
                      color: "#9ca3af",
                      opacity: 1,
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
                        : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                    color: "#fff",
                    "&:hover": {
                      background:
                        !input.trim() || isTyping
                          ? "#e0e0e0"
                          : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                    },
                  }}
                >
                  {isTyping ? (
                    <CircularProgress size={18} sx={{ color: "#6366f1" }} />
                  ) : (
                    <SendIcon fontSize="small" />
                  )}
                </IconButton>
              </Box>

              {/* Footer — Rating + Disclaimer */}
              {messages.length > 1 && (
                <Box
                  sx={{
                    bgcolor: "#fff",
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
                  bgcolor: "#fff",
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
    </>
  );
};
export default ChatIA;
