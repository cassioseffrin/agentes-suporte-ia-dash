"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  ThumbsUpDown as AllThumbsIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  SmartToy as AgentIcon,
  Star as StarIcon,
  OpenInNew as OpenIcon,
  Refresh as RefreshIcon,
  Forum as ForumIcon,
  SentimentSatisfiedAlt as HappyIcon,
  SentimentDissatisfied as SadIcon,
  FilterList as FilterIcon,
} from "@mui/icons-material";

const API = process.env.NEXT_PUBLIC_API_URL || "https://assistant.arpasistemas.com.br";
const API_KEY = process.env.NEXT_PUBLIC_BACKEND_API_KEY || "";

interface Feedback {
  chat_id: number;
  message: string;
  feedback_thumb: number | null;
  feedback_text: string;
  feedback_rating: number | null;
  created_at: string | null;
  thread_id: string;
  thread_subject: string;
  user_name: string;
  user_email: string;
  agent_name: string;
  agent_title: string;
}

interface FeedbacksResponse {
  feedbacks: Feedback[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

type ThumbFilter = "all" | "positive" | "negative";

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffD > 0) return `${diffD}d atrás`;
  if (diffH > 0) return `${diffH}h atrás`;
  if (diffMin > 0) return `${diffMin}min atrás`;
  return "agora";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon
          key={i}
          sx={{
            fontSize: 13,
            color: i <= rating ? "#f59e0b" : "var(--border)",
          }}
        />
      ))}
    </div>
  );
}

export default function FeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [thumbFilter, setThumbFilter] = useState<ThumbFilter>("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchFeedbacks = useCallback(async (p: number, q: string, tf: ThumbFilter) => {
    setLoading(true);
    try {
      const thumbParam = tf === "positive" ? "&thumb=1" : tf === "negative" ? "&thumb=-1" : "";
      const searchParam = q.trim() ? `&search=${encodeURIComponent(q.trim())}` : "";
      const res = await fetch(`${API}/feedbacks?page=${p}&limit=20${thumbParam}${searchParam}`, {
        headers: { Authorization: `Bearer ${API_KEY}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: FeedbacksResponse = await res.json();
      setFeedbacks(data.feedbacks);
      setTotal(data.total);
      setPages(data.pages);
      setPage(data.page);
    } catch (e) {
      console.error("[feedbacks]", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks(1, search, thumbFilter);
  }, []);

  const handleSearch = (v: string) => {
    setSearch(v);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setPage(1);
      fetchFeedbacks(1, v, thumbFilter);
    }, 450);
  };

  const handleThumbFilter = (f: ThumbFilter) => {
    setThumbFilter(f);
    setPage(1);
    fetchFeedbacks(1, search, f);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchFeedbacks(p, search, thumbFilter);
  };

  const positiveCount = feedbacks.filter((f) => f.feedback_thumb === 1).length;
  const negativeCount = feedbacks.filter((f) => f.feedback_thumb === -1).length;

  return (
    <div style={{ animation: "fadeIn 0.3s ease", maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
          Feedbacks das Conversas
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Mensagens avaliadas pelos usuários com comentários de texto.
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          {
            label: "Total de feedbacks",
            value: total,
            icon: <ForumIcon sx={{ fontSize: 20, color: "var(--accent)" }} />,
            bg: "rgba(189,65,64,0.07)",
            border: "rgba(189,65,64,0.2)",
          },
          {
            label: "Positivos (nesta página)",
            value: positiveCount,
            icon: <HappyIcon sx={{ fontSize: 20, color: "#10b981" }} />,
            bg: "rgba(16,185,129,0.07)",
            border: "rgba(16,185,129,0.2)",
          },
          {
            label: "Negativos (nesta página)",
            value: negativeCount,
            icon: <SadIcon sx={{ fontSize: 20, color: "#ef4444" }} />,
            bg: "rgba(239,68,68,0.07)",
            border: "rgba(239,68,68,0.2)",
          },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              flex: "1 1 160px",
              background: card.bg,
              border: `1px solid ${card.border}`,
              borderRadius: "var(--radius)",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {card.icon}
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
                {loading ? "…" : card.value}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Search */}
        <div
          style={{
            flex: "1 1 220px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 12px",
          }}
        >
          <SearchIcon sx={{ fontSize: 18, color: "var(--text-muted)" }} />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar por feedback, mensagem, usuário..."
            style={{
              background: "none",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: 13,
              width: "100%",
              fontFamily: "Inter, sans-serif",
            }}
          />
        </div>

        {/* Thumb filter */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
          }}
        >
          {(
            [
              { key: "all", label: "Todos", Icon: AllThumbsIcon },
              { key: "positive", label: "Positivos", Icon: ThumbUpIcon },
              { key: "negative", label: "Negativos", Icon: ThumbDownIcon },
            ] as const
          ).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => handleThumbFilter(key)}
              style={{
                padding: "8px 14px",
                border: "none",
                borderRight: key !== "negative" ? "1px solid var(--border)" : "none",
                background: thumbFilter === key ? "var(--accent-light)" : "transparent",
                color: thumbFilter === key ? "var(--accent)" : "var(--text-muted)",
                fontWeight: thumbFilter === key ? 600 : 400,
                cursor: "pointer",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 5,
                transition: "all 0.15s ease",
              }}
            >
              <Icon sx={{ fontSize: 15 }} />
              {label}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button
          onClick={() => fetchFeedbacks(page, search, thumbFilter)}
          disabled={loading}
          title="Atualizar"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 10px",
            cursor: loading ? "default" : "pointer",
            color: "var(--text-muted)",
            display: "flex",
            opacity: loading ? 0.5 : 1,
            transition: "opacity 0.2s",
          }}
        >
          <RefreshIcon
            sx={{ fontSize: 18, animation: loading ? "spin 1s linear infinite" : "none" }}
          />
        </button>
      </div>

      {/* Feedback list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: 20,
                animation: "pulse 1.5s ease infinite",
                height: 100,
                opacity: 0.6,
              }}
            />
          ))
        ) : feedbacks.length === 0 ? (
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: 40,
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <ForumIcon sx={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }} />
            <div style={{ fontSize: 15, fontWeight: 600 }}>Nenhum feedback encontrado</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              {search || thumbFilter !== "all"
                ? "Tente limpar os filtros de busca."
                : "Quando usuários enviarem feedbacks com texto, eles aparecerão aqui."}
            </div>
          </div>
        ) : (
          feedbacks.map((fb) => {
            const isExpanded = expanded === fb.chat_id;
            const isPositive = fb.feedback_thumb === 1;
            const isNegative = fb.feedback_thumb === -1;

            return (
              <div
                key={fb.chat_id}
                style={{
                  background: "var(--bg-surface)",
                  border: `1px solid ${
                    isPositive
                      ? "rgba(16,185,129,0.25)"
                      : isNegative
                      ? "rgba(239,68,68,0.2)"
                      : "var(--border)"
                  }`,
                  borderRadius: "var(--radius)",
                  overflow: "hidden",
                  transition: "box-shadow 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                {/* Card header */}
                <div
                  style={{
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                    cursor: "pointer",
                  }}
                  onClick={() => setExpanded(isExpanded ? null : fb.chat_id)}
                >
                  {/* Thumb icon */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isPositive
                        ? "rgba(16,185,129,0.12)"
                        : isNegative
                        ? "rgba(239,68,68,0.1)"
                        : "var(--bg-hover)",
                    }}
                  >
                    {isPositive ? (
                      <ThumbUpIcon sx={{ fontSize: 18, color: "#10b981" }} />
                    ) : isNegative ? (
                      <ThumbDownIcon sx={{ fontSize: 18, color: "#ef4444" }} />
                    ) : (
                      <AllThumbsIcon sx={{ fontSize: 18, color: "var(--text-muted)" }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Feedback text */}
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: fb.feedback_text ? "var(--text-primary)" : "var(--text-muted)",
                        marginBottom: 8,
                        lineHeight: 1.5,
                        fontStyle: fb.feedback_text ? "normal" : "italic",
                      }}
                    >
                      {fb.feedback_text ? (
                        <>
                          <span style={{ color: "var(--accent)", fontWeight: 700, marginRight: 4 }}>"</span>
                          {isExpanded
                            ? fb.feedback_text
                            : fb.feedback_text.length > 180
                            ? fb.feedback_text.slice(0, 180) + "…"
                            : fb.feedback_text}
                          <span style={{ color: "var(--accent)", fontWeight: 700, marginLeft: 2 }}>"</span>
                        </>
                      ) : (
                        "Feedback enviado sem comentário de texto"
                      )}
                    </div>

                    {/* Meta row */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 12,
                        fontSize: 12,
                        color: "var(--text-muted)",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <PersonIcon sx={{ fontSize: 13 }} />
                        {fb.user_name || fb.user_email}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <AgentIcon sx={{ fontSize: 13 }} />
                        {fb.agent_title || fb.agent_name}
                      </span>
                      {fb.feedback_rating && <StarRating rating={fb.feedback_rating} />}
                      <span style={{ marginLeft: "auto" }}>{timeAgo(fb.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: "1px solid var(--border)",
                      padding: "14px 18px",
                      background: "var(--bg-base)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      animation: "fadeIn 0.2s ease",
                    }}
                  >
                    {/* Original message */}
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: "var(--text-muted)",
                          marginBottom: 6,
                        }}
                      >
                        Resposta da IA avaliada
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--text-secondary)",
                          lineHeight: 1.6,
                          background: "var(--bg-surface)",
                          padding: "10px 14px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border)",
                          maxHeight: 160,
                          overflowY: "auto",
                        }}
                      >
                        {fb.message}
                      </div>
                    </div>

                    {/* Meta details */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 10,
                        fontSize: 12,
                      }}
                    >
                      <MetaChip label="Usuário" value={fb.user_name || fb.user_email} />
                      <MetaChip label="E-mail" value={fb.user_email} />
                      <MetaChip label="Agente" value={fb.agent_title || fb.agent_name} />
                      <MetaChip label="Assunto" value={fb.thread_subject} />
                      <MetaChip label="Data" value={formatDate(fb.created_at)} />
                    </div>

                    {/* Link to thread */}
                    <div>
                      <Link
                        href={`/testar-agentes?thread=${fb.thread_id}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          color: "var(--accent)",
                          textDecoration: "none",
                          fontWeight: 600,
                          padding: "6px 12px",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid rgba(189,65,64,0.3)",
                          background: "rgba(189,65,64,0.05)",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <OpenIcon sx={{ fontSize: 14 }} />
                        Ver conversa completa
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            marginTop: 28,
          }}
        >
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || loading}
            style={paginationBtnStyle(false)}
          >
            ‹
          </button>
          {Array.from({ length: Math.min(pages, 7) }).map((_, idx) => {
            const p = idx + 1;
            const isActive = p === page;
            return (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                disabled={loading}
                style={paginationBtnStyle(isActive)}
              >
                {p}
              </button>
            );
          })}
          {pages > 7 && page < pages && (
            <>
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>…</span>
              <button
                onClick={() => handlePageChange(pages)}
                style={paginationBtnStyle(page === pages)}
              >
                {pages}
              </button>
            </>
          )}
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= pages || loading}
            style={paginationBtnStyle(false)}
          >
            ›
          </button>
        </div>
      )}

      {/* Total count */}
      {!loading && total > 0 && (
        <div
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "var(--text-muted)",
            marginTop: 16,
          }}
        >
          {total} feedback{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: "4px 10px",
        color: "var(--text-secondary)",
      }}
    >
      <span style={{ color: "var(--text-muted)", marginRight: 4 }}>{label}:</span>
      {value || "—"}
    </div>
  );
}

function paginationBtnStyle(active: boolean): React.CSSProperties {
  return {
    minWidth: 34,
    height: 34,
    padding: "0 8px",
    borderRadius: "var(--radius-sm)",
    border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
    background: active ? "var(--accent-light)" : "var(--bg-surface)",
    color: active ? "var(--accent)" : "var(--text-secondary)",
    fontWeight: active ? 700 : 400,
    cursor: "pointer",
    fontSize: 13,
    transition: "all 0.15s ease",
  };
}
