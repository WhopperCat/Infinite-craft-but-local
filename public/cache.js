// cache.js — seed cache + localStorage persistence.
//
// Key format is always: [a, b].sort().join('+').toLowerCase()

const COMBO_STORAGE_KEY = 'ic_combos_v1';
const DISCOVERED_STORAGE_KEY = 'ic_discovered_v1';

// ---------- Seed cache: ~50 common combos with emojis ----------
const SEED_CACHE = {
  'earth+fire': { result: 'Lava', emoji: '🌋' },
  'earth+water': { result: 'Mud', emoji: '🟫' },
  'fire+water': { result: 'Steam', emoji: '💨' },
  'fire+wind': { result: 'Smoke', emoji: '🌫️' },
  'earth+wind': { result: 'Dust', emoji: '🌪️' },
  'fire+fire': { result: 'Inferno', emoji: '🔥' },
  'water+water': { result: 'Ocean', emoji: '🌊' },
  'earth+earth': { result: 'Mountain', emoji: '⛰️' },
  'wind+wind': { result: 'Storm', emoji: '⛈️' },
  'water+wind': { result: 'Wave', emoji: '🌊' },

  'lava+water': { result: 'Stone', emoji: '🪨' },
  'lava+lava': { result: 'Volcano', emoji: '🌋' },
  'lava+air': { result: 'Basalt', emoji: '🪨' },
  'mud+fire': { result: 'Brick', emoji: '🧱' },
  'mud+mud': { result: 'Swamp', emoji: '🐊' },
  'steam+earth': { result: 'Geyser', emoji: '♨️' },
  'steam+steam': { result: 'Cloud', emoji: '☁️' },
  'cloud+water': { result: 'Rain', emoji: '🌧️' },
  'cloud+cloud': { result: 'Sky', emoji: '🌌' },
  'rain+earth': { result: 'Plant', emoji: '🌱' },

  'rain+rain': { result: 'Flood', emoji: '🌊' },
  'plant+earth': { result: 'Tree', emoji: '🌳' },
  'plant+water': { result: 'Algae', emoji: '🟢' },
  'plant+fire': { result: 'Ash', emoji: '🌫️' },
  'tree+tree': { result: 'Forest', emoji: '🌲' },
  'tree+fire': { result: 'Charcoal', emoji: '⚫' },
  'tree+wind': { result: 'Leaf', emoji: '🍃' },
  'stone+fire': { result: 'Metal', emoji: '🔩' },
  'stone+stone': { result: 'Wall', emoji: '🧱' },
  'metal+fire': { result: 'Blade', emoji: '🗡️' },

  'metal+water': { result: 'Rust', emoji: '🟠' },
  'metal+metal': { result: 'Machine', emoji: '⚙️' },
  'sand+fire': { result: 'Glass', emoji: '🪟' },
  'sand+water': { result: 'Beach', emoji: '🏖️' },
  'earth+sand': { result: 'Desert', emoji: '🏜️' },
  'glass+sand': { result: 'Lens', emoji: '🔍' },
  'fire+sky': { result: 'Sun', emoji: '☀️' },
  'water+sky': { result: 'Rainbow', emoji: '🌈' },
  'sky+night': { result: 'Star', emoji: '⭐' },
  'star+star': { result: 'Galaxy', emoji: '🌌' },

  'sun+water': { result: 'Life', emoji: '🧬' },
  'life+earth': { result: 'Animal', emoji: '🐾' },
  'life+water': { result: 'Fish', emoji: '🐟' },
  'animal+animal': { result: 'Herd', emoji: '🐄' },
  'fish+fire': { result: 'Sushi', emoji: '🍣' },
  'wind+fire': { result: 'Energy', emoji: '⚡' },
  'energy+metal': { result: 'Electricity', emoji: '⚡' },
  'electricity+sand': { result: 'Computer', emoji: '💻' },
  'water+ice': { result: 'Glacier', emoji: '🧊' },
  'wind+water': { result: 'Mist', emoji: '🌫️' },
  'fire+ice': { result: 'Water', emoji: '💧' },
  'ice+ice': { result: 'Snow', emoji: '❄️' }
};

function key(a, b) {
  return [a, b].sort().join('+').toLowerCase();
}

// Runtime layer of user-discovered combos, hydrated from localStorage.
let comboCache = loadCombos();

function loadCombos() {
  try {
    const raw = localStorage.getItem(COMBO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function persistCombos() {
  try {
    localStorage.setItem(COMBO_STORAGE_KEY, JSON.stringify(comboCache));
  } catch (e) {
    /* storage full or unavailable — ignore */
  }
}

/**
 * Look up a cached combination. Checks the seed cache first, then the
 * localStorage-backed runtime cache. Returns { result, emoji } or null.
 */
export function getCached(a, b) {
  const k = key(a, b);
  if (SEED_CACHE[k]) return SEED_CACHE[k];
  if (comboCache[k]) return comboCache[k];
  return null;
}

/**
 * Persist a newly computed combination.
 */
export function setCached(a, b, result, emoji) {
  const k = key(a, b);
  comboCache[k] = { result, emoji };
  persistCombos();
}

/**
 * Load the discovered elements map (name -> emoji) from localStorage.
 * Returns a Map.
 */
export function loadDiscovered() {
  try {
    const raw = localStorage.getItem(DISCOVERED_STORAGE_KEY);
    if (raw) return new Map(JSON.parse(raw));
  } catch (e) {
    /* ignore */
  }
  // Default starting elements.
  return new Map([
    ['Water', '💧'],
    ['Fire', '🔥'],
    ['Wind', '🌬️'],
    ['Earth', '🌍']
  ]);
}

/**
 * Persist the discovered elements map.
 */
export function saveDiscovered(map) {
  try {
    localStorage.setItem(
      DISCOVERED_STORAGE_KEY,
      JSON.stringify([...map.entries()])
    );
  } catch (e) {
    /* ignore */
  }
}
