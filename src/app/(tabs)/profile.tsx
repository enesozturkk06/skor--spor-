import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTabBarClearance } from '@/components/navigation/TabBar';
import { AppText, Button, Card, Chip, Icon, Screen, SectionHeader, Tag } from '@/components/ui';
import { useAthlete } from '@/features/athlete/AthleteProvider';
import { getGoal, getSport } from '@/features/athlete/catalog';
import { useAuth } from '@/features/auth/AuthProvider';
import { initials } from '@/lib/format';
import { colors, fonts, radius, spacing } from '@/theme';

function bmi(heightCm: number, weightKg: number): number {
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, mode, signOut } = useAuth();
  const { profile } = useAthlete();
  const clearance = useTabBarClearance();
  const [signingOut, setSigningOut] = useState(false);

  if (!user || !profile) return null;
  const sport = getSport(profile.primarySport);
  const memberSince = new Date(profile.createdAt).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

  const metrics = [
    { label: 'Yaş', value: String(profile.age), unit: 'yıl' },
    { label: 'Boy', value: String(profile.heightCm), unit: 'cm' },
    { label: 'Kilo', value: profile.weightKg.toLocaleString('tr-TR'), unit: 'kg' },
    { label: 'VKİ', value: bmi(profile.heightCm, profile.weightKg).toLocaleString('tr-TR'), unit: '' },
  ];

  return (
    <Screen width="form" edges={['top', 'left', 'right']} bottomInset={clearance}>
      <View style={styles.stack}>
        <Card variant="hero" accent="gold">
          <View style={styles.identity}>
            <View style={styles.avatar}>
              <AppText style={styles.avatarText}>{initials(user.displayName)}</AppText>
            </View>
            <View style={styles.identityText}>
              <AppText variant="h1" numberOfLines={1}>
                {user.displayName}
              </AppText>
              <AppText variant="small" color="textMuted" numberOfLines={1}>
                {user.email}
              </AppText>
              <View style={styles.tags}>
                <Tag label={sport.label} tone="orange" icon={sport.icon} />
                {mode === 'demo' ? <Tag label="Demo hesap" tone="gold" /> : <Tag label="Doğrulandı" tone="success" />}
              </View>
            </View>
          </View>
          <View style={styles.metrics}>
            {metrics.map((m, i) => (
              <View key={m.label} style={[styles.metric, i > 0 && styles.metricDivider]}>
                <AppText variant="overline" color="textMuted">
                  {m.label}
                </AppText>
                <AppText variant="statM">
                  {m.value}
                  {m.unit ? (
                    <AppText variant="small" color="textMuted">
                      {' '}
                      {m.unit}
                    </AppText>
                  ) : null}
                </AppText>
              </View>
            ))}
          </View>
        </Card>

        <View>
          <SectionHeader overline="Sporcu kimliği" title="Branşlar" />
          <Card>
            <View style={styles.primary}>
              <View style={styles.sportIcon}>
                <Icon name={sport.icon} size={26} color="textOnOrange" />
              </View>
              <View>
                <AppText variant="overline" color="gold">
                  Ana branş
                </AppText>
                <AppText variant="h3">{sport.label}</AppText>
              </View>
            </View>
            {profile.secondarySports.length ? (
              <View style={styles.chips}>
                {profile.secondarySports.map((id) => {
                  const s = getSport(id);
                  return <Chip key={id} label={s.label} icon={s.icon} />;
                })}
              </View>
            ) : (
              <AppText variant="small" color="textFaint" style={styles.empty}>
                Ek branş eklenmedi.
              </AppText>
            )}
          </Card>
        </View>

        <View>
          <SectionHeader overline="Odak" title="Hedefler" />
          <View style={styles.chips}>
            {profile.goals.map((id) => {
              const g = getGoal(id);
              return <Chip key={id} label={g.label} icon={g.icon} selected tone="gold" />;
            })}
          </View>
        </View>

        <View style={styles.actions}>
          <Button label="Profili düzenle" variant="secondary" icon="pencil-outline" onPress={() => router.push('/profile-edit')} />
          <Button
            label="Çıkış yap"
            variant="danger"
            icon="logout"
            loading={signingOut}
            onPress={async () => {
              setSigningOut(true);
              await signOut();
            }}
          />
          <AppText variant="small" color="textFaint" align="center">
            {memberSince} tarihinden beri SKOR SPOR sporcusu
          </AppText>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.xxl },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingTop: spacing.xs },
  identityText: { flex: 1, gap: spacing.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.gold,
  },
  avatarText: { fontFamily: fonts.display, fontSize: 30, color: colors.gold, letterSpacing: 1 },
  metrics: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  metric: { flex: 1, alignItems: 'center', gap: spacing.xxs },
  metricDivider: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.08)' },
  primary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sportIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orange,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  empty: { marginTop: spacing.md },
  actions: { gap: spacing.md },
});
