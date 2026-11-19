import * as SheetJS from 'xlsx/dist/xlsx.mini.min';

type SheetJSLib = typeof SheetJS;

/** SheetJS's mini build (xlsx and csv only). Node puts this CommonJS build under `default`; Metro doesn't. */
export const XLSX: SheetJSLib = (SheetJS as SheetJSLib & { default?: SheetJSLib }).default ?? SheetJS;
