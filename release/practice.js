const PRACTICE_BOSS_HP_MULTIPLIERS = {
  low: 0.55,
  normal: 1,
  high: 1.8,
  extreme: 3,
};
const PRACTICE_DIFFICULTIES = ["easy", "normal", "hard", "gamer"];
const PRACTICE_STATUS_OPTIONS = [
  { key: "darkZone", label: "視界封印" },
  { key: "reverseHorizontal", label: "左右反転" },
  { key: "reverseVertical", label: "上下反転" },
  { key: "blinkBan", label: "ブリンク禁止" },
];
const PRACTICE_SPECIAL_GROUPS = [
  { tone: "rare", label: "レアスキル" },
  { tone: "evolution", label: "進化スキル" },
  { tone: "red", label: "赤スキル" },
  { tone: "rainbow", label: "虹秘技" },
];
const PRACTICE_SPECIAL_PREREQS = {
  demonGunMod: [{ key: "gunMod", level: 5 }],
  hitStop: [{ key: "demonGunMod", level: 1 }],
  laserBeam: [{ key: "demonGunMod", level: 1 }],
  gunShape: [{ key: "demonGunMod", level: 1 }],
  skillPower: [{ key: "skillUnlock", level: 1 }],
  explosionChain: [{ key: "skillPower", level: 7 }],
  slashPower: [{ key: "slashUnlock", level: 1 }],
  waveSlash: [{ key: "slashPower", level: 7 }],
  blinkRange: [{ key: "blink", level: 1 }],
  lightningMark: [{ key: "lightning", level: 5 }],
  thunderZone: [{ key: "lightningMark", level: 5 }],
  naturalForce: [{ key: "recoveryArmor", level: 5 }],
};
const BOSS_UNLOCK_STORAGE_KEY = getBuildStorageKey("towerSurvivalUnlockedBosses");
const DEV_SETTINGS_STORAGE_KEY = getBuildStorageKey("towerSurvivalDevSettings");
const DEV_SPAWN_RATE_OPTIONS = [0, 0.25, 0.5, 1, 2];
const DEV_SIMULATION_MODES = ["normal", "freezeEnemies", "projectilesOnly", "bossOnly"];

function createDefaultDevSettings() {
  return {
    unlockAllPracticeStages: isDevBuild(),
    enableLevelChoices: true,
    enableChestChoices: true,
    chestDropMode: "normal",
    healDropsEnabled: true,
    xpDropsEnabled: true,
    spawnRateMultiplier: 1,
    simulationMode: "normal",
    stageTargetIndex: 0,
    enemyToggles: {
      blueSlash: true,
      purpleCaster: true,
      charger: true,
      chestElite: true,
      smokeShade: true,
      bossShooter: true,
      large: true,
    },
    bossPatternToggles: {
      charge: true,
      slash: true,
      volley: true,
      sanctuary: true,
      status: true,
      knife: true,
      katana: true,
    },
    bossStatusModeToggles: {
      darkZone: true,
      blinkBan: true,
      reverseHorizontal: true,
      reverseVertical: true,
    },
    bossHazardToggles: {
      circle: true,
      rect: true,
    },
    bossSummonsEnabled: true,
  };
}

function normalizeDevSettings(raw) {
  const base = createDefaultDevSettings();
  if (!raw || typeof raw !== "object") return base;

  const settings = {
    ...base,
    ...raw,
    enemyToggles: {
      ...base.enemyToggles,
      ...(raw.enemyToggles ?? {}),
    },
    bossPatternToggles: {
      ...base.bossPatternToggles,
      ...(raw.bossPatternToggles ?? {}),
    },
    bossStatusModeToggles: {
      ...base.bossStatusModeToggles,
      ...(raw.bossStatusModeToggles ?? {}),
    },
    bossHazardToggles: {
      ...base.bossHazardToggles,
      ...(raw.bossHazardToggles ?? {}),
    },
  };

  settings.stageTargetIndex = clamp(
    Math.round(settings.stageTargetIndex ?? 0),
    0,
    getCurrentAdventureLastStageIndex(),
  );
  if (!DEV_SPAWN_RATE_OPTIONS.includes(settings.spawnRateMultiplier)) {
    settings.spawnRateMultiplier = 1;
  }
  if (!DEV_SIMULATION_MODES.includes(settings.simulationMode)) {
    settings.simulationMode = "normal";
  }
  return settings;
}

function ensureDevSettings() {
  state.devSettings = normalizeDevSettings(state.devSettings);
  return state.devSettings;
}

function loadDevSettings() {
  try {
    const raw = localStorage.getItem(DEV_SETTINGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return normalizeDevSettings(parsed);
  } catch {
    return createDefaultDevSettings();
  }
}

function saveDevSettings() {
  try {
    localStorage.setItem(DEV_SETTINGS_STORAGE_KEY, JSON.stringify(ensureDevSettings()));
  } catch {
    // Local-file play can block storage; current-session settings still work.
  }
}

function isDevUnlockAllPracticeStages() {
  return ensureDevSettings().unlockAllPracticeStages !== false;
}

function areDevLevelChoicesEnabled() {
  return ensureDevSettings().enableLevelChoices !== false;
}

function areDevChestChoicesEnabled() {
  return ensureDevSettings().enableChestChoices !== false;
}

function getDevChestDropMode() {
  return ensureDevSettings().chestDropMode ?? "normal";
}

function areDevHealDropsEnabled() {
  return ensureDevSettings().healDropsEnabled !== false;
}

function areDevXpDropsEnabled() {
  return ensureDevSettings().xpDropsEnabled !== false;
}

function getDevSpawnRateMultiplier() {
  return ensureDevSettings().spawnRateMultiplier ?? 1;
}

function getDevSimulationMode() {
  return ensureDevSettings().simulationMode ?? "normal";
}

function isDevEnemyVariantEnabled(key) {
  return ensureDevSettings().enemyToggles?.[key] !== false;
}

function isDevBossPatternEnabled(key) {
  return ensureDevSettings().bossPatternToggles?.[key] !== false;
}

function isDevBossStatusModeEnabled(key) {
  return ensureDevSettings().bossStatusModeToggles?.[key] !== false;
}

function isDevBossHazardEnabled(key) {
  return ensureDevSettings().bossHazardToggles?.[key] !== false;
}

function areDevBossSummonsEnabled() {
  return ensureDevSettings().bossSummonsEnabled !== false;
}

function getPracticeBossHpMultiplier() {
  return PRACTICE_BOSS_HP_MULTIPLIERS[state.practiceBossHpMode] ?? 1;
}

function loadUnlockedBossStages() {
  const maxStageCount = getCurrentAdventureStageCount();
  if (isDevUnlockAllPracticeStages()) {
    return Array.from({ length: maxStageCount }, (_, index) => index);
  }
  try {
    const raw = localStorage.getItem(BOSS_UNLOCK_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const valid = Array.isArray(parsed)
      ? parsed.filter((stage) => Number.isInteger(stage) && stage >= 0 && stage < maxStageCount)
      : [];
    if (!valid.length) return [];
    const highestUnlocked = Math.max(...valid);
    const normalized = Array.from({ length: highestUnlocked + 1 }, (_, index) => index)
      .filter((stage) => stage >= 0 && stage < maxStageCount);
    return Array.from(new Set([...normalized, ...valid])).sort((a, b) => a - b);
  } catch {
    return [];
  }
}

function unlockBossStage(stageIndex) {
  const unlocked = loadUnlockedBossStages();
  if (!unlocked.includes(stageIndex)) {
    unlocked.push(stageIndex);
  }

  try {
    localStorage.setItem(BOSS_UNLOCK_STORAGE_KEY, JSON.stringify(unlocked.sort((a, b) => a - b)));
  } catch {
    // Local-file play can block storage; current-session unlock still works.
  }
  renderPracticeMenuStatus();
}

function resetPracticeSelections() {
  state.practiceNormalLevels = {};
  state.practiceSpecialLevels = {};
  state.practiceBaseAttackBonus = 0;
  state.practiceFirepowerLevel = 0;
  state.practiceHealthLevel = 0;
  normalizePracticeSpecialSelections();
  rebuildPracticePlayer();
  updatePracticePanel();
}

function isPracticeOneTimeUpgrade(upgrade) {
  return upgrade.showLevel === false || getUpgradeMaxLevel(upgrade) <= 1;
}

function getPracticeSpecialMaxLevel(upgrade) {
  return isPracticeOneTimeUpgrade(upgrade) ? 1 : Math.max(1, getUpgradeMaxLevel(upgrade));
}

function getPracticeUpgradeByKey(key) {
  return UPGRADE_DEFS.find((upgrade) => upgrade.key === key) ?? null;
}

function copyLastRunToPractice() {
  const snapshot = state.lastRunSnapshot;
  if (!snapshot) return;

  state.practiceFirepowerLevel = 0;
  state.practiceHealthLevel = 0;

  if (typeof getPracticeNormalUpgrades === "function") {
    for (const upgrade of getPracticeNormalUpgrades()) {
      state.practiceNormalLevels[upgrade.key] = snapshot.normalLevels[upgrade.key] ?? 0;
    }
  }

  if (typeof getPracticeSpecialUpgrades === "function") {
    for (const upgrade of getPracticeSpecialUpgrades()) {
      const maxLevel = getPracticeSpecialMaxLevel(upgrade);
      const copiedLevel = clamp(snapshot.normalLevels[upgrade.key] ?? 0, 0, maxLevel);
      if (upgrade.key === "firepowerBreakthrough") {
        state.practiceFirepowerLevel = copiedLevel;
      } else if (upgrade.key === "healthMonster") {
        state.practiceHealthLevel = copiedLevel;
      } else {
        state.practiceSpecialLevels[upgrade.key] = copiedLevel;
      }
    }
  }
  state.practiceBaseHp = snapshot.baseHp;
  state.practiceBaseAttackBonus = snapshot.baseAttackBonus ?? 0;
  state.practiceFirepowerLevel = snapshot.firepowerLevel ?? 0;
  state.practiceHealthLevel = snapshot.healthLevel ?? 0;
  if (state.practiceHealthLevel > 0) {
    state.practiceFirepowerLevel = 0;
  }
  normalizePracticeSpecialSelections();
  rebuildPracticePlayer();
  updatePracticePanel();
}

function createPracticeDoors() {
  const unlocked = loadUnlockedBossStages();
  const radius = 210;
  return unlocked.map((stageIndex, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, unlocked.length);
    return {
      stageIndex,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      drawRadius: 32,
      hitRadius: 28,
      pulse: Math.random() * Math.PI * 2,
    };
  });
}

function updatePracticePanel() {
  if (!practicePanel) return;
  const active = state.running && !state.gameOver;
  const allowPanel = active && (isDevBuild() || state.practiceMode);
  if (!allowPanel) {
    state.practicePanelOpen = false;
  }
  practicePanel.classList.toggle("hidden", !(allowPanel && state.practicePanelOpen));
  practicePanel.classList.toggle("is-open", allowPanel && state.practicePanelOpen);
  if (practicePanelTitle) {
    practicePanelTitle.textContent = isDevBuild() ? "開発設定" : "練習設定";
  }
  if (practicePanelLead) {
    practicePanelLead.textContent = isDevBuild()
      ? "通常プレイとボス練習の両方で、スキル・進行・敵挙動を調整できます"
      : "ボス練習で、難易度・基礎能力・スキル構成を調整できます";
  }
  practiceDevSection?.classList.toggle("hidden", !isDevBuild());
  if (practicePanelToggle) {
    practicePanelToggle.classList.toggle("hidden", !allowPanel);
    practicePanelToggle.classList.toggle("is-open", allowPanel && state.practicePanelOpen);
    practicePanelToggle.textContent = state.practicePanelOpen ? "閉じる" : "スキル操作";
  }
  if (!active) return;

  if (practiceBossHpSelect) {
    practiceBossHpSelect.value = state.practiceBossHpMode;
  }
  updatePracticeDifficultySelect();
  if (practiceHpValue) practiceHpValue.textContent = String(state.practiceBaseHp);
  if (practiceBaseAttackValue) practiceBaseAttackValue.textContent = `+${state.practiceBaseAttackBonus}`;

  renderPracticeStageList();
  if (isDevBuild()) {
    renderPracticeStatusList();
    renderDevStageControls();
    renderDevToggleList();
    renderDevEnemyToggleList();
    renderDevSpawnOneList();
    renderDevBossTestList();
    renderDevRuntimeList();
    renderDevPresetList();
  }
  renderPracticeSkillList();
  renderPracticeSpecialGroups();
}

function renderPracticeStageList() {
  if (!practiceStageList) return;
  const unlockedSet = new Set(loadUnlockedBossStages());
  practiceStageList.innerHTML = "";

  for (let stageIndex = 0; stageIndex < getCurrentAdventureStageCount(); stageIndex += 1) {
    const isUnlocked = unlockedSet.has(stageIndex);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "practice-stage-button";
    button.classList.toggle("is-locked", !isUnlocked);
    button.disabled = !isUnlocked;
    button.textContent = isUnlocked ? `${stageIndex + 1}階層` : `${stageIndex + 1}階層 未解放`;
    if (isUnlocked) {
      button.addEventListener("click", () => startPracticeBoss(stageIndex));
    }
    practiceStageList.appendChild(button);
  }
}

function updatePracticeDifficultySelect() {
  if (!practiceDifficultySelect) return;
  if (!isDifficultyUnlocked(state.practiceDifficultyKey)) {
    state.practiceDifficultyKey = isDifficultyUnlocked("normal") ? "normal" : "easy";
  }

  for (const option of Array.from(practiceDifficultySelect.options)) {
    const key = option.value;
    const unlocked = PRACTICE_DIFFICULTIES.includes(key) ? isDifficultyUnlocked(key) : true;
    const baseLabel = option.dataset.baseLabel || option.textContent.replace("（未解放）", "");
    option.dataset.baseLabel = baseLabel;
    option.disabled = !unlocked;
    option.textContent = unlocked ? baseLabel : `${baseLabel}（未解放）`;
  }

  practiceDifficultySelect.value = state.practiceDifficultyKey;
}

function createPracticeStepper(onIncrease, onDecrease, disabled = false) {
  const stepper = document.createElement("div");
  stepper.className = "practice-stepper";

  const plus = document.createElement("button");
  plus.type = "button";
  plus.textContent = "+";
  plus.disabled = disabled;
  if (!disabled) {
    plus.addEventListener("click", onIncrease);
  }

  const minus = document.createElement("button");
  minus.type = "button";
  minus.textContent = "-";
  minus.disabled = disabled;
  if (!disabled) {
    minus.addEventListener("click", onDecrease);
  }

  stepper.append(plus, minus);
  return stepper;
}

function createPracticeLevelRow(label, valueText, onIncrease, onDecrease, options = {}) {
  const row = document.createElement("div");
  row.className = `practice-skill-row ${options.rowClass ?? ""}`.trim();

  const name = document.createElement("span");
  name.textContent = label;

  const value = document.createElement("button");
  value.type = "button";
  value.className = "practice-level-value";
  value.textContent = options.disabled ? (options.disabledLabel ?? "未解放") : valueText;
  value.title = options.resetTitle ?? "クリックで初期値に戻す";
  value.disabled = Boolean(options.disabled);
  if (!options.disabled && options.onValueClick) {
    value.addEventListener("click", options.onValueClick);
  } else if (!options.disabled) {
    value.disabled = true;
  }

  row.append(name, value, createPracticeStepper(onIncrease, onDecrease, Boolean(options.disabled)));
  return row;
}

function createPracticeToggleRow(label, active, onToggle, options = {}) {
  const row = document.createElement("div");
  row.className = `practice-skill-row is-action ${options.rowClass ?? ""}`.trim();

  const name = document.createElement("span");
  name.textContent = label;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "practice-toggle-button";
  toggle.disabled = Boolean(options.disabled);
  if (!options.disabled) {
    toggle.addEventListener("click", onToggle);
  }
  toggle.classList.toggle("is-active", active && !options.disabled);
  toggle.textContent = options.disabled ? (options.disabledLabel ?? "未解放") : (active ? "ON" : "OFF");

  row.append(name, toggle);
  return row;
}

function createPracticeActionRow(label, buttonText, onClick, options = {}) {
  const row = document.createElement("div");
  row.className = `practice-skill-row is-action ${options.rowClass ?? ""}`.trim();

  const name = document.createElement("span");
  name.textContent = label;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "practice-toggle-button";
  button.disabled = Boolean(options.disabled);
  button.textContent = buttonText;
  if (!options.disabled) {
    button.addEventListener("click", onClick);
  }

  row.append(name, button);
  return row;
}

function createPracticeSelectControl(labelText, value, options, onChange) {
  const label = document.createElement("label");
  label.className = "practice-select";
  label.textContent = labelText;

  const select = document.createElement("select");
  for (const optionData of options) {
    const option = document.createElement("option");
    option.value = String(optionData.value);
    option.textContent = optionData.label;
    option.disabled = Boolean(optionData.disabled);
    select.appendChild(option);
  }
  select.value = String(value);
  select.addEventListener("change", () => onChange(select.value));
  label.appendChild(select);
  return label;
}

function setDevStageTargetIndex(value) {
  ensureDevSettings().stageTargetIndex = clamp(Math.round(Number(value) || 0), 0, getCurrentAdventureLastStageIndex());
  saveDevSettings();
  updatePracticePanel();
}

function clearDevCombatState() {
  replaceEnemies([]);
  state.enemyProjectiles = [];
  state.playerProjectiles = [];
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
  state.bossSpawned = false;
  state.bossDefeated = false;
  state.darkZone = null;
  state.darkZoneInside = false;
  state.inkTimer = 0;
  state.inkStrength = 1;
  state.reverseHorizontalTimer = 0;
  state.reverseVerticalTimer = 0;
  state.reverseWarningTimer = 0;
  state.reverseWarningAxis = null;
  state.reversePendingDuration = 0;
  state.arena = null;
}

function startDevWaveStage(stageIndex) {
  if (!state.running) return;
  state.practiceMode = false;
  state.stageIndex = clamp(stageIndex, 0, getCurrentAdventureLastStageIndex());
  ensureDevSettings().stageTargetIndex = state.stageIndex;
  state.stageKills = 0;
  state.stageState = "wave";
  state.stageIntroTimer = 0.8;
  state.spawnTimer = 0.08;
  clearDevCombatState();
  saveDevSettings();
  updateHud();
  updatePracticePanel();
}

function startDevBossStage(stageIndex) {
  if (!state.running) return;
  if (state.practiceMode && state.stageState === "practiceHub") {
    startPracticeBoss(stageIndex);
    return;
  }
  state.practiceMode = false;
  state.stageIndex = clamp(stageIndex, 0, getCurrentAdventureLastStageIndex());
  ensureDevSettings().stageTargetIndex = state.stageIndex;
  clearDevCombatState();
  spawnBoss();
  saveDevSettings();
  updateHud();
  updatePracticePanel();
}

function advanceDevStage() {
  const nextStage = Math.min(getCurrentAdventureLastStageIndex(), state.stageIndex + 1);
  startDevWaveStage(nextStage);
}

function cycleDevSetting(key, values) {
  const settings = ensureDevSettings();
  const currentIndex = Math.max(0, values.indexOf(settings[key]));
  settings[key] = values[(currentIndex + 1) % values.length];
  saveDevSettings();
  updatePracticePanel();
}

function setDevToggle(path, value) {
  const settings = ensureDevSettings();
  if (path.length === 1) {
    settings[path[0]] = value;
  } else if (path.length === 2) {
    settings[path[0]][path[1]] = value;
  }
  saveDevSettings();
  if (path[0] === "enableLevelChoices" && value && state.pendingLevelUps > 0 && !state.paused && upgradeOverlay.classList.contains("hidden")) {
    openQueuedLevelUpgrade();
  }
  updatePracticePanel();
}

function getCurrentBoss() {
  return state.enemies.find((enemy) => enemy.type === "boss") ?? null;
}

function jumpBossState(mode) {
  const boss = getCurrentBoss();
  if (!boss) return;
  if (mode === "half") {
    boss.hp = Math.min(boss.hp, boss.maxHp * 0.5);
    return;
  }
  if (mode === "enrage") {
    boss.hp = Math.min(boss.hp, boss.maxHp / 3);
    if (typeof updateBossEnrage === "function") {
      updateBossEnrage(boss);
    }
    return;
  }
  if (mode === "gimmick") {
    if (typeof startBossSanctuary === "function") {
      startBossSanctuary(boss);
    } else if (typeof startBossStatusAttack === "function") {
      startBossStatusAttack(boss);
    }
  }
}

function setRuntimeHp(value) {
  state.player.hp = clamp(Math.round(value), 1, Math.ceil(state.player.maxHp));
  updateHud();
  updatePracticePanel();
}

function setRuntimeShield(value) {
  state.player.recoveryArmor = clamp(Math.round(value), 0, Math.ceil(state.player.recoveryArmorMax ?? 0));
  updateHud();
  updatePracticePanel();
}

function setRuntimeXp(value) {
  state.player.xp = clamp(Math.round(value), 0, Math.ceil(state.player.nextXp - 1));
  updateHud();
  updatePracticePanel();
}

function setRuntimeAmmo(value) {
  state.player.ammo = clamp(Math.round(value), 0, state.player.maxAmmo);
  updateHud();
  updatePracticePanel();
}

function setRuntimeStageKills(value) {
  state.stageKills = clamp(Math.round(value), 0, 9999);
  updateHud();
  updatePracticePanel();
}

function forceReloadNow() {
  startReload();
  updateHud();
  updatePracticePanel();
}

function saveCurrentDevSettings() {
  saveDevSettings();
}

function loadCurrentDevSettings() {
  state.devSettings = loadDevSettings();
  updatePracticePanel();
}

function resetCurrentDevSettings() {
  state.devSettings = createDefaultDevSettings();
  saveDevSettings();
  updatePracticePanel();
}

function applyDevPreset(key) {
  const settings = ensureDevSettings();
  if (key === "floor8Wave") {
    settings.stageTargetIndex = Math.min(getCurrentAdventureLastStageIndex(), 7);
    settings.spawnRateMultiplier = 1;
    settings.simulationMode = "normal";
    settings.enemyToggles.bossShooter = true;
    settings.enemyToggles.smokeShade = true;
    saveDevSettings();
    startDevWaveStage(settings.stageTargetIndex);
    return;
  }

  if (key === "floor8Boss") {
    settings.stageTargetIndex = Math.min(getCurrentAdventureLastStageIndex(), 7);
    settings.bossPatternToggles.katana = true;
    settings.bossPatternToggles.knife = true;
    saveDevSettings();
    startDevBossStage(settings.stageTargetIndex);
    return;
  }

  if (key === "gimmickCheck") {
    settings.stageTargetIndex = Math.min(getCurrentAdventureLastStageIndex(), 4);
    settings.bossPatternToggles.status = true;
    settings.bossStatusModeToggles.darkZone = true;
    settings.bossStatusModeToggles.blinkBan = true;
    saveDevSettings();
    startDevBossStage(settings.stageTargetIndex);
  }
}

function renderDevStageControls() {
  if (!devStageControls) return;
  devStageControls.innerHTML = "";
  const settings = ensureDevSettings();
  const inPracticeHub = state.practiceMode && state.stageState === "practiceHub";

  devStageControls.appendChild(createPracticeSelectControl(
    "対象階層",
    settings.stageTargetIndex,
    Array.from({ length: getCurrentAdventureStageCount() }, (_, index) => ({
      value: index,
      label: `${index + 1}階層`,
    })),
    (value) => setDevStageTargetIndex(Number(value)),
  ));

  const actions = document.createElement("div");
  actions.className = "practice-controls";

  const waveButton = document.createElement("button");
  waveButton.type = "button";
  waveButton.textContent = "Wave開始";
  waveButton.disabled = inPracticeHub;
  waveButton.addEventListener("click", () => startDevWaveStage(settings.stageTargetIndex));

  const bossButton = document.createElement("button");
  bossButton.type = "button";
  bossButton.textContent = "ボス開始";
  bossButton.addEventListener("click", () => startDevBossStage(settings.stageTargetIndex));

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.textContent = "次階層へ";
  nextButton.disabled = inPracticeHub;
  nextButton.addEventListener("click", advanceDevStage);

  actions.append(waveButton, bossButton, nextButton);
  devStageControls.appendChild(actions);
}

function renderDevToggleList() {
  if (!devToggleList) return;
  devToggleList.innerHTML = "";
  const settings = ensureDevSettings();
  const chestModeLabels = {
    normal: "通常",
    always: "常に宝箱",
    off: "宝箱なし",
  };
  const simulationLabels = {
    normal: "通常",
    freezeEnemies: "敵停止",
    projectilesOnly: "弾だけ動く",
    bossOnly: "ボスだけ動く",
  };

  devToggleList.appendChild(createPracticeToggleRow(
    "経験値レベルアップ",
    settings.enableLevelChoices,
    () => setDevToggle(["enableLevelChoices"], !settings.enableLevelChoices),
    { rowClass: "is-status" },
  ));
  devToggleList.appendChild(createPracticeToggleRow(
    "宝箱強化選択",
    settings.enableChestChoices,
    () => setDevToggle(["enableChestChoices"], !settings.enableChestChoices),
    { rowClass: "is-status" },
  ));
  devToggleList.appendChild(createPracticeToggleRow(
    "経験値ドロップ",
    settings.xpDropsEnabled,
    () => setDevToggle(["xpDropsEnabled"], !settings.xpDropsEnabled),
    { rowClass: "is-status" },
  ));
  devToggleList.appendChild(createPracticeToggleRow(
    "回復ドロップ",
    settings.healDropsEnabled,
    () => setDevToggle(["healDropsEnabled"], !settings.healDropsEnabled),
    { rowClass: "is-status" },
  ));
  devToggleList.appendChild(createPracticeActionRow(
    "宝箱ドロップ",
    chestModeLabels[settings.chestDropMode] ?? "通常",
    () => cycleDevSetting("chestDropMode", ["normal", "always", "off"]),
    { rowClass: "is-status" },
  ));
  devToggleList.appendChild(createPracticeActionRow(
    "停止モード",
    simulationLabels[settings.simulationMode] ?? "通常",
    () => cycleDevSetting("simulationMode", DEV_SIMULATION_MODES),
    { rowClass: "is-status" },
  ));
  devToggleList.appendChild(createPracticeToggleRow(
    "ボス練習 全階層解放",
    settings.unlockAllPracticeStages,
    () => setDevToggle(["unlockAllPracticeStages"], !settings.unlockAllPracticeStages),
    { rowClass: "is-status" },
  ));
}

function renderDevEnemyToggleList() {
  if (!devEnemyToggleList) return;
  devEnemyToggleList.innerHTML = "";
  const settings = ensureDevSettings();
  const spawnLabels = {
    0: "0%",
    0.25: "25%",
    0.5: "50%",
    1: "100%",
    2: "200%",
  };

  devEnemyToggleList.appendChild(createPracticeActionRow(
    "敵出現率",
    spawnLabels[settings.spawnRateMultiplier] ?? "100%",
    () => cycleDevSetting("spawnRateMultiplier", DEV_SPAWN_RATE_OPTIONS),
    { rowClass: "is-status" },
  ));

  const enemyRows = [
    ["blueSlash", "青敵"],
    ["purpleCaster", "紫敵"],
    ["charger", "赤敵"],
    ["chestElite", "黄敵"],
    ["smokeShade", "黒敵"],
    ["bossShooter", "射撃敵"],
    ["large", "大型化"],
  ];
  for (const [key, label] of enemyRows) {
    devEnemyToggleList.appendChild(createPracticeToggleRow(
      label,
      settings.enemyToggles[key],
      () => setDevToggle(["enemyToggles", key], !settings.enemyToggles[key]),
      { rowClass: "is-status" },
    ));
  }
}

function renderDevSpawnOneList() {
  if (!devSpawnOneList) return;
  devSpawnOneList.innerHTML = "";
  const buttons = [
    { label: "青敵", variant: "blueSlash" },
    { label: "紫敵", variant: "purpleCaster" },
    { label: "赤敵", variant: "charger" },
    { label: "黄敵", variant: "chestElite" },
    { label: "黒敵", variant: "smokeShade" },
    { label: "射撃敵", variant: "bossShooter" },
    { label: "大黒敵", variant: "smokeShade", large: true },
    { label: "大紫敵", variant: "purpleCaster", large: true },
  ];

  for (const entry of buttons) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = entry.label;
    button.addEventListener("click", () => spawnEnemy({
      forcedVariant: entry.variant,
      forceLarge: Boolean(entry.large),
      nearPlayer: true,
    }));
    devSpawnOneList.appendChild(button);
  }
}

function renderDevBossTestList() {
  if (!devBossTestList) return;
  devBossTestList.innerHTML = "";
  const settings = ensureDevSettings();

  const patternRows = [
    ["charge", "突進"],
    ["slash", "斬撃"],
    ["volley", "反射弾"],
    ["sanctuary", "安全地帯"],
    ["status", "状態異常"],
    ["knife", "ナイフ"],
    ["katana", "刀"],
  ];
  for (const [key, label] of patternRows) {
    devBossTestList.appendChild(createPracticeToggleRow(
      label,
      settings.bossPatternToggles[key],
      () => setDevToggle(["bossPatternToggles", key], !settings.bossPatternToggles[key]),
      { rowClass: "is-status" },
    ));
  }

  const statusRows = [
    ["darkZone", "視界封印"],
    ["blinkBan", "ブリンク禁止"],
    ["reverseHorizontal", "左右反転"],
    ["reverseVertical", "上下反転"],
  ];
  for (const [key, label] of statusRows) {
    devBossTestList.appendChild(createPracticeToggleRow(
      label,
      settings.bossStatusModeToggles[key],
      () => setDevToggle(["bossStatusModeToggles", key], !settings.bossStatusModeToggles[key]),
      { rowClass: "is-status" },
    ));
  }

  devBossTestList.appendChild(createPracticeToggleRow(
    "丸攻撃",
    settings.bossHazardToggles.circle,
    () => setDevToggle(["bossHazardToggles", "circle"], !settings.bossHazardToggles.circle),
    { rowClass: "is-status" },
  ));
  devBossTestList.appendChild(createPracticeToggleRow(
    "縦攻撃",
    settings.bossHazardToggles.rect,
    () => setDevToggle(["bossHazardToggles", "rect"], !settings.bossHazardToggles.rect),
    { rowClass: "is-status" },
  ));
  devBossTestList.appendChild(createPracticeToggleRow(
    "ボス召喚敵",
    settings.bossSummonsEnabled,
    () => setDevToggle(["bossSummonsEnabled"], !settings.bossSummonsEnabled),
    { rowClass: "is-status" },
  ));
  devBossTestList.appendChild(createPracticeActionRow(
    "ボスHP50%",
    "移動",
    () => jumpBossState("half"),
    { rowClass: "is-status", disabled: !getCurrentBoss() },
  ));
  devBossTestList.appendChild(createPracticeActionRow(
    "発狂状態",
    "移動",
    () => jumpBossState("enrage"),
    { rowClass: "is-status", disabled: !getCurrentBoss() },
  ));
  devBossTestList.appendChild(createPracticeActionRow(
    "ギミック中",
    "移動",
    () => jumpBossState("gimmick"),
    { rowClass: "is-status", disabled: !getCurrentBoss() },
  ));
}

function renderDevRuntimeList() {
  if (!devRuntimeList || !state.player) return;
  devRuntimeList.innerHTML = "";
  const player = state.player;

  devRuntimeList.appendChild(createPracticeLevelRow(
    "現在HP",
    `${Math.round(player.hp)}/${Math.round(player.maxHp)}`,
    () => setRuntimeHp(player.hp + 20),
    () => setRuntimeHp(player.hp - 20),
    { rowClass: "is-status", onValueClick: () => setRuntimeHp(player.maxHp), resetTitle: "クリックで全快" },
  ));
  devRuntimeList.appendChild(createPracticeLevelRow(
    "シールド",
    `${Math.round(player.recoveryArmor ?? 0)}/${Math.round(player.recoveryArmorMax ?? 0)}`,
    () => setRuntimeShield((player.recoveryArmor ?? 0) + 20),
    () => setRuntimeShield((player.recoveryArmor ?? 0) - 20),
    { rowClass: "is-status", onValueClick: () => setRuntimeShield(player.recoveryArmorMax ?? 0), resetTitle: "クリックで最大" },
  ));
  devRuntimeList.appendChild(createPracticeLevelRow(
    "現在XP",
    `${Math.round(player.xp)}/${Math.round(player.nextXp)}`,
    () => setRuntimeXp(player.xp + Math.max(10, Math.round(player.nextXp * 0.25))),
    () => setRuntimeXp(player.xp - Math.max(10, Math.round(player.nextXp * 0.25))),
    { rowClass: "is-status", onValueClick: () => setRuntimeXp(0), resetTitle: "クリックで0" },
  ));
  devRuntimeList.appendChild(createPracticeLevelRow(
    "弾数",
    `${player.ammo}/${player.maxAmmo}`,
    () => setRuntimeAmmo(player.ammo + 1),
    () => setRuntimeAmmo(player.ammo - 1),
    { rowClass: "is-status", onValueClick: () => setRuntimeAmmo(player.maxAmmo), resetTitle: "クリックで満タン" },
  ));
  devRuntimeList.appendChild(createPracticeLevelRow(
    "撃破数",
    String(state.stageKills),
    () => setRuntimeStageKills(state.stageKills + 10),
    () => setRuntimeStageKills(state.stageKills - 10),
    { rowClass: "is-status", onValueClick: () => setRuntimeStageKills(0), resetTitle: "クリックで0" },
  ));
  devRuntimeList.appendChild(createPracticeActionRow(
    "リロード",
    state.player.reloading ? "即完了" : "開始",
    () => {
      if (state.player.reloading) {
        state.player.reloadTimer = 0;
        state.player.reloading = false;
        state.player.ammo = state.player.maxAmmo;
      } else {
        forceReloadNow();
      }
      updateHud();
      updatePracticePanel();
    },
    { rowClass: "is-status" },
  ));
  devRuntimeList.appendChild(createPracticeActionRow(
    "負荷確認",
    `FPS ${Math.round(state.debugFps)} / 敵 ${state.enemies.length} / 敵弾 ${state.enemyProjectiles.length} / FX ${state.bursts.length}`,
    () => {},
    { rowClass: "is-status", disabled: true },
  ));
}

function renderDevPresetList() {
  if (!devPresetList) return;
  devPresetList.innerHTML = "";

  const presetButtons = [
    ["8層雑魚確認", "floor8Wave"],
    ["8層ボス確認", "floor8Boss"],
    ["ギミック確認", "gimmickCheck"],
    ["設定保存", "save"],
    ["設定読込", "load"],
    ["初期化", "reset"],
  ];

  for (const [label, key] of presetButtons) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => {
      if (key === "save") {
        saveCurrentDevSettings();
      } else if (key === "load") {
        loadCurrentDevSettings();
      } else if (key === "reset") {
        resetCurrentDevSettings();
      } else {
        applyDevPreset(key);
      }
    });
    devPresetList.appendChild(button);
  }
}

function renderPracticeStatusList() {
  if (!practiceStatusList) return;
  practiceStatusList.innerHTML = "";

  for (const option of PRACTICE_STATUS_OPTIONS) {
    const active = state.practiceStatusToggles[option.key] !== false;
    practiceStatusList.appendChild(createPracticeToggleRow(
      option.label,
      active,
      () => setPracticeStatusToggle(option.key, !active),
      { rowClass: "is-status" },
    ));
  }
}

function renderPracticeSkillList() {
  if (!practiceSkillList || typeof getPracticeNormalUpgrades !== "function") return;
  practiceSkillList.innerHTML = "";

  for (const upgrade of getPracticeNormalUpgrades()) {
    const level = getPracticeSkillLevel(upgrade.key);
    const maxLevel = 15;
    const row = createPracticeLevelRow(
      upgrade.name,
      `Lv ${level}/${maxLevel}`,
      () => setPracticeSkillLevel(upgrade.key, level + 1),
      () => setPracticeSkillLevel(upgrade.key, level - 1),
      {
        rowClass: "is-normal",
        onValueClick: () => setPracticeSkillLevel(upgrade.key, 0),
        resetTitle: "クリックでLv0に戻す",
      },
    );
    practiceSkillList.appendChild(row);
  }
}

function getPracticeSpecialRowClass(upgrade) {
  switch (getUpgradeDisplayTone(upgrade)) {
    case "rainbow":
      return "is-rainbow";
    case "red":
      return "is-red";
    case "evolution":
      return "is-evolution";
    default:
      return "is-rare";
  }
}

function createPracticeGroup(title, upgrades) {
  const section = document.createElement("section");
  section.className = "practice-group";

  const heading = document.createElement("div");
  heading.className = "practice-group-title";
  heading.textContent = title;
  section.appendChild(heading);

  const list = document.createElement("div");
  list.className = "practice-skill-list practice-skill-sublist";
  section.appendChild(list);

  for (const upgrade of upgrades) {
    const unlocked = isPracticeSpecialUnlocked(upgrade);
    if (upgrade.rainbow && !unlocked) continue;

    const level = getPracticeSpecialLevel(upgrade.key);
    const rowClass = `${getPracticeSpecialRowClass(upgrade)}${unlocked ? "" : " is-locked"}`;

    if (!unlocked) {
      if (isPracticeOneTimeUpgrade(upgrade)) {
        list.appendChild(createPracticeToggleRow(
          upgrade.name,
          false,
          () => {},
          { rowClass, disabled: true, disabledLabel: "未解放" },
        ));
      } else {
        list.appendChild(createPracticeLevelRow(
          upgrade.name,
          `Lv 0/${getPracticeSpecialMaxLevel(upgrade)}`,
          () => {},
          () => {},
          {
            rowClass,
            disabled: true,
            disabledLabel: "未解放",
          },
        ));
      }
      continue;
    }

    if (isPracticeOneTimeUpgrade(upgrade)) {
      list.appendChild(createPracticeToggleRow(
        upgrade.name,
        level > 0,
        () => setPracticeSpecialLevel(upgrade.key, level > 0 ? 0 : 1),
        { rowClass },
      ));
      continue;
    }

    const maxLevel = getPracticeSpecialMaxLevel(upgrade);
    list.appendChild(createPracticeLevelRow(
      upgrade.name,
      `Lv ${level}/${maxLevel}`,
      () => setPracticeSpecialLevel(upgrade.key, level + 1),
      () => setPracticeSpecialLevel(upgrade.key, level - 1),
      {
        rowClass,
        onValueClick: () => setPracticeSpecialLevel(upgrade.key, 0),
        resetTitle: "クリックでLv0に戻す",
      },
    ));
  }

  return section;
}

function renderPracticeSpecialGroups() {
  if (!practiceRareList || typeof getPracticeSpecialUpgrades !== "function") return;
  practiceRareList.innerHTML = "";

  const upgrades = getPracticeSpecialUpgrades();
  for (const group of PRACTICE_SPECIAL_GROUPS) {
    const grouped = upgrades.filter((upgrade) => getUpgradeDisplayTone(upgrade) === group.tone);
    if (!grouped.length) continue;
    if (group.tone === "rainbow" && !grouped.some((upgrade) => isPracticeSpecialUnlocked(upgrade))) continue;
    practiceRareList.appendChild(createPracticeGroup(group.label, grouped));
  }
}

function getPracticeSkillLevel(key) {
  return state.practiceNormalLevels[key] ?? 0;
}

function getPracticeSpecialLevel(key) {
  if (key === "firepowerBreakthrough") return state.practiceFirepowerLevel ?? 0;
  if (key === "healthMonster") return state.practiceHealthLevel ?? 0;
  return state.practiceSpecialLevels[key] ?? 0;
}

function rebuildPracticePlayer() {
  if (!state.practiceMode || state.stageState !== "practiceHub") return;
  normalizePracticeSpecialSelections();
  const oldPlayer = state.player;
  state.player = createPlayer();
  state.player.x = oldPlayer?.x ?? 0;
  state.player.y = oldPlayer?.y ?? 0;
  applyPracticeBuild(state.player);
  updateMouseWorld();
  updateHud();
}

function setPracticeSkillLevel(key, level) {
  state.practiceNormalLevels[key] = clamp(Math.round(level), 0, 15);
  rebuildPracticePlayer();
  updatePracticePanel();
}

function storePracticeSpecialLevel(key, level) {
  if (key === "firepowerBreakthrough") {
    state.practiceFirepowerLevel = level;
    if (level > 0) {
      state.practiceHealthLevel = 0;
    }
    return;
  }
  if (key === "healthMonster") {
    state.practiceHealthLevel = level;
    if (level > 0) {
      state.practiceFirepowerLevel = 0;
    }
    return;
  }
  if (key === "theWorld" && level > 0) {
    state.practiceSpecialLevels.criticalLance = 0;
  }
  if (key === "criticalLance" && level > 0) {
    state.practiceSpecialLevels.theWorld = 0;
  }
  state.practiceSpecialLevels[key] = level;
}

function ensurePracticeSpecialPrerequisites(key, visited = new Set()) {
  if (visited.has(key)) return;
  visited.add(key);
  const prereqs = PRACTICE_SPECIAL_PREREQS[key] ?? [];
  for (const prereq of prereqs) {
    const current = getPracticeSpecialLevel(prereq.key);
    if (current < prereq.level) {
      storePracticeSpecialLevel(prereq.key, prereq.level);
    }
    ensurePracticeSpecialPrerequisites(prereq.key, visited);
  }
}

function normalizePracticeSpecialSelections() {
  if (state.practiceFirepowerLevel > 0 && state.practiceHealthLevel > 0) {
    state.practiceHealthLevel = 0;
  }

  if ((state.practiceSpecialLevels.theWorld ?? 0) > 0 && (state.practiceSpecialLevels.criticalLance ?? 0) > 0) {
    state.practiceSpecialLevels.criticalLance = 0;
  }

  for (const upgrade of getPracticeSpecialUpgrades()) {
    if (!isPracticeSpecialUnlocked(upgrade)) {
      storePracticeSpecialLevel(upgrade.key, 0);
      continue;
    }
    if (getPracticeSpecialLevel(upgrade.key) > 0) {
      ensurePracticeSpecialPrerequisites(upgrade.key);
    }
  }
}

function setPracticeStatusToggle(key, enabled) {
  if (!(key in state.practiceStatusToggles)) return;
  state.practiceStatusToggles[key] = Boolean(enabled);
  updatePracticePanel();
}

function setPracticePanelOpen(open) {
  state.practicePanelOpen = Boolean(open);
  if (state.running && !state.gameOver) {
    state.paused = state.practicePanelOpen;
    updateGameReturnButton();
  }
  updatePracticePanel();
}

function togglePracticePanel() {
  setPracticePanelOpen(!state.practicePanelOpen);
}

function setPracticeSpecialLevel(key, level) {
  const upgrade = getPracticeUpgradeByKey(key);
  if (!upgrade) return;

  const next = clamp(Math.round(level), 0, getPracticeSpecialMaxLevel(upgrade));
  storePracticeSpecialLevel(key, next);
  normalizePracticeSpecialSelections();
  rebuildPracticePlayer();
  updatePracticePanel();
}

function setPracticeBossHpMode(mode) {
  if (!PRACTICE_BOSS_HP_MULTIPLIERS[mode]) return;
  state.practiceBossHpMode = mode;
  rebuildPracticePlayer();
  updatePracticePanel();
}

function setPracticeDifficulty(key) {
  if (!PRACTICE_DIFFICULTIES.includes(key) || !isDifficultyUnlocked(key)) return;
  state.practiceDifficultyKey = key;
  rebuildPracticePlayer();
  updatePracticePanel();
}

function setPracticeBaseHp(value) {
  state.practiceBaseHp = clamp(Math.round(value), 60, 500);
  rebuildPracticePlayer();
  updatePracticePanel();
}

function setPracticeBaseAttackBonus(value) {
  state.practiceBaseAttackBonus = clamp(Math.round(value), 0, 160);
  rebuildPracticePlayer();
  updatePracticePanel();
}

function setPracticeFirepowerLevel(value) {
  const level = clamp(Math.round(value), 0, 5);
  state.practiceFirepowerLevel = level;
  if (level > 0) {
    state.practiceHealthLevel = 0;
  }
  rebuildPracticePlayer();
  updatePracticePanel();
}

function setPracticeHealthLevel(value) {
  const level = clamp(Math.round(value), 0, 5);
  state.practiceHealthLevel = level;
  if (level > 0) {
    state.practiceFirepowerLevel = 0;
  }
  rebuildPracticePlayer();
  updatePracticePanel();
}

function startPracticeHub() {
  resetGame();
  state.running = true;
  state.practiceMode = true;
  state.practicePanelOpen = false;
  state.stageState = "practiceHub";
  state.stageIntroTimer = 0;
  state.practiceDoors = createPracticeDoors();
  ensureDevSettings().stageTargetIndex = state.stageIndex;
  applyPracticeBuild(state.player);
  startOverlay.classList.add("hidden");
  endOverlay.classList.add("hidden");
  returnConfirmOverlay.classList.add("hidden");
  updateTitleMode(false);
  updatePracticePanel();
  updateGameReturnButton();
}

function startPracticeBoss(stageIndex) {
  if (!loadUnlockedBossStages().includes(stageIndex)) return;
  state.stageIndex = clamp(stageIndex, 0, getCurrentAdventureLastStageIndex());
  ensureDevSettings().stageTargetIndex = state.stageIndex;
  state.practicePanelOpen = false;
  state.paused = false;
  state.practiceDoors = [];
  spawnBoss();
  updatePracticePanel();
}

function restartPracticeBoss(stageIndex = state.stageIndex) {
  const targetStageIndex = clamp(stageIndex, 0, getCurrentAdventureLastStageIndex());
  if (!loadUnlockedBossStages().includes(targetStageIndex)) return;

  resetGame();
  state.running = true;
  state.practiceMode = true;
  state.practicePanelOpen = false;
  state.paused = false;
  state.stageIndex = targetStageIndex;
  ensureDevSettings().stageTargetIndex = targetStageIndex;
  applyPracticeBuild(state.player);
  state.practiceDoors = [];
  startOverlay.classList.add("hidden");
  endOverlay.classList.add("hidden");
  returnConfirmOverlay.classList.add("hidden");
  updateTitleMode(false);
  spawnBoss();
  updatePracticePanel();
  updateGameReturnButton();
}

function updatePracticeHub(dt) {
  for (const door of state.practiceDoors) {
    door.pulse += dt * 3.5;
    if (distance(state.player, door) <= state.player.hitRadius + door.hitRadius) {
      startPracticeBoss(door.stageIndex);
      return;
    }
  }
}

function finishPracticeBoss() {
  startPracticeHub();
}

function updatePracticeMode(dt) {
  if (state.stageState === "practiceHub") {
    updatePracticeHub(dt);
    return;
  }

  if (state.stageState === "boss" && state.bossDefeated && state.enemies.length === 0) {
    finishPracticeBoss();
  }
}

state.devSettings = loadDevSettings();


