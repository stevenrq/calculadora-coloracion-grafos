import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AppTabs from '@/components/app-tabs';
import { SettingsSheet } from '@/components/settings-sheet';
import { EditorProvider } from '@/state/editor-context';
import { SavedGraphsProvider } from '@/state/saved-graphs-context';
import { SettingsProvider } from '@/state/settings-context';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SettingsProvider>
        <ThemedRoot />
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}

/** Debajo de SettingsProvider: el esquema ya refleja el tema elegido en Ajustes. */
function ThemedRoot() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SavedGraphsProvider>
        <EditorProvider>
          <AppTabs />
        </EditorProvider>
      </SavedGraphsProvider>
      <SettingsSheet />
    </ThemeProvider>
  );
}
