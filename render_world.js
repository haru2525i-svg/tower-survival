function drawBackground() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  grad.addColorStop(0, "#182234");
  grad.addColorStop(0.55, "#101724");
  grad.addColorStop(1, "#0b1018");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const offsetX = ((state.camera.x % 40) + 40) % 40;
  const offsetY = ((state.camera.y % 40) + 40) % 40;
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let y = -offsetY; y < HEIGHT + 40; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  for (let x = -offsetX; x < WIDTH + 40; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }

  if (state.stageState === "boss" && state.arena) {
    ctx.strokeStyle = "rgba(255, 207, 92, 0.58)";
    ctx.lineWidth = 4;
    ctx.strokeRect(
      WIDTH / 2 - state.arena.width / 2,
      HEIGHT / 2 - state.arena.height / 2,
      state.arena.width,
      state.arena.height,
    );
  }
}

function drawSafeZones() {
  for (const zone of state.safeZones) {
    if (zone.delay > 0) continue;

    const progress = clamp(1 - zone.life / zone.maxLife, 0, 1);
    const alpha = zone.danger ? 0.18 + 0.34 * progress : Math.max(0.2, zone.life / zone.maxLife);
    const strokeAlpha = zone.danger ? 0.38 + 0.58 * progress : 0.92 * alpha;
    const [r, g, b] = zone.colorRgb ?? (zone.danger ? [255, 64, 88] : [255, 232, 167]);
    if (zone.type === "circle") {
      ctx.fillStyle = zone.danger ? `rgba(${r}, ${g}, ${b}, ${alpha})` : `rgba(255, 64, 88, ${0.13 * alpha})`;
      ctx.beginPath();
      ctx.arc(worldToScreenX(zone.x), worldToScreenY(zone.y), zone.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = zone.danger ? `rgba(${r}, ${g}, ${b}, ${strokeAlpha})` : `rgba(255, 232, 167, ${0.92 * alpha})`;
      ctx.lineWidth = zone.danger ? 3 + progress * 3 : 4;
      ctx.beginPath();
      ctx.arc(worldToScreenX(zone.x), worldToScreenY(zone.y), zone.radius, 0, Math.PI * 2);
      ctx.stroke();
      if (zone.centerDamage) {
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.14 + progress * 0.24})`;
        ctx.beginPath();
        ctx.arc(worldToScreenX(zone.x), worldToScreenY(zone.y), zone.radius * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const sx = worldToScreenX(zone.x) - zone.width / 2;
      const sy = worldToScreenY(zone.y) - zone.height / 2;
      ctx.fillStyle = zone.danger ? `rgba(${r}, ${g}, ${b}, ${alpha})` : `rgba(255, 64, 88, ${0.13 * alpha})`;
      ctx.fillRect(sx, sy, zone.width, zone.height);
      ctx.strokeStyle = zone.danger ? `rgba(${r}, ${g}, ${b}, ${strokeAlpha})` : `rgba(255, 232, 167, ${0.92 * alpha})`;
      ctx.lineWidth = zone.danger ? 3 + progress * 3 : 4;
      ctx.strokeRect(sx, sy, zone.width, zone.height);
    }
  }
}

function getArenaScreenBounds() {
  if (state.arena) {
    return {
      x: WIDTH / 2 - state.arena.width / 2,
      y: HEIGHT / 2 - state.arena.height / 2,
      width: state.arena.width,
      height: state.arena.height,
      centerX: WIDTH / 2,
      centerY: HEIGHT / 2,
    };
  }
  return {
    x: 0,
    y: 0,
    width: WIDTH,
    height: HEIGHT,
    centerX: WIDTH / 2,
    centerY: HEIGHT / 2,
  };
}

function getDarkZoneScreenRect(zone) {
  const bounds = getArenaScreenBounds();
  if (zone.orientation === "horizontal") {
    const width = bounds.width / 2;
    return {
      x: zone.side === "left" ? bounds.x : bounds.centerX,
      y: bounds.y,
      width,
      height: bounds.height,
    };
  }
  const height = bounds.height / 2;
  return {
    x: bounds.x,
    y: zone.side === "top" ? bounds.y : bounds.centerY,
    width: bounds.width,
    height,
  };
}

function drawDarkZone(zone, preview = false) {
  if (!zone) return;
  const rect = getDarkZoneScreenRect(zone);
  const pulse = 0.5 + Math.sin(state.time * 7) * 0.5;
  ctx.fillStyle = preview
    ? `rgba(18, 18, 24, ${0.16 + pulse * 0.1})`
    : "rgba(18, 18, 24, 0.22)";
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeStyle = preview
    ? `rgba(255,255,255,${0.62 + pulse * 0.2})`
    : "rgba(255,255,255,0.28)";
  ctx.lineWidth = preview ? 4 : 2;
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "bold 14px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText(preview ? "視界封印 予告" : "視界封印", rect.x + rect.width / 2, rect.y + 26);
  ctx.textAlign = "start";
}

function drawBossSanctuary() {
  const attack = state.sanctuaryAttack;
  if (!attack) return;

  const sx = worldToScreenX(attack.x);
  const sy = worldToScreenY(attack.y);
  const progress = clamp(1 - attack.timer / attack.total, 0, 1);
  const pulse = 0.5 + Math.sin(state.time * 8) * 0.5;
  const warning = attack.warningTimer > 0;
  const pendingCount = attack.pulses?.filter((item) => !item.done).length ?? 0;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, WIDTH, HEIGHT);
  ctx.arc(sx, sy, attack.radius, 0, Math.PI * 2, true);
  ctx.fillStyle = warning
    ? `rgba(255, 156, 92, ${0.08 + pulse * 0.04})`
    : `rgba(255, 36, 60, ${0.16 + pulse * 0.06})`;
  ctx.fill("evenodd");

  ctx.strokeStyle = warning
    ? `rgba(255, 220, 148, ${0.62 + pulse * 0.24})`
    : `rgba(120, 232, 255, ${0.64 + pulse * 0.26})`;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(sx, sy, attack.radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = warning
    ? `rgba(255, 224, 158, ${0.06 + progress * 0.05})`
    : `rgba(120, 232, 255, ${0.08 + progress * 0.05})`;
  ctx.beginPath();
  ctx.arc(sx, sy, attack.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "bold 15px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText(
    warning
      ? `安全地帯予告 ${attack.warningTimer.toFixed(1)}秒`
      : `安全地帯 残り${pendingCount}波`,
    sx,
    sy - attack.radius - 12,
  );
  ctx.textAlign = "start";

  for (const orb of attack.orbs ?? []) {
    const ox = worldToScreenX(orb.x);
    const oy = worldToScreenY(orb.y);
    ctx.fillStyle = "rgba(255, 48, 79, 0.94)";
    ctx.beginPath();
    ctx.arc(ox, oy, orb.drawRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.moveTo(ox - 5, oy - 11);
    ctx.lineTo(ox + 10, oy + 1);
    ctx.lineTo(ox + 2, oy + 4);
    ctx.lineTo(ox + 6, oy + 13);
    ctx.lineTo(ox + 1, oy + 15);
    ctx.lineTo(ox - 3, oy + 6);
    ctx.lineTo(ox - 10, oy + 11);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawActiveDarkZone() {
  if (!state.darkZone) return;
  drawDarkZone(state.darkZone, false);
}

function getVisionFocusRadius() {
  const darkRadius = 108 + Math.sin(state.time * 8) * 6;
  const inkRadius = Math.max(88, 132 - Math.min(0.48, (state.inkStrength ?? 1) - 1) * 54);

  if (state.darkZone && isPlayerInDarkZone(state.darkZone) && state.inkTimer > 0) {
    return Math.min(darkRadius, inkRadius);
  }
  if (state.darkZone && isPlayerInDarkZone(state.darkZone)) {
    return darkRadius;
  }
  if (state.inkTimer > 0) {
    return inkRadius;
  }
  return Infinity;
}

function isVisionCullingActive() {
  return state.effectMode === "light" && isVisionSealActive();
}

function isVisionCulled(x, y, padding = 0) {
  if (!isVisionCullingActive() || !state.player) return false;
  return distance(state.player, { x, y }) > getVisionFocusRadius() + padding;
}

function drawBossDoor() {
  const door = state.bossDoor;
  if (!door || !isOnScreen(door.x, door.y, 90)) return;

  const sx = worldToScreenX(door.x);
  const sy = worldToScreenY(door.y);
  const pulse = 0.5 + Math.sin(door.pulse) * 0.5;

  ctx.fillStyle = `rgba(255, 207, 92, ${0.14 + pulse * 0.12})`;
  ctx.beginPath();
  ctx.arc(sx, sy, 58 + pulse * 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(12, 18, 30, 0.9)";
  ctx.strokeStyle = "#ffd36b";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(sx, sy, 28, 46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = `rgba(120, 232, 255, ${0.45 + pulse * 0.35})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(sx, sy, 17 + pulse * 3, 32 + pulse * 4, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "bold 14px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText("ボス扉", sx, sy - 58);
  ctx.textAlign = "start";
}

function drawPracticeDoors() {
  if (!state.practiceMode || state.stageState !== "practiceHub") return;

  for (const door of state.practiceDoors) {
    const sx = worldToScreenX(door.x);
    const sy = worldToScreenY(door.y);
    const pulse = 0.5 + Math.sin(door.pulse) * 0.5;

    ctx.fillStyle = `rgba(120, 232, 255, ${0.12 + pulse * 0.12})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 52 + pulse * 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(10, 18, 26, 0.92)";
    ctx.strokeStyle = "#78e8ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 25, 41, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.font = "bold 14px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText(`${door.stageIndex + 1}階層`, sx, sy - 54);
    ctx.textAlign = "start";
  }
}

function drawPickups() {
  for (const pickup of state.pickups) {
    if (!isOnScreen(pickup.x, pickup.y, 24)) continue;
    if (pickup.kind !== "chest" && isVisionCulled(pickup.x, pickup.y, 20)) continue;
    const sx = worldToScreenX(pickup.x);
    const sy = worldToScreenY(pickup.y) + Math.sin(pickup.bob) * 4;

    if (pickup.kind === "xp") {
      ctx.fillStyle = "#ffd36b";
      ctx.beginPath();
      ctx.arc(sx, sy, pickup.drawRadius, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    if (pickup.kind === "heal") {
      ctx.fillStyle = "#ff8d93";
      ctx.fillRect(sx - 4, sy - 10, 8, 20);
      ctx.fillRect(sx - 10, sy - 4, 20, 8);
      continue;
    }

    if (pickup.chestTier === "boss") {
      const pulse = 0.5 + Math.sin(state.time * 6 + pickup.bob) * 0.5;
      ctx.fillStyle = `rgba(171, 92, 255, ${0.18 + pulse * 0.1})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 22 + pulse * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5b2b86";
      ctx.fillRect(sx - 14, sy - 11, 28, 22);
      ctx.fillStyle = "#ffd36b";
      ctx.fillRect(sx - 9, sy - 5, 18, 10);
      ctx.strokeStyle = "#fff3b0";
      ctx.lineWidth = 3;
      ctx.strokeRect(sx - 14, sy - 11, 28, 22);
      ctx.beginPath();
      ctx.moveTo(sx, sy - 15);
      ctx.lineTo(sx + 5, sy - 7);
      ctx.lineTo(sx - 1, sy - 7);
      ctx.lineTo(sx + 4, sy + 2);
      ctx.lineTo(sx - 4, sy - 4);
      ctx.lineTo(sx + 1, sy - 14);
      ctx.closePath();
      ctx.fill();
      continue;
    }

    if (pickup.chestTier === "large") {
      const pulse = 0.5 + Math.sin(state.time * 5 + pickup.bob) * 0.5;
      ctx.fillStyle = `rgba(120, 232, 255, ${0.16 + pulse * 0.08})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 19 + pulse * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#527f92";
      ctx.fillRect(sx - 13, sy - 10, 26, 20);
      ctx.fillStyle = "#ffe28f";
      ctx.fillRect(sx - 8, sy - 5, 16, 10);
      ctx.strokeStyle = "#b8f0ff";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(sx - 13, sy - 10, 26, 20);
      continue;
    }

    ctx.fillStyle = "#c7893f";
    ctx.fillRect(sx - 11, sy - 8, 22, 16);
    ctx.fillStyle = "#ffd36b";
    ctx.fillRect(sx - 7, sy - 4, 14, 8);
    ctx.strokeStyle = "#6b431b";
    ctx.lineWidth = 2;
    ctx.strokeRect(sx - 11, sy - 8, 22, 16);
  }
}

function drawBombMissile(shot) {
  const sx = worldToScreenX(shot.x);
  const sy = worldToScreenY(shot.y);
  const bodyLength = shot.drawRadius * 2.9 + 10;
  const bodyWidth = shot.drawRadius * 1.15 + 4;
  const finWidth = bodyWidth * 0.62;
  const pulse = 0.72 + Math.sin(state.time * 18 + shot.x * 0.03 + shot.y * 0.03) * 0.12;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(shot.angle);

  if (state.effectMode !== "light") {
    ctx.fillStyle = `rgba(255, 138, 72, ${0.2 + pulse * 0.1})`;
    ctx.beginPath();
    ctx.moveTo(-bodyLength * 0.68, 0);
    ctx.lineTo(-bodyLength * 0.98, -bodyWidth * 0.28);
    ctx.lineTo(-bodyLength * 0.98, bodyWidth * 0.28);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "rgba(18, 20, 28, 0.98)";
  ctx.beginPath();
  ctx.moveTo(bodyLength * 0.58, 0);
  ctx.lineTo(bodyLength * 0.2, -bodyWidth * 0.56);
  ctx.lineTo(-bodyLength * 0.56, -bodyWidth * 0.56);
  ctx.lineTo(-bodyLength * 0.78, 0);
  ctx.lineTo(-bodyLength * 0.56, bodyWidth * 0.56);
  ctx.lineTo(bodyLength * 0.2, bodyWidth * 0.56);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(44, 48, 60, 0.98)";
  ctx.beginPath();
  ctx.moveTo(-bodyLength * 0.42, -bodyWidth * 0.56);
  ctx.lineTo(-bodyLength * 0.7, -bodyWidth * 1.02);
  ctx.lineTo(-bodyLength * 0.48, -bodyWidth * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-bodyLength * 0.42, bodyWidth * 0.56);
  ctx.lineTo(-bodyLength * 0.7, bodyWidth * 1.02);
  ctx.lineTo(-bodyLength * 0.48, bodyWidth * 0.18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255, 112, 92, 0.9)";
  ctx.fillRect(-bodyLength * 0.1, -bodyWidth * 0.18, bodyLength * 0.34, bodyWidth * 0.36);

  ctx.strokeStyle = "rgba(118, 124, 138, 0.9)";
  ctx.lineWidth = Math.max(1.6, shot.drawRadius * 0.14);
  ctx.beginPath();
  ctx.moveTo(bodyLength * 0.58, 0);
  ctx.lineTo(bodyLength * 0.2, -bodyWidth * 0.56);
  ctx.lineTo(-bodyLength * 0.56, -bodyWidth * 0.56);
  ctx.lineTo(-bodyLength * 0.78, 0);
  ctx.lineTo(-bodyLength * 0.56, bodyWidth * 0.56);
  ctx.lineTo(bodyLength * 0.2, bodyWidth * 0.56);
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

function drawHostileTriangleProjectile(shot, frozen = false) {
  const sx = worldToScreenX(shot.x);
  const sy = worldToScreenY(shot.y);
  const angle = Math.atan2(shot.vy, shot.vx);
  const length = shot.drawRadius * 2.7;
  const halfWidth = Math.max(4.2, shot.drawRadius * 0.96);

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);

  ctx.fillStyle = "rgba(136, 0, 22, 0.96)";
  ctx.beginPath();
  ctx.moveTo(length * 0.82, 0);
  ctx.lineTo(-length * 0.54, -halfWidth);
  ctx.lineTo(-length * 0.54, halfWidth);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ff304f";
  ctx.beginPath();
  ctx.moveTo(length * 0.64, 0);
  ctx.lineTo(-length * 0.34, -halfWidth * 0.62);
  ctx.lineTo(-length * 0.34, halfWidth * 0.62);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 205, 214, 0.9)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(length * 0.82, 0);
  ctx.lineTo(-length * 0.54, -halfWidth);
  ctx.lineTo(-length * 0.54, halfWidth);
  ctx.closePath();
  ctx.stroke();

  if (frozen) {
    ctx.strokeStyle = "rgba(184, 240, 255, 0.96)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(length * 0.98, 0);
    ctx.lineTo(-length * 0.7, -halfWidth * 1.22);
    ctx.lineTo(-length * 0.7, halfWidth * 1.22);
    ctx.closePath();
    ctx.stroke();
  }

  ctx.restore();
}

function drawLightningBurstLine(burst, alpha) {
  const dx = burst.toX - burst.fromX;
  const dy = burst.toY - burst.fromY;
  const length = Math.hypot(dx, dy) || 1;
  const nx = dx / length;
  const ny = dy / length;
  const px = -ny;
  const py = nx;
  const extend = 10;
  const segmentCount = state.effectMode === "light" ? 3 : 5;
  const points = [{
    x: burst.fromX - nx * extend,
    y: burst.fromY - ny * extend,
  }];

  for (let i = 1; i < segmentCount; i += 1) {
    const t = i / segmentCount;
    const offset = Math.sin((burst.fromX + burst.toY) * 0.02 + i * 1.7) * (state.effectMode === "light" ? 6 : 10);
    points.push({
      x: burst.fromX + dx * t + px * offset,
      y: burst.fromY + dy * t + py * offset,
    });
  }

  points.push({
    x: burst.toX + nx * extend,
    y: burst.toY + ny * extend,
  });

  ctx.strokeStyle = `rgba(120,232,255,${alpha * (state.effectMode === "light" ? 0.42 : 0.32)})`;
  ctx.lineWidth = state.effectMode === "light" ? 5 : 8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(worldToScreenX(points[0].x), worldToScreenY(points[0].y));
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(worldToScreenX(points[i].x), worldToScreenY(points[i].y));
  }
  ctx.stroke();

  ctx.strokeStyle = `rgba(255,244,125,${alpha})`;
  ctx.lineWidth = state.effectMode === "light" ? 2.4 : 3.4;
  ctx.beginPath();
  ctx.moveTo(worldToScreenX(points[0].x), worldToScreenY(points[0].y));
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(worldToScreenX(points[i].x), worldToScreenY(points[i].y));
  }
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
}

function drawProjectiles() {
  for (const shot of state.playerProjectiles) {
    if (shot.delay > 0) continue;
    if (!isOnScreen(shot.x, shot.y, 28)) continue;
    if (!shot.primary && isVisionCulled(shot.x, shot.y, 34)) continue;

    if (shot.kind === "criticalLance") {
      const sx = worldToScreenX(shot.x);
      const sy = worldToScreenY(shot.y);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(shot.angle + Math.PI / 2);
      ctx.fillStyle = "rgba(255,244,190,0.96)";
      ctx.fillRect(-3, -18, 6, 28);
      ctx.fillStyle = "rgba(159, 225, 255, 0.92)";
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(8, -16);
      ctx.lineTo(-8, -16);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      continue;
    }

    if (shot.kind === "slashWave") {
      const sx = worldToScreenX(shot.x);
      const sy = worldToScreenY(shot.y);
      const arc = shot.waveArc || Math.PI * 0.58;
      const radius = 34 + shot.drawRadius * 1.8;
      const start = shot.angle - arc / 2;
      const end = shot.angle + arc / 2;

      ctx.fillStyle = "rgba(255, 230, 147, 0.12)";
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.arc(sx, sy, radius, start, end);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 238, 166, 0.9)";
      ctx.lineWidth = shot.drawRadius;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(sx, sy, radius, start, end);
      ctx.stroke();

      ctx.strokeStyle = "rgba(120, 232, 255, 0.72)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, radius + 8, start, end);
      ctx.stroke();
      ctx.lineCap = "butt";
      continue;
    }

    if (shot.damageType === "爆弾" || shot.explosiveRadius > 0) {
      drawBombMissile(shot);
      continue;
    }

    ctx.fillStyle = shot.color;
    ctx.beginPath();
    ctx.arc(worldToScreenX(shot.x), worldToScreenY(shot.y), shot.drawRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < state.enemyProjectiles.length; i += 1) {
    const shot = state.enemyProjectiles[i];
    if (!isOnScreen(shot.x, shot.y, 30)) continue;
    if (isVisionCulled(shot.x, shot.y, 28)) continue;
    if (state.effectMode === "light" && i % 2 === 1) continue;
    drawHostileTriangleProjectile(shot, isTheWorldActive());
  }
}

function drawBlinkBanZones() {
  for (const zone of state.blinkBanZones) {
    if (!isOnScreen(zone.x, zone.y, zone.radius + 24)) continue;
    const sx = worldToScreenX(zone.x);
    const sy = worldToScreenY(zone.y);
    const warning = zone.warningTimer > 0;
    const progress = warning
      ? 1 - clamp(zone.warningTimer / (zone.warningTotal || 1), 0, 1)
      : clamp(zone.timer / zone.total, 0, 1);
    ctx.fillStyle = warning
      ? `rgba(120, 232, 255, ${0.08 + progress * 0.12})`
      : `rgba(42, 88, 255, ${0.14 + progress * 0.1})`;
    ctx.strokeStyle = warning
      ? `rgba(184, 240, 255, ${0.62 + progress * 0.28})`
      : `rgba(120, 232, 255, ${0.72 + progress * 0.2})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(sx, sy, zone.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = `rgba(255,255,255,${warning ? 0.86 : 0.72 * progress})`;
    ctx.font = "bold 13px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText(warning ? "ブリンク禁止 予告" : "ブリンク禁止", sx, sy);
    ctx.textAlign = "start";
  }
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    if (enemy.hidden) continue;
    if (!isOnScreen(enemy.x, enemy.y, 60)) continue;
    const sx = worldToScreenX(enemy.x);
    const sy = worldToScreenY(enemy.y);

    if (enemy.variant === "blueSlash" && enemy.attackState === "slashWindup") {
      const progress = 1 - clamp(enemy.attackWindup / 0.36, 0, 1);
      const slashLength = enemy.slashLength ?? 96;
      if (enemy.isLarge) {
        const slashArc = enemy.slashArc ?? Math.PI * 0.46;
        const start = enemy.attackAngle - slashArc / 2;
        const end = enemy.attackAngle + slashArc / 2;
        ctx.fillStyle = `rgba(120,232,255,${0.08 + 0.12 * progress})`;
        ctx.strokeStyle = `rgba(120,232,255,${0.34 + 0.55 * progress})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.arc(sx, sy, slashLength, start, end);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.strokeStyle = `rgba(120,232,255,${0.35 + 0.55 * progress})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(
          sx + Math.cos(enemy.attackAngle) * slashLength,
          sy + Math.sin(enemy.attackAngle) * slashLength,
        );
        ctx.stroke();
      }
    }

    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(sx, sy, enemy.drawRadius, 0, Math.PI * 2);
    ctx.fill();

    if (enemy.variant === "smokeShade") {
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = enemy.isLarge ? 4 : 2.5;
      ctx.beginPath();
      ctx.arc(sx, sy, enemy.drawRadius + (enemy.isLarge ? 4 : 2), 0, Math.PI * 2);
      ctx.stroke();
    } else if (enemy.isLarge && enemy.type !== "boss") {
      ctx.strokeStyle = "rgba(255,255,255,0.68)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, enemy.drawRadius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (enemy.lightningMarkTimer > 0) {
      const markProgress = clamp(enemy.lightningMarkTimer / (enemy.lightningMarkMaxTimer || 1), 0, 1);
      ctx.strokeStyle = `rgba(255,244,125,${0.34 + markProgress * 0.42})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, enemy.drawRadius + 9, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (enemy.type === "boss") {
      if (enemy.shieldMax > 0 && enemy.shield > 0) {
        const pulse = 0.55 + Math.sin(state.time * 5) * 0.18;
        ctx.strokeStyle = `rgba(120,232,255,${pulse})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(sx, sy, enemy.drawRadius + 12, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (enemy.phase?.type === "chargeWindup") {
        const alpha = Math.max(0.28, enemy.phase.timer / enemy.phase.total);
        ctx.strokeStyle = `rgba(255, 141, 147, ${alpha})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(
          sx + Math.cos(enemy.phase.angle) * 260,
          sy + Math.sin(enemy.phase.angle) * 260,
        );
        ctx.stroke();
      }

      if (enemy.phase?.type === "meleeWindup") {
        const alpha = Math.max(0.25, enemy.phase.timer / enemy.phase.total);
        ctx.strokeStyle = `rgba(255, 141, 147, ${alpha})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(sx, sy, enemy.phase.radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (enemy.phase?.type === "strongSlash") {
        const progress = 1 - clamp(enemy.phase.timer / enemy.phase.total, 0, 1);
        const alpha = 0.22 + progress * 0.45;
        const radius = enemy.phase.radius ?? 320;
        const arc = enemy.phase.arc ?? Math.PI * 0.86;
        const start = enemy.phase.angle - arc / 2;
        const end = enemy.phase.angle + arc / 2;
        ctx.fillStyle = `rgba(255, 207, 92, ${0.13 + progress * 0.18})`;
        ctx.strokeStyle = `rgba(255, 207, 92, ${alpha})`;
        ctx.lineWidth = 5 + progress * 4;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.arc(sx, sy, radius, start, end);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      if (enemy.phase?.type === "strongSlashSweep") {
        const progress = 1 - clamp(enemy.phase.timer / enemy.phase.total, 0, 1);
        const radius = enemy.phase.radius ?? 320;
        const arc = enemy.phase.arc ?? Math.PI * 0.86;
        const angle = bossSweepAngle(enemy.phase);
        const start = enemy.phase.angle - arc / 2;
        const end = enemy.phase.angle + arc / 2;

        ctx.fillStyle = "rgba(255, 207, 92, 0.1)";
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.arc(sx, sy, radius, start, end);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "rgba(255, 238, 166, 0.96)";
        ctx.lineWidth = enemy.phase.width ?? 72;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(
          sx + Math.cos(angle) * radius,
          sy + Math.sin(angle) * radius,
        );
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 111, 92, ${0.55 + progress * 0.35})`;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(
          sx + Math.cos(angle) * radius,
          sy + Math.sin(angle) * radius,
        );
        ctx.stroke();
        ctx.lineCap = "butt";
      }

      if (enemy.phase?.type === "katanaWideWindup") {
        const progress = 1 - clamp(enemy.phase.timer / enemy.phase.total, 0, 1);
        const radius = enemy.phase.radius ?? 390;
        const arc = enemy.phase.arc ?? Math.PI * 0.84;
        const start = enemy.phase.angle - arc / 2;
        const end = enemy.phase.angle + arc / 2;
        ctx.fillStyle = `rgba(244,241,222,${0.1 + progress * 0.18})`;
        ctx.strokeStyle = `rgba(244,241,222,${0.38 + progress * 0.48})`;
        ctx.lineWidth = 5 + progress * 5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.arc(sx, sy, radius, start, end);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      if (enemy.phase?.type === "katanaCloseWindup") {
        const progress = 1 - clamp(enemy.phase.timer / enemy.phase.total, 0, 1);
        ctx.strokeStyle = `rgba(255,48,79,${0.62 + progress * 0.34})`;
        ctx.lineWidth = 7 + progress * 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(
          sx + Math.cos(enemy.phase.angle) * (enemy.phase.length ?? 170),
          sy + Math.sin(enemy.phase.angle) * (enemy.phase.length ?? 170),
        );
        ctx.stroke();
        ctx.lineCap = "butt";
      }

      if (enemy.phase?.type === "knifeAttack") {
        const phase = enemy.phase;
        for (let k = phase.thrown; k < phase.count; k += 1) {
          const angle = phase.orbitBase + (Math.PI * 2 * k) / phase.count;
          const kx = sx + Math.cos(angle) * 62;
          const ky = sy + Math.sin(angle) * 62;
          ctx.save();
          ctx.translate(kx, ky);
          ctx.rotate(angle + Math.PI / 2);
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.fillRect(-3, -17, 6, 27);
          ctx.fillStyle = "rgba(255,48,79,0.9)";
          ctx.fillRect(-4, 8, 8, 8);
          ctx.restore();
        }

        if (phase.warningTimer > 0) {
          const warnAlpha = clamp(phase.warningTimer / 0.16, 0, 1);
          ctx.strokeStyle = `rgba(255, 48, 79, ${0.38 + (1 - warnAlpha) * 0.44})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(worldToScreenX(phase.warningX), worldToScreenY(phase.warningY));
          ctx.lineTo(
            worldToScreenX(phase.warningX + Math.cos(phase.warningAngle) * 420),
            worldToScreenY(phase.warningY + Math.sin(phase.warningAngle) * 420),
          );
          ctx.stroke();
        }
      }

      if (enemy.phase?.type === "statusAttack") {
        const phase = enemy.phase;
        const progress = 1 - clamp(phase.timer / phase.total, 0, 1);
        if (phase.mode === "darkZone") {
          drawDarkZone(phase, true);
        } else {
          const sx2 = worldToScreenX(phase.x);
          const sy2 = worldToScreenY(phase.y);
          const blinkBan = phase.mode === "blinkBan";
          ctx.fillStyle = blinkBan
            ? `rgba(120,232,255,${0.1 + progress * 0.12})`
            : `rgba(255,36,60,${0.1 + progress * 0.18})`;
          ctx.strokeStyle = blinkBan
            ? `rgba(184,240,255,${0.56 + progress * 0.32})`
            : `rgba(255,36,60,${0.48 + progress * 0.42})`;
          ctx.lineWidth = 5 + progress * 4;
          ctx.beginPath();
          ctx.arc(sx2, sy2, phase.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.font = "bold 13px Segoe UI";
          ctx.textAlign = "center";
          const label = phase.mode === "reverseHorizontal"
            ? "左右反転"
            : (phase.mode === "reverseVertical" ? "上下反転" : "ブリンク禁止");
          ctx.fillText(label, sx2, sy2);
          ctx.textAlign = "start";
        }
      }

      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(60, 24, WIDTH - 120, 10);
      ctx.fillStyle = "#ffcf5c";
      ctx.fillRect(60, 24, (WIDTH - 120) * clamp(enemy.hp / enemy.maxHp, 0, 1), 10);

      if (enemy.shieldMax > 0) {
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.fillRect(60, 38, WIDTH - 120, 6);
        ctx.fillStyle = "#78e8ff";
        ctx.fillRect(60, 38, (WIDTH - 120) * clamp(enemy.shield / enemy.shieldMax, 0, 1), 6);
      }
    }
  }
}

function drawSmokeFans() {
  for (const fan of state.smokeFans) {
    if (!isOnScreen(fan.x, fan.y, fan.radius + 48)) continue;
    if (isVisionCulled(
      fan.x + Math.cos(fan.angle) * fan.radius * 0.55,
      fan.y + Math.sin(fan.angle) * fan.radius * 0.55,
      54,
    )) continue;
    const sx = worldToScreenX(fan.x);
    const sy = worldToScreenY(fan.y);
    const alpha = clamp(fan.life / fan.maxLife, 0, 1);
    const start = fan.angle - fan.arc / 2;
    const end = fan.angle + fan.arc / 2;
    ctx.fillStyle = `rgba(6, 8, 12, ${0.18 + alpha * 0.28})`;
    ctx.strokeStyle = `rgba(30, 32, 40, ${0.42 + alpha * 0.34})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.arc(sx, sy, fan.radius, start, end);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawBursts() {
  for (const burst of state.bursts) {
    const alpha = burst.life / burst.maxLife;
    ctx.strokeStyle = burst.color.replace(/[\d.]+\)$/u, `${alpha})`);
    if (burst.kind === "fan") {
      if (isVisionCulled(burst.x, burst.y, (burst.radius ?? 0) * 0.55 + 32)) continue;
      if (!isOnScreen(burst.x, burst.y, (burst.radius ?? 0) + 36)) continue;
      const sx = worldToScreenX(burst.x);
      const sy = worldToScreenY(burst.y);
      const start = burst.angle - burst.arc / 2;
      const end = burst.angle + burst.arc / 2;
      const isBlueFan = burst.color?.includes("120,232,255");
      ctx.fillStyle = isBlueFan ? `rgba(120,232,255,${0.2 * alpha})` : `rgba(255,230,147,${0.2 * alpha})`;
      ctx.strokeStyle = isBlueFan ? `rgba(120,232,255,${alpha})` : `rgba(255,230,147,${alpha})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.arc(sx, sy, burst.radius, start, end);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      continue;
    }

    if (burst.kind === "ring") {
      if (isVisionCulled(burst.x, burst.y, (burst.radius ?? 0) + 18)) continue;
      if (!isOnScreen(burst.x, burst.y, (burst.radius ?? 0) + 24)) continue;
      ctx.strokeStyle = burst.color.startsWith("rgba(") ? burst.color.replace(/[\d.]+\)$/u, `${alpha})`) : burst.color;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(worldToScreenX(burst.x), worldToScreenY(burst.y), burst.radius, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }

    if (burst.kind === "rect") {
      if (isVisionCulled(burst.x, burst.y, Math.max(burst.width ?? 0, burst.height ?? 0) * 0.3 + 20)) continue;
      if (!isOnScreen(burst.x, burst.y, Math.max(burst.width ?? 0, burst.height ?? 0) / 2 + 24)) continue;
      ctx.strokeStyle = burst.color?.startsWith("rgba(")
        ? burst.color.replace(/[\d.]+\)$/u, `${alpha})`)
        : `rgba(255,141,147,${alpha})`;
      ctx.lineWidth = 6;
      ctx.strokeRect(
        worldToScreenX(burst.x) - burst.width / 2,
        worldToScreenY(burst.y) - burst.height / 2,
        burst.width,
        burst.height,
      );
      continue;
    }

    if (burst.kind === "bossSlash") {
      const endX = burst.x + Math.cos(burst.angle) * burst.length;
      const endY = burst.y + Math.sin(burst.angle) * burst.length;
      if (isVisionCulled((burst.x + endX) / 2, (burst.y + endY) / 2, (burst.width ?? 0) + 24)) continue;
      if (!isOnScreen(burst.x, burst.y, 32) && !isOnScreen(endX, endY, 32)) continue;
      ctx.strokeStyle = burst.color?.startsWith("rgba(")
        ? burst.color.replace(/[\d.]+\)$/u, `${alpha})`)
        : `rgba(255,207,92,${alpha})`;
      ctx.lineWidth = burst.width;
      ctx.beginPath();
      ctx.moveTo(worldToScreenX(burst.x), worldToScreenY(burst.y));
      ctx.lineTo(
        worldToScreenX(endX),
        worldToScreenY(endY),
      );
      ctx.stroke();
      continue;
    }

    if (burst.kind === "line") {
      if (isVisionCulled((burst.fromX + burst.toX) / 2, (burst.fromY + burst.toY) / 2, 44)) continue;
      if (state.effectMode === "light" && alpha < 0.75) continue;
      if (!isOnScreen(burst.fromX, burst.fromY, 24) && !isOnScreen(burst.toX, burst.toY, 24)) continue;
      if (burst.lineStyle === "lightning") {
        drawLightningBurstLine(burst, alpha);
      } else {
        ctx.strokeStyle = `rgba(255,244,125,${alpha})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(worldToScreenX(burst.fromX), worldToScreenY(burst.fromY));
        ctx.lineTo(worldToScreenX(burst.toX), worldToScreenY(burst.toY));
        ctx.stroke();
      }
    }
  }
}

function drawOrbitals() {
  const player = state.player;
  for (let i = 0; i < player.orbitals; i += 1) {
    const theta = state.time * 2.6 + (Math.PI * 2 * i) / player.orbitals;
    const ox = player.x + Math.cos(theta) * 56;
    const oy = player.y + Math.sin(theta) * 56;
    ctx.fillStyle = "#78e8ff";
    ctx.beginPath();
    ctx.arc(worldToScreenX(ox), worldToScreenY(oy), 10, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer() {
  const player = state.player;
  const sx = worldToScreenX(player.x);
  const sy = worldToScreenY(player.y);
  const basePlayerColor = player.strongSlashFlash > 0 ? "#fff2b1" : (state.flash > 0 ? "#ffd6df" : "#edf3ff");

  if (player.recoveryArmorMax > 0 && player.recoveryArmor > 0) {
    const shieldRate = clamp(player.recoveryArmor / player.recoveryArmorMax, 0, 1);
    const red = [
      Math.round(255 - 98 * shieldRate),
      Math.round(94 + 146 * shieldRate),
      Math.round(92 + 58 * shieldRate),
    ];
    ctx.fillStyle = `rgb(${red[0]}, ${red[1]}, ${red[2]})`;
  } else {
    ctx.fillStyle = basePlayerColor;
  }
  ctx.beginPath();
  ctx.arc(sx, sy, player.drawRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = player.strongSlashReady ? "#ffd36b" : "#78e8ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(sx, sy, player.drawRadius + 7, 0, Math.PI * 2);
  ctx.stroke();

  const ammoRingRadius = player.drawRadius + 16;
  const ringProgress = player.reloading
    ? 1 - clamp(player.reloadTimer / (player.currentReloadDuration || player.reloadDuration), 0, 1)
    : clamp(player.ammo / player.maxAmmo, 0, 1);
  const ringColor = isLaserBeamActive(player) ? "#b8f0ff" : (player.reloading ? "#ffd36b" : (ringProgress <= 0.25 ? "#ff8d93" : "#78e8ff"));
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(sx, sy, ammoRingRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = ringColor;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(sx, sy, ammoRingRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ringProgress);
  ctx.stroke();
  ctx.lineCap = "butt";

  const armorRingRadius = player.drawRadius + 25;
  if (player.recoveryArmorMax > 0) {
    const armorProgress = clamp(player.recoveryArmor / player.recoveryArmorMax, 0, 1);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(sx, sy, armorRingRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#b8f0ff";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(sx, sy, armorRingRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * armorProgress);
    ctx.stroke();
    ctx.lineCap = "butt";
  }

  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "bold 12px Segoe UI";
  ctx.textAlign = "center";
  const textRingRadius = player.recoveryArmorMax > 0 ? armorRingRadius : ammoRingRadius;
  ctx.fillText(player.reloading ? "リロード" : `${player.ammo}/${player.maxAmmo}`, sx, sy - textRingRadius - 9);
  ctx.textAlign = "start";

  ctx.strokeStyle = "rgba(255,255,255,0.68)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx + Math.cos(player.aimAngle) * 26, sy + Math.sin(player.aimAngle) * 26);
  ctx.stroke();
}

function drawCriticalLanceOrbit() {
  const volley = state.lanceVolley;
  if (!volley || !state.player) return;

  for (const spear of volley.spears) {
    if (spear.launched) continue;
    const x = state.player.x + Math.cos(spear.angle) * spear.radius;
    const y = state.player.y + Math.sin(spear.angle) * spear.radius;
    const sx = worldToScreenX(x);
    const sy = worldToScreenY(y);

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(spear.angle + Math.PI / 2);
    ctx.fillStyle = "rgba(255,244,190,0.96)";
    ctx.fillRect(-3, -16, 6, 26);
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(8, -14);
    ctx.lineTo(-8, -14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawCrosshair() {
  const { x, y } = state.mouse;
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 10, y);
  ctx.lineTo(x + 10, y);
  ctx.moveTo(x, y - 10);
  ctx.lineTo(x, y + 10);
  ctx.stroke();
}

function drawWorld() {
  drawBackground();
  drawSafeZones();
  drawActiveDarkZone();
  drawBlinkBanZones();
  drawBossSanctuary();
  drawBossDoor();
  drawPracticeDoors();
  drawPickups();
  drawProjectiles();
  drawSmokeFans();
  drawEnemies();
  drawBursts();
  drawOrbitals();
  drawPlayer();
  drawCriticalLanceOrbit();
  drawCrosshair();
}


