export interface ParsedEmoji {
  animated: boolean;
  name: string | null;
  id: string | null;
}

const CUSTOM_EMOJI_MENTION = /<(a)?:(\w{2,32}):(\d{17,19})>/;

/**
 * Parses a custom emoji mention (`<:name:id>` / `<a:name:id>`) or a bare
 * unicode emoji out of arbitrary text. Returns null for text that's neither
 * — e.g. a plain word, or a mention missing its id.
 */
export function parseEmoji(text: string): ParsedEmoji | null {
  const match = text.match(CUSTOM_EMOJI_MENTION);
  if (match) return { animated: Boolean(match[1]), name: match[2], id: match[3] };
  if (text.length > 0 && !text.includes(":") && !text.includes("<")) {
    return { animated: false, name: text, id: null };
  }
  return null;
}

export interface PartialEmoji {
  id: string | null;
  name: string | null;
  animated?: boolean;
}

/**
 * Resolves an emoji in any of the shapes Discord's REST/gateway payloads
 * accept it as — a raw snowflake id, a mention string, a bare unicode
 * emoji, or an already-partial object — into the `{id, name, animated}`
 * shape reaction/component endpoints expect. Returns null if nothing usable
 * could be extracted.
 */
export function resolvePartialEmoji(
  emoji: string | PartialEmoji | { id: string | null; name: string | null; animated?: boolean },
): PartialEmoji | null {
  if (typeof emoji !== "string") {
    if (!emoji.id && !emoji.name) return null;
    return { id: emoji.id ?? null, name: emoji.name ?? null, animated: emoji.animated };
  }
  if (/^\d{17,19}$/.test(emoji)) return { id: emoji, name: null };
  return parseEmoji(emoji);
}
