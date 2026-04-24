const GUN_UPGRADE_KEYS = new Set([
  "gunMod",
  "demonGunMod",
  "fireRate",
  "reload",
  "pierce",
  "simultaneousShot",
  "gunShape",
  "hitStop",
  "laserBeam",
  "lightning",
  "lightningMark",
]);

const UPGRADE_DEFS = [
  {
    key: "damage",
    name: "通常弾強化",
    desc: "通常弾の威力を上げる",
    factor: 1,
    available: () => true,
    apply: (player, factor) => {
      player.gunDamageBonus += 5 * factor;
      syncCombatDamageTotals(player);
    },
  },
  {
    key: "speed",
    name: "移動速度強化",
    desc: "移動速度を上げる",
    factor: 1,
    available: () => true,
    apply: (player, factor) => {
      player.speed += 16 * factor;
    },
  },
  {
    key: "fireRate",
    name: "連射速度強化",
    desc: "フルオート射撃の連射速度を上げる",
    factor: 1,
    available: (player) => player.gunModLevel > 0,
    apply: (player, factor) => {
      player.fireCooldown = Math.max(0.11, player.fireCooldown - 0.018 * factor);
    },
  },
  {
    key: "reload",
    name: "高速装填",
    desc: "リロード時間を短縮する",
    factor: 1,
    available: (player) => player.gunModLevel > 0,
    apply: (player, factor) => {
      player.reloadDuration = Math.max(0.45, player.reloadDuration - 0.12 * factor);
    },
  },
  {
    key: "pierce",
    name: "貫通弾",
    desc: "通常弾が敵を貫通する",
    factor: 1,
    available: (player) => player.gunModLevel > 0,
    apply: (player, factor) => {
      player.pierce += factor;
    },
  },
  {
    key: "simultaneousShot",
    name: "発射数強化",
    desc: "同時に発射する弾を増やす",
    factor: 1,
    available: (player) => player.gunModLevel > 0,
    apply: (player, factor) => {
      player.multiShot += factor;
    },
  },
  {
    key: "vigor",
    name: "体力増強",
    desc: "最大HPと回復量を伸ばす",
    factor: 1,
    available: () => true,
    apply: (player, factor) => {
      increasePlayerBaseHp(player, 10 * factor, 12 * factor);
    },
  },
  {
    key: "slashCharge",
    name: "技研鑽",
    desc: "爆弾と斬撃のクールタイムを短くする",
    factor: 1,
    rare: true,
    maxLevel: 5,
    available: (player) => player.hasStrongSlash || player.hasSkillShot,
    apply: (player, factor) => {
      if (player.hasStrongSlash) {
        player.strongSlashCooldown = Math.max(3, player.strongSlashCooldown - 0.44 * factor);
      }
      if (player.hasSkillShot) {
        player.skillShotCooldown = Math.max(3, player.skillShotCooldown - 0.44 * factor);
      }
      if (player.hasStrongSlash && player.hasSkillShot) {
        const sharedCooldown = Math.min(player.strongSlashCooldown, player.skillShotCooldown);
        player.strongSlashCooldown = sharedCooldown;
        player.skillShotCooldown = sharedCooldown;
      }
    },
  },
  {
    key: "gunMod",
    name: "銃改造",
    desc: "銃系通常強化を解放する。Lv5で魔改造が開放される",
    factor: 1,
    rare: true,
    maxLevel: 5,
    currentLevel: (player) => player.gunModLevel,
    recordLevel: (player) => player.gunModLevel,
    available: () => true,
    apply: (player, factor) => {
      player.gunModLevel += factor;
    },
  },
  {
    key: "demonGunMod",
    name: "魔改造",
    desc: "上位銃レアスキルを解放する",
    factor: 1,
    rare: true,
    evolution: true,
    maxLevel: 1,
    showLevel: false,
    currentLevel: (player) => player.hasDemonGunMod ? 1 : 0,
    recordLevel: (player) => player.hasDemonGunMod ? 1 : 0,
    available: (player) => player.gunModLevel >= 5 && !player.hasDemonGunMod,
    apply: (player) => {
      player.hasDemonGunMod = true;
    },
  },
  {
    key: "skillUnlock",
    name: "爆弾",
    desc: "Qで使う爆弾スキルを獲得する。オート射撃中でも爆弾は個別にエイムが必要",
    factor: 1,
    rare: true,
    maxLevel: 5,
    showLevel: false,
    currentLevel: (player) => player.hasSkillShot ? player.skillShotLevel : 0,
    recordLevel: (player) => player.skillShotLevel,
    available: (player) => !player.hasSkillShot,
    apply: (player) => {
      player.hasSkillShot = true;
      player.skillShotLevel = 1;
      player.skillShotCooldown = Math.max(5.4, player.skillShotCooldown - 0.2);
      if (player.hasStrongSlash) {
        player.skillShotCooldown = player.strongSlashCooldown;
      }
    },
  },
  {
    key: "gunShape",
    name: "拡大収縮",
    desc: "通常弾を大きくし、追加弾の散らばりを小さくする",
    factor: 1,
    rare: true,
    maxLevel: 5,
    currentLevel: (player) => player.gunShapeLevel,
    recordLevel: (player) => player.gunShapeLevel,
    available: (player) => player.hasDemonGunMod,
    apply: (player, factor) => {
      player.gunShapeLevel += factor;
      player.accuracy += 2 * factor;
      player.projectileSizeLevel += 2 * factor;
      player.projectileSize += 2.8 * factor;
    },
  },
  {
    key: "hitStop",
    name: "ヒットストップ",
    desc: "通常弾命中時、同じ敵に0.2秒ごとに0.02秒の停止を与える",
    factor: 1,
    rare: true,
    displayTone: "evolution",
    maxLevel: 1,
    showLevel: false,
    currentLevel: (player) => player.hitStopLevel,
    recordLevel: (player) => player.hitStopLevel,
    available: (player) => player.hasDemonGunMod,
    apply: (player) => {
      player.hitStopLevel = 1;
      player.hitStopDuration = 0.02;
      player.hitStopCooldown = 0.2;
    },
  },
  {
    key: "laserBeam",
    name: "レーザービーム",
    desc: "短時間、銃の連射・装填・弾速・貫通を強化する赤スキル。効果は抑えめでLvごとに間隔短縮",
    factor: 1,
    rare: true,
    red: true,
    maxLevel: 7,
    currentLevel: (player) => player.laserBeamLevel,
    recordLevel: (player) => player.laserBeamLevel,
    available: (player) => player.hasDemonGunMod,
    apply: (player, factor) => {
      player.laserBeamLevel = Math.min(7, player.laserBeamLevel + factor);
      player.laserBeamDuration = 2.4 + (player.laserBeamLevel - 1) * 0.05;
      player.laserBeamCooldown = Math.max(4.2, 9 - 0.8 * (player.laserBeamLevel - 1));
      if (player.laserBeamActiveTimer <= 0 && player.laserBeamCooldownTimer <= 0) {
        activateLaserBeam(player);
      }
    },
  },
  {
    key: "skillPower",
    name: "爆弾強化",
    desc: "爆弾の威力・爆発範囲・弾サイズを大きく上げる",
    factor: 1,
    rare: true,
    maxLevel: 7,
    currentLevel: (player) => player.skillShotLevel,
    recordLevel: (player) => player.skillShotLevel,
    available: (player) => player.hasSkillShot,
    apply: (player, factor) => {
      player.skillShotLevel += factor;
      player.skillShotDamageBonus += 28 * factor;
      player.skillShotRadius += 12 * factor;
      player.skillShotProjectileSize += 1.45 * factor;
      player.skillShotCooldown = Math.max(3, player.skillShotCooldown - 0.15 * factor);
      syncCombatDamageTotals(player);
      if (player.hasStrongSlash) {
        player.strongSlashCooldown = player.skillShotCooldown;
      }
    },
  },
  {
    key: "explosionChain",
    name: "爆発連鎖",
    desc: "爆弾は最大3発まで。以降は威力を大きく伸ばし、倒した敵も低確率で爆発する",
    factor: 1,
    rare: true,
    evolution: true,
    maxLevel: 5,
    currentLevel: (player) => player.explosionChainLevel,
    recordLevel: (player) => player.explosionChainLevel,
    available: (player) => player.hasSkillShot && player.skillShotLevel >= 7,
    apply: (player, factor) => {
      player.explosionChainLevel += factor;
      player.skillShotCount = Math.min(MAX_SKILL_PROJECTILES, player.skillShotCount + factor);
      player.skillShotDamageBonus += 58 * factor;
      player.explosionChainDamageBonus += 46 * factor;
      player.skillShotRadius += 6 * factor;
      syncCombatDamageTotals(player);
    },
  },
  {
    key: "slashUnlock",
    name: "斬撃",
    desc: "Eで使う前方斬撃を獲得する。オート射撃中でも斬撃は個別にエイムが必要",
    factor: 1,
    rare: true,
    maxLevel: 5,
    showLevel: false,
    currentLevel: (player) => player.hasStrongSlash ? player.strongSlashLevel : 0,
    recordLevel: (player) => player.strongSlashLevel,
    available: (player) => !player.hasStrongSlash,
    apply: (player) => {
      player.hasStrongSlash = true;
      player.strongSlashLevel = 1;
      player.strongSlashCooldown = player.skillShotCooldown;
      player.strongSlashReady = true;
      player.strongSlashCharge = player.strongSlashCooldown;
    },
  },
  {
    key: "slashPower",
    name: "斬撃強化",
    desc: "斬撃の威力・範囲・角度を大きく上げる",
    factor: 1,
    rare: true,
    maxLevel: 7,
    currentLevel: (player) => player.strongSlashLevel,
    recordLevel: (player) => player.strongSlashLevel,
    available: (player) => player.hasStrongSlash,
    apply: (player, factor) => {
      player.strongSlashLevel += factor;
      player.strongSlashDamageBonus += 42 * factor;
      player.strongSlashRadius += 13 * factor;
      player.strongSlashArc = Math.min(Math.PI * 0.9, player.strongSlashArc + 0.023 * factor);
      syncCombatDamageTotals(player);
    },
  },
  {
    key: "waveSlash",
    name: "波動斬撃",
    desc: "斬撃時に最大3枚の波動を飛ばす。Lvごとに火力・射程・貫通力を伸ばす",
    factor: 1,
    rare: true,
    evolution: true,
    maxLevel: 5,
    currentLevel: (player) => player.waveSlashLevel,
    recordLevel: (player) => player.waveSlashLevel,
    available: (player) => player.hasStrongSlash && player.strongSlashLevel >= 7,
    apply: (player, factor) => {
      player.waveSlashLevel += factor;
      player.waveSlashCount = Math.min(MAX_WAVE_SLASH_PROJECTILES, player.waveSlashCount + factor);
      player.waveSlashRange += 78 * factor;
      player.waveSlashDamageBonus += 46 * factor;
      syncCombatDamageTotals(player);
    },
  },
  {
    key: "blink",
    name: "瞬間移動",
    desc: "Spaceで短距離瞬間移動できる",
    factor: 1,
    rare: true,
    showLevel: false,
    available: (player) => !player.hasBlink,
    apply: (player) => {
      player.hasBlink = true;
      player.blinkLevel = 1;
      player.blinkTimer = 0;
    },
  },
  {
    key: "blinkRange",
    name: "ブリンク強化",
    desc: "瞬間移動の距離を少し伸ばし、クールタイムを短くする",
    factor: 1,
    rare: true,
    maxLevel: 5,
    available: (player) => player.hasBlink,
    apply: (player, factor) => {
      player.blinkLevel += factor;
      player.blinkRange += 36 * factor;
      player.blinkCooldown = Math.max(2, player.blinkCooldown - 0.7 * factor);
    },
  },
  {
    key: "lightning",
    name: "雷弾",
    desc: "銃弾が当たった敵から雷が連鎖する。Lvごとに連鎖数アップとクールタイム短縮",
    factor: 1,
    rare: true,
    maxLevel: 5,
    currentLevel: (player) => player.lightningLevel,
    recordLevel: (player) => player.lightningLevel,
    available: () => true,
    apply: (player, factor) => {
      player.lightningLevel += factor;
      player.lightningDamage = Math.max(player.lightningDamage, 22);
      player.lightningChains += factor;
      player.lightningCooldown = Math.max(0.4, 1 - 0.15 * (player.lightningLevel - 1));
    },
  },
  {
    key: "lightningMark",
    name: "避雷印",
    desc: "雷を受けた敵の被ダメージ倍率を上げる。Lv1で1.5倍、Lv5で2倍",
    factor: 1,
    rare: true,
    evolution: true,
    maxLevel: 5,
    currentLevel: (player) => player.lightningMarkLevel,
    recordLevel: (player) => player.lightningMarkLevel,
    available: (player) => player.lightningLevel >= 5,
    apply: (player, factor) => {
      player.lightningMarkLevel += factor;
      player.lightningMarkDamageAmp = 0.5 + (player.lightningMarkLevel - 1) * 0.125;
      player.lightningMarkDuration = player.lightningMarkLevel;
    },
  },
  {
    key: "thunderZone",
    name: "雷域",
    desc: "自分の周囲に雷のゾーンを広げ、1秒ごとに範囲内の敵へ避雷印を付ける",
    factor: 1,
    rare: true,
    red: true,
    maxLevel: 5,
    currentLevel: (player) => player.thunderZoneLevel,
    recordLevel: (player) => player.thunderZoneLevel,
    available: (player) => player.lightningMarkLevel >= 5,
    apply: (player, factor) => {
      player.thunderZoneLevel += factor;
      player.thunderZoneRadius = 130 + (player.thunderZoneLevel - 1) * 32;
      player.thunderZoneTimer = 0;
    },
  },
  {
    key: "recoveryArmor",
    name: "回復装甲",
    desc: "HPに応じたシールドを獲得し、無被弾で自動回復する",
    factor: 1,
    rare: true,
    maxLevel: 5,
    currentLevel: (player) => player.recoveryArmorLevel,
    recordLevel: (player) => player.recoveryArmorLevel,
    available: () => true,
    apply: (player, factor) => {
      player.recoveryArmorLevel += factor;
      player.recoveryArmorRatio = 0.6 + 0.05 * (player.recoveryArmorLevel - 1);
      player.recoveryArmorRegenDuration = Math.max(3, 7 - (player.recoveryArmorLevel - 1));
      refreshRecoveryArmorMax(player, true);
    },
  },
  {
    key: "naturalForce",
    name: "自然力上昇",
    desc: "HPを自動回復し、受けるダメージを軽減する。Lv1で1.5倍、Lv5で2倍ぶん軽減",
    factor: 1,
    rare: true,
    evolution: true,
    maxLevel: 5,
    currentLevel: (player) => player.naturalForceLevel,
    recordLevel: (player) => player.naturalForceLevel,
    available: (player) => player.recoveryArmorLevel >= 5,
    apply: (player, factor) => {
      setNaturalForceLevel(player, player.naturalForceLevel + factor);
    },
  },
  {
    key: "theWorld",
    name: "ザ・ワールド",
    desc: "Xで敵弾だけを停止する虹秘技。10秒固定CTで、Lvごとに停止時間が伸びる",
    factor: 1,
    rare: true,
    rainbow: true,
    chestOnly: true,
    maxLevel: 4,
    currentLevel: (player) => player.theWorldLevel,
    recordLevel: (player) => player.theWorldLevel,
    available: (player) => state.hiddenRainbowUnlocked
      && player.rainbowSkillChoice !== "criticalLance",
    apply: (player, factor) => {
      player.rainbowSkillChoice ??= "theWorld";
      player.theWorldLevel = Math.min(4, player.theWorldLevel + factor);
      player.theWorldDuration = getTheWorldDuration(player.theWorldLevel);
    },
  },
  {
    key: "criticalLance",
    name: "会心槍",
    desc: "Xで5本の槍を順番に放つ虹秘技。雑魚は処刑、ボスには最大HPの0.3%ダメージ",
    factor: 1,
    rare: true,
    rainbow: true,
    chestOnly: true,
    maxLevel: 4,
    currentLevel: (player) => player.criticalLanceLevel,
    recordLevel: (player) => player.criticalLanceLevel,
    available: (player) => state.hiddenRainbowUnlocked
      && player.rainbowSkillChoice !== "theWorld",
    apply: (player, factor) => {
      player.rainbowSkillChoice ??= "criticalLance";
      player.criticalLanceLevel = Math.min(4, player.criticalLanceLevel + factor);
      player.criticalLanceExecutionThreshold = getCriticalLanceExecutionThreshold(player.criticalLanceLevel);
      player.criticalLanceLaunchInterval = getCriticalLanceLaunchInterval(player.criticalLanceLevel);
    },
  },
  {
    key: "firepowerBreakthrough",
    name: "火力突破",
    desc: "銃・斬撃・爆弾の火力倍率を上げる。Lv5で2倍",
    factor: 1,
    rare: true,
    red: true,
    maxLevel: 5,
    currentLevel: (player) => player.firepowerBreakthroughLevel,
    recordLevel: (player) => player.firepowerBreakthroughLevel,
    available: () => false,
    apply: (player, factor) => {
      setFirepowerBreakthroughLevel(player, player.firepowerBreakthroughLevel + factor);
    },
  },
  {
    key: "healthMonster",
    name: "生命爆発",
    desc: "基礎HPをコピーして最大HP倍率を上げる。Lv1で1.5倍、Lv5で2倍",
    factor: 1,
    rare: true,
    red: true,
    maxLevel: 5,
    currentLevel: (player) => player.healthMonsterLevel,
    recordLevel: (player) => player.healthMonsterLevel,
    available: () => false,
    apply: (player, factor) => {
      setHealthMonsterLevel(player, player.healthMonsterLevel + factor);
    },
  },
];

const UPGRADE_DEF_BY_KEY = new Map(UPGRADE_DEFS.map((upgrade) => [upgrade.key, upgrade]));

function getUpgradeDefByKey(key) {
  return UPGRADE_DEF_BY_KEY.get(key) ?? null;
}

function getUpgradeDisplayTone(upgradeOrKey) {
  const upgrade = typeof upgradeOrKey === "string"
    ? getUpgradeDefByKey(upgradeOrKey)
    : upgradeOrKey;
  if (!upgrade) return "normal";
  if (upgrade.rainbow) return "rainbow";
  if (upgrade.red) return "red";
  if (upgrade.displayTone) return upgrade.displayTone;
  if (upgrade.evolution) return "evolution";
  if (upgrade.rare) return "rare";
  return "normal";
}

function getUpgradeButtonClass(upgrade) {
  switch (getUpgradeDisplayTone(upgrade)) {
    case "rainbow":
      return "choice choice-rainbow";
    case "red":
      return "choice choice-red";
    case "evolution":
      return "choice choice-evolution";
    case "rare":
      return "choice choice-rare";
    default:
      return "choice choice-normal";
  }
}

function recordUpgrade(upgrade, factor) {
  const player = state.player;
  const gained = Math.max(1, factor ?? 1);
  const maxLevel = getUpgradeMaxLevel(upgrade);
  const nextLevel = upgrade.recordLevel
    ? upgrade.recordLevel(player)
    : (player.skillLevels[upgrade.key] ?? 0) + gained;
  player.skillLevels[upgrade.key] = Math.min(maxLevel, nextLevel);
  player.skillNames[upgrade.key] = upgrade.name;
  if (!state.practiceMode && (upgrade.red || upgrade.rainbow)) {
    unlockPracticeSkill(upgrade.key);
  }
}

function getUpgradeMaxLevel(upgrade) {
  if (Number.isFinite(upgrade.maxLevel)) return upgrade.maxLevel;
  return upgrade.rare ? 5 : Infinity;
}

function getUpgradeLevel(upgrade, player) {
  if (upgrade.currentLevel) return upgrade.currentLevel(player);
  return player.skillLevels[upgrade.key] ?? 0;
}

function isGunUpgrade(upgrade) {
  return GUN_UPGRADE_KEYS.has(upgrade.key);
}

function isGunColumnUpgrade(upgrade) {
  return isGunUpgrade(upgrade) || upgrade.key === "damage";
}

function getChestNormalMultiplier() {
  return state.stageIndex >= 2 ? 3 : 2;
}

function getChestLabel(chestTier = "normal") {
  if (chestTier === "boss") return "大宝箱";
  if (chestTier === "large") return "中宝箱";
  return "宝箱";
}

function setUpgradeOverlayHeader(eyebrow, title = "強化を選ぶ") {
  if (upgradeEyebrow) upgradeEyebrow.textContent = eyebrow;
  if (upgradeTitle) upgradeTitle.textContent = title;
}

function getRainbowChestChance(chestTier = "normal") {
  if (!state.hiddenRainbowUnlocked) return 0;
  if (chestTier === "boss") return 0.09;
  if (chestTier === "large") return 0.055;
  return 0.025;
}

function buildUpgradePool(fromChest, category = "all") {
  const player = state.player;
  return UPGRADE_DEFS
    .filter((upgrade) => {
      if (upgrade.chestOnly && !fromChest) return false;
      if (!fromChest && category === "normal" && isGunColumnUpgrade(upgrade)) return false;
      if (!fromChest && category === "gun" && !isGunColumnUpgrade(upgrade)) return false;
      if (upgrade.available && !upgrade.available(player)) return false;
      return getUpgradeLevel(upgrade, player) < getUpgradeMaxLevel(upgrade);
    })
    .map((upgrade) => {
      const rare = Boolean(upgrade.rare);
      const baseFactor = fromChest && !rare
        ? Math.max(1, upgrade.factor ?? 1) * getChestNormalMultiplier()
        : 1;
      const maxLevel = getUpgradeMaxLevel(upgrade);
      const remaining = maxLevel === Infinity ? baseFactor : maxLevel - getUpgradeLevel(upgrade, player);
      return {
        ...upgrade,
        factor: Math.max(1, Math.min(baseFactor, remaining)),
        rare,
      };
    });
}

function getUpgradeWeight(item, fromChest, chestTier = "normal") {
  if (item.rainbow) {
    let weight = 1;
    if (chestTier === "boss") weight = 1.55;
    else if (chestTier === "large") weight = 1.16;
    return weight;
  }

  if (item.red) {
    let weight = fromChest ? 0.28 : 0.07;
    if (chestTier === "large" || chestTier === "boss") {
      const maxLevel = getUpgradeMaxLevel(item);
      const levelRatio = maxLevel === Infinity ? 0 : getUpgradeLevel(item, state.player) / maxLevel;
      weight *= chestTier === "boss" ? 2.8 : 1.8;
      weight *= 1 + levelRatio * 0.9;
    }
    return weight;
  }

  if (item.evolution) {
    let weight = fromChest ? 0.85 : 0.25;
    if (chestTier === "large" || chestTier === "boss") {
      const maxLevel = getUpgradeMaxLevel(item);
      const levelRatio = maxLevel === Infinity ? 0 : getUpgradeLevel(item, state.player) / maxLevel;
      weight *= chestTier === "boss" ? 3.5 : 2.4;
      weight *= 1 + levelRatio * 1.25;
    }
    return weight;
  }

  if (item.rare) {
    let weight = fromChest ? 2.2 : 0.8;
    if (chestTier === "large" || chestTier === "boss") {
      const maxLevel = getUpgradeMaxLevel(item);
      const levelRatio = maxLevel === Infinity ? 0 : getUpgradeLevel(item, state.player) / maxLevel;
      weight *= chestTier === "boss" ? 2.2 : 1.75;
      weight *= 1 + levelRatio * 0.8;
    }
    return weight;
  }

  return fromChest ? 1.2 : 1.8;
}

function pickRandomUpgrades(pool, count, fromChest, chestTier = "normal") {
  const picks = [];
  const source = [...pool];
  while (source.length && picks.length < count) {
    let totalWeight = 0;
    for (const item of source) {
      totalWeight += getUpgradeWeight(item, fromChest, chestTier);
    }
    let roll = Math.random() * totalWeight;
    let index = 0;
    for (; index < source.length; index += 1) {
      roll -= getUpgradeWeight(source[index], fromChest, chestTier);
      if (roll <= 0) break;
    }
    picks.push(source.splice(Math.min(index, source.length - 1), 1)[0]);
  }
  return picks;
}

function maybeInjectRainbowUpgrade(picks, chestTier = "normal") {
  const rainbowPool = buildUpgradePool(true).filter((upgrade) => upgrade.rainbow);
  if (!rainbowPool.length) return picks;
  if (picks.length > 0 && Math.random() > getRainbowChestChance(chestTier)) return picks;

  const [rainbowPick] = pickRandomUpgrades(rainbowPool, 1, true, chestTier);
  if (!rainbowPick) return picks;

  const next = [...picks];
  if (next.length >= 3) {
    next[next.length - 1] = rainbowPick;
  } else {
    next.push(rainbowPick);
  }
  return next;
}

function isNormalUpgrade(upgrade) {
  return !upgrade.rare && !upgrade.evolution && !upgrade.red;
}

function getPracticeNormalUpgrades() {
  return UPGRADE_DEFS.filter(isNormalUpgrade);
}

function getPracticeSpecialUpgrades() {
  return UPGRADE_DEFS.filter((upgrade) => !isNormalUpgrade(upgrade));
}

function recordPracticeUpgrade(player, upgrade, level) {
  if (level <= 0) return;
  player.skillLevels[upgrade.key] = level;
  player.skillNames[upgrade.key] = upgrade.name;
}

function applyPracticeRareSkills(player) {
  for (let pass = 0; pass < 8; pass += 1) {
    let changed = false;
    for (const upgrade of UPGRADE_DEFS) {
      if (isNormalUpgrade(upgrade) || (upgrade.chestOnly && !upgrade.rainbow) || upgrade.key === "firepowerBreakthrough" || upgrade.key === "healthMonster") continue;

      const targetLevel = Math.min(
        state.practiceSpecialLevels[upgrade.key] ?? 0,
        typeof getPracticeSpecialMaxLevel === "function" ? getPracticeSpecialMaxLevel(upgrade) : getUpgradeMaxLevel(upgrade),
      );
      if (targetLevel <= 0) continue;
      if (upgrade.available && !upgrade.available(player)) continue;

      const currentLevel = getUpgradeLevel(upgrade, player);
      if (currentLevel >= targetLevel) continue;

      const factor = Math.max(1, targetLevel - currentLevel);
      upgrade.apply(player, factor);
      const nextLevel = upgrade.currentLevel
        ? Math.min(targetLevel, getUpgradeLevel(upgrade, player))
        : Math.min(targetLevel, currentLevel + factor);
      recordPracticeUpgrade(player, upgrade, nextLevel);
      changed = true;
    }
    if (!changed) break;
  }
}

function applyPracticeBuild(player) {
  player.baseMaxHp = state.practiceBaseHp;
  player.hp = Math.min(player.hp, player.baseMaxHp);
  refreshPlayerMaxHp(player, state.practiceBaseHp);
  if (state.practiceFirepowerLevel > 0) {
    player.breakthroughType = "firepowerBreakthrough";
    setFirepowerBreakthroughLevel(player, state.practiceFirepowerLevel);
    player.skillLevels.firepowerBreakthrough = state.practiceFirepowerLevel;
    player.skillNames.firepowerBreakthrough = "火力突破";
  }
  if (state.practiceHealthLevel > 0) {
    player.breakthroughType = "healthMonster";
    setHealthMonsterLevel(player, state.practiceHealthLevel);
    player.skillLevels.healthMonster = state.practiceHealthLevel;
    player.skillNames.healthMonster = "生命爆発";
  }
  if (state.practiceBaseAttackBonus > 0) {
    increasePlayerBaseCombatDamage(player, state.practiceBaseAttackBonus);
  }
  for (const upgrade of getPracticeNormalUpgrades()) {
    const level = state.practiceNormalLevels[upgrade.key] ?? 0;
    if (level <= 0) continue;
    upgrade.apply(player, level);
    recordPracticeUpgrade(player, upgrade, level);
  }
  applyPracticeRareSkills(player);
  syncCombatDamageTotals(player);
  player.ammo = player.maxAmmo;
}

function runChoiceSelection(button, action) {
  if (button.disabled) return;
  const choiceRoot = button.closest("#upgradeChoices");
  if (choiceRoot) {
    for (const choice of choiceRoot.querySelectorAll("button.choice")) {
      choice.disabled = true;
    }
  }
  button.classList.add("choice-selected");
  if (button.classList.contains("choice-rainbow")) {
    button.classList.add("choice-selected-rainbow");
  }
  const delay = Number(button.dataset.selectionDelay || 160);
  window.setTimeout(action, delay);
}

function createUpgradeButton(upgrade, fromChest, chestTier = "normal") {
  const button = document.createElement("button");
  const normal = isNormalUpgrade(upgrade);
  button.className = getUpgradeButtonClass(upgrade);
  button.dataset.selectionDelay = String(upgrade.rainbow ? 440 : 160);
  const chestNormalMultiplier = getChestNormalMultiplier();
  const chestLabel = getChestLabel(chestTier);
  const suffix = upgrade.rainbow
    ? "虹秘技"
    : (upgrade.red
    ? "赤スキル"
    : (upgrade.evolution
      ? "進化スキル"
      : (fromChest ? (upgrade.rare ? `${chestLabel}レア` : `${chestLabel}強化 x${chestNormalMultiplier}`) : "レベルアップ")));
  const maxLevel = getUpgradeMaxLevel(upgrade);
  const currentLevel = getUpgradeLevel(upgrade, state.player);
  const nextLevel = maxLevel === Infinity
    ? 0
    : Math.min(maxLevel, currentLevel + (upgrade.factor ?? 1));
  const levelText = maxLevel === Infinity || upgrade.showLevel === false ? "" : ` Lv.${nextLevel}/${maxLevel}`;
  const title = `${upgrade.name}${levelText}`;
  const levelBadge = normal
    ? `<em class="choice-level">現在 Lv.${currentLevel}</em>`
    : "";
  button.innerHTML = fromChest && !upgrade.rare
    ? `<strong>${title} x${chestNormalMultiplier}</strong>${levelBadge}<span>${upgrade.desc} / ${chestLabel}</span>`
    : `<strong>${title}</strong>${levelBadge}<span>${upgrade.desc} / ${suffix}</span>`;
  button.addEventListener("click", () => {
    runChoiceSelection(button, () => {
      const factor = upgrade.factor ?? 1;
      upgrade.apply(state.player, factor);
      recordUpgrade(upgrade, factor);
      state.paused = false;
      upgradeOverlay.classList.add("hidden");
      updateHud();
      if (!fromChest) {
        openQueuedLevelUpgrade();
      }
    });
  });
  return button;
}

function openQueuedLevelUpgrade() {
  if (!areDevLevelChoicesEnabled()) return;
  if (state.pendingLevelUps <= 0 || state.gameOver) return;
  state.pendingLevelUps -= 1;
  openUpgrade(false);
}

function renderUpgradePicks(picks, fromChest, chestTier = "normal") {
  upgradeChoices.innerHTML = "";
  upgradeChoices.classList.remove("choices-split");
  upgradeChoices.classList.toggle("choices-grid-four", picks.length >= 4);
  for (const upgrade of picks) {
    upgradeChoices.appendChild(createUpgradeButton(upgrade, fromChest, chestTier));
  }
}

function appendUpgradeColumn(title, picks, fromChest, className) {
  const column = document.createElement("div");
  column.className = `choice-column ${className}`;
  const heading = document.createElement("div");
  heading.className = "choice-column-title";
  heading.textContent = title;
  column.appendChild(heading);

  if (!picks.length) {
    const empty = document.createElement("button");
    empty.className = "choice choice-disabled";
    empty.disabled = true;
    empty.innerHTML = "<strong>候補なし</strong><span>今は選べる強化がありません</span>";
      column.appendChild(empty);
  } else {
    for (const upgrade of picks) {
      column.appendChild(createUpgradeButton(upgrade, fromChest, "normal"));
    }
  }

  upgradeChoices.appendChild(column);
}

function renderLevelUpgradeColumns() {
  upgradeChoices.innerHTML = "";
  upgradeChoices.classList.add("choices-split");
  upgradeChoices.classList.remove("choices-grid-four");
  const gunPool = buildUpgradePool(false, "gun");
  const normalPool = buildUpgradePool(false, "normal").filter((upgrade) => upgrade.key !== "damage");
  const gunPicks = pickRandomUpgrades(gunPool, 3, false);
  const normalPicks = pickRandomUpgrades(normalPool, 3, false);
  appendUpgradeColumn("改造", gunPicks, false, "choice-column-gun");
  appendUpgradeColumn("通常", normalPicks, false, "choice-column-normal");
}

function createBreakthroughButton(upgrade) {
  const button = document.createElement("button");
  button.className = getUpgradeButtonClass(upgrade);
  button.innerHTML = `<strong>${upgrade.name} Lv.1/${getUpgradeMaxLevel(upgrade)}</strong><span>${upgrade.desc} / 片方を選ぶともう片方は消滅</span>`;
  button.addEventListener("click", () => {
    runChoiceSelection(button, () => {
      const player = state.player;
      player.breakthroughType = upgrade.key;
      upgrade.apply(player, 1);
      recordUpgrade(upgrade, 1);
      state.paused = false;
      upgradeOverlay.classList.add("hidden");
      updateHud();
    });
  });
  return button;
}

function openBreakthroughChoice() {
  const player = state.player;
  if (!player || player.breakthroughType) return false;

  const choices = UPGRADE_DEFS.filter((upgrade) => (
    upgrade.key === "firepowerBreakthrough" || upgrade.key === "healthMonster"
  ));

  state.paused = true;
  upgradeOverlay.classList.remove("hidden");
  upgradeChoices.innerHTML = "";
  upgradeChoices.classList.remove("choices-split");
  upgradeChoices.classList.remove("choices-grid-four");
  setUpgradeOverlayHeader("突破報酬", "片方を選ぶ");

  for (const upgrade of choices) {
    upgradeChoices.appendChild(createBreakthroughButton(upgrade));
  }

  return true;
}

function createBossRewardButton(kind) {
  const button = document.createElement("button");
  button.className = "choice choice-evolution";
  const attack = kind === "attack";
  button.innerHTML = attack
    ? "<strong>基礎攻撃鍛錬</strong><span>基礎攻撃力を上げる。火力突破倍率の対象になる</span>"
    : "<strong>基礎体力鍛錬</strong><span>基礎HPを上げる。体力倍率と回復装甲の対象になる</span>";
  button.addEventListener("click", () => {
    runChoiceSelection(button, () => {
      if (attack) {
        increasePlayerBaseCombatDamage(state.player, 7 + state.stageIndex * 1.4);
        state.player.skillLevels.baseAttackTraining = (state.player.skillLevels.baseAttackTraining ?? 0) + 1;
        state.player.skillNames.baseAttackTraining = "基礎攻撃鍛錬";
      } else {
        increasePlayerTrueBaseHp(state.player, 18 + state.stageIndex * 4, 18 + state.stageIndex * 4);
        state.player.skillLevels.baseHpTraining = (state.player.skillLevels.baseHpTraining ?? 0) + 1;
        state.player.skillNames.baseHpTraining = "基礎体力鍛錬";
      }
      state.claimedBossRewards[state.stageIndex] = true;
      state.paused = false;
      upgradeOverlay.classList.add("hidden");
      updateHud();
    });
  });
  return button;
}

function openBossRewardChoice() {
  if (state.claimedBossRewards[state.stageIndex]) return false;
  state.paused = true;
  upgradeOverlay.classList.remove("hidden");
  upgradeChoices.innerHTML = "";
  upgradeChoices.classList.remove("choices-split");
  upgradeChoices.classList.remove("choices-grid-four");
  setUpgradeOverlayHeader("ボス報酬", "報酬を選ぶ");
  upgradeChoices.appendChild(createBossRewardButton("attack"));
  upgradeChoices.appendChild(createBossRewardButton("hp"));
  return true;
}

function openUpgrade(fromChest, chestTier = "normal") {
  state.paused = true;
  upgradeOverlay.classList.remove("hidden");
  upgradeChoices.innerHTML = "";

  if (!fromChest) {
    setUpgradeOverlayHeader("レベルアップ", "強化を選ぶ");
    renderLevelUpgradeColumns();
    return;
  }

  setUpgradeOverlayHeader(getChestLabel(chestTier), "宝を選ぶ");
  const pool = buildUpgradePool(true).filter((upgrade) => !upgrade.rainbow);
  const choiceCount = chestTier === "boss" ? 4 : 3;
  const picks = maybeInjectRainbowUpgrade(pickRandomUpgrades(pool, choiceCount, true, chestTier), chestTier);
  renderUpgradePicks(picks, true, chestTier);
}
