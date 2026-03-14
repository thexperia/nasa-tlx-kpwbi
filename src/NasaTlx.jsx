import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";

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
  if (s <= 9)  return { label: "Rendah",       color: "#22c55e" };
  if (s <= 29) return { label: "Sedang",        color: "#3b82f6" };
  if (s <= 49) return { label: "Agak Tinggi",   color: "#f59e0b" };
  if (s <= 79) return { label: "Tinggi",        color: "#f97316" };
  return           { label: "Tinggi Sekali",  color: "#ef4444" };
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
const UNIT_LIST    = ["Kepala Perwakilan","Deputi Kepala Perwakilan","TPKP","FDSEK","FPPUKIS","Unit Kehumasan","PUR","FIKSP","FIPSP","Logistik dan Pengamanan","SDM","Unit Keuangan"];

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



function toCSV(rows) {
  const h = ["Nama","NIP","Pangkat","Unit Kerja","Bulan","Tahun","Tanggal Isi",
    ...DIMENSIONS.map(d=>`Rating_${d.id}`),...DIMENSIONS.map(d=>`Bobot_${d.id}`),"Skor","Kategori","Cerita Beban Kerja","Butuh Psikolog","Masukan Platform"];
  const r = rows.map(r=>[
    r.name,r.nip||"",r.pangkat,r.unit,r.bulan,r.tahun,r.date,
    ...DIMENSIONS.map(d=>r.ratings[d.id]),
    ...DIMENSIONS.map(d=>r.weights[d.id]),
    r.score.toFixed(2), getCategory(r.score).label,
    `"${(r.ceritaBeban||"").replace(/"/g,'""')}"`, r.butuhPsikolog||"-",
    `"${(r.masukanApp||"").replace(/"/g,'""')}"`,
  ]);
  return [h,...r].map(x=>x.join(",")).join("\n");
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
export default function App() {
  const [screen,        setScreen]        = useState("home");
  const [step,          setStep]          = useState(0);
  const [name,          setName]          = useState("");
  const [nip,           setNip]           = useState("");
  const [pangkat,       setPangkat]       = useState("");
  const [unit,          setUnit]          = useState("");
  const [bulan,         setBulan]         = useState("");
  const [tahun,         setTahun]         = useState("");
  const [ratings,       setRatings]       = useState(Object.fromEntries(DIMENSIONS.map(d=>[d.id,50])));
  const [pairs,         setPairs]         = useState([]);
  const [pairChoices,   setPairChoices]   = useState({});
  const [result,        setResult]        = useState(null);
  const [responses,     setResponses]     = useState([]);
  const [ceritaBeban,   setCeritaBeban]   = useState("");
  const [butuhPsikolog, setButuhPsikolog] = useState("");
  const [masukanApp,    setMasukanApp]    = useState("");
  const [loading,       setLoading]       = useState(false);
  const [saving,        setSaving]        = useState(false);

  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPw,       setAdminPw]       = useState("");
  const [adminError,    setAdminError]    = useState(false);
  const [showAdminBox,  setShowAdminBox]  = useState(false);

  const [filterBulan,   setFilterBulan]   = useState([NOW_MONTH]);
  const [filterTahun,   setFilterTahun]   = useState(NOW_YEAR);
  const [filterKat,     setFilterKat]     = useState("Semua");
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

  function go(fn) { setFade(false); setTimeout(() => { fn(); setFade(true); }, 180); }

  function startForm() {
    setPairs(shuffle(PAIRS)); setPairChoices({});
    setRatings(Object.fromEntries(DIMENSIONS.map(d=>[d.id,50])));
    setName(""); setNip(""); setPangkat(""); setUnit(""); setBulan(""); setTahun("");
    setCeritaBeban(""); setButuhPsikolog(""); setMasukanApp("");
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
      ceritaBeban, butuhPsikolog, masukanApp };
    setSaving(true);
    try {
      await addDoc(collection(db, "responses"), entry);
      await fetchResponses();
    } catch(e) { console.error(e); }
    setSaving(false);
    go(() => setStep(5));
  }

  const allPairs = pairs.length > 0 && pairs.every((_, i) => pairChoices[i] !== undefined);

  function tryAdmin() {
    if (adminPw === "bismillah#21") { setAdminUnlocked(true); setAdminError(false); setShowAdminBox(false); fetchResponses(); }
    else { setAdminError(true); }
  }

  const KATEGORI_OPTIONS = ["Semua","Rendah","Sedang","Agak Tinggi","Tinggi","Tinggi Sekali"];

  const filtered = responses.filter(r => {
    const matchBulan = filterBulan.length === 0 || filterBulan.includes(r.bulan);
    const matchTahun = !filterTahun || filterTahun === "Semua" || String(r.tahun) === String(filterTahun);
    const matchKat   = filterKat === "Semua" || getCategory(r.score).label === filterKat;
    return matchBulan && matchTahun && matchKat;
  });

  function toggleBulan(m) {
    setFilterBulan(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  }

  // ── styles ────────────────────────────────────────────────────────────
  const S = {
    page: { minHeight:"100vh", background:"linear-gradient(150deg,#eef2ff 0%,#f8fafc 55%,#f0fdf4 100%)",
            padding:"28px 16px 40px", fontFamily:"'Plus Jakarta Sans',sans-serif",
            display:"flex", flexDirection:"column", alignItems:"center" },
    card: { background:"#fff", borderRadius:22, boxShadow:"0 2px 24px rgba(79,70,229,0.08)",
            padding:"32px 28px", width:"100%", maxWidth:540,
            opacity: fade?1:0, transform: fade?"translateY(0)":"translateY(10px)",
            transition:"opacity .18s,transform .18s" },
    pBtn: { background:"linear-gradient(135deg,#4f46e5,#6366f1)", color:"#fff", border:"none",
            borderRadius:13, padding:"13px 22px", fontWeight:700, fontSize:14,
            cursor:"pointer", width:"100%", marginTop:14, fontFamily:"inherit",
            boxShadow:"0 4px 14px rgba(99,102,241,0.28)" },
    oBtn: { background:"#fff", color:"#4f46e5", border:"1.5px solid #e0e7ff",
            borderRadius:13, padding:"12px 22px", fontWeight:600, fontSize:14,
            cursor:"pointer", width:"100%", marginTop:8, fontFamily:"inherit" },
    gBtn: { background:"#f1f5f9", color:"#475569", border:"none", borderRadius:10,
            padding:"9px 16px", fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"inherit" },
    inp:  { width:"100%", padding:"12px 14px", borderRadius:12, border:"1.5px solid #e2e8f0",
            fontSize:14, boxSizing:"border-box", outline:"none", fontFamily:"inherit", transition:"border .15s" },
    sel:  { width:"100%", padding:"10px 14px", borderRadius:12, border:"1.5px solid #e2e8f0",
            fontSize:13, boxSizing:"border-box", outline:"none", fontFamily:"inherit",
            background:"#fff", appearance:"none", cursor:"pointer" },
    lbl:  { fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase",
            letterSpacing:"0.07em", marginBottom:6, display:"block" },
    tag:  (c) => ({ background:c+"18", color:c, padding:"3px 12px", borderRadius:99, fontSize:12, fontWeight:700 }),
  };

  function StepBar({ cur, tot }) {
    return (
      <div style={{ display:"flex", gap:6, marginBottom:24 }}>
        {Array.from({ length: tot }).map((_, i) => (
          <div key={i} style={{ flex:i===cur?2.5:1, height:4, borderRadius:99,
            background: i<cur?"#4f46e5":i===cur?"linear-gradient(90deg,#4f46e5,#818cf8)":"#e2e8f0" }}/>
        ))}
      </div>
    );
  }

  function SelectWrap({ value, onChange, children, style }) {
    return (
      <div style={{ position:"relative", ...style }}>
        <select style={S.sel} value={value} onChange={onChange}>{children}</select>
        <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
          pointerEvents:"none", color:"#94a3b8", fontSize:11 }}>▼</span>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // HOME
  // ══════════════════════════════════════════════════════════════════════
  if (screen === "home") return (
    <div style={S.page}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <div style={{ width:"100%", maxWidth:540 }}>
        <div style={{ ...S.card, textAlign:"center" }}>
          {/* Icon Batik Kawung */}
          <div style={{ width:80, height:80, borderRadius:22,
            background:"linear-gradient(135deg,#4f46e5,#818cf8)",
            margin:"0 auto 12px", display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 8px 28px rgba(79,70,229,0.38)" }}>
            <svg width="52" height="52" viewBox="0 0 62 62" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Outer ring */}
              <circle cx="31" cy="31" r="27" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
              {/* Petal top */}
              <ellipse cx="31" cy="14" rx="8" ry="12" fill="none" stroke="white" strokeWidth="2" opacity="0.9"/>
              <ellipse cx="31" cy="14" rx="4" ry="6.5" fill="rgba(255,220,80,0.55)"/>
              {/* Petal bottom */}
              <ellipse cx="31" cy="48" rx="8" ry="12" fill="none" stroke="white" strokeWidth="2" opacity="0.9"/>
              <ellipse cx="31" cy="48" rx="4" ry="6.5" fill="rgba(255,220,80,0.55)"/>
              {/* Petal left */}
              <ellipse cx="14" cy="31" rx="12" ry="8" fill="none" stroke="white" strokeWidth="2" opacity="0.9"/>
              <ellipse cx="14" cy="31" rx="6.5" ry="4" fill="rgba(255,220,80,0.55)"/>
              {/* Petal right */}
              <ellipse cx="48" cy="31" rx="12" ry="8" fill="none" stroke="white" strokeWidth="2" opacity="0.9"/>
              <ellipse cx="48" cy="31" rx="6.5" ry="4" fill="rgba(255,220,80,0.55)"/>
              {/* Center */}
              <circle cx="31" cy="31" r="5.5" fill="white" opacity="0.95"/>
              <circle cx="31" cy="31" r="2.8" fill="rgba(255,220,80,1)"/>
            </svg>
          </div>
          {/* TIMOHO X ON DUTY */}
          <p style={{ fontSize:13, fontWeight:700, color:"#818cf8", letterSpacing:"0.15em",
            textTransform:"uppercase", margin:"0 0 4px" }}>TIMOHO X ON DUTY</p>
          {/* NASA-TLX */}
          <h1 style={{ fontSize:24, fontWeight:800, color:"#1e1b4b", margin:"0 0 5px" }}>NASA-TLX</h1>
          <p style={{ fontSize:13, fontWeight:700, color:"#6366f1", margin:"0 0 20px", letterSpacing:"0.02em" }}>
            Pengukuran Beban Kerja Mental KPwBI DIY
          </p>

          <div style={{ background:"#f8f7ff", border:"1px solid #e0e7ff", borderRadius:14,
            padding:"16px 18px", marginBottom:20, textAlign:"left" }}>
            <p style={{ fontSize:13, color:"#374151", lineHeight:1.75, margin:0 }}>
              <strong>Yth. Bapak/Ibu D'Specialist,</strong><br/>
              Berikut merupakan form pengukuran beban kerja mental. Mohon dapat diisi sesuai
              yang Bapak/Ibu rasakan. Adapun data Bapak/Ibu secara individu akan bersifat{" "}
              <strong>rahasia</strong> dan tidak akan dipublikasikan.
            </p>
          </div>

          <button style={S.pBtn} onClick={startForm}>Mulai Pengisian →</button>
          <button style={S.oBtn} onClick={() => go(() => setScreen("dashboard"))}>📊 Dashboard</button>

          {/* Fun Fact */}
          <div style={{ marginTop:20, background:"linear-gradient(135deg,#f0f4ff,#fafbff)",
            border:"1px solid #e0e7ff", borderRadius:14, padding:"14px 16px", textAlign:"left" }}>
            <div style={{ fontSize:10, fontWeight:800, color:"#6366f1", letterSpacing:"0.12em",
              textTransform:"uppercase", marginBottom:6 }}>💡 Tahukah Anda?</div>
            <p style={{ fontSize:12, color:"#475569", lineHeight:1.7, margin:0 }}>{funFact}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════
  // FORM
  // ══════════════════════════════════════════════════════════════════════
  if (screen === "form") return (
    <div style={S.page}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <div style={{ width:"100%", maxWidth:540 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
          <button style={S.gBtn} onClick={() => step===0 ? go(()=>setScreen("home")) : go(()=>setStep(step-1))}>← Kembali</button>
          <span style={{ fontSize:12, color:"#94a3b8" }}>Langkah {step+1} dari 5</span>
        </div>
        <StepBar cur={step} tot={5}/>

        <div style={S.card}>

          {/* STEP 0 — Biodata */}
          {step === 0 && <>
            <h3 style={{ fontSize:20, fontWeight:800, color:"#1e1b4b", margin:"0 0 4px" }}>Data Diri</h3>
            <p style={{ color:"#64748b", fontSize:13, margin:"0 0 22px" }}>Isi data diri Anda sebelum memulai pengisian kuesioner.</p>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={S.lbl}>Nama Lengkap</label>
                <input style={S.inp} value={name} onChange={e=>setName(e.target.value)}
                  placeholder="Masukkan nama lengkap Anda"
                  onFocus={e=>e.target.style.borderColor="#4f46e5"}
                  onBlur={e=>e.target.style.borderColor="#e2e8f0"}/>
              </div>
              <div>
                <label style={S.lbl}>NIP</label>
                <input style={S.inp} value={nip} onChange={e=>setNip(e.target.value)}
                  placeholder="Masukkan NIP Anda"
                  onFocus={e=>e.target.style.borderColor="#4f46e5"}
                  onBlur={e=>e.target.style.borderColor="#e2e8f0"}/>
              </div>
              <div>
                <label style={S.lbl}>Pangkat</label>
                <SelectWrap value={pangkat} onChange={e=>setPangkat(e.target.value)}>
                  <option value="">-- Pilih Pangkat --</option>
                  {PANGKAT_LIST.map(p=><option key={p} value={p}>{p}</option>)}
                </SelectWrap>
              </div>
              <div>
                <label style={S.lbl}>Unit Kerja</label>
                <SelectWrap value={unit} onChange={e=>setUnit(e.target.value)}>
                  <option value="">-- Pilih Unit Kerja --</option>
                  {UNIT_LIST.map(u=><option key={u} value={u}>{u}</option>)}
                </SelectWrap>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={S.lbl}>Bulan Pengisian</label>
                  <SelectWrap value={bulan} onChange={e=>setBulan(e.target.value)}>
                    <option value="">-- Pilih Bulan --</option>
                    {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
                  </SelectWrap>
                </div>
                <div>
                  <label style={S.lbl}>Tahun Pengisian</label>
                  <SelectWrap value={tahun} onChange={e=>setTahun(e.target.value)}>
                    <option value="">-- Pilih Tahun --</option>
                    {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
                  </SelectWrap>
                </div>
              </div>
            </div>
            <button
              style={{ ...S.pBtn, opacity:(name.trim()&&nip.trim()&&pangkat&&unit&&bulan&&tahun)?1:0.45 }}
              onClick={() => name.trim()&&nip.trim()&&pangkat&&unit&&bulan&&tahun && go(()=>setStep(1))}>
              Lanjut ke Penilaian →
            </button>
          </>}

          {/* STEP 1 — Rating */}
          {step === 1 && <>
            <h3 style={{ fontSize:20, fontWeight:800, color:"#1e1b4b", margin:"0 0 4px" }}>Penilaian Dimensi</h3>
            <p style={{ color:"#64748b", fontSize:13, margin:"0 0 18px", lineHeight:1.6 }}>
              Geser slider sesuai kondisi yang Anda rasakan saat bekerja.<br/>
              <span style={{ color:"#94a3b8" }}>0 = tidak sama sekali · 100 = sangat terasa</span>
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {DIMENSIONS.map(d => (
                <div key={d.id} style={{ background:"#f8f7ff", borderRadius:16, padding:"16px 18px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <span style={{ fontWeight:800, fontSize:14, color:"#1e1b4b" }}>{d.label}</span>
                    <span style={{ fontSize:18, fontWeight:800, color:"#4f46e5", minWidth:36, textAlign:"right" }}>{ratings[d.id]}</span>
                  </div>
                  <p style={{ fontSize:12, color:"#6b7280", margin:"0 0 12px", lineHeight:1.6 }}>{d.desc}</p>
                  <input type="range" min={0} max={100} step={5} value={ratings[d.id]}
                    onChange={e=>setRatings(r=>({...r,[d.id]:+e.target.value}))}
                    style={{ width:"100%", accentColor:"#4f46e5", cursor:"pointer" }}/>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                    <span style={{ fontSize:10, color:"#c7d2fe" }}>Rendah</span>
                    <span style={{ fontSize:10, color:"#c7d2fe" }}>Tinggi</span>
                  </div>
                </div>
              ))}
            </div>
            <button style={S.pBtn} onClick={()=>go(()=>setStep(2))}>Lanjut ke Pembobotan →</button>
          </>}

          {/* STEP 2 — Pairwise */}
          {step === 2 && <>
            <h3 style={{ fontSize:20, fontWeight:800, color:"#1e1b4b", margin:"0 0 4px" }}>Pembobotan Faktor</h3>
            <p style={{ color:"#64748b", fontSize:13, margin:"0 0 10px", lineHeight:1.6 }}>
              Dari setiap pasangan berikut, pilih faktor yang <strong>lebih terasa berat</strong> dalam pekerjaan Anda.
            </p>
            <div style={{ background:"#eef2ff", borderRadius:10, padding:"8px 14px", marginBottom:16,
              fontSize:12, color:"#4f46e5", fontWeight:600 }}>
              ✅ {Object.keys(pairChoices).length} / {pairs.length} pasangan terjawab
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10, maxHeight:400, overflowY:"auto", paddingRight:2 }}>
              {pairs.map((pair, i) => (
                <div key={i} style={{ border:`1.5px solid ${pairChoices[i]?"#c7d2fe":"#f1f5f9"}`,
                  borderRadius:14, padding:"13px", background:pairChoices[i]?"#fafbff":"#fff" }}>
                  <p style={{ fontSize:10, color:"#94a3b8", textAlign:"center", margin:"0 0 9px", fontWeight:600 }}>
                    Pasangan {i+1} — mana yang lebih berat?
                  </p>
                  <div style={{ display:"flex", gap:8 }}>
                    {pair.map(dim => (
                      <button key={dim.id}
                        onClick={() => setPairChoices(p=>({...p,[i]:dim.id}))}
                        style={{ flex:1, padding:"11px 8px", borderRadius:11, border:"1.5px solid",
                          borderColor: pairChoices[i]===dim.id?"#4f46e5":"#e2e8f0",
                          background: pairChoices[i]===dim.id?"linear-gradient(135deg,#4f46e5,#818cf8)":"#fff",
                          color: pairChoices[i]===dim.id?"#fff":"#1e1b4b",
                          fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"all .15s" }}>
                        <div style={{ fontSize:10, opacity:.7, marginBottom:3 }}>{dim.id}</div>
                        {dim.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button style={{ ...S.pBtn, opacity:allPairs?1:0.45 }} onClick={allPairs?finishPairwise:undefined}>
              {allPairs ? "Hitung Hasil Saya →" : `Tersisa ${pairs.length-Object.keys(pairChoices).length} pasangan`}
            </button>
          </>}

          {/* STEP 3 — Hasil */}
          {step === 3 && result && (() => {
            const cat = getCategory(result.score);
            return (
              <div style={{ textAlign:"center" }}>
                <div style={{ width:90, height:90, borderRadius:26, background:cat.color+"15",
                  border:`2px solid ${cat.color}44`, margin:"0 auto 18px",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  boxShadow:`0 8px 24px ${cat.color}22` }}>
                  <span style={{ fontSize:28, fontWeight:900, color:cat.color }}>{result.score.toFixed(1)}</span>
                </div>
                <h3 style={{ fontSize:21, fontWeight:800, color:"#1e1b4b", margin:"0 0 4px" }}>Hasil Pengukuran Anda</h3>
                <p style={{ color:"#64748b", fontSize:13, margin:"0 0 10px" }}>
                  <strong>{name}</strong>, berikut adalah skor beban kerja Anda.
                </p>
                <span style={S.tag(cat.color)}>{cat.label}</span>
                <p style={{ fontSize:11, color:"#94a3b8", marginTop:8, marginBottom:20 }}>Klasifikasi Simanjuntak (2010)</p>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9, marginBottom:22, textAlign:"left" }}>
                  {DIMENSIONS.map(d => (
                    <div key={d.id} style={{ background:"#f8f7ff", borderRadius:12, padding:"12px 14px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:"#475569" }}>{d.label}</span>
                        <span style={{ fontSize:10, background:"#eef2ff", color:"#4f46e5",
                          padding:"1px 6px", borderRadius:99, fontWeight:700 }}>Dipilih {result.weights[d.id]}×</span>
                      </div>
                      <div style={{ fontSize:20, fontWeight:900, color:"#1e1b4b" }}>{ratings[d.id]}</div>
                      <div style={{ height:3, background:"#e2e8f0", borderRadius:99, marginTop:4 }}>
                        <div style={{ height:"100%", width:ratings[d.id]+"%",
                          background:"linear-gradient(90deg,#4f46e5,#818cf8)", borderRadius:99 }}/>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ background:"#f8f7ff", border:"1px solid #e0e7ff", borderRadius:14,
                  padding:"13px 16px", marginBottom:20, textAlign:"left" }}>
                  <p style={{ fontSize:12, color:"#475569", margin:0, lineHeight:1.6 }}>
                    💬 Selanjutnya kami ingin mendengar cerita Anda lebih lanjut. Silakan lanjut ke halaman Refleksi Kerja.
                  </p>
                </div>

                <button style={S.pBtn} onClick={() => go(()=>setStep(4))}>Lanjut ke Refleksi Kerja →</button>
              </div>
            );
          })()}

          {/* STEP 4 — Refleksi Kerja */}
          {step === 4 && result && (
            <div>
              <h3 style={{ fontSize:20, fontWeight:800, color:"#1e1b4b", margin:"0 0 4px" }}>Refleksi Kerja</h3>
              <p style={{ color:"#64748b", fontSize:13, margin:"0 0 22px", lineHeight:1.6 }}>
                Bantu kami memahami konteks di balik skor Anda.
              </p>

              {/* Kolom 1 — cerita beban kerja */}
              <div style={{ marginBottom:18 }}>
                <label style={S.lbl}>Apa yang membuat beban kerja Anda terasa seperti ini pada periode ini?</label>
                <p style={{ fontSize:11, color:"#94a3b8", margin:"0 0 8px", lineHeight:1.5 }}>
                  Ceritakan situasi, tugas, atau kondisi yang paling berpengaruh terhadap beban kerja Anda.
                </p>
                <textarea
                  value={ceritaBeban} onChange={e=>setCeritaBeban(e.target.value)}
                  placeholder="Contoh: minggu ini saya menangani 3 proyek sekaligus dengan deadline berdekatan, ditambah banyak rapat mendadak yang memotong waktu kerja..."
                  rows={5}
                  style={{ ...S.inp, resize:"vertical", lineHeight:1.6, fontSize:13, padding:"12px 14px" }}
                  onFocus={e=>e.target.style.borderColor="#4f46e5"}
                  onBlur={e=>e.target.style.borderColor="#e2e8f0"}
                />
              </div>

              {/* Kolom 2 — psikolog */}
              <div style={{ marginBottom:18 }}>
                <label style={S.lbl}>Sesi 1-on-1 dengan Psikolog</label>
                <p style={{ fontSize:11, color:"#94a3b8", margin:"0 0 8px", lineHeight:1.5 }}>
                  Tersedia untuk individu, pasangan, maupun keluarga.
                </p>
                <SelectWrap value={butuhPsikolog} onChange={e=>setButuhPsikolog(e.target.value)}>
                  <option value="">-- Pilih --</option>
                  <option value="Ya">Ya, saya tertarik</option>
                  <option value="Tidak">Tidak, terima kasih</option>
                  <option value="Belum Tau">Belum Tau</option>
                </SelectWrap>
              </div>

              {/* Kolom 3 — masukan platform */}
              <div style={{ marginBottom:24 }}>
                <label style={S.lbl}>Evaluasi dan masukan untuk pengukuran ini</label>
                <p style={{ fontSize:11, color:"#94a3b8", margin:"0 0 8px", lineHeight:1.5 }}>
                  Ada saran untuk memperbaiki kuesioner atau platform ini? Kami sangat terbuka.
                </p>
                <textarea
                  value={masukanApp} onChange={e=>setMasukanApp(e.target.value)}
                  placeholder="Contoh: pertanyaannya sudah cukup jelas, tapi mungkin bisa ditambahkan pertanyaan tentang..."
                  rows={4}
                  style={{ ...S.inp, resize:"vertical", lineHeight:1.6, fontSize:13, padding:"12px 14px" }}
                  onFocus={e=>e.target.style.borderColor="#4f46e5"}
                  onBlur={e=>e.target.style.borderColor="#e2e8f0"}
                />
              </div>

              <button
                style={{ ...S.pBtn, opacity: butuhPsikolog ? 1 : 0.45 }}
                onClick={butuhPsikolog && !saving ? submitRefleksi : undefined}>
                {saving ? "⏳ Menyimpan..." : "Kirim & Selesai ✓"}
              </button>
              <p style={{ fontSize:11, color:"#94a3b8", textAlign:"center", marginTop:10 }}>
                Data Anda baru tersimpan setelah tombol ini diklik.
              </p>
            </div>
          )}

          {/* STEP 5 — Konfirmasi */}
          {step === 5 && (
            <div style={{ textAlign:"center" }}>
              <div style={{ width:80, height:80, borderRadius:99, background:"#f0fdf4",
                border:"2px solid #86efac", margin:"0 auto 20px",
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:"0 8px 24px rgba(16,185,129,0.15)", fontSize:36 }}>
                ✅
              </div>
              <h3 style={{ fontSize:22, fontWeight:800, color:"#1e1b4b", margin:"0 0 8px" }}>Data Anda Telah Tersimpan!</h3>
              <p style={{ color:"#64748b", fontSize:13, margin:"0 0 6px", lineHeight:1.7 }}>
                Terima kasih, <strong>{name}</strong>. Seluruh jawaban Anda telah berhasil direkam.
              </p>
              <p style={{ color:"#94a3b8", fontSize:12, margin:"0 0 24px", lineHeight:1.6 }}>
                Identitas dan jawaban Anda bersifat <strong>rahasia</strong> dan hanya dapat diakses oleh admin.
              </p>

              <div style={{ background:"#f8f7ff", border:"1px solid #e0e7ff", borderRadius:14,
                padding:"16px 18px", marginBottom:22, textAlign:"left" }}>
                <div style={{ fontSize:11, fontWeight:800, color:"#6366f1", letterSpacing:"0.1em",
                  textTransform:"uppercase", marginBottom:10 }}>Ringkasan Pengisian</div>
                <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                    <span style={{ color:"#64748b" }}>Nama</span>
                    <span style={{ fontWeight:700, color:"#1e1b4b" }}>{name}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                    <span style={{ color:"#64748b" }}>Periode</span>
                    <span style={{ fontWeight:700, color:"#1e1b4b" }}>{bulan} {tahun}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                    <span style={{ color:"#64748b" }}>Skor NASA-TLX</span>
                    <span style={{ fontWeight:800, color: result ? getCategory(result.score).color : "#1e1b4b" }}>
                      {result ? result.score.toFixed(1) : "-"} — {result ? getCategory(result.score).label : "-"}
                    </span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                    <span style={{ color:"#64748b" }}>Sesi Psikolog</span>
                    <span style={{ fontWeight:700, color:"#1e1b4b" }}>{butuhPsikolog || "-"}</span>
                  </div>
                </div>
              </div>

              <button style={S.oBtn} onClick={() => go(()=>setScreen("home"))}>Kembali ke Beranda</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════════════════════
  if (screen === "dashboard") {
    const avg    = filtered.length ? filtered.reduce((s,r)=>s+r.score,0)/filtered.length : 0;
    const cat    = getCategory(avg);
    const dimAvg = DIMENSIONS.map(d => ({
      ...d, avg: filtered.length ? filtered.reduce((s,r)=>s+(r.ratings[d.id]||0),0)/filtered.length : 0,
    })).sort((a,b)=>b.avg-a.avg);
    const distData = ["Rendah","Sedang","Agak Tinggi","Tinggi","Tinggi Sekali"].map(lb => ({
      label: lb,
      color: getCategory(lb==="Rendah"?0:lb==="Sedang"?15:lb==="Agak Tinggi"?35:lb==="Tinggi"?60:85).color,
      count: filtered.filter(r=>getCategory(r.score).label===lb).length,
    }));
    const availYears = ["Semua", ...YEARS.filter(y=>responses.some(r=>String(r.tahun)===String(y)))];

    return (
      <div style={S.page}>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
        <div style={{ width:"100%", maxWidth:700 }}>

          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            marginBottom:20, flexWrap:"wrap", gap:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <button style={S.gBtn} onClick={() => go(()=>{ setScreen("home"); setAdminUnlocked(false); setAdminPw(""); setShowAdminBox(false); })}>
                ← Home
              </button>
              <div>
                <div style={{ fontWeight:800, fontSize:18, color:"#1e1b4b" }}>Dashboard</div>
                <div style={{ fontSize:12, color:"#94a3b8" }}>{filtered.length} dari {responses.length} responden</div>
              </div>
            </div>
            {adminUnlocked && (
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>{ const c=toCSV(filtered); const b=new Blob([c],{type:"text/csv"}); const u=URL.createObjectURL(b); const a=document.createElement("a"); a.href=u; a.download="nasa_tlx_hasil.csv"; a.click(); }}
                  style={{ ...S.gBtn, background:"linear-gradient(135deg,#4f46e5,#818cf8)", color:"#fff", padding:"9px 16px", borderRadius:10 }}>
                  ⬇ Ekspor CSV
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
                        background: active?"linear-gradient(135deg,#4f46e5,#818cf8)":"#f8f7ff",
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
              <button onClick={()=>{ setFilterBulan([NOW_MONTH]); setFilterTahun(NOW_YEAR); setFilterKat("Semua"); }}
                style={{ ...S.gBtn, padding:"10px 16px", borderRadius:12, fontSize:12, marginBottom:1 }}>Reset</button>
            </div>
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
                  { label:"Rata-rata Skor", value:avg.toFixed(1), color:cat.color, sub:cat.label },
                  { label:"Jumlah Pengisi", value:filtered.length, color:"#4f46e5", sub:"pegawai" },
                  { label:"Skor Tertinggi", value:Math.max(...filtered.map(r=>r.score)).toFixed(1), color:"#ef4444", sub:"maks" },
                  { label:"Skor Terendah",  value:Math.min(...filtered.map(r=>r.score)).toFixed(1), color:"#22c55e", sub:"min" },
                ].map(s=>(
                  <div key={s.label} style={{ background:"#fff", borderRadius:16, padding:"16px 14px", boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}>
                    <p style={{ fontSize:10, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", margin:"0 0 5px" }}>{s.label}</p>
                    <p style={{ fontSize:24, fontWeight:900, color:s.color, margin:"0 0 2px" }}>{s.value}</p>
                    <p style={{ fontSize:11, color:"#64748b", margin:0 }}>{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* ── LINE CHART — Tren Perkembangan ── */}
              {(() => {
                const sorted = [...filtered].sort((a,b) => new Date(a.date) - new Date(b.date));
                if (sorted.length < 2) return null;
                const W = 620, H = 180, padL = 40, padR = 16, padT = 16, padB = 36;
                const scores = sorted.map(r => r.score);
                const minS = Math.max(0, Math.min(...scores) - 5);
                const maxS = Math.min(100, Math.max(...scores) + 5);
                const xStep = (W - padL - padR) / (sorted.length - 1);
                const yScale = (s) => padT + (H - padT - padB) * (1 - (s - minS) / (maxS - minS));
                const pts = sorted.map((r,i) => ({ x: padL + i * xStep, y: yScale(r.score), r }));
                const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
                const area = `M${pts[0].x},${pts[0].y} ` + pts.slice(1).map(p=>`L${p.x},${p.y}`).join(" ") + ` L${pts[pts.length-1].x},${H-padB} L${pts[0].x},${H-padB} Z`;
                const yTicks = [minS, (minS+maxS)/2, maxS].map(v => Math.round(v));
                return (
                  <div style={{ background:"#fff", borderRadius:18, padding:"20px 22px", boxShadow:"0 1px 8px rgba(79,70,229,0.07)", marginBottom:14 }}>
                    <h4 style={{ fontWeight:800, fontSize:15, color:"#1e1b4b", margin:"0 0 4px" }}>Tren Perkembangan Beban Kerja</h4>
                    <p style={{ fontSize:11, color:"#94a3b8", margin:"0 0 14px" }}>Berdasarkan urutan waktu pengisian — {sorted.length} pengukuran</p>
                    <div style={{ overflowX:"auto" }}>
                      <svg width={W} height={H} style={{ display:"block", minWidth:320 }}>
                        <defs>
                          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.18"/>
                            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.01"/>
                          </linearGradient>
                        </defs>
                        {/* Y grid lines */}
                        {yTicks.map((t,i) => (
                          <g key={i}>
                            <line x1={padL} y1={yScale(t)} x2={W-padR} y2={yScale(t)} stroke="#f1f5f9" strokeWidth="1"/>
                            <text x={padL-6} y={yScale(t)+4} fontSize="9" fill="#94a3b8" textAnchor="end">{Math.round(t)}</text>
                          </g>
                        ))}
                        {/* Area fill */}
                        <path d={area} fill="url(#areaGrad)"/>
                        {/* Line */}
                        <polyline points={polyline} fill="none" stroke="#4f46e5" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"/>
                        {/* Dots */}
                        {pts.map((p,i) => {
                          const c = getCategory(p.r.score);
                          return (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r="5" fill="#fff" stroke={c.color} strokeWidth="2"/>
                              <circle cx={p.x} cy={p.y} r="2.5" fill={c.color}/>
                            </g>
                          );
                        })}
                        {/* X labels — show max 8 evenly */}
                        {pts.filter((_,i) => sorted.length <= 8 || i % Math.ceil(sorted.length/8) === 0 || i === sorted.length-1).map((p,i) => (
                          <text key={i} x={p.x} y={H-padB+14} fontSize="8" fill="#94a3b8" textAnchor="middle">
                            {p.r.bulan ? p.r.bulan.slice(0,3) : ""} {String(p.r.tahun).slice(2)}
                          </text>
                        ))}
                        {/* Avg reference line */}
                        <line x1={padL} y1={yScale(avg)} x2={W-padR} y2={yScale(avg)} stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="4,3"/>
                        <text x={W-padR-2} y={yScale(avg)-4} fontSize="8" fill="#f59e0b" textAnchor="end">rata-rata</text>
                      </svg>
                    </div>
                    {/* Legend dots */}
                    <div style={{ display:"flex", gap:14, marginTop:10, flexWrap:"wrap" }}>
                      {["Rendah","Sedang","Agak Tinggi","Tinggi","Tinggi Sekali"].map(lb => {
                        const c = getCategory(lb==="Rendah"?0:lb==="Sedang"?15:lb==="Agak Tinggi"?35:lb==="Tinggi"?60:85);
                        return (
                          <div key={lb} style={{ display:"flex", alignItems:"center", gap:5 }}>
                            <div style={{ width:8, height:8, borderRadius:99, background:c.color }}/>
                            <span style={{ fontSize:10, color:"#64748b" }}>{lb}</span>
                          </div>
                        );
                      })}
                      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <div style={{ width:14, height:1.5, background:"#f59e0b", borderRadius:99 }}/>
                        <span style={{ fontSize:10, color:"#64748b" }}>Rata-rata</span>
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
                      <div style={{ height:"100%", width:d.avg+"%", background:"linear-gradient(90deg,#4f46e5,#818cf8)", borderRadius:99 }}/>
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
                          {["Nama","NIP","Pangkat","Unit","Bln/Thn","Skor","Kategori","Psikolog","Cerita Beban Kerja","Masukan"].map(h=>(
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
                              <td style={{ padding:"10px 8px", color:"#64748b", fontSize:11, maxWidth:160 }}>
                                {r.ceritaBeban ? <span title={r.ceritaBeban}>{r.ceritaBeban.length>40?r.ceritaBeban.slice(0,40)+"…":r.ceritaBeban}</span> : "-"}
                              </td>
                              <td style={{ padding:"10px 8px", color:"#64748b", fontSize:11, maxWidth:120 }}>
                                {r.masukanApp ? <span title={r.masukanApp}>{r.masukanApp.length>30?r.masukanApp.slice(0,30)+"…":r.masukanApp}</span> : "-"}
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
