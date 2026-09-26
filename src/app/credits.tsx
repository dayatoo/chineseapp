import { Linking } from 'react-native';

import { Body, Card, Heading, Screen } from '@/components/ui';

const CREDITS = [
  {
    name: 'Make Me a Hanzi',
    url: 'https://github.com/skishore/makemeahanzi',
    text:
      'Stroke order, stroke shapes, pinyin and definitions for 9,000+ characters. Stroke graphics are derived ' +
      'from fonts by Arphic Technology and are used under the Arphic Public License. The dictionary data is ' +
      'available under the GNU Lesser General Public License.',
  },
  {
    name: 'Hanzi Writer',
    url: 'https://github.com/chanind/hanzi-writer',
    text:
      'The stroke matching and stroke animation technique are adapted from Hanzi Writer by David Chanin (MIT ' +
      'License). Character data is packaged by hanzi-writer-data (Arphic Public License).',
  },
  {
    name: 'Complete HSK Vocabulary',
    url: 'https://github.com/drkameleon/complete-hsk-vocabulary',
    text: 'HSK 3.0 levels and word frequencies, by Yanis Zafirópulos (MIT License).',
  },
];

export default function CreditsScreen() {
  return (
    <Screen>
      <Body secondary>This app is built on open data and code from these projects. Thank you!</Body>
      {CREDITS.map((c) => (
        <Card key={c.name} onPress={() => Linking.openURL(c.url)}>
          <Heading>{c.name}</Heading>
          <Body>{c.text}</Body>
          <Body secondary>{c.url}</Body>
        </Card>
      ))}
    </Screen>
  );
}
