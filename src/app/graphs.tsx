import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GraphThumbnail } from '@/components/graph-thumbnail';
import { NameDialog } from '@/components/name-dialog';
import { NoticeSnackbar } from '@/components/notice-snackbar';
import { SavedGraphCard, SavedGraphMenu } from '@/components/saved-graph-card';
import { Spacing } from '@/constants/theme';
import { useModuleLoader } from '@/hooks/use-module-loader';
import { useNow } from '@/hooks/use-now';
import { SettingsButton } from '@/components/settings-button';
import { useTheme } from '@/hooks/use-theme';
import { COLORING_EXAMPLES, type ColoringExample } from '@/lib/examples/coloring-examples';
import { coloringExampleDoc, precedenceExampleDoc } from '@/lib/examples/example-docs';
import { PRECEDENCE_EXAMPLES, type PrecedenceExample } from '@/lib/examples/precedence-examples';
import { countsLabel, plural, sentences } from '@/lib/format';
import { analyzePrecedence } from '@/lib/precedence/analyze';
import type { EditorDoc, Notice } from '@/state/editor-reducer';
import { newSavedId, type SavedGraph } from '@/state/saved-graphs';
import { useSavedGraphs } from '@/state/saved-graphs-context';

const THUMBNAIL_SIZE = 64;

interface ExampleCard {
  example: ColoringExample;
  doc: EditorDoc;
}

interface PrecedenceCard {
  example: PrecedenceExample;
  doc: EditorDoc;
  stageCount: number;
}

function buildCards(): ExampleCard[] {
  return COLORING_EXAMPLES.map((example) => ({ example, doc: coloringExampleDoc(example) }));
}

function buildPrecedenceCards(): PrecedenceCard[] {
  return PRECEDENCE_EXAMPLES.map((example) => {
    const doc = precedenceExampleDoc(example);
    const analysis = analyzePrecedence(doc.graph, doc.activities ?? {});
    return { example, doc, stageCount: analysis.valid ? analysis.stages.stages.length : 0 };
  });
}

export default function GraphsScreen() {
  const theme = useTheme();
  const { open } = useModuleLoader();
  const saved = useSavedGraphs();
  const [menuFor, setMenuFor] = useState<SavedGraph | null>(null);
  const [renaming, setRenaming] = useState<SavedGraph | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const cards = buildCards();
  const precedenceCards = buildPrecedenceCards();
  const now = useNow();

  const duplicate = (item: SavedGraph) => {
    setMenuFor(null);
    saved.dispatch({ type: 'duplicate', id: item.id, newId: newSavedId(), now: new Date().toISOString() });
  };
  const remove = (item: SavedGraph) => {
    setMenuFor(null);
    saved.dispatch({ type: 'remove', id: item.id });
    setNotice({ kind: 'info', message: `Se borró «${item.name}».`, undoable: true });
  };
  const undoRemove = () => {
    saved.dispatch({ type: 'undoRemove' });
    setNotice(null);
  };
  const rename = (name: string) => {
    if (renaming) saved.dispatch({ type: 'rename', id: renaming.id, name });
    setRenaming(null);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
            Mis grafos
          </Text>
          <SettingsButton />
        </View>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Toca un grafo para abrirlo.</Text>

        <Text style={[styles.section, { color: theme.textSecondary }]}>Guardados</Text>
        {saved.items.length === 0 ? (
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            Todavía no guardaste grafos. Usa «Guardar» en Colorear o Precedencias.
          </Text>
        ) : (
          saved.items.map((item) => (
            <SavedGraphCard
              key={item.id}
              item={item}
              now={now}
              onOpen={() => open(item.module, item.doc, `Se abrió «${item.name}».`)}
              onMore={() => setMenuFor(item)}
            />
          ))
        )}

        <Text style={[styles.section, { color: theme.textSecondary }]}>Ejemplos de coloración</Text>
        {cards.map((card) => {
          const { example, doc } = card;
          const { graph } = doc;
          const counts = countsLabel(graph.vertices.length, graph.edges.length);
          return (
            <Pressable
              key={example.id}
              onPress={() => open('coloring', doc, `Se cargó «${example.name}».`)}
              accessibilityRole="button"
              accessibilityLabel={sentences(
                example.name,
                example.description,
                counts,
                `Número cromático ${example.chromaticNumber}`,
              )}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
              ]}>
              <View style={[styles.thumbnail, { backgroundColor: theme.canvas }]}>
                <GraphThumbnail graph={graph} positions={doc.positions} size={THUMBNAIL_SIZE} />
              </View>
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                    {example.name}
                  </Text>
                  <View style={[styles.badge, { borderColor: theme.primary }]}>
                    <Text style={[styles.badgeLabel, { color: theme.primary }]}>χ = {example.chromaticNumber}</Text>
                  </View>
                </View>
                <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
                  {example.description}
                </Text>
                <Text style={[styles.counts, { color: theme.textSecondary }]}>{counts}</Text>
              </View>
            </Pressable>
          );
        })}

        <Text style={[styles.section, { color: theme.textSecondary }]}>Ejemplos de precedencias</Text>
        {precedenceCards.map((card) => {
          const { example, doc, stageCount } = card;
          const { graph } = doc;
          const counts = `${plural(graph.vertices.length, 'actividad', 'actividades')} · ${plural(graph.edges.length, 'precedencia', 'precedencias')}`;
          const stages = plural(stageCount, 'etapa', 'etapas');
          return (
            <Pressable
              key={example.id}
              onPress={() => open('precedence', doc, `Se cargó «${example.name}».`)}
              accessibilityRole="button"
              accessibilityLabel={sentences(example.name, example.description, counts, stages)}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
              ]}>
              <View style={[styles.thumbnail, { backgroundColor: theme.canvas }]}>
                <GraphThumbnail graph={graph} positions={doc.positions} size={THUMBNAIL_SIZE} />
              </View>
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                    {example.name}
                  </Text>
                  <View style={[styles.badge, { borderColor: theme.primary }]}>
                    <Text style={[styles.badgeLabel, { color: theme.primary }]}>{stages}</Text>
                  </View>
                </View>
                <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
                  {example.description}
                </Text>
                <Text style={[styles.counts, { color: theme.textSecondary }]}>{counts}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <NoticeSnackbar notice={notice} onUndo={undoRemove} onDismiss={() => setNotice(null)} />

      <SavedGraphMenu
        item={menuFor}
        onRename={() => {
          setRenaming(menuFor);
          setMenuFor(null);
        }}
        onDuplicate={() => menuFor && duplicate(menuFor)}
        onRemove={() => menuFor && remove(menuFor)}
        onClose={() => setMenuFor(null)}
      />
      <NameDialog
        visible={renaming !== null}
        title="Renombrar"
        initial={renaming?.name ?? ''}
        confirmLabel="Renombrar"
        onSubmit={rename}
        onCancel={() => setRenaming(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { flex: 1, fontSize: 28, lineHeight: 36, fontWeight: '700' },
  subtitle: { fontSize: 14, lineHeight: 20 },
  section: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: Spacing.three,
  },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: 16 },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: Spacing.half },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  name: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  badge: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: Spacing.two, paddingVertical: Spacing.half },
  badgeLabel: { fontSize: 13, fontWeight: '700' },
  description: { fontSize: 13, lineHeight: 18 },
  counts: { fontSize: 12, lineHeight: 16 },
});
