import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';

import { Body, Button, Card, Heading, Screen, SegmentedControl } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { speak } from '@/tracing/feedback';
import type { Leniency } from '@/tracing/matcher';

export default function SettingsScreen() {
  const settings = useSettings();
  const resetProgress = useProgress((s) => s.reset);

  return (
    <Screen safeTop title="Settings">
      <Card>
        <Heading>Tracing</Heading>
        <Toggle
          label="Show outline"
          detail="A faint copy of the character to trace over. Turn off to write from memory."
          value={settings.showOutline}
          onChange={(showOutline) => settings.update({ showOutline })}
        />
        <Toggle
          label="Stroke-order demo"
          detail="Animate the strokes before you start each character."
          value={settings.showDemo}
          onChange={(showDemo) => settings.update({ showDemo })}
        />
        <Row label="Strictness" detail="How closely strokes must match.">
          <SegmentedControl<Leniency>
            value={settings.leniency}
            onChange={(leniency) => settings.update({ leniency })}
            options={[
              { value: 'easy', label: 'Easy' },
              { value: 'normal', label: 'Normal' },
              { value: 'strict', label: 'Strict' },
            ]}
          />
        </Row>
        <Row
          label="Show a hint after"
          detail="Wrong tries on the same stroke before its animation is shown.">
          <SegmentedControl
            value={String(settings.hintAfterMisses)}
            onChange={(v) => settings.update({ hintAfterMisses: Number(v) })}
            options={['1', '2', '3', '5'].map((v) => ({
              value: v,
              label: `${v} ${v === '1' ? 'miss' : 'misses'}`,
            }))}
          />
        </Row>
        <Toggle
          label="Haptic feedback"
          detail="Vibrate on correct and wrong strokes."
          value={settings.haptics}
          onChange={(haptics) => settings.update({ haptics })}
        />
      </Card>

      <Card>
        <Heading>Pronunciation</Heading>
        <Toggle
          label="Say it when finished"
          value={settings.autoSpeak}
          onChange={(autoSpeak) => settings.update({ autoSpeak })}
        />
        <Row label="Speaking speed">
          <SegmentedControl
            value={String(settings.speechRate)}
            onChange={(v) => {
              settings.update({ speechRate: Number(v) });
              speak('你好');
            }}
            options={[
              { value: '0.5', label: 'Slow' },
              { value: '0.8', label: 'Normal' },
              { value: '1', label: 'Fast' },
            ]}
          />
        </Row>
        <Body secondary>
          Uses your device&apos;s Mandarin voice. For a better voice, download one in iOS Settings →
          Accessibility → Spoken Content → Voices → Chinese.
        </Body>
      </Card>

      <Card>
        <Heading>Data</Heading>
        <Body secondary>Your progress and sets are stored only on this device.</Body>
        <Button
          label="Reset progress"
          variant="danger"
          onPress={() =>
            Alert.alert(
              'Reset progress?',
              'This clears your practice history. Your custom sets are kept.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: resetProgress },
              ],
            )
          }
        />
      </Card>

      <Button
        label="Credits & licences"
        variant="secondary"
        onPress={() => router.push('/credits')}
      />
    </Screen>
  );
}

function Row({ label, detail, children }: { label: string; detail?: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <Body>{label}</Body>
      {detail ? (
        <Body secondary style={styles.detail}>
          {detail}
        </Body>
      ) : null}
      {children}
    </View>
  );
}

function Toggle({
  label,
  detail,
  value,
  onChange,
}: {
  label: string;
  detail?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.toggle}>
      <View style={{ flex: 1 }}>
        <Body>{label}</Body>
        {detail ? (
          <Body secondary style={styles.detail}>
            {detail}
          </Body>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.tint }} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.one, paddingVertical: Spacing.two },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  detail: { fontSize: 14, lineHeight: 19 },
});
