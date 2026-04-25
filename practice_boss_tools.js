function getCurrentBoss() {
  const { combat } = state;
  return combat.enemies.find((enemy) => enemy.type === "boss") ?? null;
}

function addDevBossShortcutBurst(boss, color) {
  if (typeof addBurst !== "function") return;
  addBurst({
    kind: "ring",
    x: boss.x,
    y: boss.y,
    radius: (boss.drawRadius ?? 40) + 46,
    life: 0.34,
    maxLife: 0.34,
    color,
    guaranteed: true,
  });
}

function clearDevBossGimmickState() {
  const { combat, status } = state;
  status.darkZone = null;
  status.darkZoneInside = false;
  status.darkZoneTransitionFlash = 0;
  status.reverseHorizontalTimer = 0;
  status.reverseVerticalTimer = 0;
  status.reverseWarningAxis = null;
  status.reverseWarningTimer = 0;
  status.reversePendingDuration = 0;
  combat.blinkBanZones = [];
  combat.safeZones = [];
  if (typeof finishBossSanctuary === "function") {
    finishBossSanctuary();
  } else {
    combat.sanctuaryAttack = null;
  }
}

function getEnabledDevBossStatusModes() {
  const { stage } = state;
  const modes = [];
  if (isDevBossStatusModeEnabled("darkZone")) modes.push("darkZone");
  if (stage.stageIndex >= 2 && isDevBossStatusModeEnabled("reverseHorizontal")) {
    modes.push("reverseHorizontal");
  }
  if (stage.stageIndex >= 2 && isDevBossStatusModeEnabled("reverseVertical")) {
    modes.push("reverseVertical");
  }
  if (isDevBossStatusModeEnabled("blinkBan")) modes.push("blinkBan");
  return modes;
}

function triggerDevBossStatusMode(mode) {
  const { combat, stage } = state;
  if (mode === "darkZone" && typeof addDarkZone === "function") {
    const orientation = Math.random() < 0.5 ? "horizontal" : "vertical";
    const side = orientation === "horizontal"
      ? (Math.random() < 0.5 ? "left" : "right")
      : (Math.random() < 0.5 ? "top" : "bottom");
    addDarkZone(orientation, side, 4.2 + stage.stageIndex * 0.18);
    return true;
  }
  if (mode === "reverseHorizontal" && typeof startReverseWarning === "function") {
    startReverseWarning("horizontal", 0.18, 3.1 + stage.stageIndex * 0.15);
    return true;
  }
  if (mode === "reverseVertical" && typeof startReverseWarning === "function") {
    startReverseWarning("vertical", 0.18, 3.1 + stage.stageIndex * 0.15);
    return true;
  }
  if (mode === "blinkBan" && typeof addBlinkBanZone === "function") {
    addBlinkBanZone(
      combat.player.x,
      combat.player.y,
      160 + stage.stageIndex * 10,
      4.2 + stage.stageIndex * 0.18,
      0.15,
    );
    return true;
  }
  return false;
}

function setBossHalfHpShortcutState(boss) {
  const { stage } = state;
  const targetHp = Math.max(1, boss.maxHp * 0.5);
  if (boss.hp > targetHp) {
    boss.hp = targetHp;
  }
  boss.attackTimer = Math.min(boss.attackTimer ?? Infinity, 0.24);
  boss.hazardTimer = Math.min(boss.hazardTimer ?? Infinity, 0.45);
  addDevBossShortcutBurst(boss, "rgba(255,159,92,0.96)");

  if (
    stage.stageIndex === 4
    && !boss.fifthIntermissionActive
    && !boss.fifthIntermissionTriggered
    && typeof startFifthBossIntermission === "function"
  ) {
    clearDevBossGimmickState();
    startFifthBossIntermission(boss);
  }
}

function setBossEnrageShortcutState(boss) {
  const targetHp = Math.max(1, boss.maxHp / 3);
  if (boss.hp > targetHp) {
    boss.hp = targetHp;
  }
  if (!boss.enraged) {
    boss.enraged = true;
    boss.speed *= 1.6;
  }
  boss.attackTimer = Math.min(boss.attackTimer ?? Infinity, 0.12);
  boss.hazardTimer = Math.min(boss.hazardTimer ?? Infinity, 0.28);
  addDevBossShortcutBurst(boss, "rgba(255,36,60,0.96)");

  if (!boss.phase && !boss.fifthIntermissionActive && typeof startBossPattern === "function") {
    startBossPattern(boss);
  }
}

function triggerBossGimmickShortcutState(boss) {
  const { stage } = state;
  boss.phase = null;

  if (stage.stageIndex === 4 && typeof startFifthBossIntermission === "function" && !boss.fifthIntermissionActive) {
    clearDevBossGimmickState();
    boss.hp = Math.min(boss.hp, Math.max(1, boss.maxHp * 0.5));
    if (!boss.fifthIntermissionTriggered || boss.hp <= boss.maxHp * 0.5) {
      startFifthBossIntermission(boss);
      addDevBossShortcutBurst(boss, "rgba(255,207,92,0.96)");
      return true;
    }
  }

  if (stage.stageIndex >= 3 && isDevBossPatternEnabled("sanctuary") && typeof startBossSanctuary === "function") {
    clearDevBossGimmickState();
    startBossSanctuary(boss);
    addDevBossShortcutBurst(boss, "rgba(120,232,255,0.96)");
    return true;
  }

  const statusModes = getEnabledDevBossStatusModes();
  if (statusModes.length) {
    clearDevBossGimmickState();
    const mode = statusModes[boss.attackIndex % statusModes.length];
    boss.attackIndex += 1;
    if (triggerDevBossStatusMode(mode)) {
      addDevBossShortcutBurst(boss, "rgba(244,241,222,0.96)");
      return true;
    }
  }

  if ((isDevBossHazardEnabled("circle") || isDevBossHazardEnabled("rect")) && typeof spawnBossHazard === "function") {
    clearDevBossGimmickState();
    spawnBossHazard(boss);
    if (typeof getBossHazardCooldown === "function") {
      boss.hazardTimer = getBossHazardCooldown(boss);
    }
    addDevBossShortcutBurst(boss, "rgba(255,120,140,0.96)");
    return true;
  }

  if (typeof startBossStatusAttack === "function") {
    clearDevBossGimmickState();
    if (startBossStatusAttack(boss)) {
      addDevBossShortcutBurst(boss, "rgba(244,241,222,0.96)");
      return true;
    }
  }

  if (typeof startBossPattern === "function") {
    startBossPattern(boss);
    addDevBossShortcutBurst(boss, "rgba(255,255,255,0.96)");
    return true;
  }

  return false;
}

function jumpBossState(mode) {
  const boss = getCurrentBoss();
  if (!boss) return;
  if (mode === "half") {
    setBossHalfHpShortcutState(boss);
  }
  if (mode === "enrage") {
    setBossEnrageShortcutState(boss);
  }
  if (mode === "gimmick") {
    triggerBossGimmickShortcutState(boss);
  }
  updateHud();
  updatePracticePanel();
}

function setRuntimeHp(value) {
  const { combat } = state;
  combat.player.hp = clamp(Math.round(value), 1, Math.ceil(combat.player.maxHp));
  updateHud();
  updatePracticePanel();
}

function setRuntimeXp(value) {
  const { combat } = state;
  combat.player.xp = clamp(Math.round(value), 0, Math.ceil(combat.player.nextXp - 1));
  updateHud();
  updatePracticePanel();
}

function setRuntimeAmmo(value) {
  const { combat } = state;
  combat.player.ammo = clamp(Math.round(value), 0, combat.player.maxAmmo);
  updateHud();
  updatePracticePanel();
}

function setRuntimeStageKills(value) {
  const { stage } = state;
  stage.stageKills = clamp(Math.round(value), 0, 9999);
  updateHud();
  updatePracticePanel();
}
