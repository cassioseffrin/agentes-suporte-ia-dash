"use client";

import { useEffect, useState } from "react";
import mermaid from "mermaid";
import { useI18n } from "../../i18n/I18nContext";
import { diagrams } from "./diagrams";

let renderCount = 0;

export default function ArquiteturaPage() {
  const { t, locale } = useI18n();
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let cancelled = false;
    mermaid.initialize({ startOnLoad: false, theme: "dark" });
    mermaid
      .render(`arch-diagram-${++renderCount}`, diagrams[locale])
      .then(({ svg }) => {
        if (!cancelled) setSvg(svg);
      })
      .catch((err) => console.error("[Arquitetura] mermaid render error", err));
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
          {t("architecture.title")}
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          {t("architecture.subtitle")}
        </p>
      </div>

      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "24px",
          marginBottom: 24,
          overflowX: "auto"
        }}
      >
        <div
          style={{ display: "flex", justifyContent: "center" }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}
