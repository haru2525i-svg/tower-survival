let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function shouldBlockBrowserShortcut(code) {
  return code === "Space"
    || code === "ArrowUp"
    || code === "ArrowDown"
    || code === "ArrowLeft"
    || code === "ArrowRight";
}

function isGameplayInputReady() {
  return Boolean(state.player && state.running && !state.gameOver && !state.paused);
}

function clearLiveInputState() {
  keys.clear();
  state.mouse.down = false;
}

window.addEventListener("keydown", (event) => {
  if (shouldBlockBrowserShortcut(event.code)) {
    event.preventDefault();
  }
  keys.add(event.code);
  if (!isGameplayInputReady()) return;

  if (event.code === "KeyR") {
    startReload();
  } else if (event.code === "KeyQ") {
    tryUseSkillShot();
  } else if (event.code === "KeyE") {
    useStrongSlash();
  } else if (event.code === "KeyX" && !event.repeat) {
    tryUseRainbowSkill();
  } else if (event.code === "KeyF" && !event.repeat) {
    state.player.autoAttack = !state.player.autoAttack;
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

window.addEventListener("blur", clearLiveInputState);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearLiveInputState();
  }
});

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = WIDTH / rect.width;
  const scaleY = HEIGHT / rect.height;
  state.mouse.x = (event.clientX - rect.left) * scaleX;
  state.mouse.y = (event.clientY - rect.top) * scaleY;
  updateMouseWorld();
});

canvas.addEventListener("mousedown", (event) => {
  if (event.button === 0) {
    if (!isGameplayInputReady()) return;
    if (tryClickSanctuaryOrb()) return;
    state.mouse.down = true;
    tryFirePrimary();
  }
});

window.addEventListener("mouseup", (event) => {
  if (event.button === 0) {
    state.mouse.down = false;
  }
});

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartCurrentRun);
titleButton.addEventListener("click", requestTitleReturn);
gameReturnButton.addEventListener("click", requestTitleReturn);
returnYesButton.addEventListener("click", returnToSelectionScreen);
returnNoButton.addEventListener("click", cancelTitleReturn);
menuAdventureButton.addEventListener("click", () => switchStartMenu("adventure"));
menuPracticeButton.addEventListener("click", () => switchStartMenu("practice"));
menuRecordsButton.addEventListener("click", () => switchStartMenu("records"));
adventureBackButton.addEventListener("click", () => switchStartMenu("home"));
practiceMenuBackButton.addEventListener("click", () => switchStartMenu("home"));
recordsBackButton.addEventListener("click", () => switchStartMenu("home"));
practiceButton.addEventListener("click", startPracticeHub);
if (practicePanelToggle) {
  practicePanelToggle.addEventListener("click", togglePracticePanel);
}
practiceBossHpSelect.addEventListener("change", () => setPracticeBossHpMode(practiceBossHpSelect.value));
if (practiceDifficultySelect) {
  practiceDifficultySelect.addEventListener("change", () => setPracticeDifficulty(practiceDifficultySelect.value));
}
practiceCopyLastButton.addEventListener("click", copyLastRunToPractice);
practiceHpDown.addEventListener("click", () => setPracticeBaseHp(state.practiceBaseHp - 10));
practiceHpUp.addEventListener("click", () => setPracticeBaseHp(state.practiceBaseHp + 10));
practiceHpValue.addEventListener("click", () => setPracticeBaseHp(100));
practiceBaseAttackDown.addEventListener("click", () => setPracticeBaseAttackBonus(state.practiceBaseAttackBonus - 5));
practiceBaseAttackUp.addEventListener("click", () => setPracticeBaseAttackBonus(state.practiceBaseAttackBonus + 5));
practiceBaseAttackValue.addEventListener("click", () => setPracticeBaseAttackBonus(0));
practiceResetUnlockButton.addEventListener("click", () => {
  const confirmed = window.confirm("現在のスキル構成を初期化しますか？");
  if (!confirmed) return;
  resetPracticeSelections();
});
for (const button of difficultyButtons) {
  button.addEventListener("click", () => selectDifficulty(button.dataset.difficulty));
}
for (const button of effectButtons) {
  button.addEventListener("click", () => selectEffectMode(button.dataset.effectMode));
}
updateDifficultyButtons();
updateEffectButtons();
renderRunHistory();
renderPracticeMenuStatus();
switchStartMenu("home");

resetGame();
draw();
requestAnimationFrame(loop);


