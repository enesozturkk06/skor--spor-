import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, type ScrollViewInstance, type TextInputInstance } from 'react-native';
import Animated, { ReduceMotion, SlideInLeft, SlideInRight } from 'react-native-reanimated';

import { enter } from '@/components/motion/entrance';
import { AppText, Button, Chip, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { firstName } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { numericRejectMessage, sanitizeNumericInput, type NumericSpec } from '@/lib/numeric-input';
import { toNumber, validate } from '@/lib/validation';
import { colors, radius, spacing } from '@/theme';
import { easing } from '@/theme/motion';

import { GOALS, LIMITS, SPORTS, type GoalId, type SportId } from '../catalog';
import { bmi, bmiBand } from '../metrics';
import { onboardingDraft } from '../onboarding-draft';
import type { AthleteProfile, AthleteProfileInput } from '../types';

import { IntroStep } from './IntroStep';
import { NumberField } from './NumberField';
import { SelectTile } from './SelectTile';
import { OnboardingTopBar, StepTitle } from './StepHeader';
import { SummaryStep } from './SummaryStep';

type Props = {
  initial?: AthleteProfile | null;
  onSubmit: (input: AthleteProfileInput) => Promise<void>;
  /** Shown as a close button (edit mode). */
  onClose?: () => void;
};

/** Steps: 0 intro (first run only) · 1 sport · 2 extras · 3 goals · 4 body · 5 athlete card. */
const INPUT_STEPS = 4;
const SUMMARY = 5;

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

/** Horizontal slide in the direction of travel (preset animations: web-safe, Reduce Motion aware). */
const slide = (dir: 'forward' | 'back') =>
  (dir === 'forward' ? SlideInRight : SlideInLeft).duration(380).easing(easing.out).reduceMotion(ReduceMotion.System);

export function OnboardingFlow({ initial, onSubmit, onClose }: Props) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const editing = Boolean(initial);
  const { width } = useWindowDimensions();
  const sportColumns = width >= 720 ? 3 : 2;

  const [hydrated, setHydrated] = useState(editing);
  const [step, setStep] = useState(editing ? 1 : 0);
  const [dir, setDir] = useState<'forward' | 'back'>('forward');
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

  // Resume an unfinished onboarding (first run only; editing starts from the profile).
  useEffect(() => {
    if (editing || !userId) return;
    let active = true;
    onboardingDraft.load(userId).then((d) => {
      if (!active) return;
      if (d) {
        setStep(d.step);
        setPrimary(d.primary);
        setSecondary(d.secondary);
        setGoals(d.goals);
        setAge(d.age);
        setHeight(d.height);
        setWeight(d.weight);
      }
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, [editing, userId]);

  // Save progress on every change once the athlete has started.
  useEffect(() => {
    if (editing || !hydrated || !userId || step < 1) return;
    void onboardingDraft.save(userId, { step, primary, secondary, goals, age, height, weight });
  }, [editing, hydrated, userId, step, primary, secondary, goals, age, height, weight]);

  const go = (next: number) => {
    setDir(next > step ? 'forward' : 'back');
    setStep(next);
    setSubmitError(null);
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
  /** Stepper values are always valid; they also clear the field's error. */
  const stepped = (field: BodyField, setValue: (v: string) => void) => (v: string) => {
    setValue(v);
    setErrors((prev) => (prev[field] ? { ...prev, [field]: null } : prev));
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

  const values = () => ({
    age: Math.round(toNumber(age)),
    heightCm: Math.round(toNumber(height)),
    weightKg: Math.round(toNumber(weight) * 10) / 10,
  });

  const submit = async () => {
    if (!primary || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit({ primarySport: primary, secondarySports: secondary, goals, ...values() });
      haptics.success();
      // Saved: the draft is no longer needed (kept on failure so nothing is lost).
      if (!editing && userId) void onboardingDraft.clear(userId);
    } catch (error) {
      haptics.error();
      setSubmitError(error instanceof Error ? error.message : 'Profil kaydedilemedi.');
      setSubmitting(false);
    }
  };

  const canContinue = step === 1 ? Boolean(primary) : step === 3 ? goals.length > 0 : true;
  const preview = bmi(toNumber(height), toNumber(weight));
  const showPreview =
    preview !== null &&
    !validate.intInRange(height, LIMITS.heightCm.min, LIMITS.heightCm.max, 'Boy') &&
    !validate.intInRange(weight, LIMITS.weightKg.min, LIMITS.weightKg.max, 'Kilo');

  // Render-time values only; the click logic lives in onPrimary (an event handler).
  const skipping = step === 2 && secondary.length === 0;
  const actionLabel =
    step === 0 ? 'Başlayalım' : skipping ? 'Bu adımı atla' : step < SUMMARY ? 'Devam et' : editing ? 'Kaydet' : 'Profili oluştur';

  const onPrimary = () => {
    if (step === INPUT_STEPS) {
      if (validateBody()) go(SUMMARY);
    } else if (step === SUMMARY) {
      void submit();
    } else {
      go(step + 1);
    }
  };

  const footer = hydrated ? (
    <View style={styles.footer}>
      {submitError ? (
        <AppText variant="small" color="danger" align="center" accessibilityRole="alert">
          {submitError}
        </AppText>
      ) : null}
      <Button
        label={actionLabel}
        variant={skipping ? 'secondary' : 'primary'}
        iconRight={step === SUMMARY ? 'check' : 'arrow-right'}
        disabled={step >= 1 && step <= 3 && !canContinue}
        loading={step === SUMMARY && submitting}
        onPress={onPrimary}
      />
    </View>
  ) : null;

  const backTarget = step === 1 ? (editing ? null : 0) : step > 1 ? step - 1 : null;

  return (
    <Screen width="form" scroll={false} footer={footer}>
      {step > 0 || editing ? (
        <OnboardingTopBar
          step={Math.min(step, INPUT_STEPS)}
          total={INPUT_STEPS}
          complete={step === SUMMARY}
          onBack={backTarget !== null && !submitting ? () => go(backTarget) : undefined}
          onClose={onClose}
        />
      ) : null}
      <View style={styles.viewport}>
        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          {hydrated ? (
            <Animated.View key={step} entering={step === 0 ? undefined : slide(dir)} testID={`onboarding-step-${step}`}>
              {step === 0 ? <IntroStep firstName={firstName(user?.displayName ?? '')} /> : null}

              {step === 1 ? (
                <>
                  <StepTitle title="Ana branşın" subtitle="Sana özel antrenman ve analizleri bu branşa göre kuracağız." />
                  <View style={styles.grid} accessibilityRole="radiogroup">
                    {SPORTS.map((s, i) => (
                      <Animated.View key={s.id} entering={enter(i, { step: 35, delay: 120 })} style={[styles.cell, { width: `${100 / sportColumns}%` }]}>
                        <SelectTile label={s.label} icon={s.icon} selected={primary === s.id} onPress={() => choosePrimary(s.id)} />
                      </Animated.View>
                    ))}
                  </View>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <StepTitle title="Ek branşlar" subtitle={`Destekleyici olarak yaptığın sporları seç. En fazla ${LIMITS.secondarySportsMax}.`} />
                  <View style={styles.chips}>
                    {SPORTS.filter((s) => s.id !== primary).map((s, i) => {
                      const selected = secondary.includes(s.id);
                      return (
                        <Animated.View key={s.id} entering={enter(i, { step: 30, delay: 120 })}>
                          <Chip
                            label={s.label}
                            icon={s.icon}
                            selected={selected}
                            disabled={!selected && secondary.length >= LIMITS.secondarySportsMax}
                            onPress={() => setSecondary((prev) => toggle(prev, s.id, LIMITS.secondarySportsMax))}
                          />
                        </Animated.View>
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
                  <StepTitle title="Hedeflerin" subtitle={`Neyi başarmak istiyorsun? En fazla ${LIMITS.goalsMax} hedef seç.`} />
                  <View style={styles.list}>
                    {GOALS.map((g, i) => {
                      const selected = goals.includes(g.id);
                      return (
                        <Animated.View key={g.id} entering={enter(i, { step: 40, delay: 120 })}>
                          <SelectTile
                            layout="row"
                            multi
                            label={g.label}
                            icon={g.icon}
                            selected={selected}
                            disabled={!selected && goals.length >= LIMITS.goalsMax}
                            onPress={() => setGoals((prev) => toggle(prev, g.id, LIMITS.goalsMax))}
                          />
                        </Animated.View>
                      );
                    })}
                  </View>
                  <AppText variant="small" color={goals.length ? 'gold' : 'textFaint'} style={styles.hint} testID="goals-count">
                    {goals.length}/{LIMITS.goalsMax} hedef seçildi
                  </AppText>
                </>
              ) : null}

              {step === 4 ? (
                <>
                  <StepTitle title="Fiziksel bilgiler" subtitle="Kalori, yük ve toparlanma hesapları için kullanılır. Yalnızca sen görürsün." />
                  <View style={styles.form}>
                    <Animated.View entering={enter(0, { delay: 120 })}>
                      <NumberField
                        label="Yaş"
                        icon="cake-variant-outline"
                        value={age}
                        onChangeText={numericChange('age', setAge)}
                        onStep={stepped('age', setAge)}
                        min={LIMITS.age.min}
                        max={LIMITS.age.max}
                        step={1}
                        start={25}
                        keyboardType="number-pad"
                        placeholder="27"
                        suffix="yıl"
                        error={errors.age}
                        returnKeyType="next"
                        onSubmitEditing={() => heightRef.current?.focus()}
                      />
                    </Animated.View>
                    <Animated.View entering={enter(1, { delay: 120 })}>
                      <NumberField
                        ref={heightRef}
                        label="Boy"
                        icon="ruler"
                        value={height}
                        onChangeText={numericChange('height', setHeight)}
                        onStep={stepped('height', setHeight)}
                        min={LIMITS.heightCm.min}
                        max={LIMITS.heightCm.max}
                        step={1}
                        start={175}
                        keyboardType="number-pad"
                        placeholder="178"
                        suffix="cm"
                        error={errors.height}
                        returnKeyType="next"
                        onSubmitEditing={() => weightRef.current?.focus()}
                      />
                    </Animated.View>
                    <Animated.View entering={enter(2, { delay: 120 })}>
                      <NumberField
                        ref={weightRef}
                        label="Kilo"
                        icon="scale-bathroom"
                        value={weight}
                        onChangeText={numericChange('weight', setWeight)}
                        onStep={stepped('weight', setWeight)}
                        min={LIMITS.weightKg.min}
                        max={LIMITS.weightKg.max}
                        step={0.5}
                        start={70}
                        keyboardType="decimal-pad"
                        placeholder="75"
                        suffix="kg"
                        error={errors.weight}
                        returnKeyType="done"
                        onSubmitEditing={() => validateBody() && go(SUMMARY)}
                      />
                    </Animated.View>
                    {showPreview && preview !== null ? (
                      <Animated.View entering={enter(0)} style={styles.preview} testID="bmi-preview" accessibilityLiveRegion="polite">
                        <AppText variant="overline" color="gold">
                          Anlık önizleme
                        </AppText>
                        <AppText variant="body">
                          Vücut kitle indeksin{' '}
                          <AppText variant="bodyStrong" color="orange">
                            {preview.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                          </AppText>{' '}
                          · {bmiBand(preview)}
                        </AppText>
                        <AppText variant="small" color="textFaint">
                          Bilgi amaçlıdır; tıbbi değerlendirme yerine geçmez.
                        </AppText>
                      </Animated.View>
                    ) : null}
                  </View>
                </>
              ) : null}

              {step === SUMMARY && primary ? (
                <SummaryStep
                  name={user?.displayName ?? ''}
                  primary={primary}
                  secondary={secondary}
                  goals={goals}
                  {...values()}
                />
              ) : null}
            </Animated.View>
          ) : null}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Clips the horizontal slide so it never causes page-wide horizontal scroll.
  viewport: { flex: 1, overflow: 'hidden' },
  scroll: { paddingBottom: spacing.xxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
  cell: { padding: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hint: { marginTop: spacing.lg },
  list: { gap: spacing.sm },
  form: { gap: spacing.xl },
  footer: { gap: spacing.sm },
  preview: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
