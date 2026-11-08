import * as SecureStore from 'expo-secure-store';
import Storage from 'expo-sqlite/kv-store';

/** The optional online reader for receipts. Any provider with an OpenAI-compatible chat API works. */
export type ApiSettings = {
  name: string;
  address: string;
  model: string;
  /** Only the end of the key is ever shown. */
  keyEnding: string | null;
};

const FIELDS_KEY = 'api-settings';
// The key itself lives only in SecureStore (Keystore-encrypted, left out of backups).
const SECRET_KEY = 'api-key';
const CONSENT_KEY = 'api-consent';

type StoredFields = Pick<ApiSettings, 'name' | 'address' | 'model'>;

function readFields(): StoredFields {
  try {
    const stored = Storage.getItemSync(FIELDS_KEY);
    return stored ? { name: '', address: '', model: '', ...JSON.parse(stored) } : { name: '', address: '', model: '' };
  } catch {
    return { name: '', address: '', model: '' };
  }
}

export async function getApiSettings(): Promise<ApiSettings> {
  const key = await SecureStore.getItemAsync(SECRET_KEY);
  return { ...readFields(), keyEnding: key ? key.slice(-4) : null };
}

/** The key, for the request header only. */
export function getApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(SECRET_KEY);
}

/** An empty `key` keeps the saved one, so the field can stay blank when only other fields change. */
export async function saveApiSettings(fields: StoredFields, key: string): Promise<void> {
  Storage.setItemSync(FIELDS_KEY, JSON.stringify(fields));
  if (key.trim()) {
    await SecureStore.setItemAsync(SECRET_KEY, key.trim());
  }
}

export async function deleteApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(SECRET_KEY);
}

/** Ready to use only when the address, model and key are all saved. */
export function isApiReady(settings: ApiSettings): boolean {
  return settings.address.trim() !== '' && settings.model.trim() !== '' && settings.keyEnding !== null;
}

/** "Read with [Name]", falling back to the model name. */
export function apiButtonLabel(settings: ApiSettings): string {
  return `Read with ${settings.name.trim() || settings.model.trim()}`;
}

export function hasApiConsent(): boolean {
  return Storage.getItemSync(CONSENT_KEY) === 'yes';
}

export function giveApiConsent(): void {
  Storage.setItemSync(CONSENT_KEY, 'yes');
}

/** The service's own error text; some services send the body as a list: [{"error":{...}}]. */
function serviceMessage(body: string): string | null {
  try {
    const parsed = JSON.parse(body);
    const first = Array.isArray(parsed) ? parsed[0] : parsed;
    const message = first?.error?.message ?? first?.message;
    return typeof message === 'string' ? message.slice(0, 120) : null;
  } catch {
    return null;
  }
}

// Models that can't read a receipt photo into text.
const NOT_TEXT_MODELS = /(tts|audio|image|live|embedding)/i;

/**
 * Model ids from GET [address]/models, for picking instead of typing. Uses the typed key, or the saved one
 * when the key field is empty. Throws a short message the screen can show.
 */
export async function listModels(address: string, typedKey: string): Promise<string[]> {
  const key = typedKey.trim() || (await getApiKey());
  if (!key || !isValidApiAddress(address)) {
    throw new Error('Fill in the API address and key first.');
  }
  let response: Response;
  try {
    response = await fetch(`${address.trim().replace(/\/+$/, '')}/models`, {
      headers: { Authorization: `Bearer ${key}` },
    });
  } catch {
    throw new Error("Couldn't reach the service. Check the address and your internet.");
  }
  const bodyText = await response.text();
  // Dev builds only, and only the reply: never the request, its headers or the key.
  if (__DEV__) console.log(`Model list reply (${response.status}):`, bodyText.slice(0, 2000));
  if (!response.ok) {
    const message = serviceMessage(bodyText);
    throw new Error(
      `Couldn't load the model list (error ${response.status}${message ? `: ${message}` : ''}). Type the model name instead.`,
    );
  }
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = null;
  }
  const ids: unknown[] = Array.isArray(body?.data) ? body.data.map((model: { id?: unknown }) => model?.id) : [];
  const names = ids
    .filter((id): id is string => typeof id === 'string')
    .map((id) => id.replace(/^models\//, ''))
    .filter((id) => !NOT_TEXT_MODELS.test(id));
  if (names.length === 0) {
    throw new Error('The service listed no usable models. Type the model name instead.');
  }
  return [...new Set(names)].sort();
}

/** Only https, so the key is never sent unencrypted. */
export function isValidApiAddress(address: string): boolean {
  try {
    return new URL(address.trim()).protocol === 'https:';
  } catch {
    return false;
  }
}
