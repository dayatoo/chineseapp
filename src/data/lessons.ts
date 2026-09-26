import type { CustomSet } from '@/store/customSets';

import { getHskInfos, getTopic, getTopicInfos, type Queryable } from './db';
import { buildTiers, hskName, type LessonRef } from './sets';

export type ResolvedLesson = { title: string; subtitle?: string; chars: string[] };

/** Turns a lesson reference from a route into its title and characters. */
export async function resolveLesson(
  db: Queryable,
  ref: LessonRef,
  customSets: CustomSet[],
  weak: string[],
): Promise<ResolvedLesson | null> {
  switch (ref.kind) {
    case 'custom': {
      const set = customSets.find((s) => s.id === ref.setId);
      return set ? { title: set.name, chars: set.chars } : null;
    }
    case 'review':
      return { title: 'Review', subtitle: 'Your weakest characters', chars: weak };
    case 'chars':
      return { title: ref.chars.join(''), chars: ref.chars };
    case 'topic':
    case 'hsk': {
      const infos =
        ref.kind === 'topic'
          ? await getTopicInfos(db, ref.topicId)
          : await getHskInfos(db, ref.level);
      const categoryId = ref.kind === 'topic' ? `topic-${ref.topicId}` : `hsk-${ref.level}`;
      const tier = buildTiers(categoryId, infos)[ref.tier];
      const lesson = tier?.lessons[ref.lesson];
      if (!lesson) return null;
      const category =
        ref.kind === 'topic'
          ? ((await getTopic(db, ref.topicId))?.name ?? ref.topicId)
          : hskName(ref.level);
      return { title: `${category} · ${lesson.title}`, subtitle: tier.name, chars: lesson.chars };
    }
  }
}
