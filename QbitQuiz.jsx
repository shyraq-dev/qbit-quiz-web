import { useState, useEffect, useRef } from "react";

const CATEGORIES = [
  { id: "science", label: "Ғылым", icon: "⚛️" },
  { id: "history", label: "Тарих", icon: "🏛️" },
  { id: "geography", label: "География", icon: "🌍" },
  { id: "technology", label: "Технология", icon: "💻" },
  { id: "culture", label: "Мәдениет", icon: "🎭" },
  { id: "math", label: "Математика", icon: "🔢" },
];

const SYSTEM_PROMPT = `Сен QBit Quiz платформасының AI-сұрақ генераторысың. Қазақша тест сұрақтары жасайсың.

Форматы — тек JSON, басқа ешнәрсе жоқ:
{
  "question": "Сұрақ мәтіні",
  "options": ["A жауап", "B жауап", "C жауап", "D жауап"],
  "correct": 0,
  "explanation": "Қысқа түсіндірме (1-2 сөйлем)"
}

Ережелер:
- Сұрақ нақты, анық, бір мағыналы болуы керек
- Дұрыс жауап correct индексімен көрсетіледі (0-3)
- Жауаптар нанымды, бірдей ұзындықта болуы керек
- Тек қазақша`;

async function generateQuestion(category, difficulty, usedQuestions) {
  const difficultyText = difficulty === 1 ? "оңай" : difficulty === 2 ? "орташа" : "қиын";
  const usedNote = usedQuestions.length > 0 
    ? `\n\nБұл сұрақтарды қайталама: ${usedQuestions.slice(-5).join(" | ")}`
    : "";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `Категория: ${category}\nКүрделілік: ${difficultyText}${usedNote}\n\nЖаңа сұрақ жаса.`
      }]
    })
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// Animated digit counter
function Counter({ value, suffix = "" }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    setDisplay(value);
  }, [value]);
  return <span>{display}{suffix}</span>;
}

// Circular progress
function CircularProgress({ value, max, size = 56, stroke = 4, color = "#00ff88" }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const progress = max > 0 ? (value / max) * circ : 0;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a1a2e" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${progress} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.4s ease" }}
      />
    </svg>
  );
}

export default function QBitQuiz() {
  const [screen, setScreen] = useState("home"); // home | category | quiz | result
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [difficulty, setDifficulty] = useState(2);
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [total, setTotal] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [timerActive, setTimerActive] = useState(false);
  const [usedQuestions, setUsedQuestions] = useState([]);
  const [particles, setParticles] = useState([]);
  const timerRef = useRef(null);

  const TOTAL_QUESTIONS = 10;

  // Timer
  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    } else if (timerActive && timeLeft === 0 && !revealed) {
      handleTimeout();
    }
    return () => clearTimeout(timerRef.current);
  }, [timerActive, timeLeft, revealed]);

  function handleTimeout() {
    setRevealed(true);
    setTimerActive(false);
    setStreak(0);
    setTotal(t => t + 1);
  }

  async function loadQuestion() {
    setLoading(true);
    setSelected(null);
    setRevealed(false);
    setTimeLeft(20);
    try {
      const cat = selectedCategory || CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const q = await generateQuestion(cat.label, difficulty, usedQuestions);
      setQuestion(q);
      setUsedQuestions(prev => [...prev, q.question.slice(0, 40)]);
      setTimerActive(true);
    } catch (e) {
      setQuestion(null);
    }
    setLoading(false);
  }

  function startQuiz(cat) {
    setSelectedCategory(cat);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setTotal(0);
    setUsedQuestions([]);
    setScreen("quiz");
    setQuestion(null);
  }

  useEffect(() => {
    if (screen === "quiz" && !question && !loading) {
      loadQuestion();
    }
  }, [screen]);

  function spawnParticles(correct) {
    const pts = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: 40 + Math.random() * 20,
      y: 40 + Math.random() * 20,
      vx: (Math.random() - 0.5) * 120,
      vy: -(40 + Math.random() * 80),
      color: correct ? "#00ff88" : "#ff4466",
    }));
    setParticles(pts);
    setTimeout(() => setParticles([]), 900);
  }

  function handleAnswer(idx) {
    if (revealed || selected !== null) return;
    clearTimeout(timerRef.current);
    setTimerActive(false);
    setSelected(idx);
    setRevealed(true);
    const correct = idx === question.correct;
    setTotal(t => t + 1);
    if (correct) {
      const pts = Math.max(1, Math.round((timeLeft / 20) * 10));
      setScore(s => s + pts);
      setStreak(s => {
        const ns = s + 1;
        setBestStreak(b => Math.max(b, ns));
        return ns;
      });
    } else {
      setStreak(0);
    }
    spawnParticles(correct);
    setTimeout(() => {
      if (total + 1 >= TOTAL_QUESTIONS) {
        setScreen("result");
      } else {
        loadQuestion();
      }
    }, 1600);
  }

  const timeColor = timeLeft > 10 ? "#00ff88" : timeLeft > 5 ? "#ffcc00" : "#ff4466";

  // ── HOME ──────────────────────────────────────────────────────────────────
  if (screen === "home") return (
    <div style={styles.root}>
      <div style={styles.grid} />
      <div style={styles.center}>
        <div style={styles.logo}>
          <span style={styles.logoQ}>Q</span>
          <span style={styles.logoBit}>Bit</span>
          <span style={styles.logoQuiz}>Quiz</span>
        </div>
        <p style={styles.tagline}>Білімді битке бөліп, жеңіске жина</p>
        <div style={styles.diffRow}>
          {[1,2,3].map(d => (
            <button key={d} onClick={() => setDifficulty(d)}
              style={{ ...styles.diffBtn, ...(difficulty === d ? styles.diffBtnActive : {}) }}>
              {d === 1 ? "Оңай" : d === 2 ? "Орташа" : "Қиын"}
            </button>
          ))}
        </div>
        <button style={styles.startBtn} onClick={() => setScreen("category")}>
          <span style={styles.startArrow}>▶</span> БАСТАУ
        </button>
        <p style={styles.subHint}>Категория таңда немесе кездейсоқ ойна</p>
      </div>
    </div>
  );

  // ── CATEGORY ──────────────────────────────────────────────────────────────
  if (screen === "category") return (
    <div style={styles.root}>
      <div style={styles.grid} />
      <div style={{ ...styles.center, gap: 20 }}>
        <button style={styles.back} onClick={() => setScreen("home")}>← Артқа</button>
        <h2 style={styles.catTitle}>Категория таңда</h2>
        <div style={styles.catGrid}>
          {CATEGORIES.map(cat => (
            <button key={cat.id} style={styles.catCard} onClick={() => startQuiz(cat)}>
              <span style={styles.catIcon}>{cat.icon}</span>
              <span style={styles.catLabel}>{cat.label}</span>
            </button>
          ))}
        </div>
        <button style={{ ...styles.catCard, ...styles.randomCard }} onClick={() => startQuiz(null)}>
          <span style={styles.catIcon}>🎲</span>
          <span style={styles.catLabel}>Кездейсоқ</span>
        </button>
      </div>
    </div>
  );

  // ── QUIZ ──────────────────────────────────────────────────────────────────
  if (screen === "quiz") return (
    <div style={styles.root}>
      <div style={styles.grid} />
      {/* Particles */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999 }}>
        {particles.map(p => (
          <div key={p.id} style={{
            position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
            width: 8, height: 8, borderRadius: "50%", background: p.color,
            animation: "pop 0.8s forwards",
            "--vx": `${p.vx}px`, "--vy": `${p.vy}px`
          }} />
        ))}
      </div>

      <div style={styles.quizWrap}>
        {/* HUD */}
        <div style={styles.hud}>
          <div style={styles.hudItem}>
            <span style={styles.hudLabel}>ҰПАЙ</span>
            <span style={styles.hudValue}>{score}</span>
          </div>
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress value={timeLeft} max={20} size={52} stroke={4} color={timeColor} />
            <span style={{ position: "absolute", fontSize: 14, fontWeight: 700, color: timeColor, fontFamily: "monospace" }}>{timeLeft}</span>
          </div>
          <div style={styles.hudItem}>
            <span style={styles.hudLabel}>🔥 СЕРИЯ</span>
            <span style={styles.hudValue}>{streak}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${(total / TOTAL_QUESTIONS) * 100}%` }} />
        </div>
        <p style={styles.progressText}>{total}/{TOTAL_QUESTIONS} сұрақ</p>

        {/* Question card */}
        <div style={styles.questionCard}>
          {loading ? (
            <div style={styles.loader}>
              <div style={styles.loaderDot} />
              <div style={{ ...styles.loaderDot, animationDelay: "0.2s" }} />
              <div style={{ ...styles.loaderDot, animationDelay: "0.4s" }} />
              <p style={styles.loaderText}>Сұрақ жасалуда…</p>
            </div>
          ) : question ? (
            <>
              <p style={styles.questionText}>{question.question}</p>
              <div style={styles.options}>
                {question.options.map((opt, i) => {
                  let s = { ...styles.option };
                  if (revealed) {
                    if (i === question.correct) s = { ...s, ...styles.optCorrect };
                    else if (i === selected && selected !== question.correct) s = { ...s, ...styles.optWrong };
                    else s = { ...s, ...styles.optDim };
                  }
                  return (
                    <button key={i} style={s} onClick={() => handleAnswer(i)}>
                      <span style={styles.optLetter}>{["A","B","C","D"][i]}</span>
                      <span style={styles.optText}>{opt}</span>
                    </button>
                  );
                })}
              </div>
              {revealed && question.explanation && (
                <div style={styles.explanation}>
                  <span style={styles.explIcon}>💡</span>
                  <span>{question.explanation}</span>
                </div>
              )}
            </>
          ) : (
            <p style={{ color: "#ff4466", textAlign: "center" }}>Қате орын алды. Қайталап көріңіз.</p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pop {
          0% { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--vx), var(--vy)) scale(0); opacity: 0; }
        }
        @keyframes pulse {
          0%,100% { opacity:1 } 50% { opacity:0.3 }
        }
      `}</style>
    </div>
  );

  // ── RESULT ────────────────────────────────────────────────────────────────
  if (screen === "result") {
    const pct = Math.round((score / (TOTAL_QUESTIONS * 10)) * 100);
    const rank = pct >= 80 ? "🏆 Чемпион" : pct >= 60 ? "⭐ Тәжірибелі" : pct >= 40 ? "📈 Дамушы" : "🌱 Жаңадан";
    return (
      <div style={styles.root}>
        <div style={styles.grid} />
        <div style={{ ...styles.center, gap: 24 }}>
          <div style={styles.resultCard}>
            <p style={styles.rankBadge}>{rank}</p>
            <div style={styles.scoreBig}>{score}</div>
            <p style={styles.scoreLabel}>ұпай</p>
            <div style={styles.statsRow}>
              <div style={styles.statBox}>
                <span style={styles.statVal}>{bestStreak}</span>
                <span style={styles.statLbl}>🔥 Серия</span>
              </div>
              <div style={styles.statBox}>
                <span style={styles.statVal}>{pct}%</span>
                <span style={styles.statLbl}>Нәтиже</span>
              </div>
              <div style={styles.statBox}>
                <span style={styles.statVal}>{total}</span>
                <span style={styles.statLbl}>Сұрақ</span>
              </div>
            </div>
            <div style={styles.resultBarWrap}>
              <div style={{ ...styles.resultBar, width: `${pct}%`, background: pct >= 60 ? "#00ff88" : "#ffcc00" }} />
            </div>
          </div>
          <button style={styles.startBtn} onClick={() => {
            setScreen("quiz");
            setQuestion(null);
            setScore(0); setStreak(0); setBestStreak(0); setTotal(0); setUsedQuestions([]);
          }}>
            🔄 Қайта ойна
          </button>
          <button style={{ ...styles.startBtn, background: "transparent", border: "1px solid #333", color: "#aaa" }}
            onClick={() => { setScreen("home"); setQuestion(null); }}>
            ← Басты бет
          </button>
        </div>
      </div>
    );
  }
}

const styles = {
  root: {
    minHeight: "100vh", background: "#070710", color: "#e8e8ff",
    fontFamily: "'Space Mono', 'Courier New', monospace",
    position: "relative", overflowX: "hidden",
    display: "flex", flexDirection: "column", alignItems: "center",
  },
  grid: {
    position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
    backgroundImage: "linear-gradient(rgba(0,255,136,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.04) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
  },
  center: {
    position: "relative", zIndex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", minHeight: "100vh",
    padding: "24px 20px", gap: 16, maxWidth: 480, width: "100%",
  },
  logo: { display: "flex", alignItems: "baseline", gap: 2 },
  logoQ: { fontSize: 52, fontWeight: 900, color: "#00ff88", letterSpacing: -2, lineHeight: 1 },
  logoBit: { fontSize: 52, fontWeight: 900, color: "#e8e8ff", letterSpacing: -2, lineHeight: 1 },
  logoQuiz: { fontSize: 22, fontWeight: 400, color: "#555", letterSpacing: 4, marginLeft: 6, alignSelf: "flex-end", paddingBottom: 6 },
  tagline: { color: "#556", fontSize: 13, letterSpacing: 1, textAlign: "center", margin: 0 },
  diffRow: { display: "flex", gap: 8 },
  diffBtn: {
    padding: "8px 20px", background: "transparent", border: "1px solid #222",
    color: "#555", borderRadius: 4, cursor: "pointer", fontFamily: "inherit",
    fontSize: 12, letterSpacing: 1, transition: "all 0.2s",
  },
  diffBtnActive: { border: "1px solid #00ff88", color: "#00ff88", background: "rgba(0,255,136,0.06)" },
  startBtn: {
    padding: "14px 40px", background: "#00ff88", color: "#000",
    border: "none", borderRadius: 4, cursor: "pointer",
    fontFamily: "inherit", fontWeight: 700, fontSize: 15, letterSpacing: 2,
    display: "flex", alignItems: "center", gap: 10, transition: "transform 0.1s",
  },
  startArrow: { fontSize: 12 },
  subHint: { color: "#333", fontSize: 11, margin: 0, letterSpacing: 0.5 },
  back: {
    alignSelf: "flex-start", background: "none", border: "none",
    color: "#556", cursor: "pointer", fontFamily: "inherit",
    fontSize: 13, letterSpacing: 1, padding: 0,
  },
  catTitle: { margin: 0, fontSize: 16, letterSpacing: 3, color: "#556", fontWeight: 400 },
  catGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, width: "100%",
  },
  catCard: {
    background: "rgba(255,255,255,0.03)", border: "1px solid #1a1a2e",
    borderRadius: 8, padding: "16px 8px", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 8, cursor: "pointer",
    fontFamily: "inherit", color: "#e8e8ff", transition: "all 0.2s",
  },
  randomCard: { gridColumn: "1 / -1", flexDirection: "row", justifyContent: "center", gap: 12, padding: "14px" },
  catIcon: { fontSize: 28 },
  catLabel: { fontSize: 12, letterSpacing: 1, color: "#778" },
  quizWrap: {
    position: "relative", zIndex: 1, width: "100%", maxWidth: 480,
    padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12,
    minHeight: "100vh",
  },
  hud: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 16px", background: "rgba(255,255,255,0.03)",
    border: "1px solid #111", borderRadius: 8,
  },
  hudItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  hudLabel: { fontSize: 9, letterSpacing: 2, color: "#445" },
  hudValue: { fontSize: 20, fontWeight: 700, color: "#00ff88" },
  progressBar: { height: 3, background: "#111", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", background: "#00ff88", borderRadius: 2, transition: "width 0.4s" },
  progressText: { fontSize: 10, color: "#334", letterSpacing: 1, margin: 0, textAlign: "right" },
  questionCard: {
    background: "rgba(255,255,255,0.025)", border: "1px solid #141425",
    borderRadius: 12, padding: 20, flex: 1,
  },
  loader: { display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "40px 0" },
  loaderDot: {
    width: 8, height: 8, borderRadius: "50%", background: "#00ff88",
    display: "inline-block", animation: "pulse 1s infinite",
    margin: "0 4px",
  },
  loaderText: { color: "#334", fontSize: 12, letterSpacing: 2, margin: 0 },
  questionText: { fontSize: 16, lineHeight: 1.6, marginBottom: 20, color: "#dde" },
  options: { display: "flex", flexDirection: "column", gap: 10 },
  option: {
    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
    background: "rgba(255,255,255,0.04)", border: "1px solid #1a1a2e",
    borderRadius: 8, cursor: "pointer", textAlign: "left",
    fontFamily: "inherit", color: "#ccd", fontSize: 14,
    transition: "all 0.2s",
  },
  optCorrect: { background: "rgba(0,255,136,0.12)", border: "1px solid #00ff88", color: "#00ff88" },
  optWrong: { background: "rgba(255,68,102,0.12)", border: "1px solid #ff4466", color: "#ff4466" },
  optDim: { opacity: 0.35 },
  optLetter: { fontWeight: 700, color: "#445", minWidth: 16, fontSize: 12 },
  optText: { flex: 1 },
  explanation: {
    marginTop: 16, padding: "12px 14px", background: "rgba(255,204,0,0.06)",
    border: "1px solid rgba(255,204,0,0.2)", borderRadius: 8,
    fontSize: 12, color: "#998", lineHeight: 1.6, display: "flex", gap: 8,
  },
  explIcon: { flexShrink: 0 },
  resultCard: {
    width: "100%", background: "rgba(255,255,255,0.025)",
    border: "1px solid #141425", borderRadius: 16, padding: "32px 24px",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
  },
  rankBadge: { fontSize: 14, letterSpacing: 2, color: "#556", margin: 0 },
  scoreBig: { fontSize: 72, fontWeight: 900, color: "#00ff88", lineHeight: 1 },
  scoreLabel: { fontSize: 11, letterSpacing: 3, color: "#445", margin: 0 },
  statsRow: { display: "flex", gap: 24, marginTop: 8 },
  statBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  statVal: { fontSize: 22, fontWeight: 700, color: "#e8e8ff" },
  statLbl: { fontSize: 10, color: "#445", letterSpacing: 1 },
  resultBarWrap: { width: "100%", height: 4, background: "#111", borderRadius: 2, overflow: "hidden", marginTop: 8 },
  resultBar: { height: "100%", borderRadius: 2, transition: "width 1s ease" },
};
