export const bold = (text: string): string => `**${text}**`;
export const italic = (text: string): string => `*${text}*`;
export const underline = (text: string): string => `__${text}__`;
export const strikethrough = (text: string): string => `~~${text}~~`;
export const spoiler = (text: string): string => `||${text}||`;
export const inlineCode = (text: string): string => `\`${text}\``;
export const codeBlock = (text: string, language = ""): string => `\`\`\`${language}\n${text}\n\`\`\``;
export const blockQuote = (text: string): string =>
  text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
export const hyperlink = (text: string, url: string): string => `[${text}](${url})`;

export const userMention = (id: string): string => `<@${id}>`;
export const roleMention = (id: string): string => `<@&${id}>`;
export const channelMention = (id: string): string => `<#${id}>`;

export type TimestampStyle = "t" | "T" | "d" | "D" | "f" | "F" | "R";

export function time(date: Date | number, style?: TimestampStyle): string {
  const seconds = Math.floor((date instanceof Date ? date.getTime() : date) / 1000);
  return style ? `<t:${seconds}:${style}>` : `<t:${seconds}>`;
}

export function cleanCodeBlockContent(text: string): string {
  return text.replace(/```/g, "​`​`​`");
}

/** Escapes markdown-significant characters and zero-widths out @everyone/@here so a string is safe to echo back verbatim. */
export function cleanContent(text: string): string {
  return text
    .replace(/@(everyone|here)/g, "@​$1")
    .replace(/<@!?(\d+)>/g, "@$1")
    .replace(/<#(\d+)>/g, "#$1")
    .replace(/<@&(\d+)>/g, "@$1");
}
