import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors } from '@/constants/theme';
import { DATABASE_NAME } from '@/data/db';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.tint,
      background: colors.background,
      card: colors.background,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navTheme}>
        <SQLiteProvider
          databaseName={DATABASE_NAME}
          assetSource={{ assetId: require('@/assets/db/hanzi.db') }}
          options={{ enableChangeListener: false }}
          onInit={async () => {
            await SplashScreen.hideAsync();
          }}>
          <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="set/new" options={{ presentation: 'modal', title: 'New Set' }} />
            <Stack.Screen
              name="set/[id]/add"
              options={{ presentation: 'modal', title: 'Add Characters' }}
            />
            <Stack.Screen name="credits" options={{ title: 'Credits & Licences' }} />
          </Stack>
        </SQLiteProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
