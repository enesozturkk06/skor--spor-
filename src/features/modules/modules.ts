import type { IconName } from '@/components/ui';
import { APP_ICONS } from '@/components/ui/icon-system';

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
  /** Stack route of a live module outside the tab bar. */
  route?: '/exercises';
  status: 'live' | 'soon';
  /** Planned capabilities, shown on the module's preview screen. */
  roadmap: string[];
};

export const MODULES: Record<ModuleId, AppModule> = {
  home: { id: 'home', title: 'Ana Sayfa', tagline: 'Günün özeti', icon: APP_ICONS.home.outline, tabRoute: '/', status: 'live', roadmap: [] },
  training: {
    id: 'training',
    title: 'Antrenman',
    tagline: 'Plan, kayıt ve ilerleme',
    icon: APP_ICONS.training.outline,
    tabRoute: '/training',
    status: 'live',
    roadmap: [],
  },
  exercises: {
    id: 'exercises',
    title: 'Egzersiz Kütüphanesi',
    tagline: 'Teknik, kas haritası, set önerisi',
    icon: APP_ICONS.exercises.outline,
    route: '/exercises',
    status: 'live',
    roadmap: [],
  },
  nutrition: {
    id: 'nutrition',
    title: 'Beslenme',
    tagline: 'Kalori ve makro takibi',
    icon: APP_ICONS.nutrition.outline,
    tabRoute: '/nutrition',
    status: 'soon',
    roadmap: ['Günlük kalori ve makro hedefi', 'Öğün kaydı ve besin arama', 'Su takibi', 'Hedefe göre beslenme önerileri'],
  },
  coach: {
    id: 'coach',
    title: 'Yapay Zekâ Koçu',
    tagline: 'Kişisel performans asistanı',
    icon: APP_ICONS.coach.outline,
    tabRoute: '/coach',
    status: 'soon',
    roadmap: ['Profiline göre program oluşturma', 'Antrenman sonrası geri bildirim', 'Beslenme ve toparlanma tavsiyeleri', 'Soru-cevap sohbet'],
  },
  recovery: {
    id: 'recovery',
    title: 'Recovery',
    tagline: 'Uyku, yorgunluk, hazırlık',
    icon: APP_ICONS.recovery.outline,
    status: 'soon',
    roadmap: ['Günlük hazırlık skoru', 'Uyku ve dinlenik nabız kaydı', 'Mobilite ve esneme rutinleri', 'Aşırı yüklenme uyarıları'],
  },
  performance: {
    id: 'performance',
    title: 'Performans Analizi',
    tagline: 'Trendler ve kıyaslar',
    icon: APP_ICONS.performance.outline,
    status: 'soon',
    roadmap: ['Athlete Score geçmişi', 'Güç, hız ve dayanıklılık testleri', 'Haftalık / aylık raporlar', 'Hedef ilerleme analizi'],
  },
  community: {
    id: 'community',
    title: 'Topluluk',
    tagline: 'Sporcularla bağlan',
    icon: APP_ICONS.community.outline,
    status: 'soon',
    roadmap: ['Branş toplulukları', 'Meydan okumalar ve sıralamalar', 'Antrenman paylaşımı', 'Koç ve kulüp profilleri'],
  },
  profile: { id: 'profile', title: 'Profil', tagline: 'Sporcu kimliğin', icon: APP_ICONS.profile.outline, tabRoute: '/profile', status: 'live', roadmap: [] },
};

export const isModuleId = (v: unknown): v is ModuleId => typeof v === 'string' && v in MODULES;
