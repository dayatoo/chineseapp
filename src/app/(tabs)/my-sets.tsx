import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, Heading, ProgressBar, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCustomSets } from '@/store/customSets';
import { LEARNED_BOX, useProgress } from '@/store/progress';

export default function MySetsScreen() {
  const theme = useTheme();
  const sets = useCustomSets((s) => s.sets);
  const progress = useProgress((s) => s.chars);

  return (
    <Screen safeTop title="My Sets">
      <Button label="New set" icon="＋" onPress={() => router.push('/set/new')} />
      {sets.length === 0 ? (
        <Card>
          <Heading>Make your own practice sets</Heading>
          <Body secondary>
            Paste any Chinese text, like a name, a phrase or this week&apos;s vocabulary, and the
            characters become a set you can trace. You can also pick characters from the library.
          </Body>
        </Card>
      ) : (
        sets.map((set) => {
          const learned = set.chars.filter((c) => (progress[c]?.box ?? 0) >= LEARNED_BOX).length;
          return (
            <Card
              key={set.id}
              onPress={() =>
                router.push({ pathname: '/lesson/[id]', params: { id: `custom-${set.id}` } })
              }>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Heading>{set.name}</Heading>
                  <Text style={[styles.preview, { color: theme.textSecondary }]} numberOfLines={1}>
                    {set.chars.join(' ') || 'No characters yet'}
                  </Text>
                </View>
                <Body secondary>
                  {learned}/{set.chars.length}
                </Body>
              </View>
              <ProgressBar value={learned / Math.max(1, set.chars.length)} />
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  preview: { fontSize: 18, marginTop: 2 },
});
