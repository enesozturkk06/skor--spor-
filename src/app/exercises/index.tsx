import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';

import { enter, fadeIn } from '@/components/motion/entrance';
import { AppText, Card, Chip, Icon, Screen, TextField } from '@/components/ui';
import { SPORTS, type SportId } from '@/features/athlete/catalog';
import { useAthlete } from '@/features/athlete/AthleteProvider';
import { EXERCISES, filterExercises } from '@/features/exercises/catalog';
import { ExerciseCard } from '@/features/exercises/components/ExerciseCard';
import { MuscleMap } from '@/features/exercises/components/MuscleMap';
import { NavBar } from '@/features/exercises/components/NavBar';
import { MUSCLE_GROUPS, MUSCLES, musclesOfGroup, type MuscleGroupId, type MuscleId } from '@/features/exercises/muscles';
import { colors, layout, radius, spacing } from '@/theme';

type MuscleFilter = { kind: 'muscle'; id: MuscleId } | { kind: 'group'; id: MuscleGroupId } | null;

/** Entrance stagger is capped so long lists never wait on their own animation. */
const MAX_STAGGER = 8;

export default function ExerciseLibraryScreen() {
  const router = useRouter();
  const { profile } = useAthlete();
  const { width } = useWindowDimensions();
  const wide = width >= layout.wideBreakpoint;

  const [query, setQuery] = useState('');
  const [sport, setSport] = useState<SportId | null>(null);
  const [muscle, setMuscle] = useState<MuscleFilter>(null);

  // The athlete's own sports come first in the sport filter.
  const sports = useMemo(() => {
    const mine = profile ? [profile.primarySport, ...profile.secondarySports] : [];
    return [...SPORTS].sort((a, b) => rank(mine, a.id) - rank(mine, b.id));
  }, [profile]);

  const results = useMemo(
    () =>
      filterExercises({
        query,
        sport,
        muscle: muscle?.kind === 'muscle' ? muscle.id : null,
        group: muscle?.kind === 'group' ? muscle.id : null,
      }),
    [query, sport, muscle],
  );

  const open = useCallback((key: string) => router.push({ pathname: '/exercises/[key]', params: { key } }), [router]);
  const filtered = Boolean(query || sport || muscle);
  const clearAll = () => {
    setQuery('');
    setSport(null);
    setMuscle(null);
  };

  const mapPrimary = muscle?.kind === 'group' ? musclesOfGroup(muscle.id) : [];
  const mapSelected = muscle?.kind === 'muscle' ? muscle.id : null;

  const filters = (
    <View style={styles.stack}>
      <Animated.View entering={enter(1)}>
        <TextField
          label="Ara"
          icon="magnify"
          value={query}
          onChangeText={setQuery}
          placeholder="Egzersiz, kas ya da İngilizce ad"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </Animated.View>

      <Animated.View entering={enter(2)}>
        <Card padded={false} accent="orange">
          <View style={styles.mapCard}>
            <View style={styles.mapHead}>
              <AppText variant="overline" color="gold">
                Kas haritası
              </AppText>
              <AppText variant="small" color="textMuted">
                Bir kasa dokun, o kası çalıştıran egzersizler listelensin.
              </AppText>
            </View>
            <MuscleMap
              testID="library-map"
              primary={mapPrimary}
              selected={mapSelected}
              height={wide ? 300 : 250}
              onSelect={(m) => setMuscle((cur) => (cur?.kind === 'muscle' && cur.id === m ? null : { kind: 'muscle', id: m }))}
            />
            {muscle ? (
              <Animated.View entering={fadeIn()} style={styles.activeMuscle}>
                <AppText variant="smallStrong" color="orange" testID="library-muscle">
                  {muscle.kind === 'muscle'
                    ? `${MUSCLES[muscle.id].tr} · ${MUSCLES[muscle.id].en}`
                    : MUSCLE_GROUPS.find((g) => g.id === muscle.id)!.label}
                </AppText>
                <Pressable accessibilityRole="button" accessibilityLabel="Kas filtresini kaldır" onPress={() => setMuscle(null)} style={styles.touchIcon}>
                  <Icon name="close-circle-outline" size={18} color="textMuted" />
                </Pressable>
              </Animated.View>
            ) : null}
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={enter(3)} style={styles.filterBlock}>
        <AppText variant="overline" color="textMuted">
          Kas grubu
        </AppText>
        <ChipRow wrap={wide}>
          {MUSCLE_GROUPS.map((g) => (
            <Chip
              key={g.id}
              label={g.label}
              selected={muscle?.kind === 'group' && muscle.id === g.id}
              onPress={() => setMuscle((cur) => (cur?.kind === 'group' && cur.id === g.id ? null : { kind: 'group', id: g.id }))}
            />
          ))}
        </ChipRow>
        <AppText variant="overline" color="textMuted">
          Branş
        </AppText>
        <ChipRow wrap={wide}>
          {sports.map((s) => (
            <Chip
              key={s.id}
              label={s.label}
              icon={s.icon}
              tone="gold"
              selected={sport === s.id}
              onPress={() => setSport((cur) => (cur === s.id ? null : s.id))}
            />
          ))}
        </ChipRow>
      </Animated.View>
    </View>
  );

  const list = (
    <View style={styles.stack}>
      <View style={styles.resultsHead}>
        <AppText variant="smallStrong" color="textMuted" accessibilityLiveRegion="polite" testID="library-count">
          {filtered ? `${results.length} / ${EXERCISES.length} egzersiz` : `${EXERCISES.length} egzersiz`}
        </AppText>
        {filtered ? (
          <Pressable accessibilityRole="button" onPress={clearAll} style={styles.touchText}>
            <AppText variant="smallStrong" color="orange">
              Filtreleri temizle
            </AppText>
          </Pressable>
        ) : null}
      </View>
      {results.length ? (
        results.map((e, i) => (
          <Animated.View key={e.key} entering={enter(Math.min(i, MAX_STAGGER), { step: 35, delay: 120 })}>
            <ExerciseCard exercise={e} onPress={open} />
          </Animated.View>
        ))
      ) : (
        <Animated.View entering={fadeIn()}>
          <Card variant="outline">
            <View style={styles.empty}>
              <Icon name="magnify" size={28} color="textFaint" />
              <AppText variant="h3">Sonuç bulunamadı</AppText>
              <AppText variant="small" color="textMuted" align="center">
                Farklı bir arama dene ya da filtreleri temizle.
              </AppText>
            </View>
          </Card>
        </Animated.View>
      )}
    </View>
  );

  return (
    <Screen width="content">
      <NavBar overline="Antrenman" fallback="/training" />
      <Animated.View entering={enter(0)} style={styles.title}>
        <AppText variant="display" accessibilityRole="header">
          Egzersiz kütüphanesi
        </AppText>
        <AppText variant="body" color="textMuted">
          Teknik, nefes, sık yapılan hatalar ve hedefine göre set önerileri.
        </AppText>
      </Animated.View>
      {wide ? (
        <View style={styles.columns}>
          <View style={styles.side}>{filters}</View>
          <View style={styles.main}>{list}</View>
        </View>
      ) : (
        <View style={styles.stackLg}>
          {filters}
          {list}
        </View>
      )}
    </Screen>
  );
}

const rank = (mine: SportId[], id: SportId) => {
  const i = mine.indexOf(id);
  return i === -1 ? 99 : i;
};

/**
 * Filter chips. Wide layouts wrap them onto several lines (never cut off at
 * the column edge); phones scroll them sideways, with a soft fade on the
 * right edge while more chips are hidden there.
 */
function ChipRow({ children, wrap }: { children: ReactNode; wrap: boolean }) {
  const [box, setBox] = useState(0);
  const [content, setContent] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  if (wrap) return <View style={[styles.chips, styles.chipsWrap]}>{children}</View>;
  const more = content > box + 1 && !atEnd;
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipScroll}
        onLayout={(e) => setBox(e.nativeEvent.layout.width)}
        onContentSizeChange={(w) => setContent(w)}
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          setAtEnd(contentOffset.x + layoutMeasurement.width >= contentSize.width - 4);
        }}
        scrollEventThrottle={32}
      >
        {children}
      </ScrollView>
      {more ? (
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(8,13,13,0)', colors.bg]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.chipFade}
          testID="chip-scroll-hint"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { gap: spacing.sm, marginBottom: spacing.xxl },
  stack: { gap: spacing.md },
  stackLg: { gap: spacing.xxl },
  columns: { flexDirection: 'row', gap: spacing.xxl, alignItems: 'flex-start' },
  side: { width: 400 },
  main: { flex: 1, minWidth: 0 },
  mapCard: { padding: spacing.lg, gap: spacing.lg },
  mapHead: { gap: spacing.xs },
  activeMuscle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.orangeSoft,
  },
  filterBlock: { gap: spacing.sm },
  chipScroll: { marginHorizontal: -layout.gutter, flexGrow: 0 },
  chips: { gap: spacing.sm, paddingHorizontal: layout.gutter, paddingBottom: spacing.xs },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 0 },
  chipFade: { position: 'absolute', top: 0, bottom: 0, right: -layout.gutter, width: 40 },
  // 44 px touch targets for the small filter controls.
  touchIcon: { width: layout.minTouch, height: layout.minTouch, alignItems: 'center', justifyContent: 'center', marginVertical: -13, marginRight: -13 },
  touchText: { minHeight: layout.minTouch, justifyContent: 'center', paddingLeft: spacing.sm, marginVertical: -13 },
  resultsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
});
