type LiveDashRoute = 'home' | 'apps' | 'explore';
type LiveDashSearchEngine = 'google' | 'bing' | 'duckduckgo';
type LiveDashPetMode = 'idle' | 'feed' | 'play' | 'rest';

interface LiveDashAppLink {
  id?: string;
  name?: string;
  label?: string;
  url: string;
  note?: string;
  icon?: string;
  color?: string;
}

interface LiveDashCategory {
  id: string;
  label: string;
  icon: string;
  accent: string;
  apps: LiveDashAppLink[];
}

interface LiveDashProfile {
  name: string;
  email: string;
  avatarUrl: string;
  authToken: string;
  signedIn: boolean;
  backendConnected: boolean;
  cloudLoaded: boolean;
  plan: string;
  locale: string;
  timeFormat: '12h' | '24h';
}

interface LiveDashSettings {
  route: LiveDashRoute;
  appCategory: string;
  theme: string;
  background: string;
  density: string;
  searchEngine: LiveDashSearchEngine;
  showDock: boolean;
  showWeather: boolean;
  focusMinutes: number;
  currencyBase: string;
  calendarWeekStarts: string;
}

interface LiveDashPet {
  name: string;
  mood: string;
  energy: number;
  hearts: number;
  mode: LiveDashPetMode;
  score: number;
  lastInteractionAt: string;
}

interface LiveDashTask {
  id: string;
  title: string;
  status: 'open' | 'done';
  priority: 'low' | 'medium' | 'high';
  due: string;
  source: string;
}

interface LiveDashState {
  schemaVersion: number;
  profile: LiveDashProfile;
  settings: LiveDashSettings;
  categories: LiveDashCategory[];
  bookmarkSlots: LiveDashAppLink[];
  tasks: LiveDashTask[];
  pet: LiveDashPet;
  updatedAt: string;
}

const liveDashV26Model = {
  schemaVersion: 260,
  storageKey: 'livedash_state_v26',
  chromeIdentityRedirectPath: 'google',
  widgetifyCompatibilityMode: 'layout-css-icons'
} as const;

export type {
  LiveDashRoute,
  LiveDashSearchEngine,
  LiveDashPetMode,
  LiveDashAppLink,
  LiveDashCategory,
  LiveDashProfile,
  LiveDashSettings,
  LiveDashPet,
  LiveDashTask,
  LiveDashState
};

export { liveDashV26Model };
