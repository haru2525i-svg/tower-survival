const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const frame = document.querySelector(".frame");

const hpFill = document.getElementById("hpFill");
const xpFill = document.getElementById("xpFill");
const shieldFill = document.getElementById("shieldFill");
const levelValue = document.getElementById("levelValue");
const timeValue = document.getElementById("timeValue");
const weaponValue = document.getElementById("weaponValue");
const enemyValue = document.getElementById("enemyValue");

const startOverlay = document.getElementById("startOverlay");
const upgradeOverlay = document.getElementById("upgradeOverlay");
const endOverlay = document.getElementById("endOverlay");
const upgradeEyebrow = document.getElementById("upgradeEyebrow");
const upgradeTitle = document.getElementById("upgradeTitle");
const upgradeChoices = document.getElementById("upgradeChoices");
const endEyebrow = document.getElementById("endEyebrow");
const endTitle = document.getElementById("endTitle");
const endSummary = document.getElementById("endSummary");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const titleButton = document.getElementById("titleButton");
const gameReturnButton = document.getElementById("gameReturnButton");
const returnConfirmOverlay = document.getElementById("returnConfirmOverlay");
const returnConfirmTitle = document.getElementById("returnConfirmTitle");
const returnConfirmLead = document.getElementById("returnConfirmLead");
const returnYesButton = document.getElementById("returnYesButton");
const returnNoButton = document.getElementById("returnNoButton");
const titleMenuHome = document.getElementById("titleMenuHome");
const titleMenuAdventure = document.getElementById("titleMenuAdventure");
const titleMenuPractice = document.getElementById("titleMenuPractice");
const titleMenuRecords = document.getElementById("titleMenuRecords");
const menuAdventureButton = document.getElementById("menuAdventureButton");
const menuPracticeButton = document.getElementById("menuPracticeButton");
const menuRecordsButton = document.getElementById("menuRecordsButton");
const adventureBackButton = document.getElementById("adventureBackButton");
const practiceMenuBackButton = document.getElementById("practiceMenuBackButton");
const recordsBackButton = document.getElementById("recordsBackButton");
const practiceMenuStatus = document.getElementById("practiceMenuStatus");
const historyList = document.getElementById("historyList");
const practiceButton = document.getElementById("practiceButton");
const practicePanel = document.getElementById("practicePanel");
const practicePanelTitle = document.getElementById("practicePanelTitle");
const practicePanelLead = document.getElementById("practicePanelLead");
const practicePanelToggle = document.getElementById("practicePanelToggle");
const practiceBossHpSelect = document.getElementById("practiceBossHpSelect");
const practiceDifficultySelect = document.getElementById("practiceDifficultySelect");
const practiceCopyLastButton = document.getElementById("practiceCopyLastButton");
const practiceStageList = document.getElementById("practiceStageList");
const practiceStatusList = document.getElementById("practiceStatusList");
const practiceDevSection = document.getElementById("practiceDevSection");
const devStageControls = document.getElementById("devStageControls");
const devToggleList = document.getElementById("devToggleList");
const devEnemyToggleList = document.getElementById("devEnemyToggleList");
const devSpawnOneList = document.getElementById("devSpawnOneList");
const devBossTestList = document.getElementById("devBossTestList");
const devRuntimeList = document.getElementById("devRuntimeList");
const devPresetList = document.getElementById("devPresetList");
const practiceSkillList = document.getElementById("practiceSkillList");
const practiceRareList = document.getElementById("practiceRareList");
const practiceHpDown = document.getElementById("practiceHpDown");
const practiceHpUp = document.getElementById("practiceHpUp");
const practiceHpValue = document.getElementById("practiceHpValue");
const practiceBaseAttackDown = document.getElementById("practiceBaseAttackDown");
const practiceBaseAttackUp = document.getElementById("practiceBaseAttackUp");
const practiceBaseAttackValue = document.getElementById("practiceBaseAttackValue");
const practiceResetUnlockButton = document.getElementById("practiceResetUnlockButton");
const difficultyButtons = Array.from(document.querySelectorAll("[data-difficulty]"));
const difficultyDesc = document.getElementById("difficultyDesc");
const effectButtons = Array.from(document.querySelectorAll("[data-effect-mode]"));
const effectDesc = document.getElementById("effectDesc");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const keys = new Set();
const GRID_SIZE = 40;
const LIGHTNING_CHAIN_RANGE = GRID_SIZE * 3;
const MINIMAP_RADIUS = 82;
const MINIMAP_RANGE = 900;
const MAX_BURSTS = 95;
const MAX_BURST_ADDS_PER_FRAME = 18;
const MAX_CHAIN_EXPLOSIONS_PER_FRAME = 5;
const MAX_PENDING_CHAIN_EXPLOSIONS = 48;
const MAX_SKILL_PROJECTILES = 3;
const MAX_WAVE_SLASH_PROJECTILES = 3;
const MAX_PLAYER_PROJECTILES = 180;
const MAX_ENEMY_PROJECTILES = 170;
const MAX_WAVE_ENEMIES_BY_STAGE = [24, 28, 32, 36, 40, 42, 44, 46, 48, 50];
const MAX_NORMAL_SPAWN_ENEMIES_BY_STAGE = [17, 20, 23, 26, 29, 30, 31, 32, 33, 34];
const BUILD_CONFIG = window.TOWER_BUILD_CONFIG ?? {};
const BUILD_VARIANT = BUILD_CONFIG.variant === "play" ? "play" : "dev";
const BUILD_STORAGE_SUFFIX = `:${BUILD_VARIANT}`;
const RAINBOW_SKILL_UNLOCK_STORAGE_KEY = getBuildStorageKey("towerSurvivalRainbowSkillsUnlocked");
const PRACTICE_SKILL_UNLOCK_STORAGE_KEY = getBuildStorageKey("towerSurvivalPracticeSkillUnlocks");
const DIFFICULTY_UNLOCK_STORAGE_KEY = getBuildStorageKey("towerSurvivalDifficultyUnlocks");
const CURRENT_ADVENTURE_STAGE_COUNT = 8;
const CURRENT_ADVENTURE_LAST_STAGE_INDEX = CURRENT_ADVENTURE_STAGE_COUNT - 1;
const DEFAULT_DIFFICULTY_UNLOCKS = Object.freeze({
  easy: true,
  normal: true,
  hard: false,
  gamer: false,
});

const STAGES = [
  { targetKills: 65, enemyHp: 1, enemySpeed: 1, enemyDamage: 1, spawnRate: 1, bossHp: 1, bossDamage: 1, bossCooldown: 2.3 },
  { targetKills: 95, enemyHp: 1.2, enemySpeed: 1.08, enemyDamage: 1.12, spawnRate: 1.22, bossHp: 1.18, bossDamage: 1.12, bossCooldown: 2.02 },
  { targetKills: 135, enemyHp: 1.48, enemySpeed: 1.16, enemyDamage: 1.26, spawnRate: 1.5, bossHp: 1.38, bossDamage: 1.26, bossCooldown: 1.78 },
  { targetKills: 180, enemyHp: 1.82, enemySpeed: 1.24, enemyDamage: 1.42, spawnRate: 1.86, bossHp: 1.62, bossDamage: 1.42, bossCooldown: 1.56 },
  { targetKills: 240, enemyHp: 2.2, enemySpeed: 1.32, enemyDamage: 1.58, spawnRate: 2.3, bossHp: 1.9, bossDamage: 1.58, bossCooldown: 1.34 },
  { targetKills: 310, enemyHp: 2.66, enemySpeed: 1.42, enemyDamage: 1.78, spawnRate: 2.62, bossHp: 2.2, bossDamage: 1.78, bossCooldown: 1.18 },
  { targetKills: 390, enemyHp: 3.18, enemySpeed: 1.52, enemyDamage: 2.02, spawnRate: 2.96, bossHp: 2.56, bossDamage: 2.02, bossCooldown: 1.04 },
  { targetKills: 480, enemyHp: 3.76, enemySpeed: 1.64, enemyDamage: 2.32, spawnRate: 3.34, bossHp: 2.98, bossDamage: 2.32, bossCooldown: 0.92 },
  { targetKills: 580, enemyHp: 4.42, enemySpeed: 1.76, enemyDamage: 2.66, spawnRate: 3.72, bossHp: 3.45, bossDamage: 2.66, bossCooldown: 0.84 },
  { targetKills: 700, enemyHp: 5.15, enemySpeed: 1.9, enemyDamage: 3.05, spawnRate: 4.1, bossHp: 4, bossDamage: 3.05, bossCooldown: 0.78 },
];


const state = {
  running: false,
  paused: false,
  gameOver: false,
  won: false,
  time: 0,
  spawnTimer: 0,
  flash: 0,
  stageIndex: 0,
  stageKills: 0,
  pendingLevelUps: 0,
  stageState: "wave",
  stageIntroTimer: 0,
  bossSpawned: false,
  bossDefeated: false,
  player: null,
  enemies: [],
  normalSpawnEnemyCount: 0,
  fifthBossEliteCount: 0,
  playerProjectiles: [],
  enemyProjectiles: [],
  pickups: [],
  bursts: [],
  burstAddsThisFrame: 0,
  chainExplosionQueue: [],
  safeZones: [],
  sanctuaryAttack: null,
  smokeFans: [],
  blinkBanZones: [],
  lanceVolley: null,
  bossDoor: null,
  practiceMode: false,
  practicePanelOpen: false,
  practiceDoors: [],
  practiceNormalLevels: {},
  practiceSpecialLevels: {},
  practiceStatusToggles: {
    darkZone: true,
    reverseHorizontal: true,
    reverseVertical: true,
    blinkBan: true,
  },
  practiceBossHpMode: "normal",
  practiceDifficultyKey: "normal",
  practiceBaseHp: 100,
  practiceBaseAttackBonus: 0,
  practiceFirepowerLevel: 0,
  practiceHealthLevel: 0,
  returnConfirmWasPaused: false,
  difficultyKey: "normal",
  effectMode: "normal",
  startMenuSection: "home",
  inkTimer: 0,
  inkStrength: 1,
  darkZone: null,
  darkZoneInside: false,
  darkZoneTransitionFlash: 0,
  reverseHorizontalTimer: 0,
  reverseVerticalTimer: 0,
  reverseWarningAxis: null,
  reverseWarningTimer: 0,
  reversePendingDuration: 0,
  damageStats: {},
  lastDamageCause: "",
  lastRunSnapshot: null,
  runHistory: [],
  devSettings: null,
  debugFps: 60,
  hiddenRainbowUnlocked: false,
  practiceSkillUnlocks: {},
  difficultyUnlocks: { ...DEFAULT_DIFFICULTY_UNLOCKS },
  hiddenRainbowAnnouncement: null,
  claimedBossRewards: {},
  nextSafeZoneGroupId: 1,
  camera: { x: 0, y: 0 },
  arena: null,
  mouse: {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    worldX: 0,
    worldY: 0,
    down: false,
  },
};


function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isDevBuild() {
  return BUILD_VARIANT === "dev";
}

function getBuildStorageKey(baseKey) {
  return `${baseKey}${BUILD_STORAGE_SUFFIX}`;
}

function isNormalSpawnEnemy(enemy) {
  return Boolean(enemy && enemy.type === "mob" && !enemy.summoned);
}

function isFifthBossEliteEnemy(enemy) {
  return Boolean(enemy?.fifthBossElite);
}

function resetEnemyCounters() {
  state.normalSpawnEnemyCount = 0;
  state.fifthBossEliteCount = 0;
}

function recalculateEnemyCounters() {
  let normalSpawnEnemyCount = 0;
  let fifthBossEliteCount = 0;
  for (const enemy of state.enemies) {
    if (isNormalSpawnEnemy(enemy)) normalSpawnEnemyCount += 1;
    if (isFifthBossEliteEnemy(enemy)) fifthBossEliteCount += 1;
  }
  state.normalSpawnEnemyCount = normalSpawnEnemyCount;
  state.fifthBossEliteCount = fifthBossEliteCount;
}

function trackEnemyAdded(enemy) {
  if (isNormalSpawnEnemy(enemy)) state.normalSpawnEnemyCount += 1;
  if (isFifthBossEliteEnemy(enemy)) state.fifthBossEliteCount += 1;
}

function trackEnemyRemoved(enemy) {
  if (isNormalSpawnEnemy(enemy)) {
    state.normalSpawnEnemyCount = Math.max(0, state.normalSpawnEnemyCount - 1);
  }
  if (isFifthBossEliteEnemy(enemy)) {
    state.fifthBossEliteCount = Math.max(0, state.fifthBossEliteCount - 1);
  }
}

function addEnemy(enemy) {
  state.enemies.push(enemy);
  trackEnemyAdded(enemy);
  return enemy;
}

function removeEnemyAt(index) {
  const enemy = state.enemies[index];
  if (!enemy) return null;
  trackEnemyRemoved(enemy);
  state.enemies.splice(index, 1);
  return enemy;
}

function replaceEnemies(nextEnemies) {
  state.enemies = nextEnemies;
  recalculateEnemyCounters();
  return state.enemies;
}

function countFifthBossElites() {
  return state.fifthBossEliteCount;
}

document.documentElement.dataset.buildVariant = BUILD_VARIANT;
document.title = isDevBuild() ? "塔攻略 DEV" : "塔攻略";

function loadHiddenRainbowUnlock() {
  try {
    return localStorage.getItem(RAINBOW_SKILL_UNLOCK_STORAGE_KEY) === "1";
  } catch {
    return state.hiddenRainbowUnlocked ?? false;
  }
}

function saveHiddenRainbowUnlock(enabled) {
  try {
    if (enabled) {
      localStorage.setItem(RAINBOW_SKILL_UNLOCK_STORAGE_KEY, "1");
    } else {
      localStorage.removeItem(RAINBOW_SKILL_UNLOCK_STORAGE_KEY);
    }
  } catch {
    // Local-file play can block storage; current-session state still works.
  }
}

function getCurrentAdventureStageCount() {
  return Math.min(CURRENT_ADVENTURE_STAGE_COUNT, STAGES.length);
}

function getCurrentAdventureLastStageIndex() {
  return Math.max(0, getCurrentAdventureStageCount() - 1);
}

function loadDifficultyUnlocks() {
  try {
    const raw = localStorage.getItem(DIFFICULTY_UNLOCK_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const next = {
      ...DEFAULT_DIFFICULTY_UNLOCKS,
      ...(parsed && typeof parsed === "object" ? parsed : {}),
    };
    next.easy = true;
    next.normal = true;
    if (next.gamer) next.hard = true;
    return next;
  } catch {
    return { ...DEFAULT_DIFFICULTY_UNLOCKS };
  }
}

function saveDifficultyUnlocks(unlocks) {
  try {
    localStorage.setItem(DIFFICULTY_UNLOCK_STORAGE_KEY, JSON.stringify(unlocks));
  } catch {
    // Local-file play can block storage; current-session state still works.
  }
}

function isDifficultyUnlocked(key) {
  if (key === "easy" || key === "normal") return true;
  return Boolean(state.difficultyUnlocks?.[key]);
}

function unlockDifficulty(key) {
  if (!(key in DEFAULT_DIFFICULTY_UNLOCKS) || isDifficultyUnlocked(key)) return false;
  state.difficultyUnlocks = {
    ...DEFAULT_DIFFICULTY_UNLOCKS,
    ...(state.difficultyUnlocks ?? {}),
    [key]: true,
  };
  if (key === "gamer") {
    state.difficultyUnlocks.hard = true;
  }
  saveDifficultyUnlocks(state.difficultyUnlocks);
  if (typeof updateDifficultyButtons === "function") {
    updateDifficultyButtons();
  }
  return true;
}

function unlockNextDifficultyForClear() {
  if (state.practiceMode || state.stageIndex < getCurrentAdventureLastStageIndex()) return false;
  if (state.difficultyKey === "normal") {
    return unlockDifficulty("hard");
  }
  if (state.difficultyKey === "hard") {
    return unlockDifficulty("gamer");
  }
  return false;
}

function loadPracticeSkillUnlocks() {
  try {
    const raw = localStorage.getItem(PRACTICE_SKILL_UNLOCK_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (Array.isArray(parsed)) {
      return Object.fromEntries(parsed.filter((key) => typeof key === "string").map((key) => [key, true]));
    }
    if (parsed && typeof parsed === "object") {
      return Object.fromEntries(
        Object.entries(parsed)
          .filter(([, unlocked]) => Boolean(unlocked))
          .map(([key]) => [key, true]),
      );
    }
  } catch {
    // Local-file play can block storage; current-session state still works.
  }
  return {};
}

function savePracticeSkillUnlocks(unlocks) {
  try {
    localStorage.setItem(PRACTICE_SKILL_UNLOCK_STORAGE_KEY, JSON.stringify(unlocks));
  } catch {
    // Local-file play can block storage; current-session state still works.
  }
}

function hasPracticeSkillUnlock(key) {
  return Boolean(state.practiceSkillUnlocks?.[key]);
}

function unlockPracticeSkill(key) {
  if (!key || hasPracticeSkillUnlock(key)) return false;
  state.practiceSkillUnlocks = {
    ...(state.practiceSkillUnlocks ?? {}),
    [key]: true,
  };
  savePracticeSkillUnlocks(state.practiceSkillUnlocks);
  if (typeof updatePracticePanel === "function") {
    updatePracticePanel();
  }
  return true;
}

function isPracticeSpecialUnlocked(upgradeOrKey) {
  const upgrade = typeof upgradeOrKey === "string"
    ? (typeof getUpgradeDefByKey === "function" ? getUpgradeDefByKey(upgradeOrKey) : null)
    : upgradeOrKey;
  if (!upgrade) return true;
  if (upgrade.red || upgrade.rainbow) {
    return hasPracticeSkillUnlock(upgrade.key);
  }
  return true;
}

function unlockHiddenRainbowSkills() {
  if (state.hiddenRainbowUnlocked) return false;

  state.hiddenRainbowUnlocked = true;
  saveHiddenRainbowUnlock(true);
  state.hiddenRainbowAnnouncement = {
    timer: 2.15,
    total: 2.15,
    title: "虹秘技解放",
    subtitle: "ザ・ワールド / 会心槍 が宝箱から低確率で出現",
  };

  if (state.player) {
    addBurst({
      kind: "ring",
      x: state.player.x,
      y: state.player.y,
      radius: 74,
      life: 0.34,
      maxLife: 0.34,
      color: "rgba(255,255,255,0.96)",
    });
  }
  return true;
}

function updateHiddenRainbowAnnouncement(dt) {
  if (!state.hiddenRainbowAnnouncement) return;
  state.hiddenRainbowAnnouncement.timer -= dt;
  if (state.hiddenRainbowAnnouncement.timer <= 0) {
    state.hiddenRainbowAnnouncement = null;
  }
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}


function angleDifference(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

function formatTime(totalSeconds) {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function worldToScreenX(x) {
  return x - state.camera.x + WIDTH / 2;
}

function worldToScreenY(y) {
  return y - state.camera.y + HEIGHT / 2;
}

function isOnScreen(x, y, padding = 48) {
  const sx = worldToScreenX(x);
  const sy = worldToScreenY(y);
  return sx >= -padding && sx <= WIDTH + padding && sy >= -padding && sy <= HEIGHT + padding;
}

function getMoveAxis(negative, positive) {
  let value = 0;
  if (keys.has(negative)) value -= 1;
  if (keys.has(positive)) value += 1;
  return value;
}

function updateMouseWorld() {
  state.mouse.worldX = state.camera.x - WIDTH / 2 + state.mouse.x;
  state.mouse.worldY = state.camera.y - HEIGHT / 2 + state.mouse.y;
}

function resetGame() {
  state.running = false;
  state.paused = false;
  state.gameOver = false;
  state.won = false;
  state.time = 0;
  state.spawnTimer = 0;
  state.flash = 0;
  state.stageIndex = 0;
  state.stageKills = 0;
  state.pendingLevelUps = 0;
  state.stageState = "wave";
  state.stageIntroTimer = 2;
  state.bossSpawned = false;
  state.bossDefeated = false;
  state.player = createPlayer();
  replaceEnemies([]);
  state.playerProjectiles = [];
  state.enemyProjectiles = [];
  state.pickups = [];
  state.bursts = [];
  state.burstAddsThisFrame = 0;
  state.chainExplosionQueue = [];
  state.safeZones = [];
  state.sanctuaryAttack = null;
  state.smokeFans = [];
  state.blinkBanZones = [];
  state.lanceVolley = null;
  state.bossDoor = null;
  state.practiceMode = false;
  state.practicePanelOpen = false;
  state.practiceDoors = [];
  state.inkTimer = 0;
  state.inkStrength = 1;
  state.darkZone = null;
  state.darkZoneInside = false;
  state.darkZoneTransitionFlash = 0;
  state.reverseHorizontalTimer = 0;
  state.reverseVerticalTimer = 0;
  state.reverseWarningAxis = null;
  state.reverseWarningTimer = 0;
  state.reversePendingDuration = 0;
  state.damageStats = {};
  state.lastDamageCause = "";
  state.hiddenRainbowAnnouncement = null;
  state.claimedBossRewards = {};
  state.nextSafeZoneGroupId = 1;
  state.arena = null;
  state.mouse.down = false;
  resetEnemyCounters();
  keys.clear();
  state.camera = { x: 0, y: 0 };
  updateMouseWorld();
  updatePracticePanel();
  updateGameReturnButton();
  updateHud();
}


function addBurst(burst) {
  const effects = currentEffectMode();
  const guaranteed = Boolean(burst.guaranteed);
  if (state.effectMode === "light") {
    const important = guaranteed || burst.kind === "fan" || burst.kind === "bossSlash" || burst.kind === "rect";
    const large = (burst.radius ?? 0) >= 110 || (burst.width ?? 0) >= 160 || (burst.height ?? 0) >= 160;
    if (!important && !large && Math.random() > effects.burstChance) {
      return;
    }
  }

  if (!guaranteed && state.burstAddsThisFrame >= effects.burstBudget) {
    return;
  }
  state.burstAddsThisFrame += 1;
  state.bursts.push(burst);
  if (state.bursts.length > effects.burstLimit) {
    state.bursts.splice(0, state.bursts.length - effects.burstLimit);
  }
}

function addSafeZone(zone) {
  state.safeZones.push({
    delay: 0,
    ...zone,
  });
}

function applyInk(duration = 3.2, strength = 1) {
  state.inkTimer = Math.max(state.inkTimer, duration);
  state.inkStrength = Math.max(state.inkStrength ?? 1, strength);
}

function addDarkZone(orientation, side, duration = 3.4) {
  state.darkZone = {
    orientation,
    side,
    timer: duration,
    total: duration,
  };
}

function isPlayerInDarkZone(zone = state.darkZone) {
  if (!zone || !state.player) return false;
  const centerX = state.arena?.x ?? state.player.x;
  const centerY = state.arena?.y ?? state.player.y;
  if (zone.orientation === "horizontal") {
    return zone.side === "left" ? state.player.x <= centerX : state.player.x >= centerX;
  }
  return zone.side === "top" ? state.player.y <= centerY : state.player.y >= centerY;
}

function isVisionSealActive() {
  return state.inkTimer > 0 || Boolean(state.darkZone && isPlayerInDarkZone(state.darkZone));
}

function startReverseWarning(axis, warningDuration = 1.0, reverseDuration = 3.0) {
  state.reverseWarningAxis = axis;
  state.reverseWarningTimer = Math.max(state.reverseWarningTimer, warningDuration);
  state.reversePendingDuration = Math.max(state.reversePendingDuration, reverseDuration);
}

function addBlinkBanZone(x, y, radius = 150, duration = 4.5, warningDuration = 0.85) {
  state.blinkBanZones.push({
    x,
    y,
    radius,
    timer: duration,
    total: duration,
    warningTimer: warningDuration,
    warningTotal: warningDuration,
  });
}

function isPlayerInBlinkBanZone() {
  return state.blinkBanZones.some((zone) => zone.warningTimer <= 0 && distance(state.player, zone) <= zone.radius + state.player.hitRadius);
}

function updateStatusEffects(dt) {
  state.inkTimer = Math.max(0, state.inkTimer - dt);
  if (state.inkTimer <= 0) {
    state.inkStrength = 1;
  }
  if (state.darkZone) {
    state.darkZone.timer = Math.max(0, state.darkZone.timer - dt);
    if (state.darkZone.timer <= 0) {
      state.darkZone = null;
    }
  }
  state.reverseHorizontalTimer = Math.max(0, state.reverseHorizontalTimer - dt);
  state.reverseVerticalTimer = Math.max(0, state.reverseVerticalTimer - dt);
  state.darkZoneTransitionFlash = Math.max(0, state.darkZoneTransitionFlash - dt);

  const darkZoneInside = Boolean(state.darkZone && isPlayerInDarkZone(state.darkZone));
  if (darkZoneInside !== state.darkZoneInside) {
    state.darkZoneInside = darkZoneInside;
    state.darkZoneTransitionFlash = 0.18;
    addBurst({
      kind: "ring",
      x: state.player.x,
      y: state.player.y,
      radius: darkZoneInside ? 58 : 46,
      life: 0.16,
      maxLife: 0.16,
      color: "rgba(255,255,255,0.95)",
    });
  }

  if (state.reverseWarningTimer > 0) {
    state.reverseWarningTimer = Math.max(0, state.reverseWarningTimer - dt);
    if (state.reverseWarningTimer <= 0 && state.reversePendingDuration > 0) {
      if (state.reverseWarningAxis === "horizontal") {
        state.reverseHorizontalTimer = Math.max(state.reverseHorizontalTimer, state.reversePendingDuration);
      } else if (state.reverseWarningAxis === "vertical") {
        state.reverseVerticalTimer = Math.max(state.reverseVerticalTimer, state.reversePendingDuration);
      }
      state.reverseWarningAxis = null;
      state.reversePendingDuration = 0;
    }
  }

  for (let i = state.blinkBanZones.length - 1; i >= 0; i -= 1) {
    const zone = state.blinkBanZones[i];
    if (zone.warningTimer > 0) {
      zone.warningTimer = Math.max(0, zone.warningTimer - dt);
      continue;
    }
    zone.timer -= dt;
    if (zone.timer <= 0) {
      state.blinkBanZones.splice(i, 1);
    }
  }
}

function recordDamageDealt(kind, amount) {
  if (!kind || amount <= 0) return;
  state.damageStats[kind] = (state.damageStats[kind] ?? 0) + amount;
}

function getWaveEnemyCap() {
  const base = MAX_WAVE_ENEMIES_BY_STAGE[state.stageIndex] ?? MAX_WAVE_ENEMIES_BY_STAGE[MAX_WAVE_ENEMIES_BY_STAGE.length - 1];
  return Math.max(8, Math.round(base));
}

function getNormalSpawnEnemyCap() {
  const base = MAX_NORMAL_SPAWN_ENEMIES_BY_STAGE[state.stageIndex]
    ?? MAX_NORMAL_SPAWN_ENEMIES_BY_STAGE[MAX_NORMAL_SPAWN_ENEMIES_BY_STAGE.length - 1];
  return Math.max(6, Math.round(base));
}

function countNormalSpawnEnemies() {
  return state.normalSpawnEnemyCount;
}


function updateStage(dt) {
  if (state.practiceMode) {
    updatePracticeMode(dt);
    return;
  }

  const stage = currentStage();
  const spawnRateMultiplier = typeof getDevSpawnRateMultiplier === "function" ? getDevSpawnRateMultiplier() : 1;
  state.stageIntroTimer = Math.max(0, state.stageIntroTimer - dt);

  if (state.stageState === "wave") {
    if (state.stageKills >= stage.targetKills) {
      prepareBossDoor();
      return;
    }

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      if (state.enemies.length < getWaveEnemyCap() && countNormalSpawnEnemies() < getNormalSpawnEnemyCap()) {
        spawnEnemy();
      }
      const minSpawnInterval = Math.max(0.07, 0.16 - state.stageIndex * 0.018);
      state.spawnTimer = Math.max(minSpawnInterval, (0.9 - state.stageIndex * 0.06) / (stage.spawnRate * Math.max(0.01, spawnRateMultiplier)));
    }
    return;
  }

  if (state.stageState === "door") {
    updateBossDoor(dt);
    return;
  }

  if (state.stageState === "boss" && state.bossDefeated && state.enemies.length === 0) {
    if (state.pickups.some((pickup) => pickup.kind === "chest")) {
      return;
    }
    if (state.stageIndex >= 3 && !state.claimedBossRewards[state.stageIndex]) {
      openBossRewardChoice();
      return;
    }
    if (state.stageIndex >= getCurrentAdventureLastStageIndex()) {
      endGame(true);
      return;
    }
    state.stageIndex += 1;
    state.stageKills = 0;
    state.stageState = "wave";
    state.stageIntroTimer = 2;
    state.bossSpawned = false;
    state.bossDefeated = false;
    state.bossDoor = null;
    state.spawnTimer = 0.5;
    replaceEnemies([]);
    state.enemyProjectiles = [];
    state.playerProjectiles = [];
    state.bursts = [];
    state.burstAddsThisFrame = 0;
    state.chainExplosionQueue = [];
    state.safeZones = [];
    state.sanctuaryAttack = null;
    state.smokeFans = [];
    state.arena = null;
  }
}

function update(dt) {
  updateHiddenRainbowAnnouncement(dt);
  if (!state.running || state.paused) return;

  state.time += dt;
  state.debugFps = state.debugFps * 0.85 + (1 / Math.max(0.001, dt)) * 0.15;
  state.flash = Math.max(0, state.flash - dt * 3.4);
  state.burstAddsThisFrame = 0;
  const simulationMode = typeof getDevSimulationMode === "function" ? getDevSimulationMode() : "normal";

  if (simulationMode !== "projectilesOnly") {
    updatePlayer(dt);
  }
  updateMouseWorld();
  if (simulationMode !== "projectilesOnly") {
    updateStage(dt);
  }
  if (!state.running) return;
  updateStatusEffects(dt);
  updateProjectiles(dt);
  updateChainExplosions();
  updateEnemies(dt);
  updateSmokeFans(dt);
  updateBossSanctuary(dt);
  updatePickups(dt);
  updateSafeZones(dt);
  updateBursts(dt);
  updateHud();
  updateGameReturnButton();
}

state.hiddenRainbowUnlocked = loadHiddenRainbowUnlock();
state.practiceSkillUnlocks = loadPracticeSkillUnlocks();
state.difficultyUnlocks = loadDifficultyUnlocks();


