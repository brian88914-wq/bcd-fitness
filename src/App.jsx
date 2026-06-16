import { useState, useEffect, useCallback, useRef } from "react";
import { loadProfile, saveProfile, loadLogs, saveLog, saveAllLogs, getDeviceId } from "./db.js";

const C = {
  bg: "#EDE9E3", bgLight: "#F7F5F1", bgDark: "#2D3B2E",
  textMain: "#2D3B2E", textSub: "#5A5850", accent: "#3C2A24", line: "#C4B8A8",
  green: "#2D3B2E", red: "#3C2A24",
};

const ACTIVITY_LEVELS = [
  { label:"久坐", desc:"幾乎不運動、辦公室工作", factor:1.2 },
  { label:"輕度活躍", desc:"每週運動 1–3 天", factor:1.375 },
  { label:"中度活躍", desc:"每週運動 3–5 天", factor:1.55 },
  { label:"高度活躍", desc:"每週運動 6–7 天", factor:1.725 },
  { label:"非常活躍", desc:"體力勞動 / 每天訓練", factor:1.9 },
];

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

function calcBMR(weight, height, age, gender) {
  const base = 10*weight + 6.25*height - 5*age;
  return Math.round(gender === "male" ? base + 5 : base - 161);
}
function calcTDEE(bmr, activityFactor) { return Math.round(bmr * activityFactor); }
function calcBMI(weight, height) { return Math.round((weight / ((height/100)**2)) * 10) / 10; }
function bmiLabel(bmi) {
  if (bmi < 18.5) return "體重過輕";
  if (bmi < 24) return "正常範圍";
  if (bmi < 27) return "過重";
  if (bmi < 30) return "輕度肥胖";
  return "中重度肥胖";
}
function avg(arr) { return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }
function formatDate(s) { const d=new Date(s+"T00:00:00"); return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`; }
function getWeekKey(dateStr) { const d=new Date(dateStr+"T00:00:00"); const mon=new Date(d); mon.setDate(d.getDate()-((d.getDay()+6)%7)); return mon.toISOString().slice(0,10); }

const DEFAULT_PROFILE = { name:"", age:"", gender:"male", height:"", weight:"", activityLevel:2, goal:"lose" };

const s = {
  app: { background:C.bg, minHeight:"100vh", fontFamily:"'Inter','Noto Sans TC',sans-serif", fontWeight:300, color:C.textMain, letterSpacing:"0.02em", paddingBottom:72 },
  header: { position:"sticky", top:0, background:C.bg, borderBottom:`0.5px solid ${C.line}`, padding:"16px 20px", zIndex:50, display:"flex", justifyContent:"space-between", alignItems:"center" },
  brand: { fontFamily:"'Cormorant Garamond','Noto Serif TC',serif", fontSize:17, letterSpacing:"0.18em", fontWeight:300 },
  main: { padding:"24px 20px 16px" },
  secTitle: { fontSize:10, letterSpacing:"0.22em", color:C.textSub, textTransform:"uppercase", marginBottom:28 },
  heroNum: { fontFamily:"'Cormorant Garamond','Noto Serif TC',serif", fontSize:64, lineHeight:1, fontWeight:300, letterSpacing:"-0.02em" },
  heroUnit: { fontSize:13, color:C.textSub, letterSpacing:"0.1em", marginTop:6 },
  divider: { border:"none", borderTop:`0.5px solid ${C.line}`, margin:"28px 0" },
  statsRow: { display:"grid", gridTemplateColumns:"repeat(3,1fr)" },
  statCell: { paddingTop:16, paddingBottom:16 },
  statLabel: { fontSize:10, letterSpacing:"0.15em", color:C.textSub, textTransform:"uppercase", marginBottom:6 },
  statVal: { fontFamily:"'Cormorant Garamond','Noto Serif TC',serif", fontSize:26, fontWeight:300, lineHeight:1 },
  statUnit: { fontSize:11, color:C.textSub, marginLeft:3 },
  lbl: { display:"block", fontSize:10, letterSpacing:"0.18em", textTransform:"uppercase", color:C.textSub, marginBottom:10 },
  inp: { width:"100%", background:"transparent", border:"none", borderBottom:`0.5px solid ${C.line}`, padding:"12px 0", fontSize:16, color:C.textMain, outline:"none", fontFamily:"inherit", fontWeight:300, boxSizing:"border-box" },
  textarea: { width:"100%", background:"transparent", border:`0.5px solid ${C.line}`, padding:10, fontSize:15, color:C.textMain, outline:"none", fontFamily:"inherit", fontWeight:300, lineHeight:1.7, resize:"vertical", minHeight:80, boxSizing:"border-box" },
  sel: { width:"100%", background:"transparent", border:"none", borderBottom:`0.5px solid ${C.line}`, padding:"12px 0", fontSize:16, color:C.textMain, outline:"none", fontFamily:"inherit", fontWeight:300, appearance:"none", boxSizing:"border-box" },
  btn: { display:"block", width:"100%", background:C.textMain, color:C.bg, border:"none", padding:"15px", fontSize:11, letterSpacing:"0.18em", textTransform:"uppercase", cursor:"pointer", marginTop:8, fontFamily:"inherit", fontWeight:300 },
  btnSm: { display:"inline-block", background:"transparent", color:C.textMain, border:`0.5px solid ${C.textMain}`, padding:"8px 16px", fontSize:10, letterSpacing:"0.14em", textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit", fontWeight:300 },
  btnGhost: { display:"inline-block", background:"transparent", color:C.textSub, border:`0.5px solid ${C.line}`, padding:"8px 16px", fontSize:10, letterSpacing:"0.14em", textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit", fontWeight:300 },
  listRow: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`0.5px solid ${C.line}`, fontSize:13 },
  removeBtn: { background:"none", border:"none", color:C.line, fontSize:20, cursor:"pointer", padding:"4px 8px", lineHeight:1 },
  goalCard: { background:C.bgLight, padding:"20px", marginBottom:24 },
  goalRow: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, fontSize:13 },
  goalKey: { color:C.textSub },
  goalVal: { fontFamily:"'Cormorant Garamond','Noto Serif TC',serif", fontSize:18, fontWeight:300 },
  bottomNav: { position:"fixed", bottom:0, left:0, right:0, background:C.bg, borderTop:`0.5px solid ${C.line}`, display:"flex", zIndex:100 },
  bottomTab: (a) => ({ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, padding:"10px 4px", background:"none", border:"none", cursor:"pointer", fontSize:10, letterSpacing:"0.06em", color:a?C.textMain:C.textSub, fontFamily:"inherit", fontWeight:300 }),
  emptyState: { padding:"60px 0", textAlign:"center" },
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
  goalChip: (active, color) => ({ display:"inline-flex", flexDirection:"column", alignItems:"center", padding:"14px 20px", border:`0.5px solid ${active ? color : C.line}`, background: active ? color : "transparent", color: active ? C.bg : C.textSub, cursor:"pointer", flex:1, gap:4 }),
  targetBox: (ok) => ({ background: ok ? "#e8f0e8" : "#f0e8e8", border:`0.5px solid ${ok ? "#a8c4a8" : "#c4a8a8"}`, padding:"14px 16px", marginBottom:12 }),
};

function Toast({ msg }) {
  if (!msg) return null;
  return <div style={{ position:"fixed", bottom:88, left:"50%", transform:"translateX(-50%)", background:C.textMain, color:C.bg, fontSize:12, letterSpacing:"0.1em", padding:"12px 24px", whiteSpace:"nowrap", zIndex:200, pointerEvents:"none" }}>{msg}</div>;
}

// ── 飲食記錄貼上區塊 ──
function AIFoodEstimator({ onResult, showToast }) {
  const [jsonInput, setJsonInput] = useState("");
  const [parseErr, setParseErr] = useState("");

  const applyJson = () => {
    setParseErr("");
    try {
      const cleaned = jsonInput.replace(/```json/g,"").replace(/```/g,"").trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("找不到 JSON 內容");
      const res = JSON.parse(match[0]);
      if (!Array.isArray(res.items)) throw new Error("格式錯誤");
      onResult(res);
      showToast("已加入 " + res.items.length + " 項，共 " + res.total + " kcal");
      setJsonInput("");
    } catch(e) { setParseErr(e.message); }
  };

  return (
    <div style={{ marginBottom:20 }}>
      <div style={s.aiCard}>
        <div style={{ fontSize:10, letterSpacing:"0.16em", color:C.textSub, textTransform:"uppercase", marginBottom:12 }}>
          📋 食物熱量估算
        </div>
        <div style={{ fontSize:11, color:C.textSub, lineHeight:1.8, marginBottom:10 }}>
          上傳食物照片給 Claude，輸入「數據」，將回傳的 JSON 貼到下方
        </div>
        <textarea
          style={{ ...s.textarea, minHeight:120, fontSize:12, fontFamily:"monospace" }}
          value={jsonInput}
          onChange={e=>{ setJsonInput(e.target.value); setParseErr(""); }}
          placeholder='{"items":[{"name":"雞胸肉","portion":"100g","calories":165}],"total":165,"note":"估算"}'
        />
        {parseErr && <div style={{ fontSize:11, color:C.accent, marginTop:6 }}>⚠ {parseErr}</div>}
        <button style={{ ...s.btn, marginTop:12 }} onClick={applyJson}>加入飲食清單</button>
      </div>
    </div>
  );
}

// ── PROFILE SETUP ──
function ProfileSetup({ onSave }) {
  const [form, setForm] = useState(DEFAULT_PROFILE);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const canCalc = form.age && form.height && form.weight;
  let preview = null;
  if (canCalc) {
    const w = parseFloat(form.weight), h = parseFloat(form.height), a = parseInt(form.age);
    const bmr = calcBMR(w, h, a, form.gender);
    const factor = ACTIVITY_LEVELS[form.activityLevel].factor;
    const tdee = calcTDEE(bmr, factor);
    const bmi = calcBMI(w, h);
    const target = form.goal === "gain" ? Math.round(tdee * 1.1) : Math.round(tdee * 0.8);
    preview = { bmr, tdee, bmi, target };
  }

  return (
    <div style={s.main}>
      <p style={s.secTitle}>建立個人資料</p>
      <div style={{ marginBottom:24 }}>
        <label style={s.lbl}>暱稱（選填）</label>
        <input type="text" style={s.inp} value={form.name} onChange={e=>set("name",e.target.value)} placeholder="你的名字"/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>
        <div>
          <label style={s.lbl}>年齡</label>
          <input type="number" style={s.inp} value={form.age} onChange={e=>set("age",e.target.value)} placeholder="26"/>
        </div>
        <div>
          <label style={s.lbl}>性別</label>
          <select style={s.sel} value={form.gender} onChange={e=>set("gender",e.target.value)}>
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>
        <div>
          <label style={s.lbl}>身高 (cm)</label>
          <input type="number" style={s.inp} value={form.height} onChange={e=>set("height",e.target.value)} placeholder="169"/>
        </div>
        <div>
          <label style={s.lbl}>體重 (kg)</label>
          <input type="number" style={s.inp} value={form.weight} onChange={e=>set("weight",e.target.value)} placeholder="65.0" step="0.1"/>
        </div>
      </div>
      <hr style={s.divider}/>
      <label style={s.lbl}>日常活動量</label>
      <div style={{ marginBottom:24 }}>
        {ACTIVITY_LEVELS.map((lv, i) => (
          <div key={i} onClick={()=>set("activityLevel",i)} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:`0.5px solid ${C.line}`, cursor:"pointer" }}>
            <div style={{ width:16, height:16, borderRadius:"50%", border:`1px solid ${form.activityLevel===i?C.textMain:C.line}`, background:form.activityLevel===i?C.textMain:"transparent", flexShrink:0 }}/>
            <div>
              <div style={{ fontSize:13, color:C.textMain }}>{lv.label} <span style={{ fontSize:11, color:C.textSub }}>×{lv.factor}</span></div>
              <div style={{ fontSize:11, color:C.textSub }}>{lv.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <hr style={s.divider}/>
      <label style={s.lbl}>目標</label>
      <div style={{ display:"flex", gap:12, marginBottom:24 }}>
        <div style={s.goalChip(form.goal==="gain", C.bgDark)} onClick={()=>set("goal","gain")}>
          <span style={{ fontSize:18 }}>💪</span>
          <span style={{ fontSize:12, letterSpacing:"0.06em" }}>增肌</span>
          <span style={{ fontSize:10, opacity:0.7 }}>TDEE × 1.1</span>
        </div>
        <div style={s.goalChip(form.goal==="lose", C.accent)} onClick={()=>set("goal","lose")}>
          <span style={{ fontSize:18 }}>🔥</span>
          <span style={{ fontSize:12, letterSpacing:"0.06em" }}>減脂</span>
          <span style={{ fontSize:10, opacity:0.7 }}>TDEE × 0.8</span>
        </div>
      </div>
      {preview && (
        <div style={s.goalCard}>
          <div style={{ fontSize:10, letterSpacing:"0.16em", color:C.textSub, textTransform:"uppercase", marginBottom:14 }}>預覽計算結果</div>
          {[
            ["BMI", `${preview.bmi} · ${bmiLabel(preview.bmi)}`],
            ["基礎代謝率 BMR", `${preview.bmr} kcal`],
            ["每日總消耗 TDEE", `${preview.tdee} kcal`],
            [form.goal==="gain"?"增肌目標攝取":"減脂目標攝取", `${preview.target} kcal / 天`],
            ["蛋白質建議", `${Math.round(parseFloat(form.weight)*1.8)}–${Math.round(parseFloat(form.weight)*2.2)} g / 天`],
          ].map(([k,v])=>(
            <div key={k} style={s.goalRow}><span style={s.goalKey}>{k}</span><span style={s.goalVal}>{v}</span></div>
          ))}
        </div>
      )}
      <button style={{ ...s.btn, opacity: canCalc?1:0.4 }} onClick={()=>{ if(canCalc) onSave(form); }}>
        開始記錄 →
      </button>
    </div>
  );
}

// ── DASHBOARD ──
// ── 7-DAY MINI CHART ──
function MiniChart({ logs, dataKey, label, unit, color }) {
  const days = Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-6+i); return d.toISOString().slice(0,10); });
  const values = days.map(d => logs[d]?.[dataKey] ? parseFloat(logs[d][dataKey]) : null);
  const valid = values.filter(Boolean);
  if (!valid.length) return null;
  const minV = Math.min(...valid) - (Math.min(...valid)*0.01);
  const maxV = Math.max(...valid) + (Math.max(...valid)*0.01);
  const range = maxV - minV || 1;
  const today = getToday();
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:10, letterSpacing:"0.15em", color:C.textSub, textTransform:"uppercase", marginBottom:10 }}>{label}</div>
      <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:60 }}>
        {days.map((d,i)=>{ const v=values[i]; const pct=v?((v-minV)/range)*100:0; return (
          <div key={d} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2, height:"100%", justifyContent:"flex-end" }}>
            <span style={{ fontSize:8, color:C.textSub }}>{v?v.toFixed(1):""}</span>
            <div style={{ width:"100%", background:color||C.textMain, opacity:d===today?0.8:0.2, height:`${Math.max(pct,3)}%`, minHeight:2 }}/>
            <span style={{ fontSize:8, color:C.textSub }}>{d.slice(5)}</span>
          </div>
        ); })}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:C.line, marginTop:4 }}>
        <span>min {Math.min(...valid).toFixed(1)}{unit}</span>
        <span>max {Math.max(...valid).toFixed(1)}{unit}</span>
      </div>
    </div>
  );
}

function Dashboard({ profile, logs, onNav }) {
  const today = getToday(); const todayLog = logs[today];
  const getLatest = (key) => { const keys=Object.keys(logs).sort().reverse(); for(const k of keys){if(logs[k]?.[key]) return parseFloat(logs[k][key]);} return null; };
  const latestW = getLatest("weight") || parseFloat(profile.weight) || 0;
  const latestBF = getLatest("bodyfat");
  const latestLM = getLatest("leanMass");
  const bmr = calcBMR(latestW, parseFloat(profile.height), parseInt(profile.age), profile.gender);
  const factor = ACTIVITY_LEVELS[profile.activityLevel].factor;
  const tdee = calcTDEE(bmr, factor);
  const targetIntake = profile.goal==="gain" ? Math.round(tdee*1.1) : Math.round(tdee*0.8);
  const bmi = calcBMI(latestW, parseFloat(profile.height));
  const intake = todayLog?.totalIntake || 0;
  const burn = todayLog?.totalBurn || 0;
  const net = intake - (burn + bmr);
  const isGain = profile.goal === "gain";
  const goalMet = isGain ? intake >= targetIntake : intake <= targetIntake && intake > 0;
  const pctOfTarget = intake > 0 ? Math.round((intake/targetIntake)*100) : 0;

  return (
    <div style={s.main}>
      <p style={s.secTitle}>{profile.name ? profile.name + " · " : ""}今日概況</p>

      <div style={s.statsRow}>
        <div style={s.statCell}>
          <div style={s.statLabel}>體重</div>
          <div style={s.statVal}>{latestW.toFixed(1)}<span style={s.statUnit}>kg</span></div>
        </div>
        <div style={{...s.statCell, paddingLeft:12}}>
          <div style={s.statLabel}>體脂率</div>
          <div style={s.statVal}>{latestBF ? latestBF.toFixed(1) : "—"}<span style={s.statUnit}>{latestBF?"%":""}</span></div>
        </div>
        <div style={{...s.statCell, paddingLeft:12}}>
          <div style={s.statLabel}>肌肉量</div>
          <div style={s.statVal}>{latestLM ? latestLM.toFixed(1) : "—"}<span style={s.statUnit}>{latestLM?"kg":""}</span></div>
        </div>
      </div>
      <hr style={s.divider}/>

      <div style={s.targetBox(goalMet)}>
        <div style={{ fontSize:10, letterSpacing:"0.16em", color:goalMet?C.green:C.red, textTransform:"uppercase", marginBottom:8 }}>
          {isGain ? "增肌目標" : "減脂目標"} · {goalMet ? "✓ 達標" : "未達標"}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
          <span style={{ fontFamily:"'Cormorant Garamond','Noto Serif TC',serif", fontSize:32, fontWeight:300 }}>{intake || "—"}</span>
          <span style={{ fontSize:13, color:C.textSub }}>目標 {isGain ? "≥" : "≤"} {targetIntake} kcal</span>
        </div>
        <div style={{ height:2, background:C.line, marginTop:12, borderRadius:1 }}>
          <div style={{ height:2, background:goalMet?C.green:C.accent, width:`${Math.min(pctOfTarget,100)}%`, borderRadius:1, transition:"width 0.5s" }}/>
        </div>
        <div style={{ fontSize:10, color:C.textSub, marginTop:6 }}>{pctOfTarget}% 達標</div>
      </div>

      <div style={s.statsRow}>
        {[["攝取",intake||"—",intake?"kcal":""],["消耗",burn?burn+bmr:"—",burn?"kcal":""],["淨差",(intake||burn)?(net>0?"+":"")+net:"—",(intake||burn)?"kcal":""]].map(([l,v,u],i)=>(
          <div key={l} style={{...s.statCell,paddingLeft:i?12:0}}>
            <div style={s.statLabel}>{l}</div>
            <div style={s.statVal}>{v}{u&&<span style={s.statUnit}>{u}</span>}</div>
          </div>
        ))}
      </div>
      <hr style={s.divider}/>

      <div style={{ fontSize:11, letterSpacing:"0.12em", color:C.textSub, textTransform:"uppercase", marginBottom:18 }}>近七日趨勢</div>
      <MiniChart logs={logs} dataKey="weight" label="體重" unit="kg" />
      <MiniChart logs={logs} dataKey="bodyfat" label="體脂率" unit="%" color="#8B6B61" />
      <MiniChart logs={logs} dataKey="leanMass" label="肌肉量" unit="kg" color="#4A6741" />
      <hr style={s.divider}/>

      <div style={{ fontSize:11, letterSpacing:"0.12em", color:C.textSub, textTransform:"uppercase", marginBottom:18 }}>代謝數據</div>
      <div style={s.statsRow}>
        {[["BMR",bmr,"kcal"],["TDEE",tdee,"kcal"],["BMI",bmi,bmiLabel(bmi)]].map(([l,v,u],i)=>(
          <div key={l} style={{...s.statCell,paddingLeft:i?12:0}}>
            <div style={s.statLabel}>{l}</div>
            <div style={{ ...s.statVal, fontSize:i===2?18:26 }}>{v}<span style={{ fontSize:10, color:C.textSub, marginLeft:3 }}>{u}</span></div>
          </div>
        ))}
      </div>
      <hr style={s.divider}/>

      <div style={s.goalCard}>
        <div style={{ fontSize:10, letterSpacing:"0.18em", color:C.textSub, textTransform:"uppercase", marginBottom:14 }}>個人目標</div>
        {[
          ["目標", isGain ? "增肌 💪" : "減脂 🔥"],
          ["活動量", ACTIVITY_LEVELS[profile.activityLevel].label],
          ["每日目標攝取", `${isGain?"≥":"≤"} ${targetIntake} kcal`],
          ["蛋白質建議", `${Math.round(latestW*1.8)}–${Math.round(latestW*2.2)} g / 天`],
        ].map(([k,v])=>(
          <div key={k} style={s.goalRow}><span style={s.goalKey}>{k}</span><span style={s.goalVal}>{v}</span></div>
        ))}
      </div>
      <button style={s.btn} onClick={()=>onNav("log")}>記錄今日 →</button>
      <button style={{ ...s.btn, background:"transparent", color:C.textMain, border:`0.5px solid ${C.textMain}`, marginTop:8 }} onClick={()=>onNav("profile")}>修改個人資料</button>
      <button style={{ ...s.btn, background:"transparent", color:C.textMain, border:`0.5px solid ${C.textMain}`, marginTop:8 }} onClick={()=>onNav("import")}>匯入 Apple 健康資料</button>
    </div>
  );
}

// ── LOG ──
function LogView({ profile, logs, onSave, showToast }) {
  const [date,setDate]=useState(getToday());
  const [weight,setWeight]=useState(""); const [bodyfat,setBodyfat]=useState(""); const [notes,setNotes]=useState("");
  const [foods,setFoods]=useState([]); const [workouts,setWorkouts]=useState([]);
  const [foodName,setFoodName]=useState(""); const [foodCal,setFoodCal]=useState("");
  const [foodSearch,setFoodSearch]=useState(""); const [suggestions,setSuggestions]=useState([]);
  const [wType,setWType]=useState(""); const [wMin,setWMin]=useState(""); const [wSets,setWSets]=useState(""); const [wCustom,setWCustom]=useState("");

  const loadDate = useCallback((d)=>{ const log=logs[d]||{}; setWeight(log.weight||""); setBodyfat(log.bodyfat||""); setNotes(log.notes||""); setFoods(log.foods||[]); setWorkouts(log.workouts||[]); },[logs]);
  useEffect(()=>{ loadDate(date); },[date,loadDate]);

  const handleFoodSearch=(q)=>{ setFoodSearch(q); if(!q.trim()){setSuggestions([]);return;} setSuggestions(FOOD_DB.filter(f=>f.n.toLowerCase().includes(q.toLowerCase())).slice(0,6)); };
  const selectFood=(f)=>{ setFoodName(f.n); setFoodCal(String(f.c)); setFoodSearch(""); setSuggestions([]); };
  const addFood=()=>{ if(!foodName||!foodCal){showToast("請輸入食物名稱與大卡");return;} setFoods(p=>[...p,{name:foodName,cal:parseInt(foodCal)}]); setFoodName(""); setFoodCal(""); setFoodSearch(""); };
  const addWorkout=()=>{
    if(!wType){showToast("請選擇運動項目");return;} if(!wMin){showToast("請輸入時間");return;}
    const found=WORKOUT_TYPES.find(t=>t.label===wType); const met=found?.met||4;
    const curW=parseFloat(weight)||parseFloat(profile.weight)||65;
    const burn=Math.round(met*curW*(parseInt(wMin)/60)*1.05);
    const name=wType==="自訂"?wCustom||"自訂運動":wType;
    setWorkouts(p=>[...p,{name,min:parseInt(wMin),sets:wSets||null,burn}]);
    setWType(""); setWMin(""); setWSets(""); setWCustom("");
  };

  const bmr = weight ? calcBMR(parseFloat(weight), parseFloat(profile.height), parseInt(profile.age), profile.gender) : 0;
  const factor = ACTIVITY_LEVELS[profile.activityLevel].factor;
  const tdee = bmr ? calcTDEE(bmr, factor) : 0;
  const targetIntake = tdee ? (profile.goal==="gain" ? Math.round(tdee*1.1) : Math.round(tdee*0.8)) : 0;
  const totalIntake=foods.reduce((s,f)=>s+f.cal,0);
  const totalBurn=workouts.reduce((s,w)=>s+w.burn,0);
  const isGain = profile.goal === "gain";
  const goalMet = totalIntake > 0 && (isGain ? totalIntake >= targetIntake : totalIntake <= targetIntake);

  const save=()=>{
    if(!date){showToast("請選擇日期");return;} if(!weight){showToast("請輸入今日體重");return;}
    const w=parseFloat(weight); const bmrVal=calcBMR(w,parseFloat(profile.height),parseInt(profile.age),profile.gender);
    onSave(date,{date,weight:w,bodyfat:bodyfat?parseFloat(bodyfat):null,foods,workouts,totalIntake,totalBurn,bmrBurn:bmrVal,netBalance:totalIntake-(totalBurn+bmrVal),notes,savedAt:new Date().toISOString()});
    showToast("記錄已儲存 ✓");
  };

  return (
    <div style={s.main}>
      <p style={s.secTitle}>每日記錄</p>
      <div style={{ marginBottom:24 }}><label style={s.lbl}>日期</label><input type="date" style={s.inp} value={date} onChange={e=>{setDate(e.target.value);loadDate(e.target.value);}}/></div>
      <div style={{ marginBottom:24 }}><label style={s.lbl}>今日體重 (kg)</label><input type="number" style={s.inp} value={weight} onChange={e=>setWeight(e.target.value)} placeholder={profile.weight||"65.0"} step="0.1"/></div>
      <div style={{ marginBottom:24 }}><label style={s.lbl}>體脂率 % (選填)</label><input type="number" style={s.inp} value={bodyfat} onChange={e=>setBodyfat(e.target.value)} placeholder="18.0" step="0.1"/></div>

      {weight && tdee > 0 && (
        <div style={s.targetBox(goalMet)}>
          <div style={{ fontSize:10, letterSpacing:"0.14em", color:goalMet?C.green:C.red, textTransform:"uppercase", marginBottom:6 }}>{isGain?"增肌目標":"減脂目標"} · 今日攝取 {totalIntake} kcal</div>
          <div style={{ fontSize:12, color:C.textSub }}>目標 {isGain?"≥":"≤"} <strong>{targetIntake}</strong> kcal（TDEE {tdee} × {isGain?"1.1":"0.8"}）</div>
        </div>
      )}
      <hr style={s.divider}/>

      <div style={{ fontSize:10, letterSpacing:"0.18em", color:C.textSub, textTransform:"uppercase", marginBottom:20 }}>飲食記錄</div>
      <AIFoodEstimator onResult={(r)=>setFoods(p=>[...p,...r.items.map(i=>({name:`${i.name}（${i.portion}）`,cal:i.calories}))])} showToast={showToast}/>

      <div style={{ position:"relative", marginBottom:20 }}>
        <label style={s.lbl}>搜尋或手動輸入食物</label>
        <input type="text" style={s.inp} value={foodSearch} onChange={e=>handleFoodSearch(e.target.value)} placeholder="輸入食物名稱…"/>
        {suggestions.length>0 && (
          <div style={{ position:"absolute", top:"100%", left:0, right:0, background:C.bgLight, border:`0.5px solid ${C.line}`, zIndex:50, maxHeight:200, overflowY:"auto" }}>
            {suggestions.map(f=>(<div key={f.n} onClick={()=>selectFood(f)} style={{ display:"flex", justifyContent:"space-between", padding:"10px 14px", fontSize:13, borderBottom:`0.5px solid ${C.line}`, cursor:"pointer" }}><span>{f.n}</span><span style={{ fontSize:11, color:C.textSub }}>{f.c} kcal</span></div>))}
          </div>
        )}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
        <div><label style={s.lbl}>食物名稱</label><input type="text" style={s.inp} value={foodName} onChange={e=>setFoodName(e.target.value)} placeholder="自訂名稱"/></div>
        <div><label style={s.lbl}>大卡</label><input type="number" style={s.inp} value={foodCal} onChange={e=>setFoodCal(e.target.value)} placeholder="300"/></div>
      </div>
      <button style={s.btnSm} onClick={addFood}>+ 加入飲食</button>
      <div style={{ marginTop:16 }}>
        {foods.map((f,i)=>(<div key={i} style={s.listRow}><span style={{ flex:1, paddingRight:8, fontSize:12 }}>{f.name}</span><span style={{ display:"flex", alignItems:"center", gap:8 }}><span style={{ fontSize:12, color:C.textSub }}>{f.cal} kcal</span><button style={s.removeBtn} onClick={()=>setFoods(p=>p.filter((_,j)=>j!==i))}>×</button></span></div>))}
        {foods.length>0&&(<div style={{ display:"flex", justifyContent:"space-between", padding:"12px 0 0", fontSize:11, color:C.textSub, textTransform:"uppercase", letterSpacing:"0.1em" }}><span>今日攝取</span><span style={{ fontFamily:"'Cormorant Garamond','Noto Serif TC',serif", fontSize:20, color:C.textMain }}>{totalIntake} kcal</span></div>)}
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
      {wType==="自訂"&&<div style={{ marginBottom:16 }}><label style={s.lbl}>自訂名稱</label><input type="text" style={s.inp} value={wCustom} onChange={e=>setWCustom(e.target.value)} placeholder="運動名稱"/></div>}
      <button style={s.btnSm} onClick={addWorkout}>+ 加入運動</button>
      <div style={{ marginTop:16 }}>
        {workouts.map((w,i)=>(<div key={i} style={s.listRow}><div><div style={{ fontSize:13 }}>{w.name}</div><div style={{ fontSize:11, color:C.textSub }}>{w.min}分鐘{w.sets?` · ${w.sets}組`:""}</div></div><span style={{ display:"flex", alignItems:"center", gap:8 }}><span style={{ fontSize:12, color:C.textSub }}>{w.burn} kcal</span><button style={s.removeBtn} onClick={()=>setWorkouts(p=>p.filter((_,j)=>j!==i))}>×</button></span></div>))}
        {workouts.length>0&&(<div style={{ display:"flex", justifyContent:"space-between", padding:"12px 0 0", fontSize:11, color:C.textSub, textTransform:"uppercase", letterSpacing:"0.1em" }}><span>運動消耗</span><span style={{ fontFamily:"'Cormorant Garamond','Noto Serif TC',serif", fontSize:20, color:C.textMain }}>{totalBurn} kcal</span></div>)}
      </div>

      <hr style={s.divider}/>
      <div style={{ marginBottom:24 }}><label style={s.lbl}>備註</label><textarea style={s.textarea} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="今日身體狀況、睡眠、心情…"/></div>
      <button style={s.btn} onClick={save}>儲存今日記錄</button>
    </div>
  );
}

// ── HISTORY ──
function HistoryView({ profile, logs }) {
  const keys=Object.keys(logs).sort().reverse();
  if(!keys.length) return <div style={s.main}><p style={s.secTitle}>歷史記錄</p><div style={s.emptyState}><div style={s.emptyTitle}>尚無記錄</div><div style={s.emptySub}>從「記錄」頁面開始你的第一筆日誌</div></div></div>;
  const h=parseFloat(profile.height), a=parseInt(profile.age), g=profile.gender;
  const factor=ACTIVITY_LEVELS[profile.activityLevel].factor;
  return (
    <div style={s.main}>
      <p style={s.secTitle}>歷史記錄</p>
      {keys.map(k=>{ const l=logs[k]; const net=l.netBalance||0;
        const w=l.weight; const bmr=w?calcBMR(w,h,a,g):0; const tdee=bmr?calcTDEE(bmr,factor):0;
        const target=tdee?(profile.goal==="gain"?Math.round(tdee*1.1):Math.round(tdee*0.8)):0;
        const goalMet=l.totalIntake>0&&target&&(profile.goal==="gain"?l.totalIntake>=target:l.totalIntake<=target);
        return (
          <div key={k} style={s.logCard}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <div style={s.logDate}>{formatDate(k)}</div>
              {target>0&&<div style={{ fontSize:10, color:goalMet?C.green:C.accent, letterSpacing:"0.08em" }}>{goalMet?"✓ 達標":"未達標"}</div>}
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
              <span style={s.logWeight}>{l.weight}<span style={{ fontSize:14, color:C.textSub }}> kg</span></span>
              <span style={{ fontSize:13, color:net>300?C.accent:C.bgDark }}>{net>0?"+":""}{net} kcal</span>
            </div>
            <div style={s.logMeta}>
              <span>攝取 {l.totalIntake||0} kcal</span>
              {target>0&&<span>目標 {profile.goal==="gain"?"≥":"≤"}{target} kcal</span>}
              {l.bodyfat&&<span>體脂 {l.bodyfat}%</span>}
              {l.bmi&&<span>BMI {l.bmi}</span>}
              {l.workouts?.length>0&&<span>{l.workouts.map(w=>w.name).join("、")}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── WEEKLY ──
function WeeklyView({ profile, logs }) {
  const weeks=[...new Set(Object.keys(logs).map(getWeekKey))].sort().reverse();
  const [sel,setSel]=useState(weeks[0]||null);
  useEffect(()=>{ if(weeks.length&&!sel)setSel(weeks[0]); },[weeks]);
  if(!weeks.length) return <div style={s.main}><p style={s.secTitle}>每週報告</p><div style={s.emptyState}><div style={s.emptyTitle}>尚無資料</div></div></div>;
  const days=sel?Array.from({length:7},(_,i)=>{ const d=new Date(sel+"T00:00:00"); d.setDate(d.getDate()+i); return d.toISOString().slice(0,10); }):[];
  const weekLogs=days.map(d=>logs[d]).filter(Boolean);
  const avgW=avg(weekLogs.map(l=>l.weight)), avgI=avg(weekLogs.map(l=>l.totalIntake||0)), avgB=avg(weekLogs.map(l=>(l.totalBurn||0)+(l.bmrBurn||0))), avgNet=Math.round(avgI-avgB);
  const totalBurn=weekLogs.reduce((s,l)=>s+(l.totalBurn||0),0), wDays=weekLogs.filter(l=>l.workouts?.length).length;
  const wChange=weekLogs.length>1?weekLogs[weekLogs.length-1].weight-weekLogs[0].weight:0;
  const factor=ACTIVITY_LEVELS[profile.activityLevel].factor;
  const avgBMR=avgW?calcBMR(avgW,parseFloat(profile.height),parseInt(profile.age),profile.gender):0;
  const avgTDEE=avgBMR?calcTDEE(avgBMR,factor):0;
  const target=avgTDEE?(profile.goal==="gain"?Math.round(avgTDEE*1.1):Math.round(avgTDEE*0.8)):0;
  const goalDays=weekLogs.filter(l=>{ if(!l.totalIntake||!target)return false; return profile.goal==="gain"?l.totalIntake>=target:l.totalIntake<=target; }).length;
  const weekEnd=sel?(()=>{ const e=new Date(sel+"T00:00:00"); e.setDate(e.getDate()+6); return e.toISOString().slice(0,10); })():"";
  return (
    <div style={s.main}>
      <p style={s.secTitle}>每週報告</p>
      <div style={s.periodBtns}>{weeks.map(w=>{ const e=new Date(w+"T00:00:00"); e.setDate(e.getDate()+6); return <button key={w} style={s.periodBtn(sel===w)} onClick={()=>setSel(w)}>{w.slice(5)}—{e.toISOString().slice(5,10)}</button>; })}</div>
      {weekLogs.length===0?<div style={{ ...s.emptySub, textAlign:"left" }}>本週尚無記錄</div>:<>
        <div style={s.reportTitle}>{sel?.slice(5)} —<br/>{weekEnd.slice(5)}</div>
        <div style={{ ...s.reportSub, marginBottom:28 }}>每週報告 · {weekLogs.length} 天記錄</div>
        {target>0&&<div style={s.targetBox(goalDays>=4)}>
          <div style={{ fontSize:10, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:6, color:goalDays>=4?C.green:C.red }}>{profile.goal==="gain"?"增肌":"減脂"}目標達標 {goalDays}/{weekLogs.length} 天</div>
          <div style={{ fontSize:12, color:C.textSub }}>每日目標 {profile.goal==="gain"?"≥":"≤"} {target} kcal · 均攝取 {Math.round(avgI)} kcal</div>
        </div>}
        {[["體重數據",[["均值",avgW.toFixed(1),"kg"],["變化",(wChange>0?"+":"")+wChange.toFixed(1),"kg"],["記錄",weekLogs.length+" 天",""]]],["熱量數據",[["均攝取",Math.round(avgI),"kcal"],["均消耗",Math.round(avgB),"kcal"],["均淨差",(avgNet>0?"+":"")+avgNet,"kcal"]]],["訓練數據",[["訓練天數",wDays,"天"],["總消耗",totalBurn,"kcal"],["TDEE",avgTDEE||"—","kcal"]]]].map(([title,cells])=>(
          <div key={title}>
            <div style={{ fontSize:10, letterSpacing:"0.18em", color:C.textSub, textTransform:"uppercase", marginBottom:14, paddingBottom:10, borderBottom:`0.5px solid ${C.line}` }}>{title}</div>
            <div style={s.statsRow}>{cells.map(([l,v,u],i)=><div key={l} style={{...s.statCell,paddingLeft:i?12:0}}><div style={s.statLabel}>{l}</div><div style={s.statVal}>{v}{u&&<span style={s.statUnit}>{u}</span>}</div></div>)}</div>
            <hr style={s.divider}/>
          </div>
        ))}
        <div style={s.insightText}>{avgNet<-200?`✓ 本週熱量赤字 ${Math.abs(avgNet)} kcal/天，減脂方向正確。`:avgNet>300?`本週熱量盈餘 +${avgNet} kcal/天，${profile.goal==="gain"?"增肌狀態良好。":"注意飲食控制。"}`:`本週熱量接近平衡。`}</div>
      </>}
    </div>
  );
}

// ── MONTHLY ──
function MonthlyView({ profile, logs }) {
  const months=[...new Set(Object.keys(logs).map(k=>k.slice(0,7)))].sort().reverse();
  const [sel,setSel]=useState(months[0]||null);
  useEffect(()=>{ if(months.length&&!sel)setSel(months[0]); },[months]);
  if(!months.length) return <div style={s.main}><p style={s.secTitle}>每月報告</p><div style={s.emptyState}><div style={s.emptyTitle}>尚無資料</div></div></div>;
  const mLogs=Object.entries(logs).filter(([k])=>k.startsWith(sel)).map(([,v])=>v);
  const avgW=avg(mLogs.map(l=>l.weight)), avgI=avg(mLogs.map(l=>l.totalIntake||0)), avgB=avg(mLogs.map(l=>(l.totalBurn||0)+(l.bmrBurn||0))), avgNet=Math.round(avgI-avgB);
  const wDays=mLogs.filter(l=>l.workouts?.length).length, wChange=mLogs.length>1?mLogs[mLogs.length-1].weight-mLogs[0].weight:0;
  const factor=ACTIVITY_LEVELS[profile.activityLevel].factor;
  const avgBMR=avgW?calcBMR(avgW,parseFloat(profile.height),parseInt(profile.age),profile.gender):0;
  const avgTDEE=avgBMR?calcTDEE(avgBMR,factor):0;
  const target=avgTDEE?(profile.goal==="gain"?Math.round(avgTDEE*1.1):Math.round(avgTDEE*0.8)):0;
  const goalDays=mLogs.filter(l=>{ if(!l.totalIntake||!target)return false; return profile.goal==="gain"?l.totalIntake>=target:l.totalIntake<=target; }).length;
  return (
    <div style={s.main}>
      <p style={s.secTitle}>每月報告</p>
      <div style={s.periodBtns}>{months.map(m=><button key={m} style={s.periodBtn(sel===m)} onClick={()=>setSel(m)}>{m}</button>)}</div>
      {mLogs.length===0?<div style={{ ...s.emptySub, textAlign:"left" }}>本月尚無記錄</div>:<>
        <div style={s.reportTitle}>{sel}</div>
        <div style={{ ...s.reportSub, marginBottom:28 }}>月度報告 · {mLogs.length} 天記錄</div>
        {target>0&&<div style={s.targetBox(goalDays/mLogs.length>=0.7)}>
          <div style={{ fontSize:10, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:6, color:goalDays/mLogs.length>=0.7?C.green:C.red }}>{profile.goal==="gain"?"增肌":"減脂"}目標達標 {goalDays}/{mLogs.length} 天</div>
          <div style={{ fontSize:12, color:C.textSub }}>每日目標 {profile.goal==="gain"?"≥":"≤"} {target} kcal</div>
        </div>}
        <div style={s.statsRow}>
          {[["均重",avgW.toFixed(1),"kg"],["體重變化",(wChange>0?"+":"")+wChange.toFixed(1),"kg"],["訓練",wDays,"天"]].map(([l,v,u],i)=>(
            <div key={l} style={{...s.statCell,paddingLeft:i?12:0}}><div style={s.statLabel}>{l}</div><div style={s.statVal}>{v}<span style={s.statUnit}>{u}</span></div></div>
          ))}
        </div>
        <hr style={s.divider}/>
        <div style={s.statsRow}>
          {[["均攝取",Math.round(avgI),"kcal"],["均消耗",Math.round(avgB),"kcal"],["均淨差",(avgNet>0?"+":"")+avgNet,"kcal"]].map(([l,v,u],i)=>(
            <div key={l} style={{...s.statCell,paddingLeft:i?12:0}}><div style={s.statLabel}>{l}</div><div style={s.statVal}>{v}<span style={s.statUnit}>{u}</span></div></div>
          ))}
        </div>
        <hr style={s.divider}/>
        <div style={s.insightText}>{wChange<-1?`✓ 本月體重下降 ${Math.abs(wChange).toFixed(1)} kg。`:wChange>0.5?`本月體重上升 ${wChange.toFixed(1)} kg。`:`本月體重穩定。`}</div>
      </>}
    </div>
  );
}

// ── APPLE HEALTH IMPORT ──
function loadJSZip() {
  return new Promise((resolve, reject) => {
    if (window.JSZip) { resolve(window.JSZip); return; }
    const sc = document.createElement('script');
    sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    sc.onload = () => resolve(window.JSZip); sc.onerror = reject;
    document.head.appendChild(sc);
  });
}
function parseHealthXML(xml) {
  const results = {};
  const regs = [
    [/HKQuantityTypeIdentifierBodyMass/, "weight", v=>parseFloat(v)],
    [/HKQuantityTypeIdentifierBodyFatPercentage/, "bodyfat", v=>Math.round(parseFloat(v)*100*10)/10],
    [/HKQuantityTypeIdentifierLeanBodyMass/, "leanMass", v=>parseFloat(v)],
    [/HKQuantityTypeIdentifierBodyMassIndex/, "bmi", v=>Math.round(parseFloat(v)*10)/10],
  ];
  regs.forEach(([typeReg, key, parse]) => {
    const reg = new RegExp(`<Record[^>]*type="${typeReg.source}"[^>]*startDate="(\\d{4}-\\d{2}-\\d{2})[^"]*"[^>]*value="([\\d.]+)"[^>]*\\/?>`, 'g');
    let m;
    while ((m = reg.exec(xml)) !== null) {
      const [,date,val] = m;
      if (!results[date]) results[date] = {};
      if (!results[date][key]) results[date][key] = parse(val);
    }
  });
  return results;
}
function ImportView({ logs, onImport, onNav, showToast }) {
  const [status,setStatus]=useState(""); const [preview,setPreview]=useState(null); const [parsed,setParsed]=useState(null);
  const fileRef=useRef();
  const handleFile=async(file)=>{
    setStatus("讀取中…"); setParsed(null); setPreview(null);
    try {
      let xmlText="";
      if(file.name.endsWith(".zip")){
        setStatus("解壓縮中…");
        const JSZip=await loadJSZip(); const zip=await JSZip.loadAsync(file);
        const allFiles=Object.keys(zip.files);
        const xmlEntry=allFiles.find(f=>(f.toLowerCase().endsWith("export.xml")||f.endsWith("輸出.xml"))&&!zip.files[f].dir);
        if(!xmlEntry) throw new Error("找不到 export.xml，ZIP 內容："+allFiles.slice(0,10).join(", "));
        setStatus("讀取 XML 中（可能需要一點時間）…");
        xmlText=await zip.files[xmlEntry].async("string");
      } else { xmlText=await file.text(); }
      setStatus("解析資料中…");
      const data=parseHealthXML(xmlText);
      const dates=Object.keys(data).sort();
      if(!dates.length) throw new Error("未找到體重資料");
      setParsed(data);
      setPreview({ count:dates.length, from:dates[0], to:dates[dates.length-1], sample:data[dates[dates.length-1]] });
      setStatus("");
    } catch(e) { setStatus("⚠ "+e.message); }
  };
  const doImport=()=>{
    if(!parsed)return;
    const newLogs={...logs}; let imported=0;
    Object.entries(parsed).forEach(([date,vals])=>{
      if(!newLogs[date]) newLogs[date]={date,foods:[],workouts:[],totalIntake:0,totalBurn:0};
      if(vals.weight&&!newLogs[date].weight){newLogs[date].weight=vals.weight; imported++;}
      if(vals.bodyfat) newLogs[date].bodyfat=vals.bodyfat;
      if(vals.leanMass) newLogs[date].leanMass=vals.leanMass;
      if(vals.bmi) newLogs[date].bmi=vals.bmi;
    });
    onImport(newLogs);
    showToast(`匯入 ${imported} 筆記錄 ✓`);
    onNav("dashboard");
  };
  return (
    <div style={s.main}>
      <p style={s.secTitle}>匯入 Apple 健康資料</p>
      <div style={{ fontSize:12, color:C.textSub, lineHeight:1.9, marginBottom:20 }}>iPhone「健康」→「個人資料」→ 右上角 ⋯ →「匯出所有健康資料」→ 上傳 ZIP</div>
      <div style={s.photoZone} onClick={()=>fileRef.current?.click()}>
        <input ref={fileRef} type="file" accept=".zip,.xml" style={{ display:"none" }} onChange={e=>{ if(e.target.files[0]) handleFile(e.target.files[0]); e.target.value=""; }}/>
        <div style={{ fontSize:24, marginBottom:6 }}>📁</div>
        <div style={{ fontSize:11, color:C.textSub, letterSpacing:"0.1em", textTransform:"uppercase" }}>點擊上傳 ZIP 或 XML</div>
      </div>
      {status&&<div style={{ fontSize:12, color:status.startsWith("⚠")?C.accent:C.textSub, marginBottom:16, lineHeight:1.7 }}>{status}</div>}
      {preview&&(<div style={s.goalCard}>
        <div style={{ fontSize:10, letterSpacing:"0.16em", color:C.textSub, textTransform:"uppercase", marginBottom:12 }}>解析結果預覽</div>
        {[["筆數",`${preview.count} 天`],["時間範圍",`${preview.from} ～ ${preview.to}`],["最新體重",preview.sample?.weight?`${preview.sample.weight} kg`:"無"],["最新體脂",preview.sample?.bodyfat?`${preview.sample.bodyfat}%`:"無"],["最新 BMI",preview.sample?.bmi?`${preview.sample.bmi}`:"無"],["最新肌肉量",preview.sample?.leanMass?`${preview.sample.leanMass.toFixed(1)} kg`:"無"]].map(([k,v])=>(
          <div key={k} style={s.goalRow}><span style={s.goalKey}>{k}</span><span style={s.goalVal}>{v}</span></div>
        ))}
        <button style={{ ...s.btn, marginTop:16 }} onClick={doImport}>確認匯入</button>
      </div>)}
      <button style={{ ...s.btnGhost, marginTop:16 }} onClick={()=>onNav("dashboard")}>← 返回</button>
    </div>
  );
}

// ── EXPORT / IMPORT DATA ──
function exportData(logs, profile) {
  const data = JSON.stringify({ profile, logs, exportedAt: new Date().toISOString() }, null, 2);
  const blob = new Blob([data], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `bcd-fitness-backup-${getToday()}.json`;
  a.click(); URL.revokeObjectURL(url);
}

// ── ICONS ──
const Icon = {
  dashboard: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  log: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  history: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  weekly: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  monthly: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>,
};
const TABS=[{id:"dashboard",label:"今日",icon:Icon.dashboard},{id:"log",label:"記錄",icon:Icon.log},{id:"history",label:"歷史",icon:Icon.history},{id:"weekly",label:"週報",icon:Icon.weekly},{id:"monthly",label:"月報",icon:Icon.monthly}];

// ── ROOT ──
export default function App() {
  const [tab,setTab]=useState("dashboard");
  const [logs,setLogs]=useState({});
  const [profile,setProfile]=useState(null);
  const [toast,setToast]=useState("");
  const [loading,setLoading]=useState(true);
  const deviceId = useRef(getDeviceId());

  useEffect(()=>{
    const init = async () => {
      setLoading(true);
      try {
        const p = await loadProfile(deviceId.current);
        if (p) {
          setProfile(p);
          const l = await loadLogs(deviceId.current);
          setLogs(l);
        }
      } catch(e) { console.error("init error", e); }
      setLoading(false);
    };
    init();
  }, []);

  const showToast=(msg)=>{ setToast(msg); setTimeout(()=>setToast(""),2500); };

  const handleSaveLog=async(date,entry)=>{
    setLogs(p=>({...p,[date]:entry}));
    setTimeout(()=>setTab("dashboard"),600);
    try { await saveLog(deviceId.current, date, entry); } catch(e) { showToast("⚠ 儲存失敗，請檢查網路"); }
  };

  const handleSaveProfile=async(p)=>{
    setProfile(p);
    setTab("dashboard");
    try { await saveProfile(deviceId.current, p); showToast("個人資料已儲存 ✓"); } catch(e) { showToast("⚠ 儲存失敗，請檢查網路"); }
  };

  const importLogs=async(newLogs)=>{
    setLogs(newLogs);
    showToast("匯入中，請稍候…");
    try { await saveAllLogs(deviceId.current, newLogs); showToast("匯入完成 ✓"); } catch(e) { showToast("⚠ 匯入失敗，請檢查網路"); }
  };

  const noNav = tab==="import" || tab==="profile" || !profile;

  if (loading) {
    return (
      <div style={{ ...s.app, display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontFamily:"'Cormorant Garamond','Noto Serif TC',serif", fontSize:28, fontWeight:300, color:C.textMain, marginBottom:12 }}>身形日誌</div>
          <div style={{ fontSize:11, color:C.textSub, letterSpacing:"0.14em" }}>載入中…</div>
        </div>
      </div>
    );
  }

  if (!profile || tab==="profile") {
    return (
      <div style={s.app}>
        <div style={s.header}><span style={s.brand}>身形日誌</span></div>
        <ProfileSetup onSave={handleSaveProfile}/>
        <Toast msg={toast}/>
      </div>
    );
  }

  return (
    <div style={s.app}>
      <div style={s.header}>
        <span style={s.brand}>身形日誌</span>
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          <button style={{ background:"none", border:"none", fontSize:10, color:C.textSub, cursor:"pointer", letterSpacing:"0.1em", fontFamily:"inherit" }} onClick={()=>exportData(logs,profile)}>備份</button>
          <span style={{ fontSize:10, color:C.textSub, letterSpacing:"0.12em" }}>bcd fitness</span>
        </div>
      </div>
      {tab==="dashboard"&&<Dashboard profile={profile} logs={logs} onNav={setTab}/>}
      {tab==="log"&&<LogView profile={profile} logs={logs} onSave={handleSaveLog} showToast={showToast}/>}
      {tab==="history"&&<HistoryView profile={profile} logs={logs}/>}
      {tab==="weekly"&&<WeeklyView profile={profile} logs={logs}/>}
      {tab==="monthly"&&<MonthlyView profile={profile} logs={logs}/>}
      {tab==="import"&&<ImportView logs={logs} onImport={importLogs} onNav={setTab} showToast={showToast}/>}
      {!noNav&&<nav style={s.bottomNav}>{TABS.map(t=>(<button key={t.id} style={s.bottomTab(tab===t.id)} onClick={()=>setTab(t.id)}>{t.icon}{t.label}</button>))}</nav>}
      <Toast msg={toast}/>
    </div>
  );
}
