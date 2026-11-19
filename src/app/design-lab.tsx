import { Redirect } from 'expo-router';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { AppText, Card, Icon, Screen, type IconName } from '@/components/ui';
import { APP_ICONS } from '@/components/ui/icon-system';
import { SPORT_GLYPHS, type SportGlyphName } from '@/components/ui/sport-glyphs';
import { Badge, BarChart, MetricRing, Sparkline, SportMotif, StatTile, TrendLine } from '@/components/viz';
import { SPORTS } from '@/features/athlete/catalog';
import { ACHIEVEMENTS } from '@/features/training/achievements';
import { colors, radius, spacing, sportFamilies, type SportFamily } from '@/theme';

/**
 * Internal gallery of the Phase 2A design system (surfaces, icons, sport
 * identity, charts, badges). Enabled only in development and E2E builds
 * (EXPO_PUBLIC_MOTION_LAB=1); production builds redirect to the app.
 * Every number here is a labelled SAMPLE for review — never user data.
 */
const ENABLED = __DEV__ || process.env.EXPO_PUBLIC_MOTION_LAB === '1';

const FAMILY_OF: Record<string, SportFamily> = { strength: 'strength', combat: 'combat', team: 'team', endurance: 'endurance', racket: 'racket' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="h2" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

export default function DesignLab() {
  const { width } = useWindowDimensions();
  if (!ENABLED) return <Redirect href="/" />;
  const wide = width >= 900;

  return (
    <Screen width="content">
      <View style={styles.stack}>
        <View>
          <AppText variant="h1" accessibilityRole="header">
            Tasarım laboratuvarı
          </AppText>
          <AppText variant="small" color="textFaint" testID="lab-sample-note">
            Örnek değerler — yalnızca tasarım incelemesi içindir, kullanıcı verisi değildir.
          </AppText>
        </View>

        <Section title="Yüzeyler">
          <View style={[styles.row, wide && styles.rowWide]}>
            {(['surface', 'raised', 'featured'] as const).map((v) => (
              <Card key={v} variant={v} glow={v === 'featured' ? 'petrol' : undefined} accent={v === 'featured' ? 'orange' : 'none'} style={styles.flex}>
                <AppText variant="overline" color="gold">
                  {v === 'surface' ? 'Taban' : v === 'raised' ? 'Yükseltilmiş' : 'Öne çıkan'}
                </AppText>
                <AppText variant="body" color="textMuted">
                  {v === 'surface' ? 'Listeler, ikincil içerik.' : v === 'raised' ? 'Taban katmandan ayrışan grup.' : 'Ekranın tek odak kartı: parlama ve gölge yalnızca burada.'}
                </AppText>
              </Card>
            ))}
          </View>
        </Section>

        <Section title="Branş ikonları">
          <View style={styles.grid}>
            {SPORTS.map((s) => (
              <View key={s.id} style={styles.glyphCell} testID={`lab-sport-${s.id}`}>
                <View style={[styles.glyphTile, { backgroundColor: colors.surfaceAlt }]}>
                  <Icon name={s.icon} size={28} color="text" />
                </View>
                <AppText variant="small" color="textMuted">
                  {s.label}
                </AppText>
              </View>
            ))}
          </View>
          <AppText variant="small" color="textFaint">
            {Object.keys(SPORT_GLYPHS).length} özgün ikon · 24 px ızgara · 1,75 çizgi · tek metafor: ekipman
          </AppText>
        </Section>

        <Section title="Branş kimliği">
          <View style={[styles.row, wide && styles.rowWide, styles.wrap]}>
            {(Object.keys(sportFamilies) as SportFamily[]).map((f) => {
              const sport = SPORTS.find((s) => FAMILY_OF[s.category] === f);
              return (
                <Card key={f} variant="raised" style={styles.familyCard}>
                  <SportMotif family={f} width={150} height={92} style={styles.motif} />
                  <View style={styles.familyHead}>
                    <Icon name={(sport?.icon ?? 'sport-fitness') as SportGlyphName} size={22} color="text" />
                    <AppText variant="h3" style={{ color: sportFamilies[f].accentLight }}>
                      {sportFamilies[f].label}
                    </AppText>
                  </View>
                  <AppText variant="small" color="textMuted">
                    Motif: {sportFamilies[f].motif}
                  </AppText>
                </Card>
              );
            })}
          </View>
        </Section>

        <Section title="Arayüz ikonları">
          <View style={styles.grid}>
            {(Object.entries(APP_ICONS) as [string, { outline: IconName; filled?: IconName }][]).map(([k, v]) => (
              <View key={k} style={styles.glyphCell}>
                <View style={styles.iconPair}>
                  <Icon name={v.outline} size={24} color="textMuted" />
                  {v.filled ? <Icon name={v.filled} size={24} color="orange" /> : null}
                </View>
                <AppText variant="small" color="textFaint">
                  {k}
                </AppText>
              </View>
            ))}
          </View>
        </Section>

        <Section title="İstatistik">
          <View style={[styles.row, styles.wrap]}>
            <StatTile label="Bu hafta" value={185} unit="dk" icon="timer-outline" delta={{ value: 40, period: 'geçen haftaya göre' }} spark={[60, 120, 95, 145, 185]} testID="lab-stat-1" />
            <StatTile label="Seans" value={4} icon="calendar-check-outline" delta={{ value: -1, period: 'geçen haftaya göre' }} level="raised" testID="lab-stat-2" />
            <StatTile label="Ort. zorluk" value="7,0" unit="RPE" icon={APP_ICONS.intensity.outline} testID="lab-stat-3" />
          </View>
          <View style={[styles.row, styles.rings]}>
            <MetricRing progress={0.62} value="37" unit="dk" caption="Günlük hedef" animated testID="lab-ring-1" />
            <MetricRing progress={0.4} value="2/5" caption="Haftalık gün" tone="gold" size={92} testID="lab-ring-2" />
            <MetricRing progress={0.85} value="5" caption="Seviye" tone="petrol" size={92} testID="lab-ring-3" />
          </View>
        </Section>

        <Section title="Grafikler">
          <View style={[styles.row, wide && styles.rowWide]}>
            <Card style={styles.flex}>
              <AppText variant="overline" color="gold">
                Bu hafta · dakika
              </AppText>
              <BarChart
                label="Bu hafta antrenman dakikası (örnek)"
                unit="dk"
                goal={60}
                data={[
                  { label: 'Pzt', value: 45 },
                  { label: 'Sal', value: 0 },
                  { label: 'Çar', value: 62 },
                  { label: 'Per', value: 30 },
                  { label: 'Cum', value: 55, highlight: true },
                  { label: 'Cmt', value: 0 },
                  { label: 'Paz', value: 0 },
                ]}
                testID="lab-bars"
              />
            </Card>
            <Card style={styles.flex}>
              <AppText variant="overline" color="gold">
                Tahmini 1RM · Bench press
              </AppText>
              <TrendLine
                label="Tahmini 1RM, bench press (örnek)"
                unit="kg"
                points={[
                  { label: 'Ağu', value: 82.5 },
                  { label: 'Eyl', value: 85 },
                  { label: 'Eki', value: 88 },
                  { label: 'Eki', value: 87 },
                  { label: 'Kas', value: 92.5 },
                ]}
                testID="lab-trend"
              />
            </Card>
          </View>
          <View style={[styles.row, wide && styles.rowWide]}>
            <Card style={styles.flex}>
              <AppText variant="overline" color="gold">
                Sparkline
              </AppText>
              <Sparkline values={[3, 5, 4, 7, 6, 9]} label="Haftalık seans (örnek)" testID="lab-spark" />
            </Card>
            <Card style={styles.flex}>
              <AppText variant="overline" color="gold">
                Veri yetersiz
              </AppText>
              <Sparkline values={[4]} label="Yeni egzersiz" testID="lab-spark-empty" />
              <TrendLine points={[]} label="Yeni egzersiz 1RM" height={80} testID="lab-trend-empty" />
            </Card>
          </View>
        </Section>

        <Section title="Rozetler">
          <View style={styles.badges}>
            {ACHIEVEMENTS.slice(0, 6).map((a, i) => (
              <Badge
                key={a.id}
                label={a.label}
                tier={a.tier}
                icon={a.icon}
                earned={i % 2 === 0}
                progress={i % 2 === 0 ? undefined : { current: Math.floor(a.target / 2), target: a.target }}
                testID={`lab-badge-${a.id}`}
              />
            ))}
          </View>
        </Section>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.xxxl, paddingBottom: spacing.huge },
  section: { gap: spacing.lg },
  row: { gap: spacing.md },
  rowWide: { flexDirection: 'row' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 240 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  glyphCell: { width: 84, alignItems: 'center', gap: spacing.xs },
  glyphTile: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  iconPair: { flexDirection: 'row', gap: spacing.sm, height: 32, alignItems: 'center' },
  familyCard: { minWidth: 200, flexGrow: 1, flexBasis: 200, minHeight: 110 },
  motif: { position: 'absolute', top: 0, right: 0 },
  familyHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rings: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
});
