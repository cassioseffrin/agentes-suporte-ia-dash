/** Mesma estrutura de T, com todos os valores folha como string. */
export type Shape<T> = {
  [K in keyof T]: T[K] extends string ? string : Shape<T[K]>;
};

/**
 * Define as mensagens de um namespace nos três idiomas.
 * O pt-BR é a fonte da verdade: o TypeScript acusa erro se faltar (ou sobrar)
 * alguma chave em en-US ou es.
 */
export function defineMessages<T extends Record<string, unknown>>(messages: {
  "pt-BR": T;
  "en-US": Shape<NoInfer<T>>;
  es: Shape<NoInfer<T>>;
}) {
  return messages;
}
