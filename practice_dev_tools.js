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

function getStoredDevSettings() {
  return state["devSettings"];
}

function setStoredDevSettings(settings) {
  state["devSettings"] = settings;
}

function ensureDevSettings() {
  const settings = normalizeDevSettings(getStoredDevSettings());
  setStoredDevSettings(settings);
  return settings;
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

function setDevStageTargetIndex(value) {
  ensureDevSettings().stageTargetIndex = clamp(Math.round(Number(value) || 0), 0, getCurrentAdventureLastStageIndex());
  saveDevSettings();
  updatePracticePanel();
}

function clearDevCombatState() {
  clearCombatCollections();
  resetEncounterRuntimeState();
  resetStatusEffectsState();
}

function startDevWaveStage(stageIndex) {
  const { practice, run, stage, combat } = state;
  if (!run.running) return;
  practice.practiceReturnToHub = practice.practiceMode || practice.practiceReturnToHub;
  practice.practiceMode = false;
  stage.stageIndex = clamp(stageIndex, 0, getCurrentAdventureLastStageIndex());
  ensureDevSettings().stageTargetIndex = stage.stageIndex;
  stage.stageKills = 0;
  stage.stageState = "wave";
  stage.stageIntroTimer = 0.8;
  run.spawnTimer = 0.08;
  clearDevCombatState();
  spawnBossDoor();
  combat.bossDoor.pulse = Math.PI * 0.35;
  saveDevSettings();
  updateHud();
  updatePracticePanel();
}

function startDevBossStage(stageIndex) {
  const { practice, run, stage } = state;
  if (!run.running) return;
  if (practice.practiceMode && stage.stageState === "practiceHub") {
    startPracticeBoss(stageIndex);
    return;
  }
  practice.practiceReturnToHub = practice.practiceMode || practice.practiceReturnToHub;
  practice.practiceMode = false;
  stage.stageIndex = clamp(stageIndex, 0, getCurrentAdventureLastStageIndex());
  ensureDevSettings().stageTargetIndex = stage.stageIndex;
  clearDevCombatState();
  spawnBoss();
  saveDevSettings();
  updateHud();
  updatePracticePanel();
}

function advanceDevStage() {
  const { stage } = state;
  const nextStage = Math.min(getCurrentAdventureLastStageIndex(), stage.stageIndex + 1);
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
  const { run, stage } = state;
  if (path[0] === "enableLevelChoices" && value && stage.pendingLevelUps > 0 && !run.paused && upgradeOverlay.classList.contains("hidden")) {
    openQueuedLevelUpgrade();
  }
  updatePracticePanel();
}

function saveCurrentDevSettings() {
  saveDevSettings();
}

function loadCurrentDevSettings() {
  setStoredDevSettings(loadDevSettings());
  updatePracticePanel();
}

function resetCurrentDevSettings() {
  setStoredDevSettings(createDefaultDevSettings());
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
  const { practice, stage } = state;
  const inPracticeHub = practice.practiceMode && stage.stageState === "practiceHub";

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
    "HPを50%へ",
    "実行",
    () => jumpBossState("half"),
    { rowClass: "is-status", disabled: !getCurrentBoss() },
  ));
  devBossTestList.appendChild(createPracticeActionRow(
    "発狂化",
    "実行",
    () => jumpBossState("enrage"),
    { rowClass: "is-status", disabled: !getCurrentBoss() },
  ));
  devBossTestList.appendChild(createPracticeActionRow(
    "ギミック発動",
    "実行",
    () => jumpBossState("gimmick"),
    { rowClass: "is-status", disabled: !getCurrentBoss() },
  ));
}

function renderDevRuntimeList() {
  const { combat, run, stage } = state;
  if (!devRuntimeList || !combat.player) return;
  devRuntimeList.innerHTML = "";
  const player = combat.player;

  devRuntimeList.appendChild(createPracticeLevelRow(
    "現在HP",
    `${Math.round(player.hp)}/${Math.round(player.maxHp)}`,
    () => setRuntimeHp(player.hp + 20),
    () => setRuntimeHp(player.hp - 20),
    { rowClass: "is-status", onValueClick: () => setRuntimeHp(player.maxHp), resetTitle: "クリックで全快" },
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
    String(stage.stageKills),
    () => setRuntimeStageKills(stage.stageKills + 10),
    () => setRuntimeStageKills(stage.stageKills - 10),
    { rowClass: "is-status", onValueClick: () => setRuntimeStageKills(0), resetTitle: "クリックで0" },
  ));
  devRuntimeList.appendChild(createPracticeActionRow(
    "負荷確認",
    `FPS ${Math.round(run.debugFps)} / 敵 ${combat.enemies.length} / 敵弾 ${combat.enemyProjectiles.length} / FX ${combat.bursts.length}`,
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
