import { useState, useEffect, useCallback, useRef } from "react";

const C = {
  bg: "#EDE9E3", bgLight: "#F7F5F1", bgDark: "#2D3B2E",
  textMain: "#2D3B2E", textSub: "#5A5850", accent: "#3C2A24", line: "#C4B8A8",
};
const PROFILE = { age: 26, height: 169, startWeight: 65, goalWeight: 62, startBF: 18, goalBF: 13 };
const FOOD_DB = [
  {n:"白飯 (1碗 200g)",c:260},{n:"糙米飯 (1碗 200g)",c:220},{n:"燕麥片 (50g)",c:185},
  {n:"全麥吐司 (1片)",c:80},{n:"白吐司 (1片)",c:75},{n:"地瓜 (100g)",c:86},
  {n:"雞胸肉 (100g)",c:165},{n:"雞腿排 (100g)",c:190},{n:"水煮蛋 (1顆)",c:78},
  {n:"豆腐 (100g)",c:76},{n:"豆漿 (250ml)",c:100},{n:"鮭魚 (100g)",c:208},
  {n:"鮪魚罐頭 (100g)",c:110},{n:"豬里肌 (100g)",c:143},{n:"牛肉 (100g)",c:250},
  {n:"花椰菜 (100g)",c:34},{n:"菠菜 (100g)",c:23},{n:"番茄 (100g)",c:18},
  {n:"香蕉 (1根)",c:90},{n:"蘋果 (1顆)",c:80},{n:"奇異果 (1顆)",c:50},
  {n:"美式咖啡 (黑)",c:5},{n:"拿鐵 (大)",c:180},{n:"全脂牛奶 (240ml)",c:150},
  {n:"希臘優格 (100g)",c:59},{n:"乳清蛋白 (1匙30g)",c:110},{n:"可樂 (355ml)",c:140},
  {n:"雞排 (1塊)",c:480},{n:"鹽酥雞 (100g)",c:350},{n:"薯條 (中)",c:340},
  {n:"漢堡 (普通)",c:500},{n:"滷肉飯 (1碗)",c:500},{n:"珍珠奶茶 (大)",c:500},
  {n:"牛肉麵",c:600},{n:"雞腿便當",c:720},{n:"排骨便當",c:800},
  {n:"便利商店飯糰",c:200},{n:"茶葉蛋",c:80},{n:"水餃 (1顆)",c:55},
];
const WORKOUT_TYPES = [
  {label:"重訓 — 全身",met:5},{label:"重訓 — 胸",met:4.5},{label:"重訓 — 背",met:5},
  {label:"重訓 — 腿",met:6},{label:"重訓 — 肩",met:4},{label:"重訓 — 手臂",met:3.5},
  {label:"重訓 — 核心",met:3},{label:"跑步 — 中速",met:8},{label:"跑步 — 快速",met:11},
  {label:"飛輪",met:7},{label:"橢圓機",met:5},{label:"游泳",met:7},
  {label:"跳繩",met:10},{label:"快走",met:3.5},{label:"HIIT",met:8},{label:"自訂",met:4},
];

function getToday() { return new Date().toISOString().slice(0,10); }
function calcBMR(w) { return 10*w + 6.25*PROFILE.height - 5*PROFILE.age + 5; }
function calcTDEE(w) { return Math.round(calcBMR(w)*1.55); }
function avg(arr) { return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }
function formatDate(s) { const d=new Date(s+"T00:00:00"); return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`; }
function getWeekKey(dateStr) { const d=new Date(dateStr+"T00:00:00"); const mon=new Date(d); mon.setDate(d.getDate()-((d.getDay()+6)%7)); return mon.toISOString().slice(0,10); }

const s = {
  app: { background:C.bg, minHeight:"100vh", fontFamily:"'Inter','Noto Sans TC',sans-serif", fontWeight:300, color:C.textMain, letterSpacing:"0.02em", paddingBottom:72 },
  header: { position:"sticky", top:0, background:C.bg, borderBottom:`0.5px solid ${C.line}`, padding:"16px 20px", zIndex:50, display:"flex", justifyContent:"space-between", alignItems:"center" },
  brand: { fontFamily:"'Cormorant Garamond','Noto Serif TC',serif", fontSize:17, letterSpacing:"0.18em", fontWeight:300 },
  main: { padding:"24px 20px 16px" },
  secTitle: { fontSize:10, letterSpacing:"0.22em", color:C.textSub, textTransform:"uppercase", marginBottom:28 },
  heroNum: { fontFamily:"'Cormorant Garamond','Noto Serif TC',serif", fontSize:72, lineHeight:1, fontWeight:300, letterSpacing:"-0.02em" },
  heroUnit: { fontSize:13, color:C.textSub, letterSpacing:"0.1em", marginTop:6 },
  divider: { border:"none", borderTop:`0.5px solid ${C.line}`, margin:"28px 0" },
  statsRow: { display:"grid", gridTemplateColumns:"repeat(3,1fr)" },
  statCell: { paddingTop:16, paddingBottom:16 },
  statLabel: { fontSize:10, letterSpacing:"0.15em", color:C.textSub, textTransform:"uppercase", marginBottom:6 },
  statVal: { fontFamily:"'Cormorant Garamond','Noto Serif TC',serif", fontSize:28, fontWeight:300, lineHeight:1 },
  statUnit: { fontSize:11, color:C.textSub, marginLeft:3 },
  lbl: { display:"block", fontSize:10, letterSpacing:"0.18em", textTransform:"uppercase", color:C.textSub, marginBottom:10 },
  inp: { width:"100%", background:"transparent", border:"none", borderBottom:`0.5px solid ${C.line}`, padding:"12px 0", fontSize:16, color:C.textMain, outline:"none", fontFamily:"inherit", fontWeight:300, boxSizing:"border-box" },
  textarea: { width:"100%", background:"transparent", border:`0.5px solid ${C.line}`, padding:10, fontSize:15, color:C.textMain, outline:"none", fontFamily:"inherit", fontWeight:300, lineHeight:1.7, resize:"vertical", minHeight:80, boxSizing:"border-box" },
  sel: { width:"100%", background:"transparent", border:"none", borderBottom:`0.5px solid ${C.line}`, padding:"12px 0", fontSize:16, color:C.textMain, outline:"none", fontFamily:"inherit", fontWeight:300, appearance:"none", boxSizing:"border-box" },
  btn: { display:"block", width:"100%", background:C.textMain, color:C.bg, border:"none", padding:"15px", fontSize:11, letterSpacing:"0.18em", textTransform:"uppercase", cursor:"pointer", marginTop:8, fontFamily:"inherit", fontWeight:300 },
  btnSm: { display:"inline-block", background:"transparent", color:C.textMain, border:`0.5px solid ${C.textMain}`, padding:"8px 16px", fontSize:10, letterSpacing:"0.14em", textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit", fontWeight:300 },
  listRow: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`0.5px solid ${C.line}`, fontSize:13 },
  removeBtn: { background:"none", border:"none", color:C.line, fontSize:20, cursor:"pointer", padding:"4px 8px", lineHeight:1 },
  progressTrack: { height:1, background:C.line, margin:"20px 0 8px" },
  progressFill: (pct) => ({ height:1, background:C.textMain, width:`${pct}%`, transition:"width 0.6s ease" }),
  progressLabels: { display:"flex", justifyContent:"space-between", fontSize:10, color:C.textSub },
  goalCard: { background:C.bgLight, padding:"20px", marginBottom:24 },
  goalRow: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, fontSize:13 },
  goalKey: { color:C.textSub },
  goalVal: { fontFamily:"'Cormorant Garamond','Noto Serif TC',serif", fontSize:18, fontWeight:300 },
  bottomNav: { position:"fixed", bottom:0, left:0, right:0, background:C.bg, borderTop:`0.5px solid ${C.line}`, display:"flex", zIndex:100 },
  bottomTab: (a) => ({ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, padding:"10px 4px", background:"none", border:"none", cursor:"pointer", fontSize:10, letterSpacing:"0.06em", color:a?C.textMain:C.textSub, fontFamily:"inherit", fontWeight:300 }),
  emptyState: { padding:"60px 0" },
  emptyTitle: { fontFamily:"'Cormorant Garamond','Noto Serif TC',serif", fontSize:28, fontWeight:300, marginBottom:8 },
  emptySub: { fontSize:13, color:C.textSub, lineHeight:1.8 },
  periodBtns: { display:"flex", gap:8, flexWrap:"wrap", marginBottom:28 },
  periodBtn: (a) => ({ background:a?C.textMain:"transparent", color:a?C.bg:C.textSub, border:`0.5px solid ${a?C.textMain:C.line}`, padding:"7px 14px", fontSize:10, letterSpacing:"0.1em", cursor:"pointer", fontFamily:"inherit", fontWeight:300 }),
  logCard: { padding:"20px 0", borderBottom:`0.5px solid ${C.line}` },
  logDate: { fontFamily:"'Cormorant Garamond','Noto Serif TC',serif", fontSize:13, fontWeight:300, letterSpacing:"0.1em", color:C.textSub, marginBottom:8 },
  logWeight: { fontFamily:"'Cormorant Garamond','Noto Serif TC',serif", fontSize:32, fontWeight:300, lineHeight:1 },
  logMeta: { fontSize:11, color:C.textSub, display:"flex", gap:14, marginTop:8, flexWrap:"wrap" },
  reportTitle: { fontFamily:"'Cormorant Garamond','Noto Serif TC',serif", fontSize:36, fontWeight:300, lineHeight:1.2, letterSpacing:"0.04em", marginBottom:6 },
  reportSub: { fontSize:11, letterSpacing:"0.15em", color:C.textSub, textTransform:"uppercase" },
  insightText: { fontSize:14, lineHeight:1.9, color:C.textMain, marginBottom:12 },
  photoZone: { border:`0.5px dashed ${C.line}`, padding:"28px 20px", textAlign:"center", cursor:"pointer", marginBottom:12 },
  aiCard: { background:C.bgLight, padding:"16px", marginBottom:20, border:`0.5px solid ${C.line}` },
};

function Toast({ msg }) {
  if (!msg) return null;
  return <div style={{ position:"fixed", bottom:88, left:"50%", transform:"translateX(-50%)", background:C.textMain, color:C.bg, fontSize:12, letterSpacing:"0.1em", padding:"12px 24px", whiteSpace:"nowrap", zIndex:200, pointerEvents:"none" }}>{msg}</div>;
}

function WeightChart({ logs }) {
  const days = Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-6+i); return d.toISOString().slice(0,10); });
  const weights = days.map(d=>logs[d]?.weight?parseFloat(logs[d].weight):null);
  const valid = weights.filter(Boolean);
  const minW=valid.length?Math.min(...valid)-0.5:60, maxW=valid.length?Math.max(...valid)+0.5:70;
  const today = getToday();
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:100 }}>
      {days.map((d,i)=>{ const w=weights[i]; const pct=w?((w-minW)/(maxW-minW))*100:0; return (
        <div key={d} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, height:"100%", justifyContent:"flex-end" }}>
          <span style={{ fontSize:9, color:C.textSub }}>{w?w.toFixed(1):""}</span>
          <div style={{ width:"100%", background:C.textMain, opacity:d===today?0.7:0.15, height:`${Math.max(pct,2)}%`, minHeight:2 }}/>
          <span style={{ fontSize:9, color:C.textSub }}>{d.slice(5)}</span>
        </div>
      ); })}
    </div>
  );
}

// ── 食物照片辨識（貼上 Claude 回傳 JSON）──
function PhotoAnalyzer({ onResult, showToast }) {
  const [mode, setMode] = useState('idle'); // idle | waiting | paste
  const [preview, setPreview] = useState(null);
  const [jsonInput, setJsonInput] = useState('');
  const [parseErr, setParseErr] = useState('');
  const fileRef = useRef();

  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => { setPreview(e.target.result); setMode('waiting'); };
    reader.readAsDataURL(file);
  };

  const applyJson = () => {
    setParseErr('');
    try {
      const cleaned = jsonInput.replace(/```json/g,'').replace(/```/g,'').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('找不到 JSON 內容');
      const result = JSON.parse(match[0]);
      if (!Array.isArray(result.items)) throw new Error('格式錯誤：缺少 items 欄位');
      onResult(result);
      showToast('已加入 ' + result.items.length + ' 項食物，共 ' + result.total + ' kcal');
      setMode('idle'); setPreview(null); setJsonInput('');
    } catch(e) { setParseErr(e.message); }
  };

  const step1Hint = `1. 在 Claude 對話框上傳這張照片
2. 輸入：「這是什麼食物？列出每項名稱與熱量，回傳純 JSON：{"items":[{"name":"名稱","portion":"份量","calories":數字}],"total":數字,"note":"備註"}」
3. 複製 Claude 的回覆，貼到下方`;

  return (
    <div style={{ marginBottom:20 }}>
      <div style={s.aiCard}>
        <div style={{ fontSize:10, letterSpacing:"0.16em", color:C.textSub, textTransform:"uppercase", marginBottom:12 }}>
          📷 食物照片辨識
        </div>

        {mode === 'idle' && (
          <div style={{ ...s.photoZone, marginBottom:0 }} onClick={()=>fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
              onChange={e=>{ if(e.target.files[0]) handleFile(e.target.files[0]); e.target.value=""; }}/>
            <div style={{ fontSize:24, marginBottom:6 }}>📷</div>
            <div style={{ fontSize:11, color:C.textSub, letterSpacing:"0.1em", textTransform:"uppercase" }}>點擊選取照片</div>
          </div>
        )}

        {mode === 'waiting' && (
          <>
            {preview && <img src={preview} style={{ width:"100%", maxHeight:160, objectFit:"contain", marginBottom:12 }} alt="food"/>}
            <div style={{ fontSize:12, color:C.textSub, lineHeight:1.9, marginBottom:14, whiteSpace:"pre-line" }}>{step1Hint}</div>
            <button style={s.btnSm} onClick={()=>setMode('paste')}>我已複製 Claude 的回覆 →</button>
            <button style={{ ...s.btnSm, marginLeft:8, color:C.textSub, borderColor:C.line }} onClick={()=>{ setMode('idle'); setPreview(null); }}>取消</button>
          </>
        )}

        {mode === 'paste' && (
          <>
            {preview && <img src={preview} style={{ width:"100%", maxHeight:120, objectFit:"contain", marginBottom:10 }} alt="food"/>}
            <label style={{ ...s.lbl, marginBottom:8 }}>貼上 Claude 回傳的 JSON</label>
            <textarea
              style={{ ...s.textarea, minHeight:120, fontSize:12, fontFamily:"monospace" }}
              value={jsonInput}
              onChange={e=>{ setJsonInput(e.target.value); setParseErr(''); }}
              placeholder='{"items":[{"name":"雞胸肉","portion":"100g","calories":165}],"total":165,"note":"估算"}'
            />
            {parseErr && <div style={{ fontSize:11, color:C.accent, marginTop:6 }}>⚠ {parseErr}</div>}
            <div style={{ display:"flex", gap:8, marginTop:10 }}>
              <button style={s.btn} onClick={applyJson}>加入飲食清單</button>
            </div>
            <button style={{ ...s.btnSm, marginTop:8, color:C.textSub, borderColor:C.line }} onClick={()=>setMode('waiting')}>← 返回</button>
          </>
        )}
      </div>
      <style>{`@keyframes dot{0%,80%,100%{opacity:0.15}40%{opacity:1}}`}</style>
    </div>
  );
}

// ── DASHBOARD ──
function Dashboard({ logs, onNav }) {
  const today=getToday(); const todayLog=logs[today];
  const getLatestWeight=()=>{ const keys=Object.keys(logs).sort().reverse(); for(const k of keys){if(logs[k]?.weight)return parseFloat(logs[k].weight);} return PROFILE.startWeight; };
  const latestW=getLatestWeight(); const w=todayLog?.weight||latestW;
  const bmr=Math.round(calcBMR(w)), tdee=calcTDEE(w), target=tdee-200;
  const intake=todayLog?.totalIntake||0, burn=todayLog?.totalBurn||0, totalBurn=burn+Math.round(calcBMR(latestW)), balance=intake-totalBurn;
  const startW=PROFILE.startWeight, goalW=PROFILE.goalWeight;
  const pct=Math.max(0,Math.min(100,Math.round((startW-latestW)/(startW-goalW)*100)));
  return (
    <div style={s.main}>
      <p style={s.secTitle}>身形日誌 · 今日概況</p>
      <div style={s.heroNum}>{parseFloat(w).toFixed(1)}</div>
      <div style={s.heroUnit}>kg · 今日體重</div>
      <hr style={s.divider}/>
      <div style={s.statsRow}>
        {[["攝取",intake||"—",intake?"kcal":"",false],["消耗",burn?totalBurn:"—",burn?"kcal":"",false],["淨差",(intake||burn)?(balance>0?"+":"")+balance:"—",(intake||burn)?"kcal":"",(intake||burn)&&balance>300]].map(([l,v,u,red],i)=>(
          <div key={l} style={{...s.statCell,paddingLeft:i?12:0}}>
            <div style={s.statLabel}>{l}</div>
            <div style={{...s.statVal,color:red?C.accent:C.textMain}}>{v}{u&&<span style={s.statUnit}>{u}</span>}</div>
          </div>
        ))}
      </div>
      <hr style={s.divider}/>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:14 }}>
        <span style={{ fontSize:11, letterSpacing:"0.12em", color:C.textSub, textTransform:"uppercase" }}>體重進程</span>
        <span style={{ fontFamily:"'Cormorant Garamond','Noto Serif TC',serif", fontSize:13, color:C.textSub }}>目標 {goalW} kg</span>
      </div>
      <div style={s.progressTrack}><div style={s.progressFill(pct)}/></div>
      <div style={s.progressLabels}><span>起始 {startW} kg</span><span>{pct}%</span><span>目標 {goalW} kg</span></div>
      <hr style={s.divider}/>
      <div style={{ fontSize:11, letterSpacing:"0.12em", color:C.textSub, textTransform:"uppercase", marginBottom:14 }}>近七日體重趨勢</div>
      <WeightChart logs={logs}/>
      <hr style={s.divider}/>
      <div style={{ fontSize:11, letterSpacing:"0.12em", color:C.textSub, textTransform:"uppercase", marginBottom:18 }}>代謝數據</div>
      <div style={s.statsRow}>
        {[["BMR",bmr],["TDEE",tdee],["建議攝取",target]].map(([l,v],i)=>(
          <div key={l} style={{...s.statCell,paddingLeft:i?12:0}}><div style={s.statLabel}>{l}</div><div style={s.statVal}>{v}<span style={s.statUnit}>kcal</span></div></div>
        ))}
      </div>
      <div style={{ marginTop:12, fontSize:11, color:C.textSub, lineHeight:1.7 }}>BMR 靜止消耗 · TDEE 含日常活動×1.55 · 建議攝取 TDEE−200 kcal</div>
      <hr style={s.divider}/>
      <div style={s.goalCard}>
        <div style={{ fontSize:10, letterSpacing:"0.18em", color:C.textSub, textTransform:"uppercase", marginBottom:14 }}>個人資料</div>
        {[["年齡 / 身高","26歲 · 169 cm"],["目前體重 / 體脂",`${parseFloat(w).toFixed(1)} kg · ${todayLog?.bodyfat||PROFILE.startBF}%`],["目標體重 / 體脂",`${goalW} kg · ${PROFILE.goalBF}%`],["蛋白質建議",`${Math.round(w*1.8)}–${Math.round(w*2.2)} g / 天`]].map(([k,v])=>(
          <div key={k} style={s.goalRow}><span style={s.goalKey}>{k}</span><span style={s.goalVal}>{v}</span></div>
        ))}
      </div>
      <button style={s.btn} onClick={()=>onNav("log")}>記錄今日 →</button>
      <button style={{...s.btn, background:"transparent", color:C.textMain, border:`0.5px solid ${C.textMain}`, marginTop:8}} onClick={()=>onNav("import")}>匯入 Apple 健康資料</button>
    </div>
  );
}

// ── APPLE HEALTH IMPORT ──
function loadJSZip() {
  return new Promise((resolve, reject) => {
    if (window.JSZip) { resolve(window.JSZip); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload = () => resolve(window.JSZip);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function parseHealthXML(xml) {
  const results = {};
  // Body Mass (體重)
  const weightReg = /<Record[^>]*type="HKQuantityTypeIdentifierBodyMass"[^>]*startDate="(\d{4}-\d{2}-\d{2})[^"]*"[^>]*value="([\d.]+)"[^>]*\/?>/g;
  let m;
  while ((m = weightReg.exec(xml)) !== null) {
    const [, date, val] = m;
    if (!results[date]) results[date] = {};
    if (!results[date].weight) results[date].weight = parseFloat(val);
  }
  // Body Fat (體脂)
  const fatReg = /<Record[^>]*type="HKQuantityTypeIdentifierBodyFatPercentage"[^>]*startDate="(\d{4}-\d{2}-\d{2})[^"]*"[^>]*value="([\d.]+)"[^>]*\/?>/g;
  while ((m = fatReg.exec(xml)) !== null) {
    const [, date, val] = m;
    if (!results[date]) results[date] = {};
    if (!results[date].bodyfat) results[date].bodyfat = Math.round(parseFloat(val) * 100 * 10) / 10;
  }
  // Lean Body Mass / 肌肉量
  const leanReg = /<Record[^>]*type="HKQuantityTypeIdentifierLeanBodyMass"[^>]*startDate="(\d{4}-\d{2}-\d{2})[^"]*"[^>]*value="([\d.]+)"[^>]*\/?>/g;
  while ((m = leanReg.exec(xml)) !== null) {
    const [, date, val] = m;
    if (!results[date]) results[date] = {};
    if (!results[date].leanMass) results[date].leanMass = parseFloat(val);
  }
  // BMI
  const bmiReg = /<Record[^>]*type="HKQuantityTypeIdentifierBodyMassIndex"[^>]*startDate="(\d{4}-\d{2}-\d{2})[^"]*"[^>]*value="([\d.]+)"[^>]*\/?>/g;
  while ((m = bmiReg.exec(xml)) !== null) {
    const [, date, val] = m;
    if (!results[date]) results[date] = {};
    if (!results[date].bmi) results[date].bmi = Math.round(parseFloat(val) * 10) / 10;
  }
  return results;
}

function ImportView({ logs, onImport, onNav, showToast }) {
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState(null);
  const [parsed, setParsed] = useState(null);
  const fileRef = useRef();

  const handleFile = async (file) => {
    setStatus("讀取檔案中…");
    setParsed(null);
    setPreview(null);
    try {
      let xmlText = "";
      if (file.name.endsWith(".zip")) {
        setStatus("解壓縮中…");
        const JSZip = await loadJSZip();
        const zip = await JSZip.loadAsync(file);
        const allFiles = Object.keys(zip.files);
        const xmlEntry = allFiles.find(f => (f.toLowerCase().endsWith("export.xml") || f.endsWith("輸出.xml")) && !zip.files[f].dir);
        if (!xmlEntry) throw new Error("找不到 export.xml，ZIP 內容：" + allFiles.slice(0,10).join(", "));
        setStatus("讀取 XML 中（檔案可能較大請稍候）…");
        xmlText = await zip.files[xmlEntry].async("string");
      } else {
        xmlText = await file.text();
      }
      setStatus("解析資料中…");
      const data = parseHealthXML(xmlText);
      const dates = Object.keys(data).sort();
      if (!dates.length) throw new Error("未找到體重資料，請確認來自 Apple 健康 App");
      setParsed(data);
      setPreview({ count: dates.length, from: dates[0], to: dates[dates.length-1], sample: data[dates[dates.length-1]] });
      setStatus("");
    } catch(e) {
      setStatus("⚠ " + e.message);
    }
  };

  const doImport = () => {
    if (!parsed) return;
    const newLogs = { ...logs };
    let imported = 0;
    Object.entries(parsed).forEach(([date, vals]) => {
      if (!newLogs[date]) newLogs[date] = { date, foods:[], workouts:[], totalIntake:0, totalBurn:0 };
      if (vals.weight && !newLogs[date].weight) {
        newLogs[date].weight = vals.weight;
        newLogs[date].bmrBurn = Math.round(calcBMR(vals.weight));
        imported++;
      }
      if (vals.bodyfat) newLogs[date].bodyfat = vals.bodyfat;
      if (vals.leanMass) newLogs[date].leanMass = vals.leanMass;
      if (vals.bmi) newLogs[date].bmi = vals.bmi;
    });
    onImport(newLogs);
    showToast(`成功匯入 ${imported} 筆記錄`);
    onNav("dashboard");
  };

  return (
    <div style={s.main}>
      <p style={s.secTitle}>匯入 Apple 健康資料</p>
      <div style={{ fontSize:12, color:C.textSub, lineHeight:1.9, marginBottom:20 }}>
        iPhone「健康」→「個人資料」→ 右上角 ⋯ →「匯出所有健康資料」→ 上傳 ZIP 或 XML
      </div>
      <div style={{ marginBottom:20 }}>
        <div style={{ ...s.photoZone, marginBottom:0 }} onClick={()=>fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".zip,.xml" style={{ display:"none" }}
            onChange={e=>{ if(e.target.files[0]) handleFile(e.target.files[0]); e.target.value=""; }}/>
          <div style={{ fontSize:24, marginBottom:6 }}>📁</div>
          <div style={{ fontSize:11, color:C.textSub, letterSpacing:"0.1em", textTransform:"uppercase" }}>點擊上傳 ZIP 或 XML</div>
        </div>
      </div>
      {status && <div style={{ fontSize:12, color: status.startsWith("⚠") ? C.accent : C.textSub, marginBottom:16, lineHeight:1.7 }}>{status}</div>}
      {preview && (
        <div style={s.goalCard}>
          <div style={{ fontSize:10, letterSpacing:"0.16em", color:C.textSub, textTransform:"uppercase", marginBottom:12 }}>解析結果預覽</div>
          {[
            ["筆數", `${preview.count} 天`],
            ["時間範圍", `${preview.from} ～ ${preview.to}`],
            ["最新體重", preview.sample?.weight ? `${preview.sample.weight} kg` : "無"],
            ["最新體脂", preview.sample?.bodyfat ? `${preview.sample.bodyfat}%` : "無（健康 App 未同步）"],
            ["最新 BMI", preview.sample?.bmi ? `${preview.sample.bmi}` : "無（健康 App 未同步）"],
            ["最新肌肉量", preview.sample?.leanMass ? `${preview.sample.leanMass.toFixed(1)} kg` : "無（健康 App 未同步）"],
          ].map(([k,v])=>(
            <div key={k} style={s.goalRow}><span style={s.goalKey}>{k}</span><span style={s.goalVal}>{v}</span></div>
          ))}
          <button style={{ ...s.btn, marginTop:16 }} onClick={doImport}>確認匯入</button>
        </div>
      )}
      <button style={{ ...s.btnSm, marginTop:16, color:C.textSub, borderColor:C.line }} onClick={()=>onNav("dashboard")}>← 返回</button>
    </div>
  );
}

// ── LOG ──
function LogView({ logs, onSave, showToast }) {
  const [date,setDate]=useState(getToday());
  const [weight,setWeight]=useState(""), [bodyfat,setBodyfat]=useState(""), [notes,setNotes]=useState("");
  const [foods,setFoods]=useState([]), [workouts,setWorkouts]=useState([]);
  const [foodName,setFoodName]=useState(""), [foodCal,setFoodCal]=useState("");
  const [foodSearch,setFoodSearch]=useState(""), [suggestions,setSuggestions]=useState([]);
  const [wType,setWType]=useState(""), [wMin,setWMin]=useState(""), [wSets,setWSets]=useState(""), [wCustom,setWCustom]=useState("");

  const loadDate=useCallback((d)=>{ const log=logs[d]||{}; setWeight(log.weight||""); setBodyfat(log.bodyfat||""); setNotes(log.notes||""); setFoods(log.foods||[]); setWorkouts(log.workouts||[]); },[logs]);
  useEffect(()=>{ loadDate(date); },[date,loadDate]);

  const handleFoodSearch=(q)=>{ setFoodSearch(q); if(!q.trim()){setSuggestions([]);return;} setSuggestions(FOOD_DB.filter(f=>f.n.toLowerCase().includes(q.toLowerCase())).slice(0,6)); };
  const selectFood=(f)=>{ setFoodName(f.n); setFoodCal(String(f.c)); setFoodSearch(""); setSuggestions([]); };
  const addFood=()=>{ if(!foodName||!foodCal){showToast("請輸入食物名稱與大卡");return;} setFoods(p=>[...p,{name:foodName,cal:parseInt(foodCal)}]); setFoodName(""); setFoodCal(""); setFoodSearch(""); };
  const addWorkout=()=>{
    if(!wType){showToast("請選擇運動項目");return;} if(!wMin){showToast("請輸入時間");return;}
    const found=WORKOUT_TYPES.find(t=>t.label===wType); const met=found?.met||4;
    const curW=parseFloat(weight)||PROFILE.startWeight;
    const burn=Math.round(met*curW*(parseInt(wMin)/60)*1.05);
    const name=wType==="自訂"?wCustom||"自訂運動":wType;
    setWorkouts(p=>[...p,{name,min:parseInt(wMin),sets:wSets||null,burn}]);
    setWType(""); setWMin(""); setWSets(""); setWCustom("");
  };
  const save=()=>{
    if(!date){showToast("請選擇日期");return;} if(!weight){showToast("請輸入今日體重");return;}
    const totalIntake=foods.reduce((s,f)=>s+f.cal,0), totalBurn=workouts.reduce((s,w)=>s+w.burn,0), bmrBurn=Math.round(calcBMR(parseFloat(weight)));
    onSave(date,{date,weight:parseFloat(weight),bodyfat:bodyfat?parseFloat(bodyfat):null,foods,workouts,totalIntake,totalBurn,bmrBurn,netBalance:totalIntake-(totalBurn+bmrBurn),notes,savedAt:new Date().toISOString()});
    showToast("記錄已儲存 ✓");
  };

  const handleAiResult=(result)=>{
    setFoods(p=>[...p,...result.items.map(item=>({ name:`${item.name}（${item.portion}）`, cal:item.calories }))]);
  };

  const totalIntake=foods.reduce((s,f)=>s+f.cal,0), totalBurn=workouts.reduce((s,w)=>s+w.burn,0);

  return (
    <div style={s.main}>
      <p style={s.secTitle}>每日記錄</p>
      <div style={{ marginBottom:24 }}><label style={s.lbl}>日期</label><input type="date" style={s.inp} value={date} onChange={e=>{setDate(e.target.value);loadDate(e.target.value);}}/></div>
      <div style={{ marginBottom:24 }}><label style={s.lbl}>今日體重 (kg)</label><input type="number" style={s.inp} value={weight} onChange={e=>setWeight(e.target.value)} placeholder="65.0" step="0.1"/></div>
      <div style={{ marginBottom:24 }}><label style={s.lbl}>體脂率 % (選填)</label><input type="number" style={s.inp} value={bodyfat} onChange={e=>setBodyfat(e.target.value)} placeholder="18.0" step="0.1"/></div>
      <hr style={s.divider}/>

      <div style={{ fontSize:10, letterSpacing:"0.18em", color:C.textSub, textTransform:"uppercase", marginBottom:20 }}>飲食記錄</div>

      {/* Claude Vision 拍照辨識 */}
      <PhotoAnalyzer onResult={handleAiResult} showToast={showToast}/>

      {/* 食物搜尋 */}
      <div style={{ position:"relative", marginBottom:20 }}>
        <label style={s.lbl}>搜尋或手動輸入食物</label>
        <input type="text" style={s.inp} value={foodSearch} onChange={e=>handleFoodSearch(e.target.value)} placeholder="輸入食物名稱…"/>
        {suggestions.length>0 && (
          <div style={{ position:"absolute", top:"100%", left:0, right:0, background:C.bgLight, border:`0.5px solid ${C.line}`, zIndex:50, maxHeight:200, overflowY:"auto" }}>
            {suggestions.map(f=>(
              <div key={f.n} onClick={()=>selectFood(f)} style={{ display:"flex", justifyContent:"space-between", padding:"10px 14px", fontSize:13, borderBottom:`0.5px solid ${C.line}`, cursor:"pointer" }}>
                <span>{f.n}</span><span style={{ fontSize:11, color:C.textSub }}>{f.c} kcal</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
        <div><label style={s.lbl}>食物名稱</label><input type="text" style={s.inp} value={foodName} onChange={e=>setFoodName(e.target.value)} placeholder="自訂名稱"/></div>
        <div><label style={s.lbl}>大卡</label><input type="number" style={s.inp} value={foodCal} onChange={e=>setFoodCal(e.target.value)} placeholder="300"/></div>
      </div>
      <button style={s.btnSm} onClick={addFood}>+ 加入飲食</button>

      <div style={{ marginTop:16 }}>
        {foods.map((f,i)=>(
          <div key={i} style={s.listRow}>
            <span style={{ flex:1, paddingRight:8, fontSize:12 }}>{f.name}</span>
            <span style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:12, color:C.textSub, whiteSpace:"nowrap" }}>{f.cal} kcal</span>
              <button style={s.removeBtn} onClick={()=>setFoods(p=>p.filter((_,j)=>j!==i))}>×</button>
            </span>
          </div>
        ))}
        {foods.length>0&&(
          <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 0 0", fontSize:11, letterSpacing:"0.1em", color:C.textSub, textTransform:"uppercase" }}>
            <span>今日攝取總計</span>
            <span style={{ fontFamily:"'Cormorant Garamond','Noto Serif TC',serif", fontSize:20, color:C.textMain }}>{totalIntake} kcal</span>
          </div>
        )}
      </div>

      <hr style={s.divider}/>
      <div style={{ fontSize:10, letterSpacing:"0.18em", color:C.textSub, textTransform:"uppercase", marginBottom:20 }}>健身記錄</div>
      <div style={{ marginBottom:16 }}><label style={s.lbl}>運動項目</label>
        <select style={s.sel} value={wType} onChange={e=>setWType(e.target.value)}>
          <option value="">選擇項目</option>
          {WORKOUT_TYPES.map(t=><option key={t.label} value={t.label}>{t.label}</option>)}
        </select>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
        <div><label style={s.lbl}>時間 (分鐘)</label><input type="number" style={s.inp} value={wMin} onChange={e=>setWMin(e.target.value)} placeholder="60"/></div>
        <div><label style={s.lbl}>組數 (選填)</label><input type="number" style={s.inp} value={wSets} onChange={e=>setWSets(e.target.value)} placeholder="—"/></div>
      </div>
      {wType==="自訂"&&<div style={{ marginBottom:16 }}><label style={s.lbl}>自訂運動名稱</label><input type="text" style={s.inp} value={wCustom} onChange={e=>setWCustom(e.target.value)} placeholder="運動名稱"/></div>}
      <button style={s.btnSm} onClick={addWorkout}>+ 加入運動</button>
      <div style={{ marginTop:16 }}>
        {workouts.map((w,i)=>(
          <div key={i} style={s.listRow}>
            <div><div style={{ fontSize:13 }}>{w.name}</div><div style={{ fontSize:11, color:C.textSub }}>{w.min}分鐘{w.sets?` · ${w.sets}組`:""}</div></div>
            <span style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:12, color:C.textSub }}>{w.burn} kcal</span>
              <button style={s.removeBtn} onClick={()=>setWorkouts(p=>p.filter((_,j)=>j!==i))}>×</button>
            </span>
          </div>
        ))}
        {workouts.length>0&&(
          <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 0 0", fontSize:11, letterSpacing:"0.1em", color:C.textSub, textTransform:"uppercase" }}>
            <span>今日消耗總計</span>
            <span style={{ fontFamily:"'Cormorant Garamond','Noto Serif TC',serif", fontSize:20, color:C.textMain }}>{totalBurn} kcal</span>
          </div>
        )}
      </div>

      <hr style={s.divider}/>
      <div style={{ marginBottom:24 }}><label style={s.lbl}>備註</label><textarea style={s.textarea} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="今日身體狀況、睡眠、心情…"/></div>
      <button style={s.btn} onClick={save}>儲存今日記錄</button>
    </div>
  );
}

// ── HISTORY ──
function HistoryView({ logs }) {
  const keys=Object.keys(logs).sort().reverse();
  if(!keys.length) return <div style={s.main}><p style={s.secTitle}>歷史記錄</p><div style={s.emptyState}><div style={s.emptyTitle}>尚無記錄</div><div style={s.emptySub}>從「記錄」頁面開始你的第一筆日誌</div></div></div>;
  return (
    <div style={s.main}>
      <p style={s.secTitle}>歷史記錄</p>
      {keys.map(k=>{ const l=logs[k]; const net=l.netBalance||0; return (
        <div key={k} style={s.logCard}>
          <div style={s.logDate}>{formatDate(k)}</div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
            <span style={s.logWeight}>{l.weight}<span style={{ fontSize:14, color:C.textSub }}> kg</span></span>
            <span style={{ fontSize:13, color:net>300?C.accent:C.bgDark }}>{net>0?"+":""}{net} kcal</span>
          </div>
          <div style={s.logMeta}>
            <span>攝取 {l.totalIntake||0} kcal</span>
            <span>消耗 {(l.totalBurn||0)+(l.bmrBurn||0)} kcal</span>
            {l.bodyfat&&<span>體脂 {l.bodyfat}%</span>}
            {l.bmi&&<span>BMI {l.bmi}</span>}
            {l.leanMass&&<span>肌肉 {parseFloat(l.leanMass).toFixed(1)}kg</span>}
            {l.workouts?.length>0&&<span>{l.workouts.map(w=>w.name).join("、")}</span>}
          </div>
        </div>
      ); })}
    </div>
  );
}

// ── WEEKLY ──
function WeeklyView({ logs }) {
  const weeks=[...new Set(Object.keys(logs).map(getWeekKey))].sort().reverse();
  const [sel,setSel]=useState(weeks[0]||null);
  useEffect(()=>{ if(weeks.length&&!sel)setSel(weeks[0]); },[weeks]);
  if(!weeks.length) return <div style={s.main}><p style={s.secTitle}>每週檢討報告</p><div style={s.emptyState}><div style={s.emptyTitle}>尚無資料</div><div style={s.emptySub}>記錄至少一週數據後即可生成週報</div></div></div>;
  const days=sel?Array.from({length:7},(_,i)=>{ const d=new Date(sel+"T00:00:00"); d.setDate(d.getDate()+i); return d.toISOString().slice(0,10); }):[];
  const weekLogs=days.map(d=>logs[d]).filter(Boolean);
  const avgW=avg(weekLogs.map(l=>l.weight)), avgI=avg(weekLogs.map(l=>l.totalIntake||0)), avgB=avg(weekLogs.map(l=>(l.totalBurn||0)+(l.bmrBurn||0))), avgNet=Math.round(avgI-avgB);
  const totalBurn=weekLogs.reduce((s,l)=>s+(l.totalBurn||0),0), wDays=weekLogs.filter(l=>l.workouts?.length).length;
  const wChange=weekLogs.length>1?weekLogs[weekLogs.length-1].weight-weekLogs[0].weight:0;
  const wArr=weekLogs.map(l=>l.weight);
  const weekEnd=sel?(()=>{ const e=new Date(sel+"T00:00:00"); e.setDate(e.getDate()+6); return e.toISOString().slice(0,10); })():"";
  return (
    <div style={s.main}>
      <p style={s.secTitle}>每週檢討報告</p>
      <div style={s.periodBtns}>{weeks.map(w=>{ const e=new Date(w+"T00:00:00"); e.setDate(e.getDate()+6); return <button key={w} style={s.periodBtn(sel===w)} onClick={()=>setSel(w)}>{w.slice(5)}—{e.toISOString().slice(5,10)}</button>; })}</div>
      {weekLogs.length===0?<div style={s.emptySub}>本週尚無記錄</div>:<>
        <div style={s.reportTitle}>{sel?.slice(5)} —<br/>{weekEnd.slice(5)}</div>
        <div style={{...s.reportSub,marginBottom:28}}>每週檢討 · {weekLogs.length} 天記錄</div>
        {[["體重數據",[["均值",avgW.toFixed(1),"kg"],["變化",(wChange>0?"+":"")+wChange.toFixed(1),"kg",wChange>0],["波動",wArr.length>1?(Math.max(...wArr)-Math.min(...wArr)).toFixed(1):"—","kg"]]],["熱量數據",[["日均攝取",Math.round(avgI),"kcal"],["日均消耗",Math.round(avgB),"kcal"],["日均淨差",(avgNet>0?"+":"")+avgNet,"",avgNet>0]]],["訓練數據",[["訓練天數",wDays,"天"],["總消耗",totalBurn,"kcal"],["記錄天數",weekLogs.length+"/7",""]]]].map(([title,cells])=>(
          <div key={title}>
            <div style={{ fontSize:10, letterSpacing:"0.2em", color:C.textSub, textTransform:"uppercase", marginBottom:16, paddingBottom:10, borderBottom:`0.5px solid ${C.line}` }}>{title}</div>
            <div style={s.statsRow}>{cells.map(([l,v,u,red],i)=><div key={l} style={{...s.statCell,paddingLeft:i?12:0}}><div style={s.statLabel}>{l}</div><div style={{...s.statVal,color:red?C.accent:C.textMain}}>{v}{u&&<span style={s.statUnit}>{u}</span>}</div></div>)}</div>
            <hr style={s.divider}/>
          </div>
        ))}
        <div style={s.insightText}>{avgNet<-200?`✓ 本週維持熱量赤字，平均每日 ${Math.abs(avgNet)} kcal，減脂方向正確。`:avgNet>300?`本週熱量盈餘，平均每日 +${avgNet} kcal，注意飲食控制。`:`本週熱量接近平衡，適合維持或增肌期。`}</div>
        <div style={s.insightText}>{wDays>=4?`✓ 本週訓練 ${wDays} 天，頻率良好。`:wDays>=2?`本週訓練 ${wDays} 天，建議增加至 4 天以上。`:`本週訓練頻率偏低，建議提高。`}</div>
      </>}
    </div>
  );
}

// ── MONTHLY ──
function MonthlyView({ logs }) {
  const months=[...new Set(Object.keys(logs).map(k=>k.slice(0,7)))].sort().reverse();
  const [sel,setSel]=useState(months[0]||null);
  useEffect(()=>{ if(months.length&&!sel)setSel(months[0]); },[months]);
  if(!months.length) return <div style={s.main}><p style={s.secTitle}>每月總結報告</p><div style={s.emptyState}><div style={s.emptyTitle}>尚無資料</div><div style={s.emptySub}>記錄至少一個月後即可生成月報</div></div></div>;
  const mLogs=Object.entries(logs).filter(([k])=>k.startsWith(sel)).map(([,v])=>v);
  const avgW=avg(mLogs.map(l=>l.weight)), avgI=avg(mLogs.map(l=>l.totalIntake||0)), avgB=avg(mLogs.map(l=>(l.totalBurn||0)+(l.bmrBurn||0))), avgNet=Math.round(avgI-avgB);
  const wDays=mLogs.filter(l=>l.workouts?.length).length, wChange=mLogs.length>1?mLogs[mLogs.length-1].weight-mLogs[0].weight:0;
  return (
    <div style={s.main}>
      <p style={s.secTitle}>每月總結報告</p>
      <div style={s.periodBtns}>{months.map(m=><button key={m} style={s.periodBtn(sel===m)} onClick={()=>setSel(m)}>{m}</button>)}</div>
      {mLogs.length===0?<div style={s.emptySub}>本月尚無記錄</div>:<>
        <div style={s.reportTitle}>{sel}</div>
        <div style={{...s.reportSub,marginBottom:28}}>月度總結 · {mLogs.length} 天記錄</div>
        <div style={s.statsRow}>
          {[["均重",avgW.toFixed(1),"kg"],["體重變化",(wChange>0?"+":"")+wChange.toFixed(1),"kg",wChange>0],["訓練天數",wDays,"天"]].map(([l,v,u,red],i)=>(
            <div key={l} style={{...s.statCell,paddingLeft:i?12:0}}><div style={s.statLabel}>{l}</div><div style={{...s.statVal,color:red?C.accent:C.textMain}}>{v}<span style={s.statUnit}>{u}</span></div></div>
          ))}
        </div>
        <hr style={s.divider}/>
        <div style={s.statsRow}>
          {[["日均攝取",Math.round(avgI),"kcal"],["日均消耗",Math.round(avgB),"kcal"],["日均淨差",(avgNet>0?"+":"")+avgNet,"",avgNet>0]].map(([l,v,u,red],i)=>(
            <div key={l} style={{...s.statCell,paddingLeft:i?12:0}}><div style={s.statLabel}>{l}</div><div style={{...s.statVal,color:red?C.accent:C.textMain}}>{v}{u&&<span style={s.statUnit}>{u}</span>}</div></div>
          ))}
        </div>
        <hr style={s.divider}/>
        <div style={s.insightText}>{wChange<-1?`✓ 本月體重下降 ${Math.abs(wChange).toFixed(1)} kg，持續維持當前策略。`:wChange>0.5?`本月體重上升 ${wChange.toFixed(1)} kg，建議檢視飲食與訓練。`:`本月體重維持穩定，適合增肌週期。`}</div>
      </>}
    </div>
  );
}

const Icon = {
  dashboard: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  log: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  history: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  weekly: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  monthly: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>,
};
const TABS=[{id:"dashboard",label:"今日",icon:Icon.dashboard},{id:"log",label:"記錄",icon:Icon.log},{id:"history",label:"歷史",icon:Icon.history},{id:"weekly",label:"週報",icon:Icon.weekly},{id:"monthly",label:"月報",icon:Icon.monthly}];

export default function App() {
  const [tab,setTab]=useState("dashboard");
  const [logs,setLogs]=useState(()=>{ try { return JSON.parse(localStorage.getItem("bcd_logs")||"{}"); } catch(e){return{};} });
  const [toast,setToast]=useState("");
  const showToast=(msg)=>{ setToast(msg); setTimeout(()=>setToast(""),2500); };
  const saveLog=(date,entry)=>{
    setLogs(p=>{ const n={...p,[date]:entry}; try{localStorage.setItem("bcd_logs",JSON.stringify(n));}catch(e){} return n; });
    setTimeout(()=>setTab("dashboard"),600);
  };
  const importLogs=(newLogs)=>{ setLogs(newLogs); try{localStorage.setItem("bcd_logs",JSON.stringify(newLogs));}catch(e){} };
  const isImport = tab==="import";
  return (
    <div style={s.app}>
      <div style={s.header}>
        <span style={s.brand}>身形日誌</span>
        <span style={{ fontSize:10, color:C.textSub, letterSpacing:"0.12em" }}>bcd fitness</span>
      </div>
      {tab==="dashboard"&&<Dashboard logs={logs} onNav={setTab}/>}
      {tab==="log"&&<LogView logs={logs} onSave={saveLog} showToast={showToast}/>}
      {tab==="history"&&<HistoryView logs={logs}/>}
      {tab==="weekly"&&<WeeklyView logs={logs}/>}
      {tab==="monthly"&&<MonthlyView logs={logs}/>}
      {tab==="import"&&<ImportView logs={logs} onImport={importLogs} onNav={setTab} showToast={showToast}/>}
      {!isImport && (
        <nav style={s.bottomNav}>
          {TABS.map(t=>(<button key={t.id} style={s.bottomTab(tab===t.id)} onClick={()=>setTab(t.id)}>{t.icon}{t.label}</button>))}
        </nav>
      )}
      <Toast msg={toast}/>
    </div>
  );
}
