"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CircularProgress } from "@mui/material";
import { useI18n } from "../../../i18n/I18nContext";

export default function AtualizarAgentesPage() {
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    router.replace("/agentes");
  }, [router]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 320,
        gap: 16,
        animation: "fadeIn 0.3s ease",
      }}
    >
      <CircularProgress size={32} sx={{ color: "var(--accent, #bd4140)" }} />
      <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
        {t("testAgents.redirectText")}{" "}
        <strong style={{ color: "var(--text-primary)" }}>{t("testAgents.redirectAgents")}</strong>.
      </p>
      <Link
        href="/agentes"
        style={{
          color: "var(--accent, #bd4140)",
          fontSize: 13,
          textDecoration: "underline",
        }}
      >
        {t("testAgents.redirectLink")}
      </Link>
    </div>
  );
}
