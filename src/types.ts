// Strict TypeScript Interfaces for Pip's Midnight Folio

export type MoodType = 'curious' | 'cozy' | 'proud' | 'giggling' | 'snoozing';

export type TabId = 'nursery' | 'attic' | 'delivery' | 'storybook' | 'guestbook';

export type RelicId = 'musicbox' | 'lantern' | 'bed' | 'blocks' | 'ribbon';

export interface MoodConfig {
  id: MoodType;
  label: string;
  badge: string;
  statusText: string;
  dialogue: string;
  imageSrc: string;
  auraColor: string;
}

export interface RelicConfig {
  id: RelicId;
  index: number;
  title: string;
  subtitle: string;
  description: string;
  actionLabel: string;
  actionIcon: string;
}

export interface Chapter {
  act: string;
  title: string;
  dropCap: string;
  bodyHtml: string;
  plateSrc: string;
  plateCaption: string;
  accentColor: string;
}

export interface DreamWish {
  author: string;
  time: string;
  content: string;
}

export interface GameItem {
  x: number;
  y: number;
  type: 'star' | 'parcel' | 'moon' | 'raindrop';
  size: number;
  speed: number;
  rot: number;
  rotSpeed: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  alpha: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  size: number;
}

export interface BackgroundStar {
  x: number;
  y: number;
  size: number;
  speed: number;
  twinkle: number;
}

export interface SpringVector {
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
}
