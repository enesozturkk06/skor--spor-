import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { enter, fadeIn } from '@/components/motion/entrance';
import { PressableScale } from '@/components/motion/PressableScale';
import { AppText, Card, Icon, SectionHeader, Tag } from '@/components/ui';
import { getSport } from '@/features/athlete/catalog';
import { useAthlete } from '@/features/athlete/AthleteProvider';
import { colors, layout, radius, spacing } from '@/theme';
import { pressScale } from '@/theme/motion';

import { CATEGORY_LABELS, EQUIPMENT_LABELS, LEVEL_LABELS, MODALITY_META, relatedExercises } from '../catalog';
import { MUSCLES, type MuscleId } from '../muscles';
import { GOAL_LABELS } from '../presets';
import { recommendedPrescription } from '../recommend';
import type { Exercise } from '../types';
import { sidesOf } from './body-paths';
import { ExerciseCard, LevelBars } from './ExerciseCard';
import { MuscleLegend, MuscleMap } from './MuscleMap';

/** Full technique sheet for one exercise. */
export function ExerciseDetail({ exercise: e }: { exercise: Exercise }) {
  return (
    <View style={styles.stack}>
      <Animated.View entering={enter(0)}>
        <Hero exercise={e} />
      </Animated.View>
      <Animated.View entering={enter(1)}>
        <MuscleSection exercise={e} />
      </Animated.View>
      <Animated.View entering={enter(2)}>
        <PrescriptionSection exercise={e} />
      </Animated.View>
      <Animated.View entering={enter(3)}>
        <TechniqueSection exercise={e} />
      </Animated.View>
      <Animated.View entering={enter(4)}>
        <BreathingCard text={e.breathing} />
      </Animated.View>
      <Animated.View entering={enter(5)}>
        <MistakesSection mistakes={e.mistakes} />
      </Animated.View>
      <Animated.View entering={enter(6)}>
        <SportsSection exercise={e} />
      </Animated.View>
      <Animated.View entering={enter(7)}>
        <RelatedSection exercise={e} />
      </Animated.View>
    </View>
  );
}

/* ------------------------------------------------------------------ hero */

function Hero({ exercise: e }: { exercise: Exercise }) {
  const meta = MODALITY_META[e.modality];
  return (
    <Card variant="hero" accent="orange">
      <View style={styles.hero}>
        <View style={styles.tags}>
          <Tag label={CATEGORY_LABELS[e.category]} tone="orange" />
          <Tag label={meta.label} icon={meta.icon} tone="gold" />
        </View>
        <AppText variant="h1" accessibilityRole="header" testID="exercise-title">
          {e.name.tr}
        </AppText>
        {/* Not uppercased: tr-TR casing would turn English "i" into "İ". */}
        <AppText variant="bodyStrong" color="gold" testID="exercise-name-en">
          {e.name.en}
        </AppText>
        <AppText variant="body" color="textMuted">
          {e.summary}
        </AppText>
        <View style={styles.heroFoot}>
          <View style={styles.level}>
            <LevelBars level={e.level} />
            <AppText variant="smallStrong" color="text">
              {LEVEL_LABELS[e.level]}
            </AppText>
          </View>
          <AppText variant="small" color="textMuted" style={styles.equipment} numberOfLines={2}>
            {e.equipment.map((q) => EQUIPMENT_LABELS[q]).join(' · ')}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

/* --------------------------------------------------------------- muscles */

function MuscleSection({ exercise: e }: { exercise: Exercise }) {
  const [selected, setSelected] = useState<MuscleId | null>(e.primary[0] ?? null);
  const role = (m: MuscleId) => (e.primary.includes(m) ? 'Birincil' : e.secondary.includes(m) ? 'İkincil' : null);
  const toggle = (m: MuscleId) => setSelected((cur) => (cur === m ? null : m));

  return (
    <View>
      <SectionHeader overline="Anatomi" title="Çalışan kaslar" />
      <Card padded={false}>
        <View style={styles.mapCard}>
          <MuscleMap testID="exercise-map" primary={e.primary} secondary={e.secondary} selected={selected} onSelect={toggle} height={280} />
          <MuscleLegend />
          {selected ? (
            <Animated.View key={selected} entering={fadeIn()} style={styles.muscleInfo} testID="muscle-info">
              <AppText variant="title">
                {MUSCLES[selected].tr}{' '}
                <AppText variant="small" color="textMuted">
                  ({MUSCLES[selected].en})
                </AppText>
              </AppText>
              <AppText variant="small" color={role(selected) === 'Birincil' ? 'orange' : role(selected) ? 'gold' : 'textMuted'}>
                {role(selected) ? `${role(selected)} kas` : 'Bu harekette aktif değil'} ·{' '}
                {sidesOf(selected).map((s) => (s === 'front' ? 'ön' : 'arka')).join(' ve ')} görünüm
              </AppText>
            </Animated.View>
          ) : null}
          <View style={styles.pills}>
            {[...e.primary, ...e.secondary].map((m) => (
              <MusclePill key={m} muscle={m} primary={e.primary.includes(m)} selected={selected === m} onPress={() => toggle(m)} />
            ))}
          </View>
        </View>
      </Card>
    </View>
  );
}

function MusclePill({ muscle, primary, selected, onPress }: { muscle: MuscleId; primary: boolean; selected: boolean; onPress: () => void }) {
  const tint = primary ? colors.orange : colors.gold;
  return (
    <PressableScale
      scaleTo={pressScale.tile}
      haptic="select"
      accessibilityRole="button"
      aria-pressed={selected}
      accessibilityLabel={`${MUSCLES[muscle].tr}, ${primary ? 'birincil' : 'ikincil'} kas`}
      onPress={onPress}
      style={[styles.pill, selected && { borderColor: tint, backgroundColor: primary ? colors.orangeSoft : colors.goldSoft }]}
    >
      <View style={[styles.pillDot, { backgroundColor: tint }]} />
      <AppText variant="smallStrong" color={selected ? 'text' : 'textMuted'}>
        {MUSCLES[muscle].tr}
      </AppText>
    </PressableScale>
  );
}

/* ---------------------------------------------------------- prescription */

function PrescriptionSection({ exercise: e }: { exercise: Exercise }) {
  const { profile } = useAthlete();
  const rec = recommendedPrescription(e, profile?.goals ?? []);
  const [index, setIndex] = useState(rec.index);
  const p = e.prescriptions[index] ?? e.prescriptions[0];

  return (
    <View>
      <SectionHeader overline="Programlama" title="Set & tekrar önerisi" />
      <Card padded={false} accent="gold">
        <View style={styles.rxCard}>
          <View style={styles.rxGoals} accessibilityRole="radiogroup" accessibilityLabel="Hedef">
            {e.prescriptions.map((x, i) => {
              const on = i === index;
              return (
                <PressableScale
                  key={x.goal}
                  scaleTo={pressScale.tile}
                  haptic="select"
                  accessibilityRole="radio"
                  aria-checked={on}
                  accessibilityLabel={GOAL_LABELS[x.goal]}
                  onPress={() => setIndex(i)}
                  style={[styles.rxGoal, on && styles.rxGoalOn]}
                >
                  <AppText variant="smallStrong" color={on ? 'textOnOrange' : 'textMuted'}>
                    {GOAL_LABELS[x.goal]}
                  </AppText>
                </PressableScale>
              );
            })}
          </View>
          <Animated.View key={p.goal} entering={fadeIn()} style={styles.rxStats} testID="prescription">
            <RxStat label="Set" value={p.sets} />
            <View style={styles.rxDivider} />
            <RxStat label="Hedef" value={p.target} wide />
            <View style={styles.rxDivider} />
            <RxStat label="Dinlenme" value={p.rest} />
          </Animated.View>
          {rec.matched && index === rec.index ? (
            <View style={styles.rxHint}>
              <Icon name="target" size={14} color="gold" />
              <AppText variant="small" color="gold">
                Hedeflerine göre önerildi
              </AppText>
            </View>
          ) : null}
        </View>
      </Card>
    </View>
  );
}

function RxStat({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <View style={[styles.rxStat, wide && styles.rxStatWide]}>
      <AppText variant="overline" color="textMuted">
        {label}
      </AppText>
      <AppText variant="title" color="text">
        {value}
      </AppText>
    </View>
  );
}

/* ------------------------------------------------------------- technique */

function TechniqueSection({ exercise: e }: { exercise: Exercise }) {
  return (
    <View>
      <SectionHeader overline="Adım adım" title="Teknik" />
      <Card>
        <View>
          {e.steps.map((s, i) => {
            const last = i === e.steps.length - 1;
            return (
              <Animated.View key={s} entering={enter(i, { step: 70, delay: 200 })} style={styles.step}>
                <View style={styles.stepRail}>
                  <View style={styles.stepNum}>
                    <AppText variant="smallStrong" color="orange">
                      {i + 1}
                    </AppText>
                  </View>
                  {!last ? <View style={styles.stepLine} /> : null}
                </View>
                <AppText variant="body" style={[styles.stepText, !last && styles.stepGap]}>
                  {s}
                </AppText>
              </Animated.View>
            );
          })}
        </View>
      </Card>
    </View>
  );
}

function BreathingCard({ text }: { text: string }) {
  return (
    <Card variant="outline">
      <View style={styles.breath}>
        <View style={styles.breathIcon}>
          <Icon name="lungs" size={22} color="gold" />
        </View>
        <View style={styles.flex}>
          <AppText variant="overline" color="gold">
            Nefes
          </AppText>
          <AppText variant="body" testID="exercise-breathing">
            {text}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

function MistakesSection({ mistakes }: { mistakes: string[] }) {
  return (
    <View>
      <SectionHeader overline="Dikkat" title="Sık yapılan hatalar" />
      <View style={styles.mistakes}>
        {mistakes.map((m, i) => (
          <View key={m} style={[styles.mistake, i === mistakes.length - 1 && styles.mistakeLast]}>
            <Icon name="alert-outline" size={18} color="warning" />
            <AppText variant="body" style={styles.flex}>
              {m}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

/* --------------------------------------------------------------- related */

function SportsSection({ exercise: e }: { exercise: Exercise }) {
  return (
    <View>
      <SectionHeader overline="Kimler için" title="Branşlar" />
      <View style={styles.sportWrap}>
        {e.sports.map((id) => {
          const s = getSport(id);
          return (
            <View key={id} style={styles.sport}>
              <Icon name={s.icon} size={16} color="gold" />
              <AppText variant="smallStrong">{s.label}</AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function RelatedSection({ exercise: e }: { exercise: Exercise }) {
  const router = useRouter();
  const related = relatedExercises(e);
  if (!related.length) return null;
  return (
    <View>
      <SectionHeader overline="Aynı kaslar" title="Benzer egzersizler" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.relatedScroll} contentContainerStyle={styles.related}>
        {related.map((o) => (
          <ExerciseCard key={o.key} exercise={o} compact onPress={(key) => router.push({ pathname: '/exercises/[key]', params: { key } })} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.xxl },
  flex: { flex: 1 },
  hero: { gap: spacing.sm, paddingVertical: spacing.xs },
  tags: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.xs },
  heroFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  level: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  equipment: { flex: 1, textAlign: 'right' },
  mapCard: { padding: spacing.lg, gap: spacing.lg },
  muscleInfo: { alignItems: 'center', gap: spacing.xxs },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  rxCard: { padding: spacing.lg, gap: spacing.lg },
  rxGoals: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  rxGoal: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  rxGoalOn: { backgroundColor: colors.orange, borderColor: colors.orange },
  rxStats: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radius.md,
    backgroundColor: colors.bgRaised,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  rxStat: { flex: 1, gap: spacing.xs, paddingHorizontal: spacing.md },
  rxStatWide: { flex: 1.4 },
  rxDivider: { width: 1, backgroundColor: colors.divider },
  rxHint: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  step: { flexDirection: 'row', gap: spacing.md },
  stepRail: { alignItems: 'center', width: 28 },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.orange,
    backgroundColor: colors.orangeSoft,
  },
  stepLine: { flex: 1, width: 1, backgroundColor: colors.borderStrong, marginVertical: spacing.xs },
  stepText: { flex: 1, paddingTop: 3 },
  stepGap: { paddingBottom: spacing.lg },
  breath: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  breathIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldSoft,
  },
  mistakes: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.warningBorder, backgroundColor: colors.warningSoft, overflow: 'hidden' },
  mistake: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  mistakeLast: { borderBottomWidth: 0 },
  sportWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sport: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.goldSoft,
  },
  relatedScroll: { marginHorizontal: -layout.gutter, flexGrow: 0 },
  related: { gap: spacing.md, paddingHorizontal: layout.gutter },
});
