import type { SQLiteDatabase } from 'expo-sqlite';

import { recognizeText } from '../../modules/receipt-ocr';

import { readReceiptWithApi } from '@/services/apiReader';
import { finishAnswer, parseTransaction } from '@/services/parseTransaction';
import { completeRead, promptCategories, type ReadTransaction } from '@/services/readTransaction';
import type { CategoryNote } from '@/types/transaction';
import { formatAmount, isValidIsoDate, toIsoDate } from '@/utils/format';
import { boxesToRows, trimReceipt } from '@/utils/ocrRows';
import { findBillTotal, labelForAmount } from '@/utils/receiptAmount';
import { checkReceiptItem, cleanOcrText, findReceiptDate, findShop } from '@/utils/receiptText';

export type ReceiptRead = ReadTransaction & {
  receiptText: string;
  amountNote: CategoryNote | null;
  dateNote: CategoryNote | null;
};

/** Receipts are always expenses, so the "you picked" note doesn't apply. */
const RECEIPT_TYPE = 'expense';

/** The printed bill total beats the model's amount; the note says what was replaced, with Undo. */
function checkAmount(read: ReadTransaction, text: string): Pick<ReceiptRead, 'amount' | 'amountNote'> {
  const total = findBillTotal(text);
  const said = read.amount;
  if (!total || (said !== null && Math.abs(said - total.amount) < 0.005)) {
    return { amount: said, amountNote: null };
  }
  const replacedLabel = said !== null ? labelForAmount(text, said) : null;
  const replaced = said !== null ? `, not ${replacedLabel ? `${replacedLabel} ` : ''}${formatAmount(said)}` : '';
  return {
    amount: total.amount,
    amountNote: {
      text: `Used ${total.label} ${formatAmount(total.amount)}${replaced}`,
      actionLabel: 'Undo',
      value: said !== null ? String(said) : '',
      shownFor: String(total.amount),
    },
  };
}

/** Date printed on the receipt (read day first), then the model's, then today with a note. */
function checkDate(read: ReadTransaction, text: string): Pick<ReceiptRead, 'date' | 'dateNote'> {
  const today = toIsoDate(new Date());
  const modelDate = read.rawAnswer.date;
  const date =
    findReceiptDate(text, today) ?? (modelDate && isValidIsoDate(modelDate) && modelDate <= today ? modelDate : null);
  if (date) {
    return { date, dateNote: null };
  }
  return { date: today, dateNote: { text: 'Date not found on receipt', value: '', shownFor: today } };
}

/** Photo → on-phone OCR → Gemma → category, shop, item, date and amount checks. Nothing leaves the phone. */
export async function readReceiptPhoto(db: SQLiteDatabase, photoUri: string): Promise<ReceiptRead> {
  const rows = cleanOcrText(boxesToRows(await recognizeText(photoUri)).join('\n'))
    .split('\n')
    .filter((row) => row.trim());
  if (rows.length === 0) {
    throw new Error('No text was found in this photo.');
  }
  const text = trimReceipt(rows);
  const categories = await promptCategories(db);
  const read = await completeRead(db, await parseTransaction(text, categories, RECEIPT_TYPE), categories);
  const shop = findShop(rows, read.shop);
  return {
    ...read,
    typeOverridden: false,
    shop,
    item: checkReceiptItem(read.item, text, rows, shop),
    ...checkDate(read, text),
    ...checkAmount(read, text),
    receiptText: text,
  };
}

/** The same steps with the user's own API instead of Gemma, only when they tap the button. */
export async function readReceiptWithUserApi(db: SQLiteDatabase, photoUri: string, receiptText: string): Promise<ReceiptRead> {
  const categories = await promptCategories(db);
  const answer = await readReceiptWithApi(photoUri, categories);
  const read = await completeRead(db, finishAnswer(answer, receiptText, categories, 'api', RECEIPT_TYPE), categories);
  // The API sees the photo, so its item stands; date and shop get the same checks as on the phone.
  return {
    ...read,
    typeOverridden: false,
    shop: findShop(receiptText.split('\n'), read.shop),
    ...checkDate(read, receiptText),
    ...checkAmount(read, receiptText),
    receiptText,
  };
}
