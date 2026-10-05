// ═══════════════════════════════════════
//  遊戲狀態
// ═══════════════════════════════════════
let playerName     = '';
let playerAge      = '';
let playerGender   = 'male';
let selectedMentor = null;
let currentSeed    = '';
let currentVariant = null;
let currentStages  = [];
let npcs           = [];

let stats        = {};
let mentorScore  = {};
let styleCounter = { A: 0, B: 0, C: 0 };
let fans         = 0;
let stageIdx     = 0;
let timer        = null;
let timeLeft     = 0;
let answered     = false;
let pendingElim  = false;
let hasRevived   = false;
let wasRevived   = false;

// ═══════════════════════════════════════
//  畫面切換與進場動畫
// ═══════════════════════════════════════
function showScreen(id) {
  ['setup-screen','intro-screen','game-screen','eliminated-screen','result-screen'].forEach(s => {
    const el = document.getElementById(s);
    if (!el) return;
    if (s === id) {
      el.classList.add('active');
      el.classList.remove('fade-out');
    } else {
      el.classList.remove('active');
    }
  });
}

function runIntro() {
  const introScreen  = document.getElementById('intro-screen');
  const countdownEl  = document.getElementById('intro-countdown');
  const enterBtn     = document.getElementById('intro-enter-btn');
  const playerNameEl = document.getElementById('intro-player-name');
  const mentorNameEl = document.getElementById('intro-mentor-name');

  if (!introScreen) return;

  const mentor = getMentor();
  if (playerNameEl) playerNameEl.textContent = playerName;
  if (mentorNameEl && mentor) {
    mentorNameEl.textContent = mentor.icon + '  ' + mentor.name + ' 導師帶隊';
  }

  showScreen('intro-screen');

  let cIdx = 0;
  const counts = [3, 2, 1];

  setTimeout(() => {
    function showCount() {
      if (!countdownEl) return;
      if (cIdx >= counts.length) {
        countdownEl.innerHTML = '';
        if (enterBtn) {
          enterBtn.style.display = 'block';
          enterBtn.addEventListener('click', enterGame, { once: true });
        }
        return;
      }
      countdownEl.innerHTML = '<span class="countdown-num">' + counts[cIdx] + '</span>';
      cIdx++;
      setTimeout(showCount, 900);
    }
    showCount();
  }, 750);
}

function enterGame() {
  const introScreen = document.getElementById('intro-screen');
  if (!introScreen) return;

  introScreen.classList.add('fade-out');
  setTimeout(() => {
    introScreen.classList.remove('active');
    introScreen.classList.remove('fade-out');
    showScreen('game-screen');
    buildPips();
    loadStage();
  }, 520);
}

// ═══════════════════════════════════════
//  初始化
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const introEl = document.getElementById('intro-screen');
  if (introEl) introEl.classList.remove('active');
  
  const resultStatusCard = document.getElementById('result-status-dropdown-btn');
  if (resultStatusCard) {
    resultStatusCard.addEventListener('click', () => {
      resultStatusCard.classList.toggle('open');
    });
  }
  
  const closeBtn = document.getElementById('card-modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('card-modal-overlay').style.display = 'none';
    });
  }

  currentSeed = generateSeed();
  const seedInputEl = document.getElementById('seed-input');
  if (seedInputEl) {
    seedInputEl.value = currentSeed;
    seedInputEl.addEventListener('input', () => {
      const val = seedInputEl.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      seedInputEl.value = val;
      if (val.length === 6) currentSeed = val;
    });
  }

  const seedRollBtn = document.getElementById('seed-roll-btn');
  if (seedRollBtn) {
    seedRollBtn.addEventListener('click', () => {
      currentSeed = generateSeed();
      if (seedInputEl) seedInputEl.value = currentSeed;
    });
  }

  document.querySelectorAll('.gender-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      playerGender = btn.dataset.gender;
    });
  });

  document.querySelectorAll('.mentor-select-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.mentor-select-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedMentor = card.dataset.mentor;
      checkEnterBtn();
    });
  });

  const nameInput = document.getElementById('user-name');
  const ageInput  = document.getElementById('user-age');
  if (nameInput) nameInput.addEventListener('input', checkEnterBtn);
  if (ageInput)  ageInput.addEventListener('input',  checkEnterBtn);

  const enterBtn = document.getElementById('enter-btn');
  if (enterBtn) enterBtn.addEventListener('click', startGame);

  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) nextBtn.addEventListener('click', () => { stageIdx++; loadStage(); });

  const reviveBtn = document.getElementById('revive-btn');
  if (reviveBtn) reviveBtn.addEventListener('click', reviveNow);

  const elimEndBtn = document.getElementById('elim-end-btn');
  if (elimEndBtn) elimEndBtn.addEventListener('click', () => {
    showScreen('result-screen');
    renderResult();
  });

  // 📸 戰績卡按鈕綁定
  const shareBtn = document.getElementById('share-card-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', generateShareCard);
  }

  // 🌟 參考圖風格：頂部狀態選單展開/收合
  const statusCard = document.getElementById('status-dropdown-btn');
  if (statusCard) {
    statusCard.addEventListener('click', () => {
      statusCard.classList.toggle('open');
    });
  }
});

function checkEnterBtn() {
  const nameEl  = document.getElementById('user-name');
  const ageEl   = document.getElementById('user-age');
  const enterEl = document.getElementById('enter-btn');
  if (!nameEl || !ageEl || !enterEl) return;
  const ok = nameEl.value.trim() !== '' && ageEl.value.trim() !== '' && selectedMentor !== null;
  enterEl.disabled = !ok;
}

// ═══════════════════════════════════════
//  種子碼與排名工具
// ═══════════════════════════════════════
function generateSeed() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let seed = '';
  for (let i = 0; i < 6; i++) seed += chars[Math.floor(Math.random() * chars.length)];
  return seed;
}

function pickVariant(seed) {
  return VARIANTS[seedToNum(seed) % VARIANTS.length];
}

function pickQuestions(seed) {
  const n        = seedToNum(seed);
  const prePool  = QUESTION_POOL.filter(q => q.phase === '預賽');
  const semiPool = QUESTION_POOL.filter(q => q.phase === '準決賽');
  const finPool  = QUESTION_POOL.filter(q => q.phase === '決賽');

  function seedShuffle(arr, offset) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = (n * (i + 1) + offset) % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const pre  = seedShuffle(prePool, 1).slice(0, 2);
  const semi = seedShuffle(semiPool, 2).slice(0, 2);

  const finIndex = (n * 17 + 5) % finPool.length;
  const fin = [finPool[finIndex]];

  return [...pre, ...semi, ...fin];
}


function pickSpecials(seed) {
  const n    = seedToNum(seed);
  const pool = [...SPECIAL_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = (n * (i + 7)) % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 2);
}

function getDiffInfo(stage) {
  if (!stage || stage.isEvent) return null;
  return getTimerByDifficulty(stage.phase);
}

function getTimer(stage) {
  if (!stage || stage.isEvent) return 0;
  return getTimerByDifficulty(stage.phase).seconds;
}

function calcRanking() {
  const statSum = STAT_KEYS.reduce((s, k) => s + stats[k], 0);
  const minStat = Math.min(...STAT_KEYS.map(k => stats[k] || 0));
  let balancePenalty = 0;
  // 如果有致命死穴（單項低於 45 分，例如數據 33 分），重扣 40 分防止偏科拿第一！
  if (minStat < 45) {
    balancePenalty = 40;
  } else if (minStat < 55) {
    balancePenalty = 15;
  }
  // 🎯 策略核心：三位一體「反無腦機制」！
  let styleBonus = 0;

  // 1. 無腦全選 A（死板機器人）：選 A 超過 4 次且完全不選 B/C
  if (styleCounter.A >= 4 && styleCounter.B === 0 && styleCounter.C === 0) {
    styleBonus = -15; 
  }
  // 2. 🚨 新增：無腦狂選 B（暴走狂躁派）：整場大吼大叫超過 3 次
  else if (styleCounter.B >= 3 && styleCounter.A <= 1) {
    styleBonus = -20; // 評審評語：失去中立性與專業克制，淪為球迷自嗨
  }
  // 3. 🚨 新增：無腦狂選 C（神棍算命派）：整場瞎猜預測超過 3 次
  else if (styleCounter.C >= 3 && styleCounter.A <= 1) {
    styleBonus = -20; // 評審評語：毫無數據根據，把正式轉播當綜藝秀
  }
  // 4. 🌟 獎勵：文武雙全！以專業 A 為底，懂得適時爆發 B 或製造綜藝 C
  else if (styleCounter.A >= 2 && (styleCounter.B >= 1 || styleCounter.C >= 1)) {
    styleBonus = 15; // 評審評語：風格靈活多變，深具大將之風！
  }
 
  const fanBonus = Math.min(25, Math.floor(fans / 500)); 

  // 最終核算總分：扣除偏科懲罰，加上風格紅利與人氣加成
  const playerFinalScore = Math.max(0, statSum - balancePenalty + styleBonus + fanBonus);

  return npcs.filter(n => n.total > playerFinalScore).length + 1;
}

function updateRankDisplayOnPanel() {
  const rank  = calcRanking();
  const total = npcs.length + 1;
  const summaryEl = document.getElementById('dsc-player-summary');
  
  if (summaryEl) {
    const totalStats = STAT_KEYS.reduce((s, k) => s + stats[k], 0);
    summaryEl.textContent = '綜合戰力：' + totalStats + ' | 目前排名 #' + rank + '/' + total;
  }
}

function updateRankDisplayOnPanel() {
  const rank  = calcRanking();
  const total = npcs.length + 1;
  const summaryEl = document.getElementById('dsc-player-summary');
  
  if (summaryEl) {
    const totalStats = STAT_KEYS.reduce((s, k) => s + stats[k], 0);
    summaryEl.textContent = '綜合戰力：' + totalStats + ' | 目前排名 #' + rank + '/' + total;
  }
}

// ═══════════════════════════════════════
//  導師系統
// ═══════════════════════════════════════
function initMentorScore() {
  mentorScore = {};
  mentorScore[selectedMentor] = 60;
}

function getMentor() {
  return MENTORS[selectedMentor] || null;
}

function calcMentorDelta(optType) {
  const mentor = getMentor();
  if (!mentor) return 0;
  let delta = 0;
  mentor.likes.forEach(k    => { if (stats[k] >= 60) delta += 2; });
  mentor.dislikes.forEach(k => { if (stats[k] >= 70) delta -= 2; });
   if (mentor.optBonus && mentor.optBonus.includes(optType)) {delta += 2;}
  if (optType === mentor.optPenalty) delta -= 2;
  return delta;
}

function updateMentorScore(optType) {
  const delta = calcMentorDelta(optType);
  mentorScore[selectedMentor] = Math.max(0, Math.min(100, (mentorScore[selectedMentor] || 50) + delta));
  renderMentorBar();
}

function renderMentorBar() {
  const mentor = getMentor();
  if (!mentor) return;
  const score = mentorScore[selectedMentor] || 50;
  const fill  = document.getElementById('single-mentor-fill');
  const val   = document.getElementById('single-mentor-val');
  const label = document.getElementById('single-mentor-label');
  if (fill)  fill.style.width  = score + '%';
  if (val)   val.textContent   = score;
  if (label) label.textContent = mentor.icon + ' ' + mentor.name;
}

function getFinalMentorComment() {
  const score = mentorScore[selectedMentor] || 50;
  const id    = selectedMentor;
  if (id === 'qianyeye') {
    if      (score >= 75) return '數據引用頻率達標，術語誤用率控制在 3% 以內。這個成績，我給過。';
    else if (score >= 50) return '數據底子勉強及格，但有幾處打擊率和防禦率混用，下次我不會假裝沒看見。';
    else                  return '不合格。你的數據引用錯誤率超過容忍上限，回去把《棒球統計學》重新看一遍。';
  }
  if (id === 'dapangge') {
    if      (score >= 75) return '史料掌握相當紮實，不過細節還有一兩處年份記錯，小地方要注意喔。';
    else if (score >= 50) return '歷史數據引用大致正確，但深度不夠，只停留在表面數字，沒有挖掘背後故事脈絡。';
    else                  return '嗯⋯⋯有幾個歷史對戰紀錄說錯了，我推了三次眼鏡。建議把近五年對戰資料重新整理一遍。';
  }
  if (id === 'ningning') {
    if      (score >= 75) return '聽到你最後那段播報，我起雞皮疙瘩了。那個語速的拉伸和情緒的收放，就是我要的張力。';
    else if (score >= 50) return '有幾個高潮時刻呼吸節奏掌握得不錯，但平淡局面還是太死板，要讓觀眾感覺你在說話，不是在唸稿。';
    else                  return '播報語速太平了，高潮和低潮聽起來一個樣。棒球比賽是有生命的，你的聲音也要跟著呼吸。';
  }
  return '繼續努力。';
}

function getStyleAnalysis() {
  const a = styleCounter.A, b = styleCounter.B, c = styleCounter.C;
  if (a >= 4) return { icon:'🎙', title:'專業正統派', desc:'術語精準、節奏穩健，有職業主播的架勢。數據交代清晰，評審最欣賞這種紮實的底子。' };
  if (b >= 3) return { icon:'🔥', title:'激情情緒派', desc:'感染力爆表，觀眾跟著你的情緒起伏。但情緒化播報容易失去中立性，高潮之後需要更快收回。' };
  if (c >= 3) return { icon:'🎯', title:'娛樂預測派', desc:'觀眾喜歡你的娛樂感和話題性。預測型播報製造懸念，但專業底子仍需加強。' };
  if (a >= 2 && b >= 2) return { icon:'⚡', title:'專業激情混血型', desc:'穩中帶爆發，能在關鍵時刻拉高情緒又不完全失控。這種平衡感很難得。' };
  if (a >= 2 && c >= 2) return { icon:'🌟', title:'專業娛樂混血型', desc:'有深度也有話題性，專業分析和娛樂預測並存。這種風格最有潛力發展個人特色。' };
  if (b >= 2 && c >= 2) return { icon:'📣', title:'熱血娛樂派', desc:'充滿能量和娛樂性，現場感十足。觀眾不會無聊，但需要在專業面多下功夫。' };
  return { icon:'🏆', title:'全能均衡型', desc:'各方面表現平均，沒有明顯弱點。這是最難達到的播報狀態，代表你能適應各種局面。' };
}

function renderStyleAnalysis() {
  const analysis = getStyleAnalysis();
  const iconEl   = document.getElementById('style-icon');
  const titleEl  = document.getElementById('style-title');
  const descEl   = document.getElementById('style-desc');
  const barRow   = document.getElementById('style-bar-row');

  if (iconEl)  iconEl.textContent  = analysis.icon;
  if (titleEl) titleEl.textContent = analysis.title;
  if (descEl)  descEl.textContent  = analysis.desc;

  if (barRow) {
    barRow.innerHTML =
      '<span class="style-bar-chip style-bar-a">專業 A × ' + styleCounter.A + '</span>' +
      '<span class="style-bar-chip style-bar-b">情緒 B × ' + styleCounter.B + '</span>' +
      '<span class="style-bar-chip style-bar-c">娛樂 C × ' + styleCounter.C + '</span>';
  }
}

// ═══════════════════════════════════════
//  開始遊戲與關卡循環
// ═══════════════════════════════════════
function startGame() {
  playerName = document.getElementById('user-name').value.trim();
  playerAge  = document.getElementById('user-age').value.trim();

  const seedInput = document.getElementById('seed-input');
  if (!seedInput || seedInput.value.length < 6) {
    currentSeed = generateSeed();
    if (seedInput) seedInput.value = currentSeed;
  } else {
    currentSeed = seedInput.value;
  }

  const baseVariant = pickVariant(currentSeed);
  currentVariant = {
    ...baseVariant,
    displayName: playerName + ' — ' + baseVariant.name,
    typeName:    baseVariant.name
  };

  const mentor    = getMentor();
  const initStats = { ...currentVariant.stats };
  if (mentor && mentor.initBonus) {
    Object.keys(mentor.initBonus).forEach(k => {
      if (initStats[k] !== undefined) {
        initStats[k] = Math.max(10, Math.min(95, initStats[k] + mentor.initBonus[k]));
      }
    });
  }
  stats = initStats;

  initMentorScore();
  styleCounter = { A: 0, B: 0, C: 0 };
  fans = 0; stageIdx = 0;
  hasRevived = false; wasRevived = false;

  npcs = generateNPCs(currentVariant, currentSeed);

  const questions = pickQuestions(currentSeed);
  const specials  = pickSpecials(currentSeed);

  if (questions.length < 5 || specials.length < 2) {
    alert('題目資料不足，請檢查 data.js 的題庫。');
    return;
  }

  currentStages = [
    questions[0],
    questions[1],
    { ...specials[0], isEvent: true },
    questions[2],
    questions[3],
    { ...specials[1], isEvent: true },
    questions[4]
  ];

  renderMentorBar();
  runIntro();
}

function buildPips() {
  const container = document.getElementById('stage-pips');
  if (!container) return;
  container.innerHTML = currentStages.map((s, i) =>
    '<div class="stage-pip' + (s.isEvent ? ' event' : '') + '" id="pip-' + i + '"></div>'
  ).join('');
}

function updatePips() {
  currentStages.forEach((s, i) => {
    const pip = document.getElementById('pip-' + i);
    if (!pip) return;
    const base = 'stage-pip' + (s.isEvent ? ' event' : '');
    pip.className = base + (i < stageIdx ? ' done' : i === stageIdx ? ' active' : '');
  });
}

function updateStats() {
  STAT_KEYS.forEach(k => {
    const v = Math.max(0, Math.min(100, stats[k]));
    const bar = document.getElementById('b-' + k);
    const val = document.getElementById('v-' + k);
    if (bar) bar.style.width = v + '%';
    if (val) val.textContent = v;
  });
  updateRankDisplayOnPanel();
}

function updateSocial(dFans) {
  fans = Math.max(0, fans + dFans);
  updateRankDisplayOnPanel();
}

function loadStage() {
  if (stageIdx >= currentStages.length) {
    showScreen('result-screen');
    renderResult();
    return;
  }

  answered    = false;
  pendingElim = false;
  const stage = currentStages[stageIdx];

  updatePips();
  updateStats();

  const gameScreen  = document.getElementById('game-screen');
  const finalBanner = document.getElementById('final-banner');
  if (stage.phase === '決賽') {
    if (gameScreen)  gameScreen.classList.add('is-final');
    if (finalBanner) finalBanner.classList.add('show');
  } else {
    if (gameScreen)  gameScreen.classList.remove('is-final');
    if (finalBanner) finalBanner.classList.remove('show');
  }

  const labelEl  = document.getElementById('q-label');
  const diffInfo = getDiffInfo(stage);
  if (labelEl) {
    if (stage.isEvent) {
      labelEl.textContent = '⚡ 特殊關卡 ' + stage.label;
      labelEl.className   = 'ec-category event-label';
    } else {
      const diffTag = diffInfo ? '<span class="difficulty-tag ' + diffInfo.cls + '">' + diffInfo.label + '</span>' : '';
      labelEl.innerHTML = '[' + stage.phase + '] ' + stage.label + ' ' + diffTag;
      labelEl.className = 'ec-category';
    }
  }

  const matchTag = document.getElementById('match-tag');
  if (matchTag) {
    matchTag.textContent   = stage.match || '';
    matchTag.style.display = stage.match ? 'block' : 'none';
  }

  const qText = document.getElementById('q-text');
  if (qText) qText.textContent = stage.q;

  const imgBox = document.getElementById('stage-img-container');
  const imgEl  = document.getElementById('stage-img');
  if (imgBox && imgEl) {
    if (stage.img) {
      imgEl.src = stage.img;
      imgBox.style.display = 'block';
    } else {
      imgBox.style.display = 'none';
    }
  }

  const toast = document.getElementById('feedback-toast');
  if (toast) { toast.className = 'feedback-toast'; toast.innerHTML = ''; }
  const dp = document.getElementById('delta-panel');
  if (dp) { dp.className = 'delta-panel'; dp.innerHTML = ''; }

  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) nextBtn.className = 'btn-primary next-btn';

  const row = document.querySelector('.timer-row');
  if (row) row.style.display = stage.isEvent ? 'none' : 'flex';

  const container = document.getElementById('options-container');
  if (!container) return;
  container.innerHTML = '';
  stage.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt.text;
    btn.addEventListener('click', () => chooseOption(i));
    container.appendChild(btn);
  });

  startTimer(stage);
}

function startTimer(stage) {
  if (timer) clearInterval(timer);
  const seconds = getTimer(stage);
  const fill    = document.getElementById('timer-fill');
  const num     = document.getElementById('timer-num');
  if (seconds === 0) return;

  timeLeft = seconds;
  if (fill) { fill.style.width = '100%'; fill.style.background = 'var(--green)'; }
  if (num)  num.textContent = seconds;

  timer = setInterval(() => {
    timeLeft--;
    if (fill) fill.style.width = (timeLeft / seconds * 100) + '%';
    if (num)  num.textContent  = timeLeft;
    if (fill) {
      if      (timeLeft <= 5) fill.style.background = 'var(--red)';
      else if (timeLeft <= seconds * 0.4) fill.style.background = 'var(--gold)';
    }
    if (timeLeft <= 0) { clearInterval(timer); timeoutChoice(); }
  }, 1000);
}

function timeoutChoice() {
  if (answered) return;
  answered = true;
  disableOptions();
  mentorScore[selectedMentor] = Math.max(0, (mentorScore[selectedMentor] || 50) - 15);
  renderMentorBar();
  
  applyEffect(
    { speaking:-10, reflex:-10, data:-5, term:-5, tension:-10 },
    { fans:-1200 }, 'timeout'
  );
  showFeedback('timeout');
  finishTurn();
}

function chooseOption(idx) {
  if (answered) return;
  answered = true;
  clearInterval(timer);

  const stage   = currentStages[stageIdx];
  const opt     = stage.options[idx];
  const seconds = getTimer(stage);
  const diff    = getDiffInfo(stage);

  if (opt.type && styleCounter[opt.type] !== undefined) {
    styleCounter[opt.type]++;
  }

  let mult = 1.0;
  if (opt.type === 'A' && seconds > 0 && diff) {
    mult = Math.min(1.15, diff.mult * 0.8);
    const ratio = timeLeft / seconds;
    if      (ratio > 0.70) mult *= 1.1; // 神速作答微加 10%
    else if (ratio < 0.25) mult *= 0.9;
  }

  const btns = document.querySelectorAll('.option-btn');
  if (btns[idx]) btns[idx].classList.add(
    opt.type === 'A' ? 'correct-flash' :
    opt.type === 'B' ? 'wrong-flash'   : 'neutral-flash'
  );
  disableOptions();

  applyEffect(opt.effect, opt.social, opt.type, mult);

  if (stage.roleBonus && stage.roleBonus[currentVariant.id]) {
    const bonus = stage.roleBonus[currentVariant.id];
    if (bonus.optType === opt.type) {
      const bonusEff    = { ...bonus.bonus };
      const socialBonus = {};
      if (bonusEff.fans) { socialBonus.fans = bonusEff.fans; delete bonusEff.fans; }
      delete bonusEff.ptt;
      applyEffect(bonusEff, socialBonus, 'bonus');
    }
  }

  updateMentorScore(opt.type);
  npcs = fluctuateNPCs(npcs, currentSeed, stageIdx);
  showFeedback(opt.type);
  finishTurn();
}
function applyEffect(eff, social, optType, mult = 1) {
  const stage = currentStages[stageIdx];
  const before = {};

  // 1. 關鍵修復：必須先將目前當下的五角戰力完整備份到 before 裡！
  STAT_KEYS.forEach(k => {
    before[k] = stats[k] || 0;
  });

  if (eff) {
    STAT_KEYS.forEach(k => {
      if (eff[k] !== undefined && typeof eff[k] === 'number') {
        let delta = Math.round(eff[k] * mult);
        delta = Math.max(-10, Math.min(10, delta));
        stats[k] = (stats[k] || 0) + delta;
      }
      // 確保數值永遠在 0 到 100 之間，且絕對不是 NaN
      stats[k] = Math.max(0, Math.min(100, isNaN(stats[k]) ? 50 : stats[k]));
    });
  }

  updateStats();
  if (social) updateSocial(social.fans || 0);
  if (optType === 'bonus') return;

  const dp = document.getElementById('delta-panel');
  if (!dp) return;
  dp.innerHTML = '';
  let any = false;

  STAT_KEYS.forEach(k => {
    const diff = (stats[k] || 0) - (before[k] || 0); 
    if (diff !== 0 && !isNaN(diff)) {
      any = true;
      const chip = document.createElement('span');
      chip.className = 'delta-chip ' + (diff > 0 ? 'delta-pos' : 'delta-neg');
      chip.textContent = STAT_NAMES[k] + ' ' + (diff > 0 ? '+' : '') + diff;
      dp.appendChild(chip);
    }
  });

  if (any) dp.className = 'delta-panel show';

  const zeroCount = STAT_KEYS.filter(k => stats[k] <= 0).length;
  const totalStats = STAT_KEYS.reduce((s, k) => s + stats[k], 0);
  const currentMentorScore = mentorScore[selectedMentor] || 50;

  const isSkillCollapsed = zeroCount >= 2 || totalStats < 160;
  const isMentorFired = zeroCount >= 2 && currentMentorScore < 35;

  if (isSkillCollapsed || isMentorFired) {
    pendingElim = true;
  }
}
// 📱 8 大場外事件專屬劇本吃瓜反饋庫
const SPECIFIC_EVENT_COMMENTS = {
  // s01: 休息室挑釁
  s01: {
    A: ['💬 休息室選手私語：「哇這新人被酸還能笑著回應，心態很穩喔。」'],
    B: ['👀 現場工作人員抓頭：「火氣太大了啦，等下上主播台不要吵起來就好...」'],
    C: ['💬 對手冷笑：「切，隨便講一句就嚇到不敢講話，抗壓真差。」', '👀 製作人皺眉：「氣場完全被壓過去了，上了大場面容易怯場。」']
  },
  // s02: 前輩施壓
  s02: {
    A: ['💬 前輩私下對球評說：「這年輕人懂進退、願意虛心求教，底子可以練。」', '👀 導播點頭：「尊重老前輩又能抓到重點，情商滿分！」'],
    B: ['💬 PTT 棒球板討論：「某素人主播竟然在走廊嗆退役球星，太狂了吧？！」'],
    C: ['👀 旁觀選手竊笑：「那個白眼被前輩看到了啦，等等講評要被電了。」']
  },
  // s05: 深夜 PTT 爆料
  s05: {
    A: ['💬 隔天早晨熱議：「選手完全不受爆料影響，早上準時到場備戰，真專業。」', '📢 公關組大讚：「冷處理非常成功！沒有給八卦自媒體續作文章的空間。」'],
    B: ['💬 PTT 八卦板置底爆文：「本尊開分身小號下場護航被抓包！推文戰了 300 樓！」', '📢 公關組崩潰：「危機處理 0 分！自己跳下去吵架，越描越黑了！」'],
    C: ['💬 隔天化妝師悄悄話：「他的眼睛腫得跟核桃一樣，昨晚肯定崩潰大哭了吧...」', '👀 導師嘆氣：「心態太脆弱了，做主播哪有不被酸民討論的？」']
  },
  // s08: 粉絲出征洗版
  s08: {
    A: ['💬 真心粉絲留言：「主播加油！過濾酸民，我們永遠支持你！」'],
    B: ['💬 網路截圖瘋傳：「主播跟酸民在留言區逐條對罵！火上加油！」', '👀 電視台高層搖頭：「這公關災難...完全被對方粉絲牽著鼻子走了。」'],
    C: ['💬 鄉民發文嘲諷：「怕被罵直接鎖帳號躲起來？這心理素質不行吧。」']
  },
  // s11: 主業加班衝突
  s11: {
    A: ['💬 製作人翻看你的筆記：「通勤跟中午都在啃數據，這熱情與意志力我給過！」', '👀 導師小石稱讚：「雖然時間有限，但重點數據抓得很精確！」'],
    B: ['💬 導播在導播室苦笑：「這選手一聽就是完全沒看球隊資料，純憑直覺在瞎掰。」', '👀 評審私語：「正職忙可以理解，但完全不準備上台就是不負責任。」'],
    C: ['💬 製作人皺眉：「職業轉播哪有因為累就請假的道理？」']
  },
  // s16: 桃色酒吧風波
  s16: {
    A: ['💬 公關組評估：極度乾淨俐落的危機處理，緋聞熱度迅速冷卻。'],
    B: ['💬 娛樂新聞頭條：「主播開直播激動痛哭！自毀形象遭網友狂截表情包！」'],
    C: ['💬 狗仔隊私語：「完全不回應？這態度好像有點默認的感覺喔。」']
  },
  // s20: 搭檔說錯話 (高飛打打打)
  s20: {
    A: ['💬 球評在休息時間讚嘆：「剛才接得太漂亮了！完全無縫覆蓋搭檔的口誤！」', '👀 導播在耳機裡拍手：「神反應！這就是搭檔默契的最高境界！」'],
    B: ['👀 製作團隊無奈：「雖然很有綜藝效果，但把搭檔架在火上烤不太厚道啊。」'],
    C: ['💬 現場空氣瞬間凝結 2 秒，觀眾彈幕：「剛才那是大放送的尷尬空白嗎...？」'],
  },
  // s23: 被嫌播報無聊
  s23: {
    A: ['💬 彈幕風向逆轉：「等等，剛才那個關鍵打席交代得超專業！這主播其實很有料！」', '👀 導師卡寶點頭：「不被酸民彈幕帶偏節奏，沉得住氣才是好主播。」'],
    B: ['💬 彈幕瘋狂洗版：「哈哈哈哈這主播被激怒直接發飆發瘋了！太搞笑了啦！」', '👀 導播頭痛：「這是在播棒球還是脫口秀？專業感完全蕩然無存了。」'],
    C: ['💬 彈幕持續嘲諷：「有改跟沒改一樣啊，聽起來還是催眠。」', '👀 評審私下講評：「想討好觀眾但改得半吊子，反而失去了自己的原本風格。」']
  }
};
function showFeedback(optType) {
  const t = document.getElementById('feedback-toast');
  if (!t) return;

  if (optType === 'timeout') {
    t.innerHTML = '<div class="judge-line">⏱ 時間到！反應不及格，現場開始出現議論。</div>';
    t.className = 'feedback-toast show wrong';
    return;
  }

  const stage = currentStages[stageIdx];
  let judgeHTML = '';
  if (stage && stage.isEvent) {
    const eventData = SPECIFIC_EVENT_COMMENTS[stage.id];
    let lines = [];
    if (eventData && eventData[optType]) {
      lines = eventData[optType];
    } else {
      lines = ['💬 現場觀眾：「這應對方式滿特別的，看看後續發展。」', '👀 製作人默默在筆記本下記下一筆。'];
    }

    judgeHTML =
      '<div class="feedback-section-label" style="color:var(--purple);">── 幕後風向與現場反應 ──</div>' +
      '<div class="judge-panel">' +
      lines.map(l => '<div class="judge-line">' + l + '</div>').join('') +
      '</div>';
  } else {

    const judgeLines = getJudgeComment(optType).split('\n');
    judgeHTML =
      '<div class="feedback-section-label">── 評審評語 ──</div>' +
      '<div class="judge-panel">' +
      judgeLines.map(l => '<div class="judge-line">' + l + '</div>').join('') +
      '</div>';
  }

  const mentor = getMentor();
  const delta  = calcMentorDelta(optType);
  const sign   = delta > 0 ? '+' : '';
  const cls    = delta > 0 ? 'mentor-delta-up' : delta < 0 ? 'mentor-delta-down' : 'mentor-delta-flat';
  const mentorHTML = mentor
    ? '<div class="feedback-section-label">── 導師反應 ──</div>' +
      '<div class="mentor-reaction-row"><span class="mentor-reaction-chip ' + cls + '">' +
      mentor.icon + ' ' + mentor.name + ' ' + sign + delta + '</span></div>'
    : '';

  t.innerHTML = judgeHTML + mentorHTML;
  t.className = 'feedback-toast show ' + (optType === 'A' ? 'correct' : optType === 'B' ? 'wrong' : 'neutral');
}
function disableOptions() {
  document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
}

function finishTurn() {
  if (pendingElim) {
    setTimeout(goEliminated, 1400);
  } else {
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) nextBtn.className = 'btn-primary next-btn show';
  }
}
// ═══════════════════════════════════════
//  淘汰、復活與結果頁
// ═══════════════════════════════════════
function goEliminated() {
  if (timer) clearInterval(timer);
  const gameScreen = document.getElementById('game-screen');
  if (gameScreen) gameScreen.classList.remove('is-final');

  const zeroed = STAT_KEYS.filter(k => stats[k] <= 0).map(k => STAT_NAMES[k]);
  const totalStats = STAT_KEYS.reduce((s, k) => s + stats[k], 0);
  const currentMentorScore = mentorScore[selectedMentor] || 50;
  const mentor = getMentor();
  const sub = document.getElementById('elim-sub');

  if (sub) {
    // 原因 1：被導師親手開除
    if (zeroed.length >= 1 && currentMentorScore < 40) {
      sub.innerHTML = '你的<strong>【' + zeroed.join('、') + '】</strong>歸零，且導師信任度僅剩 <strong>' + currentMentorScore + ' 分</strong>！<br>' +
        mentor.icon + ' ' + mentor.name + ' 導師無奈搖頭：「基本功不穩又屢勸不聽，我無法再帶你了。」你遭到導師親手淘汰（種子碼：' + currentSeed + '）。';
    } 
    // 原因 2：多項能力全面崩盤
    else if (zeroed.length >= 2) {
      sub.innerHTML = '你的<strong>【' + zeroed.join('、') + '】</strong>多項能力同時崩潰歸零，直播現場陷入重大失誤，被迫離開選秀舞台（種子碼：' + currentSeed + '）。';
    } 
    // 原因 3：總戰力過低
    else {
      sub.innerHTML = '你的綜合戰力僅剩 <strong>' + totalStats + ' 分</strong>，整體表現與同儕差距過大，慘遭選秀評審團末位淘汰（種子碼：' + currentSeed + '）。';
    }
  }

  const reviveBox = document.getElementById('revive-box');
  if (reviveBox) reviveBox.style.display = hasRevived ? 'none' : 'block';

  showScreen('eliminated-screen');
}

function reviveNow() {
  if (typeof VIDEO_URL !== 'undefined' && VIDEO_URL) {
    window.open(VIDEO_URL, '_blank');
  } else {
    console.warn('VIDEO_URL 尚未設定或未定義');
  }
  hasRevived = true;
  wasRevived = true;
  pendingElim = false;

  const mentor = getMentor();
  const initStats = { ...currentVariant.stats };
  if (mentor && mentor.initBonus) {
    Object.keys(mentor.initBonus).forEach(k => {
      if (initStats[k] !== undefined) {
        initStats[k] = Math.max(10, Math.min(95, initStats[k] + mentor.initBonus[k]));
      }
    });
  }
  stats = initStats;
  initMentorScore();
  updateStats();
  renderMentorBar();
  showScreen('game-screen');
  loadStage();
}

function renderResult() {
  if (timer) clearInterval(timer);

  const gameScreen = document.getElementById('game-screen');
  if (gameScreen) gameScreen.classList.remove('is-final');

  const row = document.querySelector('.timer-row');
  if (row) row.style.display = 'flex';

  const total = STAT_KEYS.reduce((s, k) => s + stats[k], 0);
  const statValues = {};
  STAT_KEYS.forEach(k => statValues[k] = stats[k]);
  const ranking = calcRanking();
  const topMentor = getMentor();

  const state = { total, fans, wasRevived, statValues, ranking };
  const ending = ENDINGS.find(e => e.condition(state));
  if (!ending) return;

  const titleEl = document.getElementById('r-title');
  if (titleEl) {
    titleEl.className = 'result-title' + (ending.titleClass ? ' ' + ending.titleClass : '');
    titleEl.textContent = ending.title(playerName);
  }

  const rankEl = document.getElementById('r-rank');
  if (rankEl) rankEl.textContent = ending.rank;

  const subEl = document.getElementById('r-subtitle');
  if (subEl) subEl.textContent = ending.subtitle(
    playerName, currentSeed, '', topMentor
  );

  const fanEl = document.getElementById('r-fans');
  if (fanEl) fanEl.textContent = formatNum(fans);

  STAT_KEYS.forEach(k => {
    const v = Math.max(0, Math.min(100, stats[k]));
    const bar = document.getElementById('rb-' + k);
    const val = document.getElementById('rv-' + k);
    if (bar) bar.style.width = v + '%';
    if (val) val.textContent = v;
  });

  renderStyleAnalysis();
  renderFinalMentorSection(ranking);
}

function renderFinalMentorSection(ranking) {
  const resultHero = document.getElementById('r-subtitle');
  if (!resultHero) return;

  const existRank = document.getElementById('final-rank-tag');
  const existMentor = document.getElementById('final-mentor-section');
  if (existRank) existRank.remove();
  if (existMentor) existMentor.remove();

  const rankTag = document.createElement('div');
  rankTag.id = 'final-rank-tag';
  rankTag.style.cssText = 'text-align:center; margin-top:14px;';
  rankTag.innerHTML =
    '<span style="font-size:13px; color:var(--text2);">最終排名 </span>' +
    '<span style="font-size:22px; font-weight:700; color:var(--gold);">#' + ranking + ' / ' + (npcs.length + 1) + '</span>';

  const mentor = getMentor();
  const score = mentorScore[selectedMentor] || 50;
  const comment = getFinalMentorComment();
  const barCls = score >= 70 ? 'final-mentor-bar-high' : score >= 40 ? 'final-mentor-bar-mid' : 'final-mentor-bar-low';

  const mentorSection = document.createElement('div');
  mentorSection.id = 'final-mentor-section';
  mentorSection.className = 'final-mentor-section';
  mentorSection.innerHTML =
    '<div class="section-title" style="margin-top:20px;">導師最終評語</div>' +
    '<div class="final-mentor-card chosen-mentor">' +
    '<div class="final-mentor-header">' +
    '<span class="final-mentor-name">' + mentor.icon + ' ' + mentor.name + '</span>' +
    '<span class="final-mentor-score ' + barCls + '">' + score + ' 分</span>' +
    '</div>' +
    '<div class="final-mentor-comment">' + comment + '</div>' +
    '</div>';

  resultHero.parentNode.insertBefore(rankTag, resultHero.nextSibling);
  resultHero.parentNode.insertBefore(mentorSection, rankTag.nextSibling);
}

// 📸 生成戰績卡主函數
function generateShareCard() {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1300;
  const ctx = canvas.getContext('2d');
  drawCardContent(ctx, canvas);
}

// 📸 官方底圖融合版：生成精美戰績卡 (Canvas)
function drawCardContent(ctx, canvas) {
  // 1. 載入官方背景底圖
  const bgImg = new Image();
  bgImg.src = 'assets/result_bg.png'; 
  
  bgImg.onload = () => {
    // 繪製底圖（鋪滿整個 Canvas）
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    // 疊加半透明暗色遮罩，讓文字和數據更立體突出
    ctx.fillStyle = 'rgba(9, 11, 16, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 繪製上層所有數據內容
    renderCardOverlay(ctx, canvas);
  };

  bgImg.onerror = () => {
    // 防呆：如果找不到底圖，自動退回原本的深色漸層
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#090b10');
    grad.addColorStop(0.5, '#121622');
    grad.addColorStop(1, '#050505');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    renderCardOverlay(ctx, canvas);
  };
}

// 繪製上層的數據與卡片內容
function renderCardOverlay(ctx, canvas) {
  // 金色雙層邊框
  ctx.strokeStyle = '#f5c842';
  ctx.lineWidth = 8;
  ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

  // 頂部主標題
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('THE ANNOUNCER OFFICIAL CARD', 70, 95);

  ctx.fillStyle = '#f5c842';
  ctx.font = '900 52px sans-serif';
  ctx.fillText('主播選秀戰績結算卡', 70, 160);

  // 載入右上角官方 Logo (B1.png)
  const logoImg = new Image();
  logoImg.src = 'assets/B1.png';
  logoImg.onload = () => {
    const logoW = 160;
    const logoH = (logoImg.height / logoImg.width) * logoW;
    ctx.drawImage(logoImg, canvas.width - 70 - logoW, 80, logoW, logoH);
  };

  // 選手大名與排名摘要區塊（帶有半透明毛玻璃質感）
  ctx.fillStyle = 'rgba(24, 28, 36, 0.85)';
  ctx.fillRect(70, 200, canvas.width - 140, 140);
  ctx.strokeStyle = '#3f485f';
  ctx.lineWidth = 2;
  ctx.strokeRect(70, 200, canvas.width - 140, 140);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('選手：' + playerName + ' (' + playerAge + '歲)', 100, 250);

  const rank = calcRanking();
  ctx.fillStyle = '#f5c842';
  ctx.font = '900 48px sans-serif';
  ctx.fillText('最終排名：#' + rank + ' / ' + (npcs.length + 1), 100, 310);

  // 四宮格數據方塊
  const totalStats = STAT_KEYS.reduce((s, k) => s + (stats[k] || 0), 0);
  const boxWidth = (canvas.width - 160) / 2;
  const boxHeight = 110;

  drawStatBox(ctx, 70, 370, boxWidth, boxHeight, '綜合評分 OVR', totalStats, '#3ecf7a');
  drawStatBox(ctx, 90 + boxWidth, 370, boxWidth, boxHeight, '獲得粉絲', formatNum(fans), '#a078f8');

  // 五角戰力詳細條形圖
  ctx.fillStyle = 'rgba(24, 28, 36, 0.85)';
  ctx.fillRect(70, 510, canvas.width - 140, 480);
  ctx.strokeStyle = '#3f485f';
  ctx.strokeRect(70, 510, canvas.width - 140, 480);

  ctx.fillStyle = '#f5c842';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('【 五角能力細節 】', 100, 570);

  let startY = 630;
  STAT_KEYS.forEach((k, idx) => {
    const val = stats[k] || 0;
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(STAT_NAMES[k], 100, startY + (idx * 80));

    ctx.fillStyle = '#2e3646';
    ctx.fillRect(220, startY - 18 + (idx * 80), 540, 20);

    ctx.fillStyle = val >= 80 ? '#3ecf7a' : val >= 50 ? '#f5c842' : '#e84040';
    ctx.fillRect(220, startY - 18 + (idx * 80), (540 * (val / 100)), 20);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(val, canvas.width - 100, startY + (idx * 80));
    ctx.textAlign = 'left';
  });

  // 榮譽徽章區
  ctx.fillStyle = 'rgba(24, 28, 36, 0.85)';
  ctx.fillRect(70, 1020, canvas.width - 140, 160);
  ctx.strokeStyle = '#3f485f';
  ctx.strokeRect(70, 1020, canvas.width - 140, 160);

  ctx.fillStyle = '#f5c842';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('【 生涯稱號與榮譽 】', 100, 1070);

  const badges = [];
  
  // 榮譽 1：選秀狀元
  if (rank === 1) badges.push('👑 選秀狀元');
  // 榮譽 2：專業數據魔人
  if (stats.data >= 85) badges.push('📊 人形計算機');
  // 榮譽 3：金嗓流暢主播
  if (stats.speaking >= 85) badges.push('🎙 金嗓主播');
  // 榮譽 4：臨場神反應
  if (stats.reflex >= 85) badges.push('⚡ 光速神反應');
  // 榮譽 5：抗壓怪物
  if (stats.tension >= 85) badges.push('🛡 鋼鐵心臟');
  // 榮譽 6：綜藝咖（常選 C 選項）
  if (styleCounter.C >= 3) badges.push('🎯 劇本神預言家');
  // 榮譽 7：激情大吼派（常選 B 選項）
  if (styleCounter.B >= 3) badges.push('🔥 燃燒靈魂派');
  // 榮譽 8：人氣巨星
  if (fans >= 5000) badges.push('✨ 流量密碼');
  // 榮譽 9：浴火重生
  if (wasRevived) badges.push('🔥 浴火重生');

  let badgeX = 100;
  let badgeY = 1115;
  ctx.font = 'bold 18px sans-serif';
  badges.forEach(badge => {
    const textWidth = ctx.measureText(badge).width + 30;
    if (badgeX + textWidth > canvas.width - 100) {
      badgeX = 100;
      badgeY += 45;
    }
    ctx.fillStyle = 'rgba(160, 120, 248, 0.2)';
    ctx.fillRect(badgeX, badgeY, textWidth, 36);
    ctx.strokeStyle = '#a078f8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(badgeX, badgeY, textWidth, 36);
    
    ctx.fillStyle = '#c0a0ff';
    ctx.fillText(badge, badgeX + 15, badgeY + 24);
    badgeX += textWidth + 15;
  });

  // 底部標語與種子碼
  ctx.fillStyle = '#94a3b8';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('種子碼: ' + currentSeed + '  |  THE ANNOUNCER 官方認證戰績卡', canvas.width / 2, 1240);
// 🖼️ 將生成的 Canvas 轉為圖片並放進預覽視窗
  const dataUrl = canvas.toDataURL('B1/png');
  const modal = document.getElementById('card-modal-overlay');
  const previewImg = document.getElementById('card-preview-img');
  const confirmBtn = document.getElementById('card-download-confirm-btn');

  if (modal && previewImg) {
    previewImg.src = dataUrl;
    modal.style.display = 'flex'; // 打開彈窗！

    // 點擊確認按鈕時才真正執行下載
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        const link = document.createElement('a');
        link.download = playerName + '_主播戰績卡.png';
        link.href = dataUrl;
        link.click();
      };
    }
  }
  
function drawStatBox(ctx, x, y, w, h, label, value, color) {
  ctx.fillStyle = '#181c24';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#3f485f';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = '#a9bdd8';
  ctx.font = '18px sans-serif';
  ctx.fillText(label, x + 20, y + 35);

  ctx.fillStyle = color;
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText(value, x + 20, y + 82);
}
// 🔢 數字格式化工具（將大數字轉為「萬」）
function formatNum(n) {
  return n >= 10000 ? (n / 10000).toFixed(1) + '萬' : n.toLocaleString();
}
}
