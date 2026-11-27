"use client";

import { useI18n, LOCALES, type Locale } from "./I18nContext";

/* Bandeiras em SVG inline: emojis de bandeira não renderizam no Windows. */

function FlagBR() {
  return (
    <svg viewBox="0 0 28 20" width="28" height="20" aria-hidden="true">
      <rect width="28" height="20" fill="#009c3b" />
      <polygon points="14,2.5 25.5,10 14,17.5 2.5,10" fill="#ffdf00" />
      <circle cx="14" cy="10" r="4.6" fill="#002776" />
      <path d="M9.6 9.2 Q14 7.6 18.4 10.6" stroke="#fff" strokeWidth="0.9" fill="none" />
    </svg>
  );
}

function FlagUS() {
  const stripes = Array.from({ length: 13 }, (_, i) => i);
  const h = 20 / 13;
  return (
    <svg viewBox="0 0 28 20" width="28" height="20" aria-hidden="true">
      {stripes.map((i) => (
        <rect key={i} y={i * h} width="28" height={h + 0.05} fill={i % 2 === 0 ? "#b22234" : "#fff"} />
      ))}
      <rect width="11.2" height={h * 7} fill="#3c3b6e" />
      {[0, 1, 2, 3].map((row) =>
        [0, 1, 2, 3, 4].map((col) => (
          <circle
            key={`${row}-${col}`}
            cx={1.3 + col * 2.15 + (row % 2) * 1.05}
            cy={1.4 + row * 2.4}
            r="0.45"
            fill="#fff"
          />
        ))
      )}
    </svg>
  );
}

function FlagES() {
  return (
    <svg viewBox="0 0 28 20" width="28" height="20" aria-hidden="true">
      <rect width="28" height="20" fill="#aa151b" />
      <rect y="5" width="28" height="10" fill="#f1bf00" />
    </svg>
  );
}

const FLAGS: Record<Locale, () => React.ReactElement> = {
  "pt-BR": FlagBR,
  "en-US": FlagUS,
  es: FlagES,
};

export default function LanguageSwitcher({ style }: { style?: React.CSSProperties }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t("common.language.label")}
      className="language-switcher"
      style={{
        position: "fixed",
        top: 14,
        right: 18,
        zIndex: 300,
        display: "flex",
        gap: 6,
        padding: 5,
        borderRadius: 10,
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow)",
        ...style,
      }}
    >
      {LOCALES.map((code) => {
        const Flag = FLAGS[code];
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            title={t(`common.language.${code}`)}
            aria-label={t(`common.language.${code}`)}
            aria-pressed={active}
            style={{
              display: "flex",
              padding: 2,
              borderRadius: 5,
              cursor: "pointer",
              background: "none",
              border: active ? "2px solid var(--accent, #bd4140)" : "2px solid transparent",
              opacity: active ? 1 : 0.55,
              filter: active ? "none" : "grayscale(35%)",
              transition: "opacity 0.15s ease, filter 0.15s ease, border-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.filter = "none";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = active ? "1" : "0.55";
              e.currentTarget.style.filter = active ? "none" : "grayscale(35%)";
            }}
          >
            <span style={{ display: "flex", borderRadius: 2, overflow: "hidden" }}>
              <Flag />
            </span>
          </button>
        );
      })}
      <style>{`
        @media (max-width: 768px) {
          .language-switcher { top: 12px !important; right: 12px !important; }
        }
      `}</style>
    </div>
  );
}
