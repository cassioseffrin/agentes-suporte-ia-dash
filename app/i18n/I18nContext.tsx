"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  Fragment,
  ReactNode,
} from "react";
import { dictionaries, type Dictionary } from "./messages";

export type Locale = "pt-BR" | "en-US" | "es";

export const LOCALES: Locale[] = ["pt-BR", "en-US", "es"];
export const DEFAULT_LOCALE: Locale = "pt-BR";
const STORAGE_KEY = "locale";

/** Todas as chaves válidas no formato "namespace.chave" (ex.: "sidebar.dashboard"). */
type Paths<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];

export type TranslationKey = Paths<Dictionary>;
export type TranslationParams = Record<string, string | number | null | undefined>;

function lookup(dict: unknown, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof node === "string" ? node : undefined;
}

function interpolate(text: string, params?: TranslationParams): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    name in params ? String(params[name] ?? "") : match
  );
}

export function translate(locale: Locale, key: TranslationKey, params?: TranslationParams): string {
  const text = lookup(dictionaries[locale], key) ?? lookup(dictionaries[DEFAULT_LOCALE], key) ?? key;
  return interpolate(text, params);
}

/**
 * Como translate, mas permite inserir elementos React nos marcadores {nome}.
 * Ex.: tr("doc.note", { code: <code>x</code> }) com o texto "Veja {code} aqui".
 */
export function translateRich(
  locale: Locale,
  key: TranslationKey,
  nodes: Record<string, ReactNode>
): ReactNode {
  const text = translate(locale, key);
  const parts = text.split(/\{(\w+)\}/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <Fragment key={i}>{part in nodes ? nodes[part] : `{${part}}`}</Fragment> : part
  );
}

function preciseDateTime(locale: Locale, value?: string | number | Date | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: false,
  });
}

function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as string[]).includes(value);
}

/* ---- Store do idioma (localStorage + memória), lido via useSyncExternalStore ---- */

let memoryLocale: Locale = DEFAULT_LOCALE;
const listeners = new Set<() => void>();

export function getStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // localStorage indisponível
  }
  return memoryLocale;
}

function storeLocale(next: Locale) {
  memoryLocale = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // localStorage indisponível: fica só em memória
  }
  listeners.forEach((listener) => listener());
}

function subscribeLocale(listener: () => void) {
  listeners.add(listener);
  // Mantém abas abertas sincronizadas ao trocar o idioma em outra aba
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  /** Tradução com elementos React nos marcadores {nome}. */
  tr: (key: TranslationKey, nodes: Record<string, ReactNode>) => ReactNode;
  /** Formata data/hora no idioma atual. */
  formatDateTime: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
  /** Data/hora com segundos e milissegundos (usada nas mensagens do chat). */
  formatPreciseDateTime: (value?: string | number | Date | null) => string;
  /** Formata número no idioma atual. */
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key, params) => translate(DEFAULT_LOCALE, key, params),
  tr: (key, nodes) => translateRich(DEFAULT_LOCALE, key, nodes),
  formatDateTime: (value, options) => new Date(value).toLocaleString(DEFAULT_LOCALE, options),
  formatNumber: (value, options) => value.toLocaleString(DEFAULT_LOCALE, options),
  formatPreciseDateTime: (value) => preciseDateTime(DEFAULT_LOCALE, value),
});

export function I18nProvider({ children }: { children: ReactNode }) {
  // No servidor (e na hidratação) usa o padrão; depois lê o idioma salvo
  const locale = useSyncExternalStore(subscribeLocale, getStoredLocale, () => DEFAULT_LOCALE);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => storeLocale(next), []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
      tr: (key, nodes) => translateRich(locale, key, nodes),
      formatDateTime: (value, options) => new Date(value).toLocaleString(locale, options),
      formatNumber: (value, options) => value.toLocaleString(locale, options),
      formatPreciseDateTime: (value) => preciseDateTime(locale, value),
    }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
