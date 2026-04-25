function pointInBossSlash(point, slash) {
  const dx = point.x - slash.x;
  const dy = point.y - slash.y;
  const forward = dx * Math.cos(slash.angle) + dy * Math.sin(slash.angle);
  const side = Math.abs(-dx * Math.sin(slash.angle) + dy * Math.cos(slash.angle));
  return forward > 0 && forward < slash.length && side < slash.width * 0.5;
}

function pointInBossFan(point, fan) {
  const dx = point.x - fan.x;
  const dy = point.y - fan.y;
  const dist = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  return dist <= fan.radius + point.hitRadius
    && Math.abs(angleDifference(angle, fan.angle)) <= fan.arc / 2;
}

const {
  run: bossPatternRunState,
  stage: bossPatternStageState,
  combat: bossPatternCombatState,
  practice: bossPatternPracticeState,
  status: bossPatternStatusState,
  view: bossPatternViewState,
} = state;

function bossSweepAngle(phase) {
  const progress = 1 - clamp(phase.timer / phase.total, 0, 1);
  return phase.angle + phase.arc / 2 - phase.arc * progress;
}

function pointInsideSafeZone(point, zone) {
  if (zone.type === "circle") {
    return distance(point, zone) <= zone.radius - point.hitRadius;
  }

  if (zone.type === "rect") {
    return Math.abs(point.x - zone.x) <= zone.width / 2 - point.hitRadius
      && Math.abs(point.y - zone.y) <= zone.height / 2 - point.hitRadius;
  }

  return false;
}

function getSafeZoneDamage(zone, point) {
  if (zone.centerDamage && zone.type === "circle") {
    const centerRate = 1 - clamp(distance(point, zone) / Math.max(1, zone.radius), 0, 1);
    return zone.damage * (0.55 + centerRate * 0.95);
  }

  return zone.damage;
}

function addSafeZoneBurst(zone) {
  addBurst({
    kind: zone.type === "circle" ? "ring" : "rect",
    x: zone.x,
    y: zone.y,
    radius: zone.radius ?? 0,
    width: zone.width ?? 0,
    height: zone.height ?? 0,
    life: 0.24,
    maxLife: 0.24,
    color: zone.finalColor ?? (zone.danger ? "rgba(255,36,60,0.96)" : "rgba(255,141,147,0.9)"),
  });
}

function resolveSafeZoneGroup(groupId) {
  const zones = bossPatternCombatState.safeZones.filter((zone) => zone.groupId === groupId);
  if (!zones.length || zones.every((zone) => zone.resolved)) return;

  const player = bossPatternCombatState.player;
  const insideAny = zones.some((zone) => pointInsideSafeZone(player, zone));
  const isDanger = zones.some((zone) => zone.danger);
  if ((isDanger && insideAny) || (!isDanger && !insideAny)) {
    damagePlayer(Math.max(...zones.map((zone) => getSafeZoneDamage(zone, player))), zones[0], 310);
  }

  for (const zone of zones) {
    zone.resolved = true;
    addSafeZoneBurst(zone);
  }
}

function pickFifthBossCirclePositions(count, radius, arena, left, right) {
  const top = arena.y - arena.height / 2 + 78;
  const bottom = arena.y + arena.height / 2 - 78;
  const positions = [];
  const minDistance = radius * 2 + 24;

  for (let i = 0; i < count; i += 1) {
    let best = null;
    let bestScore = -Infinity;

    for (let attempt = 0; attempt < 54; attempt += 1) {
      const angle = (Math.PI * 2 * i) / count + attempt * 0.63 + randomRange(-0.28, 0.28);
      const ring = radius * (1.45 + (attempt % 5) * 0.18);
      const candidate = {
        x: clamp(bossPatternCombatState.player.x + Math.cos(angle) * ring, left + radius, right - radius),
        y: clamp(bossPatternCombatState.player.y + Math.sin(angle) * ring, top + radius, bottom - radius),
      };
      const nearest = positions.length
        ? Math.min(...positions.map((position) => distance(position, candidate)))
        : Infinity;

      if (nearest >= minDistance) {
        best = candidate;
        break;
      }

      const score = nearest + distance(candidate, bossPatternCombatState.player) * 0.08;
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }

    positions.push(best);
  }

  return positions;
}

function spawnBossHazard(boss) {
  if (!bossPatternCombatState.arena) return;
  const arena = bossPatternCombatState.arena;
  const circleEnabled = isDevBossHazardEnabled("circle");
  const rectEnabled = isDevBossHazardEnabled("rect");
  if (!circleEnabled && !rectEnabled) return;
  let useCircle = boss.hazardIndex % 2 === 0;
  if (!circleEnabled) useCircle = false;
  if (!rectEnabled) useCircle = true;
  boss.hazardIndex += 1;
  const left = arena.x - arena.width / 2 + 70;
  const right = arena.x + arena.width / 2 - 70;
  const fifthHalfHazard = isFifthBossHalfHpHazard(boss);
  const hazardCount = useCircle && fifthHalfHazard ? 3 : 4 + bossPatternStageState.stageIndex;
  const circleRadius = fifthHalfHazard ? 118 : 62 + bossPatternStageState.stageIndex * 3;
  const circleWarningTime = fifthHalfHazard ? 1.25 : Math.max(0.45, 1 - bossPatternStageState.stageIndex * 0.09);
  const rectWarningTime = Math.max(0.55, 1 - bossPatternStageState.stageIndex * 0.06);
  const fifthCirclePositions = useCircle && fifthHalfHazard
    ? pickFifthBossCirclePositions(hazardCount, circleRadius, arena, left, right)
    : null;

  for (let i = 0; i < hazardCount; i += 1) {
    const rightToLeftIndex = hazardCount - 1 - i;
    const x = left + ((right - left) * (rightToLeftIndex + 0.5)) / hazardCount + randomRange(-24, 24);
    const delay = i * (useCircle ? 0.26 : 0.18);

    if (useCircle) {
      const targetAngle = (Math.PI * 2 * i) / hazardCount + randomRange(-0.32, 0.32);
      const targetDistance = i === 0 ? 0 : randomRange(54, 150 + bossPatternStageState.stageIndex * 10);
      const fifthPosition = fifthCirclePositions?.[i];
      addSafeZone({
        type: "circle",
        safe: true,
        x: fifthPosition ? fifthPosition.x : clamp(
          bossPatternCombatState.player.x + Math.cos(targetAngle) * targetDistance,
          left,
          right,
        ),
        y: fifthPosition ? fifthPosition.y : clamp(
          bossPatternCombatState.player.y + Math.sin(targetAngle) * targetDistance,
          arena.y - arena.height / 2 + 76,
          arena.y + arena.height / 2 - 76,
        ),
        radius: circleRadius,
        life: circleWarningTime,
        maxLife: circleWarningTime,
        damage: boss.damage * (fifthHalfHazard ? 1.32 : 1.08),
        danger: true,
        centerDamage: fifthHalfHazard,
        colorRgb: [255, 64, 88],
        finalColor: "rgba(255,36,60,0.96)",
        resolved: false,
        delay,
      });
    } else {
      addSafeZone({
        type: "rect",
        safe: true,
        x: clamp(x, left, right),
        y: arena.y,
        width: Math.max(48, 78 - bossPatternStageState.stageIndex * 4),
        height: arena.height - 42,
        life: rectWarningTime,
        maxLife: rectWarningTime,
        damage: boss.damage * 1.16,
        danger: true,
        colorRgb: [255, 64, 88],
        finalColor: "rgba(255,36,60,0.96)",
        resolved: false,
        delay,
      });
    }
  }
}

function getBossHazardCooldown(boss) {
  if (bossPatternStageState.stageIndex === 4 && boss.fifthIntermissionActive) {
    return 3.1;
  }

  if (isFifthBossHalfHpHazard(boss)) {
    return 5.4;
  }

  const hazardCooldown = Math.max(1.15, 4.8 - bossPatternStageState.stageIndex * 0.62);
  return boss.enraged ? Math.max(0.75, hazardCooldown * 0.7) : hazardCooldown;
}

function spawnBossShooterMinion(boss, slot, total) {
  if (!bossPatternCombatState.arena) return;

  const stage = currentStage();
  const bossDamageScale = 1 + bossPatternStageState.stageIndex * 0.26;
  const arena = bossPatternCombatState.arena;
  const angle = (Math.PI * 2 * slot) / total + randomRange(-0.25, 0.25);
  const spawnDistance = randomRange(105, 165);
  const x = clamp(
    boss.x + Math.cos(angle) * spawnDistance,
    arena.x - arena.width / 2 + 42,
    arena.x + arena.width / 2 - 42,
  );
  const y = clamp(
    boss.y + Math.sin(angle) * spawnDistance,
    arena.y - arena.height / 2 + 42,
    arena.y + arena.height / 2 - 42,
  );
  const hp = (135 + bossPatternStageState.stageIndex * 42) * stage.enemyHp;

  addEnemy({
    type: "mob",
    variant: "bossShooter",
    summoned: true,
    isLarge: false,
    x,
    y,
    drawRadius: 16,
    hitRadius: 10,
    speed: 62 + bossPatternStageState.stageIndex * 8,
    hp,
    maxHp: hp,
    damage: (12 + bossPatternStageState.stageIndex * 2.4) * stage.bossDamage * bossDamageScale,
    xp: (18 + bossPatternStageState.stageIndex * 8) * getDifficultyXpMultiplier(),
    color: "#ff9f5c",
    chestChance: 0,
    healChance: 0.08,
    rushTimer: 0,
    rushDuration: 0,
    rushAngle: 0,
    attackTimer: randomRange(0.2, 0.5),
    attackCooldownScale: 1,
    shooterAmmo: 16,
    shooterMaxAmmo: 16,
    shooterReloadTimer: 0,
    shooterReloadDuration: 1.65,
    shooterFireInterval: 0.09,
    attackState: null,
    attackWindup: 0,
    attackAngle: 0,
    slashLength: 0,
    slashWidth: 0,
    slashTriggerRange: 0,
  });

  addBurst({
    kind: "ring",
    x,
    y,
    radius: 26,
    life: 0.24,
    maxLife: 0.24,
    color: "rgba(255,159,92,0.9)",
  });
}

function updateBossSummons(boss, dt) {
  if (!areDevBossSummonsEnabled()) return;
  if (bossPatternStageState.stageIndex !== 3) return;

  boss.summonTimer -= dt;
  if (boss.summonTimer > 0) return;

  const activeSummons = bossPatternCombatState.enemies.filter((enemy) => enemy.variant === "bossShooter").length;
  const maxSummons = 4;
  const summonCount = Math.min(2, maxSummons - activeSummons);

  for (let i = 0; i < summonCount; i += 1) {
    spawnBossShooterMinion(boss, activeSummons + i, maxSummons);
  }

  boss.summonTimer = 6.8;
}

function updateBossShield(boss, dt) {
  if (!boss.shieldMax || boss.shield >= boss.shieldMax) return;

  boss.shieldRegenTimer -= dt;
  if (boss.shieldRegenTimer > 0) return;

  boss.shield = boss.shieldMax;
  boss.shieldRegenTimer = boss.shieldRegenDelay;
  addBurst({
    kind: "ring",
    x: boss.x,
    y: boss.y,
    radius: boss.drawRadius + 30,
    life: 0.32,
    maxLife: 0.32,
    color: "rgba(120,232,255,0.95)",
  });
}

function updateBossEnrage(boss) {
  if (bossPatternStageState.stageIndex < 2 || boss.enraged || boss.hp > boss.maxHp / 3) return;

  boss.enraged = true;
  boss.speed *= 1.6;
  boss.hazardTimer = Math.min(boss.hazardTimer, 0.75);
  addBurst({
    kind: "ring",
    x: boss.x,
    y: boss.y,
    radius: boss.drawRadius + 42,
    life: 0.38,
    maxLife: 0.38,
    color: "rgba(255,36,60,0.96)",
  });
}

function moveBossDuringSlash(boss, dt) {
  const angle = Math.atan2(bossPatternCombatState.player.y - boss.y, bossPatternCombatState.player.x - boss.x);
  boss.x += Math.cos(angle) * boss.speed * 1.2 * dt;
  boss.y += Math.sin(angle) * boss.speed * 1.2 * dt;
  if (bossPatternCombatState.arena) {
    const halfWidth = bossPatternCombatState.arena.width / 2 - boss.hitRadius;
    const halfHeight = bossPatternCombatState.arena.height / 2 - boss.hitRadius;
    boss.x = clamp(boss.x, bossPatternCombatState.arena.x - halfWidth, bossPatternCombatState.arena.x + halfWidth);
    boss.y = clamp(boss.y, bossPatternCombatState.arena.y - halfHeight, bossPatternCombatState.arena.y + halfHeight);
  }
}

function blinkBlueSlashEnemy(enemy) {
  const oldX = enemy.x;
  const oldY = enemy.y;
  let angle = Math.atan2(enemy.y - bossPatternCombatState.player.y, enemy.x - bossPatternCombatState.player.x);
  if (!Number.isFinite(angle)) {
    angle = Math.random() * Math.PI * 2;
  }

  const blinkDistance = bossPatternCombatState.player.hitRadius + enemy.hitRadius + 52;
  enemy.x = bossPatternCombatState.player.x + Math.cos(angle) * blinkDistance;
  enemy.y = bossPatternCombatState.player.y + Math.sin(angle) * blinkDistance;

  addBurst({
    kind: "ring",
    x: oldX,
    y: oldY,
    radius: 28,
    life: 0.18,
    maxLife: 0.18,
    color: "rgba(120,232,255,0.85)",
  });
  addBurst({
    kind: "ring",
    x: enemy.x,
    y: enemy.y,
    radius: 34,
    life: 0.22,
    maxLife: 0.22,
    color: "rgba(120,232,255,0.95)",
  });
}

function pickSanctuaryPosition(radius) {
  const arena = bossPatternCombatState.arena;
  if (!arena) {
    return { x: bossPatternCombatState.player.x, y: bossPatternCombatState.player.y };
  }

  const margin = radius + 34;
  const targetAngle = Math.random() * Math.PI * 2;
  const targetDistance = randomRange(70, 170);
  return {
    x: clamp(
      bossPatternCombatState.player.x + Math.cos(targetAngle) * targetDistance,
      arena.x - arena.width / 2 + margin,
      arena.x + arena.width / 2 - margin,
    ),
    y: clamp(
      bossPatternCombatState.player.y + Math.sin(targetAngle) * targetDistance,
      arena.y - arena.height / 2 + margin,
      arena.y + arena.height / 2 - margin,
    ),
  };
}

function getSanctuaryWarningDuration() {
  return Math.max(1, 2 - Math.max(0, bossPatternStageState.stageIndex - 3) * 0.18);
}

function getSanctuaryPulseCount() {
  return Math.max(2, 2 + Math.max(0, bossPatternStageState.stageIndex - 3));
}

function spawnSanctuaryOrbs(attack) {
  if (!bossPatternCombatState.arena || !attack) return;

  const arena = bossPatternCombatState.arena;
  const halfWidth = arena.width / 2 - 34;
  const halfHeight = arena.height / 2 - 34;
  const speed = 170 + bossPatternStageState.stageIndex * 18;
  attack.orbs = [];

  for (let i = 0; i < attack.pulseCount; i += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / attack.pulseCount + randomRange(-0.12, 0.12);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const edgeDistance = Math.min(
      Math.abs(dx) > 0.001 ? halfWidth / Math.abs(dx) : Infinity,
      Math.abs(dy) > 0.001 ? halfHeight / Math.abs(dy) : Infinity,
    );
    const x = arena.x + dx * edgeDistance;
    const y = arena.y + dy * edgeDistance;
    const aim = Math.atan2(bossPatternCombatState.player.y - y, bossPatternCombatState.player.x - x);

    attack.orbs.push({
      x,
      y,
      vx: Math.cos(aim) * speed,
      vy: Math.sin(aim) * speed,
      kind: "sanctuaryOrb",
      damageLabel: "破壊玉",
      drawRadius: 18,
      hitRadius: 16,
      life: 4.8,
      pulseIndex: i,
    });
  }
}

function startBossSanctuary(boss) {
  const radius = 102 + bossPatternStageState.stageIndex * 8;
  const position = pickSanctuaryPosition(radius);
  const warningDuration = getSanctuaryWarningDuration();
  const pulseCount = getSanctuaryPulseCount();
  const pulseSpacing = Math.max(0.22, 0.56 - Math.max(0, bossPatternStageState.stageIndex - 3) * 0.04);
  const total = warningDuration + 2 + pulseSpacing * pulseCount;
  bossPatternCombatState.sanctuaryAttack = {
    x: position.x,
    y: position.y,
    radius,
    timer: total,
    total,
    warningTimer: warningDuration,
    pulseCount,
    pulseSpacing,
    pulses: Array.from({ length: pulseCount }, (_, index) => ({
      timer: pulseSpacing * index,
      done: false,
    })),
    damage: boss.damage * 0.34,
    damageLabel: "持続ダメージゾーン",
    orbs: [],
  };
  boss.phase = {
    type: "sanctuary",
    timer: total,
    total,
  };

  addBurst({
    kind: "ring",
    x: position.x,
    y: position.y,
    radius,
    life: 0.35,
    maxLife: 0.35,
    color: "rgba(120,232,255,0.9)",
  });
}

function finishBossSanctuary() {
  if (bossPatternCombatState.sanctuaryAttack) {
    addBurst({
      kind: "ring",
      x: bossPatternCombatState.sanctuaryAttack.x,
      y: bossPatternCombatState.sanctuaryAttack.y,
      radius: bossPatternCombatState.sanctuaryAttack.radius,
      life: 0.24,
      maxLife: 0.24,
      color: "rgba(255,255,255,0.72)",
    });
  }
  bossPatternCombatState.sanctuaryAttack = null;
}

function updateBossSanctuary(dt) {
  const attack = bossPatternCombatState.sanctuaryAttack;
  if (!attack) return;

  attack.timer = Math.max(0, attack.timer - dt);
  if (attack.warningTimer > 0) {
    attack.warningTimer = Math.max(0, attack.warningTimer - dt);
    if (attack.warningTimer <= 0) {
      spawnSanctuaryOrbs(attack);
    }
    return;
  }

  const player = bossPatternCombatState.player;
  const insideSafe = distance(player, attack) <= attack.radius - player.hitRadius;

  for (const pulse of attack.pulses) {
    if (pulse.done) continue;
    pulse.timer -= dt;
    if (pulse.timer > 0) continue;

    if (!insideSafe) {
      damagePlayer(attack.damage, attack, 120);
    }
    pulse.done = true;
    addBurst({
      kind: "ring",
      x: attack.x,
      y: attack.y,
      radius: attack.radius + 18,
      life: 0.18,
      maxLife: 0.18,
      color: "rgba(255,36,60,0.9)",
    });
  }

  for (let i = attack.orbs.length - 1; i >= 0; i -= 1) {
    const orb = attack.orbs[i];
    orb.life -= dt;
    orb.x += orb.vx * dt;
    orb.y += orb.vy * dt;

    if (distance(orb, player) <= orb.hitRadius + player.hitRadius) {
      if (player.recoveryArmor > 0) {
        player.recoveryArmor = 0;
        player.recoveryArmorTimer = player.recoveryArmorDelay;
        bossPatternRunState.flash = 1;
      } else {
        damagePlayer(attack.damage * 1.45, orb, 160);
      }
      if (attack.pulses[orb.pulseIndex]) {
        attack.pulses[orb.pulseIndex].done = true;
      }
      addBurst({
        kind: "ring",
        x: orb.x,
        y: orb.y,
        radius: 46,
        life: 0.22,
        maxLife: 0.22,
        color: "rgba(255,36,60,0.95)",
      });
      attack.orbs.splice(i, 1);
      continue;
    }

    if (orb.life <= 0 || !isOnScreen(orb.x, orb.y, 120)) {
      attack.orbs.splice(i, 1);
    }
  }

  if (attack.orbs.length === 0 || attack.pulses.every((pulse) => pulse.done) || attack.timer <= 0) {
    finishBossSanctuary();
  }
}

function tryClickSanctuaryOrb() {
  const attack = bossPatternCombatState.sanctuaryAttack;
  const cursor = { x: bossPatternViewState.mouse.worldX, y: bossPatternViewState.mouse.worldY };
  if (!attack?.orbs?.length) return false;

  let hitIndex = -1;
  let bestDistance = Infinity;
  for (let i = 0; i < attack.orbs.length; i += 1) {
    const orb = attack.orbs[i];
    const dist = distance(cursor, orb);
    if (dist <= orb.hitRadius + 18 && dist < bestDistance) {
      hitIndex = i;
      bestDistance = dist;
    }
  }
  if (hitIndex < 0) return false;

  const [orb] = attack.orbs.splice(hitIndex, 1);
  if (attack.pulses[orb.pulseIndex]) {
    attack.pulses[orb.pulseIndex].done = true;
  }
  addBurst({
    kind: "ring",
    x: orb.x,
    y: orb.y,
    radius: 42,
    life: 0.2,
    maxLife: 0.2,
    color: "rgba(255,255,255,0.95)",
  });
  if (attack.orbs.length === 0) {
    finishBossSanctuary();
  }
  return true;
}

function startBossKnifeAttack(boss) {
  boss.phase = {
    type: "knifeAttack",
    timer: 2.35,
    total: 2.35,
    count: 7,
    thrown: 0,
    nextThrow: 0.32,
    warningTimer: 0,
    warningAngle: 0,
    warningX: 0,
    warningY: 0,
    orbitBase: Math.random() * Math.PI * 2,
  };
}

function startBossKatanaAttack(boss) {
  const angle = Math.atan2(bossPatternCombatState.player.y - boss.y, bossPatternCombatState.player.x - boss.x);
  boss.phase = {
    type: "katanaWideWindup",
    timer: 0.62,
    total: 0.62,
    angle,
    radius: 390 + bossPatternStageState.stageIndex * 12,
    arc: Math.PI * 0.84,
  };
}

function isReverseEffectActive() {
  return bossPatternStatusState.reverseHorizontalTimer > 0
    || bossPatternStatusState.reverseVerticalTimer > 0
    || bossPatternStatusState.reverseWarningTimer > 0;
}

function startBossStatusAttack(boss) {
  const modes = ["darkZone", "blinkBan"];
  if (bossPatternStageState.stageIndex >= 2) {
    modes.splice(1, 0, "reverseHorizontal", "reverseVertical");
  }

  let selectable = [...modes];
  if (bossPatternPracticeState.practiceMode) {
    selectable = selectable.filter((mode) => bossPatternPracticeState.practiceStatusToggles[mode] !== false);
  }
  selectable = selectable.filter((mode) => isDevBossStatusModeEnabled(mode));
  if (bossPatternStageState.stageIndex < 4) {
    if (bossPatternStatusState.darkZone) {
      selectable = selectable.filter((mode) => mode !== "reverseHorizontal" && mode !== "reverseVertical");
    }
    if (isReverseEffectActive()) {
      selectable = selectable.filter((mode) => mode !== "darkZone");
    }
  }
  if (!selectable.length) {
    return false;
  }

  const mode = selectable[boss.attackIndex % selectable.length];
  boss.phase = {
    type: "statusAttack",
    timer: 0.78,
    total: 0.78,
    mode,
    radius: 160 + bossPatternStageState.stageIndex * 10,
    orientation: Math.random() < 0.5 ? "horizontal" : "vertical",
    side: Math.random() < 0.5 ? (Math.random() < 0.5 ? "left" : "right") : (Math.random() < 0.5 ? "top" : "bottom"),
    x: bossPatternCombatState.player.x,
    y: bossPatternCombatState.player.y,
  };

  if (boss.phase.orientation === "horizontal") {
    boss.phase.side = Math.random() < 0.5 ? "left" : "right";
  } else {
    boss.phase.side = Math.random() < 0.5 ? "top" : "bottom";
  }

  return true;
}

function startBossPattern(boss) {
  const player = bossPatternCombatState.player;
  const patterns = ["charge", "slash", "volley"];
  if (bossPatternStageState.stageIndex >= 3) patterns.push("sanctuary");
  if (bossPatternStageState.stageIndex >= 1) patterns.push("status");
  if (bossPatternStageState.stageIndex >= 6) patterns.push("knife");
  if (bossPatternStageState.stageIndex >= 7) patterns.push("katana");
  const enabledPatterns = patterns.filter((pattern) => isDevBossPatternEnabled(pattern));
  const patternPool = enabledPatterns.length ? enabledPatterns : patterns;
  const pattern = patternPool[boss.attackIndex % patternPool.length];
  boss.attackIndex += 1;
  const stagePower = bossPatternStageState.stageIndex;

  if (pattern === "charge") {
    const windup = Math.max(0.42, 0.65 - stagePower * 0.045);
    boss.phase = {
      type: "chargeWindup",
      timer: windup,
      total: windup,
      angle: Math.atan2(player.y - boss.y, player.x - boss.x),
    };
    return;
  }

  if (pattern === "slash") {
    const windup = Math.max(0.62, 1.0 - stagePower * 0.07);
    boss.phase = {
      type: "strongSlash",
      timer: windup,
      total: windup,
      angle: Math.atan2(player.y - boss.y, player.x - boss.x),
      radius: 320 + bossPatternStageState.stageIndex * 18,
      arc: Math.PI * 0.86,
      fired: false,
    };
    return;
  }

  if (pattern === "sanctuary") {
    startBossSanctuary(boss);
    return;
  }

  if (pattern === "status") {
    if (!startBossStatusAttack(boss)) {
      startBossPattern(boss);
    }
    return;
  }

  if (pattern === "knife") {
    startBossKnifeAttack(boss);
    return;
  }

  if (pattern === "katana") {
    startBossKatanaAttack(boss);
    return;
  }

  boss.phase = {
    type: "bounceVolley",
    timer: Math.max(0.42, 0.7 - stagePower * 0.055),
    total: Math.max(0.42, 0.7 - stagePower * 0.055),
  };
}

function resolveSafeZone(zone) {
  if (zone.groupId) {
    resolveSafeZoneGroup(zone.groupId);
    return;
  }

  const player = bossPatternCombatState.player;

  const inside = pointInsideSafeZone(player, zone);
  if ((zone.danger && inside) || (!zone.danger && !inside)) {
    damagePlayer(getSafeZoneDamage(zone, player), zone, 310);
  }

  addSafeZoneBurst(zone);
}


