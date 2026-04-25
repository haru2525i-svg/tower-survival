const PLAYER_NAME_STORAGE_KEY = getBuildStorageKey("towerSurvivalPlayerName");
const ONLINE_RANKING_DEFAULT_NAME = "名無し";
const ONLINE_RANKING_MAX_NAME_LENGTH = 20;
const ONLINE_RANKING_LIMIT = 10;
const ONLINE_RANKING_STATUS = Object.freeze({
  disabled: "disabled",
  idle: "idle",
  loading: "loading",
  ready: "ready",
  error: "error",
});

const ONLINE_RANKING_DIFFICULTY_SCORE = Object.freeze({
  easy: 1,
  normal: 2,
  hard: 3,
  gamer: 4,
});

const onlineRankingState = {
  entries: [],
  status: ONLINE_RANKING_STATUS.idle,
  message: "",
  dirty: true,
};

let onlineRankingDatabase = null;

function normalizeStoredPlayerName(value) {
  return Array.from(String(value ?? "").trim()).slice(0, ONLINE_RANKING_MAX_NAME_LENGTH).join("");
}

function getEffectivePlayerName(value = playerNameInput?.value ?? "") {
  const normalized = normalizeStoredPlayerName(value);
  return normalized || ONLINE_RANKING_DEFAULT_NAME;
}

function loadStoredPlayerName() {
  try {
    return normalizeStoredPlayerName(localStorage.getItem(PLAYER_NAME_STORAGE_KEY) ?? "");
  } catch {
    return "";
  }
}

function saveStoredPlayerName(value) {
  try {
    const normalized = normalizeStoredPlayerName(value);
    if (normalized) {
      localStorage.setItem(PLAYER_NAME_STORAGE_KEY, normalized);
    } else {
      localStorage.removeItem(PLAYER_NAME_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors so the game can continue.
  }
}

function syncPlayerNameInput() {
  if (!playerNameInput) return;
  const normalized = normalizeStoredPlayerName(playerNameInput.value);
  if (playerNameInput.value !== normalized) {
    playerNameInput.value = normalized;
  }
  saveStoredPlayerName(normalized);
}

function formatOnlineTime(value) {
  return formatTime(Math.max(0, Math.floor(Number(value) || 0)));
}

function getOnlineRankingPath() {
  return window.TOWER_FIREBASE_OPTIONS?.leaderboardPath || "towerSurvivalLeaderboard";
}

function getFirebaseDatabaseInstance() {
  if (onlineRankingDatabase) return onlineRankingDatabase;
  if (typeof firebase === "undefined") return null;

  const config = window.TOWER_FIREBASE_CONFIG ?? {};
  const requiredKeys = ["apiKey", "authDomain", "databaseURL", "projectId", "appId"];
  if (requiredKeys.some((key) => typeof config[key] !== "string" || !config[key].trim())) {
    return null;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    onlineRankingDatabase = firebase.database();
    return onlineRankingDatabase;
  } catch (error) {
    console.warn("[online-ranking] Firebase initialization failed.", error);
    return null;
  }
}

function getOnlineRankingRef() {
  const database = getFirebaseDatabaseInstance();
  if (!database) return null;
  return database.ref(getOnlineRankingPath());
}

function createLeaderboardScore({ won, difficultyKey, stage, timeSeconds, level }) {
  const clearBonus = won ? 1 : 0;
  const difficultyScore = ONLINE_RANKING_DIFFICULTY_SCORE[difficultyKey] ?? 0;
  const safeStage = Math.max(1, Math.floor(Number(stage) || 0));
  const safeTime = Math.max(0, Math.floor(Number(timeSeconds) || 0));
  const safeLevel = Math.max(1, Math.floor(Number(level) || 0));

  return (clearBonus * 100000000000)
    + (difficultyScore * 1000000000)
    + (safeStage * 10000000)
    + (Math.max(0, 999999 - safeTime) * 10)
    + Math.min(9, safeLevel);
}

function buildOnlineScorePayload(won, name, score) {
  const { combat, run, stage } = state;
  const player = combat.player;
  const timeSeconds = Math.max(0, Math.floor(run.time));

  return {
    name: getEffectivePlayerName(name),
    score: Math.max(0, Math.floor(Number(score) || 0)),
    difficulty: getDifficultyDisplayLabel(),
    time: timeSeconds,
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    result: won ? "clear" : "fail",
    stage: won ? getCurrentAdventureStageCount() : (stage.stageIndex + 1),
    level: Math.max(1, Math.floor(Number(player?.level) || 1)),
  };
}

function createOnlineRankingEmpty(text) {
  const empty = document.createElement("div");
  empty.className = "history-empty";
  empty.textContent = text;
  return empty;
}

function renderOnlineRanking() {
  if (!onlineRankingList) return;

  onlineRankingList.innerHTML = "";

  if (onlineRankingState.status === ONLINE_RANKING_STATUS.loading) {
    onlineRankingList.appendChild(createOnlineRankingEmpty("オンラインランキングを読み込み中です。"));
    return;
  }

  if (onlineRankingState.status === ONLINE_RANKING_STATUS.disabled) {
    onlineRankingList.appendChild(createOnlineRankingEmpty(onlineRankingState.message || "Firebase設定が未入力のため、オンラインランキングはまだ使えません。"));
    return;
  }

  if (onlineRankingState.status === ONLINE_RANKING_STATUS.error) {
    onlineRankingList.appendChild(createOnlineRankingEmpty(onlineRankingState.message || "オンラインランキングの読み込みに失敗しました。"));
    return;
  }

  if (!onlineRankingState.entries.length) {
    onlineRankingList.appendChild(createOnlineRankingEmpty("まだオンラインランキングの記録はありません。"));
    return;
  }

  onlineRankingState.entries.forEach((entry, index) => {
    const card = document.createElement("article");
    card.className = "online-ranking-card";

    const header = document.createElement("div");
    header.className = "online-ranking-header";

    const rank = document.createElement("span");
    rank.className = "online-ranking-rank";
    rank.textContent = `#${index + 1}`;

    const name = document.createElement("strong");
    name.className = "online-ranking-name";
    name.textContent = entry.name || ONLINE_RANKING_DEFAULT_NAME;

    header.append(rank, name);

    const meta = document.createElement("div");
    meta.className = "online-ranking-meta";
    const resultLabel = entry.result === "clear" ? "クリア" : "敗北";
    const stageText = Number.isFinite(Number(entry.stage)) ? ` / ${Math.max(1, Number(entry.stage) || 1)}階層` : "";
    const levelText = Number.isFinite(Number(entry.level)) ? ` / Lv ${Math.max(1, Number(entry.level) || 1)}` : "";
    meta.textContent = `${resultLabel} / ${entry.difficulty || "不明"} / ${formatOnlineTime(entry.time)}${levelText}${stageText}`;

    const foot = document.createElement("div");
    foot.className = "online-ranking-foot";
    const createdAt = Number(entry.createdAt) || 0;
    const createdText = createdAt > 0
      ? new Date(createdAt).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      : "日時未取得";
    foot.textContent = `記録日時: ${createdText}`;

    card.append(header, meta, foot);
    onlineRankingList.appendChild(card);
  });
}

async function sendScore(name, score, payloadOverride = null) {
  const rankingRef = getOnlineRankingRef();
  if (!rankingRef) {
    throw new Error("Firebase database is not configured.");
  }

  const payload = payloadOverride ?? {
    name: getEffectivePlayerName(name),
    score: Math.max(0, Math.floor(Number(score) || 0)),
    difficulty: getDifficultyDisplayLabel(),
    time: Math.max(0, Math.floor(state.run.time)),
    createdAt: firebase.database.ServerValue.TIMESTAMP,
  };

  const entryRef = rankingRef.push();
  await entryRef.set(payload);
  return payload;
}

async function getScores() {
  const rankingRef = getOnlineRankingRef();
  if (!rankingRef) {
    return [];
  }

  const snapshot = await rankingRef
    .orderByChild("score")
    .limitToLast(ONLINE_RANKING_LIMIT)
    .once("value");

  const entries = [];
  snapshot.forEach((childSnapshot) => {
    const value = childSnapshot.val();
    if (!value || typeof value !== "object") return;
    entries.push({
      id: childSnapshot.key,
      ...value,
    });
  });

  entries.sort((a, b) => {
    const scoreDiff = (Number(b.score) || 0) - (Number(a.score) || 0);
    if (scoreDiff !== 0) return scoreDiff;
    return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
  });

  return entries.slice(0, ONLINE_RANKING_LIMIT);
}

async function refreshOnlineRanking(force = false) {
  if (!force && !onlineRankingState.dirty && onlineRankingState.status === ONLINE_RANKING_STATUS.ready) {
    renderOnlineRanking();
    return;
  }

  if (!getOnlineRankingRef()) {
    onlineRankingState.entries = [];
    onlineRankingState.status = ONLINE_RANKING_STATUS.disabled;
    onlineRankingState.message = "Firebase設定が未入力のため、オンラインランキングはまだ使えません。";
    onlineRankingState.dirty = false;
    renderOnlineRanking();
    return;
  }

  onlineRankingState.status = ONLINE_RANKING_STATUS.loading;
  onlineRankingState.message = "";
  renderOnlineRanking();

  try {
    onlineRankingState.entries = await getScores();
    onlineRankingState.status = ONLINE_RANKING_STATUS.ready;
    onlineRankingState.dirty = false;
  } catch (error) {
    console.warn("[online-ranking] Ranking fetch failed.", error);
    onlineRankingState.entries = [];
    onlineRankingState.status = ONLINE_RANKING_STATUS.error;
    onlineRankingState.message = "オンラインランキングの読み込みに失敗しました。";
  }

  renderOnlineRanking();
}

async function submitOnlineRunResult(won) {
  const { combat, practice, run, stage } = state;
  if (!combat.player || practice.practiceMode) return;
  if (!getOnlineRankingRef()) return;

  const name = getEffectivePlayerName();
  const score = createLeaderboardScore({
    won,
    difficultyKey: run.difficultyKey,
    stage: won ? getCurrentAdventureStageCount() : (stage.stageIndex + 1),
    timeSeconds: Math.max(0, Math.floor(run.time)),
    level: combat.player.level,
  });

  onlineRankingState.dirty = true;

  try {
    await sendScore(name, score, buildOnlineScorePayload(won, name, score));
  } catch (error) {
    console.warn("[online-ranking] Ranking submit failed.", error);
  }
}

function initializeOnlineRanking() {
  if (playerNameInput) {
    playerNameInput.value = loadStoredPlayerName();
    playerNameInput.addEventListener("input", syncPlayerNameInput);
    playerNameInput.addEventListener("blur", syncPlayerNameInput);
  }
  renderOnlineRanking();
}

initializeOnlineRanking();
