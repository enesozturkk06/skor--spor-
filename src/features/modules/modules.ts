import type { IconName } from '@/components/ui';

export type ModuleId =
  | 'home'
  | 'training'
  | 'exercises'
  | 'nutrition'
  | 'coach'
  | 'recovery'
  | 'performance'
  | 'community'
  | 'profile';

export type AppModule = {
  id: ModuleId;
  title: string;
  tagline: string;
  icon: IconName;
  /** Route for modules that live in the tab bar; others open /module/[id]. */
  tabRoute?: '/' | '/training' | '/nutrition' | '/coach' | '/profile';
  status: 'live' | 'soon';
  /** Planned capabilities, shown on the module's preview screen. */
  roadmap: string[];
};

export const MODULES: Record<ModuleId, AppModule> = {
  home: { id: 'home', title: 'Ana Sayfa', tagline: 'Günün özeti', icon: 'home-variant', tabRoute: '/', status: 'live', roadmap: [] },
  training: {
    id: 'training',
    title: 'Antrenman',
    tagline: 'Plan, kayıt ve ilerleme',
    icon: 'lightning-bolt',
    tabRoute: '/training',
    status: 'soon',
    roadmap: ['Branşına özel antrenman programları', 'Set, tekrar ve ağırlık kaydı', 'Dinlenme zamanlayıcısı', 'Geçmiş ve kişisel rekorlar'],
  },
  exercises: {
    id: 'exercises',
    title: 'Egzersiz Kütüphanesi',
    tagline: 'Teknik ve video rehber',
    icon: 'bookshelf',
    status: 'soon',
    roadmap: ['Kas grubu ve ekipmana göre filtre', 'Adım adım teknik anlatımı', 'Dövüş sporları kombinasyon kütüphanesi', 'Favoriler ve kendi egzersizlerin'],
  },
  nutrition: {
    id: 'nutrition',
    title: 'Beslenme',
    tagline: 'Kalori ve makro takibi',
    icon: 'food-apple',
    tabRoute: '/nutrition',
    status: 'soon',
    roadmap: ['Günlük kalori ve makro hedefi', 'Öğün kaydı ve besin arama', 'Su takibi', 'Hedefe göre beslenme önerileri'],
  },
  coach: {
    id: 'coach',
    title: 'Yapay Zekâ Koçu',
    tagline: 'Kişisel performans asistanı',
    icon: 'brain',
    tabRoute: '/coach',
    status: 'soon',
    roadmap: ['Profiline göre program oluşturma', 'Antrenman sonrası geri bildirim', 'Beslenme ve toparlanma tavsiyeleri', 'Soru-cevap sohbet'],
  },
  recovery: {
    id: 'recovery',
    title: 'Recovery',
    tagline: 'Uyku, yorgunluk, hazırlık',
    icon: 'heart-pulse',
    status: 'soon',
    roadmap: ['Günlük hazırlık skoru', 'Uyku ve dinlenik nabız kaydı', 'Mobilite ve esneme rutinleri', 'Aşırı yüklenme uyarıları'],
  },
  performance: {
    id: 'performance',
    title: 'Performans Analizi',
    tagline: 'Trendler ve kıyaslar',
    icon: 'chart-line',
    status: 'soon',
    roadmap: ['Athlete Score geçmişi', 'Güç, hız ve dayanıklılık testleri', 'Haftalık / aylık raporlar', 'Hedef ilerleme analizi'],
  },
  community: {
    id: 'community',
    title: 'Topluluk',
    tagline: 'Sporcularla bağlan',
    icon: 'account-group',
    status: 'soon',
    roadmap: ['Branş toplulukları', 'Meydan okumalar ve sıralamalar', 'Antrenman paylaşımı', 'Koç ve kulüp profilleri'],
  },
  profile: { id: 'profile', title: 'Profil', tagline: 'Sporcu kimliğin', icon: 'account-circle-outline', tabRoute: '/profile', status: 'live', roadmap: [] },
};

export const isModuleId = (v: unknown): v is ModuleId => typeof v === 'string' && v in MODULES;
