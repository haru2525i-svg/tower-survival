function chooseTarget() {
  let best = null;
  let bestDist = Infinity;
  for (const enemy of state.enemies) {
    if (enemy.hidden) continue;
    const dist = (enemy.x - state.player.x) ** 2 + (enemy.y - state.player.y) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = enemy;
    }
  }
  return best;
}

function getDevSpawnVariantWeights() {
  return [
    { key: "chestElite", weight: 5 },
    { key: "charger", weight: 12 },
    { key: "smokeShade", weight: 3.5 + state.stageIndex * 0.4 },
    { key: "bossShooter", weight: state.stageIndex >= 5 ? 18 + state.stageIndex * 1.8 : 0 },
    { key: "blueSlash", weight: 30 },
    { key: "purpleCaster", weight: 30 },
  ];
}

function pickEnabledEnemyVariant() {
  const candidates = getDevSpawnVariantWeights().filter((entry) => entry.weight > 0 && isDevEnemyVariantEnabled(entry.key));
  if (!candidates.length) return "blueSlash";
  const totalWeight = candidates.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of candidates) {
    roll -= entry.weight;
    if (roll <= 0) return entry.key;
  }
  return candidates[candidates.length - 1].key;
}

function getEnemyColorByVariant(enemyVariant) {
  if (enemyVariant === "chestElite") return "#ffd36b";
  if (enemyVariant === "charger") return "#ff7a4d";
  if (enemyVariant === "smokeShade") return "#1b1d24";
  if (enemyVariant === "bossShooter") return "#ff9f5c";
  return enemyVariant === "blueSlash" ? "#78e8ff" : "#ab92ff";
}

function spawnEnemy(options = {}) {
  const stage = currentStage();
  const angle = Math.random() * Math.PI * 2;
  const spawnDistance = options.nearPlayer ? randomRange(90, 140) : randomRange(260, 390);
  const x = state.player.x + Math.cos(angle) * spawnDistance;
  const y = state.player.y + Math.sin(angle) * spawnDistance;
  const hp = (30 + state.stageIndex * 10 + state.time * 0.55) * stage.enemyHp;
  const speed = (55 + state.stageIndex * 6 + randomRange(-6, 18)) * stage.enemySpeed;
  const forcedVariant = options.forcedVariant ?? null;
  const isChestElite = forcedVariant ? forcedVariant === "chestElite" : Math.random() < 0.05;
  const isCharger = forcedVariant ? forcedVariant === "charger" : (!isChestElite && Math.random() < 0.12);
  const isSmokeShade = forcedVariant
    ? forcedVariant === "smokeShade"
    : (!isChestElite && !isCharger && Math.random() < 0.035 + state.stageIndex * 0.004);
  const isBossShooter = forcedVariant
    ? forcedVariant === "bossShooter"
    : (state.stageIndex >= 5 && !isChestElite && !isCharger && !isSmokeShade && Math.random() < 0.18 + state.stageIndex * 0.018);
  let enemyVariant = forcedVariant
    ?? (isChestElite
      ? "chestElite"
      : (isCharger ? "charger" : (isSmokeShade ? "smokeShade" : (isBossShooter ? "bossShooter" : (Math.random() > 0.5 ? "blueSlash" : "purpleCaster")))));
  if (!forcedVariant && !isDevEnemyVariantEnabled(enemyVariant)) {
    enemyVariant = pickEnabledEnemyVariant();
  }
  const enemyColor = getEnemyColorByVariant(enemyVariant);
  const largeRate = Math.min(0.55, 0.14 + state.stageIndex * 0.04);
  let isLarge = options.forceLarge ?? (enemyVariant === "smokeShade"
    ? Math.random() < Math.min(0.12, 0.02 + state.stageIndex * 0.01)
    : Math.random() < largeRate);
  if (!options.forceLarge && !isDevEnemyVariantEnabled("large")) {
    isLarge = false;
  }
  if (enemyVariant === "chestElite") {
    const largeYellowCount = state.enemies.filter((enemy) => enemy.variant === "chestElite" && enemy.isLarge).length;
    if (largeYellowCount >= 1) {
      isLarge = false;
    }
  }
  if (state.stageIndex >= 2 && enemyVariant === "purpleCaster") {
    const largePurpleCount = state.enemies.filter((enemy) => enemy.variant === "purpleCaster" && enemy.isLarge).length;
    const largePurpleCap = state.stageIndex >= 4 ? 3 : 2;
    if (largePurpleCount >= largePurpleCap) {
      isLarge = false;
    }
  }
  const largePower = 1 + state.stageIndex * 0.22;
  let enemyHp = isChestElite ? hp * 5 : hp;
  let enemySpeed = isChestElite ? speed * 0.82 : (isCharger ? speed * 1.5 : speed);
  let enemyDamage = (10 + state.stageIndex * 2) * stage.enemyDamage * (isChestElite ? 1.25 : (isCharger ? 1.45 : 1));
  let enemyXp = (8 + state.stageIndex * 2) * (isChestElite ? 3 : 1);
  let drawRadius = isChestElite ? 19 : (isCharger ? 13 : 12 + Math.random() * 4);
  let hitRadius = isChestElite ? 13 : (isCharger ? 8 : 8 + Math.random() * 2);
  let attackCooldownScale = 1;
  let slashLength = 96;
  let slashWidth = 42;
  let slashArc = Math.PI * 0.46;
  let slashTriggerRange = 136;
  let preferredDistance = 0;
  let attackRange = 0;
  let smokeRange = 0;
  let smokeArc = Math.PI * 0.42;

  if (enemyVariant === "purpleCaster") {
    preferredDistance = 230 + state.stageIndex * 8;
    attackRange = preferredDistance + 58;
  }

  if (enemyVariant === "chestElite") {
    attackRange = 430 + state.stageIndex * 22;
  }

  if (enemyVariant === "bossShooter") {
    preferredDistance = 265;
    attackRange = 470 + state.stageIndex * 18;
    enemySpeed *= 0.9;
    enemyHp *= 1.35;
    enemyXp *= 1.55;
  }

  if (enemyVariant === "smokeShade") {
    enemySpeed *= 0.92;
    enemyHp *= 1.15;
    enemyDamage *= 0.8;
    enemyXp *= 1.25;
    drawRadius = 15;
    hitRadius = 9;
    smokeRange = 136 + state.stageIndex * 9;
    attackRange = smokeRange + 40;
  }

  if (isLarge) {
    drawRadius *= 1.45;
    hitRadius *= 1.34;
    enemyDamage *= 1 + state.stageIndex * 0.08;
    enemyXp *= 2.2 + state.stageIndex * 0.22;

    if (enemyVariant === "chestElite") {
      enemyHp *= 2 * largePower;
    } else if (enemyVariant === "charger") {
      enemySpeed *= 3 * (1 + state.stageIndex * 0.12);
      enemyHp *= (1.25 + state.stageIndex * 0.14) * 0.5;
      enemyDamage *= 0.5;
    } else if (enemyVariant === "purpleCaster") {
      attackCooldownScale = Math.max(0.12, 0.5 ** (state.stageIndex + 1));
      enemyHp *= 1.2 + state.stageIndex * 0.12;
      preferredDistance += 20;
      attackRange += 26;
    } else if (enemyVariant === "blueSlash") {
      enemyHp *= 1.8 + state.stageIndex * 0.2;
      slashLength *= 1.45 + state.stageIndex * 0.12;
      slashWidth *= 1.25 + state.stageIndex * 0.08;
      slashArc = Math.min(Math.PI * 0.9, Math.PI * 0.46 + state.stageIndex * 0.06);
      slashTriggerRange *= 1.35 + state.stageIndex * 0.08;
    } else if (enemyVariant === "smokeShade") {
      enemyHp *= 1.7 + state.stageIndex * 0.18;
      enemyDamage *= 1.18 + state.stageIndex * 0.06;
      smokeRange *= 2;
      attackRange = smokeRange + 56;
    }
  }

  if (enemyVariant === "blueSlash") {
    enemySpeed *= isLarge ? (1 + state.stageIndex * 0.18) : (1.3 + state.stageIndex * 0.18);
  }

  if (enemyVariant === "purpleCaster") {
    attackCooldownScale *= 2;
  }

  enemyXp *= getDifficultyXpMultiplier();
  const normalChestChance = Math.max(0.002, 0.009 - state.stageIndex * 0.0009) * getDifficultyChestMultiplier();
  let chestChance = Math.min(0.024, normalChestChance);
  if (enemyVariant === "chestElite") {
    chestChance = isLarge ? 1 : 0.5;
  }

  let healChance = 0.015;
  if (enemyVariant === "charger") {
    healChance = isLarge ? 0.24 : 0.18;
  } else if (enemyVariant === "chestElite") {
    healChance = isLarge ? 0.08 : 0.05;
  } else if (enemyVariant === "bossShooter") {
    healChance = 0.012;
  } else if (enemyVariant === "smokeShade") {
    healChance = isLarge ? 0.02 : 0.012;
  }
  healChance = Math.min(0.85, healChance * getDifficultyHealMultiplier());

  addEnemy({
    type: "mob",
    variant: enemyVariant,
    isLarge,
    x,
    y,
    drawRadius,
    hitRadius,
    speed: enemySpeed,
    hp: enemyHp,
    maxHp: enemyHp,
    damage: enemyDamage,
    xp: enemyXp,
    color: enemyColor,
    chestChance,
    healChance,
    rushTimer: isCharger ? randomRange(0.2, 0.9) : 0,
    rushDuration: 0,
    rushAngle: 0,
    attackTimer: enemyVariant === "blueSlash" || enemyVariant === "purpleCaster" || enemyVariant === "chestElite" || enemyVariant === "smokeShade"
      ? randomRange(1.1, 2.4) * attackCooldownScale
      : (enemyVariant === "bossShooter" ? randomRange(0.25, 0.7) : 0),
    shooterAmmo: enemyVariant === "bossShooter" ? 20 : 0,
    shooterMaxAmmo: enemyVariant === "bossShooter" ? 20 : 0,
    shooterReloadTimer: 0,
    shooterReloadDuration: enemyVariant === "bossShooter" ? 1.5 : 0,
    shooterFireInterval: enemyVariant === "bossShooter" ? 0.13 : 0,
    attackCooldownScale,
    attackState: null,
    attackWindup: 0,
    attackAngle: 0,
    slashLength,
    slashWidth,
    slashArc,
    slashTriggerRange,
    preferredDistance,
    attackRange,
    smokeRange,
    smokeArc,
    smokeTimer: enemyVariant === "smokeShade" ? randomRange(0.1, 0.5) : 0,
  });
}

function spawnSmokeFan(enemy) {
  const angle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
  const life = 1;
  const range = enemy.smokeRange ?? 140;
  const speed = range * 0.55;
  const intensity = enemy.isLarge
    ? 1.25 + state.stageIndex * 0.08
    : 0.92 + state.stageIndex * 0.05;

  state.smokeFans.push({
    kind: "smokeFan",
    damageLabel: enemy.isLarge ? "大黒敵の煙" : "黒敵の煙",
    x: enemy.x,
    y: enemy.y,
    angle,
    radius: range,
    arc: enemy.smokeArc ?? Math.PI * 0.42,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life,
    maxLife: life,
    damage: enemy.damage * (enemy.isLarge ? 0.82 : 0.48),
    inkDuration: enemy.isLarge ? 4.6 + state.stageIndex * 0.14 : 3.2 + state.stageIndex * 0.08,
    inkStrength: intensity,
    hitPlayer: false,
  });

  addBurst({
    kind: "fan",
    x: enemy.x,
    y: enemy.y,
    angle,
    radius: range,
    arc: enemy.smokeArc ?? Math.PI * 0.42,
    life: 0.18,
    maxLife: 0.18,
    color: "rgba(12,12,16,0.88)",
  });
}


function applyLightningMark(enemy) {
  const player = state.player;
  if (!enemy || !player || player.lightningMarkLevel <= 0) return;

  enemy.lightningMarkTimer = player.lightningMarkDuration;
  enemy.lightningMarkMaxTimer = player.lightningMarkDuration;
  enemy.lightningMarkAmp = player.lightningMarkDamageAmp;
}

function damageEnemy(enemy, amount, kind = "その他") {
  if (!enemy || amount <= 0) return;
  if (enemy.invulnerable) return;

  if (enemy.lightningMarkTimer > 0 && enemy.lightningMarkAmp > 0) {
    amount *= 1 + enemy.lightningMarkAmp;
  }

  if (enemy.type === "boss" && enemy.shieldMax > 0 && enemy.shield > 0) {
    const absorbed = Math.min(enemy.shield, amount);
    enemy.shield -= absorbed;
    amount -= absorbed;
    enemy.shieldRegenTimer = enemy.shieldRegenDelay;

    if (enemy.shield <= 0) {
      handleBossShieldBreak(enemy);
      addBurst({
        kind: "ring",
        x: enemy.x,
        y: enemy.y,
        radius: enemy.drawRadius + 24,
        life: 0.28,
        maxLife: 0.28,
        color: "rgba(120,232,255,0.95)",
      });
    }
  }

  if (amount > 0) {
    enemy.hp -= amount;
    recordDamageDealt(kind, amount);
  }
}

function applyHitStop(enemy) {
  const player = state.player;
  if (!enemy || !player || player.hitStopLevel <= 0) return;
  if ((enemy.hitStopCooldownTimer ?? 0) > 0) return;

  enemy.hitStopTimer = Math.max(enemy.hitStopTimer ?? 0, player.hitStopDuration);
  enemy.hitStopCooldownTimer = player.hitStopCooldown;
}

function spawnPlayerProjectile(x, y, angle, damage, options = {}) {
  if (state.playerProjectiles.length >= MAX_PLAYER_PROJECTILES) {
    state.playerProjectiles.shift();
  }
  state.playerProjectiles.push({
    kind: options.kind ?? "bullet",
    x,
    y,
    vx: Math.cos(angle) * (options.speed ?? state.player.projectileSpeed),
    vy: Math.sin(angle) * (options.speed ?? state.player.projectileSpeed),
    angle,
    delay: options.delay ?? 0,
    damage,
    damageType: options.damageType ?? "通常弾",
    primary: options.primary ?? false,
    drawRadius: options.drawRadius ?? (5 + state.player.projectileSize),
    hitRadius: options.hitRadius ?? (4 + state.player.projectileSize * 0.7),
    life: options.life ?? 1.4,
    pierceLeft: options.pierce ?? state.player.pierce,
    color: options.color ?? "#fff0a9",
    explosiveRadius: options.explosiveRadius ?? 0,
    chainExplosion: options.chainExplosion ?? false,
    chainDepth: options.chainDepth ?? 0,
    waveArc: options.waveArc ?? 0,
    bossDamageRatio: options.bossDamageRatio ?? 0,
    executeThreshold: options.executeThreshold ?? 0,
    allowLightning: options.allowLightning ?? true,
    hitSet: new Set(),
  });
}

function spawnEnemyProjectile(x, y, angle, speed, damage, options = {}) {
  if (state.enemyProjectiles.length >= MAX_ENEMY_PROJECTILES) {
    state.enemyProjectiles.shift();
  }
  state.enemyProjectiles.push({
    kind: options.kind ?? "enemyProjectile",
    damageLabel: options.damageLabel ?? "敵弾",
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage,
    drawRadius: options.drawRadius ?? 7,
    hitRadius: options.hitRadius ?? 6,
    life: options.life ?? 6,
    bounces: 0,
    maxBounces: options.maxBounces ?? 2,
    color: options.color ?? "#ff8d93",
  });
}

function resolvePlayerProjectileDamage(shot, enemy) {
  const difficultyMultiplier = typeof getPlayerProjectileDamageMultiplier === "function"
    ? getPlayerProjectileDamageMultiplier()
    : 1;
  if (shot.kind !== "criticalLance") {
    return shot.damage * difficultyMultiplier;
  }

  if (enemy.type === "boss") {
    return enemy.maxHp * (shot.bossDamageRatio ?? 0.003) * difficultyMultiplier;
  }

  if ((shot.executeThreshold ?? 0) > 0 && enemy.hp <= enemy.maxHp * shot.executeThreshold) {
    return enemy.hp;
  }

  return shot.damage * difficultyMultiplier;
}

function applyDrop(enemy) {
  if (enemy.type === "boss") {
    if (state.practiceMode) {
      return;
    }
    if (getDevChestDropMode() !== "off") {
      state.pickups.push({
        kind: "chest",
        x: enemy.x,
        y: enemy.y,
        drawRadius: 15,
        hitRadius: 15,
        bob: Math.random() * Math.PI * 2,
        chestTier: "boss",
      });
    }
    if (areDevHealDropsEnabled()) {
      state.pickups.push({
        kind: "heal",
        x: enemy.x + 20,
        y: enemy.y - 12,
        drawRadius: 8,
        hitRadius: 8,
        bob: Math.random() * Math.PI * 2,
        amount: 28,
      });
    }
    return;
  }

  if (areDevXpDropsEnabled()) {
    addXpGem(enemy.x, enemy.y, enemy.xp);
  }

  if (areDevHealDropsEnabled() && Math.random() < enemy.healChance) {
    state.pickups.push({
      kind: "heal",
      x: enemy.x + randomRange(-10, 10),
      y: enemy.y + randomRange(-10, 10),
      drawRadius: 8,
      hitRadius: 8,
      bob: Math.random() * Math.PI * 2,
      amount: 14,
    });
  }

  const chestDropMode = getDevChestDropMode();
  const chestChance = chestDropMode === "always" ? 1 : enemy.chestChance;
  if (chestDropMode !== "off" && Math.random() < chestChance) {
    state.pickups.push({
      kind: "chest",
      x: enemy.x + randomRange(-10, 10),
      y: enemy.y + randomRange(-10, 10),
      drawRadius: enemy.isLarge ? 13 : 12,
      hitRadius: enemy.isLarge ? 13 : 12,
      bob: Math.random() * Math.PI * 2,
      chestTier: enemy.isLarge ? "large" : "normal",
    });
  }
}

function defeatEnemy(index) {
  const enemy = state.enemies[index];
  if (!enemy) return;
  if (enemy.type === "boss") {
    state.bossDefeated = true;
    state.sanctuaryAttack = null;
    if (!state.practiceMode && state.stageIndex >= 7) {
      unlockHiddenRainbowSkills();
    }
    if (!state.practiceMode) {
      unlockBossStage(state.stageIndex);
    }
  } else if (!enemy.summoned) {
    state.stageKills += 1;
  }
  applyDrop(enemy);
  removeEnemyAt(index);
}

function defeatEnemyByRef(enemy) {
  const index = state.enemies.indexOf(enemy);
  if (index >= 0) {
    defeatEnemy(index);
  }
}


function updateProjectiles(dt) {
  for (let i = state.playerProjectiles.length - 1; i >= 0; i -= 1) {
    const shot = state.playerProjectiles[i];
    if (shot.delay > 0) {
      shot.delay -= dt;
      continue;
    }

    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;

    if (shot.life <= 0) {
      state.playerProjectiles.splice(i, 1);
      continue;
    }

    let removeShot = false;
    for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
      const enemy = state.enemies[j];
      if (enemy.hidden) continue;
      if (shot.hitSet.has(enemy)) continue;
      if (distance(shot, enemy) <= shot.hitRadius + enemy.hitRadius) {
        damageEnemy(enemy, resolvePlayerProjectileDamage(shot, enemy), shot.damageType);
        shot.hitSet.add(enemy);
        if (shot.primary) {
          applyHitStop(enemy);
        }
        if (shot.allowLightning) {
          triggerLightningFrom(enemy);
        }

        if (shot.explosiveRadius > 0) {
          explodeAt(shot.x, shot.y, shot.explosiveRadius, shot.damage * 0.8, {
            chainExplosion: shot.chainExplosion,
            chainDepth: shot.chainDepth,
            damageType: shot.damageType,
          });
        }

        if (enemy.hp <= 0) {
          defeatEnemyByRef(enemy);
        }

        if (shot.pierceLeft <= 0) {
          removeShot = true;
          break;
        }
        shot.pierceLeft -= 1;
      }
    }

    if (removeShot || !isOnScreen(shot.x, shot.y, 320)) {
      state.playerProjectiles.splice(i, 1);
    }
  }

  const enemyProjectilesFrozen = isTheWorldActive();
  for (let i = state.enemyProjectiles.length - 1; i >= 0; i -= 1) {
    const shot = state.enemyProjectiles[i];
    if (!enemyProjectilesFrozen) {
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.life -= dt;
    }

    if (!enemyProjectilesFrozen && state.arena) {
      const left = state.arena.x - state.arena.width / 2 + shot.hitRadius;
      const right = state.arena.x + state.arena.width / 2 - shot.hitRadius;
      const top = state.arena.y - state.arena.height / 2 + shot.hitRadius;
      const bottom = state.arena.y + state.arena.height / 2 - shot.hitRadius;
      let bounced = false;

      if (shot.x <= left || shot.x >= right) {
        shot.x = clamp(shot.x, left, right);
        shot.vx *= -1;
        bounced = true;
      }

      if (shot.y <= top || shot.y >= bottom) {
        shot.y = clamp(shot.y, top, bottom);
        shot.vy *= -1;
        bounced = true;
      }

      if (bounced) {
        shot.bounces += 1;
      }
    }

    if (shot.life <= 0 || shot.bounces >= shot.maxBounces || !isOnScreen(shot.x, shot.y, 320)) {
      state.enemyProjectiles.splice(i, 1);
      continue;
    }

    if (distance(shot, state.player) <= shot.hitRadius + state.player.hitRadius) {
      damagePlayer(shot.damage, shot, 275);
      state.enemyProjectiles.splice(i, 1);
    }
  }
}

function collideEnemyWithPlayer(enemy, damage) {
  const player = state.player;
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;
  const minDist = enemy.hitRadius + player.hitRadius;
  if (dist > minDist) return false;

  damagePlayer(damage, enemy, enemy.type === "boss" ? 340 : 230);
  if (enemy.variant === "smokeShade") {
    applyInk(
      enemy.isLarge ? 4.8 + state.stageIndex * 0.12 : 3 + state.stageIndex * 0.08,
      enemy.isLarge ? 1.35 + state.stageIndex * 0.08 : 0.96 + state.stageIndex * 0.05,
    );
  }
  const overlap = minDist - dist;
  const nx = dx / dist;
  const ny = dy / dist;
  const enemyPush = enemy.type === "boss" ? 0 : 0.42;
  player.x += nx * (overlap + 3) * 0.72;
  player.y += ny * (overlap + 3) * 0.72;
  enemy.x -= nx * (overlap + 3) * enemyPush;
  enemy.y -= ny * (overlap + 3) * enemyPush;
  return true;
}

function separateEnemies() {
  const cellSize = 72;
  const grid = new Map();

  for (let i = 0; i < state.enemies.length; i += 1) {
    const enemy = state.enemies[i];
    if (enemy.hidden) continue;
    const cellX = Math.floor(enemy.x / cellSize);
    const cellY = Math.floor(enemy.y / cellSize);
    const key = `${cellX},${cellY}`;
    if (!grid.has(key)) {
      grid.set(key, []);
    }
    grid.get(key).push(i);
  }

  for (let i = 0; i < state.enemies.length; i += 1) {
    const a = state.enemies[i];
    if (a.hidden) continue;
    const cellX = Math.floor(a.x / cellSize);
    const cellY = Math.floor(a.y / cellSize);

    for (let gx = cellX - 1; gx <= cellX + 1; gx += 1) {
      for (let gy = cellY - 1; gy <= cellY + 1; gy += 1) {
        const nearby = grid.get(`${gx},${gy}`);
        if (!nearby) continue;

        for (const j of nearby) {
          if (j <= i) continue;
          const b = state.enemies[j];
          if (b.hidden) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 1;
          const minDist = a.hitRadius + b.hitRadius + 8;
          if (dist >= minDist) continue;

          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          const aWeight = a.type === "boss" ? 0 : (b.type === "boss" ? 1 : 0.5);
          const bWeight = b.type === "boss" ? 0 : (a.type === "boss" ? 1 : 0.5);
          a.x -= nx * overlap * aWeight;
          a.y -= ny * overlap * aWeight;
          b.x += nx * overlap * bWeight;
          b.y += ny * overlap * bWeight;
        }
      }
    }
  }
}

function updateMobSpecialAttack(enemy, dt) {
  if (enemy.variant !== "blueSlash" && enemy.variant !== "purpleCaster" && enemy.variant !== "bossShooter" && enemy.variant !== "chestElite" && enemy.variant !== "smokeShade") {
    return 1;
  }

  enemy.attackTimer -= dt;

  if (enemy.variant === "bossShooter") {
    if (enemy.shooterReloadTimer > 0) {
      enemy.shooterReloadTimer -= dt;
      if (enemy.shooterReloadTimer <= 0) {
        enemy.shooterReloadTimer = 0;
        enemy.shooterAmmo = enemy.shooterMaxAmmo ?? 16;
        enemy.attackTimer = 0.04;
      }
      return 0.55;
    }

    if ((enemy.shooterAmmo ?? 16) <= 0) {
      enemy.shooterReloadTimer = enemy.shooterReloadDuration ?? 1.65;
      return 0.55;
    }

    if (enemy.attackTimer <= 0) {
      const aimed = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
      spawnEnemyProjectile(enemy.x, enemy.y, aimed, 275 + state.stageIndex * 18, enemy.damage * 0.85, {
        drawRadius: 6,
        hitRadius: 5,
        maxBounces: 2,
        color: "#ffb15e",
        life: 7,
        damageLabel: "射撃敵の弾",
      });
      enemy.shooterAmmo = (enemy.shooterAmmo ?? 16) - 1;
      enemy.attackTimer = enemy.shooterFireInterval ?? 0.09;
      if (enemy.shooterAmmo <= 0) {
        enemy.shooterReloadTimer = enemy.shooterReloadDuration ?? 1.65;
      }
      return 0.35;
    }

    return 0.82;
  }

  if (enemy.variant === "chestElite") {
    if (enemy.attackTimer <= 0 && distance(enemy, state.player) <= (enemy.attackRange || 430)) {
      const aimed = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
      const largeShot = enemy.isLarge;
      spawnEnemyProjectile(enemy.x, enemy.y, aimed, largeShot ? 215 + state.stageIndex * 18 : 275 + state.stageIndex * 15, enemy.damage * (largeShot ? 1.18 : 0.72), {
        drawRadius: largeShot ? 14 : 8,
        hitRadius: largeShot ? 12 : 6,
        maxBounces: 1,
        color: largeShot ? "#ffe58a" : "#ffd36b",
        life: 5.6,
        damageLabel: largeShot ? "大黄色敵の弾" : "黄色敵の弾",
      });
      enemy.attackTimer = randomRange(1.6, 2.45) * Math.max(0.55, 1 - state.stageIndex * 0.08);
      return 0.65;
    }

    return 0.92;
  }

  if (enemy.variant === "blueSlash") {
    const slashLength = enemy.slashLength ?? 96;
    const slashWidth = enemy.slashWidth ?? 42;
    const slashTriggerRange = enemy.slashTriggerRange ?? 136;

    if (enemy.attackState === "slashWindup") {
      enemy.attackWindup -= dt;
      enemy.attackAngle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
      if (enemy.attackWindup <= 0) {
        if (enemy.isLarge) {
          const fan = {
            x: enemy.x,
            y: enemy.y,
            angle: enemy.attackAngle,
            radius: slashLength,
            arc: enemy.slashArc ?? Math.PI * 0.46,
          };
          addBurst({
            kind: "fan",
            x: fan.x,
            y: fan.y,
            angle: fan.angle,
            radius: fan.radius,
            arc: fan.arc,
            life: 0.18,
            maxLife: 0.18,
            color: "rgba(120,232,255,0.92)",
          });
          if (pointInBossFan(state.player, fan)) {
            damagePlayer(enemy.damage * 1.12, enemy, 260);
          }
        } else {
          const slash = {
            x: enemy.x,
            y: enemy.y,
            angle: enemy.attackAngle,
            length: slashLength,
            width: slashWidth,
          };
          addBurst({
            kind: "bossSlash",
            x: slash.x,
            y: slash.y,
            angle: slash.angle,
            length: slash.length,
            width: slash.width,
            life: 0.18,
            maxLife: 0.18,
            color: "rgba(120,232,255,0.92)",
          });
          if (pointInBossSlash(state.player, slash)) {
            damagePlayer(enemy.damage * 1.12, enemy, 240);
          }
        }
        enemy.attackState = null;
        enemy.attackTimer = randomRange(1.35, 2.15);
      }
      return 0.35;
    }

    if (enemy.attackTimer <= 0 && distance(enemy, state.player) <= slashTriggerRange) {
      if (enemy.isLarge) {
        blinkBlueSlashEnemy(enemy);
      }
      enemy.attackState = "slashWindup";
      enemy.attackWindup = 0.36;
      enemy.attackAngle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
      return 0.25;
    }
  }

  if (enemy.variant === "purpleCaster" && enemy.attackTimer <= 0 && distance(enemy, state.player) <= (enemy.attackRange || 300)) {
    addSafeZone({
      type: "circle",
      danger: true,
      x: state.player.x,
      y: state.player.y,
      radius: 74 + state.stageIndex * 3,
      life: 1,
      maxLife: 1,
      damage: enemy.damage * 1.18,
      damageLabel: enemy.isLarge ? "大紫敵の魔法" : "紫敵の魔法",
      colorRgb: [171, 92, 255],
      finalColor: "rgba(171,92,255,0.96)",
      resolved: false,
    });
    enemy.attackTimer = randomRange(3.0, 4.4) * (enemy.attackCooldownScale ?? 1);
    return 0.7;
  }

  if (enemy.variant === "smokeShade" && enemy.attackTimer <= 0 && distance(enemy, state.player) <= (enemy.attackRange || 180)) {
    spawnSmokeFan(enemy);
    enemy.attackTimer = randomRange(enemy.isLarge ? 2.8 : 2.0, enemy.isLarge ? 4.0 : 3.2);
    return 0.55;
  }

  return 1;
}

function updateSmokeFans(dt) {
  for (let i = state.smokeFans.length - 1; i >= 0; i -= 1) {
    const fan = state.smokeFans[i];
    fan.life -= dt;
    fan.x += fan.vx * dt;
    fan.y += fan.vy * dt;

    if (!fan.hitPlayer && pointInBossFan(state.player, fan)) {
      fan.hitPlayer = true;
      applyInk(fan.inkDuration, fan.inkStrength);
      damagePlayer(fan.damage, fan, 160);
    }

    if (fan.life <= 0) {
      state.smokeFans.splice(i, 1);
    }
  }
}

function updateEnemies(dt) {
  const player = state.player;
  const orbitalCount = player.orbitals;
  const simulationMode = getDevSimulationMode();

  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];
    enemy.lightningMarkTimer = Math.max(0, (enemy.lightningMarkTimer ?? 0) - dt);
    enemy.hitStopCooldownTimer = Math.max(0, (enemy.hitStopCooldownTimer ?? 0) - dt);
    enemy.hitStopTimer = Math.max(0, (enemy.hitStopTimer ?? 0) - dt);
    if (enemy.hitStopTimer > 0) {
      continue;
    }

    if (enemy.type === "boss") {
      if (simulationMode === "freezeEnemies" || simulationMode === "projectilesOnly") {
        continue;
      }
      updateBoss(enemy, dt);
      if (enemy.hidden) {
        continue;
      }
      for (let o = 0; o < orbitalCount; o += 1) {
        const theta = state.time * 2.6 + (Math.PI * 2 * o) / orbitalCount;
        const ox = player.x + Math.cos(theta) * 56;
        const oy = player.y + Math.sin(theta) * 56;
        if (Math.hypot(enemy.x - ox, enemy.y - oy) <= enemy.hitRadius + 10) {
          damageEnemy(enemy, 86 * dt);
          if (enemy.hp <= 0) {
            defeatEnemy(i);
          }
          break;
        }
      }
      continue;
    }

    if (simulationMode === "freezeEnemies" || simulationMode === "projectilesOnly" || simulationMode === "bossOnly") {
      continue;
    }

    const attackSlow = updateMobSpecialAttack(enemy, dt);
    if (enemy.variant === "smokeShade") {
      enemy.smokeTimer = Math.max(0, (enemy.smokeTimer ?? 0) - dt);
      if (enemy.smokeTimer <= 0) {
        addBurst({
          kind: "ring",
          x: enemy.x + randomRange(-8, 8),
          y: enemy.y + randomRange(-8, 8),
          radius: randomRange(18, 34),
          life: 0.28,
          maxLife: 0.28,
          color: "rgba(0,0,0,0.72)",
        });
        enemy.smokeTimer = state.effectMode === "light" ? 0.9 : 0.42;
      }
    }
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    let moveAngle = angle;
    let moveSpeed = enemy.speed * attackSlow;

    if (enemy.variant === "charger") {
      enemy.rushTimer -= dt;
      if (enemy.rushDuration > 0) {
        enemy.rushDuration -= dt;
        moveAngle = enemy.rushAngle;
        moveSpeed = enemy.speed * 2.85;
      } else if (enemy.rushTimer <= 0) {
        enemy.rushAngle = angle;
        enemy.rushDuration = 0.36;
        enemy.rushTimer = randomRange(1.05, 1.75);
      } else {
        moveSpeed = enemy.speed * 0.85;
      }
    }

    if (enemy.variant === "purpleCaster") {
      const preferredDistance = enemy.preferredDistance || 230;
      const currentDistance = distance(enemy, player);
      const distanceBand = 22;
      if (currentDistance < preferredDistance - distanceBand) {
        moveAngle = angle + Math.PI;
        moveSpeed = enemy.speed * 0.72;
      } else if (currentDistance <= preferredDistance + distanceBand) {
        moveSpeed = 0;
      } else if (currentDistance <= enemy.attackRange) {
        moveSpeed *= 0.38;
      }
    }

    if (enemy.variant === "bossShooter") {
      const preferredDistance = enemy.preferredDistance || 265;
      const currentDistance = distance(enemy, player);
      const distanceBand = 26;
      if (currentDistance < preferredDistance - distanceBand) {
        moveAngle = angle + Math.PI;
        moveSpeed = enemy.speed * 0.78;
      } else if (currentDistance <= preferredDistance + distanceBand) {
        moveSpeed = enemy.speed * 0.18;
      } else if (currentDistance <= enemy.attackRange) {
        moveSpeed *= 0.48;
      }
    }

    enemy.x += Math.cos(moveAngle) * moveSpeed * dt;
    enemy.y += Math.sin(moveAngle) * moveSpeed * dt;

    collideEnemyWithPlayer(enemy, enemy.damage);

    for (let o = 0; o < orbitalCount; o += 1) {
      const theta = state.time * 2.6 + (Math.PI * 2 * o) / orbitalCount;
      const ox = player.x + Math.cos(theta) * 56;
      const oy = player.y + Math.sin(theta) * 56;
      if (Math.hypot(enemy.x - ox, enemy.y - oy) <= enemy.hitRadius + 10) {
        damageEnemy(enemy, 86 * dt);
        if (enemy.hp <= 0) {
          defeatEnemy(i);
        }
        break;
      }
    }
  }

  separateEnemies();
  if (state.stageState === "boss") {
    clampPlayerToArena();
  }
}
