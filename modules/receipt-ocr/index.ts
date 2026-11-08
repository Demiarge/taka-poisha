import { requireNativeModule } from 'expo-modules-core';

export type OcrLine = { text: string; left: number; top: number; right: number; bottom: number };

type ReceiptOcrModule = { recognize(uri: string): Promise<OcrLine[]> };

const ReceiptOcr = requireNativeModule<ReceiptOcrModule>('ReceiptOcr');

/** Reads the text in a photo on the phone with ML Kit's bundled Latin model. */
export function recognizeText(uri: string): Promise<OcrLine[]> {
  return ReceiptOcr.recognize(uri);
}
