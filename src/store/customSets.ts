import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from './storage';

export type CustomSet = { id: string; name: string; chars: string[]; createdAt: number };

type CustomSetsStore = {
  sets: CustomSet[];
  create: (name: string, chars: string[]) => string;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  addChars: (id: string, chars: string[]) => void;
  removeChar: (id: string, char: string) => void;
  moveChar: (id: string, from: number, to: number) => void;
};

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export const useCustomSets = create<CustomSetsStore>()(
  persist(
    (set) => {
      const updateSet = (id: string, fn: (s: CustomSet) => Partial<CustomSet>) =>
        set((state) => ({ sets: state.sets.map((s) => (s.id === id ? { ...s, ...fn(s) } : s)) }));

      return {
        sets: [],
        create: (name, chars) => {
          const id = newId();
          set((state) => ({
            sets: [...state.sets, { id, name, chars: [...new Set(chars)], createdAt: Date.now() }],
          }));
          return id;
        },
        rename: (id, name) => updateSet(id, () => ({ name })),
        remove: (id) => set((state) => ({ sets: state.sets.filter((s) => s.id !== id) })),
        addChars: (id, chars) =>
          updateSet(id, (s) => ({ chars: [...new Set([...s.chars, ...chars])] })),
        removeChar: (id, char) =>
          updateSet(id, (s) => ({ chars: s.chars.filter((c) => c !== char) })),
        moveChar: (id, from, to) => updateSet(id, (s) => ({ chars: moveItem(s.chars, from, to) })),
      };
    },
    { name: 'custom-sets', storage: persistStorage, version: 1 },
  ),
);
