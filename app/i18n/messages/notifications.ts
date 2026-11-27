import { defineMessages } from "../defineMessages";

export default defineMessages({
  "pt-BR": {
    newChatTitle: "Nova Conversa Iniciada!",
    client: "Cliente:",
    agent: "Agente:",
    unknownClient: "Cliente desconhecido",
    defaultAgent: "Agente",
    /** Texto falado pelo TTS ao chegar um novo chat */
    ttsNewChat: "cliente: {client}, {agent}, {message}",
    ttsAbbreviated: "{text}, ... abreviado.",
  },
  "en-US": {
    newChatTitle: "New Conversation Started!",
    client: "Customer:",
    agent: "Agent:",
    unknownClient: "Unknown customer",
    defaultAgent: "Agent",
    ttsNewChat: "customer: {client}, {agent}, {message}",
    ttsAbbreviated: "{text}, ... abbreviated.",
  },
  es: {
    newChatTitle: "¡Nueva Conversación Iniciada!",
    client: "Cliente:",
    agent: "Agente:",
    unknownClient: "Cliente desconocido",
    defaultAgent: "Agente",
    ttsNewChat: "cliente: {client}, {agent}, {message}",
    ttsAbbreviated: "{text}, ... abreviado.",
  },
});
