function createPlayer() {
  return {
    x: 0,
    y: 0,
    drawRadius: 16,
    hitRadius: 9,
    speed: 235,
    hp: 100,
    maxHp: 100,
    baseMaxHp: 100,
    maxHpBonus: 0,
    xp: 0,
    nextXp: 36,
    level: 1,
    baseGunDamage: 22,
    gunDamageBonus: 0,
    damage: 22,
    damageMultiplier: 1,
    fireCooldown: 0.44,
    fireTimer: 0,
    autoAttack: true,
    maxAmmo: 16,
    ammo: 16,
    reloadDuration: 1.05,
    reloadTimer: 0,
    currentReloadDuration: 1.05,
    reloading: false,
    projectileSpeed: 680,
    projectileSize: 0,
    projectileSizeLevel: 0,
    pierce: 0,
    orbitals: 0,
    multiShot: 0,
    accuracy: 0,
    gunModLevel: 0,
    hasDemonGunMod: false,
    gunShapeLevel: 0,
    hitStopLevel: 0,
    hitStopDuration: 0,
    hitStopCooldown: 1,
    laserBeamLevel: 0,
    laserBeamDuration: 3,
    laserBeamActiveTimer: 0,
    laserBeamCooldown: 5,
    laserBeamCooldownTimer: 0,
    rainbowSkillChoice: null,
    theWorldLevel: 0,
    theWorldCooldown: 10,
    theWorldTimer: 0,
    theWorldDuration: 0,
    theWorldActiveTimer: 0,
    criticalLanceLevel: 0,
    criticalLanceCooldown: 10,
    criticalLanceTimer: 0,
    criticalLanceExecutionThreshold: 0,
    criticalLanceLaunchInterval: 0.5,
    hasBlink: false,
    blinkLevel: 0,
    blinkCooldown: 3.2,
    blinkTimer: 0,
    blinkRange: 130,
    lightningLevel: 0,
    lightningDamage: 0,
    lightningChains: 0,
    lightningCooldown: 1,
    lightningTimer: 0,
    lightningMarkLevel: 0,
    lightningMarkDamageAmp: 0,
    lightningMarkDuration: 0,
    thunderZoneLevel: 0,
    thunderZoneRadius: 0,
    thunderZoneTimer: 0,
    recoveryArmorLevel: 0,
    recoveryArmorRatio: 0,
    recoveryArmor: 0,
    recoveryArmorMax: 0,
    recoveryArmorDelay: 3,
    recoveryArmorTimer: 0,
    recoveryArmorRegenDuration: 7,
    naturalForceLevel: 0,
    naturalForceRegenRate: 0,
    naturalForceDamageCut: 1,
    breakthroughType: null,
    firepowerBreakthroughLevel: 0,
    healthMonsterLevel: 0,
    healthMonsterMultiplier: 1,
    knockbackX: 0,
    knockbackY: 0,
    stunTimer: 0,
    invuln: 0,
    hasStrongSlash: false,
    strongSlashLevel: 0,
    strongSlashCooldown: 6,
    strongSlashCharge: 0,
    strongSlashRadius: 148,
    strongSlashArc: Math.PI * 0.58,
    baseStrongSlashDamage: 120,
    strongSlashDamageBonus: 0,
    strongSlashDamage: 120,
    strongSlashReady: false,
    strongSlashFlash: 0,
    waveSlashLevel: 0,
    waveSlashCount: 0,
    waveSlashRange: 340,
    baseWaveSlashDamage: 72,
    waveSlashDamageBonus: 0,
    waveSlashDamage: 72,
    hasSkillShot: false,
    skillShotLevel: 0,
    skillShotCooldown: 6,
    skillShotTimer: 0,
    baseSkillShotDamage: 80,
    skillShotDamageBonus: 0,
    skillShotDamage: 80,
    skillShotRadius: 60,
    skillShotProjectileSize: 0,
    skillShotCount: 1,
    explosionChainLevel: 0,
    baseExplosionChainDamage: 70,
    explosionChainDamageBonus: 0,
    explosionChainDamage: 70,
    skillLevels: {},
    skillNames: {},
    aimAngle: -Math.PI / 2,
  };
}

function getBreakthroughMultiplier(level) {
  if (level <= 0) return 1;
  return 1.5 + (Math.min(level, 5) - 1) * 0.125;
}

function getFirepowerBreakthroughMultiplier(level) {
  if (level <= 0) return 1;
  return 1 + Math.min(level, 5) * 0.2;
}

function setFirepowerBreakthroughLevel(player, level) {
  player.firepowerBreakthroughLevel = Math.min(5, Math.max(0, level));
  player.damageMultiplier = getFirepowerBreakthroughMultiplier(player.firepowerBreakthroughLevel);
}

function syncCombatDamageTotals(player) {
  player.damage = player.baseGunDamage + player.gunDamageBonus;
  player.skillShotDamage = player.baseSkillShotDamage + player.skillShotDamageBonus;
  player.strongSlashDamage = player.baseStrongSlashDamage + player.strongSlashDamageBonus;
  player.waveSlashDamage = player.baseWaveSlashDamage + player.waveSlashDamageBonus;
  player.explosionChainDamage = player.baseExplosionChainDamage + player.explosionChainDamageBonus;
}

function increasePlayerBaseCombatDamage(player, amount) {
  player.baseGunDamage += amount;
  player.baseSkillShotDamage += amount * 2.1;
  player.baseStrongSlashDamage += amount * 3.1;
  player.baseWaveSlashDamage += amount * 1.6;
  player.baseExplosionChainDamage += amount * 1.7;
  syncCombatDamageTotals(player);
}

function setNaturalForceLevel(player, level) {
  player.naturalForceLevel = Math.min(5, Math.max(0, level));
  if (player.naturalForceLevel <= 0) {
    player.naturalForceRegenRate = 0;
    player.naturalForceDamageCut = 1;
    return;
  }

  player.naturalForceRegenRate = 0.006 + (player.naturalForceLevel - 1) * 0.002;
  player.naturalForceDamageCut = getBreakthroughMultiplier(player.naturalForceLevel);
}

function refreshPlayerMaxHp(player, bonusHeal = 0) {
  player.baseMaxHp ??= player.maxHp;
  player.healthMonsterMultiplier = getBreakthroughMultiplier(player.healthMonsterLevel ?? 0);
  const oldMax = player.maxHp;
  const nextMax = Math.round(player.baseMaxHp * player.healthMonsterMultiplier + (player.maxHpBonus ?? 0));
  player.maxHp = nextMax;
  player.hp = Math.min(nextMax, player.hp + Math.max(0, nextMax - oldMax) + bonusHeal);
  refreshRecoveryArmorMax(player, true);
}

function setHealthMonsterLevel(player, level) {
  player.healthMonsterLevel = Math.min(5, Math.max(0, level));
  refreshPlayerMaxHp(player);
}

function increasePlayerBaseHp(player, amount, bonusHeal = 0) {
  player.maxHpBonus = (player.maxHpBonus ?? 0) + amount;
  refreshPlayerMaxHp(player, bonusHeal);
}

function increasePlayerTrueBaseHp(player, amount, bonusHeal = 0) {
  player.baseMaxHp = (player.baseMaxHp ?? player.maxHp) + amount;
  refreshPlayerMaxHp(player, bonusHeal);
}

function refreshRecoveryArmorMax(player, fillGained = false) {
  if (!player || player.recoveryArmorRatio <= 0) return;

  const oldMax = player.recoveryArmorMax ?? 0;
  const oldArmor = player.recoveryArmor ?? 0;
  const nextMax = (player.baseMaxHp ?? player.maxHp) * player.recoveryArmorRatio;
  player.recoveryArmorMax = nextMax;

  if (fillGained) {
    const gainedMax = Math.max(0, nextMax - oldMax);
    player.recoveryArmor = oldMax <= 0
      ? nextMax
      : Math.min(nextMax, oldArmor + gainedMax);
    return;
  }

  player.recoveryArmor = Math.min(oldArmor, nextMax);
}

function updateRecoveryArmor(dt) {
  const player = state.player;
  if (!player || player.recoveryArmorMax <= 0) return;

  player.recoveryArmorTimer = Math.max(0, player.recoveryArmorTimer - dt);
  if (player.recoveryArmorTimer > 0 || player.recoveryArmor >= player.recoveryArmorMax) return;

  const regenPerSecond = player.recoveryArmorMax / player.recoveryArmorRegenDuration;
  player.recoveryArmor = Math.min(player.recoveryArmorMax, player.recoveryArmor + regenPerSecond * dt);
}

function knockbackPlayerFrom(source, power = 260) {
  if (!source) return;

  const player = state.player;
  const dx = player.x - source.x;
  const dy = player.y - source.y;
  const dist = Math.hypot(dx, dy) || 1;
  player.knockbackX += (dx / dist) * power;
  player.knockbackY += (dy / dist) * power;

  const maxKnockback = 620;
  const current = Math.hypot(player.knockbackX, player.knockbackY);
  if (current > maxKnockback) {
    player.knockbackX = (player.knockbackX / current) * maxKnockback;
    player.knockbackY = (player.knockbackY / current) * maxKnockback;
  }
}

function describeDamageSource(source) {
  if (!source) return "不明";
  if (source.damageLabel) return source.damageLabel;

  if (source.kind === "enemyProjectile") return "敵弾";
  if (source.kind === "smokeFan") return "黒敵の煙";
  if (source.kind === "sanctuaryOrb") return "破壊玉";

  if (source.type === "boss") {
    return "ボス攻撃";
  }

  switch (source.variant) {
    case "charger":
      return source.isLarge ? "大赤敵の突進" : "赤敵の突進";
    case "blueSlash":
      return source.isLarge ? "大青敵の斬撃" : "青敵の斬撃";
    case "purpleCaster":
      return source.isLarge ? "大紫敵の魔法" : "紫敵の魔法";
    case "smokeShade":
      return source.isLarge ? "大黒敵の煙" : "黒敵の煙";
    case "chestElite":
      return source.isLarge ? "大黄色敵の弾" : "黄色敵の弾";
    case "bossShooter":
      return "射撃敵の弾";
    default:
      break;
  }

  if (source.type === "mob") return "敵の攻撃";
  if (source.type === "circle" || source.type === "rect") {
    return source.danger ? "危険地帯" : "安全地帯失敗";
  }

  return "不明";
}

function damagePlayer(amount, source = null, knockbackPower = 260) {
  const player = state.player;
  if (player.invuln > 0) return false;
  let remainingDamage = amount / Math.max(1, player.naturalForceDamageCut ?? 1);

  if (player.recoveryArmorMax > 0) {
    const absorbed = Math.min(player.recoveryArmor, remainingDamage);
    player.recoveryArmor -= absorbed;
    remainingDamage -= absorbed;
    player.recoveryArmorTimer = player.recoveryArmorDelay;
  }

  if (remainingDamage > 0) {
    player.hp -= remainingDamage;
  }

  state.lastDamageCause = describeDamageSource(source);
  player.invuln = 0.58;
  knockbackPlayerFrom(source, knockbackPower);
  state.flash = 1;
  if (player.hp <= 0) {
    player.hp = 0;
    endGame(false);
  }
  return true;
}

function clampPlayerToArena() {
  if (!state.arena) return;
  const player = state.player;
  const halfWidth = state.arena.width / 2 - 26;
  const halfHeight = state.arena.height / 2 - 26;
  player.x = clamp(player.x, state.arena.x - halfWidth, state.arena.x + halfWidth);
  player.y = clamp(player.y, state.arena.y - halfHeight, state.arena.y + halfHeight);
}

function updatePickups(dt) {
  for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
    const pickup = state.pickups[i];
    pickup.bob += dt * 3;
    const dist = distance(state.player, pickup);
    const magnet = dist < 130 ? 280 : 0;
    if (magnet > 0) {
      const angle = Math.atan2(state.player.y - pickup.y, state.player.x - pickup.x);
      pickup.x += Math.cos(angle) * magnet * dt;
      pickup.y += Math.sin(angle) * magnet * dt;
    }
    if (dist < state.player.hitRadius + pickup.hitRadius + 4) {
      collectPickup(pickup);
      state.pickups.splice(i, 1);
    }
  }
}

function updateBursts(dt) {
  for (let i = state.bursts.length - 1; i >= 0; i -= 1) {
    state.bursts[i].life -= dt;
    if (state.bursts[i].life <= 0) {
      state.bursts.splice(i, 1);
    }
  }
}

function updateSafeZones(dt) {
  for (let i = state.safeZones.length - 1; i >= 0; i -= 1) {
    const zone = state.safeZones[i];

    if (zone.delay > 0) {
      zone.delay = Math.max(0, zone.delay - dt);
      continue;
    }

    zone.life -= dt;
    if (zone.life <= 0) {
      if (!zone.resolved) {
        zone.resolved = true;
        resolveSafeZone(zone);
      }
      state.safeZones.splice(i, 1);
    }
  }
}

function updatePlayer(dt) {
  const player = state.player;
  player.invuln = Math.max(0, player.invuln - dt);
  player.stunTimer = Math.max(0, player.stunTimer - dt);
  player.fireTimer = Math.max(0, player.fireTimer - dt);
  player.skillShotTimer = Math.max(0, player.skillShotTimer - dt);
  player.theWorldTimer = Math.max(0, player.theWorldTimer - dt);
  player.theWorldActiveTimer = Math.max(0, player.theWorldActiveTimer - dt);
  player.criticalLanceTimer = Math.max(0, player.criticalLanceTimer - dt);
  player.blinkTimer = Math.max(0, player.blinkTimer - dt);
  player.lightningTimer = Math.max(0, player.lightningTimer - dt);
  player.strongSlashFlash = Math.max(0, player.strongSlashFlash - dt);
  updateRecoveryArmor(dt);
  updateNaturalForce(dt);
  updateLaserBeam(dt);
  updateThunderZone(dt);
  updateCriticalLanceVolley(dt);

  if (player.ammo <= 0 && !player.reloading) {
    startReload();
  }

  if (player.hasStrongSlash && !player.strongSlashReady) {
    player.strongSlashCharge += dt;
    if (player.strongSlashCharge >= player.strongSlashCooldown) {
      player.strongSlashCharge = player.strongSlashCooldown;
      player.strongSlashReady = true;
    }
  }

  if (player.reloading) {
    player.reloadTimer -= dt;
    if (player.reloadTimer <= 0) {
      player.reloading = false;
      player.reloadTimer = 0;
      player.currentReloadDuration = player.reloadDuration;
      player.ammo = player.maxAmmo;
    }
  }

  let vx = getMoveAxis("ArrowLeft", "ArrowRight") + getMoveAxis("KeyA", "KeyD");
  let vy = getMoveAxis("ArrowUp", "ArrowDown") + getMoveAxis("KeyW", "KeyS");
  if (state.reverseHorizontalTimer > 0) vx *= -1;
  if (state.reverseVerticalTimer > 0) vy *= -1;
  const len = Math.hypot(vx, vy) || 1;
  vx /= len;
  vy /= len;
  if (player.stunTimer <= 0) {
    player.x += vx * player.speed * dt;
    player.y += vy * player.speed * dt;
  }

  player.x += player.knockbackX * dt;
  player.y += player.knockbackY * dt;
  const knockbackDecay = Math.max(0, 1 - dt * 7.5);
  player.knockbackX *= knockbackDecay;
  player.knockbackY *= knockbackDecay;

  const autoTarget = player.autoAttack ? chooseTarget() : null;
  player.aimAngle = autoTarget
    ? Math.atan2(autoTarget.y - player.y, autoTarget.x - player.x)
    : Math.atan2(state.mouse.worldY - player.y, state.mouse.worldX - player.x);
  if (player.stunTimer <= 0) {
    handleBlink();
  }

  if (player.stunTimer <= 0 && (state.mouse.down || player.autoAttack)) {
    tryFirePrimary();
  }

  if (state.stageState === "boss") {
    clampPlayerToArena();
    state.camera.x = state.arena.x;
    state.camera.y = state.arena.y;
  } else {
    state.camera.x += (player.x - state.camera.x) * Math.min(1, dt * 8);
    state.camera.y += (player.y - state.camera.y) * Math.min(1, dt * 8);
  }
}


