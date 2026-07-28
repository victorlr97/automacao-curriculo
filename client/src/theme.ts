export type Tone = 'accent' | 'teal' | 'violet';

/** Um tom por seção (card + ícone da nav + badge) — o azul de accent fica
 * reservado pra ações/seleção; teal e violet dão identidade ao conteúdo sem
 * competir com ele. */
export const TONE_STYLES: Record<
  Tone,
  { cardHeaderBg: string; cardIcon: string; navBorder: string; navText: string; badgeBg: string; badgeText: string }
> = {
  accent: {
    cardHeaderBg: 'bg-accent-soft/40',
    cardIcon: 'text-accent-dark',
    navBorder: 'border-accent',
    navText: 'text-accent-dark',
    badgeBg: 'bg-accent-soft',
    badgeText: 'text-accent-dark'
  },
  teal: {
    cardHeaderBg: 'bg-teal-soft/60',
    cardIcon: 'text-teal',
    navBorder: 'border-teal',
    navText: 'text-teal',
    badgeBg: 'bg-teal-soft',
    badgeText: 'text-teal'
  },
  violet: {
    cardHeaderBg: 'bg-violet-soft/60',
    cardIcon: 'text-violet',
    navBorder: 'border-violet',
    navText: 'text-violet',
    badgeBg: 'bg-violet-soft',
    badgeText: 'text-violet'
  }
};
