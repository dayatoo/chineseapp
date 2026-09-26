import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

import { useSettings } from '@/store/settings';

const haptics = (fn: () => Promise<void>) => {
  if (useSettings.getState().haptics) fn().catch(() => {});
};

export const buzzCorrect = () =>
  haptics(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const buzzWrong = () =>
  haptics(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
export const buzzComplete = () =>
  haptics(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

/** Speaks Chinese text with the device's built-in Mandarin voice. */
export function speak(text: string) {
  Speech.stop();
  Speech.speak(text, { language: 'zh-CN', rate: useSettings.getState().speechRate });
}
