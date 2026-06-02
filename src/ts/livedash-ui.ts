type WidgetifyRoute = 'home' | 'apps' | 'explore';
type CloudState = 'local' | 'connected' | 'loaded';
type PetAction = 'idle' | 'feed' | 'play';

interface FaviconSource {
  label: string;
  url: string;
  googleFavicon: string;
  duckFavicon: string;
}

interface ProfileViewModel {
  signedIn: boolean;
  displayName: string;
  email: string;
  avatarUrl: string;
  cloudState: CloudState;
}

interface InteractionAnimation {
  name: 'cardReveal' | 'dockIn' | 'petBreathe' | 'petRun' | 'petHappy' | 'sparklePop';
  durationMs: number;
  easing: string;
}

const widgetifyInspiredAnimations: InteractionAnimation[] = [
  { name: 'cardReveal', durationMs: 420, easing: 'cubic-bezier(.23,1,.32,1)' },
  { name: 'dockIn', durationMs: 450, easing: 'cubic-bezier(.23,1,.32,1)' },
  { name: 'petBreathe', durationMs: 2800, easing: 'ease-in-out' },
  { name: 'petRun', durationMs: 1000, easing: 'steps(8)' },
  { name: 'petHappy', durationMs: 900, easing: 'ease-in-out' },
  { name: 'sparklePop', durationMs: 1100, easing: 'ease-in-out' }
];

function makeFaviconSource(label: string, rawUrl: string): FaviconSource {
  const normalized = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
  const host = new URL(normalized).hostname;
  return {
    label,
    url: normalized,
    googleFavicon: `https://www.google.com/s2/favicons?domain=${host}&sz=64&fallback_opts=404`,
    duckFavicon: `https://icons.duckduckgo.com/ip3/${host}.ico`
  };
}

export type { WidgetifyRoute, CloudState, PetAction, FaviconSource, ProfileViewModel, InteractionAnimation };
export { widgetifyInspiredAnimations, makeFaviconSource };
