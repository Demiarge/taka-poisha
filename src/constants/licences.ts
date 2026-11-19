import { APACHE_2_TEXT, MIT_TEXT, OFL_1_1_TEXT } from '@/constants/licenceTexts';

/** Exact wording required by Gemma Terms of Use section 3.1. Keep in sync with NOTICE.txt. */
export const GEMMA_NOTICE =
  'Gemma is provided under and subject to the Gemma Terms of Use found at ai.google.dev/gemma/terms';

/** The app's own code. Model files have their own terms, in the LICENSE file. */
export const APP_SOURCE = { label: 'github.com/Demiarge/taka-poisha', url: 'https://github.com/Demiarge/taka-poisha' };

export const GEMMA_MODIFIED =
  'This app includes a modified version of Gemma 3 270M IT. It was fine-tuned to read money notes and receipts.';

export const GEMMA_USE_RESTRICTION =
  "By using this app you agree not to use the model for anything in Gemma's Prohibited Use Policy.";

export const GEMMA_LINKS = [
  { label: 'Gemma Terms of Use', url: 'https://ai.google.dev/gemma/terms' },
  { label: 'Gemma Prohibited Use Policy', url: 'https://ai.google.dev/gemma/prohibited_use_policy' },
];

export type Licence = {
  name: string;
  use: string;
  licence: string;
  copyright?: string;
  url: string;
  /** Full licence text; absent when the terms are only linked. */
  text?: string;
};

export const LICENCES: Licence[] = [
  {
    name: 'all-MiniLM-L6-v2',
    use: 'Matches category names. By sentence-transformers; GGUF conversion by second-state.',
    licence: 'Apache-2.0',
    url: 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2',
    text: APACHE_2_TEXT,
  },
  {
    name: 'ML Kit Text Recognition',
    use: 'Reads receipt photos on the phone. By Google.',
    licence: 'ML Kit Terms',
    url: 'https://developers.google.com/ml-kit/terms',
  },
  {
    name: 'llama.rn',
    use: 'Runs the AI models on the phone.',
    licence: 'MIT',
    copyright: 'Copyright (c) 2023 Jhen-Jie Hong',
    url: 'https://github.com/mybigday/llama.rn',
    text: MIT_TEXT,
  },
  {
    name: 'llama.cpp',
    use: 'Part of llama.rn.',
    licence: 'MIT',
    copyright: 'Copyright (c) 2023-2026 The ggml authors',
    url: 'https://github.com/ggml-org/llama.cpp',
    text: MIT_TEXT,
  },
  {
    name: 'codec.cpp',
    use: 'Part of llama.rn.',
    licence: 'MIT',
    copyright: 'Copyright (c) 2026 codec.cpp contributors',
    url: 'https://github.com/mybigday/codec.cpp',
    text: MIT_TEXT,
  },
  {
    name: 'Inter',
    use: 'The app font.',
    licence: 'SIL Open Font License 1.1',
    copyright: 'Copyright 2020 The Inter Project Authors (https://github.com/rsms/inter)',
    url: 'https://github.com/rsms/inter',
    text: OFL_1_1_TEXT,
  },
  {
    name: 'Ionicons',
    use: 'The app icons, through @expo/vector-icons.',
    licence: 'MIT',
    copyright:
      'Copyright (c) 2015-present Ionic (http://ionic.io/)\nCopyright (c) 2015 Joel Arvidsson\nCopyright (c) 2020 650 Industries',
    url: 'https://github.com/ionic-team/ionicons',
    text: MIT_TEXT,
  },
  {
    name: 'SheetJS Community Edition',
    use: 'Reads and writes Excel files for export and import.',
    licence: 'Apache-2.0',
    copyright: 'Copyright (C) 2012-present SheetJS LLC',
    url: 'https://sheetjs.com',
    text: APACHE_2_TEXT,
  },
  {
    name: 'React Native and Expo',
    use: 'The app framework.',
    licence: 'MIT',
    copyright: 'Copyright (c) Meta Platforms, Inc. and affiliates.\nCopyright (c) 2015-present 650 Industries, Inc. (aka Expo)',
    url: 'https://github.com/expo/expo',
    text: MIT_TEXT,
  },
];
