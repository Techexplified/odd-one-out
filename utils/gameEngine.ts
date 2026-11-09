import { DifficultyTier, GameTile, LevelConfig } from '@/types/game';

/* ------------------------------------------------------------------ */
/* Campaign structure                                                  */
/* ------------------------------------------------------------------ */

export const LEVELS_PER_TIER = 25;
export const TIERS: DifficultyTier[] = ['easy', 'medium', 'hard'];
export const TOTAL_LEVELS = LEVELS_PER_TIER * TIERS.length; // 75

export const TIER_LABEL: Record<DifficultyTier, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export function tierForLevel(level: number): DifficultyTier {
  const idx = Math.min(TIERS.length - 1, Math.floor((Math.max(1, level) - 1) / LEVELS_PER_TIER));
  return TIERS[idx];
}

export function tierRange(tier: DifficultyTier): { start: number; end: number } {
  const start = TIERS.indexOf(tier) * LEVELS_PER_TIER + 1;
  return { start, end: start + LEVELS_PER_TIER - 1 };
}

/* ------------------------------------------------------------------ */
/* Puzzle themes                                                       */
/* ------------------------------------------------------------------ */

interface Template {
  theme: string;
  type: 'text' | 'color' | 'rotated' | 'sprite';
  regular: string;
  odd: string; // for 'rotated' this is the rotation in degrees
  hint: string;
}

const EASY: Template[] = [
  { theme: 'Lemon', type: 'sprite', regular: 'lemon', odd: 'lemon_odd', hint: 'One lemon has a tiny green leaf!' },
  { theme: 'Butterfly Meadow', type: 'sprite', regular: 'butterfly', odd: 'butterfly_odd', hint: 'Spot the butterfly with pink wing tips!' },
  { theme: 'Apple Orchard', type: 'sprite', regular: 'apple', odd: 'apple_odd', hint: 'One red apple has a golden leaf!' },
  { theme: 'Puppy Parade', type: 'sprite', regular: 'dog', odd: 'dog_odd', hint: 'One puppy has an orange tongue!' },
  { theme: 'Moon Phases', type: 'sprite', regular: 'full_moon', odd: 'waning_moon', hint: 'One moon has a shaded crescent edge.' },
  { theme: 'Sunflower Field', type: 'sprite', regular: 'sunflower', odd: 'sunflower_odd', hint: 'One sunflower has a golden leaf!' },
  { theme: 'Lemon', type: 'sprite', regular: 'lemon', odd: 'lemon_odd', hint: 'Look for the lemon with a green leaf!' }, // Level 7 = Lemon
  { theme: 'Sweet Sprinkles', type: 'sprite', regular: 'donut', odd: 'donut_odd', hint: 'One donut has green sprinkles instead of blue!' },
  { theme: 'Butterfly Garden', type: 'sprite', regular: 'butterfly', odd: 'butterfly_odd', hint: 'Find the butterfly with pink upper wings!' },
  { theme: 'Crisp Apples', type: 'sprite', regular: 'apple', odd: 'apple_odd', hint: 'Check the leaf color on each apple!' },
  { theme: 'Chick Check', type: 'sprite', regular: 'chick_front', odd: 'chick_side', hint: 'Look closely at the chick beak and wings.' },
  { theme: 'Lemon Grove', type: 'sprite', regular: 'lemon', odd: 'lemon_odd', hint: 'One lemon still has its leaf!' }, // Level 12 = Lemon
  { theme: 'Butterfly Wings', type: 'sprite', regular: 'butterfly', odd: 'butterfly_daily_odd', hint: 'Look closely at the inner wing color!' },
  { theme: 'Cookie Jar', type: 'sprite', regular: 'cookie', odd: 'cookie_odd', hint: 'One cookie has mirrored chocolate chips!' },
  { theme: 'Pond Life', type: 'sprite', regular: 'frog', odd: 'frog_odd', hint: 'One frog has warm amber eye rings!' },
  { theme: 'Berry Patch', type: 'sprite', regular: 'strawberry', odd: 'strawberry_odd', hint: 'One strawberry has a golden leaf crown!' },
  { theme: 'Number Maze', type: 'text', regular: '8', odd: 'B', hint: 'A letter B is hiding among the 8s.' },
  { theme: 'Lookalike Letters', type: 'text', regular: 'E', odd: 'F', hint: 'One letter is missing its bottom bar.' },
];

const MEDIUM: Template[] = [
  { theme: 'Butterfly Shimmer', type: 'sprite', regular: 'butterfly', odd: 'butterfly_daily_odd', hint: 'One butterfly has pink inner wings!' },
  { theme: 'Citrus Grove', type: 'sprite', regular: 'lemon', odd: 'lemon_odd', hint: 'Look for the tiny green leaf on top.' },
  { theme: 'Orchard Pick', type: 'sprite', regular: 'apple', odd: 'apple_odd', hint: 'One apple has a golden-yellow leaf.' },
  { theme: 'Golden Sunflower', type: 'sprite', regular: 'sunflower', odd: 'sunflower_odd', hint: 'Check the right leaf on each stem.' },
  { theme: 'Mushroom Caps', type: 'sprite', regular: 'mushroom', odd: 'mushroom_odd', hint: 'One mushroom has a golden center spot!' },
  { theme: 'Night Owl', type: 'sprite', regular: 'owl', odd: 'owl_odd', hint: 'Check the color of the owl beak!' },
  { theme: 'Coral Sunset', type: 'color', regular: '#EF4444', odd: '#F97316', hint: 'Spot the warm tangerine tile among the coral reds.' },
  { theme: 'Autumn Forest', type: 'sprite', regular: 'maple_leaf', odd: 'fallen_leaf', hint: 'One autumn leaf has a different shape.' },
  { theme: 'Happy Faces', type: 'sprite', regular: 'smile_open', odd: 'smile_big', hint: 'Check the eye shape closely.' },
  { theme: 'Ocean Lagoon', type: 'color', regular: '#0284C7', odd: '#06B6D4', hint: 'One tile is a brighter cyan-turquoise.' },
  { theme: 'Tricky Numbers', type: 'text', regular: '5', odd: 'S', hint: 'A letter S hides among the 5s.' },
  { theme: 'Monkey Business', type: 'sprite', regular: 'monkey_eyes', odd: 'monkey_ears', hint: 'Which monkey covers its ears instead of eyes?' },
  { theme: 'Twin Glyphs', type: 'text', regular: 'C', odd: 'G', hint: 'One letter has an inward crossbar.' },
  { theme: 'Tilted Avocado', type: 'rotated', regular: 'avocado', odd: '18', hint: 'One avocado is tilted slightly clockwise.' },
  { theme: 'Bakery Batch', type: 'sprite', regular: 'donut', odd: 'donut_odd', hint: 'Look closely at the sprinkle colors!' },
  { theme: 'Clock Tower', type: 'sprite', regular: 'clock_3', odd: 'clock_4', hint: 'One clock is an hour ahead.' },
  { theme: 'Sharp Angles', type: 'text', regular: '2', odd: 'Z', hint: 'Spot the letter Z among the 2s.' },
];

const HARD: Template[] = [
  { theme: 'Royal Butterfly', type: 'sprite', regular: 'butterfly', odd: 'butterfly_daily_odd', hint: 'Check the inner wing gradient closely.' },
  { theme: 'Golden Lemon', type: 'sprite', regular: 'lemon', odd: 'lemon_odd', hint: 'Find the single lemon with a leaf.' },
  { theme: 'Mirror Letters', type: 'text', regular: 'b', odd: 'd', hint: 'One letter is mirrored.' },
  { theme: 'Shades of Mint', type: 'color', regular: '#0D9488', odd: '#34D399', hint: 'One tile is a brighter seafoam mint.' },
  { theme: 'Upside Down', type: 'text', regular: 'p', odd: 'q', hint: 'Watch where the loop sits.' },
  { theme: 'Smile Spotter', type: 'sprite', regular: 'smile_eyes', odd: 'smile_beam', hint: 'Check the mouth and teeth closely.' },
  { theme: 'Slight Tilt', type: 'rotated', regular: 'mushroom', odd: '15', hint: 'One mushroom leans slightly to the right.' },
  { theme: 'Cookie Crumb', type: 'sprite', regular: 'cookie', odd: 'cookie_odd', hint: 'Check the chocolate chip arrangement.' },
  { theme: 'Lavender Haze', type: 'color', regular: '#7C3AED', odd: '#C084FC', hint: 'Spot the softer orchid-purple tile.' },
  { theme: 'Clock Watch', type: 'sprite', regular: 'clock_1', odd: 'clock_130', hint: 'One minute hand points to the six.' },
  { theme: 'Kerning Trap', type: 'text', regular: 'rn', odd: 'm', hint: 'One tile is a single letter m.' },
  { theme: 'Leaning Tree', type: 'rotated', regular: 'evergreen_tree', odd: '12', hint: 'One tree is not standing straight.' },
  { theme: 'Peach Blush', type: 'color', regular: '#F43F5E', odd: '#FB923C', hint: 'Spot the warm peach-orange tile among the rose tiles.' },
  { theme: 'Sixes & Nines', type: 'text', regular: '6', odd: '9', hint: 'One digit is upside down.' },
  { theme: 'Cat Moods', type: 'sprite', regular: 'cat_smile', odd: 'cat_grin', hint: 'Look closely at the cat mouth and eyes.' },
  { theme: 'Quiet Turn', type: 'rotated', regular: 'key', odd: '14', hint: 'One key is turned slightly.' },
  { theme: 'Zero Hour', type: 'text', regular: 'O', odd: 'Q', hint: 'One letter has a tiny tail.' },
  { theme: 'Sunny Amber', type: 'color', regular: '#EAB308', odd: '#84CC16', hint: 'One tile leans toward zesty lime-green.' },
  { theme: 'Berry Crown', type: 'sprite', regular: 'strawberry', odd: 'strawberry_odd', hint: 'One strawberry has a golden crown.' },
  { theme: 'Wise Owl', type: 'sprite', regular: 'owl', odd: 'owl_odd', hint: 'One owl has a bright golden beak.' },
];

const POOLS: Record<DifficultyTier, Template[]> = { easy: EASY, medium: MEDIUM, hard: HARD };
const ALL_ENDLESS_TEMPLATES: Template[] = [...EASY, ...MEDIUM, ...HARD];

/* ------------------------------------------------------------------ */
/* Deterministic randomness                                            */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ------------------------------------------------------------------ */
/* Level metadata (no tiles) — used by the level picker                */
/* ------------------------------------------------------------------ */

export interface LevelMeta {
  levelNumber: number;
  tier: DifficultyTier;
  theme: string;
  gridSize: number;
  gridCols: number;
  gridRows: number;
  timeLimitSeconds: number;
  template: Template;
}

function gridAndTime(tier: DifficultyTier, levelNumber = 1) {
  if (levelNumber > TOTAL_LEVELS) {
    // Master / Endless campaign levels beyond 75 use 5x5 grids
    return { gridSize: 5, gridCols: 5, gridRows: 5, timeLimitSeconds: 25 };
  }
  // Matches the wireframe 4x5 (20 tiles) 30s layout for campaign levels
  if (tier === 'easy') return { gridSize: 4, gridCols: 4, gridRows: 5, timeLimitSeconds: 30 };
  if (tier === 'medium') return { gridSize: 4, gridCols: 4, gridRows: 5, timeLimitSeconds: 30 };
  return { gridSize: 4, gridCols: 4, gridRows: 5, timeLimitSeconds: 25 };
}

export function getLevelMeta(level: number): LevelMeta {
  const safeLevel = Math.max(1, level);
  const tier = tierForLevel(safeLevel);
  const indexInTier = safeLevel - tierRange(tier).start;
  const pool = safeLevel > TOTAL_LEVELS ? ALL_ENDLESS_TEMPLATES : POOLS[tier];
  const template = pool[Math.abs(indexInTier) % pool.length];
  return { levelNumber: safeLevel, tier, theme: template.theme, template, ...gridAndTime(tier, safeLevel) };
}

/* ------------------------------------------------------------------ */
/* Tile generation                                                     */
/* ------------------------------------------------------------------ */

function buildTiles(prefix: string, t: Template, total: number, oddIndex: number): GameTile[] {
  return Array.from({ length: total }, (_, i) => {
    const isOdd = i === oddIndex;
    const id = `${prefix}-${i}`;
    if (t.type === 'rotated') {
      return { id, isOdd, type: 'sprite', value: t.regular, rotationDeg: isOdd ? Number(t.odd) : 0 };
    }
    return { id, isOdd, type: t.type, value: isOdd ? t.odd : t.regular };
  });
}

/** Builds a playable campaign level. The odd tile position changes on every attempt. */
export function generateLevel(level: number): LevelConfig {
  const meta = getLevelMeta(level);
  const total = meta.gridCols * meta.gridRows;
  const oddIndex = Math.floor(Math.random() * total);
  return {
    levelNumber: meta.levelNumber,
    isDaily: false,
    title: `LEVEL ${meta.levelNumber}`,
    theme: meta.theme,
    tier: meta.tier,
    gridSize: meta.gridCols,
    gridCols: meta.gridCols,
    gridRows: meta.gridRows,
    timeLimitSeconds: meta.timeLimitSeconds,
    tiles: buildTiles(`l${meta.levelNumber}-${Date.now()}`, meta.template, total, oddIndex),
    oddIndex,
    hintDescription: meta.template.hint,
  };
}

/**
 * Generates an Endless Mode wave.
 * Wave 1-3: 4x4 grid (Easy/Medium templates)
 * Wave 4-8: 4x5 grid (Medium/Hard templates)
 * Wave 9+:  5x5 grid (All templates with tighter rotations)
 */
export function generateEndlessWave(wave: number): LevelConfig {
  const safeWave = Math.max(1, wave);
  let pool: Template[];
  let tier: DifficultyTier;
  let gridCols = 4;
  let gridRows = 4;

  if (safeWave <= 3) {
    pool = [...EASY, ...MEDIUM];
    tier = 'easy';
    gridCols = 4;
    gridRows = 4;
  } else if (safeWave <= 8) {
    pool = [...MEDIUM, ...HARD];
    tier = 'medium';
    gridCols = 4;
    gridRows = 5;
  } else {
    pool = ALL_ENDLESS_TEMPLATES;
    tier = 'hard';
    gridCols = 5;
    gridRows = 5;
  }

  // Pick a random template with wave-offset variety so consecutive waves feel fresh
  const idx = (safeWave * 7 + Math.floor(Math.random() * pool.length)) % pool.length;
  const template = pool[idx];
  const total = gridCols * gridRows;
  const oddIndex = Math.floor(Math.random() * total);

  return {
    levelNumber: safeWave,
    isDaily: false,
    title: `WAVE ${safeWave}`,
    theme: template.theme,
    tier,
    gridSize: gridCols,
    gridCols,
    gridRows,
    timeLimitSeconds: 30,
    tiles: buildTiles(`endless-w${safeWave}-${Date.now()}`, template, total, oddIndex),
    oddIndex,
    hintDescription: template.hint,
  };
}

/**
 * Today's daily puzzle — identical for the whole calendar day.
 * Matches the Daily Puzzle wireframe: 4x4 Butterfly grid, Medium difficulty, 45 seconds.
 */
export function generateDailyLevel(day: string): LevelConfig {
  const rand = mulberry32(hashString(`daily-${day}`));
  const template: Template = {
    theme: 'Butterfly',
    type: 'sprite',
    regular: 'butterfly',
    odd: 'butterfly_daily_odd',
    hint: 'One butterfly has pink-lilac inner wings!',
  };
  const gridCols = 4;
  const gridRows = 4;
  const total = gridCols * gridRows;
  // Deterministic odd index for the day (defaulting to index 10 on first seed range)
  const oddIndex = Math.floor(rand() * total);
  return {
    levelNumber: 0,
    isDaily: true,
    title: 'Daily Puzzle',
    theme: template.theme,
    tier: 'medium',
    gridSize: gridCols,
    gridCols: gridCols,
    gridRows: gridRows,
    timeLimitSeconds: 45,
    tiles: buildTiles(`d${day}`, template, total, oddIndex),
    oddIndex,
    hintDescription: template.hint,
  };
}

/** Small teaser grid for the level modal (one odd tile, position is decorative). */
export function previewTiles(level: number, count = 12): GameTile[] {
  const meta = getLevelMeta(level);
  const rand = mulberry32(level * 7919);
  return buildTiles(`p${level}`, meta.template, count, Math.floor(rand() * count));
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

export function calculateStars(timeRemaining: number, totalTime: number): number {
  const pct = timeRemaining / Math.max(1, totalTime);
  if (pct >= 0.45) return 3;
  if (pct >= 0.2) return 2;
  return 1;
}

export function calculateScore(level: number, timeRemaining: number, stars: number): number {
  const base = Math.max(2, level) * 80;
  return (base + Math.floor(timeRemaining * 12)) * stars;
}

export const COINS_PER_STAR = 10;
