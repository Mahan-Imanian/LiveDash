type WidgetifyRoute = 'home' | 'apps' | 'explore';
type CloudState = 'local' | 'connected' | 'loaded';
type PetAction = 'idle' | 'feed' | 'play' | 'rest';

interface FaviconSource {
  label: string;
  url: string;
  googleFavicon: string;
  localFallback: string;
}

interface ProfileViewModel {
  signedIn: boolean;
  displayName: string;
  email: string;
  avatarUrl: string;
  cloudState: CloudState;
}

interface InteractionAnimation {
  name: 'shellIn' | 'cardIn' | 'dockReveal' | 'modalIn' | 'drawerIn' | 'toastIn';
  durationMs: number;
  easing: string;
}

const widgetifyAnimations: InteractionAnimation[] = [
  { name: 'shellIn', durationMs: 550, easing: 'cubic-bezier(.23,1,.32,1)' },
  { name: 'cardIn', durationMs: 420, easing: 'cubic-bezier(.23,1,.32,1)' },
  { name: 'dockReveal', durationMs: 600, easing: 'cubic-bezier(.23,1,.32,1)' },
  { name: 'modalIn', durationMs: 240, easing: 'cubic-bezier(.23,1,.32,1)' },
  { name: 'drawerIn', durationMs: 250, easing: 'cubic-bezier(.23,1,.32,1)' },
  { name: 'toastIn', durationMs: 250, easing: 'cubic-bezier(.23,1,.32,1)' }
];

function makeFaviconSource(label: string, rawUrl: string): FaviconSource {
  const normalized = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
  const host = new URL(normalized).hostname;
  return {
    label,
    url: normalized,
    googleFavicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`,
    localFallback: 'assets/widgetify/images/no-internet.png'
  };
}

export type { WidgetifyRoute, CloudState, PetAction, FaviconSource, ProfileViewModel, InteractionAnimation };
export { widgetifyAnimations, makeFaviconSource };
