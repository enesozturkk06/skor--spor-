# SKOR SPOR

**OWN YOUR PERFORMANCE.** — Fitness, beslenme, recovery, performans ve dövüş sporlarını tek çatıda toplayan sporcu platformu.

Expo (SDK 58) · React Native 0.88 · TypeScript · Expo Router · Supabase · Web / iOS / Android

## Yerel geliştirme

Gereksinim: Node.js 24 (`.node-version`), npm.

```bash
npm install
npm run web        # tarayıcı (geliştirme sunucusu)
npm start          # Expo Go / emülatör için QR
npm run typecheck  # tsc --noEmit
npm run lint       # expo lint
npm test           # Playwright uçtan uca testleri
npm run check      # typecheck + lint + E2E (commit öncesi)
```

`.env` dosyası yoksa uygulama **Demo modunda** çalışır (aşağıya bakın). `.env` asla Git'e eklenmez; yalnızca boş şablon `.env.example` depodadır.

## Demo modu

Supabase anahtarları tanımlı değilse uygulama arka uç olmadan çalışır:

- Hesap (ad, e-posta), profil, antrenmanlar, programlar ve rekorlar **yalnızca o tarayıcının / cihazın depolamasında** tutulur (`skorspor:` önekli anahtarlar). Sunucuya hiçbir kullanıcı verisi gitmez; şifre hiç saklanmaz.
- Ekranlarda "Demo modu · Veriler yalnızca bu cihazda saklanır" uyarısı görünür.
- Tarayıcı verisi silinirse veya başka bir cihaz kullanılırsa demo verileri görünmez — bu, demonun doğasıdır.

## Test sitesi (Cloudflare Pages, ücretsiz)

Herkese açık test sitesi **yalnızca demo modundadır**: gerçek Supabase bağlantısı yoktur, gerçek kullanıcı verisi kullanılmaz. Ücretli hiçbir hizmet kullanılmaz (GitHub Free + Cloudflare Pages Free, ücretsiz `*.pages.dev` alt alan adı).

| Ortam | Branch | Adres |
| --- | --- | --- |
| Test sitesi (preview) | `develop` | `https://develop.<proje>.pages.dev` — her push'ta güncellenir |
| Özellik denemeleri | `feature/*` | `https://<branch>.<proje>.pages.dev` |
| Production | `main` | `https://<proje>.pages.dev` — otomatik deploy **kapalı**, yalnızca onayla elle |

Cloudflare Pages proje ayarları:

| Ayar | Değer |
| --- | --- |
| Framework preset | None |
| Build command | `node scripts/pages-guard.mjs && npx expo export -p web` |
| Build output directory | `dist` |
| Root directory | `/` |
| Node.js | `.node-version` dosyasından (24) |
| Ortam değişkenleri | **Hiçbiri** (Production ve Preview) |
| Automatic production deployments | Kapalı |
| Preview branch'leri | Custom: `develop`, `feature/*` |

Notlar:

- **Build koruması:** `scripts/pages-guard.mjs` aşağıdakilerden biri varsa build'i durdurur ve yalnızca adları yazar (değerleri asla):
  - **herhangi bir** `EXPO_PUBLIC_*` değişkeni (Expo bunların hepsini pakete gömer; demo hiçbirine ihtiyaç duymaz — `EXPO_PUBLIC_SUPABASE_*`, `EXPO_PUBLIC_TRAINING_SYNC`, `EXPO_PUBLIC_MOTION_LAB` ve yanlış yazılmış adlar dahil),
  - kimlik bilgisi gibi görünen adlar: `*SUPABASE*`, `*SERVICE_ROLE*`, `DATABASE_URL`, `POSTGRES*`, `PG*PASSWORD`, `*JWT_SECRET*`,
  - checkout'ta `.env` / `.env.*` dosyası, doldurulmuş `.env.example`,
  - `app.config.*`, `babel.config.*`, `metro.config.*` (değer gömebilirler — eklenirse önce koruma gözden geçirilmeli),
  - `"single"` dışında bir web çıktısı,
  - `app.json` veya `src/` içine yazılmış Supabase adresi, anahtarı ya da JWT.

  Yerelde aynı build: `npm run build:pages` (yerelde `.env` varsa koruma bilerek durur). Koruma, Cloudflare panelindeki build komutuna bağlıdır; bu komutu yalnızca hesap sahibi değiştirebilir.
- **SPA yönlendirmesi:** Web çıktısı tek sayfalık uygulamadır (`web.output: "single"`) ve çıktıda `404.html` yoktur; Cloudflare Pages bu durumda dosyaya karşılık gelmeyen her yol için `index.html` sunar. Bu yüzden `/exercises/bench_press`, `/history/<id>` gibi dinamik rotalar doğrudan açılır. `_redirects` dosyası **eklenmemelidir**; `404.html` eklenirse bu davranış bozulur (testler yakalar).
- **Başlıklar:** `public/_headers` (export sırasında `dist/` içine kopyalanır): `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `X-Robots-Tag: noindex` (arama motorlarına kapalı) ve içerik özetli (hash'li) Expo dosyaları için kalıcı önbellek.
- **Ücretsiz plan sınırları:** ayda 500 build, aynı anda 1 build, build başına 20 dk, site başına 20.000 dosya, dosya başına 25 MiB, `_headers` için 100 kural. Mevcut çıktı ≈ 61 dosya / 3,7 MB.
- Test sitesi herkese açıktır: içine gerçek kişisel bilgi girmeyin; her ziyaretçinin verisi yalnızca kendi tarayıcısında kalır.

## GitHub branch düzeni

- Depo: `skor-spor` (GitHub Free, **private**).
- `main`: yayın (production) kodu. Doğrudan geliştirme yapılmaz; yalnızca onaylanan değişiklikler birleştirilir. (GitHub Free'de private depolarda branch koruma kuralı olmadığından bu kural süreçle uygulanır; ayrıca Cloudflare'de production otomatik deploy kapalıdır.)
- `develop`: günlük geliştirme ve test sitesi.
- `feature/<kısa-ad>`: gerektiğinde ayrı özellik branch'leri; `develop`'a birleştirilir.
- Gizli bilgiler (`.env`, anahtarlar, sertifikalar, token'lar) ve üretilen klasörler (`node_modules/`, `dist/`, test raporları, `.wrangler/`) `.gitignore` ile depo dışındadır.

## Testler

Uçtan uca testler [e2e/](e2e/) klasöründe, Playwright ile yazıldı. Testler geliştirme sunucusuna değil **üretim web derlemesine** karşı çalışır: `npm test` önce `dist/`'i derler (`npm run build:web`), sonra `scripts/serve-web.mjs` ile sunar.

| Komut | Açıklama |
| --- | --- |
| `npm test` | Tüm testler (mobil + masaüstü yerleşim) |
| `npm run test:e2e:mobile` | Yalnızca mobil (Pixel 7) proje |
| `npm run test:e2e:supabase` | Supabase modu: kayıt, e-posta doğrulama, oturum, profil (sahte API ile) |
| `npm run test:e2e:ui` | Etkileşimli Playwright arayüzü |
| `npm run test:e2e:report` | Son çalıştırmanın HTML raporu |

- Kapsam: açılış, kayıt/giriş doğrulamaları, onboarding kuralları (branş/hedef sınırları, aralık kontrolleri), dashboard bölümleri, sekmeler, profil düzenleme, çıkış, sayfa yenileme sonrası oturum davranışı, responsive taşma.
- Her test temiz bir tarayıcı bağlamında (boş depolama) çalışır; tarayıcı konsolunda hata oluşursa test başarısız sayılır.
- İlk kurulumda tarayıcı yoksa: `npx playwright install chromium`.
- Ortak adımlar ve seçiciler [e2e/fixtures.ts](e2e/fixtures.ts) içindedir. Büyük harfle gösterilen başlıklar `tr-TR` ile eşleştirilir.

## Web derlemesini yerelde sunma

Web derlemesi tek sayfalık uygulamadır (`web.output: "single"`); barındırma tarafında bilinmeyen yollar `index.html`'e düşmelidir (Cloudflare Pages bunu kendiliğinden yapar). `expo serve` bu kuralı uygulamaz; yerelde `npm run build:web && npm run serve:web` kullanın.

## Supabase bağlantısı

> Herkese açık test sitesi Supabase'e **bağlanmaz** (yukarıdaki "Test sitesi" bölümü). Bu bölüm yalnızca yerel geliştirme ve ileride onaylanacak gerçek yayın içindir.

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
4. E-posta doğrulama bağlantıları uygulamanın `/auth/callback` ekranına döner. Supabase panelinde **Authentication → URL Configuration → Redirect URLs** listesine kullandığınız adresleri ekleyin; listede olmayan adres için Supabase **Site URL**'ye yönlendirir:
   - Web geliştirme: `http://localhost:8081/auth/callback`
   - Uygulama (geliştirme / yayın build'i): `skorspor://auth/callback`
   - Expo Go: terminalde görünen `exp://…/--/auth/callback` adresi

**Mod ayrımı:** Arka uç modu build sırasında `.env`'den belirlenir (`src/lib/backend.ts`) ve çalışırken değişmez. Cihazdaki önbellek anahtarları moda göre ayrılır; Supabase modunda sunucu tek doğruluk kaynağıdır ve çıkışta cihazdaki profil kopyası silinir.

**E2E testleri ve Supabase:** `npm test` iki build üretir (`scripts/e2e-build.mjs`); ikisi de `.env` okumaz. Supabase modu testleri asla çözümlenmeyen `https://skor-e2e.invalid` adresine karşı çalışır ve tarayıcı içinde `e2e/supabase-mode/mock-supabase.ts` ile yanıtlanır; gerçek bir `*.supabase.co` isteği testi düşürür.

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
| Supabase auth + profil senkronizasyonu | ✅ Kodlandı ve sahte API ile test edildi; canlı şema/güvenlik testleri geçti, gerçek hesapla uçtan uca test henüz raporlanmadı (test sitesi demo) |
| Egzersiz kütüphanesi, aktif antrenman, programlar, geçmiş, rekorlar | ✅ Çalışıyor (antrenman verisinin sunucu senkronu, migration onayına kadar kapalı) |
| Dashboard / Athlete Score | ✅ Kaydedilen antrenmanlardan hesaplanır; Beslenme ve Recovery "Yakında" (değer gösterilmez) |
| Beslenme, AI Koç, Recovery, Performans, Topluluk | 🚧 Önizleme ekranı + yol haritası |

## Lisans

Copyright © 2026 SKOR SPOR. All rights reserved. Ayrıntı: [LICENSE](LICENSE).
