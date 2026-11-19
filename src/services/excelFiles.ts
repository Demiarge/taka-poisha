import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';

import { listExportRows, loadImportContext } from '@/db/excel';
import {
  buildWorkbook,
  checkFileSize,
  exportFileName,
  parseWorkbook,
  planImport,
  XLSX_MIME,
  type ExportRange,
  type ImportPlan,
  type ParsedWorkbook,
} from '@/utils/excel';
import { toIsoDate } from '@/utils/format';

export type ImportPreview = ParsedWorkbook & { plan: ImportPlan };

/** Saves the workbook and opens the share sheet. False when the range has no transactions. */
export async function exportToExcel(db: SQLiteDatabase, range: ExportRange): Promise<boolean> {
  const rows = await listExportRows(db, range);
  if (rows.length === 0) {
    return false;
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing isn’t available on this phone.');
  }
  // Only the latest export is kept.
  const folder = new Directory(Paths.cache, 'export');
  if (folder.exists) {
    folder.delete();
  }
  folder.create({ intermediates: true });
  const file = new File(folder, exportFileName(range));
  await file.write(buildWorkbook(rows));
  await Sharing.shareAsync(file.uri, {
    mimeType: XLSX_MIME,
    UTI: 'org.openxmlformats.spreadsheetml.sheet',
    dialogTitle: 'Export to Excel',
  });
  return true;
}

/** Null if the user cancels. Throws ImportError for a file refused as a whole. Nothing is written yet. */
export async function pickImportFile(db: SQLiteDatabase): Promise<ImportPreview | null> {
  const result = await DocumentPicker.getDocumentAsync({
    // Some file apps label .xlsx as plain binary; the contents are checked anyway.
    type: [XLSX_MIME, 'application/octet-stream'],
    copyToCacheDirectory: true,
  });
  if (result.canceled) {
    return null;
  }
  const asset = result.assets[0];
  const file = new File(asset.uri);
  try {
    checkFileSize(asset.size ?? file.size ?? 0);
    const parsed = parseWorkbook(await file.bytes(), toIsoDate(new Date()));
    const { existing, categories } = await loadImportContext(db, parsed.rows);
    return { ...parsed, plan: planImport(parsed.rows, existing, categories) };
  } finally {
    // The picker's copy in the cache; the bytes are already read.
    try {
      file.delete();
    } catch {
      // Already gone.
    }
  }
}
