function getPracticeBossHpMultiplier() {
  const { practice } = state;
  return PRACTICE_BOSS_HP_MULTIPLIERS[practice.practiceBossHpMode] ?? 1;
}

function resetPracticeSelections() {
  const { practice } = state;
  practice.practiceNormalLevels = {};
  practice.practiceSpecialLevels = {};
  practice.practiceBaseAttackBonus = 0;
  practice.practiceFirepowerLevel = 0;
  practice.practiceHealthLevel = 0;
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
  const { practice, ui } = state;
  const snapshot = ui.lastRunSnapshot;
  if (!snapshot) return;

  practice.practiceFirepowerLevel = 0;
  practice.practiceHealthLevel = 0;

  if (typeof getPracticeNormalUpgrades === "function") {
    for (const upgrade of getPracticeNormalUpgrades()) {
      practice.practiceNormalLevels[upgrade.key] = snapshot.normalLevels[upgrade.key] ?? 0;
    }
  }

  if (typeof getPracticeSpecialUpgrades === "function") {
    for (const upgrade of getPracticeSpecialUpgrades()) {
      const maxLevel = getPracticeSpecialMaxLevel(upgrade);
      const copiedLevel = clamp(snapshot.normalLevels[upgrade.key] ?? 0, 0, maxLevel);
      if (upgrade.key === "firepowerBreakthrough") {
        practice.practiceFirepowerLevel = copiedLevel;
      } else if (upgrade.key === "healthMonster") {
        practice.practiceHealthLevel = copiedLevel;
      } else {
        practice.practiceSpecialLevels[upgrade.key] = copiedLevel;
      }
    }
  }
  practice.practiceBaseHp = snapshot.baseHp;
  practice.practiceBaseAttackBonus = snapshot.baseAttackBonus ?? 0;
  practice.practiceFirepowerLevel = snapshot.firepowerLevel ?? 0;
  practice.practiceHealthLevel = snapshot.healthLevel ?? 0;
  if (practice.practiceHealthLevel > 0) {
    practice.practiceFirepowerLevel = 0;
  }
  normalizePracticeSpecialSelections();
  rebuildPracticePlayer();
  updatePracticePanel();
}

function getPracticeSkillLevel(key) {
  const { practice } = state;
  return practice.practiceNormalLevels[key] ?? 0;
}

function getPracticeSpecialLevel(key) {
  const { practice } = state;
  if (key === "firepowerBreakthrough") return practice.practiceFirepowerLevel ?? 0;
  if (key === "healthMonster") return practice.practiceHealthLevel ?? 0;
  return practice.practiceSpecialLevels[key] ?? 0;
}

function rebuildPracticePlayer() {
  const { combat, practice, stage } = state;
  if (!practice.practiceMode || stage.stageState !== "practiceHub") return;
  normalizePracticeSpecialSelections();
  const oldPlayer = combat.player;
  combat.player = createPlayer();
  combat.player.x = oldPlayer?.x ?? 0;
  combat.player.y = oldPlayer?.y ?? 0;
  applyPracticeBuild(combat.player);
  updateMouseWorld();
  updateHud();
}

function setPracticeSkillLevel(key, level) {
  const { practice } = state;
  practice.practiceNormalLevels[key] = clamp(Math.round(level), 0, 15);
  rebuildPracticePlayer();
  updatePracticePanel();
}

function storePracticeSpecialLevel(key, level) {
  const { practice } = state;
  if (key === "firepowerBreakthrough") {
    practice.practiceFirepowerLevel = level;
    if (level > 0) {
      practice.practiceHealthLevel = 0;
    }
    return;
  }
  if (key === "healthMonster") {
    practice.practiceHealthLevel = level;
    if (level > 0) {
      practice.practiceFirepowerLevel = 0;
    }
    return;
  }
  if (key === "theWorld" && level > 0) {
    practice.practiceSpecialLevels.criticalLance = 0;
  }
  if (key === "criticalLance" && level > 0) {
    practice.practiceSpecialLevels.theWorld = 0;
  }
  practice.practiceSpecialLevels[key] = level;
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
  const { practice } = state;
  if (practice.practiceFirepowerLevel > 0 && practice.practiceHealthLevel > 0) {
    practice.practiceHealthLevel = 0;
  }

  if ((practice.practiceSpecialLevels.theWorld ?? 0) > 0 && (practice.practiceSpecialLevels.criticalLance ?? 0) > 0) {
    practice.practiceSpecialLevels.criticalLance = 0;
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
  const { practice } = state;
  practice.practiceBossHpMode = mode;
  rebuildPracticePlayer();
  updatePracticePanel();
}

function setPracticeDifficulty(key) {
  if (!PRACTICE_DIFFICULTIES.includes(key) || !isDifficultyUnlocked(key)) return;
  const { practice } = state;
  practice.practiceDifficultyKey = key;
  rebuildPracticePlayer();
  updatePracticePanel();
}

function setPracticeBaseHp(value) {
  const { practice } = state;
  practice.practiceBaseHp = clamp(Math.round(value), 60, 500);
  rebuildPracticePlayer();
  updatePracticePanel();
}

function setPracticeBaseAttackBonus(value) {
  const { practice } = state;
  practice.practiceBaseAttackBonus = clamp(Math.round(value), 0, 160);
  rebuildPracticePlayer();
  updatePracticePanel();
}

function setPracticeFirepowerLevel(value) {
  const { practice } = state;
  const level = clamp(Math.round(value), 0, 5);
  practice.practiceFirepowerLevel = level;
  if (level > 0) {
    practice.practiceHealthLevel = 0;
  }
  rebuildPracticePlayer();
  updatePracticePanel();
}

function setPracticeHealthLevel(value) {
  const { practice } = state;
  const level = clamp(Math.round(value), 0, 5);
  practice.practiceHealthLevel = level;
  if (level > 0) {
    practice.practiceFirepowerLevel = 0;
  }
  rebuildPracticePlayer();
  updatePracticePanel();
}
