/**
 * Builds 500+ unique business logo tiles from Lucide icons (ISC license).
 * Writes SVG tiles under apps/api/public/library/ and
 * packages/shared/src/media-library.generated.ts
 *
 * Usage: node apps/api/scripts/build-media-library.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..');
const LUCIDE_DIR = path.join(ROOT, 'node_modules', 'lucide-static', 'icons');
const OUT_SVG = path.join(__dirname, '..', 'public', 'library');
const OUT_TS = path.join(ROOT, 'packages', 'shared', 'src', 'media-library.generated.ts');

const TARGET = 520;

const GROUP_COLORS = {
  'food-beverage': ['#16352A', '#1E3A2F', '#7C2D12', '#78350F', '#9D174D', '#14532D', '#1C1917'],
  retail: ['#1E3A8A', '#9F1239', '#0F172A', '#3730A3', '#0C4A6E', '#4C1D95', '#831843'],
  'health-beauty': ['#831843', '#065F46', '#9D174D', '#111827', '#BE185D', '#0F766E'],
  fitness: ['#1F2937', '#134E4A', '#0C4A6E', '#7C2D12', '#312E81'],
  automotive: ['#1E3A8A', '#14532D', '#7C2D12', '#0F172A', '#334155'],
  'professional-services': ['#1E40AF', '#334155', '#4C1D95', '#0F766E', '#1E3A8A'],
  education: ['#1E3A8A', '#111827', '#3730A3', '#0C4A6E', '#14532D'],
  'pet-services': ['#7C2D12', '#78350F', '#9A3412', '#1E3A2F', '#831843'],
  'home-services': ['#3F6212', '#14532D', '#0F766E', '#1E40AF', '#78350F'],
  hospitality: ['#1E3A8A', '#312E81', '#0C4A6E', '#14532D', '#7C2D12'],
  'event-services': ['#9D174D', '#7C2D12', '#4C1D95', '#BE185D', '#831843'],
  healthcare: ['#0C4A6E', '#14532D', '#1E3A8A', '#0F766E', '#134E4A'],
  entertainment: ['#4C1D95', '#111827', '#9D174D', '#1E3A8A', '#7C2D12'],
  ecommerce: ['#9A3412', '#0F766E', '#1E3A8A', '#3730A3', '#0C4A6E'],
};

/** Curated Lucide icon names per business category (unique across library). */
const CURATED = {
  'food-beverage': [
    'coffee', 'cup-soda', 'beer', 'wine', 'martini', 'glass-water', 'milk', 'milk-off',
    'utensils', 'utensils-crossed', 'cooking-pot', 'chef-hat', 'soup', 'salad', 'sandwich',
    'pizza', 'donut', 'cookie', 'cake', 'cake-slice', 'ice-cream-cone', 'ice-cream-bowl',
    'candy', 'candy-cane', 'cherry', 'apple', 'banana', 'grape', 'citrus', 'carrot',
    'wheat', 'bean', 'beef', 'fish', 'egg', 'egg-fried', 'croissant', 'hamburger',
    'popcorn', 'nut', 'vegan', 'leaf', 'flame', 'thermometer', 'refrigerator', 'microwave',
    'blender', 'amphora', 'hop', 'drumstick', 'smile', 'heart', 'star',
    'badge-percent', 'receipt', 'store', 'map-pin', 'clock', 'sun', 'moon',
  ],
  retail: [
    'shopping-bag', 'shopping-basket', 'shopping-cart', 'shirt', 'glasses', 'watch',
    'gem', 'diamond', 'ring', 'crown', 'gift', 'gift-card', 'package', 'package-open',
    'package-check', 'package-plus', 'tag', 'tags', 'ticket', 'ticket-percent',
    'percent', 'badge-dollar-sign', 'wallet', 'credit-card', 'banknote', 'coins',
    'scan-barcode', 'barcode', 'qr-code', 'smartphone', 'tablet', 'laptop', 'monitor',
    'headphones', 'speaker', 'camera', 'printer', 'book', 'book-open', 'library',
    'backpack', 'briefcase', 'toy-brick', 'puzzle', 'brush', 'palette', 'scissors',
    'ruler', 'pen', 'pencil', 'eraser', 'highlighter', 'stamp', 'sock', 'footprints',
  ],
  'health-beauty': [
    'scissors', 'sparkles', 'sparkle', 'wand', 'wand-sparkles', 'droplet', 'droplets',
    'flower', 'flower-2', 'rose', 'leaf', 'spray-can', 'pipette', 'flask-conical',
    'heart', 'heart-handshake', 'smile', 'smile-plus', 'eye', 'eye-off', 'scan-face',
    'user', 'users', 'user-round', 'hand', 'hand-heart', 'bath', 'shower-head',
    'soap-dispenser-droplet', 'mirror', 'brush', 'palette', 'paintbrush', 'paint-bucket',
    'anvil', 'gem', 'crown', 'star', 'sun', 'moon', 'wind', 'flame',
  ],
  fitness: [
    'dumbbell', 'person-standing', 'activity', 'heart-pulse',
    'bike', 'footprints', 'timer', 'timer-reset', 'stopwatch', 'watch', 'flame',
    'zap', 'trophy', 'medal', 'award', 'target', 'flag', 'mountain', 'mountain-snow',
    'waves', 'wind', 'sun', 'sunrise', 'sunset', 'cloud-sun', 'stretch-horizontal',
    'stretch-vertical', 'move', 'move-diagonal', 'accessibility', 'bone', 'brain',
    'salad', 'apple', 'droplet', 'scale',
  ],
  automotive: [
    'car', 'car-front', 'car-taxi-front', 'bus', 'bus-front', 'truck', 'van',
    'bike', 'motorcycle', 'fuel', 'gauge', 'circle-gauge', 'wrench', 'wrench-screwdriver',
    'screwdriver', 'hammer', 'cog', 'settings', 'settings-2', 'key', 'key-round',
    'key-square', 'lock', 'unlock', 'parking-meter', 'traffic-cone', 'construction',
    'map', 'map-pinned', 'navigation', 'compass', 'route', 'milestone',
  ],
  'professional-services': [
    'shirt', 'scissors', 'printer', 'scan', 'camera', 'image', 'images', 'aperture',
    'video', 'clapperboard', 'mic', 'mic-2', 'briefcase', 'briefcase-business',
    'building', 'building-2', 'landmark', 'factory', 'warehouse', 'hammer', 'wrench',
    'drill', 'paint-roller', 'paintbrush', 'ruler', 'pen-tool', 'drafting-compass',
    'file-text', 'files', 'folder', 'folders', 'clipboard', 'clipboard-check',
    'mail', 'inbox', 'phone', 'phone-call', 'headset', 'life-buoy', 'handshake',
    'badge-check', 'id-card', 'contact', 'notebook', 'sticky-note',
  ],
  education: [
    'graduation-cap', 'book', 'book-open', 'book-marked', 'book-copy', 'library',
    'notebook', 'notebook-pen', 'notebook-tabs', 'school', 'university', 'pencil',
    'pen', 'pen-line', 'highlighter', 'eraser', 'ruler', 'calculator', 'brain',
    'lightbulb', 'lightbulb-off', 'atom', 'flask-conical', 'microscope', 'telescope',
    'music', 'music-2', 'music-3', 'music-4', 'piano', 'guitar', 'drum', 'mic',
    'languages', 'globe', 'globe-2', 'earth', 'map', 'presentation', 'projector',
    'monitor-play', 'tv', 'radio',
  ],
  'pet-services': [
    'paw-print', 'dog', 'cat', 'bird', 'rabbit', 'squirrel', 'turtle', 'fish',
    'snail', 'bug', 'worm', 'bone', 'heart', 'heart-handshake', 'home', 'house',
    'bath', 'shower-head', 'scissors', 'brush', 'package', 'shopping-bag',
    'stethoscope', 'syringe', 'pill', 'ambulance', 'shield-plus', 'badge-plus',
  ],
  'home-services': [
    'house', 'home', 'sofa', 'bed', 'lamp', 'lamp-desk', 'lamp-floor', 'fan',
    'air-vent', 'thermometer', 'droplets', 'shower-head', 'bath', 'washing-machine',
    'dryer', 'iron', 'brush', 'paint-roller', 'paintbrush', 'hammer', 'wrench',
    'screwdriver', 'drill', 'plug', 'plug-zap', 'cable', 'lightbulb', 'shovel',
    'sprout', 'tree-deciduous', 'tree-pine', 'flower', 'leaf', 'bug', 'rat',
    'spray-can', 'trash', 'trash-2', 'recycle',
  ],
  hospitality: [
    'hotel', 'bed', 'bed-double', 'bed-single', 'sofa', 'bath', 'umbrella',
    'plane', 'plane-takeoff', 'plane-landing', 'luggage', 'baggage-claim',
    'briefcase', 'map', 'map-pinned', 'compass', 'globe', 'earth', 'mountain',
    'palmtree', 'waves', 'ship', 'sailboat', 'anchor', 'car', 'bus', 'train-front',
    'ticket', 'calendar', 'clock', 'concierge-bell', 'utensils', 'wine', 'coffee',
  ],
  'event-services': [
    'party-popper', 'cake', 'cake-slice', 'gift', 'gift-card', 'balloon',
    'sparkles', 'sparkle', 'wand-sparkles', 'flower', 'flower-2', 'rose',
    'camera', 'video', 'mic', 'music', 'music-2', 'drum', 'piano', 'guitar',
    'utensils', 'chef-hat', 'wine', 'martini', 'beer', 'champagne', 'calendar',
    'calendar-heart', 'calendar-check', 'clock', 'map-pin', 'users', 'user-plus',
    'heart', 'rings', 'church', 'landmark', 'tent', 'ferris-wheel',
  ],
  healthcare: [
    'stethoscope', 'syringe', 'pill', 'pill-bottle', 'tablets', 'thermometer',
    'heart', 'heart-pulse', 'activity', 'hospital', 'ambulance', 'cross',
    'plus', 'shield-plus', 'bandage', 'bone', 'brain', 'eye', 'ear', 'ear-off',
    'smile', 'scan', 'clipboard-plus', 'file-heart', 'microscope', 'flask-conical',
    'dna', 'virus', 'bacteria', 'leaf', 'apple', 'droplet', 'droplets',
    'accessibility', 'wheelchair', 'person-standing',
  ],
  entertainment: [
    'clapperboard', 'film', 'video', 'tv', 'monitor-play', 'popcorn', 'ticket',
    'gamepad', 'gamepad-2', 'joystick', 'dice-1', 'dice-2', 'dice-3', 'dice-4',
    'dice-5', 'dice-6', 'puzzle', 'toy-brick', 'bot', 'ghost', 'drama', 'masks',
    'music', 'music-2', 'mic', 'headphones', 'radio', 'speaker', 'volume-2',
    'ferris-wheel', 'roller-coaster', 'trophy', 'medal', 'target', 'bowling',
    'swords', 'shield', 'flame', 'zap', 'sparkles',
  ],
  ecommerce: [
    'store', 'storefront', 'shopping-cart', 'shopping-bag', 'shopping-basket',
    'package', 'package-open', 'package-check', 'package-plus', 'truck',
    'warehouse', 'box', 'boxes', 'archive', 'tag', 'tags', 'badge-percent',
    'percent', 'badge-dollar-sign', 'credit-card', 'wallet', 'banknote',
    'qr-code', 'barcode', 'scan-barcode', 'globe', 'globe-2', 'monitor',
    'smartphone', 'laptop', 'mail', 'send', 'rss', 'megaphone', 'bell',
    'heart', 'star', 'thumbs-up', 'share-2', 'link', 'external-link',
  ],
};

/** Prefer these leaf slugs when icon name matches. */
const SLUG_HINTS = {
  coffee: 'coffee-stamp-card',
  'cup-soda': 'bubble-tea-rewards',
  pizza: 'pizza-stamp-card',
  'ice-cream-cone': 'ice-cream-rewards',
  'ice-cream-bowl': 'ice-cream-rewards',
  utensils: 'catering-service',
  'utensils-crossed': 'restaurant-rewards',
  'chef-hat': 'restaurant-rewards',
  beer: 'bar-pub-loyalty',
  wine: 'bar-pub-loyalty',
  martini: 'bar-pub-loyalty',
  hamburger: 'fast-food-loyalty',
  donut: 'bakery-stamp-card',
  croissant: 'bakery-stamp-card',
  cookie: 'bakery-stamp-card',
  cake: 'bakery-stamp-card',
  'cake-slice': 'bakery-stamp-card',
  salad: 'juice-bar-loyalty',
  'glass-water': 'juice-bar-loyalty',
  shirt: 'clothing-store',
  glasses: 'clothing-store',
  watch: 'jewelry-store',
  gem: 'jewelry-store',
  diamond: 'jewelry-store',
  ring: 'jewelry-store',
  gift: 'gift-shop',
  'gift-card': 'gift-shop',
  book: 'bookstore',
  'book-open': 'bookstore',
  library: 'bookstore',
  smartphone: 'electronics-store',
  laptop: 'electronics-store',
  headphones: 'electronics-store',
  'shopping-cart': 'supermarket',
  'shopping-basket': 'supermarket',
  scissors: 'hair-salon',
  sparkles: 'beauty-salon',
  flower: 'spa-wellness',
  'flower-2': 'spa-wellness',
  bath: 'spa-wellness',
  dumbbell: 'gym-membership',
  bike: 'gym-membership',
  waves: 'swimming-pool',
  car: 'car-wash',
  'car-front': 'auto-service-center',
  fuel: 'fuel-station',
  motorcycle: 'bike-wash',
  wrench: 'auto-service-center',
  printer: 'printing-service',
  camera: 'photography-studio',
  'graduation-cap': 'tuition-center',
  school: 'tuition-center',
  music: 'music-school',
  'music-2': 'music-school',
  piano: 'music-school',
  guitar: 'music-school',
  languages: 'language-institute',
  'paw-print': 'pet-grooming',
  dog: 'pet-shop',
  cat: 'pet-shop',
  bone: 'pet-shop',
  stethoscope: 'veterinary-service',
  house: 'cleaning-service',
  home: 'cleaning-service',
  sprout: 'gardening-service',
  'tree-pine': 'gardening-service',
  hotel: 'hotel',
  bed: 'hotel',
  'bed-double': 'hotel',
  plane: 'travel-agency',
  luggage: 'travel-agency',
  'party-popper': 'event-planner',
  balloon: 'decoration-service',
  rings: 'wedding-studio',
  'calendar-heart': 'wedding-studio',
  pill: 'pharmacy',
  'pill-bottle': 'pharmacy',
  tablets: 'pharmacy',
  hospital: 'dental-clinic',
  eye: 'eye-clinic',
  film: 'cinema',
  clapperboard: 'cinema',
  popcorn: 'cinema',
  gamepad: 'gaming-center',
  'gamepad-2': 'gaming-center',
  store: 'online-store',
  package: 'subscription-box',
  truck: 'online-store',
};

const SKIP_PREFIXES = [
  'arrow-', 'chevron-', 'corner-', 'move-', 'panel-', 'sidebar-', 'align-',
  'between-', 'flip-', 'rotate-', 'fold-', 'unfold-', 'list-', 'layout-',
  'text-', 'case-', 'regex', 'binary', 'brackets', 'parenthes', 'curly-',
  'square-', 'circle-slash', 'toggle-', 'separator', 'ellipsis', 'loader',
  'grip-', 'grab', 'mouse-', 'pointer', 'cursor', 'a-arrow', 'a-large',
];

function humanize(id) {
  return id
    .split('-')
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

function shouldSkip(name) {
  const n = name.toLowerCase();
  return SKIP_PREFIXES.some((p) => n.startsWith(p) || n.includes(`-${p}`));
}

function extractInner(svgText) {
  const match = svgText.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  if (!match) return '';
  return match[1]
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\sstroke="currentColor"/g, '')
    .replace(/\sfill="none"/g, '')
    .trim();
}

function tileSvg(bg, inner) {
  return `<!-- Stamp Perk library icon · Lucide (ISC) -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <rect width="128" height="128" rx="28" fill="${bg}"/>
  <g transform="translate(64 64) scale(3.15) translate(-12 -12)" fill="none" stroke="#F8FAFC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    ${inner}
  </g>
</svg>
`;
}

function availableIcons() {
  if (!fs.existsSync(LUCIDE_DIR)) {
    throw new Error(`lucide-static not found at ${LUCIDE_DIR}. Run: npm i -D lucide-static -w @stampperk/api`);
  }
  return new Set(
    fs
      .readdirSync(LUCIDE_DIR)
      .filter((f) => f.endsWith('.svg'))
      .map((f) => f.replace(/\.svg$/, '')),
  );
}

function pickColor(groupId, index) {
  const palette = GROUP_COLORS[groupId] || ['#1C1C1E'];
  return palette[index % palette.length];
}

function main() {
  const available = availableIcons();
  const used = new Set();
  /** @type {{ id: string, categoryGroup: string, categorySlug?: string, label: string, path: string }[]} */
  const catalog = [];

  // Clear previous generated tiles (keep structure fresh)
  fs.rmSync(OUT_SVG, { recursive: true, force: true });
  fs.mkdirSync(OUT_SVG, { recursive: true });

  const groups = Object.keys(CURATED);

  for (const groupId of groups) {
    let idx = 0;
    for (const name of CURATED[groupId]) {
      if (!available.has(name) || used.has(name)) continue;
      used.add(name);
      const bg = pickColor(groupId, idx++);
      const src = fs.readFileSync(path.join(LUCIDE_DIR, `${name}.svg`), 'utf8');
      const inner = extractInner(src);
      if (!inner) continue;
      const relDir = groupId;
      const file = `${name}.svg`;
      const full = path.join(OUT_SVG, relDir, file);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, tileSvg(bg, inner));
      const entry = {
        id: `${groupId}-${name}`,
        categoryGroup: groupId,
        label: humanize(name),
        path: `/library/${relDir}/${file}`,
      };
      if (SLUG_HINTS[name]) entry.categorySlug = SLUG_HINTS[name];
      catalog.push(entry);
    }
  }

  // Fill to TARGET with remaining non-UI Lucide icons, round-robin across groups
  const fillers = [...available]
    .filter((n) => !used.has(n) && !shouldSkip(n))
    .sort();

  let gi = 0;
  for (const name of fillers) {
    if (catalog.length >= TARGET) break;
    const groupId = groups[gi % groups.length];
    gi += 1;
    used.add(name);
    const bg = pickColor(groupId, catalog.filter((c) => c.categoryGroup === groupId).length);
    const src = fs.readFileSync(path.join(LUCIDE_DIR, `${name}.svg`), 'utf8');
    const inner = extractInner(src);
    if (!inner) continue;
    const full = path.join(OUT_SVG, groupId, `${name}.svg`);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, tileSvg(bg, inner));
    const entry = {
      id: `${groupId}-${name}`,
      categoryGroup: groupId,
      label: humanize(name),
      path: `/library/${groupId}/${name}.svg`,
    };
    if (SLUG_HINTS[name]) entry.categorySlug = SLUG_HINTS[name];
    catalog.push(entry);
  }

  // Stable order: by group order then label
  const groupOrder = new Map(groups.map((g, i) => [g, i]));
  catalog.sort((a, b) => {
    const ga = groupOrder.get(a.categoryGroup) ?? 99;
    const gb = groupOrder.get(b.categoryGroup) ?? 99;
    if (ga !== gb) return ga - gb;
    return a.label.localeCompare(b.label);
  });

  const tsSafe = `/* eslint-disable */
/** Auto-generated by apps/api/scripts/build-media-library.cjs — do not edit by hand. */
export type GeneratedMediaLibraryItem = {
  id: string;
  categoryGroup: string;
  categorySlug?: string;
  label: string;
  path: string;
};

export const MEDIA_LIBRARY_GENERATED: GeneratedMediaLibraryItem[] = ${JSON.stringify(catalog, null, 2)};
`;

  fs.mkdirSync(path.dirname(OUT_TS), { recursive: true });
  fs.writeFileSync(OUT_TS, tsSafe);

  const byGroup = {};
  for (const item of catalog) {
    byGroup[item.categoryGroup] = (byGroup[item.categoryGroup] || 0) + 1;
  }

  console.log(`Wrote ${catalog.length} unique icons → ${OUT_SVG}`);
  console.log(`Catalog → ${OUT_TS}`);
  console.log(byGroup);
}

main();
