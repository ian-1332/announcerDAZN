const VIDEO_URL     = "https://www.youtube.com/watch?v=x1pfxmRhmc0";
const FULL_SHOW_URL = "https://www.dazn.com/zh-TW/welcome";
const STAT_KEYS  = ['speaking','reflex','data','term','tension'];
const STAT_NAMES = {speaking:'口條', reflex:'臨場', data:'數據', term:'術語', tension:'抗壓'};

// ═══ 難度對應（依關卡階段，不依字數）═══
function getTimerByDifficulty(phase) {
  if (phase === '預賽')   return { seconds: 20, label: '簡單', cls: 'diff-easy',   mult: 1.0 };
  if (phase === '準決賽') return { seconds: 18, label: '進階', cls: 'diff-normal', mult: 1.2 };
  if (phase === '決賽')   return { seconds: 7, label: '困難', cls: 'diff-hard',   mult: 1.5 };
  return                          { seconds: 15, label: '普通', cls: 'diff-normal', mult: 1.0 };
}
// ═══ 三位導師定義 ═══
const MENTORS = {
  qianyeye: {
    id: 'qianyeye', name: '威爺', icon: '🥸',
    title: '熱情系導師',
    likes:      ['data', 'term'],
    dislikes:   ['speaking'],
    optBonus:   'A',
    optPenalty: 'B',
    initBonus:  { data: 3, term: 3, speaking: -2 }
  },
  dapangge: {
    id: 'dapangge', name: '小石', icon: '📚',
    title: '歷史資料庫導師',
    likes:      ['data', 'term', 'reflex'],
    dislikes:   ['tension'],
    optBonus:   'B',
    optPenalty: 'C',
    initBonus:  { data: 2, term: 3, reflex: 3, tension: -5 }
  },
  ningning: {
    id: 'ningning', name: '卡寶', icon: '👾',
    title: '節奏流導師',
    likes:      ['speaking', 'reflex', 'tension'],
    dislikes:   ['data'],
    optBonus:   'A,B',
    optPenalty: 'C',
    initBonus:  { speaking: 1, reflex: 5, tension: -2, data: -2 }
  }
};

// ═══ 評審評語系統 ═══
const JUDGE_COMMENTS = {
  A_normal: [
    { neutral:'播報節奏穩定，用詞精準到位。',           logic:'面對突發狀況保持冷靜，臨場反應及格。',    data:'術語使用正確，壘包交代清晰無誤。' },
    { neutral:'聲線沉穩，資訊傳遞清楚。',               logic:'沒有過度渲染，判斷力保持理性。',           data:'數據引用準確，球種描述專業。' },
    { neutral:'播報風格中規中矩，觀眾容易理解。',       logic:'邏輯清晰，沒有多餘的情緒干擾。',           data:'專業術語運用恰當，沒有明顯失誤。' }
  ],
  A_wild: [
    { neutral:'這球打得很……等等我剛才在想晚餐要吃什麼。', logic:'邏輯上來說這球應該……算了我也不確定。',  data:'數據我沒帶眼鏡看不太清楚，但感覺對。' },
    { neutral:'嗯，播報得很……好？我在發呆抱歉。',        logic:'從理性角度分析，這球……嗯。',              data:'數字我算了一下，總之就是這樣。' },
    { neutral:'滿分！雖然我剛才去上廁所回來。',          logic:'理性而言這個選擇很……對啊應該是對的。',   data:'數據上完全正確，我猜。' }
  ],
  B_normal: [
    { neutral:'情緒化用語出現，播報專業度下滑。',        logic:'失去判斷基準，被情緒主導了播報節奏。',    data:'術語出現錯誤，數據交代不清楚。' },
    { neutral:'批評用詞過激，容易引發觀眾不適。',        logic:'缺乏理性分析，直接跳到情緒反應。',         data:'專業數據完全沒有引用，失分明顯。' },
    { neutral:'主播立場失守，中立性受到質疑。',          logic:'臨場判斷被情緒蓋過，這是播報大忌。',       data:'完全沒有數據支撐，純粹是個人發洩。' }
  ],
  B_wild: [
    { neutral:'我覺得……還好？情緒也是一種風格吧。',      logic:'從邏輯上說這完全不合理，但我喜歡。',       data:'沒有數據但很有熱情，我給過。' },
    { neutral:'播報品質有點問題，但我今天心情好所以算了。', logic:'理性上這是錯的，感性上我覺得很爽。',   data:'術語錯誤，但聲音很好聽所以加回來。' },
    { neutral:'滿分！雖然我完全不懂棒球。',              logic:'邏輯上說不通，但人生本來就說不通。',       data:'數據全錯，但錯得很有個性。' }
  ],
  C_normal: [
    { neutral:'過度預測干擾播報節奏，專業感下滑。',      logic:'預測未發生的事情屬於主觀臆測，不妥。',    data:'缺乏數據根據的預測，容易誤導觀眾。' },
    { neutral:'娛樂感有了，但播報的核心資訊被稀釋。',    logic:'把推測當事實陳述，邏輯上有問題。',         data:'沒有任何數據支撐，純粹是猜測。' },
    { neutral:'觀眾喜歡，但這不是專業播報該有的樣子。',  logic:'結果導向的預測沒有分析價值。',             data:'術語運用尚可，但數據根據嚴重不足。' }
  ],
  C_wild: [
    { neutral:'我也覺得下一棒會打全壘打，一起猜！',      logic:'從邏輯上說完全沒有根據，但很刺激。',       data:'我查了一下數據，猜錯了但很有趣。' },
    { neutral:'觀眾喜歡就好，播報嘛開心最重要。',        logic:'推測不一定是壞事，也許是對的呢？',         data:'沒有數據但很娛樂，我決定給高分。' },
    { neutral:'這種播報方式在某個平行宇宙裡是正確的。',  logic:'我理性分析了一下，決定不理性。',           data:'數據顯示猜對機率33%，也不算太差。' }
  ]
};

function getJudgeComment(optionType) {
  const isWild = Math.random() < 0.20;
  const key    = optionType + (isWild ? '_wild' : '_normal');
  const pool   = JUDGE_COMMENTS[key];
  const c      = pool[Math.floor(Math.random() * pool.length)];
  return [
    '📋 評審 A：「' + c.neutral + '」',
    '🧠 評審 B：「' + c.logic   + '」',
    '📊 評審 C：「' + c.data    + '」'
  ].join('\n');
}

// ═══ seedToNum（data.js 也需要，避免 generateNPCs 找不到）═══
function seedToNum(seed) {
  let n = 0;
  for (let i = 0; i < seed.length; i++) n += seed.charCodeAt(i) * (i + 1);
  return n;
}

// ═══ NPC 生成（前三名強化，增加選秀競爭感）═══
function generateNPCs(playerVariant, seed) {
  const n           = seedToNum(seed);
  const npcNames    = ['林予涵','陸柏宇','張志豪','方宇翔','趙苡寧','陳冠廷','蘇彥廷','葉芷涵','鄭宇軒'];

  return npcNames.map((name, i) => {
    let base;
    if (i < 3) {
      // 👑 前三名選秀大物：總分 430 ~ 485（玩家需要全力以赴才能超越）
      base = 390 + ((n * (i + 1) * 37) % 56);
    } else if (i < 7) {
      // ⚖️ 中段班實力派：總分 340 ~ 420
      base = 340 + ((n * (i + 1) * 29) % 81);
    } else {
      // 🌱 後段班新秀：總分 260 ~ 330
      base = 245+ ((n * (i + 1) * 23) % 71);
    }
    return { name, total: base, base };
  });
}


// NPC 每關微幅浮動（±8）
function fluctuateNPCs(npcs, seed, stageIdx) {
  const n = seedToNum(seed) + stageIdx * 7;
  return npcs.map((npc, i) => {
    const delta = ((n * (i + 1) * 13) % 17) - 8;
    return { ...npc, total: Math.max(150, Math.min(430, npc.total + delta)) };
  });
}
// ═══ 36 種角色變體 ═══
const VARIANTS = [
  {id:'v1', name:'狂熱黑轉粉型',
   desc:'外表甜美卻有極端狠勁，炎上後靠真實數據與反轉表現收穫死忠粉絲，將社群聲量轉化為絕對底氣。',
   tags:{strength:['社群敏感度','逆境反彈'],weakness:['數據底子薄'],hidden:'炎上加速'},
   stats:{speaking:60,reflex:55,data:30,term:35,tension:40}},
  {id:'v2', name:'商業帝國野心型',
   desc:'把節目當作擴展商業版圖的跳板，直接籌備個人自媒體品牌與跨國代言。',
   tags:{strength:['流量嗅覺','談判能力'],weakness:['抗壓起伏大'],hidden:'商業加成'},
   stats:{speaking:65,reflex:50,data:35,term:35,tension:45}},
  {id:'v3', name:'純粹反差萌型',
   desc:'私下天然呆、容易少根筋，播報時卻展現令人跌破眼鏡的強大自律與專業爆發力。',
   tags:{strength:['爆發力強','親和力'],weakness:['術語生疏'],hidden:'反差爆發'},
   stats:{speaking:55,reflex:60,data:30,term:30,tension:35}},
  {id:'v4', name:'被迫營業妥協型',
   desc:'為了經紀合約與金主壓力不得不配合演出，在鏡頭前與私底下有著極大拉扯。',
   tags:{strength:['鏡頭表現穩定'],weakness:['內心壓力大','容易動搖'],hidden:'壓力釋放'},
   stats:{speaking:50,reflex:45,data:35,term:35,tension:40}},
  {id:'v5', name:'數據造假恐慌型',
   desc:'隨時擔心真實專業底子不足被酸民徹底揭穿，在高壓精神壓力下步步為營。',
   tags:{strength:['謹慎細心'],weakness:['極度抗壓低'],hidden:'恐慌崩潰'},
   stats:{speaking:55,reflex:45,data:40,term:30,tension:30}},
  {id:'v6', name:'自媒體獨立創業型',
   desc:'放棄傳統主播台的束縛，走向全方位個人工作室營運，把流量玩弄於股掌之間。',
   tags:{strength:['口條天賦','流量操作'],weakness:['術語略生疏'],hidden:'流量爆炸'},
   stats:{speaking:70,reflex:55,data:35,term:35,tension:50}},
  {id:'v7', name:'傲慢王者降臨型',
   desc:'帶著全場最高光環，用頂級實力與毒舌睥睨一切對手。',
   tags:{strength:['全面實力強','壓制感強'],weakness:['容易得罪人'],hidden:'王者光環'},
   stats:{speaking:60,reflex:65,data:60,term:65,tension:70}},
  {id:'v8', name:'舊傷復發孤高型',
   desc:'帶著身體舊疾強行燃燒最後職業魂，面對失敗有著近乎病態的完美主義。',
   tags:{strength:['數據極強','術語精準'],weakness:['高壓易崩'],hidden:'完美主義'},
   stats:{speaking:55,reflex:60,data:65,term:65,tension:50}},
  {id:'v9', name:'毒舌護短導師型',
   desc:'表面上狂妄酸人、要求苛刻，私底下卻默默提攜後輩，展現霸氣王者的大氣。',
   tags:{strength:['臨場老練','術語精通'],weakness:['形象爭議大'],hidden:'霸氣加持'},
   stats:{speaking:65,reflex:60,data:60,term:60,tension:65}},
  {id:'v10',name:'轉型迷茫掙扎型',
   desc:'從球場跌落後尋找自我價值的過渡期選手，在專業要求與內心失落間拉扯。',
   tags:{strength:['球場經驗豐富'],weakness:['自信不足','容易迷失'],hidden:'轉型爆發'},
   stats:{speaking:50,reflex:50,data:55,term:55,tension:45}},
  {id:'v11',name:'商業代言導向型',
   desc:'把每場轉播當作爭取商業價值最大化的秀場，將個人光環利用到極致。',
   tags:{strength:['口條出色','人氣高'],weakness:['專業深度不足'],hidden:'商業加值'},
   stats:{speaking:70,reflex:55,data:50,term:50,tension:60}},
  {id:'v12',name:'體制反抗狂人型',
   desc:'專挑電視台傳統規矩與高層開砲的異端份子，用絕對實力挑戰體制底線。',
   tags:{strength:['臨場爆發力強','個人特色鮮明'],weakness:['容易惹麻煩'],hidden:'反骨加成'},
   stats:{speaking:65,reflex:65,data:55,term:60,tension:65}},
  {id:'v13',name:'爆肝家庭戰士型',
   desc:'白天寫扣晚上特訓，受限於體力上限，全家總動員進行背水一戰的熱血挑戰。',
   tags:{strength:['數據扎實','毅力超群'],weakness:['口條較弱','體力有限'],hidden:'家庭驅動'},
   stats:{speaking:40,reflex:45,data:65,term:60,tension:60}},
  {id:'v14',name:'隱藏技術流大師型',
   desc:'用程式邏輯與理性分析精準解構運動數據，成為年輕戰場中的理科黑馬。',
   tags:{strength:['數據頂尖','術語精準'],weakness:['口條生硬'],hidden:'數據降維'},
   stats:{speaking:45,reflex:50,data:75,term:70,tension:55}},
  {id:'v15',name:'職場反擊中年型',
   desc:'為了向機車主管與生活壓力證明自己而參賽，將大叔的沉穩內斂化為最強反擊。',
   tags:{strength:['抗壓穩定','處事成熟'],weakness:['口條略顯保守'],hidden:'中年爆發'},
   stats:{speaking:45,reflex:45,data:60,term:60,tension:65}},
  {id:'v16',name:'浪漫夢想實踐型',
   desc:'為了填補年少遺憾，不計代價地燃燒中年魂，成為最純粹的追夢代表。',
   tags:{strength:['熱情感染力強'],weakness:['數據偏弱','術語生疏'],hidden:'夢想燃燒'},
   stats:{speaking:50,reflex:45,data:60,term:55,tension:50}},
  {id:'v17',name:'同事掩護黑馬型',
   desc:'靠著部門同事私下掩護請假參賽，背負著同事們的惡搞期待與溫暖支援往前衝。',
   tags:{strength:['團隊精神強'],weakness:['數據準備不足'],hidden:'集體應援'},
   stats:{speaking:45,reflex:50,data:60,term:60,tension:55}},
  {id:'v18',name:'體力極限突破型',
   desc:'克服年齡與專注力衰退的劣勢，靠著超強毅力與抗壓性在直播台硬撐到底。',
   tags:{strength:['抗壓頂尖','意志力強'],weakness:['口條略弱'],hidden:'極限突破'},
   stats:{speaking:40,reflex:45,data:60,term:55,tension:70}},
  {id:'v19',name:'降維打擊冷血型',
   desc:'用硬核數據輕鬆拿高分，將對手遠遠甩在身後的冷血機器。',
   tags:{strength:['數據頂尖','術語無懈可擊'],weakness:['抗壓偏低','情感表達弱'],hidden:'數據壓制'},
   stats:{speaking:45,reflex:50,data:85,term:80,tension:35}},
  {id:'v20',name:'社交障礙突破型',
   desc:'說話容易戳到人，但在殘酷舞台中被迫學習溝通與應變。',
   tags:{strength:['數據強大'],weakness:['口條生硬','抗壓極低'],hidden:'成長爆發'},
   stats:{speaking:35,reflex:45,data:80,term:75,tension:30}},
  {id:'v21',name:'完美主義崩潰型',
   desc:'容不得半次失誤，遇到突發狀況時極易陷入精神內耗的死胡同。',
   tags:{strength:['數據術語極強'],weakness:['抗壓危險','臨場易崩'],hidden:'完美崩塌'},
   stats:{speaking:40,reflex:40,data:85,term:80,tension:25}},
  {id:'v22',name:'父母期待解脫型',
   desc:'想擺脫精英家庭的完美主義框架，透過播報來尋找真正的自我價值。',
   tags:{strength:['數據底子強'],weakness:['心理壓力大'],hidden:'自我解放'},
   stats:{speaking:40,reflex:45,data:75,term:70,tension:35}},
  {id:'v23',name:'邏輯死胡同鑽研型',
   desc:'遇到非預期狀況與情感題時大腦會卡死，陷入無法自拔的死胡同。',
   tags:{strength:['數據精準'],weakness:['臨場反應慢','抗壓偏低'],hidden:'邏輯鑽牛角'},
   stats:{speaking:35,reflex:40,data:85,term:80,tension:30}},
  {id:'v24',name:'意外覺醒感性型',
   desc:'從冷血數據機器轉變為能用情感與溫度打動觀眾的獨特主播。',
   tags:{strength:['數據強','感性覺醒'],weakness:['抗壓待加強'],hidden:'感性爆發'},
   stats:{speaking:50,reflex:50,data:75,term:70,tension:45}},
  {id:'v25',name:'菁英科班偏執型',
   desc:'對專業正統性有強烈潔癖，擁有 KPI 完美主義計量表，容不得絲毫瑕疵。',
   tags:{strength:['口條術語頂尖','臨場穩定'],weakness:['抗壓偏緊繃'],hidden:'科班加持'},
   stats:{speaking:70,reflex:65,data:60,term:65,tension:50}},
  {id:'v26',name:'地方台急功近利型',
   desc:'渴望一步登天進軍全國台，得失心極重，容易在壓力下產生焦慮失衡。',
   tags:{strength:['口條成熟'],weakness:['抗壓低','得失心重'],hidden:'急功爆衝'},
   stats:{speaking:65,reflex:60,data:55,term:60,tension:40}},
  {id:'v27',name:'破除門戶之見型',
   desc:'經歷與非科班選手的激烈碰撞後，開始轉變心態並認同對方的潛力。',
   tags:{strength:['口條穩定','心態成長'],weakness:['初期偏見重'],hidden:'門戶破除'},
   stats:{speaking:65,reflex:60,data:60,term:60,tension:55}},
  {id:'v28',name:'高壓 KPI 狂熱型',
   desc:'替自己設定極為嚴苛的績效指標，將高壓化為鞭策自己的殘酷鞭子。',
   tags:{strength:['口條數據強'],weakness:['抗壓起伏大'],hidden:'KPI 爆發'},
   stats:{speaking:70,reflex:60,data:65,term:65,tension:45}},
  {id:'v29',name:'職場暗箭防衛型',
   desc:'一邊防備同儕的暗箭與扯後腿，一邊咬牙硬闖決賽的孤傲女強人。',
   tags:{strength:['臨場強韌','口條成熟'],weakness:['容易分心防衛'],hidden:'孤高護盾'},
   stats:{speaking:65,reflex:65,data:60,term:60,tension:55}},
  {id:'v30',name:'轉型獨立主播型',
   desc:'誓言跳脫地方台舒適圈，擺脫體制束縛以獨立姿態掌控全國主播台話語權。',
   tags:{strength:['口條頂尖','全面均衡'],weakness:['無明顯弱點但缺乏特色'],hidden:'獨立爆發'},
   stats:{speaking:75,reflex:65,data:60,term:65,tension:60}},
  {id:'v31',name:'隨遇而安鬆弛型',
   desc:'抱著「大不了就這樣」的心態參賽，將比賽當作年度最大的休閒活動。',
   tags:{strength:['心態平衡','壓力免疫'],weakness:['缺乏進取心'],hidden:'鬆弛奇蹟'},
   stats:{speaking:50,reflex:20,data:45,term:45,tension:50}},
  {id:'v32',name:'絕境傻勁爆發型',
   desc:'平時表現平庸，但在淘汰邊緣靠著傻勁觸發隨機奇蹟爆發的變數角色。',
   tags:{strength:['逆境爆發力'],weakness:['初期表現平庸'],hidden:'絕境奇蹟'},
   stats:{speaking:45,reflex:55,data:40,term:40,tension:60}},
  {id:'v33',name:'社畜集體應援型',
   desc:'帶著全公司同事的惡搞期待與茶水間應援，默默在選秀地獄中前進。',
   tags:{strength:['群體支撐力強','抗壓穩定'],weakness:['個人特色模糊'],hidden:'集體加持'},
   stats:{speaking:50,reflex:45,data:45,term:40,tension:55}},
  {id:'v34',name:'職場邊緣逆襲型',
   desc:'從被路人直接忽略的小透明，逐漸蛻變為受到關注的話題黑馬。',
   tags:{strength:['成長速度快'],weakness:['初期弱勢'],hidden:'黑馬逆襲'},
   stats:{speaking:45,reflex:50,data:50,term:45,tension:50}},
  {id:'v35',name:'尋找自我解脫型',
   desc:'透過高壓比賽來探索自我、擺脫日復一日的枯燥生活與職場迷茫。',
   tags:{strength:['內省能力強'],weakness:['目標不夠明確'],hidden:'自我覺醒'},
   stats:{speaking:50,reflex:45,data:45,term:45,tension:45}},
  {id:'v36',name:'隨機奇蹟創造型',
   desc:'數值極度不穩定、容易被挫折嚇到，卻總能在絕境中打出神來之筆的佳作。',
   tags:{strength:['不可預測性強'],weakness:['極度不穩定'],hidden:'神來之筆'},
   stats:{speaking:45,reflex:60,data:40,term:40,tension:45}}
];// ═══ 主關卡題庫（刪題後 34 題）═══
const QUESTION_POOL = [
// ── 預賽 ──
{
  id: 'q_pre1', phase: '預賽',
  label: '3局上・中外野安打突破僵局',
  img: 'assets/q1.png',
  q: '請看轉播畫面，3局上兩出局二三壘有人，林可怕敲出關鍵平飛安打，你如何播報這記打破僵局的先制分？',
  roleBonus: { 'v25': { optType: 'A', bonus: { speaking: 8, term: 5 } }, 'v30': { optType: 'A', bonus: { speaking: 8, term: 5 } } },
  options: [
    {
      text: '「抓到得點圈機會！穿越中線平飛安打！壘上跑者輕鬆回本壘得分，2 比 0 先馳得點！」',
      type: 'A',
      effect: { speaking: 6, reflex: 6, data: 8, term: 10, tension: 5 },
      social: { fans: 1800 }
    },
    {
      text: '「這球太甜了！完全是肉包球白白送分！投手到底在投什麼啊！」',
      type: 'B',
      effect: { speaking: 8, reflex: 10, data: -8, term: -10, tension: -6 },
      social: { fans: 2800 }
    },
    {
      text: '「打破僵局！我就說可怕今晚眼神不一樣，完全照著我的預測走，繼續期待接下來的進攻！」',
      type: 'C',
      effect: { speaking: 8, reflex: 4, data: -3, term: -8, tension: 6 },
      social: { fans: 1200 }
    }
  ]
},

{
  id: 'q_pre2', phase: '預賽',
  label: '滿壘高壓・擊出再見安打終結比賽',
  q: '九局下滿壘兩出局，打者第一球就果斷出棒！右外野落地，比賽結束！你如何收尾這場激戰？',
  roleBonus: { 'v1': { optType: 'C', bonus: { fans: 2500, speaking: 8 } }, 'v7': { optType: 'A', bonus: { term: 8, speaking: 5 } } },
  options: [
    {
      text: '「第一球出棒！穿過去了！右外野落地安打！三壘跑者踩回再見分！比賽結束！一棒向對手說再見！」',
      type: 'A',
      effect: { speaking: 8, reflex: 8, data: 6, term: 12, tension: 8 },
      social: { fans: 2200 }
    },
    {
      text: '「打出去了，發揮球星的價值，打出致命一擊！太帥啦！」',
      type: 'B',
      effect: { speaking: 10, reflex: 12, data: -8,tension: -6 },
      social: { fans: 4000 }
    },
    {
      text: '「完全命中！看吧我剛就說這局必定再見安打！這劇本我老早就料到了！」',
      type: 'C',
      effect: { speaking: 8, reflex: 4, data: -14, term: -10, tension: 8 },
      social: { fans: 1500 }
    }
  ]
},

{
  id: 'q_semi1', phase: '準決賽',
  label: '7局上・支持的球隊一吐怨氣大逆轉',
  img: 'assets/q3.png',
  q: '你私下支持的球隊苦戰整場，終於在第九局擊出關鍵再見安打！面對全場沸騰，你如何兼顧專業？',
  roleBonus: { 'v6': { optType: 'C', bonus: { fans: 3000, speaking: 10 } }, 'v9': { optType: 'A', bonus: { speaking: 8, term: 8 } } },
  options: [
    {
      text: '「推向反方向！落地形成安打，三壘跑者回來本壘得分，比賽結束」',
      type: 'A',
      effect: { speaking: 8, reflex: 6, data: 8, term: 12, tension: 10 },
      social: { fans: 2000 }
    },
    {
      text: '「打穿啦！太爽了，再見安打，得點圈之鬼的稱號不是假的」',
      type: 'B',
      effect: { speaking: 6, reflex: 12, data: -10, term: -10, tension: -12 },
      social: { fans: 4500 }
    },
    {
      text: '「選擇正面對決，兩個男子漢之間的對決看了真過癮」',
      type: 'C',
      effect: { speaking: 8, reflex: 4, data: -5, term: -10, tension: 6 },
      social: { fans: 1200 }
    }
  ]
},

{
  id: 'q_semi2', phase: '準決賽',
  label: '8局下・大寶寶關鍵安打打破鴨蛋',
  img: 'assets/q4.png',
  q: '第3棒大寶寶敲出中外野全壘打，打破鴨蛋，你如何帶起氣氛？',
  roleBonus: { 'v18': { optType: 'A', bonus: { tension: 8, reflex: 5 } }, 'v32': { optType: 'C', bonus: { fans: 2500, speaking: 8 } } },
  options: [
    {
      text: '「謹慎選球，大寶寶鎖定直球攻擊，一棒三分！成功破蛋！」',
      type: 'A',
      effect: { speaking: 8, reflex: 8, data: 8, term: 10, tension: 8 },
      social: { fans: 2500 }
    },
    {
      text: '「終於破蛋了！反攻號角吹響，大寶寶即時的三分球」',
      type: 'B',
      effect: { speaking: 4, reflex: 8, data: -8, term: -8, tension: -8 },
      social: { fans: 3500 }
    },
    {
      text: '「我就說這局必定追分！得點圈有人的局面你一定要怕他」',
      type: 'C',
      effect: { speaking: 8, reflex: 4, data: -6, term: -5, tension: 8 },
      social: { fans: 1600 }
    }
  ]
},

// ── 決賽（冠軍爭奪）──
{
  id: 'q_fin1', phase: '決賽',
  label: '10局延長・再見安打封王戰',
  q: '十局延長賽滿壘、兩出局！贏了就得到季後賽資格，終結者李大號投出偏高直球，送給對手再見三振，這是決定性的瞬間，你的播報是？',
  roleBonus: { 'v30': { optType: 'A', bonus: { speaking: 10, term: 5 } }, 'v7': { optType: 'A', bonus: { speaking: 8, term: 8 } } },
  options: [
    {
      text: '「High Fasrball，成功用球速壓制打者，比賽結束！大號成功完成終結者工作，幫助球隊拿下季後賽門票！」',
      type: 'A',
      effect: { speaking: 8, reflex: 8, data: 8, term: 2, tension: 2 },
      social: { fans: 5000 }
    },
    {
      text: '「這球~~三振出局，再見三振，他將全隊帶進了季後賽，這是值得瘋狂慶祝的時候！」',
      type: 'B',
      effect: { speaking: 8, reflex: 4, data: -6, term: -10, tension: -8 },
      social: { fans: 3000 }
    },
    {
      text: '「這個配球策略奏效，再見三振完全在我意料之中，可以相信投捕一定做了很多準備，恭喜他們」',
      type: 'C',
      effect: { speaking: 5, reflex: 4, data: 6, term: -2, tension: 10 },
      social: { fans: 2500 }
    }
  ]
},

{ id: 'q_fin2', phase: '決賽',
  label: '8局下・錯失得分機會，中心棒次打出雙殺打中斷攻勢',
  img: 'assets/q5.png',
  q: '有機會追平比數的大好局面，卻因中心棒次敲出雙殺打而中斷攻勢，面對這個關鍵時刻，你會如何播報？',
  roleBonus: { 'v9': { optType: 'A', bonus: { speaking: 8, term: 8 } }, 'v36': { optType: 'C', bonus: { fans: 3000, speaking: 10 } } },
  options: [
    {
      text: '「抓低球打，剛好在游擊手正面，形成了雙殺，留下殘壘，可惜沒有得分！」',
      type: 'A',
      effect: { speaking: 8, reflex: 8,  term: 12, tension: 10 },
      social: { fans: 4500 }   },
    { text: '「非常可惜，得分的大好局面就這樣中斷了，心臟快受不了！」',
      type: 'B',
      effect: { speaking: 8, reflex: 10, data: -2, term: -8, tension: -8 },
      social: { fans: 5500 }    },
    {     text: '「我就說投手一定希望製造滾地球，果然成功執行！」',
      type: 'C',
      effect: { speaking: 8, reflex: 4, data: -5, term: -5, tension: 8 },
      social: { fans: 2200 }  }
  ]
},
{
  id: 'q_fin3', phase: '決賽',
  label: '滿球數生死對決・朱恩逆轉安打',
  q: '九局下兩好三壞滿球數，朱恩果斷推打出右外野穿越安打送回兩分，完成不可思議的大逆轉！面對這記安打，你如何收尾？',
  roleBonus: { 'v32': { optType: 'C', bonus: { fans: 3500, speaking: 10 } }, 'v25': { optType: 'A', bonus: { speaking: 8, term: 8 } } },
  options: [
    { text: '「滿球數果斷出棒！穿越內野防線！兩分打點！完成逆轉！朱恩！今晚的救世主！」',
      type: 'A',
      effect: { speaking: 5, reflex: 10,term: 12, tension: 2 },
      social: { fans: 5000 }   },
    { text: '「逆轉啦！牛棚完全壓不住，救援失敗，完全擋不住的奇蹟夜！」',
      type: 'B',
      effect: { speaking: 8, reflex: 4, data: -8, term: -5, tension: -8 },
      social: { fans: 6000 }   },
    { text: '「逆轉大奇蹟完全被我算中！朱恩今晚就是超級英雄，完全按照我的預言走！」',
      type: 'C',
      effect: { speaking: 8, reflex: 4, data: -6, term: -1, tension: 5 },
      social: { fans: 2500 }   }
  ]
}
];
const SPECIAL_POOL = [

{id:'s01',label:'場外事件：休息室的挑釁',isEvent:true,
 q:'賽前休息室，對手陣營的選手笑著對你說：「等下看你播報數據吃螺絲囉，加油呀。」你怎麼回應？',
 roleBonus:{'v7':{optType:'A',bonus:{tension:8,speaking:5}},'v9':{optType:'A',bonus:{tension:5,reflex:5}}},
 options:[
  {text:'冷笑回擊：「管好你自己🫴，別等下被酸民罵翻。」',type:'B',effect:{speaking:8,reflex:5,tension:-12},social:{ptt:180,fans:-800}},
  {text:'微笑帶過：「謝謝提醒，我們場上用實力說話。」',type:'A',effect:{speaking:5,reflex:8,data:5,term:5,tension:12},social:{ptt:40,fans:1200}},
  {text:'緊張得說不出話，默默走開。',type:'C',effect:{speaking:-8,tension:-1,reflex:5},social:{ptt:20,fans:300}}
]},

{id:'s02',label:'場外事件：前輩的施壓',isEvent:true,
 q:'前球星路過你的座位，看了一眼你的戰術筆記冷冷說：「這種記法太外行了。」你選擇？',
 roleBonus:{'v12':{optType:'B',bonus:{fans:2000,speaking:8}},'v7':{optType:'A',bonus:{data:8,term:8}}},
 options:[
  {text:'不服氣回嗆：「不然你來教我啊？」',type:'B',effect:{speaking:1,reflex:-8,tension:5},social:{ptt:150,fans:-67}},
  {text:'虛心請教：「前輩覺得哪裡可以修正？懇請指教。」',type:'A',effect:{data:2,term:2,tension:1},social:{ptt:50,fans:1800}},
  {text:'大翻白眼🤷‍♂️🤷‍♀️😉',type:'C',effect:{},social:{fans:67}}
]},

{id:'s05',label:'場外事件：深夜 PTT 爆料文',isEvent:true,
 q:'半夜被爆料，與某隊選手深夜共進消夜，你會怎麼面對？',
 roleBonus:{'v18':{optType:'A',bonus:{tension:10,reflex:5}},'v15':{optType:'A',bonus:{tension:8,reflex:5}}},
 options:[
  {text:'立刻開小號在底下護航，談戀愛錯了嘛。😒😒!!!!',type:'B',effect:{speaking:-2,reflex:2,tension:-5},social:{ptt:500,fans:-600}},
  {text:'關掉手機沉睡，當作沒這件事。',type:'A',effect:{tension:5},social:{ptt:-60,fans:-50}},
  {text:'心情大受打擊，這明明就是抹黑，躲在棉被裡哭了一整晚。',type:'C',effect:{speaking:-5,tension:-2,reflex:5},social:{ptt:80,fans:-800}}
]},

{id:'s08',label:'場外事件：被對手粉絲出征',isEvent:true,
 q:'對手陣營的粉絲集體在你的所有貼文底下洗版「退賽」，評論數量衝破五千，你怎麼面對？',
 roleBonus:{'v7':{optType:'A',bonus:{tension:10,speaking:5}},'v12':{optType:'C',bonus:{fans:3000,speaking:8}}},
 options:[
  {text:'逐一回覆越陷越深，整晚沒有休息。',type:'B',effect:{tension:-2,reflex:-1},social:{ptt:600,fans:-4000}},
  {text:'開啟留言過濾，專注在真心支持你的粉絲身上。',type:'A',effect:{speaking:-2,tension:2,reflex:5},social:{ptt:100,fans:3500}},
  {text:'直接把帳號設為私人，消失三天後回來。',type:'C',effect:{speaking:-3,tension:5,reflex:3},social:{ptt:150,fans:-200}}
]},

{id:'s11',label:'場外事件：主業很辛苦，要怎麼準備',isEvent:true,
 q:'節目錄影前三天，你的本業突然接到大案子，加班到深夜，根本沒時間準備播報功課，你怎麼辦？',
 roleBonus:{'v13':{optType:'A',bonus:{tension:8,data:5}},'v17':{optType:'A',bonus:{tension:5,data:5}}},
 options:[
  {text:'直接放棄準備，去錄影時靠臨場反應硬撐。',type:'B',effect:{speaking:-5,data:-5,term:-2,tension:-2},social:{ptt:100,fans:-800}},
  {text:'利用通勤時間聽比賽 podcast、午休看球賽數據，把零碎時間全部用上。',type:'A',effect:{speaking:5,data:5,term:8,tension:1,reflex:8},social:{ptt:80,fans:2000}},
  {text:'跟節目組請假說身體不舒服，先把本業顧好。',type:'C',effect:{tension:-5,reflex:3},social:{ptt:50,fans:-500}}
]},

{id:'s16',label:'場外事件：桃色風波',isEvent:true,
 q:'有八卦媒體拍到你就算明天要錄影，深夜還跟異性在酒吧手牽手，隔天標題是「曖昧確定？不顧正業？」，你怎麼處理？',
 roleBonus:{'v2':{optType:'B',bonus:{fans:5000,speaking:5}},'v11':{optType:'B',bonus:{fans:4000}}},
 options:[
  {text:'馬上開直播解釋，越說越激動，最後哭出來被截圖。',type:'B',effect:{tension:-2,reflex:5},social:{ptt:600,fans:5000}},
  {text:'發一句簡短聲明：「純屬友人，謝謝關心，請把注意力放在節目本身。」',type:'A',effect:{tension:5,reflex:1},social:{ptt:200,fans:3000}},
  {text:'完全不回應，讓炒作自然消退，繼續專注練習。',type:'C',effect:{speaking:3,tension:2,reflex:5},social:{ptt:300,fans:2000}}
]},

{id:'s20',label:'突發狀況：搭檔主播說錯話',isEvent:true,
 q:'你的搭檔主播在直播中把「高飛犧牲打」說成「高飛打打打」，全場一片靜默，你必須立刻接話，你說什麼？',
 roleBonus:{'v9':{optType:'A',bonus:{speaking:8,reflex:8}},'v25':{optType:'A',bonus:{speaking:5,reflex:5}}},
 options:[
  {text:'大笑說：「哈哈我搭檔在裝可愛！」把尷尬完全轉移到搭檔身上。',type:'B',effect:{speaking:5,reflex:8,tension:-1,term:-5},social:{ptt:400,fans:2000}},
  {text:'無縫接話：「也就是說三壘跑者用這支高飛犧牲打順利回本壘得分——」完全覆蓋過去。',type:'A',effect:{speaking:8,reflex:5,tension:6,term:5},social:{ptt:100,fans:3500}},
  {text:'沉默兩秒，尷尬地繼續播報下一球，當作沒聽到。',type:'C',effect:{speaking:-3,reflex:-5,tension:5,term:3},social:{ptt:180,fans:-500}}
]},

{id:'s23',label:'突發狀況：被嫌播報無聊',isEvent:true,
 q:'直播進行中，你看到彈幕洗版「這個播報怎麼這麼無聊」「我來也行」，而且越來越多，你怎麼應對？',
 roleBonus:{'v6':{optType:'B',bonus:{fans:3500,speaking:8}},'v11':{optType:'B',bonus:{fans:3000,speaking:5}}},
 options:[
  {text:'在直播中直接說：「有些人覺得我無聊，那我表演一下怎樣叫有趣。」開始誇張模仿搞笑播報。',type:'B',effect:{reflex:5,tension:-1,term:-1},social:{ptt:400,fans:300}},
  {text:'無視彈幕，專注在比賽節奏上，讓下一個精彩時刻的播報自己說話。',type:'A',effect:{speaking:5,reflex:2,tension:2},social:{ptt:100,fans:500}},
  {text:'偷偷調整一下語調，加了幾個感嘆詞，但整體沒太大改變。',type:'C',effect:{reflex:5,tension:5,term:3},social:{ptt:150,fans:800}}
]}

];

const ENDINGS = [
  {
    id: 'rebel_champion',
    condition: s => s.ranking === 1 && (mentorScore[selectedMentor] || 50) < 70,
    rank: '👑', titleClass: '',
    title: name => name + ' ── 傲骨異端！強勢登頂的無冕狀元',
    subtitle: (name, seed, role, mentor) =>
      '種子碼 ' + seed + ' 結算！雖然你的播報風格始終無法完全迎合 ' + mentor.name + ' 導師的嚴苛標準（僅得 ' + (mentorScore[selectedMentor] || 50) + ' 分），但你用絕對的臨場爆發力與強大個人氣場碾壓全場對手，強勢奪冠！製作人與高層力排眾議決定為你量身打造專屬節目！'
  },
  {
    id: 'champion',
    condition: s => s.ranking === 1 && (mentorScore[selectedMentor] || 50) >= 70,
    rank: '🏆', titleClass: '',
    title: name => name + ' ── DAZN 官方認證正式簽約主播！',
    subtitle: (name, seed, role, mentor) =>
      '種子碼 ' + seed + ' 挑戰成功！你不僅五角戰力登頂拿下全場第一，更深深折服了 ' + mentor.name + ' 導師，獲得了最高級別的認可！' +
      mentor.icon + ' ' + mentor.name + ' 在講評台上起立鼓掌：「這毫無疑問就是我要的主播！」'
  },

  // 🔥 逆境傳奇結局：【浴火重生的傳奇英雄】（中途淘汰過，但復活逆轉奪冠）
  {
    id: 'tragic_hero',
    condition: s => s.wasRevived && s.ranking <= 3,
    rank: '🔥', titleClass: 'tragic',
    title: name => name + ' ── 浴火重生的傳奇英雄',
    subtitle: (name, seed, role, mentor) =>
      '帶著種子碼 ' + seed + ' 闖關，身處逆境曾遭遇淘汰的你，在復活後展現了不可思議的堅韌鬥志，強勢殺回前三名！' +
      mentor.icon + ' ' + mentor.name + ' 讚嘆：「這種在懸崖邊緣爆發的心理素質，是任何訓練都教不出來的。」'
  },

  // 🥈 排名 2 ~ 3 名：【準簽約候補主播】
  {
    id: 'runner_up',
    condition: s => s.ranking <= 3,
    rank: '🥈', titleClass: '',
    title: name => name + ' ── 準簽約候補主播',
    subtitle: (name, seed, role, mentor) =>
      '你在這場頂級選秀中穩定發揮，最終高居全場第 ' + s.ranking + ' 名。' +
      mentor.icon + ' ' + mentor.name + ' 私下告訴製作團隊：「實力非常出色，如果首選因故無法出賽，第一個簽的就是他。」（種子碼：' + seed + '）'
  },

  // 🎯 排名 4 ~ 6 名：【潛力新秀主播】
  {
    id: 'trainee',
    condition: s => s.ranking <= 6,
    rank: '🌟', titleClass: '',
    title: name => name + ' ── 官方潛力培訓主播',
    subtitle: (name, seed, role, mentor) =>
      '經歷這場殘酷的選秀洗禮（種子碼 ' + seed + '），你展現了極佳的可塑性，成功入選二軍培訓名單。' +
      mentor.icon + ' ' + mentor.name + '：「底子不錯，給我半年，我有信心把你雕琢成一線主播。」'
  },

  // 📱 話題型主播：粉絲極高，但戰力排名偏後
  {
    id: 'internet_star',
    condition: s => s.fans >= 6000,
    rank: '📱', titleClass: '',
    title: name => name + ' ── 網路話題焦點主播',
    subtitle: (name, seed, role, mentor) =>
      '你在社群上掀起了驚人的討論狂潮（種子碼 ' + seed + '），粉絲聲量無人能敵！但 ' +
      mentor.icon + ' ' + mentor.name + ' 提醒：「人氣是一時的，要把專業基本功練紮實，才能在主播台長久站穩。」'
  },

  {
    id: 'failed',
    condition: () => true,
    rank: '🌱', titleClass: '',
    title: name => name + ' ── 未能及格的播報挑戰者',
    subtitle: (name, seed, role, mentor) =>
      '實境秀的殘酷在於它只留下準備好的人。' +
      mentor.icon + ' ' + mentor.name + ' 留下最後勉勵：「這次失利不是終點，回去把基本功重新練好再來挑戰。」（種子碼：' + seed + '）'
  }
];