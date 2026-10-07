// A fixed roster of "virtual" opponents (bots styled as regular online
// nicknames) so the lobby never looks empty for early visitors — a public
// room list with zero entries is the single biggest reason a brand-new
// online-battle page fails to convert. Challenging one of these instantly
// matches the human against an AI playing at the listed difficulty; it is
// NOT a real pre-existing room, so a fresh Durable Object is created per
// challenge (see GameRoom.js) rather than reusing one shared instance.
//
// Names are casual gamer-tag style (not claimed real identities) mixing
// Korean and English/Latin script, matching this site's EN+KO audience.
const NAMES_KO = [
  '고누왕', '돌쇠', '바람돌이', '산책왕', '느림보', '전략가', '밤부엉이', '구름위', '참새', '호두까기',
  '늑대소년', '달빛검객', '조용한바둑', '여우꼬리', '두더지', '바둑돌', '수수깡', '동백꽃', '참고누짱', '고수할배',
  '초보환영', '번개돌', '그림자', '민들레', '까치발', '솔바람', '은하수', '별사냥꾼', '고요한밤', '작은거북',
  '폭풍전야', '산들바람', '다람쥐', '눈꽃송이', '파란하늘', '붉은노을', '하얀구름', '조약돌', '소나무', '무궁화',
  '진달래', '참새방앗간', '느긋함', '고누초보', '수줍돌이', '바위틈', '여름밤', '가을바람', '겨울나무', '봄까치',
];

const NAMES_EN = [
  'StoneFox', 'QuietKnight', 'MoonRiver32', 'PixelWanderer', 'LazyRook', 'NightOwl7', 'CrimsonLeaf', 'SilverFern', 'MapleDrift', 'WinterBear',
  'EchoTrail', 'BlueHaven', 'RustyAnchor', 'GoldenHour7', 'ShadowLynx', 'Driftwood', 'PaperCrane', 'CloudNine', 'EmberFox', 'FrostPine',
  'SunnySide88', 'QuietStorm', 'MapleSyrup', 'IronWillow', 'SeaGlass', 'MidnightOak', 'WildSage', 'CopperSky', 'VelvetMoss', 'StillWater',
  'HollowPine', 'AmberTrail', 'RiverStone', 'NorthWind9', 'PebbleBeach', 'LanternGlow', 'WhisperPine', 'HarborLight', 'AutumnEcho', 'BrightFoxx',
  'SilentSail', 'MossyOak42', 'TwilightFox', 'CedarRidge', 'PineHollow', 'SaltMarsh', 'GentleGale', 'DuskRunner', 'FeatherFall', 'SlowCurrent',
];

// Roughly 3:2 normal:hard — enough bite to feel like a real opponent
// without every early visitor's first online game being a brutal loss.
function difficultyFor(index) {
  return index % 5 < 3 ? 'normal' : 'hard';
}

export const VIRTUAL_PLAYERS = [...NAMES_KO, ...NAMES_EN].map((name, i) => ({
  id: `v${String(i + 1).padStart(3, '0')}`,
  name,
  difficulty: difficultyFor(i),
}));

const VIRTUAL_PLAYERS_BY_ID = new Map(VIRTUAL_PLAYERS.map((vp) => [vp.id, vp]));

export function getVirtualPlayer(id) {
  return VIRTUAL_PLAYERS_BY_ID.get(id) || null;
}

function seededShuffle(items, seed) {
  // Small deterministic PRNG (mulberry32) so every request within the same
  // time bucket sees the identical order — otherwise two concurrent lobby
  // polls could show a different roster and visibly "flicker".
  let a = seed >>> 0;
  function rand() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const ROTATE_MS = 45 * 1000; // roster composition shifts every ~45s, like people coming and going
const MIN_ONLINE = 18;
const MAX_ONLINE = 25;

// Returns a stable-for-this-time-window, pseudo-random subset of the
// roster "online" for `gameType` right now — between MIN_ONLINE and
// MAX_ONLINE of the 100 names. A per-gameType seed offset keeps the
// Cham-gonu and Gomoku lobbies from always showing the exact same subset.
export function pickVirtualRoster(gameType) {
  const bucket = Math.floor(Date.now() / ROTATE_MS);
  const gameSeed = gameType === 'gomoku' ? 0x9E3779B9 : 0x85EBCA6B;
  const seed = (bucket ^ gameSeed) >>> 0;
  const shuffled = seededShuffle(VIRTUAL_PLAYERS, seed);
  const countSeed = (seed ^ 0x27d4eb2f) >>> 0;
  const count = MIN_ONLINE + (countSeed % (MAX_ONLINE - MIN_ONLINE + 1));
  return shuffled.slice(0, count).map((vp) => ({ ...vp, gameType }));
}
