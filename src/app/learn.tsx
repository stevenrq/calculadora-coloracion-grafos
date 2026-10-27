import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { LEARN_SECTIONS, type LearnBlock, type LearnTopic } from '@/content/learn';
import { useModuleLoader } from '@/hooks/use-module-loader';
import { useTheme } from '@/hooks/use-theme';
import { findExample } from '@/lib/examples/coloring-examples';
import { coloringExampleDoc, precedenceExampleDoc } from '@/lib/examples/example-docs';
import { findPrecedenceExample } from '@/lib/examples/precedence-examples';

export default function LearnScreen() {
  const theme = useTheme();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Aprende</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Teoría breve. Toca un tema para abrirlo y «Probar» para cargar el ejemplo.
        </Text>
        {LEARN_SECTIONS.map((section) => (
          <View key={section.id} style={styles.sectionBox}>
            <Text style={[styles.section, { color: theme.textSecondary }]} accessibilityRole="header">
              {section.title}
            </Text>
            <View style={[styles.topics, { backgroundColor: theme.backgroundElement }]}>
              {section.topics.map((topic, i) => (
                <Topic
                  key={topic.id}
                  topic={topic}
                  first={i === 0}
                  expanded={expanded.has(topic.id)}
                  onToggle={() => toggle(topic.id)}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Topic({
  topic,
  first,
  expanded,
  onToggle,
}: {
  topic: LearnTopic;
  first: boolean;
  expanded: boolean;
  onToggle(): void;
}) {
  const theme = useTheme();
  return (
    <View style={!first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={({ pressed }) => [styles.topicHeader, pressed && { backgroundColor: theme.backgroundSelected }]}>
        <Text style={[styles.topicTitle, { color: theme.text }]}>{topic.title}</Text>
        <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={24} color={theme.textSecondary} />
      </Pressable>
      {expanded && (
        <View style={styles.topicBody}>
          {topic.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </View>
      )}
    </View>
  );
}

function Block({ block }: { block: LearnBlock }) {
  const theme = useTheme();
  const { open } = useModuleLoader();

  if (block.kind === 'text') return <Text style={[styles.paragraph, { color: theme.text }]}>{block.text}</Text>;

  if (block.kind === 'list') {
    return (
      <View style={styles.list}>
        {block.items.map((item) => (
          <View key={item} style={styles.listItem}>
            <Text style={[styles.paragraph, { color: theme.text }]}>•</Text>
            <Text style={[styles.paragraph, styles.listText, { color: theme.text }]}>{item}</Text>
          </View>
        ))}
      </View>
    );
  }

  const tryIt = () => {
    if (block.module === 'coloring') {
      const example = findExample(block.exampleId);
      open('coloring', coloringExampleDoc(example), `Se cargó «${example.name}».`);
    } else {
      const example = findPrecedenceExample(block.exampleId);
      open('precedence', precedenceExampleDoc(example), `Se cargó «${example.name}».`);
    }
  };
  return (
    <Pressable
      onPress={tryIt}
      accessibilityRole="button"
      accessibilityLabel={`Probar: ${block.label}. Abre el ejemplo en ${block.module === 'coloring' ? 'Colorear' : 'Precedencias'}.`}
      style={({ pressed }) => [
        styles.tryButton,
        { borderColor: theme.primary },
        pressed && { backgroundColor: theme.backgroundSelected },
      ]}>
      <MaterialIcons name="play-arrow" size={20} color={theme.primary} />
      <Text style={[styles.tryLabel, { color: theme.primary }]}>Probar: {block.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.five },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '700' },
  subtitle: { fontSize: 14, lineHeight: 20 },
  sectionBox: { gap: Spacing.two, marginTop: Spacing.three },
  section: { fontSize: 13, lineHeight: 18, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  topics: { borderRadius: 16, overflow: 'hidden' },
  topicHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  topicTitle: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  topicBody: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  paragraph: { fontSize: 15, lineHeight: 22 },
  list: { gap: Spacing.one },
  listItem: { flexDirection: 'row', gap: Spacing.two },
  listText: { flex: 1 },
  tryButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  tryLabel: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
});
