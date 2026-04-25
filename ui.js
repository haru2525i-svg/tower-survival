const RUN_HISTORY_STORAGE_KEY = getBuildStorageKey("towerSurvivalRunHistory");
const MAX_RUN_HISTORY = 20;
const CLEAR_SUMMARY_DIFFICULTY_ORDER = ["イージー", "ノーマル", "ハード", "ゲーマー"];

function updateTitleMode(enabled) {
  frame?.classList.toggle("title-mode", Boolean(enabled));
}

function loadRunHistory() {
  try {
    const raw = localStorage.getItem(RUN_HISTORY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRunHistory(entries) {
  try {
    localStorage.setItem(RUN_HISTORY_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Local-file play can block storage; history still works for the current session.
  }
}

function getDifficultyDisplayLabel() {
  const { run } = state;
  if (run.difficultyKey === "easy") return "イージー";
  if (run.difficultyKey === "hard") return "ハード";
  if (run.difficultyKey === "gamer") return "ゲーマー";
  return "ノーマル";
}

function getSkillSummary(player, limit = 16) {
  const lines = Object.entries(player.skillLevels)
    .filter(([, level]) => level > 0)
    .map(([key, level]) => `${player.skillNames[key] ?? key} Lv.${level}`);
  return lines.slice(0, limit).join(" / ") || "なし";
}

function getDamageSummary() {
  const { combat } = state;
  const lines = Object.entries(combat.damageStats)
    .sort((a, b) => b[1] - a[1])
    .map(([kind, amount]) => `${kind}:${Math.round(amount)}`);
  return lines.join(" / ") || "なし";
}

function getAbilitySummary(player) {
  return [
    `HP ${Math.ceil(player.hp)}/${Math.ceil(player.maxHp)}`,
    `基礎HP ${Math.round(player.baseMaxHp ?? 100)}`,
    `追加HP +${Math.round(player.maxHpBonus ?? 0)}`,
    `装甲 ${Math.ceil(player.recoveryArmor ?? 0)}/${Math.ceil(player.recoveryArmorMax ?? 0)}`,
    `銃 ${Math.round(getGunDamage(player))}`,
    `爆弾 ${Math.round(getSkillShotDamage(player))}`,
    `斬撃 ${Math.round(getStrongSlashDamage(player))}`,
    `火力倍率 x${(player.damageMultiplier ?? 1).toFixed(2)}`,
  ].join(" / ");
}

function buildRunHeadline(won, player) {
  const { run, stage } = state;
  if (won) {
    return `クリアタイム ${formatTime(run.time)} / Lv ${player.level} / ${getCurrentAdventureStageCount()}階層突破`;
  }
  return `敗北 ${stage.stageIndex + 1}階層 / 生存 ${formatTime(run.time)} / Lv ${player.level}`;
}

function buildRunSummary(won) {
  const { combat } = state;
  const player = combat.player;
  const lines = [
    buildRunHeadline(won, player),
    `取得スキル: ${getSkillSummary(player)}`,
    `ダメージ内訳: ${getDamageSummary()}`,
    `現在能力値: ${getAbilitySummary(player)}`,
  ];

  if (!won) {
    lines.push(`最後に受けた攻撃: ${combat.lastDamageCause || "不明"}`);
  }

  return lines.join("\n");
}

function buildRunHistoryEntry(won) {
  const { combat, run, stage } = state;
  const player = combat.player;
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    result: won ? "clear" : "fail",
    resultLabel: won ? "クリア" : "敗北",
    time: formatTime(run.time),
    level: player.level,
    stage: won ? getCurrentAdventureStageCount() : (stage.stageIndex + 1),
    difficulty: getDifficultyDisplayLabel(),
    headline: buildRunHeadline(won, player),
    skillText: getSkillSummary(player),
    damageText: getDamageSummary(),
    abilityText: getAbilitySummary(player),
    lastDamageCause: won ? "" : (combat.lastDamageCause || "不明"),
  };
}

function recordRunHistory(won) {
  const { combat, practice, ui } = state;
  if (!combat.player || practice.practiceMode) return;
  const next = [buildRunHistoryEntry(won), ...ui.runHistory].slice(0, MAX_RUN_HISTORY);
  ui.runHistory = next;
  saveRunHistory(next);
}

function formatRunTimestamp(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseRunTimeSeconds(timeText) {
  if (typeof timeText !== "string") return Infinity;
  const match = timeText.match(/^(\d+):(\d{2})$/);
  if (!match) return Infinity;
  return Number(match[1]) * 60 + Number(match[2]);
}

function compareClearSummaryDifficulty(a, b) {
  const aIndex = CLEAR_SUMMARY_DIFFICULTY_ORDER.indexOf(a);
  const bIndex = CLEAR_SUMMARY_DIFFICULTY_ORDER.indexOf(b);
  if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
  if (aIndex >= 0) return -1;
  if (bIndex >= 0) return 1;
  return String(a).localeCompare(String(b), "ja");
}

function buildClearSummaryGroups(entries) {
  const groups = new Map();
  for (const entry of entries) {
    if (!entry || entry.result !== "clear") continue;
    const difficulty = entry.difficulty || "不明";
    const stage = Math.max(1, Math.round(Number(entry.stage) || 0));
    let difficultyGroup = groups.get(difficulty);
    if (!difficultyGroup) {
      difficultyGroup = {
        difficulty,
        count: 0,
        stages: new Map(),
      };
      groups.set(difficulty, difficultyGroup);
    }
    difficultyGroup.count += 1;

    let stageGroup = difficultyGroup.stages.get(stage);
    if (!stageGroup) {
      stageGroup = {
        stage,
        count: 0,
        bestTime: entry.time,
        bestTimeSeconds: parseRunTimeSeconds(entry.time),
        bestLevel: Number(entry.level) || 0,
      };
      difficultyGroup.stages.set(stage, stageGroup);
    }

    stageGroup.count += 1;
    const entryTimeSeconds = parseRunTimeSeconds(entry.time);
    if (entryTimeSeconds < stageGroup.bestTimeSeconds) {
      stageGroup.bestTimeSeconds = entryTimeSeconds;
      stageGroup.bestTime = entry.time;
    }
    stageGroup.bestLevel = Math.max(stageGroup.bestLevel, Number(entry.level) || 0);
  }

  return Array.from(groups.values())
    .sort((a, b) => compareClearSummaryDifficulty(a.difficulty, b.difficulty))
    .map((group) => ({
      ...group,
      stages: Array.from(group.stages.values()).sort((a, b) => a.stage - b.stage),
    }));
}

function renderClearSummary(entries) {
  if (!clearSummaryList) return;

  clearSummaryList.innerHTML = "";
  const groups = buildClearSummaryGroups(entries);
  if (!groups.length) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "まだクリア戦績はありません。";
    clearSummaryList.appendChild(empty);
    return;
  }

  for (const group of groups) {
    const card = document.createElement("article");
    card.className = "clear-summary-card";

    const header = document.createElement("div");
    header.className = "clear-summary-header";

    const title = document.createElement("strong");
    title.className = "clear-summary-title";
    title.textContent = group.difficulty;

    const count = document.createElement("span");
    count.className = "clear-summary-count";
    count.textContent = `${group.count}回クリア`;

    header.append(title, count);
    card.appendChild(header);

    const stageList = document.createElement("div");
    stageList.className = "clear-summary-stage-list";

    for (const stageGroup of group.stages) {
      const row = document.createElement("div");
      row.className = "clear-summary-stage-row";

      const stage = document.createElement("span");
      stage.className = "clear-summary-stage-label";
      stage.textContent = `${stageGroup.stage}階層`;

      const meta = document.createElement("span");
      meta.className = "clear-summary-stage-meta";
      meta.textContent = `クリア ${stageGroup.count}回 / 最速 ${stageGroup.bestTime} / 最高Lv ${stageGroup.bestLevel}`;

      row.append(stage, meta);
      stageList.appendChild(row);
    }

    card.appendChild(stageList);
    clearSummaryList.appendChild(card);
  }
}

function renderRunHistory() {
  if (!historyList) return;

  const { ui } = state;
  const entries = Array.isArray(ui.runHistory) ? ui.runHistory : [];
  renderClearSummary(entries);

  historyList.innerHTML = "";
  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "まだ通常プレイの戦績はありません。";
    historyList.appendChild(empty);
    return;
  }

  for (const entry of entries) {
    const card = document.createElement("article");
    card.className = `history-card history-card-${entry.result}`;

    const header = document.createElement("div");
    header.className = "history-card-header";

    const result = document.createElement("strong");
    result.className = "history-result";
    result.textContent = entry.resultLabel;

    const timestamp = document.createElement("span");
    timestamp.className = "history-timestamp";
    timestamp.textContent = formatRunTimestamp(entry.timestamp);

    header.append(result, timestamp);

    const meta = document.createElement("div");
    meta.className = "history-meta";
    meta.textContent = `${entry.difficulty} / ${entry.time} / Lv ${entry.level} / ${entry.stage}階層`;

    const headline = document.createElement("div");
    headline.className = "history-headline";
    headline.textContent = entry.headline;

    const skills = document.createElement("div");
    skills.className = "history-skills";
    skills.textContent = `技構成: ${entry.skillText}`;

    card.append(header, meta, headline, skills);
    if (entry.result === "fail" && entry.lastDamageCause) {
      const cause = document.createElement("div");
      cause.className = "history-cause";
      cause.textContent = `最後に受けた攻撃: ${entry.lastDamageCause}`;
      card.appendChild(cause);
    }
    historyList.appendChild(card);
  }
}

function renderPracticeMenuStatus() {
  if (!practiceMenuStatus) return;
  const unlocked = typeof loadUnlockedBossStages === "function"
    ? loadUnlockedBossStages()
    : [];
  practiceMenuStatus.textContent = `解放済みボス練習: ${unlocked.length}/${getCurrentAdventureStageCount()}階層`;
}

function switchStartMenu(section = "home") {
  const { run } = state;
  run.startMenuSection = section;
  titleMenuHome?.classList.toggle("hidden", section !== "home");
  titleMenuAdventure?.classList.toggle("hidden", section !== "adventure");
  titleMenuPractice?.classList.toggle("hidden", section !== "practice");
  titleMenuRecords?.classList.toggle("hidden", section !== "records");

  if (section === "practice") {
    renderPracticeMenuStatus();
  } else if (section === "records") {
    renderRunHistory();
    if (typeof refreshOnlineRanking === "function") {
      refreshOnlineRanking();
    }
  }
}

function shouldReturnToPracticeHub() {
  const { practice, stage } = state;
  return Boolean(practice.practiceMode || (practice.practiceReturnToHub && stage.stageState !== "practiceHub"));
}

function startGame() {
  const { run } = state;
  resetGame();
  run.running = true;
  startOverlay.classList.add("hidden");
  endOverlay.classList.add("hidden");
  returnConfirmOverlay.classList.add("hidden");
  updateTitleMode(false);
  switchStartMenu("home");
  updateGameReturnButton();
}

function returnToSelectionScreen() {
  const { stage } = state;
  if (shouldReturnToPracticeHub() && stage.stageState !== "practiceHub" && typeof startPracticeHub === "function") {
    startPracticeHub();
    return;
  }
  showTitleScreen();
}

function restartCurrentRun() {
  const { practice, stage } = state;
  if (practice.practiceMode && typeof restartPracticeBoss === "function") {
    restartPracticeBoss(stage.stageIndex);
    return;
  }
  startGame();
}

function updateReturnConfirmCopy() {
  const { practice, stage } = state;
  if (!returnConfirmTitle || !returnConfirmLead) return;
  if (practice.practiceMode || practice.practiceReturnToHub) {
    if (stage.stageState === "practiceHub") {
      returnConfirmTitle.textContent = "メインメニューに戻りますか？";
      returnConfirmLead.textContent = "ボス練習ロビーを終了して、メインメニューへ戻ります。";
      return;
    }
    returnConfirmTitle.textContent = "ボス練習ロビーに戻りますか？";
    returnConfirmLead.textContent = "現在のボス戦は終了して、ボス練習ロビーへ戻ります。";
    return;
  }
  returnConfirmTitle.textContent = "スタート画面に戻りますか？";
  returnConfirmLead.textContent = "現在の進行は終了します。";
}

function showTitleScreen() {
  captureLastRunSnapshot();
  resetGame();
  startOverlay.classList.remove("hidden");
  endOverlay.classList.add("hidden");
  returnConfirmOverlay.classList.add("hidden");
  updateTitleMode(true);
  switchStartMenu("home");
  renderRunHistory();
  renderPracticeMenuStatus();
  updateDifficultyButtons();
  updateGameReturnButton();
}

function captureLastRunSnapshot() {
  const { combat, practice, ui } = state;
  if (!combat.player || practice.practiceMode) return;
  ui.lastRunSnapshot = {
    normalLevels: { ...combat.player.skillLevels },
    baseHp: Math.round(combat.player.baseMaxHp ?? 100),
    baseAttackBonus: Math.max(0, Math.round((combat.player.baseGunDamage ?? 22) - 22)),
    firepowerLevel: combat.player.firepowerBreakthroughLevel ?? 0,
    healthLevel: combat.player.healthMonsterLevel ?? 0,
  };
}

function requestTitleReturn() {
  const { run, view } = state;
  if (run.gameOver) {
    returnToSelectionScreen();
    return;
  }
  run.returnConfirmWasPaused = run.paused;
  if (run.running && !run.gameOver) {
    run.paused = true;
  }
  view.mouse.down = false;
  updateReturnConfirmCopy();
  returnConfirmOverlay.classList.remove("hidden");
  updateGameReturnButton();
}

function cancelTitleReturn() {
  const { run } = state;
  returnConfirmOverlay.classList.add("hidden");
  if (run.running && !run.gameOver) {
    run.paused = run.returnConfirmWasPaused;
  }
  updateGameReturnButton();
}

function updateGameReturnButton() {
  const { run, practice, stage } = state;
  if (!gameReturnButton) return;
  const visible = run.running && !run.gameOver && !run.paused;
  if (practice.practiceMode && stage.stageState === "practiceHub") {
    gameReturnButton.textContent = "メインメニューへ";
  } else {
    gameReturnButton.textContent = shouldReturnToPracticeHub() ? "練習ロビーへ" : "スタートへ";
  }
  gameReturnButton.classList.toggle("hidden", !visible);
}

function endGame(won) {
  const { practice, run } = state;
  captureLastRunSnapshot();
  if (won && !practice.practiceMode) {
    unlockNextDifficultyForClear();
  }
  recordRunHistory(won);
  if (typeof submitOnlineRunResult === "function") {
    submitOnlineRunResult(won);
  }
  run.running = false;
  run.gameOver = true;
  run.won = won;
  endOverlay.classList.remove("hidden");
  updateTitleMode(false);
  endEyebrow.textContent = won ? "Stage Clear" : "Game Over";
  endTitle.textContent = won ? "8階層クリア" : "敗北";
  titleButton.textContent = shouldReturnToPracticeHub() ? "ボス練習ロビーへ" : "スタート画面にもどる";
  endSummary.textContent = buildRunSummary(won);
  updateGameReturnButton();
}

function updateHud() {
  const { combat, run, stage, practice } = state;
  const player = combat.player;
  hpFill.style.width = `${(player.hp / player.maxHp) * 100}%`;
  xpFill.style.width = `${(player.xp / player.nextXp) * 100}%`;
  shieldFill.style.width = player.recoveryArmorMax > 0
    ? `${(player.recoveryArmor / player.recoveryArmorMax) * 100}%`
    : "0%";
  levelValue.textContent = String(player.level);
  timeValue.textContent = formatTime(run.time);

  const reloadText = player.reloading ? ` リロード${player.reloadTimer.toFixed(1)}秒` : "";
  const skillText = player.hasSkillShot
    ? (player.skillShotTimer <= 0 ? ` | Q 爆弾 Lv.${player.skillShotLevel}` : ` | Q ${player.skillShotTimer.toFixed(1)}秒`)
    : " | Q 未取得";
  const slashText = !player.hasStrongSlash
    ? " | E 未取得"
    : (player.strongSlashReady
      ? ` | E 斬撃 Lv.${player.strongSlashLevel}`
      : ` | E ${Math.max(0, player.strongSlashCooldown - player.strongSlashCharge).toFixed(1)}秒`);
  const armorText = player.recoveryArmorMax > 0
    ? ` | 装甲 ${Math.ceil(player.recoveryArmor)}/${Math.ceil(player.recoveryArmorMax)}`
    : "";
  const laserText = player.laserBeamLevel <= 0
    ? ""
    : (player.laserBeamActiveTimer > 0
      ? ` | レーザー ${player.laserBeamActiveTimer.toFixed(1)}秒`
      : ` | レーザーCT ${player.laserBeamCooldownTimer.toFixed(1)}秒`);
  const autoText = player.autoAttack ? " | F オート射撃ON" : " | F オート射撃OFF";

  weaponValue.textContent = `弾 ${player.ammo}/${player.maxAmmo}${reloadText}${skillText}${slashText}${armorText}${laserText}${autoText}`;

  if (stage.stageState === "boss") {
    const fifthBoss = combat.enemies.find((enemy) => enemy.type === "boss" && enemy.fifthIntermissionActive);
    if (fifthBoss) {
      const remaining = countFifthBossElites();
      enemyValue.textContent = `第5層試練 ${Math.ceil(fifthBoss.fifthIntermissionTimer)}秒 | 黄色敵 ${remaining}`;
    } else {
      enemyValue.textContent = `ボス ${stage.stageIndex + 1} | 敵 ${combat.enemies.length}`;
    }
  } else if (stage.stageState === "practiceHub") {
    const totalNormalLevels = Object.values(practice.practiceNormalLevels).reduce((sum, level) => sum + level, 0);
    enemyValue.textContent = `ボス練習 | 扉 ${practice.practiceDoors.length} | 通常Lv合計 ${totalNormalLevels}`;
  } else if (stage.stageState === "door") {
    enemyValue.textContent = `ステージ ${stage.stageIndex + 1} | ボス扉出現`;
  } else {
    enemyValue.textContent = `ステージ ${stage.stageIndex + 1} | 撃破 ${stage.stageKills}/${currentStage().targetKills} | 敵 ${countNormalSpawnEnemies()}/${getNormalSpawnEnemyCap()}`;
  }
}

const { ui } = state;
ui.runHistory = loadRunHistory();
switchStartMenu("home");
renderRunHistory();
renderPracticeMenuStatus();
updateTitleMode(true);
