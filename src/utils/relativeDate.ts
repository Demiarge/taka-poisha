import { isValidIsoDate, toIsoDate } from '@/utils/format';

const DAYS_AGO = /\b(\d{1,2})\s*(din|days?)\s+(age|ago)\b/i;

// Checked in order. "kal" can mean tomorrow too, but a spending record is almost always in the past.
const RULES: [RegExp, number][] = [
  [/\b(porshu|parshu|porshudin|possu|possudin)\b/i, 2],
  [/\b(gotokal|gotkal|kalke|kal|yesterday|last night)\b/i, 1],
];

// Whole words and phrases only; longer phrases first so "kal raate" goes before "kal".
const DATE_WORDS = [
  /\b(aj|ajke|aaj|aajke|kal|gotokal|gotkal)\s+(raate?|rate|shokale|sokale|dupure|bikele)\b/gi,
  /\b(\d{1,2}\s*)?(din|days?)\s+(age|ago)\b/gi,
  /\b(porshu|parshu|porshudin|possu|possudin|gotokal|gotkal|kalke|kal|yesterday|last night)\b/gi,
  /\b(ajke|aajke|aaj|aj|today|tonight|this morning)\b/gi,
];

/** How many days ago the text says, or 0 (today) when it doesn't say. */
export function daysAgoFromText(text: string): number {
  const match = text.match(DAYS_AGO);
  if (match) {
    return Number(match[1]);
  }
  return RULES.find(([pattern]) => pattern.test(text))?.[1] ?? 0;
}

/** The model's date if it's real and not in the future, otherwise the date the text describes. */
export function resolveDate(modelDate: string | null, text: string, now = new Date()): string {
  const today = toIsoDate(now);
  if (modelDate && isValidIsoDate(modelDate) && modelDate <= today) {
    return modelDate;
  }
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgoFromText(text));
  return toIsoDate(date);
}

/** "din age kacchi" → "kacchi". Keeps the original if nothing else would be left. */
export function removeDateWords(item: string): string {
  const cleaned = DATE_WORDS.reduce((text, pattern) => text.replace(pattern, ' '), item)
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || item;
}
