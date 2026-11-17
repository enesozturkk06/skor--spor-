import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { enter } from '@/components/motion/entrance';
import { PressableScale } from '@/components/motion/PressableScale';
import { AppText, Button, Chip, Icon, Screen, SectionHeader, TextField } from '@/components/ui';
import { SPORTS, type SportId } from '@/features/athlete/catalog';
import { useAthlete } from '@/features/athlete/AthleteProvider';
import { filterExercises, getExercise } from '@/features/exercises/catalog';
import { ExerciseCard } from '@/features/exercises/components/ExerciseCard';
import { GOAL_LABELS } from '@/features/exercises/presets';
import { haptics } from '@/lib/haptics';
import { colors, layout, radius, spacing } from '@/theme';
import { duration, pressScale } from '@/theme/motion';

import { getBuiltinTemplate } from '../builtin-templates';
import { Sheet } from '../components/Sheet';
import { GOALS, TEMPLATE_LIMITS, WEEKDAYS, blankTemplate, duplicateTemplate, newBlock, validateTemplate } from '../template-model';
import { useTraining } from '../TrainingProvider';
import type { TemplateBlock, WorkoutTemplate } from '../types';
import { BlockEditor } from './BlockEditor';
import { DraggableList } from './DraggableList';
import { summarizeBlock } from './format';

/** Route wrapper: waits for the athlete's programs, then edits a stable draft. */
export function ProgramEditorScreen() {
  const t = useTraining();
  const { profile } = useAthlete();
  const { id, from } = useLocalSearchParams<{ id?: string; from?: string }>();
  if (!t.ready || !profile) return null;
  const existing = id ? t.templates.find((p) => p.id === id) : undefined;
  const source = from ? (getBuiltinTemplate(from) ?? t.templates.find((p) => p.id === from)) : undefined;
  const initial = existing ?? (source ? duplicateTemplate(source, profile.userId) : blankTemplate({ userId: profile.userId, sport: profile.primarySport }));
  return <ProgramEditor key={initial.id} initial={initial} isNew={!existing} />;
}

function ProgramEditor({ initial, isNew }: { initial: WorkoutTemplate; isNew: boolean }) {
  const router = useRouter();
  const t = useTraining();
  const { profile } = useAthlete();
  const [draft, setDraft] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [reorder, setReorder] = useState(false);
  const [picker, setPicker] = useState(false);
  const [leave, setLeave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (patch: Partial<WorkoutTemplate>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
    setError(null);
  };
  const setBlock = (uid: string, b: TemplateBlock) => update({ blocks: draft.blocks.map((x) => (x.uid === uid ? b : x)) });

  const mine = profile ? [profile.primarySport, ...profile.secondarySports] : [];
  const sports = [...SPORTS].sort((a, b) => (mine.includes(a.id) ? mine.indexOf(a.id) : 99) - (mine.includes(b.id) ? mine.indexOf(b.id) : 99));

  const back = () => (dirty ? setLeave(true) : router.canGoBack() ? router.back() : router.replace('/programs'));
  const save = async () => {
    const problem = validateTemplate(draft);
    if (problem) {
      haptics.warning();
      return setError(problem);
    }
    setSaving(true);
    try {
      const saved = await t.saveTemplate(draft);
      haptics.success();
      router.replace({ pathname: '/programs/[id]', params: { id: saved.id } });
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <Screen
        width="form"
        footer={
          <View style={styles.footer}>
            {error ? (
              <AppText variant="small" color="danger" accessibilityLiveRegion="polite" testID="editor-error">
                {error}
              </AppText>
            ) : null}
            <Button label="Programı kaydet" icon="check" loading={saving} onPress={save} />
          </View>
        }
      >
        <View style={styles.top}>
          <Pressable accessibilityRole="button" accessibilityLabel="Geri" hitSlop={12} onPress={back} style={styles.iconBtn}>
            <Icon name="arrow-left" size={22} />
          </Pressable>
          <AppText variant="overline" color="textMuted">
            {isNew ? 'Yeni program' : 'Programı düzenle'}
          </AppText>
          <View style={styles.iconBtn} />
        </View>

        <View style={styles.stack}>
          <Animated.View entering={enter(0)}>
            <TextField label="Program adı" value={draft.name} onChangeText={(name) => update({ name: name.slice(0, TEMPLATE_LIMITS.nameMax) })} placeholder="Ör. Pazartesi · Push" />
          </Animated.View>

          <Animated.View entering={enter(1)} style={styles.group}>
            <AppText variant="overline" color="textMuted">
              Branş
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chips}>
              {sports.map((s) => (
                <Chip key={s.id} label={s.label} icon={s.icon} selected={draft.sport === s.id} onPress={() => update({ sport: s.id as SportId })} />
              ))}
            </ScrollView>
            <AppText variant="overline" color="textMuted">
              Hedef
            </AppText>
            <View style={styles.wrap}>
              {GOALS.map((g) => (
                <Chip key={g} label={GOAL_LABELS[g]} tone="gold" selected={draft.goal === g} onPress={() => update({ goal: draft.goal === g ? null : g })} />
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={enter(2)} style={styles.group}>
            <AppText variant="overline" color="textMuted">
              Haftalık plan · günler
            </AppText>
            <View style={styles.days}>
              {WEEKDAYS.map((d) => {
                const on = draft.days.includes(d.day);
                return (
                  <PressableScale
                    key={d.day}
                    scaleTo={pressScale.tile}
                    haptic="select"
                    accessibilityRole="checkbox"
                    aria-checked={on}
                    accessibilityLabel={d.long}
                    onPress={() => update({ days: on ? draft.days.filter((x) => x !== d.day) : [...draft.days, d.day].sort() })}
                    style={[styles.day, on && styles.dayOn]}
                  >
                    <AppText variant="smallStrong" color={on ? 'textOnOrange' : 'textMuted'}>
                      {d.short}
                    </AppText>
                  </PressableScale>
                );
              })}
            </View>
          </Animated.View>

          <Animated.View entering={enter(3)}>
            <TextField label="Notlar" value={draft.notes ?? ''} onChangeText={(notes) => update({ notes: notes ? notes.slice(0, TEMPLATE_LIMITS.notesMax) : null })} placeholder="İsteğe bağlı: odak, tempo, ipuçları" multiline />
          </Animated.View>

          <View>
            <View style={styles.blocksHead}>
              <SectionHeader overline={`${draft.blocks.length} egzersiz`} title="Egzersizler" />
              {draft.blocks.length > 1 ? (
                <Chip label={reorder ? 'Bitti' : 'Sırala'} icon={reorder ? 'check' : 'drag'} selected={reorder} onPress={() => setReorder((r) => !r)} />
              ) : null}
            </View>

            {reorder ? (
              <Animated.View entering={FadeIn.duration(duration.fast).reduceMotion(ReduceMotion.System)}>
                <AppText variant="small" color="textMuted" style={styles.hint}>
                  Tutamaktan tutup sürükle ya da oklarla taşı.
                </AppText>
                <DraggableList
                  items={draft.blocks}
                  keyOf={(b) => b.uid}
                  labelOf={(b) => getExercise(b.exerciseKey)?.name.tr ?? b.exerciseKey}
                  itemHeight={68}
                  testID="reorder-list"
                  onReorder={(keys) => update({ blocks: keys.map((k) => draft.blocks.find((b) => b.uid === k)!) })}
                  renderItem={(b) => (
                    <View style={styles.compact} testID={`reorder-${b.exerciseKey}`}>
                      <AppText variant="title" numberOfLines={1}>
                        {getExercise(b.exerciseKey)?.name.tr}
                      </AppText>
                      <AppText variant="small" color="textMuted" numberOfLines={1}>
                        {summarizeBlock(b)}
                      </AppText>
                    </View>
                  )}
                />
              </Animated.View>
            ) : (
              <View style={styles.blocks}>
                {draft.blocks.map((b, i) => (
                  <BlockEditor
                    key={b.uid}
                    block={b}
                    index={i}
                    onChange={(nb) => setBlock(b.uid, nb)}
                    onRemove={() => {
                      haptics.tap();
                      update({ blocks: draft.blocks.filter((x) => x.uid !== b.uid) });
                    }}
                  />
                ))}
                <PressableScale
                  scaleTo={pressScale.card}
                  haptic="tap"
                  accessibilityRole="button"
                  accessibilityLabel="Programa egzersiz ekle"
                  disabled={draft.blocks.length >= TEMPLATE_LIMITS.blocks}
                  onPress={() => setPicker(true)}
                  style={styles.addCard}
                  testID="program-add-exercise"
                >
                  <Icon name="plus" size={24} color="orange" />
                  <AppText variant="button" color="orange">
                    Egzersiz ekle
                  </AppText>
                </PressableScale>
              </View>
            )}
          </View>
        </View>
      </Screen>

      {picker ? (
        <ExercisePickerOverlay
          sport={draft.sport}
          onClose={() => setPicker(false)}
          onPick={(key) => {
            update({ blocks: [...draft.blocks, newBlock(key)] });
            haptics.success();
            setPicker(false);
          }}
        />
      ) : null}
      {leave ? (
        <Sheet title="Değişiklikler kaydedilmedi" subtitle="Çıkarsan bu programdaki değişikliklerin kaybolur." onClose={() => setLeave(false)} testID="leave-sheet">
          <Button label="Kaydet ve çık" icon="check" onPress={() => (setLeave(false), void save())} />
          <Button label="Kaydetmeden çık" variant="ghost" onPress={() => (router.canGoBack() ? router.back() : router.replace('/programs'))} />
        </Sheet>
      ) : null}
    </View>
  );
}

function ExercisePickerOverlay({ sport, onPick, onClose }: { sport: SportId; onPick: (key: string) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const results = useMemo(
    () => [...filterExercises({ query })].sort((a, b) => Number(b.sports.includes(sport)) - Number(a.sports.includes(sport))),
    [query, sport],
  );
  return (
    <Animated.View entering={FadeIn.duration(duration.fast).reduceMotion(ReduceMotion.System)} style={[styles.picker, { paddingTop: insets.top + spacing.md }]} testID="program-picker">
      <View style={styles.pickerInner}>
        <View style={styles.top}>
          <Pressable accessibilityRole="button" accessibilityLabel="Kapat" hitSlop={12} onPress={onClose} style={styles.iconBtn}>
            <Icon name="close" size={22} />
          </Pressable>
          <AppText variant="overline" color="textMuted">
            Egzersiz ekle
          </AppText>
          <View style={styles.iconBtn} />
        </View>
        <TextField label="Ara" icon="magnify" value={query} onChangeText={setQuery} placeholder="Egzersiz veya kas" autoCorrect={false} autoCapitalize="none" />
        <ScrollView style={styles.flex} contentContainerStyle={[styles.pickerList, { paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
          {results.map((e) => (
            <ExerciseCard key={e.key} exercise={e} onPress={onPick} />
          ))}
        </ScrollView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stack: { gap: spacing.xl },
  group: { gap: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chipScroll: { marginHorizontal: -layout.gutter, flexGrow: 0 },
  chips: { gap: spacing.sm, paddingHorizontal: layout.gutter },
  days: { flexDirection: 'row', gap: 6 },
  day: { flex: 1, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  dayOn: { backgroundColor: colors.orange, borderColor: colors.orange },
  blocksHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  hint: { marginBottom: spacing.md },
  blocks: { gap: spacing.md },
  compact: { paddingVertical: spacing.sm, gap: 2 },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 64,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.orange,
    backgroundColor: colors.orangeSoft,
  },
  footer: { gap: spacing.sm },
  picker: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, zIndex: 20 },
  pickerInner: { flex: 1, width: '100%', maxWidth: layout.formMaxWidth, alignSelf: 'center', paddingHorizontal: layout.gutter, gap: spacing.md },
  pickerList: { gap: spacing.md, paddingTop: spacing.sm },
});
