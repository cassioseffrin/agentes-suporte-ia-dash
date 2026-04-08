"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { format, parseISO } from "date-fns";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL || "https://assistant.arpasistemas.com.br";

interface DashboardData {
  categories: string[];
  series: { name: string; data: number[] }[];
  top_users?: { name: string; email: string; total: number; avg_rating?: number | null; thumb_avg?: number | null; thumb_up?: number; thumb_down?: number }[];
  agents?: { name: string; total: number }[];
}

interface FeedbackDashboardData {
  categories: string[];
  series: { name: string; data: number[] }[];
  feedbacks: { name: string; avg_rating: number; total_ratings: number; thumb_avg?: number | null; thumb_up?: number; thumb_down?: number }[];
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "none";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: accent || "var(--text-primary)",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{sub}</span>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [agentData, setAgentData] = useState<DashboardData | null>(null);
  const [feedbackData, setFeedbackData] = useState<FeedbackDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [userLimit, setUserLimit] = useState(20);

  const load = async (d: number, lim: number) => {
    setLoading(true);
    setError(null);
    try {
      const [resUsers, resAgents, resFeedbacks] = await Promise.all([
        fetch(`${API}/dashboard/chats-per-user?days=${d}&limit=${lim}`),
        fetch(`${API}/dashboard/chats-per-agent?days=${d}`),
        fetch(`${API}/dashboard/feedback-per-agent?days=${d}`)
      ]);
      if (!resUsers.ok || !resAgents.ok || !resFeedbacks.ok) throw new Error(`HTTP Error`);
      
      const [jsonUsers, jsonAgents, jsonFeedbacks] = await Promise.all([
        resUsers.json(),
        resAgents.json(),
        resFeedbacks.json()
      ]);

      const formatDateBR = (dateStr: string) => {
        if (!dateStr || typeof dateStr !== "string") return dateStr;
        try {
          return format(parseISO(dateStr), 'dd/MM/yyyy');
        } catch {
          return dateStr;
        }
      };

      if (jsonUsers && jsonUsers.categories) {
        jsonUsers.categories = jsonUsers.categories.map(formatDateBR);
      }
      
      if (jsonAgents && jsonAgents.categories) {
        jsonAgents.categories = jsonAgents.categories.map(formatDateBR);
      }

      if (jsonUsers && jsonUsers.series) {
        jsonUsers.series = jsonUsers.series.map((s: any) => ({
          ...s,
          name: s.name.toLowerCase().replace(/(?:^|\s)\S/g, (a: string) => a.toUpperCase())
        }));
      }

      setData(jsonUsers);
      setAgentData(jsonAgents);
      setFeedbackData(jsonFeedbacks);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(days, userLimit);
  }, [days, userLimit]);

  const totalChats = data?.top_users?.reduce((s, u) => s + u.total, 0) ?? 0;
  const totalUsers = data?.top_users?.length ?? 0;

  const getChartOptions = (categories: string[]): ApexCharts.ApexOptions => ({
    chart: {
      type: "line",
      background: "transparent",
      toolbar: { show: true, tools: { download: true, selection: true, zoom: true, zoomin: true, zoomout: true, pan: true } },
      zoom: { enabled: true },
      animations: { enabled: true, speed: 600, dynamicAnimation: { enabled: true, speed: 400 } },
    },
    stroke: { curve: "smooth", width: 2.5 },
    markers: { size: 4, strokeWidth: 0, hover: { size: 6 } },
    theme: { mode: "dark" },
    grid: {
      borderColor: "#2d3352",
      strokeDashArray: 4,
    },
    xaxis: {
      categories: categories,
      labels: {
        style: { colors: "#94a3b8", fontSize: "11px" },
        rotate: -30,
        maxHeight: 60,
      },
      axisBorder: { color: "#2d3352" },
      axisTicks: { color: "#2d3352" },
    },
    yaxis: {
      labels: { style: { colors: "#94a3b8", fontSize: "11px" } },
      min: 0,
    },
    legend: {
      position: "top",
      labels: { colors: "#94a3b8" },
      fontFamily: "Inter, sans-serif",
    },
    tooltip: {
      theme: "dark",
      shared: true,
      intersect: false,
      style: { fontFamily: "Inter, sans-serif" },
    },
    colors: [
      "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
      "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6",
    ],
  });

  const getBarChartOptions = (categories: string[]): ApexCharts.ApexOptions => ({
    chart: {
      type: "bar",
      background: "transparent",
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: true,
        dataLabels: { position: 'top' },
      }
    },
    dataLabels: {
      enabled: true,
      textAnchor: 'start',
      style: { colors: ['#fff'] },
      formatter: function (val, opts?: any) {
        const item = opts?.dataPointIndex !== undefined ? feedbackData?.feedbacks?.[opts.dataPointIndex] : undefined;
        const starText = (val === null || val === undefined) ? "- ★" : `${val} ★`;
        if (item && item.thumb_avg !== undefined && item.thumb_avg !== null) {
          return `${starText} | ${item.thumb_avg}% 👍`;
        }
        return starText;
      },
      offsetX: 0,
    },
    theme: { mode: "dark" },
    xaxis: {
      categories: categories,
      labels: { style: { colors: "#94a3b8", fontSize: "11px" } },
      max: 5,
      tickAmount: 5,
    },
    yaxis: {
      labels: { style: { colors: "#94a3b8", fontSize: "12px", fontWeight: 500 } },
    },
    colors: ["#f59e0b"], // Gold/Amber
    grid: { borderColor: "#2d3352", strokeDashArray: 4 },
    tooltip: {
      theme: "dark",
      y: {
        formatter: function (val, opts?: any) {
          const item = opts?.dataPointIndex !== undefined ? feedbackData?.feedbacks?.[opts.dataPointIndex] : undefined;
          const starText = (val === null || val === undefined) ? "Sem avaliações ★" : `${val} ★`;
          if (item && item.thumb_avg !== undefined && item.thumb_avg !== null) {
            return `${starText} (${item.thumb_avg}% 👍 | ${item.thumb_up} up, ${item.thumb_down} down)`;
          }
          return starText;
        }
      }
    },
  });

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
          Visão Geral
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Métricas de uso dos agentes de suporte IA
        </p>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {[7, 14, 30, 60, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            style={{
              padding: "6px 16px",
              borderRadius: 20,
              border: "1px solid",
              borderColor: days === d ? "var(--accent)" : "var(--border)",
              background: days === d ? "var(--accent-light)" : "transparent",
              color: days === d ? "var(--accent)" : "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: days === d ? 600 : 400,
              transition: "all 0.15s ease",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {d}d
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <StatCard
          label="Total de Chats"
          value={loading ? "—" : totalChats}
          sub={`últimos ${days} dias`}
          accent="var(--accent)"
        />
        <StatCard
          label="Usuários Ativos"
          value={loading ? "—" : totalUsers}
          sub="top usuarios"
        />
        <StatCard
          label="Período"
          value={`${days}d`}
          sub="selecionado"
          accent="var(--warning)"
        />
      </div>

      {/* Chart */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "24px",
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: "var(--text-primary)" }}>
          Chats por Usuário (diário) — Top 10
        </h2>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 12, color: "var(--text-secondary)" }}>
            <span className="spinner" /> Carregando dados...
          </div>
        ) : error ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 300,
              color: "var(--danger)",
              fontSize: 14,
            }}
          >
            ⚠️ {error}
          </div>
        ) : !data || data.series.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "var(--text-muted)", fontSize: 14 }}>
            Nenhum dado no período selecionado.
          </div>
        ) : (
          <ApexChart
            type="line"
            series={data.series}
            options={getChartOptions(data.categories ?? [])}
            height={320}
          />
        )}
      </div>

      {/* Agent Chart */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "24px",
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: "var(--text-primary)" }}>
          Chats por Agente (diário)
        </h2>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 12, color: "var(--text-secondary)" }}>
            <span className="spinner" /> Carregando dados...
          </div>
        ) : error ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 300,
              color: "var(--danger)",
              fontSize: 14,
            }}
          >
            ⚠️ {error}
          </div>
        ) : !agentData || agentData.series.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "var(--text-muted)", fontSize: 14 }}>
            Nenhum dado no período selecionado.
          </div>
        ) : (
          <ApexChart
            type="line"
            series={agentData.series}
            options={getChartOptions(agentData.categories ?? [])}
            height={320}
          />
        )}
      </div>

      {/* Feedback Chart */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "24px",
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: "var(--text-primary)" }}>
          Média de Avaliação por Agente (Estrelas)
        </h2>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 12, color: "var(--text-secondary)" }}>
            <span className="spinner" /> Carregando dados...
          </div>
        ) : error ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 300,
              color: "var(--danger)",
              fontSize: 14,
            }}
          >
            ⚠️ {error}
          </div>
        ) : !feedbackData || feedbackData.series.length === 0 || feedbackData.series[0].data.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "var(--text-muted)", fontSize: 14 }}>
            Nenhum feedback recebido no período selecionado.
          </div>
        ) : (
          <ApexChart
            type="bar"
            series={feedbackData.series}
            options={getBarChartOptions(feedbackData.categories ?? [])}
            height={Math.max(200, (feedbackData.categories?.length || 0) * 50)}
          />
        )}
      </div>

      {/* Top users table */}
      {data && data.top_users && data.top_users.length > 0 && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
              Ranking de Usuários
            </h2>
            <select
              title="Quantidade de usuários a exibir"
              value={userLimit}
              onChange={(e) => setUserLimit(Number(e.target.value))}
              style={{
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "6px 12px",
                fontSize: 13,
                outline: "none",
                cursor: "pointer",
                fontFamily: "Inter, sans-serif"
              }}
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
              <option value={999999}>Todos</option>
            </select>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-surface)" }}>
                {["#", "Nome", "Email", "Total de Chats", "Avaliação"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 20px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.top_users.slice(0, userLimit).map((u, i) => (
                <tr
                  key={u.email}
                  style={{
                    borderTop: "1px solid var(--border)",
                    transition: "background 0.12s ease",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = "var(--bg-hover)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = "transparent")
                  }
                >
                  <td style={{ padding: "12px 20px", color: "var(--text-muted)", fontSize: 13 }}>
                    {i + 1}
                  </td>
                  <td style={{ padding: "12px 20px", fontSize: 14, fontWeight: 500, textTransform: "capitalize" }}>
                    {u.name.toLowerCase()}
                  </td>
                  <td style={{ padding: "12px 20px", fontSize: 13, color: "var(--text-secondary)" }}>
                    {u.email}
                  </td>
                  <td style={{ padding: "12px 20px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "3px 10px",
                        borderRadius: 20,
                        background: "var(--accent-light)",
                        color: "var(--accent)",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {u.total}
                    </span>
                  </td>
                  <td style={{ padding: "12px 20px" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      {u.avg_rating ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            color: "#f59e0b", // Gold text for stars
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          {u.avg_rating} ★
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: 13 }}>—</span>
                      )}
                      
                      {u.thumb_avg !== undefined && u.thumb_avg !== null ? (
                        <span style={{ color: "#10b981", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                          | {u.thumb_avg}% 👍
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
