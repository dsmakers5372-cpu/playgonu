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

// All master. The missed-block bug (candidate pruning dropping the one
// cell that mattered) was the real cause of weak-looking play, not the
// difficulty tier itself — now that it's fixed, there's no reason to seat
// anyone below the strongest available tier.
function difficultyFor() {
  return 'master';
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

const ROTATE_MS = 60 * 60 * 1000; // roster composition shifts every 60 minutes, like people coming and going over the course of a session
const MIN_ONLINE = 18;
const MAX_ONLINE = 25;
const WAITING_MIN = 5;
const WAITING_MAX = 10;

const KOREAN_PLAYERS = VIRTUAL_PLAYERS.slice(0, NAMES_KO.length);
const INTERNATIONAL_PLAYERS = VIRTUAL_PLAYERS.slice(NAMES_KO.length);

// Share of the online roster with Korean names, by hour in Korea. Korean
// players thin out overnight while it's daytime in the Americas and Europe,
// so the lobby at 4 a.m. KST should read mostly English.
function koreanShareAt(kstHour) {
  if (kstHour >= 2 && kstHour < 7) return 0.15;
  if (kstHour >= 7 && kstHour < 9) return 0.3;
  if (kstHour >= 9 && kstHour < 12) return 0.45;
  if (kstHour >= 12 && kstHour < 18) return 0.55;
  if (kstHour >= 18) return 0.65;
  return 0.45; // 00–02
}

// Returns a stable-for-this-time-window, pseudo-random subset of the
// roster "online" for `gameType` right now — between MIN_ONLINE and
// MAX_ONLINE of the 100 names, Korean vs. international weighted by the
// hour in Korea. A per-gameType seed offset keeps the Cham-gonu and Gomoku
// lobbies from always showing the exact same subset.
export function pickVirtualRoster(gameType, now = Date.now()) {
  const bucket = Math.floor(now / ROTATE_MS);
  const gameSeed = gameType === 'gomoku' ? 0x9E3779B9 : 0x85EBCA6B;
  const seed = (bucket ^ gameSeed) >>> 0;
  const countSeed = (seed ^ 0x27d4eb2f) >>> 0;
  const count = MIN_ONLINE + (countSeed % (MAX_ONLINE - MIN_ONLINE + 1));
  const kstHour = new Date(now + 9 * 60 * 60 * 1000).getUTCHours();
  const koreanCount = Math.round(count * koreanShareAt(kstHour));
  const online = [
    ...seededShuffle(KOREAN_PLAYERS, seed).slice(0, koreanCount),
    ...seededShuffle(INTERNATIONAL_PLAYERS, (seed ^ 0x51ed270b) >>> 0).slice(0, count - koreanCount),
  ];
  return seededShuffle(online, (seed ^ 0x1b873593) >>> 0).map((vp) => ({ ...vp, gameType }));
}

const ROOM_TITLES_KO = ['한 판 해요', '초보 환영', '고수만 오세요', '매너 게임해요', '연습 상대 구해요', '빠르게 한 판', '심심해서 한 판', '오늘 연승 중'];
const ROOM_TITLES_EN = ['Quick game?', 'Beginners welcome', 'Looking for a challenge', 'Friendly match', 'Practice game', 'One more round', 'Good games only', 'Bring it on'];

// Splits the online roster into open rooms and games already in progress
// (pairs of virtual players), so the dashboard reads like a real lobby —
// some people waiting, some mid-game — rather than a wall of empty rooms.
// Roughly 40% of those online are shown as playing, and about two thirds of
// the open rooms carry a title. Each host titles their room in their own
// language, so the lobby's language mix follows who is online.
export function pickVirtualLobby(gameType, now = Date.now()) {
  const roster = pickVirtualRoster(gameType, now);
  const pairCount = Math.floor(roster.length / 5);
  const playing = [];
  for (let i = 0; i < pairCount; i++) playing.push([roster[i * 2], roster[i * 2 + 1]]);
  const waiting = roster.slice(pairCount * 2).map((vp, i) => {
    if (i % 3 === 2) return { ...vp, title: null };
    const titles = /[가-힣]/.test(vp.name) ? ROOM_TITLES_KO : ROOM_TITLES_EN;
    return { ...vp, title: titles[(Number(vp.id.slice(1)) + i) % titles.length] };
  });
  // The dashboard shows 5–10 open rooms, rotating with the hour like the roster.
  const waitingCount = WAITING_MIN + (((Math.floor(now / ROTATE_MS) ^ 0x2545f491) >>> 0) % (WAITING_MAX - WAITING_MIN + 1));
  return { waiting: waiting.slice(0, waitingCount), playing };
}
