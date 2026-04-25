function updateNaturalForce(dt) {
  const { combat } = state;
  const player = combat.player;
  if (!player || player.naturalForceLevel <= 0 || player.hp >= player.maxHp) return;

  const regenPerSecond = player.maxHp * player.naturalForceRegenRate;
  player.hp = Math.min(player.maxHp, player.hp + regenPerSecond * dt);
}

function getCombatPlayer() {
  const { combat } = state;
  return combat.player;
}

function isLaserBeamActive(player = getCombatPlayer()) {
  return Boolean(player && player.laserBeamActiveTimer > 0);
}

function getEffectiveFireCooldown(player) {
  return isLaserBeamActive(player) ? Math.max(0.08, player.fireCooldown / 1.8) : player.fireCooldown;
}

function getEffectiveReloadDuration(player) {
  return isLaserBeamActive(player) ? Math.max(0.28, player.reloadDuration / 2.1) : player.reloadDuration;
}

function getEffectiveProjectileSpeed(player) {
  return isLaserBeamActive(player) ? player.projectileSpeed * 1.8 : player.projectileSpeed;
}

function getEffectivePierce(player) {
  return isLaserBeamActive(player) ? player.pierce * 2 : player.pierce;
}

function activateLaserBeam(player) {
  player.laserBeamActiveTimer = player.laserBeamDuration;
  player.laserBeamCooldownTimer = 0;

  if (player.reloading) {
    const boostedReload = getEffectiveReloadDuration(player);
    player.currentReloadDuration = boostedReload;
    player.reloadTimer = Math.min(player.reloadTimer, boostedReload);
  }

  addBurst({
    kind: "ring",
    x: player.x,
    y: player.y,
    radius: 62,
    life: 0.28,
    maxLife: 0.28,
    color: "rgba(120,232,255,0.95)",
  });
}

function updateLaserBeam(dt) {
  const player = getCombatPlayer();
  if (!player || player.laserBeamLevel <= 0) return;

  if (player.laserBeamActiveTimer > 0) {
    player.laserBeamActiveTimer = Math.max(0, player.laserBeamActiveTimer - dt);
    if (player.laserBeamActiveTimer <= 0) {
      player.laserBeamCooldownTimer = player.laserBeamCooldown;
    }
    return;
  }

  if (player.laserBeamCooldownTimer > 0) {
    player.laserBeamCooldownTimer = Math.max(0, player.laserBeamCooldownTimer - dt);
    return;
  }

  activateLaserBeam(player);
}

function startReload() {
  const { combat, run } = state;
  if (!combat.player || !run.running || run.paused) return;
  const player = combat.player;
  if (player.reloading || player.ammo >= player.maxAmmo) return;
  player.reloading = true;
  player.currentReloadDuration = getEffectiveReloadDuration(player);
  player.reloadTimer = player.currentReloadDuration;
}

function cancelReload() {
  const { combat } = state;
  const player = combat.player;
  if (!player) return;
  player.reloading = false;
  player.reloadTimer = 0;
  player.currentReloadDuration = player.reloadDuration;
}

function scaledCombatDamage(baseAmount, bonusAmount = 0) {
  return baseAmount * (getCombatPlayer()?.damageMultiplier ?? 1) + bonusAmount;
}

function getGunDamage(player = getCombatPlayer()) {
  return scaledCombatDamage(player.baseGunDamage, player.gunDamageBonus);
}

function getSkillShotDamage(player = getCombatPlayer()) {
  return scaledCombatDamage(player.baseSkillShotDamage, player.skillShotDamageBonus);
}

function getStrongSlashDamage(player = getCombatPlayer()) {
  return scaledCombatDamage(player.baseStrongSlashDamage, player.strongSlashDamageBonus);
}

function getExplosionChainDamage(player = getCombatPlayer()) {
  return scaledCombatDamage(player.baseExplosionChainDamage, player.explosionChainDamageBonus);
}

function getTheWorldDuration(level) {
  const durations = [0, 1.0, 1.7, 2.3, 3.0];
  return durations[Math.min(4, Math.max(0, level))] ?? 0;
}

function isTheWorldActive(player = getCombatPlayer()) {
  return Boolean(player && player.theWorldActiveTimer > 0);
}

function getCriticalLanceExecutionThreshold(level) {
  const thresholds = [0, 1 / 6, 1 / 4, 1 / 3, 1 / 2];
  return thresholds[Math.min(4, Math.max(0, level))] ?? 0;
}

function getCriticalLanceLaunchInterval(level) {
  const intervals = [0, 0.5, 0.4, 0.3, 0.2];
  return intervals[Math.min(4, Math.max(0, level))] ?? 0.5;
}

function getCriticalLanceDamage(level) {
  return 26 + level * 10;
}

function activateTheWorld(player) {
  player.theWorldDuration = getTheWorldDuration(player.theWorldLevel);
  player.theWorldActiveTimer = player.theWorldDuration;
  player.theWorldTimer = player.theWorldCooldown;

  addBurst({
    kind: "ring",
    x: player.x,
    y: player.y,
    radius: 96,
    life: 0.36,
    maxLife: 0.36,
    color: "rgba(255,255,255,0.95)",
  });
}

function chooseCriticalLanceTarget(usedTargets = new Set()) {
  const { combat } = state;
  const player = combat.player;
  let best = null;
  let bestDist = Infinity;
  for (const enemy of combat.enemies) {
    if (enemy.hidden || enemy.hp <= 0) continue;
    if (usedTargets.has(enemy)) continue;
    const dist = distance(enemy, player);
    if (dist < bestDist) {
      bestDist = dist;
      best = enemy;
    }
  }
  if (best) return best;
  return chooseTarget();
}

function launchCriticalLance(volley, spear) {
  const player = getCombatPlayer();
  const target = chooseCriticalLanceTarget(volley.usedTargets);
  const angle = target
    ? Math.atan2(target.y - player.y, target.x - player.x)
    : player.aimAngle;

  if (target) {
    volley.usedTargets.add(target);
  }

  spawnPlayerProjectile(
    player.x + Math.cos(spear.angle) * spear.radius,
    player.y + Math.sin(spear.angle) * spear.radius,
    angle,
    getCriticalLanceDamage(player.criticalLanceLevel),
    {
      kind: "criticalLance",
      damageType: "会心槍",
      speed: 760,
      drawRadius: 14,
      hitRadius: 10,
      life: 1.3,
      pierce: player.criticalLanceLevel >= 3 ? 1 : 0,
      color: "#fff4be",
      allowLightning: false,
      bossDamageRatio: 0.003,
      executeThreshold: player.criticalLanceExecutionThreshold,
    },
  );

  addBurst({
    kind: "line",
    fromX: player.x,
    fromY: player.y,
    toX: player.x + Math.cos(angle) * 96,
    toY: player.y + Math.sin(angle) * 96,
    life: 0.14,
    maxLife: 0.14,
    color: "rgba(255,244,190,0.95)",
  });
}

function activateCriticalLance(player) {
  player.criticalLanceTimer = player.criticalLanceCooldown;
  player.criticalLanceExecutionThreshold = getCriticalLanceExecutionThreshold(player.criticalLanceLevel);
  player.criticalLanceLaunchInterval = getCriticalLanceLaunchInterval(player.criticalLanceLevel);
  const { combat } = state;
  combat.lanceVolley = {
    timer: 0,
    usedTargets: new Set(),
    spears: Array.from({ length: 5 }, (_, index) => ({
      angle: (Math.PI * 2 * index) / 5,
      radius: 34,
      launched: false,
      launchAt: 0.35 + index * player.criticalLanceLaunchInterval,
    })),
  };
}

function updateCriticalLanceVolley(dt) {
  const { combat } = state;
  const volley = combat.lanceVolley;
  if (!volley) return;

  volley.timer += dt;
  let activeCount = 0;
  for (const spear of volley.spears) {
    if (spear.launched) continue;
    activeCount += 1;
    spear.angle += dt * 4.6;
    if (volley.timer >= spear.launchAt) {
      spear.launched = true;
      launchCriticalLance(volley, spear);
    }
  }

  if (activeCount <= 0) {
    combat.lanceVolley = null;
  }
}

function tryUseRainbowSkill() {
  const { combat, run } = state;
  if (!run.running || run.paused) return;
  const player = combat.player;
  if (!player?.rainbowSkillChoice) return;

  if (player.rainbowSkillChoice === "theWorld") {
    if (player.theWorldLevel <= 0 || player.theWorldTimer > 0 || player.theWorldActiveTimer > 0) return;
    activateTheWorld(player);
    return;
  }

  if (player.rainbowSkillChoice === "criticalLance") {
    if (player.criticalLanceLevel <= 0 || player.criticalLanceTimer > 0 || combat.lanceVolley) return;
    activateCriticalLance(player);
  }
}

function getMouseAimAngle() {
  const { combat, view } = state;
  updateMouseWorld();
  const player = combat.player;
  return Math.atan2(view.mouse.worldY - player.y, view.mouse.worldX - player.x);
}

function getPrimaryFireAngle() {
  const { combat, view } = state;
  const player = combat.player;
  if (player.autoAttack) {
    const target = chooseTarget();
    if (target) {
      return Math.atan2(target.y - player.y, target.x - player.x);
    }

    if (!view.mouse.down) {
      return null;
    }
  }

  return getMouseAimAngle();
}

function tryFirePrimary() {
  const { combat, run } = state;
  if (!run.running || run.paused) return;
  const player = combat.player;
  if (player.reloading || player.fireTimer > 0) return;
  if (player.ammo <= 0) {
    startReload();
    return;
  }

  cancelReload();

  const angle = getPrimaryFireAngle();
  if (angle === null) return;
  player.aimAngle = angle;
  const laserActive = isLaserBeamActive(player);
  const shots = laserActive ? Math.min(3, 1 + player.multiShot) : 1 + player.multiShot;
  const accuracyFactor = Math.max(0.22, 1 - player.accuracy * 0.18);
  const spread = shots === 1 ? 0 : 0.17 * accuracyFactor;
  for (let i = 0; i < shots; i += 1) {
    const offset = shots === 1 ? 0 : (i - (shots - 1) / 2) * spread;
    spawnPlayerProjectile(player.x, player.y, angle + offset, getGunDamage(player), {
      primary: true,
      damageType: laserActive ? "レーザー" : "通常弾",
      speed: getEffectiveProjectileSpeed(player),
      pierce: getEffectivePierce(player),
      color: laserActive ? "#b8f0ff" : "#fff0a9",
      drawRadius: laserActive ? 7 + player.projectileSize : undefined,
      hitRadius: laserActive ? 6 + player.projectileSize * 0.7 : undefined,
    });
  }
  player.fireTimer = getEffectiveFireCooldown(player);
  player.ammo -= 1;

  if (player.ammo <= 0) {
    startReload();
  }
}

function tryUseSkillShot() {
  const { combat, run } = state;
  if (!run.running || run.paused) return;
  const player = combat.player;
  if (!player.hasSkillShot || player.skillShotTimer > 0) return;
  const angle = getMouseAimAngle();
  player.aimAngle = angle;
  const shots = Math.min(MAX_SKILL_PROJECTILES, player.skillShotCount);
  const spread = shots === 1 ? 0 : Math.min(0.62, 0.18 + shots * 0.035);

  for (let i = 0; i < shots; i += 1) {
    const offset = shots === 1 ? 0 : (i - (shots - 1) / 2) * spread;
    spawnPlayerProjectile(player.x, player.y, angle + offset, getSkillShotDamage(player), {
      damageType: "爆弾",
      speed: player.projectileSpeed * 0.86,
      drawRadius: 10 + player.skillShotLevel * 1.5 + player.skillShotProjectileSize,
      hitRadius: 8 + player.skillShotLevel + player.skillShotProjectileSize * 0.65,
      life: 1.9,
      pierce: 0,
      color: "#78e8ff",
      explosiveRadius: player.skillShotRadius,
      chainExplosion: player.explosionChainLevel > 0,
      chainDepth: Math.min(4, 2 + Math.ceil(player.explosionChainLevel / 2)),
    });
  }
  player.skillShotTimer = player.skillShotCooldown;
}

function queueChainExplosion(x, y, radius, damage, chainDepth, chainGeneration) {
  const { combat } = state;
  const chainExplosionQueue = combat.chainExplosionQueue;
  if (chainDepth <= 0 || damage <= 0) return;

  if (chainExplosionQueue.length >= MAX_PENDING_CHAIN_EXPLOSIONS) {
    chainExplosionQueue.shift();
  }

  chainExplosionQueue.push({
    x,
    y,
    radius,
    damage,
    chainDepth,
    chainGeneration,
    damageType: "爆発連鎖",
  });
}

function updateChainExplosions() {
  const { combat } = state;
  const chainExplosionQueue = combat.chainExplosionQueue;
  const count = Math.min(MAX_CHAIN_EXPLOSIONS_PER_FRAME, chainExplosionQueue.length);
  for (let i = 0; i < count; i += 1) {
    const queued = chainExplosionQueue.shift();
    explodeAt(queued.x, queued.y, queued.radius, queued.damage, {
      chainExplosion: true,
      chainDepth: queued.chainDepth,
      chainGeneration: queued.chainGeneration,
      damageType: queued.damageType,
    });
  }
}

function explodeAt(x, y, radius, damage, options = {}) {
  const { combat } = state;
  const enemies = combat.enemies;
  const chainGeneration = options.chainGeneration ?? 0;
  const visualLife = chainGeneration > 0 ? 0.13 : 0.18;
  const explosionColor = chainGeneration > 0
    ? "rgba(255,132,54,0.94)"
    : "rgba(255,164,72,0.98)";
  addBurst({
    kind: "ring",
    x,
    y,
    radius,
    maxRadius: radius,
    life: visualLife,
    maxLife: visualLife,
    color: explosionColor,
    guaranteed: true,
  });

  const killed = [];
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    if (enemy.hidden) continue;
    if (distance({ x, y }, enemy) <= radius + enemy.hitRadius) {
      damageEnemy(enemy, damage, options.damageType ?? (chainGeneration > 0 ? "爆発連鎖" : "爆弾"));
      if (enemy.hp <= 0) {
        killed.push({ x: enemy.x, y: enemy.y, type: enemy.type });
        defeatEnemy(i);
      }
    }
  }

  if (!options.chainExplosion || options.chainDepth <= 0) return;

  const player = combat.player;
  const chainRadius = Math.max(42, radius * 0.72);
  const chainChance = chainGeneration === 0
    ? Math.min(0.86, 0.5 + player.explosionChainLevel * 0.08)
    : Math.max(0.12, 0.54 - (chainGeneration - 1) * 0.16);
  const chainDamageRate = 0.5 ** (chainGeneration + 1);
  const chainDamage = Math.max(6, Math.max(damage, getExplosionChainDamage(player)) * chainDamageRate);
  for (const enemy of killed) {
    if (enemy.type === "boss") continue;
    if (Math.random() > chainChance) continue;
    queueChainExplosion(
      enemy.x,
      enemy.y,
      chainRadius,
      chainDamage,
      options.chainDepth - 1,
      chainGeneration + 1,
    );
  }
}

function fireSlashWaves(angle) {
  const player = getCombatPlayer();
  if (player.waveSlashLevel <= 0 || player.waveSlashCount <= 0) return;

  const count = Math.min(MAX_WAVE_SLASH_PROJECTILES, player.waveSlashCount);
  const arc = Math.min(player.strongSlashArc, Math.PI * 0.88);
  const speed = 740 + player.waveSlashLevel * 24;
  const life = player.waveSlashRange / speed;
  const waveBase = player.baseWaveSlashDamage + player.baseStrongSlashDamage * 0.52;
  const waveBonus = player.waveSlashDamageBonus + player.strongSlashDamageBonus * 0.52 + player.waveSlashLevel * 18;
  const waveDamage = scaledCombatDamage(waveBase, waveBonus) * 1.5;

  for (let i = 0; i < count; i += 1) {
    spawnPlayerProjectile(player.x, player.y, angle, waveDamage, {
      kind: "slashWave",
      damageType: "波動斬撃",
      speed,
      drawRadius: 12 + player.waveSlashLevel,
      hitRadius: 22 + player.waveSlashLevel * 1.4,
      life,
      pierce: Math.min(3, 1 + Math.floor((player.waveSlashLevel - 1) / 2)),
      color: "#ffeaa3",
      delay: i * 0.13,
      waveArc: arc,
    });
  }
}

function useStrongSlash() {
  const { combat, run } = state;
  const player = combat.player;
  if (!run.running || run.paused) return;
  if (!player.hasStrongSlash || !player.strongSlashReady) return;

  player.strongSlashReady = false;
  player.strongSlashCharge = 0;
  player.strongSlashFlash = 0.2;
  const slashAngle = getMouseAimAngle();
  player.aimAngle = slashAngle;

  addBurst({
    kind: "fan",
    x: player.x,
    y: player.y,
    radius: player.strongSlashRadius,
    angle: slashAngle,
    arc: player.strongSlashArc,
    life: 0.25,
    maxLife: 0.25,
    color: "rgba(255,230,147,0.96)",
  });

  for (let i = combat.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = combat.enemies[i];
    if (enemy.hidden) continue;
    const dist = distance(player, enemy);
    const targetAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
    const inFan = dist <= player.strongSlashRadius + enemy.hitRadius
      && Math.abs(angleDifference(targetAngle, slashAngle)) <= player.strongSlashArc / 2;
    if (inFan) {
      damageEnemy(enemy, getStrongSlashDamage(player), "斬撃");
      if (enemy.hp <= 0) {
        defeatEnemy(i);
      }
    }
  }

  fireSlashWaves(slashAngle);
}

function handleBlink() {
  const { combat, status } = state;
  const player = combat.player;
  if (!player.hasBlink || player.blinkTimer > 0 || !keys.has("Space")) return;
  if (isPlayerInBlinkBanZone()) {
    keys.delete("Space");
    addBurst({
      kind: "ring",
      x: player.x,
      y: player.y,
      radius: 42,
      life: 0.18,
      maxLife: 0.18,
      color: "rgba(30,30,36,0.88)",
    });
    return;
  }

  let vx = getMoveAxis("ArrowLeft", "ArrowRight") + getMoveAxis("KeyA", "KeyD");
  let vy = getMoveAxis("ArrowUp", "ArrowDown") + getMoveAxis("KeyW", "KeyS");
  if (status.reverseHorizontalTimer > 0) vx *= -1;
  if (status.reverseVerticalTimer > 0) vy *= -1;
  if (vx === 0 && vy === 0) {
    vx = Math.cos(player.aimAngle);
    vy = Math.sin(player.aimAngle);
  }

  const len = Math.hypot(vx, vy) || 1;
  player.x += (vx / len) * player.blinkRange;
  player.y += (vy / len) * player.blinkRange;
  player.blinkTimer = player.blinkCooldown;
  player.invuln = Math.max(player.invuln, 0.18);
  keys.delete("Space");

  addBurst({
    kind: "ring",
    x: player.x,
    y: player.y,
    radius: 48,
    life: 0.18,
    maxLife: 0.18,
    color: "rgba(120,232,255,0.9)",
  });
}

function triggerLightningFrom(originEnemy) {
  const { combat } = state;
  const player = combat.player;
  if (
    player.lightningLevel <= 0
    || player.lightningChains <= 0
    || player.lightningTimer > 0
    || combat.enemies.length === 0
  ) return;

  const available = combat.enemies.filter((enemy) => enemy !== originEnemy && !enemy.hidden && enemy.hp > 0);
  const hits = [];
  let chainFrom = originEnemy;
  const maxHits = Math.min(player.lightningChains, available.length);

  while (available.length && hits.length < maxHits) {
    const candidates = available.filter((enemy) => distance(enemy, chainFrom) <= LIGHTNING_CHAIN_RANGE);
    if (!candidates.length) break;

    candidates.sort((a, b) => distance(a, chainFrom) - distance(b, chainFrom));
    const next = candidates[0];
    available.splice(available.indexOf(next), 1);
    hits.push(next);
    chainFrom = next;
  }

  if (!hits.length && player.lightningMarkLevel <= 0) return;

  player.lightningTimer = player.lightningCooldown;
  applyLightningMark(originEnemy);
  let previous = { x: originEnemy.x, y: originEnemy.y };

  for (const enemy of hits) {
    damageEnemy(enemy, player.lightningDamage, "雷");
    applyLightningMark(enemy);
    addBurst({
      kind: "line",
      fromX: previous.x,
      fromY: previous.y,
      toX: enemy.x,
      toY: enemy.y,
      life: 0.28,
      maxLife: 0.28,
      lineStyle: "lightning",
      color: "rgba(255,244,125,0.95)",
    });
    previous = enemy;
  }

  for (let i = combat.enemies.length - 1; i >= 0; i -= 1) {
    if (combat.enemies[i].hp <= 0) {
      defeatEnemy(i);
    }
  }
}

function updateThunderZone(dt) {
  const { combat } = state;
  const player = combat.player;
  if (!player || player.thunderZoneLevel <= 0 || player.lightningMarkLevel <= 0) return;

  player.thunderZoneTimer -= dt;
  if (player.thunderZoneTimer > 0) return;

  player.thunderZoneTimer = 1;
  const radius = player.thunderZoneRadius || 130;
  let marked = 0;
  for (const enemy of combat.enemies) {
    if (enemy.hidden || enemy.hp <= 0) continue;
    if (distance(player, enemy) <= radius + enemy.hitRadius) {
      applyLightningMark(enemy);
      marked += 1;
    }
  }

  if (marked > 0) {
    addBurst({
      kind: "ring",
      x: player.x,
      y: player.y,
      radius,
      life: 0.18,
      maxLife: 0.18,
      color: "rgba(255,36,60,0.92)",
    });
  }
}

function gainXp(amount) {
  const { combat, run, stage } = state;
  const player = combat.player;
  player.xp += amount;
  let levelUps = 0;
  while (player.xp >= player.nextXp) {
    player.xp -= player.nextXp;
    player.level += 1;
    player.nextXp = Math.round(player.nextXp * 1.32);
    levelUps += 1;
  }

  if (levelUps > 0) {
    stage.pendingLevelUps += levelUps;
    if (!run.paused && upgradeOverlay.classList.contains("hidden") && areDevLevelChoicesEnabled()) {
      openQueuedLevelUpgrade();
    }
  }
}

function addXpGem(x, y, xp) {
  const { combat } = state;
  combat.pickups.push({
    kind: "xp",
    x,
    y,
    drawRadius: 5,
    hitRadius: 5,
    bob: Math.random() * Math.PI * 2,
    xp,
  });
}

function absorbXpGemsToPlayer() {
  const { combat } = state;
  const player = combat.player;
  const gems = combat.pickups.filter((pickup) => pickup.kind === "xp");
  if (!gems.length) return;

  let totalXp = 0;
  for (let i = 0; i < gems.length; i += 1) {
    const gem = gems[i];
    totalXp += gem.xp;
    if (i < 28) {
      addBurst({
        kind: "line",
        fromX: gem.x,
        fromY: gem.y,
        toX: player.x,
        toY: player.y,
        life: 0.28,
        maxLife: 0.28,
        color: "rgba(255,244,125,0.95)",
      });
    }
  }

  combat.pickups = combat.pickups.filter((pickup) => pickup.kind !== "xp");
  gainXp(totalXp);
}


function collectPickup(pickup) {
  if (pickup.kind === "xp") {
    gainXp(pickup.xp);
    return;
  }

  if (pickup.kind === "heal") {
    const { combat } = state;
    const player = combat.player;
    player.hp = Math.min(player.maxHp, player.hp + pickup.amount);
    return;
  }

  if (pickup.kind === "chest") {
    if (!areDevChestChoicesEnabled()) {
      return;
    }
    openUpgrade(true, pickup.chestTier ?? "normal");
  }
}


