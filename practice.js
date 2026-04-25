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
const PRACTICE_PANEL_SECTION_META = Object.freeze({
  stage: {
    title: "ステージ設定",
    devLead: "難易度、階層、進行系の確認と切り替えを行います",
    playLead: "難易度や練習階層をここで選びます",
    devOnly: false,
  },
  enemy: {
    title: "敵設定",
    devLead: "敵出現率や単体スポーンをここで調整します",
    playLead: "",
    devOnly: true,
  },
  boss: {
    title: "ボス設定",
    devLead: "ボスHP、妨害、攻撃テストをここで扱います",
    playLead: "ボスHPの調整をここで行います",
    devOnly: false,
  },
  player: {
    title: "プレイヤー調整",
    devLead: "能力、スキル、現在値をここで調整します",
    playLead: "能力とスキル構成をここで調整します",
    devOnly: false,
  },
});


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

function getAvailablePracticePanelSections() {
  return isDevBuild()
    ? ["stage", "enemy", "boss", "player"]
    : ["stage", "boss", "player"];
}

function resolvePracticePanelSection(sectionKey) {
  return getAvailablePracticePanelSections().includes(sectionKey) ? sectionKey : null;
}

function updatePracticePanel() {
  if (!practicePanel) return;
  const { practice, run } = state;
  const active = run.running && !run.gameOver;
  const allowPanel = active && (isDevBuild() || practice.practiceMode);
  const defaultSection = getAvailablePracticePanelSections()[0] ?? null;
  if (!allowPanel) {
    practice.practicePanelOpen = false;
    practice.practicePanelSection = null;
  } else if (practice.practicePanelOpen) {
    practice.practicePanelSection = resolvePracticePanelSection(practice.practicePanelSection) ?? defaultSection;
  }
  const activeSection = allowPanel && practice.practicePanelOpen ? practice.practicePanelSection : null;
  const activeMeta = activeSection ? PRACTICE_PANEL_SECTION_META[activeSection] : null;
  practicePanel.classList.toggle("hidden", !activeSection);
  practicePanel.classList.toggle("is-open", Boolean(activeSection));
  if (practicePanelTitle) {
    practicePanelTitle.textContent = activeMeta?.title ?? (isDevBuild() ? "開発設定" : "練習設定");
  }
  if (practicePanelLead) {
    practicePanelLead.textContent = activeMeta
      ? (isDevBuild() ? activeMeta.devLead : activeMeta.playLead)
      : (isDevBuild()
        ? "通常プレイとボス練習の両方で、ステージ・敵・ボス・プレイヤーを個別に調整できます"
        : "ボス練習で、ステージ・ボス・プレイヤーを個別に調整できます");
  }
  practiceStageSection?.classList.toggle("hidden", activeSection !== "stage");
  practiceEnemySection?.classList.toggle("hidden", activeSection !== "enemy" || !isDevBuild());
  practiceBossSection?.classList.toggle("hidden", activeSection !== "boss");
  practicePlayerSection?.classList.toggle("hidden", activeSection !== "player");
  practiceDevStageSection?.classList.toggle("hidden", !(isDevBuild() && activeSection === "stage"));
  practiceDevBossSection?.classList.toggle("hidden", !(isDevBuild() && activeSection === "boss"));
  practiceDevPlayerSection?.classList.toggle("hidden", !(isDevBuild() && activeSection === "player"));
  if (practicePanelButtons) {
    practicePanelButtons.classList.toggle("hidden", !allowPanel);
  }
  for (const [key, button] of [
    ["stage", practiceStageButton],
    ["enemy", practiceEnemyButton],
    ["boss", practiceBossButton],
    ["player", practicePlayerButton],
  ]) {
    if (!button) continue;
    const meta = PRACTICE_PANEL_SECTION_META[key];
    const visible = allowPanel && (!meta.devOnly || isDevBuild());
    button.classList.toggle("hidden", !visible);
    button.classList.toggle("is-open", activeSection === key);
  }
  if (!active) return;

  if (practiceBossHpSelect) {
    practiceBossHpSelect.value = practice.practiceBossHpMode;
  }
  updatePracticeDifficultySelect();
  if (practiceHpValue) practiceHpValue.textContent = String(practice.practiceBaseHp);
  if (practiceBaseAttackValue) practiceBaseAttackValue.textContent = `+${practice.practiceBaseAttackBonus}`;

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
  const { practice } = state;
  if (!isDifficultyUnlocked(practice.practiceDifficultyKey)) {
    practice.practiceDifficultyKey = isDifficultyUnlocked("normal") ? "normal" : "easy";
  }

  for (const option of Array.from(practiceDifficultySelect.options)) {
    const key = option.value;
    const unlocked = PRACTICE_DIFFICULTIES.includes(key) ? isDifficultyUnlocked(key) : true;
    const baseLabel = option.dataset.baseLabel || option.textContent.replace("（未解放）", "");
    option.dataset.baseLabel = baseLabel;
    option.disabled = !unlocked;
    option.textContent = unlocked ? baseLabel : `${baseLabel}（未解放）`;
  }

  practiceDifficultySelect.value = practice.practiceDifficultyKey;
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


function renderPracticeStatusList() {
  if (!practiceStatusList) return;
  practiceStatusList.innerHTML = "";
  const { practice } = state;

  for (const option of PRACTICE_STATUS_OPTIONS) {
    const active = practice.practiceStatusToggles[option.key] !== false;
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


function setPracticeStatusToggle(key, enabled) {
  const { practice } = state;
  if (!(key in practice.practiceStatusToggles)) return;
  practice.practiceStatusToggles[key] = Boolean(enabled);
  updatePracticePanel();
}

function setPracticePanelOpen(open, sectionKey = null) {
  const { practice, run } = state;
  const targetSection = sectionKey ?? practice.practicePanelSection;
  const resolvedSection = resolvePracticePanelSection(targetSection) ?? getAvailablePracticePanelSections()[0] ?? null;
  practice.practicePanelOpen = Boolean(open && resolvedSection);
  practice.practicePanelSection = practice.practicePanelOpen ? resolvedSection : null;
  if (run.running && !run.gameOver) {
    run.paused = practice.practicePanelOpen;
    updateGameReturnButton();
  }
  updatePracticePanel();
}

function togglePracticePanelSection(sectionKey) {
  const { practice } = state;
  const resolvedSection = resolvePracticePanelSection(sectionKey);
  if (!resolvedSection) return;
  if (practice.practicePanelOpen && practice.practicePanelSection === resolvedSection) {
    setPracticePanelOpen(false);
    return;
  }
  setPracticePanelOpen(true, resolvedSection);
}


function startPracticeHub() {
  const { combat, practice, run, stage } = state;
  resetGame();
  run.running = true;
  practice.practiceMode = true;
  practice.practiceReturnToHub = true;
  practice.practicePanelOpen = false;
  practice.practicePanelSection = null;
  stage.stageState = "practiceHub";
  stage.stageIntroTimer = 0;
  practice.practiceDoors = createPracticeDoors();
  ensureDevSettings().stageTargetIndex = stage.stageIndex;
  applyPracticeBuild(combat.player);
  startOverlay.classList.add("hidden");
  endOverlay.classList.add("hidden");
  returnConfirmOverlay.classList.add("hidden");
  updateTitleMode(false);
  updatePracticePanel();
  updateGameReturnButton();
}

function startPracticeBoss(stageIndex) {
  const { practice, run, stage } = state;
  if (!loadUnlockedBossStages().includes(stageIndex)) return;
  stage.stageIndex = clamp(stageIndex, 0, getCurrentAdventureLastStageIndex());
  ensureDevSettings().stageTargetIndex = stage.stageIndex;
  practice.practiceReturnToHub = true;
  practice.practicePanelOpen = false;
  practice.practicePanelSection = null;
  run.paused = false;
  practice.practiceDoors = [];
  spawnBoss();
  updatePracticePanel();
}

function restartPracticeBoss(stageIndex = null) {
  const { combat, practice, run, stage } = state;
  const targetStage = stageIndex ?? stage.stageIndex;
  const targetStageIndex = clamp(targetStage, 0, getCurrentAdventureLastStageIndex());
  if (!loadUnlockedBossStages().includes(targetStageIndex)) return;

  resetGame();
  run.running = true;
  practice.practiceMode = true;
  practice.practiceReturnToHub = true;
  practice.practicePanelOpen = false;
  practice.practicePanelSection = null;
  run.paused = false;
  stage.stageIndex = targetStageIndex;
  ensureDevSettings().stageTargetIndex = targetStageIndex;
  applyPracticeBuild(combat.player);
  practice.practiceDoors = [];
  startOverlay.classList.add("hidden");
  endOverlay.classList.add("hidden");
  returnConfirmOverlay.classList.add("hidden");
  updateTitleMode(false);
  spawnBoss();
  updatePracticePanel();
  updateGameReturnButton();
}

function updatePracticeHub(dt) {
  const { combat, practice } = state;
  for (const door of practice.practiceDoors) {
    door.pulse += dt * 3.5;
    if (distance(combat.player, door) <= combat.player.hitRadius + door.hitRadius) {
      startPracticeBoss(door.stageIndex);
      return;
    }
  }
}

function finishPracticeBoss() {
  startPracticeHub();
}

function updatePracticeMode(dt) {
  const { combat, stage } = state;
  if (stage.stageState === "practiceHub") {
    updatePracticeHub(dt);
    return;
  }

  if (stage.stageState === "boss" && stage.bossDefeated && combat.enemies.length === 0) {
    finishPracticeBoss();
  }
}

setStoredDevSettings(loadDevSettings());


