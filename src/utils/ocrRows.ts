export type TextBox = { text: string; left: number; top: number; right: number; bottom: number };

/** The receipt text Gemma can take: about 1,500 characters leaves room for the prompt and answer in 1,024 tokens. */
const MAX_RECEIPT_CHARS = 1500;
const KEEP_TOP_ROWS = 6;

/**
 * Puts OCR pieces back into printed rows: pieces whose middles sit at about the same height join left to right,
 * so "Net Payable" and "2,205.00" in two columns become one line.
 */
export function boxesToRows(boxes: TextBox[]): string[] {
  const rows: TextBox[][] = [];
  for (const box of [...boxes].sort((a, b) => a.top - b.top)) {
    const middle = (box.top + box.bottom) / 2;
    const height = box.bottom - box.top;
    const row = rows.at(-1);
    const first = row?.[0];
    if (row && first && Math.abs(middle - (first.top + first.bottom) / 2) < Math.min(height, first.bottom - first.top) / 2) {
      row.push(box);
    } else {
      rows.push([box]);
    }
  }
  return rows.map((row) =>
    row
      .sort((a, b) => a.left - b.left)
      .map((box) => box.text.trim())
      .join('  '),
  );
}

/** Long receipts keep the top rows (shop name) and the bottom rows (totals); item lines in the middle go first. */
export function trimReceipt(rows: string[]): string {
  const full = rows.join('\n');
  if (full.length <= MAX_RECEIPT_CHARS) {
    return full;
  }
  const top = rows.slice(0, KEEP_TOP_ROWS);
  const bottom: string[] = [];
  let length = top.join('\n').length + 4;
  for (let i = rows.length - 1; i >= KEEP_TOP_ROWS; i--) {
    if (length + rows[i].length + 1 > MAX_RECEIPT_CHARS) break;
    bottom.unshift(rows[i]);
    length += rows[i].length + 1;
  }
  return [...top, '…', ...bottom].join('\n');
}
