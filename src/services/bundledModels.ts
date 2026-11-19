import { Directory, File, Paths } from 'expo-file-system';

import BUNDLED_MODELS from '@/constants/bundledModels.json';

// llama.rn on Android needs a real file path, so the models are copied out of the APK once.
const ASSET_DIR = 'asset:///models';
const PROGRESS_INTERVAL_MS = 250;

export class NotEnoughSpaceError extends Error {
  constructor(
    readonly neededBytes: number,
    readonly freeBytes: number,
  ) {
    super('Not enough free space to set up the models');
  }
}

function installedFile(file: string): File {
  return new File(Paths.document, file);
}

function isInstalled({ file, bytes }: { file: string; bytes: number }): boolean {
  const installed = installedFile(file);
  return installed.exists && installed.size === bytes;
}

/** Synchronous, so a later launch decides before the first frame and never shows the setup screen. */
export function modelsNeedSetup(): boolean {
  return !BUNDLED_MODELS.every(isInstalled);
}

/** Old model versions and half-finished copies. */
function removeStaleFiles() {
  const keep = new Set(BUNDLED_MODELS.map((model) => model.file));
  for (const entry of new Directory(Paths.document).list()) {
    if (entry instanceof File && /\.gguf(\.part)?$/.test(entry.name) && !keep.has(entry.name)) {
      entry.delete();
    }
  }
}

/** Copies any missing model, reporting real progress (0-1) from the bytes written so far. */
export async function setUpModels(onProgress: (fraction: number) => void): Promise<void> {
  const missing = BUNDLED_MODELS.filter((model) => !isInstalled(model));
  const totalBytes = missing.reduce((sum, model) => sum + model.bytes, 0);

  // A wrong-sized copy is replaced, so its space comes back.
  const reclaimable = missing.reduce((sum, model) => {
    const installed = installedFile(model.file);
    return sum + (installed.exists ? installed.size : 0);
  }, 0);
  const freeBytes = Paths.availableDiskSpace + reclaimable;
  if (freeBytes < totalBytes) {
    throw new NotEnoughSpaceError(totalBytes, freeBytes);
  }

  let doneBytes = 0;
  for (const { file, bytes } of missing) {
    const part = installedFile(`${file}.part`);
    if (part.exists) {
      part.delete();
    }
    const target = installedFile(file);
    if (target.exists) {
      target.delete();
    }

    const timer = setInterval(() => {
      onProgress((doneBytes + (part.exists ? part.size : 0)) / totalBytes);
    }, PROGRESS_INTERVAL_MS);
    try {
      await new File(`${ASSET_DIR}/${file}`).copy(part);
    } finally {
      clearInterval(timer);
    }

    if (part.size !== bytes) {
      part.delete();
      throw new Error(`${file} copied as ${part.size} bytes, expected ${bytes}`);
    }
    // Renamed only once complete, so a killed app never leaves a short file under the real name.
    await part.move(target);
    doneBytes += bytes;
    onProgress(doneBytes / totalBytes);
  }

  removeStaleFiles();
}
