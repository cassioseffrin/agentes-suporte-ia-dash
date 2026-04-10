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
import ReactMarkdown from "react-markdown";
import axios from "axios";

const BASE_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://assistant.arpasistemas.com.br";
const BACKEND_API_KEY = process.env.NEXT_PUBLIC_BACKEND_API_KEY || "";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
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
}

interface ChatMessage {
  id: number;
  role: string;
  content: string;
  feedback_thumb?: number | null;
  feedback_text?: string | null;
  feedback_rating?: number | null;
}

const PAGE_SIZE = 15;

export default function ChatAuditList() {
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Audit view state
  const [selectedThread, setSelectedThread] = useState<ThreadItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchThreads = useCallback(
    async (p: number, q: string) => {
      setLoading(true);
      try {
        const res = await axios.get(`${BASE_API_URL}/admin/threads`, {
          params: { page: p, limit: PAGE_SIZE, search: q },
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
    fetchThreads(page, search);
  }, [page, search, fetchThreads]);

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
  };

  const handleBack = () => {
    setSelectedThread(null);
    setMessages([]);
  };

  // ─── Fullscreen Audit View ───
  if (selectedThread) {
    return (
      <Box sx={{ animation: `${fadeIn} 0.3s ease`, minHeight: "70vh" }}>
        {/* Header bar */}
        <Box
          sx={{
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            borderRadius: "16px 16px 0 0",
            px: 3,
            py: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Tooltip title="Voltar à lista">
            <IconButton onClick={handleBack} sx={{ color: "#fff" }}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
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
        </Box>

        {/* Messages area */}
        <Box
          sx={{
            bgcolor: "#f8f9ff",
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
              bgcolor: "#c7d2fe",
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
              <CircularProgress sx={{ color: "#6366f1" }} />
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
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background:
                          "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <SmartToyIcon sx={{ color: "#fff", fontSize: 17 }} />
                    </Box>
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
                          ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                          : "#fff",
                        color: isUser ? "#fff" : "#1e1b4b",
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
                          color: isUser ? "#fff" : "#6366f1",
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
                            : "3px solid #a5b4fc",
                          pl: 1.5,
                          ml: 0,
                          my: 0.5,
                          opacity: 0.85,
                        },
                        "& a": {
                          color: isUser ? "#e0e7ff" : "#6366f1",
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
      </Box>
    );
  }

  // ─── Thread List View ───
  return (
    <Box sx={{ animation: `${fadeIn} 0.3s ease` }}>
      {/* Search bar */}
      <Box sx={{ mb: 2.5 }}>
        <TextField
          fullWidth
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
            maxWidth: 500,
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              fontSize: 14,
              bgcolor: "var(--bg-surface, #fff)",
              "& fieldset": { borderColor: "var(--border, #e5e7eb)" },
              "&:hover fieldset": { borderColor: "#a5b4fc" },
              "&.Mui-focused fieldset": { borderColor: "#6366f1" },
            },
          }}
        />
      </Box>

      {/* Stats */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Typography variant="body2" sx={{ color: "var(--text-secondary, #6b7280)" }}>
          {total} conversa{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""}
        </Typography>
        {loading && <CircularProgress size={16} sx={{ color: "#6366f1" }} />}
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
                borderColor: "#a5b4fc",
                bgcolor: "#f5f3ff",
                transform: "translateY(-1px)",
                boxShadow: "0 4px 12px rgba(99,102,241,0.1)",
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
                  "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
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
                    color: "#6366f1",
                    fontWeight: 500,
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
                sx={{ color: "var(--text-muted, #9ca3af)", fontSize: 11 }}
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
                    bgcolor: "#eef2ff",
                    color: "#6366f1",
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
                      bgcolor: "#fffbeb",
                      color: "#92400e",
                    }}
                  />
                )}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: 10,
                  color: "var(--text-muted, #9ca3af)",
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
              color: "#6366f1",
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
              color: "#6366f1",
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
