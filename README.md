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
npm test           # Playwright uçtan uca testleri
npm run check      # typecheck + lint + E2E (commit öncesi)
```

## Testler

Uçtan uca testler [e2e/](e2e/) klasöründe, Playwright ile yazıldı. Testler geliştirme sunucusuna değil **üretim web derlemesine** karşı çalışır: `npm test` önce `dist/`'i derler (`npm run build:web`), sonra `scripts/serve-web.mjs` ile sunar.

| Komut | Açıklama |
| --- | --- |
| `npm test` | Tüm testler (mobil + masaüstü yerleşim) |
| `npm run test:e2e:mobile` | Yalnızca mobil (Pixel 7) proje |
| `npm run test:e2e:ui` | Etkileşimli Playwright arayüzü |
| `npm run test:e2e:report` | Son çalıştırmanın HTML raporu |

- Kapsam: açılış, kayıt/giriş doğrulamaları, onboarding kuralları (branş/hedef sınırları, aralık kontrolleri), dashboard bölümleri, sekmeler, profil düzenleme, çıkış, sayfa yenileme sonrası oturum davranışı, responsive taşma.
- Her test temiz bir tarayıcı bağlamında (boş depolama) çalışır; tarayıcı konsolunda hata oluşursa test başarısız sayılır.
- İlk kurulumda tarayıcı yoksa: `npx playwright install chromium`.
- Ortak adımlar ve seçiciler [e2e/fixtures.ts](e2e/fixtures.ts) içindedir. Büyük harfle gösterilen başlıklar `tr-TR` ile eşleştirilir.

## Web yayını (deploy) notu

Web derlemesi tek sayfalık uygulamadır (`web.output: "single"`). Barındırma servisinde **tüm uygulama rotalarını `index.html`'e yönlendiren (SPA fallback) kural zorunludur**; aksi halde `/welcome`, `/onboarding` gibi sayfalar yenilendiğinde 404 döner. `expo serve` bu kuralı uygulamaz; yerelde `npm run build:web && npm run serve:web` kullanın.

## Supabase bağlantısı

Anahtarlar yoksa uygulama **Demo modunda** çalışır: hesap bilgisi (ad, e-posta) yalnızca cihazda tutulur, şifre hiç saklanmaz. Ekranlarda bu durum açıkça belirtilir.

Gerçek backend'e geçmek için:

1. `.env.example` dosyasını `.env` olarak kopyalayın, `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY` değerlerini girin. Buraya yalnızca **publishable** (`sb_publishable_…`) anahtar konur; secret / service_role anahtarı asla istemciye, `.env`'e veya Git'e girmez.
2. Veritabanı şemasını Supabase CLI ile uygulayın (CLI projeye sabit sürümle eklidir, `npx supabase`):

   ```bash
   npx supabase login                                   # tarayıcıda onay; token Windows Credential Manager'da saklanır
   npx supabase link --project-ref <proje-ref>
   npm run db:push:dry                                  # neyin uygulanacağını gösterir, hiçbir şey değiştirmez
   npx supabase db push --remote                        # uygular; barındırılan projede onay ister (varsayılan: Hayır)
   npm run db:status                                    # yerel dosyalar ↔ canlı migration geçmişi
   ```

   Migration'lar `supabase/migrations/<zaman damgası>_<ad>.sql` biçimindedir, tekrar çalıştırılabilir ve tek işlem (transaction) içinde uygulanır.
3. Uygulamayı yeniden başlatın. Kimlik doğrulama ve profil senkronizasyonu otomatik olarak Supabase'e geçer.

### Canlı güvenlik testleri

`npm run test:live`: gerçek projeye **yalnızca publishable key** ile bağlanır; kullanıcı oluşturmaz, veri yazmaz. Oturumsuz erişimin engellendiğini, anonim girişin kapalı olduğunu ve API'nin yalnızca beklenen tabloları gösterdiğini doğrular. Tablo henüz yoksa ilgili testler **atlanır** (geçti sayılmaz). `npm test` her zaman çevrimdışı demo modunda çalışır ve canlı projeye dokunmaz.

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
