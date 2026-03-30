"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const API = "http://192.168.50.21:8000";

interface DashboardData {
  categories: string[];
  series: { name: string; data: number[] }[];
  top_users: { name: string; email: string; total: number }[];
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const load = async (d: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/dashboard/chats-per-user?days=${d}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(days);
  }, [days]);

  const totalChats = data?.top_users.reduce((s, u) => s + u.total, 0) ?? 0;
  const totalUsers = data?.top_users.length ?? 0;

  const chartOptions: ApexCharts.ApexOptions = {
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
      categories: data?.categories ?? [],
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
  };

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
            options={chartOptions}
            height={320}
          />
        )}
      </div>

      {/* Top users table */}
      {data && data.top_users.length > 0 && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
              Ranking de Usuários
            </h2>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-surface)" }}>
                {["#", "Nome", "Email", "Total de Chats"].map((h) => (
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
              {data.top_users.map((u, i) => (
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
                  <td style={{ padding: "12px 20px", fontSize: 14, fontWeight: 500 }}>
                    {u.name}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
