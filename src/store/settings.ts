import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Leniency } from '@/tracing/matcher';

import { persistStorage } from './storage';

export type Settings = {
  /** Faint outline of the character to trace over. Off = write from memory. */
  showOutline: boolean;
  /** Play the stroke-order animation before tracing each character. */
  showDemo: boolean;
  /** Animate the correct stroke after this many misses on it. */
  hintAfterMisses: number;
  leniency: Leniency;
  haptics: boolean;
  /** Speaking rate for pronunciation (1 = normal). */
  speechRate: number;
  /** Say the character aloud when it's completed. */
  autoSpeak: boolean;
};

type SettingsStore = Settings & {
  update: (patch: Partial<Settings>) => void;
};

export const DEFAULT_SETTINGS: Settings = {
  showOutline: true,
  showDemo: true,
  hintAfterMisses: 3,
  leniency: 'normal',
  haptics: true,
  speechRate: 0.8,
  autoSpeak: true,
};

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
    }),
    { name: 'settings', storage: persistStorage, version: 1 },
  ),
);
