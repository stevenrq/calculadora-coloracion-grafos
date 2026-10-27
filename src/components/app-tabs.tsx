import { NativeTabs } from 'expo-router/native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Colorear</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="palette" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="precedence">
        <NativeTabs.Trigger.Label>Precedencias</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="account_tree" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="graphs">
        <NativeTabs.Trigger.Label>Mis grafos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="folder_open" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
