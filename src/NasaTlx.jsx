import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";

// 🔥 FIREBASE CONFIG — ganti dengan config milik Anda
const firebaseConfig = {
  apiKey: "AIzaSyBJ8Bpgn1LTCXW8W9Px7JYxiwckeztrUkc",
  authDomain: "nasa-tlx-diy.firebaseapp.com",
  projectId: "nasa-tlx-diy",
  storageBucket: "nasa-tlx-diy.firebasestorage.app",
  messagingSenderId: "336952540129",
  appId: "1:336952540129:web:3005cfce9a3b33ebd7f0a0",
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

function getCategory(s) {
  if (s <= 20) return { label: "Sangat Rendah", color: "#22c55e" };
  if (s <= 40) return { label: "Rendah",        color: "#3b82f6" };
  if (s <= 60) return { label: "Sedang",        color: "#f59e0b" };
  if (s <= 80) return { label: "Tinggi",        color: "#f97316" };
  return           { label: "Sangat Tinggi",  color: "#ef4444" };
}

const DIMENSIONS = [
  { id: "MD", label: "Tuntutan Mental",       desc: "Seberapa berat pikiran Anda saat mengerjakan tugas ini? Apakah Anda merasa harus berpikir keras, berkonsentrasi penuh, atau terus mengambil keputusan?" },
  { id: "PD", label: "Tuntutan Fisik",        desc: "Seberapa banyak tenaga fisik yang Anda keluarkan? Misalnya banyak bergerak, berdiri lama, atau melakukan pekerjaan yang menguras energi tubuh." },
  { id: "TD", label: "Tekanan Waktu",         desc: "Apakah Anda merasa dikejar waktu? Seberapa sering Anda merasa deadline terlalu mepet atau ritme kerja terlalu cepat untuk diikuti?" },
  { id: "OP", label: "Capaian Kerja",         desc: "Seberapa puas Anda dengan hasil kerja Anda? Apakah Anda merasa berhasil menyelesaikan tugas sesuai yang diharapkan?" },
  { id: "EF", label: "Usaha yang Dikeluarkan", desc: "Seberapa besar usaha, baik fisik maupun mental, yang harus Anda keluarkan agar pekerjaan ini bisa selesai dengan baik?" },
  { id: "FR", label: "Tingkat Frustrasi",     desc: "Apakah Anda merasa stres, kesal, atau tidak nyaman selama bekerja? Seberapa sering gangguan atau hambatan membuat Anda merasa frustrasi?" },
];

const PANGKAT_LIST = ["Direktur Eksekutif","Direktur","Deputi Direktur","Asisten Direktur","Manajer","Asisten Manajer","Staf","Pelaksana"];
const UNIT_LIST    = ["Kepala Perwakilan","Deputi Kepala Perwakilan","TPKP","FDSEK","FPPUKIS","Unit Kehumasan","PUR","FIKSP","FIPSP","Logistik dan Pengamanan","SDM","Unit Keuangan","TIK","TMI","TIKSPUR"];

const PAIRS = (() => {
  const p = [];
  for (let i = 0; i < DIMENSIONS.length; i++)
    for (let j = i + 1; j < DIMENSIONS.length; j++)
      p.push([DIMENSIONS[i], DIMENSIONS[j]]);
  return p;
})();

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function computeScore(ratings, weights) {
  let total = 0, wSum = 0;
  DIMENSIONS.forEach(d => {
    total += (ratings[d.id] || 0) * (weights[d.id] || 0);
    wSum  += (weights[d.id] || 0);
  });
  return wSum > 0 ? total / wSum : 0;
}



const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const YEARS  = [2026,2027,2028,2029,2030];
const NOW_MONTH = MONTHS[new Date().getMonth()];
const NOW_YEAR  = String(new Date().getFullYear());

const NASA_FACTS = [
  "NASA-TLX dikembangkan oleh Sandra Hart dan Lowell Staveland di NASA Ames Research Center pada tahun 1988, dan sudah digunakan selama lebih dari 35 tahun di seluruh dunia.",
  "NASA-TLX mengukur beban kerja dari 6 dimensi berbeda karena beban kerja bukan hanya soal seberapa capek fisik Anda, tapi juga mental, waktu, dan emosi.",
  "Hasil NASA-TLX bersifat sangat personal. Dua orang dengan tugas yang sama bisa memiliki skor yang sangat berbeda, karena persepsi tiap individu itu unik.",
  "Pairwise comparison dalam NASA-TLX memastikan bobot setiap dimensi mencerminkan prioritas Anda sendiri, bukan asumsi peneliti.",
  "NASA-TLX telah digunakan di lebih dari 550 studi ilmiah di berbagai bidang: penerbangan, medis, militer, hingga perkantoran.",
];
const funFact = NASA_FACTS[Math.floor(Math.random() * NASA_FACTS.length)];

// ══════════════════════════════════════════════════════════════════════════
// TAMPILAN: gaya global, maskot, ikon dimensi, komponen kecil
// ══════════════════════════════════════════════════════════════════════════
const FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const GLOBAL_CSS = `
.fd { letter-spacing: -0.01em; }
@keyframes tlxIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
@keyframes tlxFade { from { opacity: 0; transform: scale(.94) } to { opacity: 1; transform: scale(1) } }
@keyframes tlxGauge { from { stroke-dashoffset: 440 } }
@keyframes tlxBlink { 0%, 94%, 100% { transform: scaleY(1) } 97% { transform: scaleY(.12) } }
@keyframes tlxFall { 0% { transform: translateY(-20px) rotate(0); opacity: 0 } 10% { opacity: 1 } 100% { transform: translateY(420px) rotate(260deg); opacity: 0 } }
.tlx-up { animation: tlxIn .35s ease-out both; }
.tlx-pop { animation: tlxFade .25s ease-out both; }
.tlx-blink { transform-box: fill-box; transform-origin: center; animation: tlxBlink 5.5s ease-in-out infinite; }
.tlx-btn { transition: background-color .15s ease, box-shadow .15s ease, transform .15s ease, opacity .15s; }
.tlx-btn:hover { transform: translateY(-1px); filter: brightness(.97); }
.tlx-btn:active { transform: translateY(0); filter: brightness(.93); }
.tlx-chip { transition: border-color .15s ease, background-color .15s ease, color .15s ease; }
.tlx-chip:hover { border-color: #c9c5f0; }
.tlx-opt { transition: border-color .15s ease, background-color .15s ease, box-shadow .15s ease, transform .15s ease; }
.tlx-opt:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(30,27,75,.08); }
.tlx-range { -webkit-appearance: none; appearance: none; width: 100%; height: 10px; border-radius: 99px; outline: none; cursor: pointer; margin: 6px 0;
  background: linear-gradient(90deg, var(--c) 0%, var(--c) var(--p), #e9e8f2 var(--p), #e9e8f2 100%); }
.tlx-range::-webkit-slider-thumb { -webkit-appearance: none; width: 24px; height: 24px; border-radius: 50%; background: #fff;
  border: 4px solid var(--c); box-shadow: 0 2px 6px rgba(0,0,0,.15); }
.tlx-range::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: #fff; border: 4px solid var(--c); }
.tlx-range:focus-visible { box-shadow: 0 0 0 3px rgba(79,70,229,.25); }
.tlx-confetti { position: absolute; top: 0; border-radius: 2px; animation: tlxFall 2.6s ease-out forwards; pointer-events: none; }
@media (prefers-reduced-motion: reduce) {
  .tlx-up, .tlx-pop, .tlx-blink, .tlx-confetti { animation: none !important; }
  .tlx-confetti { display: none; }
}
`;

function GlobalStyle() {
  return <style>{GLOBAL_CSS}</style>;
}

// Warna dan keterangan singkat tiap dimensi
const DIM_META = {
  MD: { color:"#8b5cf6", soft:"#f3efff", short:"Berpikir dan konsentrasi" },
  PD: { color:"#f97316", soft:"#fff4ec", short:"Tenaga fisik" },
  TD: { color:"#0ea5e9", soft:"#ecf8fe", short:"Dikejar waktu" },
  OP: { color:"#10b981", soft:"#eafaf3", short:"Kepuasan hasil kerja" },
  EF: { color:"#eab308", soft:"#fefae8", short:"Usaha yang dikerahkan" },
  FR: { color:"#f43f5e", soft:"#fff0f3", short:"Stres dan rasa kesal" },
};

function DimGlyph({ id }) {
  const st = { fill:"none", stroke:"#fff", strokeWidth:2.4, strokeLinecap:"round", strokeLinejoin:"round" };
  if (id === "MD") return (<g {...st}>
    <path d="M15 8c-2.6-2-6.6-.8-7 2.4-2.8.4-3.8 3.6-2.4 5.4-1.8 1.6-1.2 5 1.2 5.8.2 3 3.4 4.6 6 3.4 1 1.4 2.2 1.6 2.2 1.6V8z"/>
    <path d="M17 8c2.6-2 6.6-.8 7 2.4 2.8.4 3.8 3.6 2.4 5.4 1.8 1.6 1.2 5-1.2 5.8-.2 3-3.4 4.6-6 3.4-1 1.4-2.2 1.6-2.2 1.6V8z"/>
    <path d="M10 14.5c1.4 0 2.4 1 2.4 2.2M22 14.5c-1.4 0-2.4 1-2.4 2.2"/></g>);
  if (id === "PD") return (<g {...st}>
    <path d="M5 13v6M9 10v12M23 10v12M27 13v6M9 16h14"/></g>);
  if (id === "TD") return (<g {...st}>
    <circle cx="16" cy="17.5" r="8.5"/><path d="M16 13v5l3 2M7.5 8.5l3-3M24.5 8.5l-3-3"/></g>);
  if (id === "OP") return (<g {...st}>
    <circle cx="16" cy="16" r="9"/><circle cx="16" cy="16" r="4.6"/>
    <circle cx="16" cy="16" r="1" fill="#fff"/></g>);
  if (id === "EF") return (<path d="M18.5 4.5 8.5 18h6.5l-2 9.5L23.5 14h-6.5l2-9.5z" fill="#fff"/>);
  return (<g {...st}>
    <path d="M10 19.5a5 5 0 0 1-.4-10 7 7 0 0 1 13.4 1.4 4.4 4.4 0 0 1-.6 8.6H10z"/>
    <path d="M16 21.5l-2.2 3.6h3.4l-2.2 3.6"/></g>);
}

function DimIcon({ id, size = 44 }) {
  const m = DIM_META[id];
  return (
    <div style={{ width:size, height:size, borderRadius:size*0.32, background:m.color,
      display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
      boxShadow:`0 3px 8px ${m.color}33` }}>
      <svg width={size*0.66} height={size*0.66} viewBox="0 0 32 32"><DimGlyph id={id}/></svg>
    </div>
  );
}

// Reaksi emoji mengikuti nilai slider
function faceFor(id, v) {
  if (id === "OP") return v <= 20 ? "😟" : v <= 40 ? "😕" : v <= 60 ? "🙂" : v <= 80 ? "😊" : "😄";
  return v <= 20 ? "😌" : v <= 40 ? "🙂" : v <= 60 ? "😐" : v <= 80 ? "😣" : "🤯";
}
function levelFor(id, v) {
  if (id === "OP") return v <= 20 ? "Kurang puas" : v <= 40 ? "Agak kurang" : v <= 60 ? "Cukup" : v <= 80 ? "Puas" : "Sangat puas";
  return v <= 20 ? "Ringan sekali" : v <= 40 ? "Ringan" : v <= 60 ? "Sedang" : v <= 80 ? "Berat" : "Berat sekali";
}

// Maskot "Kawi": karakter bulat dengan motif kawung di perut
function moodFor(label) {
  return { "Sangat Rendah":"happy", "Rendah":"calm", "Sedang":"neutral", "Tinggi":"tired", "Sangat Tinggi":"stressed" }[label] || "calm";
}

function Mascot({ mood = "wave", size = 120, className = "" }) {
  const ink = "#1e1b4b";
  const openEye = (x) => (<g key={x}>
    <ellipse cx={x} cy="56" rx="6" ry="7" fill="#fff"/>
    <circle cx={x + 1} cy="57" r="3.4" fill={ink}/><circle cx={x + 2.2} cy="55.4" r="1.2" fill="#fff"/></g>);
  const arcEye = (x) => (<path key={x} d={`M${x - 6} 58 q6 -8 12 0`} fill="none" stroke={ink} strokeWidth="3.2" strokeLinecap="round"/>);
  const tiredEye = (x) => (<g key={x}>{openEye(x)}<path d={`M${x - 7} 52.5 h14`} stroke="#6366f1" strokeWidth="6" strokeLinecap="round"/></g>);
  const dizzyEye = (x) => (<path key={x} d={`M${x - 5} 51 l10 10 M${x + 5} 51 l-10 10`} stroke={ink} strokeWidth="3" strokeLinecap="round"/>);
  const eyes = {
    wave: [openEye(45), openEye(75)], calm: [openEye(45), openEye(75)], neutral: [openEye(45), openEye(75)],
    happy: [arcEye(45), arcEye(75)], party: [arcEye(45), arcEye(75)],
    tired: [tiredEye(45), tiredEye(75)], stressed: [dizzyEye(45), dizzyEye(75)],
  }[mood];
  const mouth = {
    wave:    <path d="M50 70 q10 12 20 0 z" fill={ink}/>,
    happy:   <path d="M49 69 q11 14 22 0 z" fill={ink}/>,
    party:   <path d="M48 68 q12 16 24 0 z" fill={ink}/>,
    calm:    <path d="M52 71 q8 7 16 0" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round"/>,
    neutral: <path d="M53 73 h14" stroke={ink} strokeWidth="3" strokeLinecap="round"/>,
    tired:   <path d="M50 75 q5 -4 10 0 q5 4 10 0" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round"/>,
    stressed:<ellipse cx="60" cy="74" rx="5" ry="6" fill={ink}/>,
  }[mood];
  const armsUp = mood === "party";
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id={`kawiBody-${mood}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#4f46e5"/>
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="112" rx="30" ry="5" fill="#1e1b4b" opacity=".08"/>
      {/* lengan */}
      {armsUp ? (<>
        <ellipse cx="18" cy="44" rx="7" ry="12" fill="#6366f1" transform="rotate(-30 18 44)"/>
        <ellipse cx="102" cy="44" rx="7" ry="12" fill="#6366f1" transform="rotate(30 102 44)"/>
      </>) : mood === "wave" ? (<>
        <ellipse cx="17" cy="78" rx="7" ry="11" fill="#6366f1" transform="rotate(25 17 78)"/>
        <ellipse cx="104" cy="48" rx="7" ry="12" fill="#6366f1" transform="rotate(35 104 48)"/>
      </>) : (<>
        <ellipse cx="17" cy="78" rx="7" ry="11" fill="#6366f1" transform="rotate(25 17 78)"/>
        <ellipse cx="103" cy="78" rx="7" ry="11" fill="#6366f1" transform="rotate(-25 103 78)"/>
      </>)}
      {/* badan */}
      <path d="M60 16c27 0 44 19 44 47 0 27-17 44-44 44S16 90 16 63c0-28 17-47 44-47z" fill={`url(#kawiBody-${mood})`}/>
      <ellipse cx="46" cy="30" rx="12" ry="6" fill="#fff" opacity=".22" transform="rotate(-20 46 30)"/>
      {/* motif kawung di perut */}
      <g opacity=".5" transform="translate(60 92)">
        <ellipse cx="0" cy="-6" rx="3.4" ry="5.4" fill="#fde68a"/><ellipse cx="0" cy="6" rx="3.4" ry="5.4" fill="#fde68a"/>
        <ellipse cx="-6" cy="0" rx="5.4" ry="3.4" fill="#fde68a"/><ellipse cx="6" cy="0" rx="5.4" ry="3.4" fill="#fde68a"/>
        <circle r="2" fill="#fff"/>
      </g>
      {/* pipi */}
      <ellipse cx="35" cy="68" rx="6" ry="4" fill="#fb7185" opacity=".45"/>
      <ellipse cx="85" cy="68" rx="6" ry="4" fill="#fb7185" opacity=".45"/>
      {["wave","calm","neutral","tired"].includes(mood) ? <g className="tlx-blink">{eyes}</g> : eyes}{mouth}
      {(mood === "tired" || mood === "stressed") && (
        <path d="M95 30 q6 8 0 12 q-6 -4 0 -12z" fill="#7dd3fc"/>
      )}
      {mood === "stressed" && (
        <path d="M24 34 q4 -6 8 0 q4 6 8 0" fill="none" stroke="#f43f5e" strokeWidth="2.4" strokeLinecap="round"/>
      )}
      {(mood === "party" || mood === "happy") && (<>
        <path d="M14 22 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#fbbf24"/>
        <path d="M104 14 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" fill="#f472b6"/>
      </>)}
    </svg>
  );
}

function KawungLogo({ size = 40 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:size*0.3, background:"#4f46e5",
      display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 10px rgba(79,70,229,.25)", flexShrink:0 }}>
      <svg width={size*0.66} height={size*0.66} viewBox="0 0 62 62">
        <ellipse cx="31" cy="14" rx="8" ry="12" fill="none" stroke="#fff" strokeWidth="2.6"/>
        <ellipse cx="31" cy="48" rx="8" ry="12" fill="none" stroke="#fff" strokeWidth="2.6"/>
        <ellipse cx="14" cy="31" rx="12" ry="8" fill="none" stroke="#fff" strokeWidth="2.6"/>
        <ellipse cx="48" cy="31" rx="12" ry="8" fill="none" stroke="#fff" strokeWidth="2.6"/>
        <circle cx="31" cy="31" r="5" fill="#fde68a"/>
      </svg>
    </div>
  );
}

const STEPS = [
  { icon:"🪪", label:"Data Diri" },
  { icon:"🎚️", label:"Penilaian" },
  { icon:"⚖️", label:"Pembobotan" },
  { icon:"📊", label:"Hasil" },
  { icon:"💬", label:"Refleksi" },
  { icon:"🤝", label:"Wellbeing" },
];

function StepTracker({ cur }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", marginBottom:18 }}>
      {STEPS.map((s, i) => {
        const done = i < cur, active = i === cur;
        return (
          <div key={s.label} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", position:"relative" }}>
            {i > 0 && (
              <div style={{ position:"absolute", top:19, right:"50%", width:"100%", height:4, borderRadius:99,
                background: i <= cur ? "#6366f1" : "#e7e5f0", zIndex:0 }}/>
            )}
            <div style={{ width:40, height:40, borderRadius:"50%", zIndex:1, transition:"all .25s ease",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize: done ? 16 : 18,
              background: done ? "#6366f1" : active ? "#fff" : "#f4f3fb",
              border: active ? "3px solid #6366f1" : "3px solid transparent",
              color:"#fff", boxShadow: active ? "0 0 0 4px rgba(99,102,241,.12)" : "none" }}>
              {done ? "✓" : s.icon}
            </div>
            <span style={{ fontSize:10, fontWeight:700, marginTop:5, textAlign:"center",
              color: active ? "#4f46e5" : done ? "#6366f1" : "#a5a3c4" }}>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Chips({ options, value, onChange, color = "#6366f1" }) {
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
      {options.map(o => {
        const on = value === o.value;
        return (
          <button key={o.value} type="button" className="tlx-chip" onClick={() => onChange(o.value)}
            style={{ display:"flex", alignItems:"center", gap:7, padding:"10px 14px", borderRadius:14,
              border:`2px solid ${on ? color : "#e7e5f4"}`, background: on ? color : "#fff",
              color: on ? "#fff" : "#3f3d63", fontSize:13, fontWeight:700, cursor:"pointer",
              fontFamily:"inherit", boxShadow:"none" }}>
            {o.emoji && <span style={{ fontSize:16 }}>{o.emoji}</span>}{o.label}
          </button>
        );
      })}
    </div>
  );
}

function Scale({ options, value, onChange, color = "#e11d48" }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:`repeat(${options.length}, minmax(0,1fr))`, gap:6 }}>
      {options.map(o => {
        const on = value === o;
        return (
          <button key={o} type="button" className="tlx-chip" onClick={() => onChange(o)}
            style={{ padding:"12px 4px", minHeight:52, justifyContent:"center", borderRadius:12, cursor:"pointer", fontFamily:"inherit",
              border:`2px solid ${on ? color : "#e7e5f4"}`, background: on ? color : "#fff",
              color: on ? "#fff" : "#3f3d63", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
            <span style={{ fontSize:10.5, fontWeight:700, lineHeight:1.25, textAlign:"center" }}>{o}</span>
          </button>
        );
      })}
    </div>
  );
}

function MultiChips({ options, value, onChange, color = "#e11d48" }) {
  const toggle = (o) => onChange(value.includes(o) ? value.filter(x => x !== o) : [...value, o]);
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
      {options.map(o => {
        const on = value.includes(o);
        return (
          <button key={o} type="button" className="tlx-chip" onClick={() => toggle(o)}
            style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 13px", borderRadius:14,
              border:`2px solid ${on ? color : "#e7e5f4"}`, background: on ? color + "12" : "#fff",
              color: on ? color : "#3f3d63", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            <span style={{ width:16, height:16, borderRadius:5, flexShrink:0, display:"inline-flex", alignItems:"center",
              justifyContent:"center", fontSize:11, color:"#fff", background: on ? color : "#fff",
              border:`2px solid ${on ? color : "#cfcbe6"}` }}>{on ? "✓" : ""}</span>
            {o}
          </button>
        );
      })}
    </div>
  );
}

function ScoreGauge({ score, color }) {
  const R = 70, C = 2 * Math.PI * R;
  const off = C * (1 - Math.min(100, Math.max(0, score)) / 100);
  return (
    <div style={{ position:"relative", width:170, height:170 }}>
      <svg width="170" height="170" viewBox="0 0 170 170" style={{ transform:"rotate(-90deg)" }}>
        <circle cx="85" cy="85" r={R} fill="none" stroke="#efedfb" strokeWidth="16"/>
        <circle cx="85" cy="85" r={R} fill="none" stroke={color} strokeWidth="16" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={off} style={{ animation:"tlxGauge 1.2s ease-out" }}/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <span className="fd" style={{ fontSize:40, fontWeight:700, color, lineHeight:1 }}>{score.toFixed(1)}</span>
        <span style={{ fontSize:11, color:"#8b89ad", fontWeight:600, marginTop:4 }}>dari 100</span>
      </div>
    </div>
  );
}

function Confetti({ count = 22 }) {
  const colors = ["#6366f1","#f472b6","#fbbf24","#34d399","#38bdf8","#fb923c"];
  return (
    <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none", zIndex:2 }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="tlx-confetti" style={{
          left: `${4 + (i * 41) % 92}%`, background: colors[i % colors.length],
          animationDelay: `${(i % 7) * 0.09}s`, animationDuration: `${2.2 + (i % 4) * 0.3}s`,
          width: 6, height: i % 3 === 0 ? 6 : 10, borderRadius: i % 3 === 0 ? "50%" : 2 }}/>
      ))}
    </div>
  );
}

const CAT_MESSAGE = {
  "Sangat Rendah": "Beban kerja Anda terasa ringan. Pertahankan ritme yang nyaman ini ya!",
  "Rendah":        "Beban kerja Anda masih terkendali dengan baik. Mantap!",
  "Sedang":        "Beban kerja Anda cukup seimbang. Jangan lupa ambil jeda sejenak di sela pekerjaan.",
  "Tinggi":        "Beban kerja Anda cukup berat. Luangkan waktu untuk istirahat dan recharge ya.",
  "Sangat Tinggi": "Beban kerja Anda terasa sangat berat. Anda tidak sendiri, ceritakan lebih lanjut di halaman berikutnya ya.",
};

const PSIKOLOG_OPTS = [
  { value:"Ya",        label:"Ya",        emoji:"🙋" },
  { value:"Tidak",     label:"Tidak",     emoji:"🙅" },
  { value:"Belum Tau", label:"Belum Tau", emoji:"🤔" },
];
const WBB_OPTS = PSIKOLOG_OPTS;
const TOD_OPTS = PSIKOLOG_OPTS;
const WBB_NYAMAN_OPTS  = ["Sangat nyaman","Cukup nyaman","Netral","Kurang nyaman","Tidak nyaman"];
const WBB_PENTING_OPTS = ["Sangat penting","Penting","Cukup penting","Kurang penting","Tidak penting"];
const WBB_TOPIK_OPTS   = ["Beban kerja","Kolaborasi dan komunikasi","Work-life balance","Motivasi kerja","Pengembangan diri","Masalah di luar pekerjaan"];
const WBB_DUKUNGAN_OPTS = ["Didengarkan tanpa dihakimi","Diskusi mencari solusi","Berbagi pengalaman","Check-in rutin","Teman ngobrol saat dibutuhkan"];
const BUTUH_CUTI_OPTS = [
  { value:"Ya",        label:"Ya, butuh",  emoji:"🏖️" },
  { value:"Tidak",     label:"Tidak",      emoji:"💪" },
  { value:"Belum Tau", label:"Belum Tau",  emoji:"🤔" },
];
const SULIT_CUTI_OPTS = [
  { value:"Ya",                      label:"Ya, sulit",              emoji:"😓" },
  { value:"Tidak",                   label:"Tidak, mudah",           emoji:"👍" },
  { value:"Belum Pernah Mengajukan", label:"Belum pernah mengajukan", emoji:"📝" },
];

// ══════════════════════════════════════════════════════════════════════════
// EKSPOR EXCEL (ExcelJS dimuat dari CDN saat tombol diklik, tanpa npm install)
// ══════════════════════════════════════════════════════════════════════════
function loadExcelJS() {
  return new Promise((resolve, reject) => {
    if (window.ExcelJS) return resolve(window.ExcelJS);
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";
    s.onload = () => resolve(window.ExcelJS);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function splitDate(str) {
  const parts = String(str || "").split(/,\s*/);
  return { tanggal: parts[0] || "", jam: (parts[1] || "").replace(/\./g, ":") };
}

async function exportExcel(rows) {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = "NASA-TLX KPwBI DIY";
  const ws = wb.addWorksheet("Data Responden", { views:[{ state:"frozen", ySplit:1, xSplit:2 }] });

  const cols = [
    { header:"No", key:"no", width:5 },
    { header:"Nama", key:"name", width:28 },
    { header:"NIP", key:"nip", width:10 },
    { header:"Pangkat", key:"pangkat", width:17 },
    { header:"Unit Kerja", key:"unit", width:22 },
    { header:"Bulan", key:"bulan", width:11 },
    { header:"Tahun", key:"tahun", width:7 },
    { header:"Tanggal Isi", key:"tanggal", width:12 },
    { header:"Jam Isi", key:"jam", width:9 },
    ...DIMENSIONS.map(d => ({ header:`Rating ${d.label}`, key:`r_${d.id}`, width:13 })),
    ...DIMENSIONS.map(d => ({ header:`Bobot ${d.label}`, key:`w_${d.id}`, width:13 })),
    { header:"Skor NASA-TLX", key:"score", width:11 },
    { header:"Kategori", key:"kategori", width:14 },
    { header:"Cerita Beban Kerja", key:"cerita", width:55 },
    { header:"Butuh Pendampingan Psikolog", key:"psikolog", width:15 },
    { header:"Sesi Wellbeing Buddies", key:"wbb", width:14 },
    { header:"WB Buddies: Kenyamanan", key:"wbbNyaman", width:15 },
    { header:"WB Buddies: Kepentingan", key:"wbbPenting", width:15 },
    { header:"WB Buddies: Topik", key:"wbbTopik", width:34 },
    { header:"WB Buddies: Dukungan Diharapkan", key:"wbbDukungan", width:26 },
    { header:"Minat Tour of Duty", key:"tod", width:13 },
    { header:"Butuh Cuti", key:"butuhCuti", width:12 },
    { header:"Kesulitan Mengajukan Cuti", key:"sulitCuti", width:18 },
    { header:"Masukan Platform", key:"masukan", width:45 },
  ];
  ws.columns = cols;

  rows.forEach((r, i) => {
    const d = splitDate(r.date);
    const row = {
      no: i + 1, name: (r.name || "").trim(), nip: r.nip || "", pangkat: r.pangkat || "", unit: r.unit || "",
      bulan: r.bulan || "", tahun: Number(r.tahun) || r.tahun || "", tanggal: d.tanggal, jam: d.jam,
      score: Math.round((r.score || 0) * 100) / 100, kategori: getCategory(r.score || 0).label,
      cerita: r.ceritaBeban || "", psikolog: r.butuhPsikolog || "", wbb: r.sesiWBB || "", wbbNyaman: r.wbbNyaman || "", wbbPenting: r.wbbPenting || "", wbbTopik: (r.wbbTopik || []).join("; "), wbbDukungan: r.wbbDukungan || "", tod: r.tourOfDuty || "", butuhCuti: r.butuhCuti || "",
      sulitCuti: r.kesulitanCuti || "", masukan: r.masukanApp || "",
    };
    DIMENSIONS.forEach(dm => { row[`r_${dm.id}`] = r.ratings?.[dm.id] ?? ""; row[`w_${dm.id}`] = r.weights?.[dm.id] ?? ""; });
    ws.addRow(row);
  });

  const header = ws.getRow(1);
  header.height = 34;
  header.eachCell(c => {
    c.font = { bold:true, color:{ argb:"FFFFFFFF" } };
    c.fill = { type:"pattern", pattern:"solid", fgColor:{ argb:"FF4F46E5" } };
    c.alignment = { vertical:"middle", horizontal:"center", wrapText:true };
  });
  ws.autoFilter = { from:{ row:1, column:1 }, to:{ row:1, column:cols.length } };

  const border = { style:"thin", color:{ argb:"FFE2E8F0" } };
  ws.eachRow((row, n) => {
    row.eachCell({ includeEmpty:true }, c => { c.border = { top:border, left:border, bottom:border, right:border }; });
    if (n === 1) return;
    row.alignment = { vertical:"top", wrapText:true };
    if (n % 2 === 0) row.eachCell({ includeEmpty:true }, c => { c.fill = { type:"pattern", pattern:"solid", fgColor:{ argb:"FFF8F7FF" } }; });
    const sc = row.getCell("score"); sc.numFmt = "0.00"; sc.font = { bold:true };
    const kc = row.getCell("kategori");
    const hex = getCategory(sc.value || 0).color.replace("#", "").toUpperCase();
    kc.font = { bold:true, color:{ argb:"FF" + hex } };
  });

  // Sheet ringkasan
  const sum = wb.addWorksheet("Ringkasan");
  sum.columns = [{ width:44 }, { width:14 }, { width:12 }];
  const title = (t) => { const r = sum.addRow([t]); r.font = { bold:true, size:12, color:{ argb:"FF4F46E5" } }; };
  const head = (arr) => { const r = sum.addRow(arr); r.eachCell(c => { c.font = { bold:true, color:{ argb:"FFFFFFFF" } }; c.fill = { type:"pattern", pattern:"solid", fgColor:{ argb:"FF6366F1" } }; }); };
  const n = rows.length;
  const avg = n ? rows.reduce((s, r) => s + (r.score || 0), 0) / n : 0;
  title("Ringkasan Pengukuran NASA-TLX");
  sum.addRow(["Jumlah responden", n]);
  const ar = sum.addRow(["Rata-rata skor", Math.round(avg * 100) / 100]); ar.getCell(2).numFmt = "0.00";
  sum.addRow(["Kategori rata-rata", getCategory(avg).label]);
  sum.addRow([]);
  title("Sebaran Kategori (Hart dan Staveland, 1988)");
  head(["Kategori", "Jumlah", "Persen"]);
  ["Sangat Rendah","Rendah","Sedang","Tinggi","Sangat Tinggi"].forEach(k => {
    const c = rows.filter(r => getCategory(r.score || 0).label === k).length;
    const rr = sum.addRow([k, c, n ? c / n : 0]); rr.getCell(3).numFmt = "0%";
  });
  sum.addRow([]);
  title("Rata-rata Rating per Dimensi");
  head(["Dimensi", "Rata-rata", ""]);
  DIMENSIONS.forEach(d => {
    const v = n ? rows.reduce((s, r) => s + (r.ratings?.[d.id] || 0), 0) / n : 0;
    const rr = sum.addRow([d.label, Math.round(v * 10) / 10]); rr.getCell(2).numFmt = "0.0";
  });
  sum.addRow([]);
  title("Pendampingan, Wellbeing Buddies, Tour of Duty, dan Cuti");
  head(["Pertanyaan / Jawaban", "Jumlah", ""]);
  const countBy = (key, label) => {
    const r0 = sum.addRow([label]); r0.font = { italic:true };
    const map = {};
    rows.forEach(r => { const v = r[key] || "(tidak diisi / data sebelum pertanyaan ini ada)"; map[v] = (map[v] || 0) + 1; });
    Object.entries(map).forEach(([k, v]) => sum.addRow(["   " + k, v]));
  };
  countBy("butuhPsikolog", "Butuh Pendampingan Psikolog");
  countBy("sesiWBB", "Sesi Wellbeing Buddies");
  countBy("wbbNyaman", "WB Buddies: Kenyamanan");
  countBy("wbbPenting", "WB Buddies: Kepentingan");
  countBy("wbbDukungan", "WB Buddies: Dukungan Diharapkan");
  { const r0 = sum.addRow(["WB Buddies: Topik (boleh lebih dari satu)"]); r0.font = { italic:true };
    WBB_TOPIK_OPTS.forEach(t => sum.addRow(["   " + t, rows.filter(r => (r.wbbTopik || []).includes(t)).length])); }
  countBy("tourOfDuty", "Minat Tour of Duty");
  countBy("butuhCuti", "Butuh Cuti");
  countBy("kesulitanCuti", "Kesulitan Mengajukan Cuti");

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const today = new Date().toISOString().slice(0, 10);
  a.href = url; a.download = `NASA-TLX_KPwBI-DIY_${today}.xlsx`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}


const SEL_STYLE = { width:"100%", padding:"12px 36px 12px 14px", borderRadius:14, border:"2px solid #e7e5f4",
  fontSize:13, boxSizing:"border-box", outline:"none", fontFamily:"inherit", color:"#1e1b4b",
  background:"#fff", appearance:"none", WebkitAppearance:"none", cursor:"pointer" };

function SelectWrap({ value, onChange, children, style }) {
  return (
    <div style={{ position:"relative", ...style }}>
      <select style={SEL_STYLE} value={value} onChange={onChange}>{children}</select>
      <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)",
        pointerEvents:"none", color:"#8b89ad", fontSize:11 }}>▼</span>
    </div>
  );
}

function H3({ icon, title, sub }) {
  return (
    <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:18 }}>
      <div style={{ width:48, height:48, borderRadius:16, background:"#eef2ff", display:"flex",
        alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>{icon}</div>
      <div>
        <h3 className="fd" style={{ fontSize:22, fontWeight:700, color:"#1e1b4b", margin:0 }}>{title}</h3>
        <p style={{ color:"#6b6990", fontSize:13, margin:"2px 0 0", lineHeight:1.5 }}>{sub}</p>
      </div>
    </div>
  );
}

function Section({ icon, color, title, children }) {
  return (
    <div style={{ background:"#fff", border:"2px solid #efedfb", borderRadius:20, padding:"16px 16px 18px", marginBottom:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
        <div style={{ width:34, height:34, borderRadius:11, background:color, display:"flex",
          alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{icon}</div>
        <div className="fd" style={{ fontSize:16, fontWeight:600, color:"#1e1b4b", lineHeight:1.3 }}>{title}</div>
      </div>
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [screen,        setScreen]        = useState("home");
  const [step,          setStep]          = useState(0);
  const [name,          setName]          = useState("");
  const [nip,           setNip]           = useState("");
  const [pangkat,       setPangkat]       = useState("");
  const [unit,          setUnit]          = useState("");
  const [bulan,         setBulan]         = useState("");
  const [tahun,         setTahun]         = useState("");
  const [ratings,       setRatings]       = useState(Object.fromEntries(DIMENSIONS.map(d=>[d.id,0])));
  const [pairs,         setPairs]         = useState([]);
  const [pairChoices,   setPairChoices]   = useState({});
  const [result,        setResult]        = useState(null);
  const [responses,     setResponses]     = useState([]);
  const [ceritaBeban,   setCeritaBeban]   = useState("");
  const [butuhPsikolog, setButuhPsikolog] = useState("");
  const [masukanApp,    setMasukanApp]    = useState("");
  const [sesiWBB,       setSesiWBB]       = useState("");
  const [tourOfDuty,    setTourOfDuty]    = useState("");
  const [wbbNyaman,     setWbbNyaman]     = useState("");
  const [wbbPenting,    setWbbPenting]    = useState("");
  const [wbbTopik,      setWbbTopik]      = useState([]);
  const [wbbDukungan,   setWbbDukungan]   = useState("");
  const [butuhCuti,     setButuhCuti]     = useState("");
  const [kesulitanCuti, setKesulitanCuti] = useState("");
  const [pairIdx,       setPairIdx]       = useState(0);
  const [exporting,     setExporting]     = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [saving,        setSaving]        = useState(false);

  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPw,       setAdminPw]       = useState("");
  const [adminError,    setAdminError]    = useState(false);
  const [showAdminBox,  setShowAdminBox]  = useState(false);

  const [filterBulan,   setFilterBulan]   = useState([NOW_MONTH]);
  const [filterTahun,   setFilterTahun]   = useState(NOW_YEAR);
  const [filterKat,     setFilterKat]     = useState("Semua");
  const [filterUnit,    setFilterUnit]    = useState("Semua");
  const [filterPangkat, setFilterPangkat] = useState("Semua");
  const [editRow,       setEditRow]       = useState(null);
  const [fade,          setFade]          = useState(true);

  async function fetchResponses() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "responses"));
      setResponses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { fetchResponses(); }, []);
  useEffect(() => { try { window.scrollTo({ top:0, behavior:"smooth" }); } catch(e) {} }, [step, screen]);

  function go(fn) { setFade(false); setTimeout(() => { fn(); setFade(true); }, 180); }

  function startForm() {
    setPairs(shuffle(PAIRS)); setPairChoices({});
    setRatings(Object.fromEntries(DIMENSIONS.map(d=>[d.id,0])));
    setName(""); setNip(""); setPangkat(""); setUnit(""); setBulan(""); setTahun("");
    setCeritaBeban(""); setButuhPsikolog(""); setMasukanApp(""); setSesiWBB(""); setTourOfDuty(""); setWbbNyaman(""); setWbbPenting(""); setWbbTopik([]); setWbbDukungan(""); setButuhCuti(""); setKesulitanCuti(""); setPairIdx(0);
    setResult(null); setStep(0);
    go(() => setScreen("form"));
  }

  async function finishPairwise() {
    const counts = Object.fromEntries(DIMENSIONS.map(d=>[d.id,0]));
    Object.values(pairChoices).forEach(id => { counts[id] = (counts[id]||0)+1; });
    const s = computeScore(ratings, counts);
    setResult({ score: s, weights: counts });
    go(() => setStep(3));
  }

  async function submitRefleksi() {
    const counts = result.weights;
    const s = result.score;
    const entry = { name, nip, pangkat, unit, bulan, tahun,
      date: new Date().toLocaleString("id-ID"),
      ratings: { ...ratings }, weights: counts, score: s,
      ceritaBeban, butuhPsikolog, sesiWBB, wbbNyaman, wbbPenting, wbbTopik, wbbDukungan, tourOfDuty, butuhCuti, kesulitanCuti, masukanApp };
    setSaving(true);
    try {
      await addDoc(collection(db, "responses"), entry);
      await fetchResponses();
    } catch(e) { console.error(e); }
    setSaving(false);
    go(() => setStep(6));
  }

  const allPairs = pairs.length > 0 && pairs.every((_, i) => pairChoices[i] !== undefined);

  async function saveEdit(edited) {
    const newScore = computeScore(edited.ratings, edited.weights);
    const updated = { ...edited, score: newScore };
    setSaving(true);
    try {
      const { id, ...data } = updated;
      await updateDoc(doc(db, "responses", id), { ...data, score: newScore });
      setResponses(prev => prev.map(r => r.id === id ? updated : r));
    } catch(e) { console.error(e); }
    setSaving(false);
    setEditRow(null);
  }

  function tryAdmin() {
    if (adminPw === "bismillah#21") { setAdminUnlocked(true); setAdminError(false); setShowAdminBox(false); fetchResponses(); }
    else { setAdminError(true); }
  }

  const KATEGORI_OPTIONS = ["Semua","Sangat Rendah","Rendah","Sedang","Tinggi","Sangat Tinggi"];

  const filtered = responses.filter(r => {
    const matchBulan   = filterBulan.length === 0 || filterBulan.includes(r.bulan);
    const matchTahun   = !filterTahun || filterTahun === "Semua" || String(r.tahun) === String(filterTahun);
    const matchKat     = filterKat === "Semua" || getCategory(r.score).label === filterKat;
    const matchUnit    = filterUnit === "Semua" || r.unit === filterUnit;
    const matchPangkat = filterPangkat === "Semua" || r.pangkat === filterPangkat;
    return matchBulan && matchTahun && matchKat && matchUnit && matchPangkat;
  });

  function toggleBulan(m) {
    setFilterBulan(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  }

  // ── styles ────────────────────────────────────────────────────────────
  const S = {
    page: { minHeight:"100vh", background:"#f5f5fa",
            padding:"24px 16px 40px", fontFamily:FONT_STACK,
            display:"flex", flexDirection:"column", alignItems:"center", position:"relative", overflow:"hidden" },
    card: { background:"#fff", borderRadius:24, boxShadow:"0 1px 3px rgba(30,27,75,0.06), 0 8px 24px rgba(30,27,75,0.05)",
            border:"1px solid #ecebf3", padding:"28px 22px", width:"100%", boxSizing:"border-box",
            opacity: fade?1:0, transform: fade?"translateY(0)":"translateY(10px)",
            transition:"opacity .18s,transform .18s" },
    pBtn: { background:"#4f46e5", color:"#fff", border:"none",
            borderRadius:16, padding:"15px 22px", fontWeight:800, fontSize:15,
            cursor:"pointer", width:"100%", marginTop:16, fontFamily:"inherit",
            boxShadow:"0 4px 12px rgba(79,70,229,0.22)" },
    oBtn: { background:"#fff", color:"#4f46e5", border:"2px solid #e0dcfb",
            borderRadius:16, padding:"13px 22px", fontWeight:700, fontSize:14,
            cursor:"pointer", width:"100%", marginTop:10, fontFamily:"inherit" },
    gBtn: { background:"#fff", color:"#4b4970", border:"2px solid #ecebf7", borderRadius:12,
            padding:"8px 14px", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" },
    inp:  { width:"100%", padding:"12px 14px", borderRadius:14, border:"2px solid #e7e5f4",
            fontSize:14, boxSizing:"border-box", outline:"none", fontFamily:"inherit", transition:"border .15s", color:"#1e1b4b" },
    lbl:  { fontSize:11, fontWeight:800, color:"#8b89ad", textTransform:"uppercase",
            letterSpacing:"0.07em", marginBottom:6, display:"block" },
    tag:  (c) => ({ background:c+"18", color:c, padding:"3px 12px", borderRadius:99, fontSize:12, fontWeight:700 }),
  };


  // ══════════════════════════════════════════════════════════════════════
  // HOME
  // ══════════════════════════════════════════════════════════════════════
  if (screen === "home") return (
    <div style={S.page}>
      <GlobalStyle/>
      <div style={{ width:"100%", maxWidth:540, position:"relative", zIndex:1 }}>
        <div style={{ ...S.card, textAlign:"center", paddingTop:26 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:6 }}>
            <KawungLogo size={34}/>
            <span style={{ fontSize:12, fontWeight:800, color:"#818cf8", letterSpacing:"0.16em", textTransform:"uppercase" }}>TIMOHO X ON DUTY</span>
          </div>

          <div className="tlx-pop" style={{ display:"flex", justifyContent:"center", margin:"6px 0 2px" }}>
            <Mascot mood="wave" size={132}/>
          </div>
          <div className="tlx-pop" style={{ display:"inline-block", background:"#fff7d6", color:"#a16207", fontSize:12,
            fontWeight:700, padding:"6px 14px", borderRadius:99, marginBottom:10, border:"1.5px solid #fde68a" }}>
            Halo! Saya Kawi, teman Anda hari ini 👋
          </div>

          <h1 className="fd" style={{ fontSize:34, fontWeight:700, color:"#1e1b4b", margin:"0 0 2px", letterSpacing:"0.01em" }}>NASA-TLX</h1>
          <p style={{ fontSize:14, fontWeight:700, color:"#6366f1", margin:"0 0 18px" }}>
            Pengukuran Beban Kerja Mental KPwBI DIY
          </p>


          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:6 }}>
            {[
              { e:"🎚️", t:"Nilai 6 aspek", bg:"#f3efff" },
              { e:"⚖️", t:"Bandingkan 15 pasang", bg:"#ecf8fe" },
              { e:"💬", t:"Ceritakan kondisi", bg:"#fff0f3" },
            ].map((x, i) => (
              <div key={i} className="tlx-up" style={{ background:x.bg, borderRadius:16, padding:"12px 6px", animationDelay:`${i*0.08}s` }}>
                <div style={{ fontSize:24 }}>{x.e}</div>
                <div style={{ fontSize:11, fontWeight:700, color:"#3f3d63", marginTop:4, lineHeight:1.35 }}>{x.t}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize:11, color:"#8b89ad", margin:"6px 0 4px", fontWeight:600 }}>⏱️ Sekitar 5 menit saja</p>

          <button className="tlx-btn" style={S.pBtn} onClick={startForm}>Mulai Pengisian →</button>
          <button className="tlx-btn" style={S.oBtn} onClick={() => go(() => setScreen("dashboard"))}>Lihat Dashboard</button>

          <div style={{ marginTop:18, background:"#fffbeb",
            border:"1.5px solid #fde68a", borderRadius:18, padding:"14px 16px", textAlign:"left",
            display:"flex", gap:12, alignItems:"flex-start" }}>
            <div style={{ fontSize:24, lineHeight:1 }}>💡</div>
            <div>
              <div className="fd" style={{ fontSize:14, fontWeight:600, color:"#b45309", marginBottom:4 }}>Tahukah Anda?</div>
              <p style={{ fontSize:12, color:"#57534e", lineHeight:1.7, margin:0 }}>{funFact}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════
  // FORM
  // ══════════════════════════════════════════════════════════════════════
  if (screen === "form") {
    const bioOk = name.trim() && nip.trim() && pangkat && unit && bulan && tahun;
    const answered = Object.keys(pairChoices).length;
    const pi = Math.min(pairIdx, Math.max(0, pairs.length - 1));
    const refleksiOk = butuhPsikolog && tourOfDuty && butuhCuti && kesulitanCuti;
    const wbbOk = sesiWBB && wbbNyaman && wbbPenting && wbbTopik.length > 0 && wbbDukungan;
    const pickPair = (id) => {
      const next = { ...pairChoices, [pi]: id };
      setPairChoices(next);
      setTimeout(() => {
        const firstOpen = pairs.findIndex((_, k) => next[k] === undefined);
        if (pi < pairs.length - 1 && next[pi + 1] === undefined) setPairIdx(pi + 1);
        else if (firstOpen !== -1) setPairIdx(firstOpen);
      }, 260);
    };

    return (
    <div style={S.page}>
      <GlobalStyle/>
      <div style={{ width:"100%", maxWidth:560, position:"relative", zIndex:1 }}>
        {step < 6 && (<>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <button className="tlx-btn" style={S.gBtn} onClick={() => step===0 ? go(()=>setScreen("home")) : go(()=>setStep(step-1))}>← Kembali</button>
            <span style={{ fontSize:12, color:"#6b6990", fontWeight:700, background:"#fff", padding:"6px 12px", borderRadius:99 }}>
              Langkah {step+1} dari 6
            </span>
          </div>
          <StepTracker cur={step}/>
        </>)}

        <div style={{ ...S.card, position:"relative", overflow:"hidden" }}>

          {/* STEP 0: Data Diri */}
          {step === 0 && <>
            <H3 icon="🪪" title="Data Diri" sub="Kenalan dulu yuk sebelum mulai mengisi."/>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={S.lbl}>Nama Lengkap</label>
                <input style={S.inp} value={name} onChange={e=>setName(e.target.value)}
                  placeholder="Masukkan nama lengkap Anda"
                  onFocus={e=>e.target.style.borderColor="#6366f1"}
                  onBlur={e=>e.target.style.borderColor="#e7e5f4"}/>
              </div>
              <div>
                <label style={S.lbl}>NIP</label>
                <input style={S.inp} value={nip} onChange={e=>setNip(e.target.value)}
                  placeholder="Masukkan NIP Anda"
                  onFocus={e=>e.target.style.borderColor="#6366f1"}
                  onBlur={e=>e.target.style.borderColor="#e7e5f4"}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={S.lbl}>Pangkat</label>
                  <SelectWrap value={pangkat} onChange={e=>setPangkat(e.target.value)}>
                    <option value="">Pilih pangkat</option>
                    {PANGKAT_LIST.map(p=><option key={p} value={p}>{p}</option>)}
                  </SelectWrap>
                </div>
                <div>
                  <label style={S.lbl}>Unit Kerja</label>
                  <SelectWrap value={unit} onChange={e=>setUnit(e.target.value)}>
                    <option value="">Pilih unit</option>
                    {UNIT_LIST.map(u=><option key={u} value={u}>{u}</option>)}
                  </SelectWrap>
                </div>
                <div>
                  <label style={S.lbl}>Bulan Pengisian</label>
                  <SelectWrap value={bulan} onChange={e=>setBulan(e.target.value)}>
                    <option value="">Pilih bulan</option>
                    {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
                  </SelectWrap>
                </div>
                <div>
                  <label style={S.lbl}>Tahun Pengisian</label>
                  <SelectWrap value={tahun} onChange={e=>setTahun(e.target.value)}>
                    <option value="">Pilih tahun</option>
                    {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
                  </SelectWrap>
                </div>
              </div>
            </div>
            <button className="tlx-btn"
              style={{ ...S.pBtn, opacity: bioOk ? 1 : 0.45 }}
              onClick={() => bioOk && go(()=>setStep(1))}>
              Lanjut ke Penilaian →
            </button>
            {!bioOk && <p style={{ fontSize:11, color:"#a5a3c4", textAlign:"center", margin:"8px 0 0" }}>Lengkapi semua data untuk lanjut</p>}
          </>}

          {/* STEP 1: Penilaian */}
          {step === 1 && <>
            <H3 icon="🎚️" title="Penilaian Dimensi" sub="Geser slider sesuai kondisi yang Anda rasakan saat bekerja."/>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#8b89ad", fontWeight:600,
              background:"#f8f7ff", borderRadius:12, padding:"8px 12px", marginBottom:14 }}>
              <span>0 = tidak terasa sama sekali</span><span>100 = sangat terasa</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {DIMENSIONS.map((d, i) => {
                const m = DIM_META[d.id]; const v = ratings[d.id];
                return (
                  <div key={d.id} className="tlx-up" style={{ background:m.soft, borderRadius:20, padding:"16px 16px 12px",
                    border:`2px solid ${m.color}22`, animationDelay:`${i*0.05}s` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
                      <DimIcon id={d.id} size={44}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div className="fd" style={{ fontWeight:600, fontSize:16, color:"#1e1b4b" }}>{d.label}</div>
                        <div style={{ fontSize:11, color:m.color, fontWeight:700 }}>{m.short}</div>
                      </div>
                      <div style={{ textAlign:"center", minWidth:62 }}>
                        <div key={faceFor(d.id, v)} className="tlx-pop" style={{ fontSize:26, lineHeight:1 }}>{faceFor(d.id, v)}</div>
                        <div className="fd" style={{ fontSize:18, fontWeight:700, color:m.color }}>{v}</div>
                      </div>
                    </div>
                    <p style={{ fontSize:12, color:"#5f5d80", margin:"0 0 6px", lineHeight:1.6 }}>{d.desc}</p>
                    <input type="range" min={0} max={100} step={5} value={v} className="tlx-range"
                      style={{ "--c": m.color, "--p": `${v}%` }}
                      onChange={e=>setRatings(r=>({...r,[d.id]:+e.target.value}))}/>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:10, color:"#a5a3c4", fontWeight:600 }}>Rendah</span>
                      <span style={{ fontSize:11, color:m.color, fontWeight:800 }}>{levelFor(d.id, v)}</span>
                      <span style={{ fontSize:10, color:"#a5a3c4", fontWeight:600 }}>Tinggi</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="tlx-btn" style={S.pBtn} onClick={()=>go(()=>{ setPairIdx(0); setStep(2); })}>Lanjut ke Pembobotan →</button>
          </>}

          {/* STEP 2: Pembobotan (satu pasangan per layar) */}
          {step === 2 && pairs.length > 0 && <>
            <H3 icon="⚖️" title="Pembobotan Faktor" sub="Dari setiap pasangan, pilih faktor yang lebih terasa berat dalam pekerjaan Anda."/>
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, fontWeight:700, color:"#4f46e5", marginBottom:6 }}>
                <span>Pasangan {pi+1} dari {pairs.length}</span>
                <span>{answered}/{pairs.length} terjawab {answered === pairs.length ? "🎉" : ""}</span>
              </div>
              <div style={{ height:10, background:"#efedfb", borderRadius:99, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${answered/pairs.length*100}%`, borderRadius:99,
                  background:"#6366f1", transition:"width .3s ease" }}/>
              </div>
            </div>

            <div key={pi} className="tlx-up" style={{ background:"#f8f7ff", borderRadius:22, padding:"16px 14px 18px" }}>
              <p className="fd" style={{ textAlign:"center", fontSize:17, fontWeight:600, color:"#1e1b4b", margin:"0 0 14px" }}>
                Mana yang lebih terasa berat? 🤔
              </p>
              <div style={{ display:"flex", alignItems:"stretch", gap:10, position:"relative" }}>
                {pairs[pi].map((dim, k) => {
                  const on = pairChoices[pi] === dim.id; const m = DIM_META[dim.id];
                  return (
                    <button key={dim.id} className="tlx-opt" onClick={() => pickPair(dim.id)}
                      style={{ flex:1, padding:"18px 10px 16px", borderRadius:20, cursor:"pointer", fontFamily:"inherit",
                        border:`3px solid ${on ? m.color : "#ebe9f7"}`, background: on ? m.soft : "#fff",
                        display:"flex", flexDirection:"column", alignItems:"center", gap:8, position:"relative",
                        boxShadow: on ? `0 4px 14px ${m.color}26` : "none" }}>
                      {on && <span className="tlx-pop" style={{ position:"absolute", top:8, right:10, fontSize:16 }}>✅</span>}
                      <DimIcon id={dim.id} size={54}/>
                      <span className="fd" style={{ fontSize:15, fontWeight:600, color:"#1e1b4b", lineHeight:1.25 }}>{dim.label}</span>
                      <span style={{ fontSize:11, color:m.color, fontWeight:700 }}>{m.short}</span>
                    </button>
                  );
                })}
                <div className="fd" style={{ position:"absolute", left:"50%", top:45, transform:"translate(-50%,-50%)",
                  width:40, height:40, borderRadius:"50%", background:"#1e1b4b", color:"#fde68a", fontSize:14, fontWeight:700,
                  display:"flex", alignItems:"center", justifyContent:"center", border:"4px solid #f8f7ff", pointerEvents:"none" }}>VS</div>
              </div>
            </div>

            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:12, gap:8 }}>
              <button className="tlx-btn" style={{ ...S.gBtn, opacity: pi>0?1:.4 }} onClick={() => pi>0 && setPairIdx(pi-1)}>← Sebelumnya</button>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5, justifyContent:"center", flex:1 }}>
                {pairs.map((_, k) => (
                  <button key={k} onClick={() => setPairIdx(k)} aria-label={`Pasangan ${k+1}`}
                    style={{ width:11, height:11, borderRadius:"50%", padding:0, cursor:"pointer",
                      border: k===pi ? "2px solid #4f46e5" : "none",
                      background: pairChoices[k] !== undefined ? "#6366f1" : "#dcd9f3",
                      transform: k===pi ? "scale(1.3)" : "none" }}/>
                ))}
              </div>
              <button className="tlx-btn" style={{ ...S.gBtn, opacity: pi<pairs.length-1?1:.4 }} onClick={() => pi<pairs.length-1 && setPairIdx(pi+1)}>Berikutnya →</button>
            </div>

            <button className="tlx-btn" style={{ ...S.pBtn, opacity:allPairs?1:0.45 }} onClick={allPairs?finishPairwise:undefined}>
              {allPairs ? "Hitung Hasil Saya →" : `Tersisa ${pairs.length-answered} pasangan lagi`}
            </button>
          </>}

          {/* STEP 3: Hasil */}
          {step === 3 && result && (() => {
            const cat = getCategory(result.score);
            return (
              <div style={{ textAlign:"center" }}>
                <h3 className="fd" style={{ fontSize:24, fontWeight:700, color:"#1e1b4b", margin:"0 0 4px" }}>Hasil Pengukuran Anda</h3>
                <p style={{ color:"#6b6990", fontSize:13, margin:"0 0 16px" }}>
                  <strong>{name}</strong>, ini skor beban kerja mental Anda periode {bulan} {tahun}.
                </p>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4, flexWrap:"wrap" }}>
                  <ScoreGauge score={result.score} color={cat.color}/>
                  <div className="tlx-pop"><Mascot mood={moodFor(cat.label)} size={110}/></div>
                </div>
                <div className="tlx-pop" style={{ display:"inline-block", background:cat.color, color:"#fff", fontSize:14,
                  fontWeight:800, padding:"7px 18px", borderRadius:99, margin:"10px 0 4px", boxShadow:`0 6px 16px ${cat.color}55` }}>
                  {cat.label}
                </div>
                <p style={{ fontSize:11, color:"#a5a3c4", margin:"4px 0 12px" }}>Klasifikasi Hart dan Staveland (1988)</p>
                <div style={{ background:cat.color+"14", border:`2px solid ${cat.color}33`, borderRadius:18,
                  padding:"12px 16px", marginBottom:18, fontSize:13, color:"#3f3d63", lineHeight:1.6, fontWeight:600 }}>
                  {CAT_MESSAGE[cat.label]}
                </div>

                <div style={{ textAlign:"left", display:"flex", flexDirection:"column", gap:8, marginBottom:18 }}>
                  {DIMENSIONS.map((d, i) => {
                    const m = DIM_META[d.id];
                    return (
                      <div key={d.id} className="tlx-up" style={{ display:"flex", alignItems:"center", gap:10,
                        background:m.soft, borderRadius:16, padding:"10px 12px", animationDelay:`${i*0.06}s` }}>
                        <DimIcon id={d.id} size={34}/>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                            <span style={{ fontSize:12, fontWeight:700, color:"#3f3d63" }}>{d.label}</span>
                            <span className="fd" style={{ fontSize:15, fontWeight:700, color:m.color }}>{ratings[d.id]}</span>
                          </div>
                          <div style={{ height:7, background:"#fff", borderRadius:99, marginTop:5 }}>
                            <div style={{ height:"100%", width:ratings[d.id]+"%", background:m.color, borderRadius:99 }}/>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:3, marginTop:5 }}>
                            <span style={{ fontSize:10, color:"#8b89ad", fontWeight:600, marginRight:3 }}>Bobot</span>
                            {Array.from({ length:5 }).map((_, k) => (
                              <span key={k} style={{ width:8, height:8, borderRadius:"50%",
                                background: k < result.weights[d.id] ? m.color : "#fff", border:`1.5px solid ${m.color}66` }}/>
                            ))}
                            <span style={{ fontSize:10, color:"#8b89ad", marginLeft:3 }}>dipilih {result.weights[d.id]}×</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ background:"#f8f7ff", borderRadius:16, padding:"12px 16px", marginBottom:4, textAlign:"left",
                  display:"flex", gap:10, alignItems:"center" }}>
                  <span style={{ fontSize:22 }}>💬</span>
                  <p style={{ fontSize:12, color:"#5f5d80", margin:0, lineHeight:1.6 }}>
                    Satu langkah lagi! Kami ingin mendengar cerita Anda di halaman Refleksi Kerja. Data baru tersimpan setelah Anda menekan tombol Kirim di sana.
                  </p>
                </div>
                <button className="tlx-btn" style={S.pBtn} onClick={() => go(()=>setStep(4))}>Lanjut ke Refleksi Kerja →</button>
              </div>
            );
          })()}

          {/* STEP 4: Refleksi Kerja */}
          {step === 4 && result && (
            <div>
              <H3 icon="💬" title="Refleksi Kerja" sub="Bantu kami memahami cerita di balik skor Anda."/>

              <Section icon="📝" color="#f3efff" title="Apa yang membuat beban kerja Anda terasa seperti ini pada periode ini?">
                <p style={{ fontSize:12, color:"#8b89ad", margin:"0 0 8px", lineHeight:1.5 }}>
                  Ceritakan situasi, tugas, atau kondisi yang paling berpengaruh terhadap beban kerja Anda.
                </p>
                <textarea
                  value={ceritaBeban} onChange={e=>setCeritaBeban(e.target.value)}
                  placeholder="Contoh: bulan ini saya menangani 3 proyek sekaligus dengan deadline berdekatan, ditambah banyak rapat mendadak..."
                  rows={4}
                  style={{ ...S.inp, resize:"vertical", lineHeight:1.6, fontSize:13 }}
                  onFocus={e=>e.target.style.borderColor="#6366f1"}
                  onBlur={e=>e.target.style.borderColor="#e7e5f4"}
                />
              </Section>

              <Section icon="🧠" color="#ecf8fe" title="Apakah Anda sedang membutuhkan pendampingan psikolog?">
                <p style={{ fontSize:12, color:"#8b89ad", margin:"0 0 10px", lineHeight:1.5 }}>
                  Tersedia untuk individu, pasangan, maupun keluarga.
                </p>
                <Chips options={PSIKOLOG_OPTS} value={butuhPsikolog} onChange={setButuhPsikolog} color="#0ea5e9"/>
              </Section>

              <Section icon="🧭" color="#fefae8" title="Apakah Anda tertarik untuk mengikuti program Tour of Duty?">
                <p style={{ fontSize:12, color:"#8b89ad", margin:"0 0 10px", lineHeight:1.5 }}>
                  Program magang di unit lain.
                </p>
                <Chips options={TOD_OPTS} value={tourOfDuty} onChange={setTourOfDuty} color="#ca8a04"/>
              </Section>

              <Section icon="🏖️" color="#eafaf3" title="Soal Cuti">
                <p style={{ fontSize:13, color:"#3f3d63", fontWeight:700, margin:"0 0 8px" }}>Apakah Anda merasa butuh cuti dalam waktu dekat?</p>
                <Chips options={BUTUH_CUTI_OPTS} value={butuhCuti} onChange={setButuhCuti} color="#10b981"/>
                <div style={{ height:1, background:"#efedfb", margin:"14px 0" }}/>
                <p style={{ fontSize:13, color:"#3f3d63", fontWeight:700, margin:"0 0 8px" }}>Apakah Anda merasa kesulitan untuk mengajukan cuti?</p>
                <Chips options={SULIT_CUTI_OPTS} value={kesulitanCuti} onChange={setKesulitanCuti} color="#10b981"/>
              </Section>

              <Section icon="💡" color="#fefae8" title="Evaluasi dan masukan untuk pengukuran ini">
                <p style={{ fontSize:12, color:"#8b89ad", margin:"0 0 8px", lineHeight:1.5 }}>
                  Ada saran untuk memperbaiki kuesioner atau platform ini? Kami sangat terbuka.
                </p>
                <textarea
                  value={masukanApp} onChange={e=>setMasukanApp(e.target.value)}
                  placeholder="Contoh: pertanyaannya sudah cukup jelas, tapi mungkin bisa ditambahkan..."
                  rows={3}
                  style={{ ...S.inp, resize:"vertical", lineHeight:1.6, fontSize:13 }}
                  onFocus={e=>e.target.style.borderColor="#6366f1"}
                  onBlur={e=>e.target.style.borderColor="#e7e5f4"}
                />
              </Section>

              <button className="tlx-btn" style={{ ...S.pBtn, opacity: refleksiOk ? 1 : 0.45 }}
                onClick={() => refleksiOk && go(()=>setStep(5))}>
                Lanjut ke Wellbeing Buddies →
              </button>
              {!refleksiOk && (
                <p style={{ fontSize:11, color:"#f43f5e", textAlign:"center", marginTop:10, fontWeight:600 }}>
                  Mohon jawab pertanyaan Psikolog, Tour of Duty, dan kedua pertanyaan Cuti dulu ya.
                </p>
              )}
            </div>
          )}

          {/* STEP 5: Wellbeing Buddies */}
          {step === 5 && result && (
            <div>
              <H3 icon="🤝" title="Wellbeing Buddies" sub="Rekan kerja tempat berbagi cerita saat sedang tertekan. Cukup pilih, tidak sampai 1 menit."/>

              <Section icon="💬" color="#fff0f3" title="Mau sesi curhat bersama Wellbeing Buddies?">
                <Chips options={WBB_OPTS} value={sesiWBB} onChange={setSesiWBB} color="#e11d48"/>
              </Section>

              <Section icon="🙂" color="#fff0f3" title="Seberapa nyaman Anda bercerita ke Wellbeing Buddies saat sedang tertekan?">
                <p style={{ fontSize:12, color:"#8b89ad", margin:"-2px 0 10px", lineHeight:1.5 }}>Baik soal pekerjaan maupun di luar pekerjaan.</p>
                <Scale options={WBB_NYAMAN_OPTS} value={wbbNyaman} onChange={setWbbNyaman}/>
              </Section>

              <Section icon="⭐" color="#fff0f3" title="Seberapa penting punya rekan kerja untuk tempat berdiskusi saat tertekan?">
                <Scale options={WBB_PENTING_OPTS} value={wbbPenting} onChange={setWbbPenting}/>
              </Section>

              <Section icon="🗂️" color="#fff0f3" title="Topik apa yang nyaman Anda bahas?">
                <p style={{ fontSize:12, color:"#8b89ad", margin:"-2px 0 10px", lineHeight:1.5 }}>Boleh pilih lebih dari satu.</p>
                <MultiChips options={WBB_TOPIK_OPTS} value={wbbTopik} onChange={setWbbTopik}/>
              </Section>

              <Section icon="🫶" color="#fff0f3" title="Dukungan apa yang paling Anda harapkan?">
                <p style={{ fontSize:12, color:"#8b89ad", margin:"-2px 0 10px", lineHeight:1.5 }}>Pilih satu.</p>
                <Chips options={WBB_DUKUNGAN_OPTS.map(o => ({ value:o, label:o, emoji:"" }))} value={wbbDukungan} onChange={setWbbDukungan} color="#e11d48"/>
              </Section>

              <button className="tlx-btn"
                style={{ ...S.pBtn, opacity: wbbOk ? 1 : 0.45, background:"#059669",
                  boxShadow:"0 4px 12px rgba(5,150,105,.22)" }}
                onClick={wbbOk && !saving ? submitRefleksi : undefined}>
                {saving ? "⏳ Menyimpan..." : "Kirim dan Selesai ✓"}
              </button>
              <p style={{ fontSize:11, color: wbbOk ? "#8b89ad" : "#f43f5e", textAlign:"center", marginTop:10, fontWeight:600 }}>
                {wbbOk ? "Data Anda baru tersimpan setelah tombol ini diklik." : "Mohon jawab semua pertanyaan Wellbeing Buddies dulu ya."}
              </p>
              <div style={{ marginTop:14, padding:"12px 14px", borderRadius:14, background:"#f8f7fc", border:"1px solid #ecebf3",
                display:"flex", gap:10, alignItems:"flex-start" }}>
                <span style={{ fontSize:16, lineHeight:1.3 }}>ℹ️</span>
                <p style={{ fontSize:12, color:"#5f5d80", margin:0, lineHeight:1.6 }}>
                  Data yang diinput akan menjadi bahan input dan evaluasi bagi Pimpinan dan Line Manager.
                </p>
              </div>
            </div>
          )}

          {/* STEP 6: Konfirmasi */}
          {step === 6 && (
            <div style={{ textAlign:"center", position:"relative" }}>
              <Confetti/>
              <div className="tlx-pop" style={{ display:"flex", justifyContent:"center" }}>
                <Mascot mood="party" size={130}/>
              </div>
              <h3 className="fd" style={{ fontSize:26, fontWeight:700, color:"#1e1b4b", margin:"4px 0 6px" }}>Yeay, Data Anda Tersimpan! 🎉</h3>
              <p style={{ color:"#5f5d80", fontSize:13, margin:"0 0 6px", lineHeight:1.7 }}>
                Terima kasih, <strong>{name}</strong>. Seluruh jawaban Anda telah berhasil direkam.
              </p>
              <p style={{ color:"#8b89ad", fontSize:12, margin:"0 0 20px", lineHeight:1.6 }}>
                🔒 Identitas dan jawaban Anda bersifat <strong>rahasia</strong> dan hanya dapat diakses oleh admin.
              </p>

              <div style={{ background:"#f8f7ff", border:"2px dashed #d9d6fb", borderRadius:20,
                padding:"16px 18px", marginBottom:20, textAlign:"left", position:"relative", zIndex:3 }}>
                <div className="fd" style={{ fontSize:15, fontWeight:600, color:"#6366f1", marginBottom:10 }}>🧾 Ringkasan Pengisian</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {[
                    ["Nama", name],
                    ["Periode", `${bulan} ${tahun}`],
                    ["Skor NASA-TLX", result ? `${result.score.toFixed(1)} (${getCategory(result.score).label})` : "-", result ? getCategory(result.score).color : null],
                    ["Pendampingan Psikolog", butuhPsikolog || "-"],
                    ["Sesi Wellbeing Buddies", sesiWBB || "-"],
                    ["Minat Tour of Duty", tourOfDuty || "-"],
                    ["Butuh Cuti", butuhCuti || "-"],
                    ["Kesulitan Mengajukan Cuti", kesulitanCuti || "-"],
                  ].map(([k, v, c]) => (
                    <div key={k} style={{ display:"flex", justifyContent:"space-between", gap:10, fontSize:13 }}>
                      <span style={{ color:"#6b6990" }}>{k}</span>
                      <span style={{ fontWeight:800, color: c || "#1e1b4b", textAlign:"right" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button className="tlx-btn" style={{ ...S.oBtn, position:"relative", zIndex:3 }} onClick={() => go(()=>setScreen("home"))}>🏠 Kembali ke Beranda</button>
            </div>
          )}
        </div>
      </div>
    </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════════════════════
  if (screen === "dashboard") {
    const avg    = filtered.length ? filtered.reduce((s,r)=>s+r.score,0)/filtered.length : 0;
    const cat    = getCategory(avg);
    const dimAvg = DIMENSIONS.map(d => ({
      ...d, avg: filtered.length ? filtered.reduce((s,r)=>s+(r.ratings[d.id]||0),0)/filtered.length : 0,
    })).sort((a,b)=>b.avg-a.avg);
    const distData = ["Sangat Rendah","Rendah","Sedang","Tinggi","Sangat Tinggi"].map(lb => ({
      label: lb,
      color: getCategory(lb==="Sangat Rendah"?0:lb==="Rendah"?25:lb==="Sedang"?50:lb==="Tinggi"?70:90).color,
      count: filtered.filter(r=>getCategory(r.score).label===lb).length,
    }));
    const availYears = ["Semua", ...YEARS.filter(y=>responses.some(r=>String(r.tahun)===String(y)))];

    return (
      <div style={S.page}>
        <GlobalStyle/>

        {/* ── EDIT MODAL ── */}
        {editRow && (
          <div style={{ position:"fixed", inset:0, background:"rgba(15,15,40,0.55)", zIndex:100,
            display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
            <div style={{ background:"#fff", borderRadius:20, padding:"24px 24px", width:"100%", maxWidth:560,
              maxHeight:"90vh", overflowY:"auto", boxShadow:"0 8px 40px rgba(0,0,0,0.2)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:16, color:"#1e1b4b" }}>Edit Data: {editRow.name}</div>
                  <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>Skor dihitung ulang otomatis setelah simpan</div>
                </div>
                <button onClick={()=>setEditRow(null)}
                  style={{ background:"#f1f5f9", border:"none", borderRadius:99, width:32, height:32,
                    fontSize:16, cursor:"pointer", fontFamily:"inherit", color:"#64748b" }}>✕</button>
              </div>

              {/* Biodata */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
                {[
                  { lbl:"Nama", key:"name", full:true },
                  { lbl:"NIP",  key:"nip" },
                ].map(f => (
                  <div key={f.key} style={{ gridColumn: f.full?"1/-1":"auto" }}>
                    <label style={S.lbl}>{f.lbl}</label>
                    <input style={S.inp} value={editRow[f.key]||""}
                      onChange={e=>setEditRow(r=>({...r,[f.key]:e.target.value}))}
                      onFocus={e=>e.target.style.borderColor="#4f46e5"}
                      onBlur={e=>e.target.style.borderColor="#e2e8f0"}/>
                  </div>
                ))}
                <div>
                  <label style={S.lbl}>Pangkat</label>
                  <SelectWrap value={editRow.pangkat||""} onChange={e=>setEditRow(r=>({...r,pangkat:e.target.value}))}>
                    <option value="">-- Pilih --</option>
                    {PANGKAT_LIST.map(p=><option key={p} value={p}>{p}</option>)}
                  </SelectWrap>
                </div>
                <div>
                  <label style={S.lbl}>Unit Kerja</label>
                  <SelectWrap value={editRow.unit||""} onChange={e=>setEditRow(r=>({...r,unit:e.target.value}))}>
                    <option value="">-- Pilih --</option>
                    {UNIT_LIST.map(u=><option key={u} value={u}>{u}</option>)}
                  </SelectWrap>
                </div>
                <div>
                  <label style={S.lbl}>Bulan</label>
                  <SelectWrap value={editRow.bulan||""} onChange={e=>setEditRow(r=>({...r,bulan:e.target.value}))}>
                    <option value="">-- Pilih --</option>
                    {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
                  </SelectWrap>
                </div>
                <div>
                  <label style={S.lbl}>Tahun</label>
                  <SelectWrap value={editRow.tahun||""} onChange={e=>setEditRow(r=>({...r,tahun:e.target.value}))}>
                    <option value="">-- Pilih --</option>
                    {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
                  </SelectWrap>
                </div>
              </div>

              {/* Ratings */}
              <div style={{ fontSize:11, fontWeight:700, color:"#6366f1", textTransform:"uppercase",
                letterSpacing:"0.08em", marginBottom:10 }}>Rating Dimensi (0–100)</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
                {DIMENSIONS.map(d => (
                  <div key={d.id} style={{ background:"#f8f7ff", borderRadius:12, padding:"10px 12px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:"#475569" }}>{d.label}</span>
                      <span style={{ fontSize:13, fontWeight:800, color:"#4f46e5" }}>{editRow.ratings?.[d.id]??0}</span>
                    </div>
                    <input type="range" min={0} max={100} step={5}
                      value={editRow.ratings?.[d.id]??0}
                      onChange={e=>setEditRow(r=>({...r, ratings:{...r.ratings,[d.id]:+e.target.value}}))}
                      style={{ width:"100%", accentColor:"#4f46e5", cursor:"pointer" }}/>
                  </div>
                ))}
              </div>

              {/* Weights */}
              <div style={{ fontSize:11, fontWeight:700, color:"#6366f1", textTransform:"uppercase",
                letterSpacing:"0.08em", marginBottom:10 }}>Bobot Pairwise (0–5)</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
                {DIMENSIONS.map(d => (
                  <div key={d.id} style={{ background:"#f8f7ff", borderRadius:12, padding:"10px 12px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:"#475569" }}>{d.label}</span>
                      <span style={{ fontSize:13, fontWeight:800, color:"#4f46e5" }}>{editRow.weights?.[d.id]??0}</span>
                    </div>
                    <input type="range" min={0} max={5} step={1}
                      value={editRow.weights?.[d.id]??0}
                      onChange={e=>setEditRow(r=>({...r, weights:{...r.weights,[d.id]:+e.target.value}}))}
                      style={{ width:"100%", accentColor:"#6366f1", cursor:"pointer" }}/>
                  </div>
                ))}
              </div>

              {/* Skor preview */}
              {(() => {
                const previewScore = computeScore(editRow.ratings||{}, editRow.weights||{});
                const previewCat = getCategory(previewScore);
                return (
                  <div style={{ background:"#f0f4ff", borderRadius:12, padding:"12px 14px", marginBottom:14,
                    display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ fontSize:12, color:"#475569", fontWeight:600 }}>Preview skor baru:</span>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:20, fontWeight:900, color:previewCat.color }}>{previewScore.toFixed(1)}</span>
                      <span style={{ background:previewCat.color+"18", color:previewCat.color,
                        padding:"2px 10px", borderRadius:99, fontSize:11, fontWeight:700 }}>{previewCat.label}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Refleksi fields */}
              <div style={{ marginBottom:12 }}>
                <label style={S.lbl}>Cerita Beban Kerja</label>
                <textarea rows={3} style={{ ...S.inp, resize:"vertical", fontSize:12, lineHeight:1.6 }}
                  value={editRow.ceritaBeban||""}
                  onChange={e=>setEditRow(r=>({...r,ceritaBeban:e.target.value}))}
                  onFocus={e=>e.target.style.borderColor="#4f46e5"}
                  onBlur={e=>e.target.style.borderColor="#e2e8f0"}/>
              </div>
              <div style={{ marginBottom:12 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div>
                    <label style={S.lbl}>Pendampingan Psikolog</label>
                    <SelectWrap value={editRow.butuhPsikolog||""} onChange={e=>setEditRow(r=>({...r,butuhPsikolog:e.target.value}))}>
                      <option value="">Pilih</option>
                      {PSIKOLOG_OPTS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                    </SelectWrap>
                  </div>
                  <div>
                    <label style={S.lbl}>Wellbeing Buddies</label>
                    <SelectWrap value={editRow.sesiWBB||""} onChange={e=>setEditRow(r=>({...r,sesiWBB:e.target.value}))}>
                      <option value="">Pilih</option>
                      {WBB_OPTS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                    </SelectWrap>
                  </div>
                  <div>
                    <label style={S.lbl}>WB Buddies: Nyaman</label>
                    <SelectWrap value={editRow.wbbNyaman||""} onChange={e=>setEditRow(r=>({...r,wbbNyaman:e.target.value}))}>
                      <option value="">Pilih</option>
                      {WBB_NYAMAN_OPTS.map(o=><option key={o} value={o}>{o}</option>)}
                    </SelectWrap>
                  </div>
                  <div>
                    <label style={S.lbl}>WB Buddies: Penting</label>
                    <SelectWrap value={editRow.wbbPenting||""} onChange={e=>setEditRow(r=>({...r,wbbPenting:e.target.value}))}>
                      <option value="">Pilih</option>
                      {WBB_PENTING_OPTS.map(o=><option key={o} value={o}>{o}</option>)}
                    </SelectWrap>
                  </div>
                  <div style={{ gridColumn:"1/-1" }}>
                    <label style={S.lbl}>WB Buddies: Dukungan yang diharapkan</label>
                    <SelectWrap value={editRow.wbbDukungan||""} onChange={e=>setEditRow(r=>({...r,wbbDukungan:e.target.value}))}>
                      <option value="">Pilih</option>
                      {WBB_DUKUNGAN_OPTS.map(o=><option key={o} value={o}>{o}</option>)}
                    </SelectWrap>
                  </div>
                  <div style={{ gridColumn:"1/-1" }}>
                    <label style={S.lbl}>WB Buddies: Topik</label>
                    <MultiChips options={WBB_TOPIK_OPTS} value={editRow.wbbTopik||[]} onChange={v=>setEditRow(r=>({...r,wbbTopik:v}))}/>
                  </div>
                  <div>
                    <label style={S.lbl}>Tour of Duty</label>
                    <SelectWrap value={editRow.tourOfDuty||""} onChange={e=>setEditRow(r=>({...r,tourOfDuty:e.target.value}))}>
                      <option value="">Pilih</option>
                      {TOD_OPTS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                    </SelectWrap>
                  </div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
                <div>
                  <label style={S.lbl}>Butuh Cuti</label>
                  <SelectWrap value={editRow.butuhCuti||""} onChange={e=>setEditRow(r=>({...r,butuhCuti:e.target.value}))}>
                    <option value="">Pilih</option>
                    {BUTUH_CUTI_OPTS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </SelectWrap>
                </div>
                <div>
                  <label style={S.lbl}>Kesulitan Mengajukan Cuti</label>
                  <SelectWrap value={editRow.kesulitanCuti||""} onChange={e=>setEditRow(r=>({...r,kesulitanCuti:e.target.value}))}>
                    <option value="">Pilih</option>
                    {SULIT_CUTI_OPTS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </SelectWrap>
                </div>
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={S.lbl}>Masukan Platform</label>
                <textarea rows={3} style={{ ...S.inp, resize:"vertical", fontSize:12, lineHeight:1.6 }}
                  value={editRow.masukanApp||""}
                  onChange={e=>setEditRow(r=>({...r,masukanApp:e.target.value}))}
                  onFocus={e=>e.target.style.borderColor="#4f46e5"}
                  onBlur={e=>e.target.style.borderColor="#e2e8f0"}/>
              </div>

              <div style={{ display:"flex", gap:10 }}>
                <button onClick={()=>setEditRow(null)}
                  style={{ ...S.gBtn, flex:1, textAlign:"center", padding:"12px" }}>Batal</button>
                <button onClick={()=>saveEdit(editRow)}
                  style={{ ...S.pBtn, flex:2, marginTop:0, padding:"12px" }}>
                  {saving ? "⏳ Menyimpan..." : "💾 Simpan Perubahan"}
                </button>
              </div>
            </div>
          </div>
        )}
        <div style={{ width:"100%", maxWidth:760, position:"relative", zIndex:1 }}>

          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            marginBottom:20, flexWrap:"wrap", gap:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <button style={S.gBtn} onClick={() => go(()=>{ setScreen("home"); setAdminUnlocked(false); setAdminPw(""); setShowAdminBox(false); })}>
                ← Home
              </button>
              <Mascot mood="calm" size={46}/>
              <div>
                <div className="fd" style={{ fontWeight:700, fontSize:24, color:"#1e1b4b", lineHeight:1.1 }}>Dashboard</div>
                <div style={{ fontSize:12, color:"#8b89ad", fontWeight:600 }}>{filtered.length} dari {responses.length} responden</div>
              </div>
            </div>
            {adminUnlocked && (
              <div style={{ display:"flex", gap:8 }}>
                <button className="tlx-btn" disabled={exporting}
                  onClick={async()=>{ setExporting(true); try { await exportExcel(filtered); } catch(e) { console.error(e); alert("Gagal membuat file Excel. Periksa koneksi internet lalu coba lagi."); } setExporting(false); }}
                  style={{ ...S.gBtn, background:"#059669", color:"#fff", border:"none", padding:"10px 16px" }}>
                  {exporting ? "⏳ Menyiapkan..." : "📗 Ekspor Excel"}
                </button>
                <button onClick={async()=>{ if(window.confirm("Hapus semua data?")){ setLoading(true); try{ const snap=await getDocs(collection(db,"responses")); await Promise.all(snap.docs.map(d=>deleteDoc(doc(db,"responses",d.id)))); setResponses([]); }catch(e){console.error(e);} setLoading(false); }}}
                  style={{ ...S.gBtn, background:"#fee2e2", color:"#ef4444" }}>🗑 Hapus</button>
              </div>
            )}
          </div>

          {/* Filter */}
          <div style={{ background:"#fff", borderRadius:16, padding:"18px 20px",
            boxShadow:"0 1px 8px rgba(79,70,229,0.07)", marginBottom:16 }}>
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <label style={S.lbl}>Bulan <span style={{ color:"#c7d2fe", fontWeight:500, textTransform:"none", letterSpacing:0 }}>(pilih satu atau lebih)</span></label>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={()=>setFilterBulan([...MONTHS])}
                    style={{ fontSize:11, color:"#4f46e5", background:"#eef2ff", border:"none",
                      borderRadius:7, padding:"3px 10px", cursor:"pointer", fontWeight:700, fontFamily:"inherit" }}>Semua</button>
                  <button onClick={()=>setFilterBulan([])}
                    style={{ fontSize:11, color:"#94a3b8", background:"#f1f5f9", border:"none",
                      borderRadius:7, padding:"3px 10px", cursor:"pointer", fontWeight:600, fontFamily:"inherit" }}>Kosongkan</button>
                </div>
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                {MONTHS.map(m => {
                  const active  = filterBulan.includes(m);
                  const hasData = responses.some(r => r.bulan === m);
                  return (
                    <button key={m} onClick={() => toggleBulan(m)}
                      style={{ padding:"6px 13px", borderRadius:99, fontSize:12, fontWeight:700,
                        cursor:"pointer", fontFamily:"inherit", border:"1.5px solid",
                        borderColor: active?"#4f46e5":"#e2e8f0",
                        background: active?"#4f46e5":"#f8f7ff",
                        color: active?"#fff":hasData?"#4f46e5":"#94a3b8",
                        opacity: hasData?1:0.5, transition:"all .15s",
                        boxShadow: active?"0 2px 8px rgba(79,70,229,0.25)":"none" }}>
                      {m.slice(0,3)}{active && <span style={{ marginLeft:4, fontSize:10 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"flex-end" }}>
              <div style={{ flex:"1 1 110px" }}>
                <label style={{ ...S.lbl, marginBottom:5 }}>Tahun</label>
                <SelectWrap value={filterTahun} onChange={e=>setFilterTahun(e.target.value)}>
                  {availYears.map(y=><option key={y} value={y}>{y}</option>)}
                </SelectWrap>
              </div>
              <div style={{ flex:"2 1 160px" }}>
                <label style={{ ...S.lbl, marginBottom:5 }}>Kategori Skor</label>
                <SelectWrap value={filterKat} onChange={e=>setFilterKat(e.target.value)}>
                  {KATEGORI_OPTIONS.map(k=><option key={k} value={k}>{k}</option>)}
                </SelectWrap>
              </div>
              <button onClick={()=>{ setFilterBulan([NOW_MONTH]); setFilterTahun(NOW_YEAR); setFilterKat("Semua"); setFilterUnit("Semua"); setFilterPangkat("Semua"); }}
                style={{ ...S.gBtn, padding:"10px 16px", borderRadius:12, fontSize:12, marginBottom:1 }}>Reset</button>
            </div>

            {/* Filter tambahan — hanya admin */}
            {adminUnlocked && (
              <div style={{ marginTop:14, paddingTop:14, borderTop:"1px dashed #e0e7ff" }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#818cf8", textTransform:"uppercase",
                  letterSpacing:"0.08em", marginBottom:10 }}>🔒 Filter Admin</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"flex-end" }}>
                  <div style={{ flex:"1 1 160px" }}>
                    <label style={{ ...S.lbl, marginBottom:5 }}>Unit Kerja</label>
                    <SelectWrap value={filterUnit} onChange={e=>setFilterUnit(e.target.value)}>
                      <option value="Semua">Semua Unit</option>
                      {UNIT_LIST.map(u=><option key={u} value={u}>{u}</option>)}
                    </SelectWrap>
                  </div>
                  <div style={{ flex:"1 1 160px" }}>
                    <label style={{ ...S.lbl, marginBottom:5 }}>Pangkat</label>
                    <SelectWrap value={filterPangkat} onChange={e=>setFilterPangkat(e.target.value)}>
                      <option value="Semua">Semua Pangkat</option>
                      {PANGKAT_LIST.map(p=><option key={p} value={p}>{p}</option>)}
                    </SelectWrap>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ fontSize:13, color:"#4f46e5", fontWeight:700, marginBottom:14, paddingLeft:2 }}>
            📅 {filterBulan.length===0?"Semua Bulan":filterBulan.length===12?"Semua Bulan":filterBulan.map(m=>m.slice(0,3)).join(", ")}
            {" · "}{filterTahun!=="Semua"?filterTahun:"Semua Tahun"}
            {filterKat!=="Semua"&&<span style={{ marginLeft:8, color:"#94a3b8", fontWeight:500 }}>· {filterKat}</span>}
          </div>

          {loading ? (
            <div style={{ textAlign:"center", padding:"40px", color:"#6366f1", fontSize:13, fontWeight:600 }}>
              ⏳ Memuat data...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ ...S.card, textAlign:"center", padding:"40px 28px" }}>
              <div style={{ fontSize:44, marginBottom:12 }}>🔍</div>
              <h3 style={{ fontWeight:800, color:"#1e1b4b", margin:"0 0 8px" }}>Tidak Ada Data</h3>
              <p style={{ color:"#64748b", fontSize:13 }}>Belum ada responden yang sesuai filter.</p>
            </div>
          ) : (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:14 }}>
                {[
                  { label:"Rata-rata Skor", value:avg.toFixed(1), color:cat.color, sub:cat.label, e:"🎯" },
                  { label:"Jumlah Pengisi", value:filtered.length, color:"#4f46e5", sub:"pegawai", e:"👥" },
                  { label:"Skor Tertinggi", value:Math.max(...filtered.map(r=>r.score)).toFixed(1), color:"#ef4444", sub:"maks", e:"🔥" },
                  { label:"Skor Terendah",  value:Math.min(...filtered.map(r=>r.score)).toFixed(1), color:"#22c55e", sub:"min", e:"🍃" },
                ].map((s, i)=>(
                  <div key={s.label} className="tlx-up" style={{ background:"#fff", borderRadius:20, padding:"16px 14px",
                    boxShadow:"0 6px 18px rgba(79,70,229,0.08)", border:`2px solid ${s.color}22`, animationDelay:`${i*0.06}s` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                      <p style={{ fontSize:10, fontWeight:800, color:"#8b89ad", textTransform:"uppercase", margin:0 }}>{s.label}</p>
                      <span style={{ fontSize:20 }}>{s.e}</span>
                    </div>
                    <p className="fd" style={{ fontSize:30, fontWeight:700, color:s.color, margin:"0 0 2px" }}>{s.value}</p>
                    <p style={{ fontSize:11, color:"#64748b", margin:0, fontWeight:600 }}>{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* ── STACKED BAR CHART — Distribusi per Bulan ── */}
              {(() => {
                const CAT_LABELS = ["Sangat Rendah","Rendah","Sedang","Tinggi","Sangat Tinggi"];
                const CAT_COLORS = ["#22c55e","#3b82f6","#f59e0b","#f97316","#ef4444"];
                const bulanList = MONTHS.filter(m => filtered.some(r => r.bulan === m));
                if (bulanList.length === 0) return null;
                const W = 620, H = 220, padL = 36, padR = 50, padT = 16, padB = 32;
                const innerW = W - padL - padR;
                const innerH = H - padT - padB;
                const barW = Math.min(60, innerW / bulanList.length * 0.55);
                const barGap = innerW / bulanList.length;

                const stackByBulan = bulanList.map(m => {
                  const rows = filtered.filter(r => r.bulan === m);
                  const counts = CAT_LABELS.map(lb => rows.filter(r => getCategory(r.score).label === lb).length);
                  const avgM = rows.length ? rows.reduce((s,r)=>s+r.score,0)/rows.length : 0;
                  const maxS = rows.length ? Math.max(...rows.map(r=>r.score)) : 0;
                  const minS = rows.length ? Math.min(...rows.map(r=>r.score)) : 0;
                  return { m, counts, total: rows.length, avg: avgM, max: maxS, min: minS };
                });

                const maxTotal = Math.max(...stackByBulan.map(d => d.total), 1);
                const yTicks = [0, Math.ceil(maxTotal/2), maxTotal];
                const xPos = (i) => padL + i * barGap + barGap/2;
                const yPos = (v) => padT + innerH * (1 - v / maxTotal);
                const avgYPos = (a) => padT + innerH * (1 - a / 100);

                return (
                  <div style={{ background:"#fff", borderRadius:18, padding:"20px 22px", boxShadow:"0 1px 8px rgba(79,70,229,0.07)", marginBottom:14 }}>
                    <h4 style={{ fontWeight:800, fontSize:15, color:"#1e1b4b", margin:"0 0 4px" }}>Distribusi Beban Kerja per Bulan</h4>
                    <p style={{ fontSize:11, color:"#94a3b8", margin:"0 0 14px" }}>Hover batang untuk detail · titik = rata-rata skor · garis = tren rata-rata</p>
                    <div style={{ overflowX:"auto", position:"relative" }}>
                      <svg width={W} height={H} style={{ display:"block", minWidth:320 }}>
                        {/* Y grid + ticks */}
                        {yTicks.map((t,i) => (
                          <g key={i}>
                            <line x1={padL} y1={yPos(t)} x2={W-padR} y2={yPos(t)} stroke="#f1f5f9" strokeWidth="1"/>
                            <text x={padL-4} y={yPos(t)+4} fontSize="9" fill="#94a3b8" textAnchor="end">{t}</text>
                          </g>
                        ))}
                        {/* Right axis label */}
                        {[0,25,50,75,100].map((s,i) => (
                          <text key={i} x={W-padR+4} y={avgYPos(s)+4} fontSize="8" fill="#4f46e5" opacity="0.7">{s}</text>
                        ))}
                        <text x={W-padR+4} y={padT-4} fontSize="8" fill="#4f46e5" textAnchor="start">skor</text>

                        {/* Stacked bars + invisible hover zone */}
                        {stackByBulan.map((d, bi) => {
                          let stackY = yPos(0);
                          const tooltipLines = [
                            `📅 ${d.m}`,
                            `👥 Total: ${d.total} orang`,
                            `📊 Rata-rata: ${d.avg.toFixed(1)}`,
                            `🔺 Tertinggi: ${d.max.toFixed(1)}`,
                            `🔻 Terendah: ${d.min.toFixed(1)}`,
                            ...CAT_LABELS.map((lb,ci) => d.counts[ci]>0 ? `  ${lb}: ${d.counts[ci]}` : null).filter(Boolean),
                          ];
                          return (
                            <g key={bi}>
                              {d.counts.map((cnt, ci) => {
                                if (cnt === 0) return null;
                                const barH = innerH * cnt / maxTotal;
                                stackY -= barH;
                                return (
                                  <rect key={ci}
                                    x={xPos(bi) - barW/2} y={stackY}
                                    width={barW} height={barH}
                                    fill={CAT_COLORS[ci]} opacity="0.85" rx="2"/>
                                );
                              })}
                              {/* Total label on top */}
                              <text x={xPos(bi)} y={yPos(d.total)-4} fontSize="9" fill="#475569" textAnchor="middle" fontWeight="700">{d.total}</text>
                              {/* X label */}
                              <text x={xPos(bi)} y={H-padB+14} fontSize="10" fill="#64748b" textAnchor="middle">{d.m.slice(0,3)}</text>
                              {/* Invisible hover zone over full bar column */}
                              <rect
                                x={xPos(bi) - barW/2 - 6} y={padT}
                                width={barW + 12} height={innerH}
                                fill="transparent" style={{ cursor:"pointer" }}>
                                <title>{tooltipLines.join("\n")}</title>
                              </rect>
                            </g>
                          );
                        })}

                        {/* Avg line */}
                        {bulanList.length > 1 && stackByBulan.map((d, bi) => {
                          if (bi === 0) return null;
                          const prev = stackByBulan[bi-1];
                          return (
                            <line key={bi}
                              x1={xPos(bi-1)} y1={avgYPos(prev.avg)}
                              x2={xPos(bi)}   y2={avgYPos(d.avg)}
                              stroke="#4f46e5" strokeWidth="2" strokeLinejoin="round"/>
                          );
                        })}
                        {/* Avg dots */}
                        {stackByBulan.map((d, bi) => (
                          <g key={bi}>
                            <circle cx={xPos(bi)} cy={avgYPos(d.avg)} r="5.5" fill="#fff" stroke="#4f46e5" strokeWidth="2"/>
                            <circle cx={xPos(bi)} cy={avgYPos(d.avg)} r="2.5" fill="#4f46e5"/>
                            <text x={xPos(bi)} y={avgYPos(d.avg)-9} fontSize="9" fill="#4f46e5" textAnchor="middle" fontWeight="700">{Math.round(d.avg)}</text>
                          </g>
                        ))}
                      </svg>
                    </div>
                    {/* Legend */}
                    <div style={{ display:"flex", gap:12, marginTop:10, flexWrap:"wrap" }}>
                      {CAT_LABELS.map((lb,i) => (
                        <div key={lb} style={{ display:"flex", alignItems:"center", gap:5 }}>
                          <div style={{ width:9, height:9, borderRadius:2, background:CAT_COLORS[i] }}/>
                          <span style={{ fontSize:10, color:"#64748b" }}>{lb}</span>
                        </div>
                      ))}
                      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <div style={{ width:8, height:8, borderRadius:99, background:"#fff", border:"2px solid #4f46e5" }}/>
                        <span style={{ fontSize:10, color:"#64748b" }}>Rata-rata skor</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── PIE CHART + BAR — Proporsi Workload ── */}
              {(() => {
                const total = distData.reduce((s,d)=>s+d.count,0);
                if (total === 0) return null;
                const R = 70, cx = 90, cy = 85;
                let startAngle = -Math.PI / 2;
                const slices = distData.map(d => {
                  const pct = d.count / total;
                  const end = startAngle + pct * 2 * Math.PI;
                  const large = pct > 0.5 ? 1 : 0;
                  const x1 = cx + R * Math.cos(startAngle);
                  const y1 = cy + R * Math.sin(startAngle);
                  const x2 = cx + R * Math.cos(end);
                  const y2 = cy + R * Math.sin(end);
                  const midAngle = startAngle + pct * Math.PI;
                  const lx = cx + (R * 0.65) * Math.cos(midAngle);
                  const ly = cy + (R * 0.65) * Math.sin(midAngle);
                  const slice = { ...d, pct, x1, y1, x2, y2, large, lx, ly, startAngle, endAngle: end };
                  startAngle = end;
                  return slice;
                }).filter(d => d.count > 0);
                return (
                  <div style={{ background:"#fff", borderRadius:18, padding:"20px 22px", boxShadow:"0 1px 8px rgba(79,70,229,0.07)", marginBottom:14 }}>
                    <h4 style={{ fontWeight:800, fontSize:15, color:"#1e1b4b", margin:"0 0 4px" }}>Proporsi Kategori Beban Kerja</h4>
                    <p style={{ fontSize:11, color:"#94a3b8", margin:"0 0 14px" }}>Distribusi {total} pengukuran pada periode yang dipilih</p>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:20, alignItems:"center" }}>
                      {/* Pie */}
                      <svg width={180} height={170} style={{ flexShrink:0 }}>
                        {slices.map((s,i) => (
                          <path key={i}
                            d={`M${cx},${cy} L${s.x1},${s.y1} A${R},${R} 0 ${s.large},1 ${s.x2},${s.y2} Z`}
                            fill={s.color} opacity="0.88"
                          />
                        ))}
                        {/* Center hole */}
                        <circle cx={cx} cy={cy} r={R*0.48} fill="white"/>
                        <text x={cx} y={cy-6} textAnchor="middle" fontSize="18" fontWeight="800" fill="#1e1b4b">{total}</text>
                        <text x={cx} y={cy+10} textAnchor="middle" fontSize="9" fill="#94a3b8">pengukuran</text>
                        {/* Pct labels inside slices */}
                        {slices.filter(s=>s.pct>0.08).map((s,i)=>(
                          <text key={i} x={s.lx} y={s.ly+3} textAnchor="middle" fontSize="9" fontWeight="700" fill="white">
                            {Math.round(s.pct*100)}%
                          </text>
                        ))}
                      </svg>
                      {/* Legend + bars */}
                      <div style={{ flex:1, minWidth:160 }}>
                        {distData.map(d => (
                          <div key={d.label} style={{ marginBottom:10 }}>
                            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                <div style={{ width:10, height:10, borderRadius:3, background:d.color, flexShrink:0 }}/>
                                <span style={{ fontSize:12, fontWeight:600, color:"#374151" }}>{d.label}</span>
                              </div>
                              <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                                <span style={{ fontSize:13, fontWeight:800, color:d.color }}>{d.count}</span>
                                <span style={{ fontSize:10, color:"#94a3b8" }}>({total?Math.round(d.count/total*100):0}%)</span>
                              </div>
                            </div>
                            <div style={{ height:6, background:"#f1f5f9", borderRadius:99 }}>
                              <div style={{ height:"100%", width:total?`${(d.count/total)*100}%`:"0%", background:d.color, borderRadius:99, transition:"width .4s" }}/>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div style={{ background:"#fff", borderRadius:18, padding:"20px 22px", boxShadow:"0 1px 8px rgba(79,70,229,0.07)", marginBottom:14 }}>
                <h4 style={{ fontWeight:800, fontSize:15, color:"#1e1b4b", margin:"0 0 14px" }}>Distribusi Kategori Beban Kerja</h4>
                {distData.map(d=>(
                  <div key={d.label} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:"#374151", width:100, flexShrink:0 }}>{d.label}</span>
                    <div style={{ flex:1, height:10, background:"#f1f5f9", borderRadius:99 }}>
                      <div style={{ height:"100%", width:filtered.length?`${(d.count/filtered.length)*100}%`:"0%", background:d.color, borderRadius:99, transition:"width .4s" }}/>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:5, width:60, justifyContent:"flex-end" }}>
                      <span style={{ fontSize:13, fontWeight:800, color:d.color }}>{d.count}</span>
                      <span style={{ fontSize:10, color:"#94a3b8" }}>({filtered.length?((d.count/filtered.length)*100).toFixed(0):0}%)</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background:"#fff", borderRadius:18, padding:"20px 22px", boxShadow:"0 1px 8px rgba(79,70,229,0.07)", marginBottom:14 }}>
                <h4 style={{ fontWeight:800, fontSize:15, color:"#1e1b4b", margin:"0 0 14px" }}>Rata-rata per Dimensi</h4>
                {dimAvg.map(d=>(
                  <div key={d.id} style={{ marginBottom:11 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>{d.label}</span>
                      <span style={{ fontSize:13, fontWeight:800, color:"#4f46e5" }}>{d.avg.toFixed(1)}</span>
                    </div>
                    <div style={{ height:7, background:"#f1f5f9", borderRadius:99 }}>
                      <div style={{ height:"100%", width:d.avg+"%", background:"#6366f1", borderRadius:99 }}/>
                    </div>
                  </div>
                ))}
              </div>

              {adminUnlocked && (
                <div style={{ background:"#fff", borderRadius:18, padding:"20px 22px", boxShadow:"0 1px 8px rgba(79,70,229,0.07)", marginBottom:14 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                    <h4 style={{ fontWeight:800, fontSize:15, color:"#1e1b4b", margin:0 }}>Data Individual</h4>
                    <span style={{ fontSize:11, background:"#fef3c7", color:"#d97706", padding:"3px 10px", borderRadius:99, fontWeight:700 }}>🔒 Admin</span>
                  </div>
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                      <thead>
                        <tr style={{ borderBottom:"2px solid #f1f5f9" }}>
                          {["Nama","NIP","Pangkat","Unit","Bln/Thn","Skor","Kategori","Psikolog","WBB","ToD","Butuh Cuti","Sulit Cuti","Cerita Beban Kerja","Masukan",""].map(h=>(
                            <th key={h} style={{ textAlign:"left", padding:"7px 8px", color:"#94a3b8", fontWeight:700, fontSize:10, textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...filtered].reverse().map((r,i)=>{
                          const c=getCategory(r.score);
                          return (
                            <tr key={i} style={{ borderBottom:"1px solid #f8fafc" }}>
                              <td style={{ padding:"10px 8px", fontWeight:700, color:"#1e1b4b", whiteSpace:"nowrap" }}>{r.name}</td>
                              <td style={{ padding:"10px 8px", color:"#64748b", fontSize:11 }}>{r.nip||"-"}</td>
                              <td style={{ padding:"10px 8px", color:"#64748b", fontSize:11 }}>{r.pangkat||"-"}</td>
                              <td style={{ padding:"10px 8px", color:"#64748b", fontSize:11 }}>{r.unit||"-"}</td>
                              <td style={{ padding:"10px 8px", color:"#94a3b8", fontSize:11, whiteSpace:"nowrap" }}>{r.bulan} {r.tahun}</td>
                              <td style={{ padding:"10px 8px", fontWeight:900, color:c.color, fontSize:15 }}>{r.score.toFixed(1)}</td>
                              <td style={{ padding:"10px 8px" }}>
                                <span style={{ background:c.color+"18", color:c.color, padding:"3px 9px", borderRadius:99, fontSize:10, fontWeight:700, whiteSpace:"nowrap" }}>{c.label}</span>
                              </td>
                              <td style={{ padding:"10px 8px", fontSize:11, color: r.butuhPsikolog==="Ya"?"#4f46e5":r.butuhPsikolog==="Belum Tau"?"#f59e0b":"#94a3b8", fontWeight: r.butuhPsikolog==="Ya"?700:400 }}>{r.butuhPsikolog||"-"}</td>
                              <td style={{ padding:"10px 8px", fontSize:11, whiteSpace:"nowrap", color: r.sesiWBB==="Ya"?"#e11d48":r.sesiWBB==="Belum Tau"?"#f59e0b":"#94a3b8", fontWeight: r.sesiWBB==="Ya"?700:400 }}>{r.sesiWBB||"-"}</td>
                              <td style={{ padding:"10px 8px", fontSize:11, whiteSpace:"nowrap", color: r.tourOfDuty==="Ya"?"#ca8a04":r.tourOfDuty==="Belum Tau"?"#f59e0b":"#94a3b8", fontWeight: r.tourOfDuty==="Ya"?700:400 }}>{r.tourOfDuty||"-"}</td>
                              <td style={{ padding:"10px 8px", fontSize:11, whiteSpace:"nowrap", color: r.butuhCuti==="Ya"?"#10b981":"#94a3b8", fontWeight: r.butuhCuti==="Ya"?700:400 }}>{r.butuhCuti||"-"}</td>
                              <td style={{ padding:"10px 8px", fontSize:11, whiteSpace:"nowrap", color: r.kesulitanCuti==="Ya"?"#ef4444":"#94a3b8", fontWeight: r.kesulitanCuti==="Ya"?700:400 }}>{r.kesulitanCuti||"-"}</td>
                              <td style={{ padding:"10px 8px", color:"#64748b", fontSize:11, maxWidth:160 }}>
                                {r.ceritaBeban ? <span title={r.ceritaBeban}>{r.ceritaBeban.length>40?r.ceritaBeban.slice(0,40)+"…":r.ceritaBeban}</span> : "-"}
                              </td>
                              <td style={{ padding:"10px 8px", color:"#64748b", fontSize:11, maxWidth:120 }}>
                                {r.masukanApp ? <span title={r.masukanApp}>{r.masukanApp.length>30?r.masukanApp.slice(0,30)+"…":r.masukanApp}</span> : "-"}
                              </td>
                              <td style={{ padding:"10px 8px" }}>
                                <div style={{ display:"flex", gap:6 }}>
                                <button
                                  onClick={()=>setEditRow({...r})}
                                  style={{ background:"#eef2ff", color:"#4f46e5", border:"none",
                                    borderRadius:7, padding:"4px 9px", fontSize:11, fontWeight:700,
                                    cursor:"pointer", fontFamily:"inherit" }}>
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={async()=>{
                                    if(window.confirm(`Hapus data milik ${r.name}?`)){
                                      try{
                                        await deleteDoc(doc(db,"responses",r.id));
                                        setResponses(prev=>prev.filter(x=>x.id!==r.id));
                                      }catch(e){console.error(e);}
                                    }
                                  }}
                                  style={{ background:"#fee2e2", color:"#ef4444", border:"none",
                                    borderRadius:7, padding:"4px 9px", fontSize:11, fontWeight:700,
                                    cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
                                  ✕
                                </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {!adminUnlocked && (
            <div style={{ textAlign:"center", marginTop:24, marginBottom:8 }}>
              {!showAdminBox ? (
                <button onClick={()=>setShowAdminBox(true)}
                  style={{ background:"transparent", border:"1px solid #e2e8f0", color:"#94a3b8",
                    borderRadius:10, padding:"7px 18px", fontSize:12, cursor:"pointer",
                    fontFamily:"inherit", fontWeight:600 }}>🔐 Admin Akses</button>
              ) : (
                <div style={{ background:"#fff", borderRadius:14, padding:"16px 18px",
                  boxShadow:"0 2px 12px rgba(0,0,0,0.07)", maxWidth:300, margin:"0 auto", textAlign:"left" }}>
                  <p style={{ fontSize:12, fontWeight:700, color:"#475569", margin:"0 0 10px" }}>Password Admin</p>
                  <input type="password" style={{ ...S.inp, fontSize:13 }} value={adminPw}
                    onChange={e=>{setAdminPw(e.target.value);setAdminError(false);}}
                    placeholder="Masukkan password"
                    onKeyDown={e=>e.key==="Enter"&&tryAdmin()}
                    onFocus={e=>e.target.style.borderColor="#4f46e5"}
                    onBlur={e=>e.target.style.borderColor="#e2e8f0"}/>
                  {adminError&&<p style={{ color:"#ef4444", fontSize:11, marginTop:6 }}>⚠️ Password salah.</p>}
                  <div style={{ display:"flex", gap:8, marginTop:10 }}>
                    <button onClick={()=>{setShowAdminBox(false);setAdminPw("");setAdminError(false);}}
                      style={{ ...S.gBtn, flex:1, textAlign:"center" }}>Batal</button>
                    <button onClick={tryAdmin}
                      style={{ ...S.pBtn, flex:2, marginTop:0, padding:"10px" }}>Masuk</button>
                  </div>
                </div>
              )}
            </div>
          )}

          <p style={{ textAlign:"center", fontSize:11, color:"#c7d2fe", marginTop:16, marginBottom:4, fontWeight:600 }}>
            Overview Beban Kerja KPwBI DIY
          </p>
        </div>
      </div>
    );
  }
}
