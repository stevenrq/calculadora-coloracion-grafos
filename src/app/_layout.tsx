import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AppTabs from '@/components/app-tabs';
import { EditorProvider } from '@/state/editor-context';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <EditorProvider>
          <AppTabs />
        </EditorProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
