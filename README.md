# Hanzi Trace

An iPhone and iPad app for learning to write simplified Chinese characters by tracing them in the
correct stroke order. Built with React Native and Expo.

- **Trace with your finger or Apple Pencil** on a traditional 米字格 practice grid.
- **Stroke order is enforced.** Each stroke is checked as you lift your finger. A wrong stroke
  flashes red, the phone buzzes, and you repeat it until it's right. The app tells you what went
  wrong: wrong order, wrong direction, wrong place, or wrong shape.
- **Help when you need it.** A stroke-order demo plays before each character, a faint outline
  shows what to trace (turn it off to write from memory), and after 3 misses the correct stroke
  animates, with a dot marking where it starts.
- **Browse by topic or HSK level.** There are 13 topics (numbers, family, food…) and all HSK 3.0
  levels (about 3,000 characters). Each is split into Beginner, Intermediate and Advanced tiers of
  8-character lessons, ordered by stroke count and how common each character is.
- **Pinyin, meaning and pronunciation** for every character, spoken by the device's Mandarin voice.
- **Progress tracking.** Characters move up when traced cleanly and down after mistakes. Weak
  characters are collected into a Review lesson.
- **Custom sets.** Paste any Chinese text or search the library (by character, pinyin or
  English), then rename, reorder or remove characters. All 9,500+ characters in the database can
  be used.
- **Fully offline and private.** Everything is stored on the device.

## Running it on your iPhone or iPad

You need [Node.js](https://nodejs.org) 20+ on your computer, and the free **Expo Go** app from the
App Store on your device.

```bash
npm install
npx expo start
```

Scan the QR code with the iPhone camera to open the app in Expo Go. Your phone and computer need
to be on the same Wi-Fi network (or run `npx expo start --tunnel`).

To install it as a standalone app (for example through TestFlight for the family), build it with
EAS: `npx eas-cli@latest build --platform ios`. This needs an Apple Developer account.

## Development

```bash
npm test            # unit tests (stroke matcher, session, lessons, database)
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run format      # Prettier
```

### Project layout

| Path                             | What it is                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| `src/app/`                       | Screens (Expo Router): tabs, category, lesson, practice, custom-set editor, settings |
| `src/tracing/matcher.ts`         | Decides whether a drawn stroke matches the expected one, and why not                 |
| `src/tracing/session.ts`         | State machine for tracing one character: demo → tracing → complete                   |
| `src/tracing/tracing-canvas.tsx` | The writing surface: grid, outline, animations, live brush stroke                    |
| `src/data/db.ts`                 | Queries against the bundled character database                                       |
| `src/data/sets.ts`               | Difficulty sorting, tiers, lessons, and lesson ids                                   |
| `src/store/`                     | On-device user data: settings, progress, custom sets                                 |
| `data/topics.json`               | The hand-picked topic lists (edit this to add topics)                                |
| `scripts/build-db.mjs`           | Builds `assets/db/hanzi.db` from the open data sources                               |

### Rebuilding the character database

`assets/db/hanzi.db` is committed, so you only need this after changing `data/topics.json` or the
build script:

```bash
npm run fetch-data   # downloads the dictionary and HSK lists into data/raw/
npm run build-db
```

Then bump `DATABASE_NAME` in `src/data/db.ts` (e.g. `hanzi-v2.db`) so installed apps pick up
the new file instead of keeping their cached copy.

## Credits

- Stroke data, pinyin and definitions: [Make Me a Hanzi](https://github.com/skishore/makemeahanzi).
  The stroke graphics are derived from Arphic fonts (Arphic Public License), and the dictionary
  is under the LGPL. Packaged by [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data).
- Stroke matching and the stroke animation technique are adapted from
  [Hanzi Writer](https://github.com/chanind/hanzi-writer) (MIT).
- HSK levels and word frequency: [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) (MIT).
