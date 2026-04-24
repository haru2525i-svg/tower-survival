function drawSkillList() {
  const player = state.player;
  const entries = Object.entries(player.skillLevels)
    .filter(([, level]) => level > 0)
    .map(([key, level]) => ({ key, level, name: player.skillNames[key] ?? key }))
    .slice(-9);
  const rows = Math.max(1, entries.length);
  const panelWidth = 230;
  const panelHeight = 34 + rows * 18;
  const x = 14;
  const y = HEIGHT - panelHeight - 46;

  ctx.fillStyle = "rgba(5, 9, 15, 0.58)";
  ctx.fillRect(x, y, panelWidth, panelHeight);
  ctx.strokeStyle = "rgba(120, 232, 255, 0.28)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, panelWidth, panelHeight);

  ctx.fillStyle = "rgba(255, 232, 167, 0.95)";
  ctx.font = "bold 13px Segoe UI";
  ctx.fillText("取得スキル", x + 10, y + 20);

  ctx.fillStyle = "rgba(237, 243, 255, 0.88)";
  ctx.font = "12px Segoe UI";
  if (!entries.length) {
    ctx.fillText("なし", x + 10, y + 40);
    return;
  }

  for (let i = 0; i < entries.length; i += 1) {
    const item = entries[i];
    const tone = getUpgradeDisplayTone(item.key);
    ctx.fillStyle = tone === "rainbow"
      ? "rgba(255, 248, 252, 0.96)"
      : (tone === "red"
        ? "rgba(255, 210, 218, 0.94)"
        : (tone === "evolution"
          ? "rgba(240, 196, 255, 0.94)"
          : (tone === "rare"
            ? "rgba(184, 243, 255, 0.92)"
            : "rgba(220, 255, 231, 0.9)")));
    ctx.fillText(`${item.name} Lv.${item.level}`, x + 10, y + 40 + i * 18);
  }
}

function miniMapPoint(entity, centerX, centerY) {
  const dx = entity.x - state.player.x;
  const dy = entity.y - state.player.y;
  const dist = Math.hypot(dx, dy);
  if (dist > MINIMAP_RANGE) return null;

  const scale = MINIMAP_RADIUS / MINIMAP_RANGE;
  return {
    x: centerX + dx * scale,
    y: centerY + dy * scale,
    dist,
  };
}

function enemyMiniMapColor(enemy) {
  if (enemy.type === "boss") return "#ffcf5c";
  if (enemy.variant === "bossShooter") return "#ff9f5c";
  if (enemy.variant === "chestElite") return "#ffd36b";
  if (enemy.variant === "charger") return "#ff7a4d";
  if (enemy.variant === "blueSlash") return "#78e8ff";
  if (enemy.variant === "purpleCaster") return "#ab5cff";
  return enemy.color ?? "#edf3ff";
}

function drawMiniMap() {
  if (!state.player) return;

  const radius = MINIMAP_RADIUS;
  const cx = WIDTH - radius - 24;
  const cy = HEIGHT - radius - 86;

  ctx.save();
  ctx.fillStyle = "rgba(5, 9, 15, 0.74)";
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = "rgba(14, 27, 42, 0.9)";
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  ctx.strokeStyle = "rgba(120,232,255,0.13)";
  ctx.lineWidth = 1;
  for (let ring = 1; ring <= 3; ring += 1) {
    ctx.beginPath();
    ctx.arc(cx, cy, (radius * ring) / 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const pickup of state.pickups) {
    if (pickup.kind !== "chest") continue;
    const point = miniMapPoint(pickup, cx, cy);
    if (!point) continue;
    ctx.fillStyle = "#ffd36b";
    ctx.fillRect(point.x - 4, point.y - 4, 8, 8);
    ctx.strokeStyle = "#6b431b";
    ctx.lineWidth = 1;
    ctx.strokeRect(point.x - 4, point.y - 4, 8, 8);
  }

  if (state.bossDoor) {
    const point = miniMapPoint(state.bossDoor, cx, cy);
    if (point) {
      ctx.fillStyle = "#ffd36b";
      ctx.beginPath();
      ctx.moveTo(point.x, point.y - 7);
      ctx.lineTo(point.x + 6, point.y + 5);
      ctx.lineTo(point.x - 6, point.y + 5);
      ctx.closePath();
      ctx.fill();
    }
  }

  for (const enemy of state.enemies) {
    if (enemy.hidden) continue;
    const point = miniMapPoint(enemy, cx, cy);
    if (!point) continue;
    const size = enemy.type === "boss" ? 5 : (enemy.isLarge ? 4 : 3);
    ctx.fillStyle = enemyMiniMapColor(enemy);
    ctx.beginPath();
    ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#edf3ff";
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  ctx.strokeStyle = "rgba(120,232,255,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(237,243,255,0.82)";
  ctx.font = "bold 11px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText("MAP", cx, cy - radius - 12);
  ctx.textAlign = "start";
}

function drawChestEdgeIndicators() {
  const player = state.player;
  if (!player) return;

  const offMapChests = state.pickups
    .filter((pickup) => pickup.kind === "chest" && distance(player, pickup) > MINIMAP_RANGE)
    .sort((a, b) => distance(player, a) - distance(player, b))
    .slice(0, 3);
  if (!offMapChests.length) return;

  const originX = worldToScreenX(player.x);
  const originY = worldToScreenY(player.y);
  const margin = 44;

  for (let i = 0; i < offMapChests.length; i += 1) {
    const chest = offMapChests[i];
    const angle = Math.atan2(chest.y - player.y, chest.x - player.x);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const candidates = [];

    if (dx > 0.001) candidates.push((WIDTH - margin - originX) / dx);
    if (dx < -0.001) candidates.push((margin - originX) / dx);
    if (dy > 0.001) candidates.push((HEIGHT - margin - originY) / dy);
    if (dy < -0.001) candidates.push((margin - originY) / dy);

    const positiveCandidates = candidates.filter((value) => Number.isFinite(value) && value > 0);
    if (!positiveCandidates.length) continue;

    const travel = Math.min(...positiveCandidates);
    const x = clamp(originX + dx * travel, margin, WIDTH - margin);
    const y = clamp(originY + dy * travel + i * 18, margin, HEIGHT - margin);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = "rgba(255,211,107,0.94)";
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(2, -9);
    ctx.lineTo(2, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#c7893f";
    ctx.fillRect(x - 8, y - 7, 16, 14);
    ctx.fillStyle = "#ffd36b";
    ctx.fillRect(x - 5, y - 4, 10, 7);
    ctx.strokeStyle = "#6b431b";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 8, y - 7, 16, 14);
  }
}

function drawStageBanner() {
  if (state.stageIntroTimer <= 0) return;
  const alpha = Math.min(1, state.stageIntroTimer / 0.8);
  ctx.fillStyle = `rgba(255,255,255,${0.16 * alpha})`;
  ctx.fillRect(56, HEIGHT / 2 - 52, WIDTH - 112, 72);
  ctx.fillStyle = `rgba(255,255,255,${0.86 * alpha})`;
  ctx.font = "bold 28px Segoe UI";
  const label = state.stageState === "boss"
    ? `ボス階層 ${state.stageIndex + 1}`
    : (state.stageState === "door" ? "ボス扉 出現" : `階層 ${state.stageIndex + 1}`);
  ctx.fillText(label, 92, HEIGHT / 2 - 8);
}

function drawUiHints() {
  const player = state.player;
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "14px Segoe UI";
  ctx.fillText("左クリック長押し: フルオート", 16, HEIGHT - 20);
  ctx.fillText("R: リロード", 218, HEIGHT - 20);
  ctx.fillText(player.autoAttack ? "F: オート射撃ON" : "F: オート射撃OFF", 320, HEIGHT - 20);

  if (player.reloading) {
    ctx.fillStyle = "rgba(255, 232, 167, 0.92)";
    ctx.font = "bold 18px Segoe UI";
    ctx.fillText(`リロード中 ${player.reloadTimer.toFixed(1)}秒`, WIDTH / 2 - 64, HEIGHT - 46);
  }

  if (state.stageState === "door") {
    ctx.fillStyle = "rgba(255, 211, 107, 0.92)";
    ctx.font = "bold 17px Segoe UI";
    ctx.fillText("ボス扉に入ると戦闘開始", WIDTH / 2 - 98, 62);
  }

  const fifthBoss = state.enemies.find((enemy) => enemy.type === "boss" && enemy.fifthIntermissionActive);
  if (fifthBoss) {
    const remaining = countFifthBossElites();
    ctx.fillStyle = "rgba(255, 211, 107, 0.95)";
    ctx.font = "bold 18px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText(
      `第5層試練: 黄色敵を倒せ ${Math.ceil(fifthBoss.fifthIntermissionTimer)}秒 / 残り${remaining}`,
      WIDTH / 2,
      62,
    );
    ctx.textAlign = "start";
  }
}

function getBlinkBanStatusTimer() {
  let timer = 0;
  for (const zone of state.blinkBanZones) {
    if (zone.warningTimer > 0) continue;
    if (distance(state.player, zone) <= zone.radius + state.player.hitRadius) {
      timer = Math.max(timer, zone.timer);
    }
  }
  return timer;
}

function getStatusEffectEntries() {
  const entries = [];
  const visionTimer = Math.max(
    state.inkTimer,
    state.darkZone && isPlayerInDarkZone(state.darkZone) ? state.darkZone.timer : 0,
  );
  if (visionTimer > 0.05) {
    entries.push({
      key: "vision",
      label: "視界",
      color: "#f3f6ff",
      border: "rgba(255,255,255,0.86)",
      bg: "rgba(16,18,24,0.9)",
      timer: visionTimer,
    });
  }
  if (state.reverseHorizontalTimer > 0.05) {
    entries.push({
      key: "reverseH",
      label: "左右",
      color: "#ffb7bf",
      border: "rgba(255, 96, 116, 0.9)",
      bg: "rgba(44, 12, 16, 0.88)",
      timer: state.reverseHorizontalTimer,
    });
  }
  if (state.reverseVerticalTimer > 0.05) {
    entries.push({
      key: "reverseV",
      label: "上下",
      color: "#ffb7bf",
      border: "rgba(255, 96, 116, 0.9)",
      bg: "rgba(44, 12, 16, 0.88)",
      timer: state.reverseVerticalTimer,
    });
  }
  const blinkBanTimer = getBlinkBanStatusTimer();
  if (blinkBanTimer > 0.05) {
    entries.push({
      key: "blinkBan",
      label: "封印",
      color: "#d9f8ff",
      border: "rgba(120,232,255,0.9)",
      bg: "rgba(8, 24, 52, 0.88)",
      timer: blinkBanTimer,
    });
  }
  return entries;
}

function drawStatusIconSymbol(kind, x, y, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (kind === "reverseH") {
    ctx.beginPath();
    ctx.moveTo(x - size * 0.24, y - size * 0.07);
    ctx.lineTo(x + size * 0.22, y - size * 0.07);
    ctx.moveTo(x + size * 0.22, y - size * 0.07);
    ctx.lineTo(x + size * 0.12, y - size * 0.17);
    ctx.moveTo(x + size * 0.22, y - size * 0.07);
    ctx.lineTo(x + size * 0.12, y + size * 0.03);
    ctx.moveTo(x + size * 0.24, y + size * 0.12);
    ctx.lineTo(x - size * 0.22, y + size * 0.12);
    ctx.moveTo(x - size * 0.22, y + size * 0.12);
    ctx.lineTo(x - size * 0.12, y + size * 0.02);
    ctx.moveTo(x - size * 0.22, y + size * 0.12);
    ctx.lineTo(x - size * 0.12, y + size * 0.22);
    ctx.stroke();
  } else if (kind === "reverseV") {
    ctx.beginPath();
    ctx.moveTo(x - size * 0.1, y + size * 0.24);
    ctx.lineTo(x - size * 0.1, y - size * 0.22);
    ctx.moveTo(x - size * 0.1, y - size * 0.22);
    ctx.lineTo(x - size * 0.2, y - size * 0.12);
    ctx.moveTo(x - size * 0.1, y - size * 0.22);
    ctx.lineTo(x, y - size * 0.12);
    ctx.moveTo(x + size * 0.12, y - size * 0.24);
    ctx.lineTo(x + size * 0.12, y + size * 0.22);
    ctx.moveTo(x + size * 0.12, y + size * 0.22);
    ctx.lineTo(x + size * 0.02, y + size * 0.12);
    ctx.moveTo(x + size * 0.12, y + size * 0.22);
    ctx.lineTo(x + size * 0.22, y + size * 0.12);
    ctx.stroke();
  } else if (kind === "vision") {
    ctx.beginPath();
    ctx.ellipse(x, y, size * 0.26, size * 0.16, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, size * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - size * 0.24, y + size * 0.22);
    ctx.lineTo(x + size * 0.24, y - size * 0.22);
    ctx.stroke();
  } else if (kind === "blinkBan") {
    ctx.beginPath();
    ctx.arc(x, y, size * 0.18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - size * 0.24, y + size * 0.24);
    ctx.lineTo(x + size * 0.24, y - size * 0.24);
    ctx.stroke();
  }

  ctx.restore();
}

function drawRoundHudBadge(cx, cy, radius, options = {}) {
  const {
    fill = "rgba(8, 12, 20, 0.94)",
    stroke = "rgba(255,255,255,0.24)",
    lineWidth = 3,
    glow = null,
  } = options;

  ctx.save();
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 16;
  }
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawRoundHudProgressRing(cx, cy, radius, progress, color, trackColor = "rgba(255,255,255,0.16)", lineWidth = 5) {
  ctx.save();
  ctx.strokeStyle = trackColor;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  if (progress > 0) {
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(progress, 0, 1));
    ctx.stroke();
    ctx.lineCap = "butt";
  }
  ctx.restore();
}

function drawStatusEffectIcons() {
  const entries = getStatusEffectEntries();
  if (!entries.length) return;

  const panel = getSkillCooldownPanelBounds();
  const size = 58;
  const radius = size / 2;
  const gap = 10;
  const startX = panel.x - 10 - size;
  const top = panel.y + 2;

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const left = startX - i * (size + gap);
    const cx = left + radius;
    const cy = top + radius;
    drawRoundHudBadge(cx, cy, radius - 1, {
      fill: entry.bg,
      stroke: entry.border,
      lineWidth: 2.4,
    });
    drawStatusIconSymbol(entry.key, cx, cy - 7, size * 0.9, entry.color);
    ctx.fillStyle = entry.color;
    ctx.font = "bold 9px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText(entry.label, cx, cy + 8);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px Segoe UI";
    ctx.fillText(entry.timer.toFixed(1), cx, cy + 21);
    ctx.textAlign = "start";
  }
}

function getSkillCooldownPanelBounds() {
  const slotWidth = 78;
  const slotHeight = 78;
  const gap = 12;
  return {
    x: WIDTH - 18 - (slotWidth * 2 + gap),
    y: 82,
    slotWidth,
    slotHeight,
    gap,
  };
}

function getSkillCooldownEntries() {
  const player = state.player;
  return [
    {
      key: "Space",
      displayKey: "SP",
      available: player.hasBlink,
      ready: player.blinkTimer <= 0,
      value: player.blinkTimer,
      maxValue: player.blinkCooldown,
      color: "#78e8ff",
    },
    player.rainbowSkillChoice === "criticalLance"
      ? {
        key: "X",
        displayKey: "X",
        available: true,
        ready: player.criticalLanceTimer <= 0 && !state.lanceVolley,
        value: state.lanceVolley
          ? Math.max(0, 0.35 + player.criticalLanceLaunchInterval * 4 - (state.lanceVolley?.timer ?? 0))
          : player.criticalLanceTimer,
        maxValue: player.criticalLanceCooldown,
        activeMaxValue: Math.max(0.2, 0.35 + player.criticalLanceLaunchInterval * 4),
        color: "#ffd36b",
        active: Boolean(state.lanceVolley),
      }
      : {
        key: "X",
        displayKey: "X",
        available: player.rainbowSkillChoice === "theWorld",
        ready: player.theWorldTimer <= 0 && player.theWorldActiveTimer <= 0,
        value: player.theWorldActiveTimer > 0 ? player.theWorldActiveTimer : player.theWorldTimer,
        maxValue: player.theWorldCooldown,
        activeMaxValue: player.theWorldDuration,
        color: "#ffd36b",
        active: player.theWorldActiveTimer > 0,
      },
    {
      key: "E",
      displayKey: "E",
      available: player.hasStrongSlash,
      ready: player.strongSlashReady,
      value: Math.max(0, player.strongSlashCooldown - player.strongSlashCharge),
      maxValue: player.strongSlashCooldown,
      color: "#ffcf5c",
    },
    {
      key: "Q",
      displayKey: "Q",
      available: player.hasSkillShot,
      ready: player.skillShotTimer <= 0,
      value: player.skillShotTimer,
      maxValue: player.skillShotCooldown,
      color: "#78e8ff",
    },
  ];
}

function drawSkillCooldownPanel() {
  const entries = getSkillCooldownEntries();
  const panel = getSkillCooldownPanelBounds();

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const left = panel.x + col * (panel.slotWidth + panel.gap);
    const top = panel.y + row * (panel.slotHeight + panel.gap);
    const cx = left + panel.slotWidth / 2;
    const cy = top + panel.slotHeight / 2;
    const available = entry.available !== false;
    const ready = available && entry.ready;
    const active = available && entry.active;
    const radius = Math.min(panel.slotWidth, panel.slotHeight) / 2 - 6;

    let fillRate = 0;
    if (available) {
      if (active) {
        fillRate = clamp(
          (entry.value || 0) / Math.max(0.01, entry.activeMaxValue || entry.maxValue || 1),
          0,
          1,
        );
      } else if (ready) {
        fillRate = 1;
      } else {
        fillRate = 1 - clamp((entry.value || 0) / Math.max(0.01, entry.maxValue || 1), 0, 1);
      }
    }

    const ringColor = !available
      ? "rgba(255,255,255,0.16)"
      : (ready ? "#78e8ff" : (active ? entry.color : "rgba(255,255,255,0.95)"));
    const fillColor = !available
      ? "rgba(8, 11, 18, 0.92)"
      : (ready ? "rgba(30, 92, 112, 0.62)" : "rgba(9, 14, 22, 0.94)");
    const borderColor = !available
      ? "rgba(255,255,255,0.1)"
      : (ready ? "rgba(184, 240, 255, 0.92)" : "rgba(255,255,255,0.18)");

    drawRoundHudBadge(cx, cy, radius - 6, {
      fill: fillColor,
      stroke: borderColor,
      lineWidth: 2.2,
      glow: ready ? "rgba(120, 232, 255, 0.24)" : null,
    });
    drawRoundHudProgressRing(
      cx,
      cy,
      radius,
      fillRate,
      ringColor,
      "rgba(255,255,255,0.14)",
      5,
    );

    ctx.fillStyle = available ? "#dfeaf8" : "rgba(255,255,255,0.44)";
    ctx.font = "bold 10px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText(entry.displayKey ?? entry.key, cx, cy - 9);

    let statusText = "未";
    if (available) {
      statusText = ready ? "OK" : `${entry.value.toFixed(1)}`;
    }
    ctx.fillStyle = ready ? "rgba(198, 250, 255, 0.98)" : "rgba(255,255,255,0.96)";
    ctx.font = available && !ready ? "bold 15px Segoe UI" : "bold 13px Segoe UI";
    ctx.fillText(statusText, cx, cy + 10);
    ctx.textAlign = "start";
  }
}

function drawDamageVignette() {
  const player = state.player;
  const hpRatio = player ? clamp(player.hp / Math.max(1, player.maxHp), 0, 1) : 1;
  const lowHpRatio = clamp((0.5 - hpRatio) / 0.5, 0, 1);
  const criticalPulse = hpRatio < 0.22
    ? (0.08 + (0.5 + Math.sin(state.time * 7.5) * 0.5) * 0.12) * ((0.22 - hpRatio) / 0.22)
    : 0;
  const lowHpAlpha = Math.min(0.72, Math.pow(lowHpRatio, 1.16) * 0.56 + criticalPulse);
  const alpha = Math.max(clamp(state.flash, 0, 1), lowHpAlpha);
  if (alpha <= 0) return;

  const edge = 112 + lowHpRatio * 28;
  ctx.save();

  let gradient = ctx.createLinearGradient(0, 0, edge, 0);
  gradient.addColorStop(0, `rgba(255, 36, 60, ${0.4 * alpha})`);
  gradient.addColorStop(1, "rgba(255, 36, 60, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, edge, HEIGHT);

  gradient = ctx.createLinearGradient(WIDTH, 0, WIDTH - edge, 0);
  gradient.addColorStop(0, `rgba(255, 36, 60, ${0.4 * alpha})`);
  gradient.addColorStop(1, "rgba(255, 36, 60, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(WIDTH - edge, 0, edge, HEIGHT);

  gradient = ctx.createLinearGradient(0, 0, 0, edge);
  gradient.addColorStop(0, `rgba(255, 36, 60, ${0.34 * alpha})`);
  gradient.addColorStop(1, "rgba(255, 36, 60, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, edge);

  gradient = ctx.createLinearGradient(0, HEIGHT, 0, HEIGHT - edge);
  gradient.addColorStop(0, `rgba(255, 36, 60, ${0.34 * alpha})`);
  gradient.addColorStop(1, "rgba(255, 36, 60, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, HEIGHT - edge, WIDTH, edge);

  ctx.strokeStyle = `rgba(255, 36, 60, ${0.48 * alpha})`;
  ctx.lineWidth = 10 + lowHpRatio * 4;
  ctx.strokeRect(6, 6, WIDTH - 12, HEIGHT - 12);
  ctx.restore();
}

function drawPrimaryAttackOverlay() {
  for (const shot of state.playerProjectiles) {
    if (!shot.primary || shot.delay > 0) continue;
    if (!isOnScreen(shot.x, shot.y, 24)) continue;
    ctx.fillStyle = shot.color ?? "#fff0a9";
    ctx.beginPath();
    ctx.arc(worldToScreenX(shot.x), worldToScreenY(shot.y), shot.drawRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStatusOverlays() {
  if (state.darkZone && isPlayerInDarkZone(state.darkZone)) {
    const px = worldToScreenX(state.player.x);
    const py = worldToScreenY(state.player.y);
    const clearRadius = 108 + Math.sin(state.time * 8) * 6;
    const grad = ctx.createRadialGradient(px, py, clearRadius * 0.55, px, py, clearRadius + 42);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.55, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,1)");
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.restore();
  }

  if (state.darkZoneTransitionFlash > 0) {
    const alpha = clamp(state.darkZoneTransitionFlash / 0.18, 0, 1);
    const progress = 1 - alpha;
    const px = worldToScreenX(state.player.x);
    const py = worldToScreenY(state.player.y);
    ctx.fillStyle = `rgba(255,255,255,${0.1 * alpha})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = `rgba(255,255,255,${0.92 * alpha})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(px, py, 44 + progress * 32, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (isTheWorldActive()) {
    const alpha = 0.08 + (0.5 + Math.sin(state.time * 10) * 0.5) * 0.08;
    ctx.fillStyle = `rgba(190, 236, 255, ${alpha})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.font = "bold 26px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText("ザ・ワールド", WIDTH / 2, 60);
    ctx.font = "bold 15px Segoe UI";
    ctx.fillText("敵弾停止", WIDTH / 2, 84);
    ctx.textAlign = "start";
  }

  if (state.inkTimer > 0) {
    const alpha = Math.min(1, (0.54 + state.inkTimer * 0.12) * (state.inkStrength ?? 1));
    ctx.save();
    const clearRadius = Math.max(88, 132 - Math.min(0.48, (state.inkStrength ?? 1) - 1) * 54)
      + Math.sin(state.time * 9) * 8;
    const px = worldToScreenX(state.player.x);
    const py = worldToScreenY(state.player.y);
    const outer = Math.max(WIDTH, HEIGHT) * 0.72;
    const grad = ctx.createRadialGradient(px, py, clearRadius * 0.35, px, py, outer);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.42, "rgba(0,0,0,0)");
    grad.addColorStop(1, `rgba(0,0,0,${alpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.restore();
  }

  const anyReverseActive = state.reverseHorizontalTimer > 0 || state.reverseVerticalTimer > 0;
  if (state.reverseWarningTimer > 0 || anyReverseActive) {
    const warning = state.reverseWarningTimer > 0;
    const pulse = 0.5 + Math.sin(state.time * 12) * 0.5;
    ctx.fillStyle = warning
      ? `rgba(255,36,60,${0.16 + pulse * 0.16})`
      : `rgba(255,64,88,${0.08 + pulse * 0.08})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "bold 24px Segoe UI";
    ctx.textAlign = "center";
    const reverseLabel = warning
      ? (state.reverseWarningAxis === "vertical" ? "上下反転 警告" : "左右反転 警告")
      : (state.reverseHorizontalTimer > 0 && state.reverseVerticalTimer > 0
        ? "操作反転中"
        : (state.reverseVerticalTimer > 0 ? "上下反転中" : "左右反転中"));
    ctx.fillText(reverseLabel, WIDTH / 2, 96);
    ctx.textAlign = "start";
  }
}

function drawHiddenRainbowAnnouncement() {
  const notice = state.hiddenRainbowAnnouncement;
  if (!notice) return;

  const alpha = clamp(notice.timer / notice.total, 0, 1);
  const pulse = 0.5 + Math.sin(state.time * 8) * 0.5;
  const width = 470;
  const height = 128;
  const x = WIDTH / 2 - width / 2;
  const y = HEIGHT / 2 - height / 2;
  const border = ctx.createLinearGradient(x, y, x + width, y + height);
  border.addColorStop(0, "#ff7b7b");
  border.addColorStop(0.2, "#ffcb6b");
  border.addColorStop(0.4, "#7dff8e");
  border.addColorStop(0.6, "#78e8ff");
  border.addColorStop(0.8, "#a68cff");
  border.addColorStop(1, "#ff86d8");

  ctx.save();
  ctx.fillStyle = `rgba(6, 10, 18, ${0.42 * alpha})`;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.globalAlpha = 0.94;
  ctx.fillStyle = "rgba(9, 15, 24, 0.94)";
  ctx.fillRect(x, y, width, height);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = border;
  ctx.lineWidth = 4 + pulse * 2;
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText(notice.title, WIDTH / 2, y + 44);
  ctx.font = "bold 18px Segoe UI";
  ctx.fillText(notice.subtitle, WIDTH / 2, y + 82);
  ctx.font = "13px Segoe UI";
  ctx.fillText("宝箱からごく低確率で出現", WIDTH / 2, y + 106);
  ctx.textAlign = "start";
  ctx.restore();
}

function drawHud() {
  drawChestEdgeIndicators();
  drawSkillList();
  drawStageBanner();
  drawUiHints();
  drawMiniMap();
  drawDamageVignette();
  drawStatusOverlays();
  if (state.darkZone && isPlayerInDarkZone(state.darkZone)) {
    drawPrimaryAttackOverlay();
    drawCrosshair();
  }
  drawStatusEffectIcons();
  drawSkillCooldownPanel();
  drawHiddenRainbowAnnouncement();
}


