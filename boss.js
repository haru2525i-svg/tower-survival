function spawnBoss() {
  const stage = currentStage();
  state.stageState = "boss";
  state.bossSpawned = true;
  state.bossDefeated = false;
  state.bossDoor = null;
  state.stageIntroTimer = 1.8;
  replaceEnemies([]);
  state.playerProjectiles = [];
  state.enemyProjectiles = [];
  state.pickups = [];
  state.safeZones = [];
  state.sanctuaryAttack = null;
  state.smokeFans = [];

  state.arena = {
    x: state.player.x,
    y: state.player.y,
    width: WIDTH - 70,
    height: HEIGHT - 120,
  };

  state.camera.x = state.arena.x;
  state.camera.y = state.arena.y;
  const bossHp = (820 + state.stageIndex * 300) * stage.bossHp * 2 * (2 ** state.stageIndex)
    * (state.practiceMode ? getPracticeBossHpMultiplier() : 1);
  const bossSpeedScale = (1 + state.stageIndex * 0.16) * stage.bossSpeed;
  const bossCooldownScale = Math.max(0.38, 1 - state.stageIndex * 0.14);
  const bossDamageScale = 1 + state.stageIndex * 0.26;
  const shieldMax = state.stageIndex === 4 ? bossHp * 0.22 : 0;
  const shieldRegenDelay = state.stageIndex === 4 ? 15 : 6.8;

  addEnemy({
    type: "boss",
    x: state.player.x,
    y: state.player.y - 170,
    drawRadius: 38 + state.stageIndex * 2,
    hitRadius: 24 + state.stageIndex * 1.4,
    speed: (88 + state.stageIndex * 8) * bossSpeedScale,
    hp: bossHp,
    maxHp: bossHp,
    damage: (20 + state.stageIndex * 4) * stage.bossDamage * bossDamageScale,
    color: "#ffcf5c",
    attackTimer: Math.max(0.5, 1.2 - state.stageIndex * 0.12),
    attackIndex: 0,
    cooldownBase: Math.max(0.44, stage.bossCooldown * bossCooldownScale),
    hazardTimer: Math.max(1.1, 2.6 - state.stageIndex * 0.25),
    hazardIndex: 0,
    summonTimer: state.stageIndex === 3 ? 3.8 : 0,
    shield: shieldMax,
    shieldMax,
    shieldBaseMax: shieldMax,
    shieldBreakCount: 0,
    shieldRegenDelay,
    shieldRegenTimer: shieldRegenDelay,
    enraged: false,
    hidden: false,
    invulnerable: false,
    fifthIntermissionTriggered: false,
    fifthIntermissionActive: false,
    fifthIntermissionTimer: 0,
    fifthReturnX: 0,
    fifthReturnY: 0,
    phase: null,
  });
}

function getBossShieldRegenDelay(boss) {
  if (state.stageIndex !== 4) return boss.shieldRegenDelay ?? 6.8;
  if ((boss.shieldBreakCount ?? 0) <= 1) return 15;
  if (boss.shieldBreakCount === 2) return 9;
  return 0;
}

function getBossNextShieldMax(boss) {
  const base = boss.shieldBaseMax ?? boss.shieldMax ?? 0;
  if (state.stageIndex !== 4) return base;
  if ((boss.shieldBreakCount ?? 0) === 1) return base * 0.5;
  if (boss.shieldBreakCount === 2) return base * 0.25;
  return 0;
}

function handleBossShieldBreak(boss) {
  if (!boss || boss.type !== "boss") return;

  boss.shieldBreakCount = (boss.shieldBreakCount ?? 0) + 1;
  boss.shield = 0;
  boss.shieldMax = getBossNextShieldMax(boss);
  boss.shieldRegenDelay = getBossShieldRegenDelay(boss);
  boss.shieldRegenTimer = boss.shieldMax > 0 ? boss.shieldRegenDelay : 0;
}

function isFifthBossHalfHpHazard(boss) {
  return state.stageIndex === 4 && (boss.fifthIntermissionTriggered || boss.hp <= boss.maxHp / 2);
}

function spawnFifthBossCornerElite(x, y) {
  const stage = currentStage();
  const baseHp = (30 + state.stageIndex * 10 + state.time * 0.55) * stage.enemyHp;
  const largePower = 1 + state.stageIndex * 0.22;
  const hp = baseHp * 5 * 2 * largePower;
  const damage = (10 + state.stageIndex * 2) * stage.enemyDamage * 1.25 * (1 + state.stageIndex * 0.08);
  const xp = (8 + state.stageIndex * 2) * 3 * (2.2 + state.stageIndex * 0.22) * getDifficultyXpMultiplier();

  addEnemy({
    type: "mob",
    variant: "chestElite",
    summoned: true,
    fifthBossElite: true,
    isLarge: true,
    x,
    y,
    drawRadius: 28,
    hitRadius: 18,
    speed: 72 + state.stageIndex * 5,
    hp,
    maxHp: hp,
    damage,
    xp,
    color: "#ffd36b",
    chestChance: 0,
    healChance: 0,
    rushTimer: 0,
    rushDuration: 0,
    rushAngle: 0,
    attackTimer: randomRange(0.35, 0.9),
    attackCooldownScale: 1,
    attackState: null,
    attackWindup: 0,
    attackAngle: 0,
    slashLength: 0,
    slashWidth: 0,
    slashArc: 0,
    slashTriggerRange: 0,
    preferredDistance: 0,
    attackRange: 430 + state.stageIndex * 22,
  });

  addBurst({
    kind: "ring",
    x,
    y,
    radius: 42,
    life: 0.3,
    maxLife: 0.3,
    color: "rgba(255,211,107,0.95)",
  });
}

function startFifthBossIntermission(boss) {
  if (!state.arena) return;

  const arena = state.arena;
  const margin = 78;
  const left = arena.x - arena.width / 2 + margin;
  const right = arena.x + arena.width / 2 - margin;
  const top = arena.y - arena.height / 2 + margin;
  const bottom = arena.y + arena.height / 2 - margin;

  boss.fifthIntermissionTriggered = true;
  boss.fifthIntermissionActive = true;
  boss.fifthIntermissionTimer = 10;
  boss.fifthReturnX = arena.x;
  boss.fifthReturnY = arena.y - arena.height * 0.28;
  boss.hidden = true;
  boss.invulnerable = true;
  boss.phase = null;
  boss.hazardIndex = 0;
  boss.hazardTimer = 0.28;
  state.enemyProjectiles = [];
  state.safeZones = [];

  addBurst({
    kind: "ring",
    x: boss.x,
    y: boss.y,
    radius: boss.drawRadius + 58,
    life: 0.42,
    maxLife: 0.42,
    color: "rgba(255,207,92,0.95)",
  });

  spawnFifthBossCornerElite(left, top);
  spawnFifthBossCornerElite(right, top);
  spawnFifthBossCornerElite(left, bottom);
  spawnFifthBossCornerElite(right, bottom);
}

function finishFifthBossIntermission(boss) {
  const healAmount = boss.maxHp * 0.125 * countFifthBossElites();
  if (healAmount > 0) {
    boss.hp = Math.min(boss.maxHp, boss.hp + healAmount);
  }

  replaceEnemies(state.enemies.filter((enemy) => !enemy.fifthBossElite));
  boss.x = boss.fifthReturnX || boss.x;
  boss.y = boss.fifthReturnY || boss.y;
  boss.hidden = false;
  boss.invulnerable = false;
  boss.fifthIntermissionActive = false;
  boss.phase = null;
  boss.attackTimer = boss.cooldownBase * 1.25;
  boss.hazardTimer = getBossHazardCooldown(boss) * 0.65;

  addBurst({
    kind: "ring",
    x: boss.x,
    y: boss.y,
    radius: boss.drawRadius + 66,
    life: 0.45,
    maxLife: 0.45,
    color: healAmount > 0 ? "rgba(255,141,147,0.95)" : "rgba(120,232,255,0.95)",
  });
}

function updateFifthBossIntermission(boss, dt) {
  if (state.stageIndex !== 4) return false;

  if (!boss.fifthIntermissionTriggered && boss.hp <= boss.maxHp / 2) {
    startFifthBossIntermission(boss);
  }

  if (!boss.fifthIntermissionActive) return false;

  boss.fifthIntermissionTimer = Math.max(0, boss.fifthIntermissionTimer - dt);
  boss.hazardTimer -= dt;
  if (boss.hazardTimer <= 0) {
    spawnBossHazard(boss);
    boss.hazardTimer = getBossHazardCooldown(boss);
  }

  if (boss.fifthIntermissionTimer <= 0) {
    finishFifthBossIntermission(boss);
  }

  return true;
}


function spawnBossDoor() {
  const angle = state.player.aimAngle || -Math.PI / 2;
  const distanceToDoor = 250;
  state.bossDoor = {
    x: state.player.x + Math.cos(angle) * distanceToDoor,
    y: state.player.y + Math.sin(angle) * distanceToDoor,
    drawRadius: 34,
    hitRadius: 28,
    pulse: 0,
  };

  addBurst({
    kind: "ring",
    x: state.bossDoor.x,
    y: state.bossDoor.y,
    radius: 58,
    life: 0.45,
    maxLife: 0.45,
    color: "rgba(255,207,92,0.95)",
  });
}

function prepareBossDoor() {
  if (state.stageState !== "wave") return;

  state.stageState = "door";
  state.stageIntroTimer = 2;
  state.spawnTimer = 0;
  absorbXpGemsToPlayer();
  spawnBossDoor();
}

function updateBoss(enemy, dt) {
  if (updateFifthBossIntermission(enemy, dt)) {
    return;
  }

  updateBossShield(enemy, dt);
  updateBossSummons(enemy, dt);
  updateBossEnrage(enemy);

  enemy.hazardTimer -= dt;
  if (enemy.hazardTimer <= 0) {
    spawnBossHazard(enemy);
    enemy.hazardTimer = getBossHazardCooldown(enemy);
  }

  if (!enemy.phase) {
    const angle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
    const desiredDistance = 170;
    const dist = distance(enemy, state.player);
    const move = dist > desiredDistance ? 1 : -0.4;
    enemy.x += Math.cos(angle) * enemy.speed * move * dt;
    enemy.y += Math.sin(angle) * enemy.speed * move * dt;
    enemy.attackTimer -= dt;
    if (enemy.attackTimer <= 0) {
      startBossPattern(enemy);
    }
    collideEnemyWithPlayer(enemy, enemy.damage * 0.5);
    return;
  }

  const phase = enemy.phase;
  phase.timer -= dt;

  if (phase.type === "chargeWindup") {
    phase.angle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
    if (phase.timer <= 0) {
      const chargeDuration = 0.46 + state.stageIndex * 0.055;
      const chargeSpeed = 620 + state.stageIndex * 90;
      enemy.phase = {
        type: "charge",
        timer: chargeDuration,
        total: chargeDuration,
        vx: Math.cos(phase.angle) * chargeSpeed,
        vy: Math.sin(phase.angle) * chargeSpeed,
      };
    }
    return;
  }

  if (phase.type === "charge") {
    enemy.x += phase.vx * dt;
    enemy.y += phase.vy * dt;
    collideEnemyWithPlayer(enemy, enemy.damage * 1.1);
    if (phase.timer <= 0) {
      enemy.phase = null;
      enemy.attackTimer = Math.max(0.44, enemy.cooldownBase - 0.12);
    }
    return;
  }

  if (phase.type === "meleeWindup") {
    if (phase.timer <= 0) {
      addBurst({
        kind: "ring",
        x: enemy.x,
        y: enemy.y,
        radius: phase.radius,
        life: 0.24,
        maxLife: 0.24,
        color: "rgba(255,141,147,0.92)",
      });
      if (distance(enemy, state.player) <= phase.radius + state.player.hitRadius) {
        damagePlayer(enemy.damage * 1.35, enemy, 360);
      }
      enemy.phase = null;
      enemy.attackTimer = Math.max(0.44, enemy.cooldownBase - 0.08);
    }
    return;
  }

  if (phase.type === "bounceVolley") {
    if (phase.timer <= 0) {
      const aimed = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
      const volleyScale = enemy.enraged ? 1.25 : 1;
      const radialCount = Math.min(20, Math.ceil((8 + state.stageIndex * 2) * volleyScale));
      const aimedCount = Math.min(8, Math.ceil((3 + state.stageIndex) * volleyScale));
      const maxBounces = enemy.enraged ? 3 : 2;
      for (let i = 0; i < radialCount; i += 1) {
        const angle = aimed + (Math.PI * 2 * i) / radialCount;
        spawnEnemyProjectile(enemy.x, enemy.y, angle, 230 + state.stageIndex * 18, enemy.damage * 0.55, {
          maxBounces,
          damageLabel: "ボス反射弾",
        });
      }
      for (let i = 0; i < aimedCount; i += 1) {
        const offset = (i - (aimedCount - 1) / 2) * 0.16;
        spawnEnemyProjectile(enemy.x, enemy.y, aimed + offset, 320 + state.stageIndex * 22, enemy.damage * 0.72, {
          drawRadius: 8,
          hitRadius: 7,
          maxBounces,
          damageLabel: "ボス反射弾",
        });
      }
      enemy.phase = null;
      enemy.attackTimer = enemy.cooldownBase;
    }
    return;
  }

  if (phase.type === "knifeAttack") {
    phase.orbitBase += dt * 4.8;
    if (phase.warningTimer > 0) {
      phase.warningTimer -= dt;
      if (phase.warningTimer <= 0) {
        spawnEnemyProjectile(
          phase.warningX,
          phase.warningY,
          phase.warningAngle,
          470 + state.stageIndex * 24,
          enemy.damage * 0.82,
          {
            drawRadius: 6,
            hitRadius: 5,
            maxBounces: 0,
            life: 2.4,
            damageLabel: "ボスの投げナイフ",
          },
        );
        phase.thrown += 1;
        phase.nextThrow = 0.13;
      }
      return;
    }

    phase.nextThrow -= dt;
    if (phase.thrown < phase.count && phase.nextThrow <= 0) {
      const orbitAngle = phase.orbitBase + (Math.PI * 2 * phase.thrown) / phase.count;
      phase.warningX = enemy.x + Math.cos(orbitAngle) * 62;
      phase.warningY = enemy.y + Math.sin(orbitAngle) * 62;
      phase.warningAngle = Math.atan2(state.player.y - phase.warningY, state.player.x - phase.warningX);
      phase.warningTimer = 0.16;
      return;
    }

    if (phase.timer <= 0 && phase.thrown >= phase.count) {
      enemy.phase = null;
      enemy.attackTimer = Math.max(0.4, enemy.cooldownBase - 0.12);
    }
    return;
  }

  if (phase.type === "statusAttack") {
    if (phase.mode !== "darkZone") {
      phase.x = state.player.x;
      phase.y = state.player.y;
    }
    if (phase.timer <= 0) {
      if (phase.mode === "darkZone") {
        addDarkZone(phase.orientation, phase.side, 3.4 + state.stageIndex * 0.18);
      } else if (phase.mode === "reverseHorizontal") {
        startReverseWarning("horizontal", 0.95, 3.1 + state.stageIndex * 0.15);
      } else if (phase.mode === "reverseVertical") {
        startReverseWarning("vertical", 0.95, 3.1 + state.stageIndex * 0.15);
      } else {
        addBlinkBanZone(phase.x, phase.y, phase.radius, 4.2 + state.stageIndex * 0.18);
      }
      addBurst({
        kind: phase.mode === "darkZone" ? "rect" : "ring",
        x: phase.mode === "darkZone" ? (state.arena?.x ?? enemy.x) : phase.x,
        y: phase.mode === "darkZone" ? (state.arena?.y ?? enemy.y) : phase.y,
        width: phase.mode === "darkZone" ? (state.arena?.width ?? WIDTH) : undefined,
        height: phase.mode === "darkZone" ? (state.arena?.height ?? HEIGHT) : undefined,
        radius: phase.radius,
        life: 0.26,
        maxLife: 0.26,
        color: phase.mode === "blinkBan"
          ? "rgba(120,232,255,0.95)"
          : (phase.mode === "darkZone" ? "rgba(18,18,24,0.95)" : "rgba(255,36,60,0.9)"),
      });
      enemy.phase = null;
      enemy.attackTimer = enemy.cooldownBase * 1.05;
    }
    return;
  }

  if (phase.type === "katanaWideWindup") {
    phase.angle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
    if (phase.timer <= 0) {
      const wideFan = {
        x: enemy.x,
        y: enemy.y,
        angle: phase.angle,
        radius: phase.radius,
        arc: phase.arc,
      };
      addBurst({
        kind: "fan",
        x: wideFan.x,
        y: wideFan.y,
        angle: wideFan.angle,
        radius: wideFan.radius,
        arc: wideFan.arc,
        life: 0.2,
        maxLife: 0.2,
        color: "rgba(244,241,222,0.95)",
      });
      if (pointInBossFan(state.player, wideFan)) {
        damagePlayer(enemy.damage * 0.92, enemy, 260);
      }

      const oldX = enemy.x;
      const oldY = enemy.y;
      const blinkDistance = state.player.hitRadius + enemy.hitRadius + 70;
      enemy.x = state.player.x - Math.cos(phase.angle) * blinkDistance;
      enemy.y = state.player.y - Math.sin(phase.angle) * blinkDistance;
      if (state.arena) {
        const halfWidth = state.arena.width / 2 - enemy.hitRadius;
        const halfHeight = state.arena.height / 2 - enemy.hitRadius;
        enemy.x = clamp(enemy.x, state.arena.x - halfWidth, state.arena.x + halfWidth);
        enemy.y = clamp(enemy.y, state.arena.y - halfHeight, state.arena.y + halfHeight);
      }

      addBurst({
        kind: "ring",
        x: oldX,
        y: oldY,
        radius: enemy.drawRadius + 20,
        life: 0.18,
        maxLife: 0.18,
        color: "rgba(244,241,222,0.82)",
      });
      addBurst({
        kind: "ring",
        x: enemy.x,
        y: enemy.y,
        radius: enemy.drawRadius + 26,
        life: 0.2,
        maxLife: 0.2,
        color: "rgba(255,48,79,0.92)",
      });

      enemy.phase = {
        type: "katanaCloseWindup",
        timer: 0.14,
        total: 0.14,
        angle: Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x),
        length: 170,
        width: 70,
      };
    }
    return;
  }

  if (phase.type === "katanaCloseWindup") {
    phase.angle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
    if (phase.timer <= 0) {
      const closeSlash = {
        x: enemy.x,
        y: enemy.y,
        angle: phase.angle,
        length: phase.length,
        width: phase.width,
      };
      addBurst({
        kind: "bossSlash",
        x: closeSlash.x,
        y: closeSlash.y,
        angle: closeSlash.angle,
        length: closeSlash.length,
        width: closeSlash.width,
        life: 0.18,
        maxLife: 0.18,
        color: "rgba(255,48,79,0.96)",
      });
      if (pointInBossSlash(state.player, closeSlash)) {
        damagePlayer(enemy.damage * 1.55, enemy, 760 + state.stageIndex * 70);
        state.player.stunTimer = Math.max(state.player.stunTimer, 0.58);
      }
      enemy.phase = null;
      enemy.attackTimer = Math.max(0.48, enemy.cooldownBase * 1.12);
    }
    return;
  }

  if (phase.type === "sanctuary") {
    if (!state.sanctuaryAttack) {
      enemy.phase = null;
      enemy.attackTimer = enemy.cooldownBase;
    }
    return;
  }

  if (phase.type === "safeCircle" || phase.type === "safeRect") {
    if (phase.timer <= 0) {
      for (const zone of state.safeZones) {
        if (!zone.resolved) {
          zone.resolved = true;
          resolveSafeZone(zone);
        }
      }
      enemy.phase = null;
      enemy.attackTimer = Math.max(0.44, enemy.cooldownBase - 0.1);
    }
    return;
  }

  if (phase.type === "strongSlash") {
    if (enemy.enraged) {
      moveBossDuringSlash(enemy, dt);
    }
    if (!phase.fired && phase.timer <= 0) {
      phase.fired = true;
      enemy.phase = {
        type: "strongSlashSweep",
        timer: 0.38,
        total: 0.38,
        angle: phase.angle,
        radius: phase.radius,
        arc: phase.arc,
        width: 72 + state.stageIndex * 5,
        hit: false,
      };
    }
    return;
  }

  if (phase.type === "strongSlashSweep") {
    if (enemy.enraged) {
      moveBossDuringSlash(enemy, dt);
    }
    const sweepAngle = bossSweepAngle(phase);
    const slash = {
      x: enemy.x,
      y: enemy.y,
      angle: sweepAngle,
      length: phase.radius,
      width: phase.width,
    };

    if (!phase.hit && pointInBossSlash(state.player, slash)) {
      phase.hit = true;
      damagePlayer(enemy.damage * 1.65, enemy, 650 + state.stageIndex * 120);
      const sweepPush = 360 + state.stageIndex * 95;
      state.player.knockbackX += -Math.sin(sweepAngle) * sweepPush;
      state.player.knockbackY += Math.cos(sweepAngle) * sweepPush;
    }

    if (phase.timer <= 0) {
      addBurst({
        kind: "fan",
        x: enemy.x,
        y: enemy.y,
        angle: phase.angle,
        radius: phase.radius,
        arc: phase.arc,
        life: 0.16,
        maxLife: 0.16,
        color: "rgba(255,207,92,0.92)",
      });
      enemy.phase = null;
      enemy.attackTimer = Math.max(0.38, enemy.cooldownBase - 0.22);
    }
    return;
  }
}

function updateBossDoor(dt) {
  if (!state.bossDoor) return;

  state.bossDoor.pulse += dt * 3.8;
  if (distance(state.player, state.bossDoor) <= state.player.hitRadius + state.bossDoor.hitRadius) {
    spawnBoss();
  }
}


