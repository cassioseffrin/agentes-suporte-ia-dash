import common from "./common";
import sidebar from "./sidebar";
import login from "./login";
import testAgents from "./testAgents";
import architecture from "./architecture";
import widgetDocs from "./widgetDocs";
import notifications from "./notifications";
import feedbacks from "./feedbacks";
import dashboard from "./dashboard";
import chatAudit from "./chatAudit";
import chat from "./chat";
import agents from "./agents";
import renewAuth from "./renewAuth";

/** Namespaces registrados. Para adicionar uma tela: crie o arquivo e registre aqui. */
const namespaces = {
  common,
  sidebar,
  login,
  testAgents,
  architecture,
  widgetDocs,
  notifications,
  feedbacks,
  dashboard,
  chatAudit,
  chat,
  agents,
  renewAuth,
};

type Namespaces = typeof namespaces;
type LocaleCode = keyof Namespaces["common"];

export type Dictionary = { [N in keyof Namespaces]: Namespaces[N]["pt-BR"] };

function build(locale: LocaleCode): Dictionary {
  return Object.fromEntries(
    Object.entries(namespaces).map(([name, messages]) => [name, messages[locale]])
  ) as Dictionary;
}

export const dictionaries: Record<LocaleCode, Dictionary> = {
  "pt-BR": build("pt-BR"),
  "en-US": build("en-US"),
  es: build("es"),
};
