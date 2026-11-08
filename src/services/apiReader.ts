import { File } from 'expo-file-system';

import type { CategoryLists } from '@/constants/model';
import { getApiKey, getApiSettings, isApiReady, isValidApiAddress } from '@/services/apiSettings';
import type { ModelAnswer } from '@/services/parseTransaction';

const TIMEOUT_MS = 45_000;
// Thinking models spend part of this on hidden reasoning before the JSON.
const MAX_TOKENS = 2000;
const BUSY_RETRY_MS = 3000;

// The API model wasn't fine-tuned, so the prompt spells out each field.
function instructions(categories: CategoryLists): string {
  return [
    'Extract the money transaction from this receipt photo as JSON with exactly these keys:',
    'type: "expense".',
    'amount: the final amount to pay as a number (net payable or total after discounts and VAT), not the cash given or change; null if unreadable.',
    'currency: 3-letter code, BDT if unsure.',
    'item: a short description of what was bought.',
    'shop: the shop name, or null.',
    'date: the receipt date as YYYY-MM-DD, or null.',
    'category: one of these expense categories if one fits, otherwise a short new name.',
    `Expense categories: ${categories.expense.join(', ')}`,
    'is_new_category: true if category is not in that list.',
    'Reply with the JSON only.',
  ].join('\n');
}

const SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'transaction',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['type', 'amount', 'currency', 'item', 'shop', 'date', 'category', 'is_new_category'],
      properties: {
        type: { type: 'string', enum: ['income', 'expense'] },
        amount: { type: ['number', 'null'] },
        currency: { type: 'string' },
        item: { type: 'string' },
        shop: { type: ['string', 'null'] },
        date: { type: ['string', 'null'] },
        category: { type: 'string' },
        is_new_category: { type: 'boolean' },
      },
    },
  },
};

/** The first JSON object in a reply, as the Colab tests read answers. */
function extractJson(text: string): Record<string, unknown> | null {
  for (let start = text.indexOf('{'); start !== -1; start = text.indexOf('{', start + 1)) {
    for (let end = text.lastIndexOf('}'); end > start; end = text.lastIndexOf('}', end - 1)) {
      try {
        const value = JSON.parse(text.slice(start, end + 1));
        if (value && typeof value === 'object' && !Array.isArray(value)) return value;
      } catch {
        // Try a shorter slice.
      }
    }
  }
  return null;
}

function toAnswer(data: Record<string, unknown>): ModelAnswer {
  const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);
  const amount = typeof data.amount === 'number' ? data.amount : Number(String(data.amount ?? '').replace(/,/g, ''));
  return {
    type: data.type === 'income' ? 'income' : 'expense',
    amount: Number.isFinite(amount) && amount > 0 ? amount : null,
    currency: /^[A-Za-z]{3}$/.test(String(data.currency ?? '')) ? String(data.currency).toUpperCase() : 'BDT',
    item: text(data.item) ?? '',
    shop: text(data.shop),
    date: text(data.date),
    category: text(data.category) ?? '',
  };
}

/** The error message from a reply body, which some services send as a list: [{"error":{...}}]. */
function errorMessage(body: string): string | null {
  try {
    const parsed = JSON.parse(body);
    const first = Array.isArray(parsed) ? parsed[0] : parsed;
    const message = first?.error?.message ?? first?.message;
    return typeof message === 'string' ? message.slice(0, 160) : null;
  } catch {
    return null;
  }
}

function describeStatus(status: number, label: string, message: string | null): string {
  if (status === 401 || status === 403) return 'The API key was refused. Check it in Settings → API.';
  if (status === 404) return "The API address or model name wasn't found. Check them in Settings → API.";
  if (status === 429 || status === 503) return `${label} is busy, try again in a minute.`;
  return `The service replied with error ${status}${message ? `: ${message}` : '.'}`;
}

/** Message content can be a string or a list of parts ([{ type: "text", text }]). */
function replyText(content: unknown): string | null {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const text = content
      .map((part) => (typeof part === 'string' ? part : typeof part?.text === 'string' ? part.text : ''))
      .join('');
    return text || null;
  }
  return null;
}

/**
 * Sends the receipt photo to the user's own OpenAI-compatible API, only when they tap the button.
 * Asks for a JSON schema first; if the service refuses that option, asks once more without it.
 */
export async function readReceiptWithApi(photoUri: string, categories: CategoryLists): Promise<ModelAnswer> {
  const settings = await getApiSettings();
  const key = await getApiKey();
  if (!isApiReady(settings) || !key || !isValidApiAddress(settings.address)) {
    throw new Error('Set up the API in Settings first.');
  }
  const image = await new File(photoUri).base64();
  const url = `${settings.address.trim().replace(/\/+$/, '')}/chat/completions`;

  async function send(withSchema: boolean): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: settings.model.trim(),
          temperature: 0,
          max_tokens: MAX_TOKENS,
          ...(withSchema ? { response_format: SCHEMA } : {}),
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: instructions(categories) },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } },
              ],
            },
          ],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      throw new Error(
        controller.signal.aborted ? `No answer within ${TIMEOUT_MS / 1000} s.` : "Couldn't reach the service. Check your internet.",
        { cause: error },
      );
    } finally {
      clearTimeout(timer);
    }
  }

  // Busy services get one more try after a short wait.
  async function sendWithRetry(withSchema: boolean): Promise<Response> {
    const response = await send(withSchema);
    if (response.status !== 429 && response.status !== 503) return response;
    await new Promise((resolve) => setTimeout(resolve, BUSY_RETRY_MS));
    return send(withSchema);
  }

  const label = settings.name.trim() || settings.model.trim();
  let response = await sendWithRetry(true);
  if (response.status === 400) {
    response = await sendWithRetry(false);
  }
  const bodyText = await response.text();
  // Dev builds only, and only the reply: never the request, its headers or the key.
  if (__DEV__) console.log(`API reply (${response.status}):`, bodyText.slice(0, 4000));
  if (!response.ok) {
    throw new Error(describeStatus(response.status, label, errorMessage(bodyText)));
  }
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    throw new Error("The service's answer wasn't in the expected format.");
  }
  const choice = body?.choices?.[0];
  const reply = replyText(choice?.message?.content);
  const data = reply ? extractJson(reply) : null;
  if (!data) {
    throw new Error(
      choice?.finish_reason === 'length'
        ? `${label} ran out of room before finishing the answer. Try again, or pick a model without long thinking.`
        : "The service's answer wasn't in the expected format.",
    );
  }
  return toAnswer(data);
}
