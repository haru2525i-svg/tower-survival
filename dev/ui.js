const RUN_HISTORY_STORAGE_KEY = getBuildStorageKey("towerSurvivalRunHistory");
const MAX_RUN_HISTORY = 20;

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
  if (state.difficultyKey === "easy") return "イージー";
  if (state.difficultyKey === "hard") return "ハード";
  if (state.difficultyKey === "gamer") return "ゲーマー";
  return "ノーマル";
}

function getSkillSummary(player, limit = 16) {
  const lines = Object.entries(player.skillLevels)
    .filter(([, level]) => level > 0)
    .map(([key, level]) => `${player.skillNames[key] ?? key} Lv.${level}`);
  return lines.slice(0, limit).join(" / ") || "なし";
}

function getDamageSummary() {
  const lines = Object.entries(state.damageStats)
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
  if (won) {
    return `クリアタイム ${formatTime(state.time)} / Lv ${player.level} / ${getCurrentAdventureStageCount()}階層突破`;
  }
  return `敗北 ${state.stageIndex + 1}階層 / 生存 ${formatTime(state.time)} / Lv ${player.level}`;
}

function buildRunSummary(won) {
  const player = state.player;
  const lines = [
    buildRunHeadline(won, player),
    `取得スキル: ${getSkillSummary(player)}`,
    `ダメージ内訳: ${getDamageSummary()}`,
    `現在能力値: ${getAbilitySummary(player)}`,
  ];

  if (!won) {
    lines.push(`最後に受けた攻撃: ${state.lastDamageCause || "不明"}`);
  }

  return lines.join("\n");
}

function buildRunHistoryEntry(won) {
  const player = state.player;
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    result: won ? "clear" : "fail",
    resultLabel: won ? "クリア" : "敗北",
    time: formatTime(state.time),
    level: player.level,
    stage: won ? getCurrentAdventureStageCount() : (state.stageIndex + 1),
    difficulty: getDifficultyDisplayLabel(),
    headline: buildRunHeadline(won, player),
    skillText: getSkillSummary(player),
    damageText: getDamageSummary(),
    abilityText: getAbilitySummary(player),
    lastDamageCause: won ? "" : (state.lastDamageCause || "不明"),
  };
}

function recordRunHistory(won) {
  if (!state.player || state.practiceMode) return;
  const next = [buildRunHistoryEntry(won), ...state.runHistory].slice(0, MAX_RUN_HISTORY);
  state.runHistory = next;
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

function renderRunHistory() {
  if (!historyList) return;

  historyList.innerHTML = "";
  const entries = Array.isArray(state.runHistory) ? state.runHistory : [];
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
  state.startMenuSection = section;
  titleMenuHome?.classList.toggle("hidden", section !== "home");
  titleMenuAdventure?.classList.toggle("hidden", section !== "adventure");
  titleMenuPractice?.classList.toggle("hidden", section !== "practice");
  titleMenuRecords?.classList.toggle("hidden", section !== "records");

  if (section === "practice") {
    renderPracticeMenuStatus();
  } else if (section === "records") {
    renderRunHistory();
  }
}

function startGame() {
  resetGame();
  state.running = true;
  startOverlay.classList.add("hidden");
  endOverlay.classList.add("hidden");
  returnConfirmOverlay.classList.add("hidden");
  updateTitleMode(false);
  switchStartMenu("home");
  updateGameReturnButton();
}

function returnToSelectionScreen() {
  if (state.practiceMode && state.stageState !== "practiceHub" && typeof startPracticeHub === "function") {
    startPracticeHub();
    return;
  }
  showTitleScreen();
}

function restartCurrentRun() {
  if (state.practiceMode && typeof restartPracticeBoss === "function") {
    restartPracticeBoss(state.stageIndex);
    return;
  }
  startGame();
}

function updateReturnConfirmCopy() {
  if (!returnConfirmTitle || !returnConfirmLead) return;
  if (state.practiceMode) {
    if (state.stageState === "practiceHub") {
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
  if (!state.player || state.practiceMode) return;
  state.lastRunSnapshot = {
    normalLevels: { ...state.player.skillLevels },
    baseHp: Math.round(state.player.baseMaxHp ?? 100),
    baseAttackBonus: Math.max(0, Math.round((state.player.baseGunDamage ?? 22) - 22)),
    firepowerLevel: state.player.firepowerBreakthroughLevel ?? 0,
    healthLevel: state.player.healthMonsterLevel ?? 0,
  };
}

function requestTitleReturn() {
  if (state.gameOver) {
    returnToSelectionScreen();
    return;
  }
  state.returnConfirmWasPaused = state.paused;
  if (state.running && !state.gameOver) {
    state.paused = true;
  }
  state.mouse.down = false;
  updateReturnConfirmCopy();
  returnConfirmOverlay.classList.remove("hidden");
  updateGameReturnButton();
}

function cancelTitleReturn() {
  returnConfirmOverlay.classList.add("hidden");
  if (state.running && !state.gameOver) {
    state.paused = state.returnConfirmWasPaused;
  }
  updateGameReturnButton();
}

function updateGameReturnButton() {
  if (!gameReturnButton) return;
  const visible = state.running && !state.gameOver && !state.paused;
  if (state.practiceMode && state.stageState === "practiceHub") {
    gameReturnButton.textContent = "メインメニューへ";
  } else {
    gameReturnButton.textContent = state.practiceMode ? "練習ロビーへ" : "スタートへ";
  }
  gameReturnButton.classList.toggle("hidden", !visible);
}

function endGame(won) {
  captureLastRunSnapshot();
  if (won && !state.practiceMode) {
    unlockNextDifficultyForClear();
  }
  recordRunHistory(won);
  state.running = false;
  state.gameOver = true;
  state.won = won;
  endOverlay.classList.remove("hidden");
  updateTitleMode(false);
  endEyebrow.textContent = won ? "Stage Clear" : "Game Over";
  endTitle.textContent = won ? "8階層クリア" : "敗北";
  titleButton.textContent = state.practiceMode ? "ボス練習ロビーへ" : "スタート画面にもどる";
  endSummary.textContent = buildRunSummary(won);
  updateGameReturnButton();
}

function updateHud() {
  const player = state.player;
  hpFill.style.width = `${(player.hp / player.maxHp) * 100}%`;
  xpFill.style.width = `${(player.xp / player.nextXp) * 100}%`;
  shieldFill.style.width = player.recoveryArmorMax > 0
    ? `${(player.recoveryArmor / player.recoveryArmorMax) * 100}%`
    : "0%";
  levelValue.textContent = String(player.level);
  timeValue.textContent = formatTime(state.time);

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

  if (state.stageState === "boss") {
    const fifthBoss = state.enemies.find((enemy) => enemy.type === "boss" && enemy.fifthIntermissionActive);
    if (fifthBoss) {
      const remaining = countFifthBossElites();
      enemyValue.textContent = `第5層試練 ${Math.ceil(fifthBoss.fifthIntermissionTimer)}秒 | 黄色敵 ${remaining}`;
    } else {
      enemyValue.textContent = `ボス ${state.stageIndex + 1} | 敵 ${state.enemies.length}`;
    }
  } else if (state.stageState === "practiceHub") {
    const totalNormalLevels = Object.values(state.practiceNormalLevels).reduce((sum, level) => sum + level, 0);
    enemyValue.textContent = `ボス練習 | 扉 ${state.practiceDoors.length} | 通常Lv合計 ${totalNormalLevels}`;
  } else if (state.stageState === "door") {
    enemyValue.textContent = `ステージ ${state.stageIndex + 1} | ボス扉出現`;
  } else {
    enemyValue.textContent = `ステージ ${state.stageIndex + 1} | 撃破 ${state.stageKills}/${currentStage().targetKills} | 敵 ${countNormalSpawnEnemies()}/${getNormalSpawnEnemyCap()}`;
  }
}

state.runHistory = loadRunHistory();
switchStartMenu("home");
renderRunHistory();
renderPracticeMenuStatus();
updateTitleMode(true);
