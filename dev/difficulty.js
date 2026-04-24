const EFFECT_MODES = {
  normal: {
    desc: "見た目を優先します。重いときは軽量モードにしてください。",
    burstChance: 1,
    burstBudget: MAX_BURST_ADDS_PER_FRAME,
    burstLimit: MAX_BURSTS,
  },
  light: {
    desc: "描画をかなり軽くします。重いときはこちらを使ってください。",
    burstChance: 0.42,
    burstBudget: 8,
    burstLimit: 48,
  },
};

const DIFFICULTIES = {
  easy: {
    label: "Easy",
    desc: "かなり遊びやすい設定です。回復と宝箱が多く、敵の体力と攻撃も控えめです。",
    targetKills: 1,
    enemyBaseHp: 0.62,
    enemyHpStageGrowth: -0.045,
    enemySpeed: 0.88,
    enemyBaseDamage: 0.5,
    enemyDamageStageGrowth: -0.05,
    spawnRate: 1,
    bossBaseHp: 0.64,
    bossHpStageGrowth: -0.04,
    bossBaseDamage: 0.58,
    bossDamageStageGrowth: -0.045,
    bossBaseSpeed: 0.9,
    bossSpeedStageGrowth: -0.02,
    bossCooldownBase: 1.24,
    bossCooldownStageGrowth: 0.035,
    enemyCap: 1,
    chestRate: 1.55,
    healRate: 2.4,
    xpRate: 1.22,
    xpStageGrowth: 0,
    playerProjectileDamageRate: 1,
  },
  normal: {
    label: "Normal",
    desc: "標準バランスです。まずはこの難易度での攻略が基準です。",
    targetKills: 1,
    enemyBaseHp: 1,
    enemyHpStageGrowth: 0,
    enemySpeed: 1,
    enemyBaseDamage: 1,
    enemyDamageStageGrowth: 0,
    spawnRate: 1,
    bossBaseHp: 1,
    bossHpStageGrowth: 0,
    bossBaseDamage: 1,
    bossDamageStageGrowth: 0,
    bossBaseSpeed: 1,
    bossSpeedStageGrowth: 0,
    bossCooldownBase: 1,
    bossCooldownStageGrowth: 0,
    enemyCap: 1,
    chestRate: 1,
    healRate: 1,
    xpRate: 1,
    xpStageGrowth: 0,
    playerProjectileDamageRate: 1,
  },
  hard: {
    label: "Hard",
    desc: "ノーマルより敵がかなり強くなります。宝箱と回復も少なめです。",
    targetKills: 1,
    enemyBaseHp: 1.14,
    enemyHpStageGrowth: 0.045,
    enemySpeed: 1.08,
    enemyBaseDamage: 1.16,
    enemyDamageStageGrowth: 0.05,
    spawnRate: 1,
    bossBaseHp: 1.16,
    bossHpStageGrowth: 0.04,
    bossBaseDamage: 1.18,
    bossDamageStageGrowth: 0.045,
    bossBaseSpeed: 1.08,
    bossSpeedStageGrowth: 0.025,
    bossCooldownBase: 0.88,
    bossCooldownStageGrowth: -0.025,
    enemyCap: 1,
    chestRate: 0.9,
    healRate: 0.9,
    xpRate: 0.75,
    xpStageGrowth: 0,
    playerProjectileDamageRate: 2 / 3,
  },
  gamer: {
    label: "Gamer",
    desc: "かなり高難度です。敵の伸び幅も大きく、経験値もかなり少なくなります。",
    targetKills: 1,
    enemyBaseHp: 1.25,
    enemyHpStageGrowth: 0.085,
    enemySpeed: 1.14,
    enemyBaseDamage: 1.28,
    enemyDamageStageGrowth: 0.095,
    spawnRate: 1,
    bossBaseHp: 1.3,
    bossHpStageGrowth: 0.075,
    bossBaseDamage: 1.34,
    bossDamageStageGrowth: 0.085,
    bossBaseSpeed: 1.16,
    bossSpeedStageGrowth: 0.045,
    bossCooldownBase: 0.78,
    bossCooldownStageGrowth: -0.045,
    enemyCap: 1,
    chestRate: 0.78,
    healRate: 0.82,
    xpRate: 0.5,
    xpStageGrowth: 0,
    playerProjectileDamageRate: 0.5,
  },
};

function currentDifficulty() {
  const currentKey = state.practiceMode
    ? (isDifficultyUnlocked(state.practiceDifficultyKey) ? state.practiceDifficultyKey : (isDifficultyUnlocked("normal") ? "normal" : "easy"))
    : state.difficultyKey;
  return DIFFICULTIES[currentKey] ?? DIFFICULTIES.normal;
}

function currentEffectMode() {
  return EFFECT_MODES[state.effectMode] ?? EFFECT_MODES.normal;
}

function scaleByDifficultyStage(baseMultiplier, stageGrowth) {
  return Math.max(0.35, baseMultiplier * (1 + state.stageIndex * stageGrowth));
}

function scaleByDifficultyStageAt(baseMultiplier, stageGrowth, stageIndex) {
  return Math.max(0.35, baseMultiplier * (1 + stageIndex * stageGrowth));
}

function scaleCooldownByDifficultyStage(baseMultiplier, stageGrowth) {
  return Math.max(0.42, baseMultiplier * (1 + state.stageIndex * stageGrowth));
}

function scaleXpByDifficultyStage(baseMultiplier, stageGrowth, stageIndex = state.stageIndex) {
  return Math.max(0.78, baseMultiplier * (1 + stageIndex * stageGrowth));
}

function formatMultiplierPreview(startValue, endValue = startValue) {
  if (Math.abs(startValue - endValue) < 0.005) {
    return `x${startValue.toFixed(2)}`;
  }
  return `x${startValue.toFixed(2)} -> ${endValue.toFixed(2)}`;
}

function getEnemyStrengthPreview(difficulty) {
  const startHp = difficulty.enemyBaseHp ?? 1;
  const startDamage = difficulty.enemyBaseDamage ?? 1;
  const endHp = scaleByDifficultyStageAt(
    startHp,
    difficulty.enemyHpStageGrowth ?? 0,
    getCurrentAdventureLastStageIndex(),
  );
  const endDamage = scaleByDifficultyStageAt(
    startDamage,
    difficulty.enemyDamageStageGrowth ?? 0,
    getCurrentAdventureLastStageIndex(),
  );
  const startStrength = (startHp + startDamage) / 2;
  const endStrength = (endHp + endDamage) / 2;
  return formatMultiplierPreview(startStrength, endStrength);
}

function getXpPreview(difficulty) {
  const start = difficulty.xpRate ?? 1;
  const end = scaleXpByDifficultyStage(start, difficulty.xpStageGrowth ?? 0, getCurrentAdventureLastStageIndex());
  return formatMultiplierPreview(start, end);
}

function getHealPreview(difficulty) {
  return formatMultiplierPreview(difficulty.healRate ?? 1);
}

function getPlayerProjectileDamageMultiplier() {
  return currentDifficulty().playerProjectileDamageRate ?? 1;
}

function currentStage() {
  const base = STAGES[state.stageIndex];
  const difficulty = currentDifficulty();
  return {
    targetKills: Math.max(1, Math.round(base.targetKills * difficulty.targetKills)),
    enemyHp: base.enemyHp * scaleByDifficultyStage(difficulty.enemyBaseHp, difficulty.enemyHpStageGrowth),
    enemySpeed: base.enemySpeed * difficulty.enemySpeed,
    enemyDamage: base.enemyDamage * scaleByDifficultyStage(difficulty.enemyBaseDamage, difficulty.enemyDamageStageGrowth),
    spawnRate: base.spawnRate * difficulty.spawnRate,
    bossHp: base.bossHp * scaleByDifficultyStage(difficulty.bossBaseHp, difficulty.bossHpStageGrowth),
    bossDamage: base.bossDamage * scaleByDifficultyStage(difficulty.bossBaseDamage, difficulty.bossDamageStageGrowth),
    bossSpeed: scaleByDifficultyStage(difficulty.bossBaseSpeed, difficulty.bossSpeedStageGrowth),
    bossCooldown: base.bossCooldown * scaleCooldownByDifficultyStage(difficulty.bossCooldownBase, difficulty.bossCooldownStageGrowth),
  };
}

function selectDifficulty(key) {
  if (!DIFFICULTIES[key] || state.running || !isDifficultyUnlocked(key)) return;
  state.difficultyKey = key;
  updateDifficultyButtons();
}

function selectEffectMode(key) {
  if (!EFFECT_MODES[key]) return;
  state.effectMode = key;
  updateEffectButtons();
}

function updateDifficultyButtons() {
  if (!isDifficultyUnlocked(state.difficultyKey)) {
    state.difficultyKey = isDifficultyUnlocked("normal") ? "normal" : "easy";
  }

  for (const button of difficultyButtons) {
    const key = button.dataset.difficulty;
    const unlocked = isDifficultyUnlocked(key);
    button.disabled = !unlocked;
    button.classList.toggle("is-active", unlocked && key === state.difficultyKey);
    button.classList.toggle("is-locked", !unlocked);
    button.title = unlocked
      ? ""
      : (key === "hard" ? "ノーマルクリアで解放" : "ハードクリアで解放");
  }
  if (difficultyDesc) {
    const difficulty = currentDifficulty();
    difficultyDesc.textContent = `${difficulty.desc} 報酬: 宝箱x${difficulty.chestRate.toFixed(2)} / 回復${getHealPreview(difficulty)} / 経験値${getXpPreview(difficulty)} / 敵強さ${getEnemyStrengthPreview(difficulty)}`;
  }
}

function updateEffectButtons() {
  for (const button of effectButtons) {
    button.classList.toggle("is-active", button.dataset.effectMode === state.effectMode);
  }
  if (effectDesc) {
    effectDesc.textContent = currentEffectMode().desc;
  }
}

function getDifficultyChestMultiplier() {
  return currentDifficulty().chestRate ?? 1;
}

function getDifficultyHealMultiplier() {
  return currentDifficulty().healRate ?? 1;
}

function getDifficultyXpMultiplier() {
  const difficulty = currentDifficulty();
  return scaleXpByDifficultyStage(difficulty.xpRate ?? 1, difficulty.xpStageGrowth ?? 0);
}
