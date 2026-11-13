# SKOR SPOR

**OWN YOUR PERFORMANCE.** — Fitness, beslenme, recovery, performans ve dövüş sporlarını tek çatıda toplayan sporcu platformu.

Expo (SDK 58) · React Native 0.88 · TypeScript · Expo Router · Supabase · Web / iOS / Android

## Çalıştırma

```bash
npm install
npm run web        # tarayıcı
npm start          # Expo Go / emülatör için QR
npm run typecheck  # tsc --noEmit
npm run lint       # expo lint
```

## Supabase bağlantısı

Anahtarlar yoksa uygulama **Demo modunda** çalışır: hesap bilgisi (ad, e-posta) yalnızca cihazda tutulur, şifre hiç saklanmaz. Ekranlarda bu durum açıkça belirtilir.

Gerçek backend'e geçmek için:

1. `.env.example` dosyasını `.env` olarak kopyalayın, `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY` değerlerini girin (yalnızca **anon** anahtar — service-role anahtarı asla istemciye konmaz).
2. `supabase/migrations/0001_athlete_profiles.sql` dosyasını Supabase SQL editöründe çalıştırın (tablo + RLS politikaları).
3. Uygulamayı yeniden başlatın. Kimlik doğrulama ve profil senkronizasyonu otomatik olarak Supabase'e geçer.

## Mimari

```
src/
  app/                    Expo Router rotaları (yalnızca ekranlar)
    _layout.tsx           Fontlar, sağlayıcılar, korumalı rota grupları
    welcome / sign-in / sign-up / onboarding / profile-edit
    (tabs)/               Ana Sayfa · Antrenman · AI Koç · Beslenme · Profil
    module/[id].tsx       Sekmede olmayan modüller (Egzersiz, Recovery, Performans, Topluluk)
  components/ui/          Tasarım sistemi bileşenleri (AppText, Button, Card, TextField, ProgressRing…)
  components/navigation/  Özel alt navigasyon çubuğu
  features/
    auth/                 AuthService arayüzü — Supabase ve Demo uygulamaları
    athlete/              Branş/hedef kataloğu, profil deposu (local-first + Supabase), onboarding
    dashboard/            Athlete Score hesabı, dashboard verisi ve kartları
    modules/              9 modülün meta verisi ve önizleme ekranları
  lib/                    env, storage, supabase istemcisi, doğrulama, biçimlendirme
  theme/                  Renk, boşluk, radius, font token'ları ve tip ölçeği
supabase/migrations/      Veritabanı şeması
```

### Tasarım sistemi

- Marka renkleri: Petrol `#073C38`, Orange `#FF7138`, Gold `#D6B77A`, Near Black `#080D0D` — tüm renkler `src/theme/tokens.ts` üzerinden.
- Tipografi: Barlow Condensed (başlık / rakam), Inter (gövde).
- Motif: öne eğik "skor çizgileri" (logo, açılış ekranı) ve kart üstü kısa vurgu çizgisi.
- Türkçe büyük harf: `AppText`, büyük harf stillerini `tr-TR` locale ile dönüştürür (CSS `uppercase` "GİRİŞ"i "GIRIŞ" yapar).

### Navigasyon kuralları

`Stack.Protected` grupları: oturum yok → açılış/giriş/kayıt · oturum var + profil yok → onboarding · ikisi de var → sekmeler. Her grup `redirectTo` ile engellenen ziyaretçiyi doğru ekrana yönlendirir.

## Durum

| Özellik | Durum |
| --- | --- |
| Açılış, giriş, kayıt, onboarding, dashboard, profil, profil düzenleme | ✅ Çalışıyor |
| Supabase auth + profil senkronizasyonu | ✅ Kodlandı, anahtar girilince aktif (henüz canlı test edilmedi) |
| Dashboard aktivite rakamları | ⚠️ Örnek veri (ekranda belirtiliyor); kalori/makro/süre hedefleri profilden hesaplanır |
| Antrenman, Beslenme, AI Koç, Egzersiz, Recovery, Performans, Topluluk | 🚧 Önizleme ekranı + yol haritası |
