import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, type ScrollViewInstance, type TextInputInstance } from 'react-native';

import { AppText, Button, Card, Chip, Screen, TextField } from '@/components/ui';
import { numericRejectMessage, sanitizeNumericInput, type NumericSpec } from '@/lib/numeric-input';
import { toNumber, validate } from '@/lib/validation';
import { spacing } from '@/theme';

import { GOALS, LIMITS, SPORTS, getSport, type GoalId, type SportId } from '../catalog';
import type { AthleteProfile, AthleteProfileInput } from '../types';

import { SelectTile } from './SelectTile';
import { StepHeader } from './StepHeader';

type Props = {
  initial?: AthleteProfile | null;
  onSubmit: (input: AthleteProfileInput) => Promise<void>;
  /** Shown as a close button (edit mode). */
  onClose?: () => void;
};

const TOTAL_STEPS = 4;

type BodyField = 'age' | 'height' | 'weight';
type BodyErrors = Partial<Record<BodyField, string | null>>;

/**
 * Length limits live here instead of TextInput `maxLength`: the platform
 * truncates pasted text before onChangeText runs, which turned "1780" into
 * "178" silently. The sanitiser sees the full input and rejects it instead.
 */
const NUMERIC: Record<BodyField, NumericSpec> = {
  age: { maxIntDigits: 2, maxDecimals: 0 },
  height: { maxIntDigits: 3, maxDecimals: 0 },
  weight: { maxIntDigits: 3, maxDecimals: 1 },
};

export function OnboardingFlow({ initial, onSubmit, onClose }: Props) {
  const { width } = useWindowDimensions();
  const sportColumns = width >= 720 ? 3 : 2;

  const [step, setStep] = useState(1);
  const [primary, setPrimary] = useState<SportId | null>(initial?.primarySport ?? null);
  const [secondary, setSecondary] = useState<SportId[]>(initial?.secondarySports ?? []);
  const [goals, setGoals] = useState<GoalId[]>(initial?.goals ?? []);
  const [age, setAge] = useState(initial ? String(initial.age) : '');
  const [height, setHeight] = useState(initial ? String(initial.heightCm) : '');
  const [weight, setWeight] = useState(initial ? String(initial.weightKg) : '');
  const [errors, setErrors] = useState<BodyErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const heightRef = useRef<TextInputInstance>(null);
  const weightRef = useRef<TextInputInstance>(null);

  const go = (next: number) => {
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const choosePrimary = (id: SportId) => {
    setPrimary(id);
    setSecondary((prev) => prev.filter((s) => s !== id));
  };

  /**
   * One handler for typed keys and pasted text alike. Rejected input keeps the
   * previous value and explains why; accepted input clears that field's error.
   */
  const numericChange = (field: BodyField, setValue: (v: string) => void) => (raw: string) => {
    const result = sanitizeNumericInput(raw, NUMERIC[field]);
    if (result.ok) {
      setValue(result.value);
      setErrors((prev) => (prev[field] ? { ...prev, [field]: null } : prev));
    } else {
      // Always a new object → re-render, so a controlled input drops the rejected text.
      setErrors((prev) => ({ ...prev, [field]: numericRejectMessage(result.reason, NUMERIC[field]) }));
    }
  };

  const toggle = <T,>(list: T[], item: T, max: number): T[] =>
    list.includes(item) ? list.filter((x) => x !== item) : list.length >= max ? list : [...list, item];

  const validateBody = (): boolean => {
    const next: BodyErrors = {
      age: validate.intInRange(age, LIMITS.age.min, LIMITS.age.max, 'Yaş'),
      height: validate.intInRange(height, LIMITS.heightCm.min, LIMITS.heightCm.max, 'Boy'),
      weight: validate.intInRange(weight, LIMITS.weightKg.min, LIMITS.weightKg.max, 'Kilo'),
    };
    setErrors(next);
    return !next.age && !next.height && !next.weight;
  };

  const submit = async () => {
    if (!primary || !validateBody()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit({
        primarySport: primary,
        secondarySports: secondary,
        goals,
        age: Math.round(toNumber(age)),
        heightCm: Math.round(toNumber(height)),
        weightKg: Math.round(toNumber(weight) * 10) / 10,
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Profil kaydedilemedi.');
      setSubmitting(false);
    }
  };

  const canContinue = step === 1 ? Boolean(primary) : step === 3 ? goals.length > 0 : true;

  const footer = (
    <View style={styles.footer}>
      {submitError ? (
        <AppText variant="small" color="danger" align="center">
          {submitError}
        </AppText>
      ) : null}
      {step < TOTAL_STEPS ? (
        <Button
          label={step === 2 && secondary.length === 0 ? 'Bu adımı atla' : 'Devam et'}
          variant={step === 2 && secondary.length === 0 ? 'secondary' : 'primary'}
          iconRight="arrow-right"
          disabled={!canContinue}
          onPress={() => go(step + 1)}
        />
      ) : (
        <Button label={initial ? 'Kaydet' : 'Profili oluştur'} iconRight="check" loading={submitting} onPress={submit} />
      )}
    </View>
  );

  const header = (title: string, subtitle: string) => (
    <StepHeader
      step={step}
      total={TOTAL_STEPS}
      title={title}
      subtitle={subtitle}
      onBack={step > 1 ? () => go(step - 1) : undefined}
      onClose={onClose}
    />
  );

  return (
    <Screen width="form" scroll={false} footer={footer}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        {step === 1 ? (
          <>
            {header('Ana branşın', 'Sana özel antrenman ve analizleri bu branşa göre kuracağız.')}
            <View style={styles.grid} accessibilityRole="radiogroup">
              {SPORTS.map((s) => (
                <View key={s.id} style={[styles.cell, { width: `${100 / sportColumns}%` }]}>
                  <SelectTile label={s.label} icon={s.icon} selected={primary === s.id} onPress={() => choosePrimary(s.id)} />
                </View>
              ))}
            </View>
          </>
        ) : null}

        {step === 2 ? (
          <>
            {header('Ek branşlar', `Destekleyici olarak yaptığın sporları seç. En fazla ${LIMITS.secondarySportsMax}.`)}
            <View style={styles.chips}>
              {SPORTS.filter((s) => s.id !== primary).map((s) => {
                const selected = secondary.includes(s.id);
                return (
                  <Chip
                    key={s.id}
                    label={s.label}
                    icon={s.icon}
                    selected={selected}
                    disabled={!selected && secondary.length >= LIMITS.secondarySportsMax}
                    onPress={() => setSecondary((prev) => toggle(prev, s.id, LIMITS.secondarySportsMax))}
                  />
                );
              })}
            </View>
            <AppText variant="small" color="textFaint" style={styles.hint}>
              {secondary.length}/{LIMITS.secondarySportsMax} seçildi · İsteğe bağlı
            </AppText>
          </>
        ) : null}

        {step === 3 ? (
          <>
            {header('Hedeflerin', `Neyi başarmak istiyorsun? En fazla ${LIMITS.goalsMax} hedef seç.`)}
            <View style={styles.list}>
              {GOALS.map((g) => {
                const selected = goals.includes(g.id);
                return (
                  <SelectTile
                    key={g.id}
                    layout="row"
                    multi
                    label={g.label}
                    icon={g.icon}
                    selected={selected}
                    disabled={!selected && goals.length >= LIMITS.goalsMax}
                    onPress={() => setGoals((prev) => toggle(prev, g.id, LIMITS.goalsMax))}
                  />
                );
              })}
            </View>
          </>
        ) : null}

        {step === 4 ? (
          <>
            {header('Fiziksel bilgiler', 'Kalori, yük ve toparlanma hesapları için kullanılır. Yalnızca sen görürsün.')}
            <View style={styles.form}>
              <TextField
                label="Yaş"
                icon="cake-variant-outline"
                value={age}
                onChangeText={numericChange('age', setAge)}
                keyboardType="number-pad"
                placeholder="27"
                suffix="yıl"
                error={errors.age}
                returnKeyType="next"
                onSubmitEditing={() => heightRef.current?.focus()}
              />
              <View style={styles.formRow}>
                <View style={styles.flex}>
                  <TextField
                    ref={heightRef}
                    label="Boy"
                    icon="ruler"
                    value={height}
                    onChangeText={numericChange('height', setHeight)}
                    keyboardType="number-pad"
                    placeholder="178"
                    suffix="cm"
                    error={errors.height}
                    returnKeyType="next"
                    onSubmitEditing={() => weightRef.current?.focus()}
                  />
                </View>
                <View style={styles.flex}>
                  <TextField
                    ref={weightRef}
                    label="Kilo"
                    icon="scale-bathroom"
                    value={weight}
                    onChangeText={numericChange('weight', setWeight)}
                    keyboardType="decimal-pad"
                    placeholder="75"
                    suffix="kg"
                    error={errors.weight}
                    returnKeyType="done"
                    onSubmitEditing={submit}
                  />
                </View>
              </View>
              {primary ? (
                <Card variant="outline">
                  <AppText variant="overline" color="gold">
                    Özet
                  </AppText>
                  <AppText variant="body" style={styles.summary}>
                    {getSport(primary).label}
                    {secondary.length ? ` + ${secondary.map((s) => getSport(s).label).join(', ')}` : ''}
                  </AppText>
                  <AppText variant="small" color="textMuted">
                    {goals.map((g) => GOALS.find((x) => x.id === g)?.label).join(' · ')}
                  </AppText>
                </Card>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
  cell: { padding: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hint: { marginTop: spacing.lg },
  list: { gap: spacing.sm },
  form: { gap: spacing.xl },
  formRow: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  summary: { marginTop: spacing.xs },
  footer: { gap: spacing.sm },
});
