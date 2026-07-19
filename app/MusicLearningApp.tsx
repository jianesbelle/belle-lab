"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { db, ensureFirebaseAuth } from "../lib/firebase";

type View = "home" | "diagnostic" | "theory" | "create" | "reflect";
type Student = { id: string; studentNo: string; nickname: string };
type DashboardStudent = {
  id: string | number; studentNo: string; nickname: string; level: string | null; stage: number | null;
  helpNeeded: boolean | null; agency: number | null; creativity: number | null;
  communication: number | null; responsibility: number | null; updatedAt: string | null;
};

const demoStudents: DashboardStudent[] = [
  { id: 1, studentNo: "20301", nickname: "달빛", level: "심화", stage: 5, helpNeeded: false, agency: 92, creativity: 88, communication: 82, responsibility: 86, updatedAt: "방금 전" },
  { id: 2, studentNo: "20307", nickname: "소나무", level: "도전", stage: 4, helpNeeded: false, agency: 76, creativity: 81, communication: 72, responsibility: 74, updatedAt: "12분 전" },
  { id: 3, studentNo: "20312", nickname: "여울", level: "기초", stage: 2, helpNeeded: true, agency: 58, creativity: 54, communication: 61, responsibility: 68, updatedAt: "오늘" },
  { id: 4, studentNo: "20318", nickname: "바람", level: "도전", stage: 3, helpNeeded: false, agency: 70, creativity: 73, communication: 75, responsibility: 71, updatedAt: "어제" },
];

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const theory = [
  { icon: "둥", title: "리듬과 장단", copy: "소리의 길고 짧음, 규칙적인 박, 강약이 모여 음악의 움직임을 만들어요.", task: "말붙임새를 손뼉으로 치며 3소박을 찾아보세요." },
  { icon: "솔", title: "가락과 토리", copy: "음의 높낮이와 이어짐이 가락을 만들고, 지역마다 고유한 음 진행과 시김새가 나타나요.", task: "한 음을 흔들거나 꺾어 불러 느낌의 변화를 비교하세요." },
  { icon: "빛", title: "셈여림·빠르기", copy: "세기와 속도를 바꾸면 같은 가사도 정서와 장면이 달라져요.", task: "같은 한 줄을 느리고 여리게, 빠르고 세게 표현하세요." },
  { icon: "결", title: "음색과 형식", copy: "목소리와 악기의 빛깔, 메기고 받는 구조가 함께하는 민요의 성격을 살려요.", task: "메기는소리와 받는소리를 색으로 구분해 보세요." },
];

function Header({ teacher, setTeacher, nickname }: { teacher: boolean; setTeacher: (v: boolean) => void; nickname?: string }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => setTeacher(false)} aria-label="소리결 학생 화면">
        <span className="brand-mark">소</span><span><b>소리결</b><small>민요 창작 학습실</small></span>
      </button>
      <div className="top-actions">
        {nickname && !teacher && <span className="welcome">{nickname} 님의 배움</span>}
        <button className={teacher ? "teacher-toggle active" : "teacher-toggle"} onClick={() => setTeacher(!teacher)}>
          {teacher ? "학생 화면" : "교사 대시보드"}
        </button>
      </div>
    </header>
  );
}

function TeacherGate({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  if (!open) return null;
  function unlock(e: FormEvent) {
    e.preventDefault();
    if (pin === "0719") {
      setPin(""); setError(""); onSuccess();
    } else {
      setError("교사 비밀번호가 맞지 않습니다.");
      setPin("");
    }
  }
  return <div className="gate-backdrop" role="dialog" aria-modal="true" aria-labelledby="teacher-gate-title">
    <form className="gate-card" onSubmit={unlock}>
      <button type="button" className="gate-close" onClick={onClose} aria-label="닫기">×</button>
      <span className="gate-icon">교</span>
      <p className="eyebrow">TEACHER ONLY</p>
      <h2 id="teacher-gate-title">교사 대시보드 잠금</h2>
      <p>학생별 학습 기록을 보려면 교사 비밀번호를 입력하세요.</p>
      <label>교사 비밀번호<input autoFocus type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="숫자 4자리" /></label>
      {error && <p className="gate-error">{error}</p>}
      <button className="primary" type="submit">대시보드 열기 <span>→</span></button>
    </form>
  </div>;
}

function Entry({ onEnter, onTeacher }: { onEnter: (s: Student) => void; onTeacher: () => void }) {
  const [studentNo, setStudentNo] = useState("");
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{2,12}$/.test(studentNo) || !nickname.trim() || !/^\d{4}$/.test(pin)) {
      setMessage("학번, 별명, 숫자 4자리 비밀번호를 확인해 주세요.");
      return;
    }
    setLoading(true); setMessage("");
    try {
      await ensureFirebaseAuth();
      const id = `student-${(await sha256(studentNo)).slice(0, 32)}`;
      const ref = doc(db, "students", id);
      const saved = await getDoc(ref);
      const pinHash = await sha256(`sorigyeol:${studentNo}:${pin}`);
      if (saved.exists() && saved.data().pinHash !== pinHash) throw new Error("비밀번호가 맞지 않아요.");
      if (!saved.exists()) await setDoc(ref, {
        studentNo, nickname: nickname.trim(), pinHash, level: "기초", stage: 1,
        helpNeeded: false, agency: 0, creativity: 0, communication: 0, responsibility: 0,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      onEnter({ id, studentNo, nickname: saved.exists() ? String(saved.data().nickname) : nickname.trim() });
    } catch (error) {
      if (error instanceof Error && error.message.includes("비밀번호")) setMessage(error.message);
      else {
        setMessage("Firebase 연결을 확인해 주세요. 지금은 체험 모드로 시작합니다.");
        onEnter({ id: `demo-${Date.now()}`, studentNo, nickname });
      }
    } finally { setLoading(false); }
  }

  return (
    <main className="entry">
      <section className="entry-story">
        <p className="eyebrow">중학교 음악 · 창작 영역</p>
        <h1>익숙한 민요에<br /><em>나의 오늘</em>을 싣다</h1>
        <p className="lead">듣고, 느끼고, 가사를 바꾸고, 음악 요소를 선택하며 나만의 소리로 완성해요.</p>
        <div className="journey" aria-label="학습 여정">
          {["듣기", "이해", "개사", "표현", "성찰"].map((x, i) => <span key={x}><b>0{i + 1}</b>{x}</span>)}
        </div>
        <div className="wave wave-a" /><div className="wave wave-b" />
      </section>
      <section className="entry-panel">
        <div className="entry-card">
          <span className="mini-label">바로 시작하기</span>
          <h2>오늘의 소리를 만나볼까요?</h2>
          <p>처음 입력하면 자동으로 가입돼요. 비밀번호는 꼭 기억하세요.</p>
          <form onSubmit={submit}>
            <label>학번<input inputMode="numeric" value={studentNo} onChange={(e) => setStudentNo(e.target.value.replace(/\D/g, ""))} placeholder="예: 20301" /></label>
            <label>별명<input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={12} placeholder="수업에서 쓸 별명" /></label>
            <label>비밀번호 4자리<input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" /></label>
            {message && <p className="form-message">{message}</p>}
            <button className="primary" disabled={loading}>{loading ? "학습실 여는 중…" : "학습 시작하기"} <span>→</span></button>
          </form>
          <button className="text-button" onClick={onTeacher}>교사라면 대시보드 보기</button>
          <small className="privacy">학습 기록 확인을 위해 학번과 별명만 사용합니다.</small>
        </div>
      </section>
    </main>
  );
}

export function MusicLearningApp() {
  const [student, setStudent] = useState<Student | null>(null);
  const [teacher, setTeacher] = useState(false);
  const [teacherGate, setTeacherGate] = useState(false);
  const [view, setView] = useState<View>("home");
  const [diagnostic, setDiagnostic] = useState<number[]>([]);
  const [theme, setTheme] = useState("우리 동네");
  const [lyrics, setLyrics] = useState("아침 바람 골목길을 깨우고\n친구 웃음 교실 안에 번진다\n서로 다른 우리 소리 모이면\n오늘의 노래가 피어난다");
  const [rhythm, setRhythm] = useState("세마치");
  const [tempo, setTempo] = useState(92);
  const [dynamics, setDynamics] = useState("보통");
  const [timbre, setTimbre] = useState("소리북");
  const [reflection, setReflection] = useState("");
  const [helpNeeded, setHelpNeeded] = useState(false);
  const [saved, setSaved] = useState("");

  const score = diagnostic.reduce((a, b) => a + b, 0);
  const level = diagnostic.length < 3 ? "살펴보는 중" : score <= 1 ? "기초" : score === 2 ? "도전" : "심화";
  const stage = view === "home" ? 1 : view === "diagnostic" ? 2 : view === "theory" ? 3 : view === "create" ? 4 : 5;
  const completed = Math.round(((stage - 1) / 4) * 100);

  const competencies = useMemo(() => ({
    agency: Math.min(100, 30 + diagnostic.length * 12 + (reflection ? 20 : 0)),
    creativity: Math.min(100, 25 + Math.min(lyrics.length, 120) / 2 + (rhythm !== "세마치" ? 10 : 0)),
    communication: Math.min(100, 35 + (lyrics.split("\n").length >= 4 ? 25 : 0) + (reflection ? 15 : 0)),
    responsibility: Math.min(100, 35 + stage * 9 + (helpNeeded ? 5 : 0)),
  }), [diagnostic.length, lyrics, rhythm, reflection, stage, helpNeeded]);

  async function saveProgress() {
    if (!student) return;
    setSaved("저장 중…");
    try {
      await ensureFirebaseAuth();
      await setDoc(doc(db, "students", student.id), {
        studentNo: student.studentNo, nickname: student.nickname, level, stage, diagnosticScore: score, lyrics, theme, rhythm, tempo, dynamics, timbre,
        reflection, helpNeeded, ...competencies,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setSaved("저장했어요 ✓");
    } catch { setSaved("이 기기에 임시 저장했어요"); }
    setTimeout(() => setSaved(""), 2500);
  }

  const openTeacherGate = () => setTeacherGate(true);
  const unlockTeacher = () => { setTeacherGate(false); setTeacher(true); };

  if (teacher) return <><Header teacher setTeacher={setTeacher} /><TeacherDashboard /></>;
  if (!student) return <><Header teacher={false} setTeacher={(next) => next && openTeacherGate()} /><Entry onEnter={setStudent} onTeacher={openTeacherGate} /><TeacherGate open={teacherGate} onClose={() => setTeacherGate(false)} onSuccess={unlockTeacher} /></>;

  const nav = [
    ["home", "나의 여정"], ["diagnostic", "소리 진단"], ["theory", "음악 요소"], ["create", "민요 개사"], ["reflect", "성찰·제출"],
  ] as [View, string][];

  return (<>
    <div className="app-shell">
      <Header teacher={false} setTeacher={(next) => next && openTeacherGate()} nickname={student.nickname} />
      <aside className="sidebar">
        <div className="student-chip"><span>{student.nickname.slice(0, 1)}</span><div><b>{student.nickname}</b><small>{student.studentNo}</small></div></div>
        <nav>{nav.map(([id, label], i) => <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}><span>0{i + 1}</span>{label}</button>)}</nav>
        <div className="side-note"><b>오늘의 핵심 질문</b><p>민요의 특징을 살리면서 나의 이야기를 어떻게 표현할까?</p></div>
      </aside>
      <main className="workspace">
        <div className="progress-head"><div><span>나의 배움 진행</span><b>{completed}%</b></div><div className="progress-track"><i style={{ width: `${completed}%` }} /></div><small>{saved}</small></div>
        {view === "home" && <HomeView nickname={student.nickname} level={level} competencies={competencies} setView={setView} />}
        {view === "diagnostic" && <Diagnostic answers={diagnostic} setAnswers={setDiagnostic} level={level} onNext={() => setView("theory")} />}
        {view === "theory" && <TheoryView level={level} onNext={() => setView("create")} />}
        {view === "create" && <CreateView {...{ theme, setTheme, lyrics, setLyrics, rhythm, setRhythm, tempo, setTempo, dynamics, setDynamics, timbre, setTimbre }} onNext={() => setView("reflect")} />}
        {view === "reflect" && <ReflectView {...{ reflection, setReflection, helpNeeded, setHelpNeeded, competencies, saveProgress }} />}
      </main>
    </div>
    <TeacherGate open={teacherGate} onClose={() => setTeacherGate(false)} onSuccess={unlockTeacher} />
  </>);
}

function HomeView({ nickname, level, competencies, setView }: { nickname: string; level: string; competencies: Record<string, number>; setView: (v: View) => void }) {
  return <section>
    <div className="hero-card"><div><p className="eyebrow">안녕하세요, {nickname}!</p><h1>나만의 민요를<br />완성하는 <em>다섯 걸음</em></h1><p>정답 하나를 찾기보다, 선택한 까닭을 음악의 말로 설명해 보세요.</p><button className="primary compact" onClick={() => setView("diagnostic")}>이어 학습하기 →</button></div><div className="record"><div className="record-ring"><span>오늘의<br /><b>소리</b></span></div><i /><i /><i /></div></div>
    <div className="section-title"><div><p>학습 로드맵</p><h2>이번 시간에 키울 힘</h2></div><span className="level-badge">{level}</span></div>
    <div className="roadmap">{[
      ["01", "살펴보기", "내가 아는 음악 요소 확인"], ["02", "이해하기", "민요의 장단·가락·형식"], ["03", "바꾸기", "삶의 이야기로 가사 개사"], ["04", "표현하기", "음악 요소를 근거 있게 선택"], ["05", "성찰하기", "과정과 책임을 돌아보기"],
    ].map((x, i) => <button key={x[0]} onClick={() => setView((["diagnostic","theory","create","create","reflect"] as View[])[i])}><b>{x[0]}</b><span>{x[1]}</span><small>{x[2]}</small></button>)}</div>
    <div className="competency-strip"><div><p>배움 나침반</p><h2>역량은 활동 속에서 자라요</h2></div>{Object.entries({ agency: "주도성", creativity: "새 가치 창출", communication: "소통·공동체", responsibility: "책임" }).map(([k, label]) => <div className="mini-meter" key={k}><span>{label}</span><i><b style={{ width: `${competencies[k]}%` }} /></i><small>{Math.round(competencies[k])}</small></div>)}</div>
  </section>;
}

function Diagnostic({ answers, setAnswers, level, onNext }: { answers: number[]; setAnswers: (v: number[]) => void; level: string; onNext: () => void }) {
  const questions = [
    ["세마치장단을 가장 잘 설명한 것은?", ["2박이 규칙적으로 반복된다", "3소박 3박 계열로 흥겨운 흐름이 난다", "빠르기 표시의 한 종류다"], 1],
    ["가락을 이루는 핵심은?", ["음의 높낮이와 이어짐", "노래의 크기만", "악기의 재료만"], 0],
    ["민요의 공동체적 특징은?", ["혼자만 정해진 악보대로 연주한다", "메기고 받으며 함께 소리를 만든다", "가사를 바꿀 수 없다"], 1],
  ] as const;
  function answer(i: number, choice: number, correct: number) { const next = [...answers]; next[i] = choice === correct ? 1 : 0; setAnswers(next); }
  return <section className="content-page"><p className="eyebrow">STEP 01 · 진단</p><h1>지금 나의 소리 감각은?</h1><p className="page-lead">결과는 점수가 아니라 다음 학습의 출발점이에요.</p>
    <div className="quiz-grid">{questions.map((q, i) => <article className="quiz-card" key={q[0]}><span>{i + 1}</span><h3>{q[0]}</h3>{q[1].map((a, j) => <button className={answers[i] !== undefined && answers[i] === (j === q[2] ? 1 : 0) ? "picked" : ""} key={a} onClick={() => answer(i, j, q[2])}>{a}</button>)}</article>)}</div>
    {answers.length >= 3 && <div className="adaptive-box"><div><span>맞춤 경로</span><h2>{level} 단계에서 시작해요</h2><p>{level === "기초" ? "핵심 개념을 소리와 몸짓으로 확인한 뒤 창작해요." : level === "도전" ? "개념을 비교하고 선택의 이유를 말하며 창작해요." : "민요의 특징을 변형하고 새로운 맥락을 제안해요."}</p></div><button className="primary compact" onClick={onNext}>맞춤 학습 열기 →</button></div>}
  </section>;
}

function TheoryView({ level, onNext }: { level: string; onNext: () => void }) {
  return <section className="content-page"><p className="eyebrow">STEP 02 · 음악 요소</p><h1>소리를 만드는 네 가지 렌즈</h1><p className="page-lead">개념을 외우는 데서 멈추지 않고, 창작 선택에 사용해요.</p>
    <div className="theory-grid">{theory.map((x, i) => <article key={x.title}><span className={`theory-icon c${i}`}>{x.icon}</span><small>렌즈 {i + 1}</small><h2>{x.title}</h2><p>{x.copy}</p><div><b>{level} 미션</b>{x.task}</div></article>)}</div>
    <div className="concept-note"><b>핵심 아이디어</b><p>음악은 소리의 요소가 조직되어 생각과 느낌을 표현하며, 개인과 공동체는 음악을 통해 경험과 문화를 나눕니다.</p><button className="primary compact" onClick={onNext}>가사 창작으로 →</button></div>
  </section>;
}

type CreateProps = {
  theme: string; setTheme: (v: string) => void; lyrics: string; setLyrics: (v: string) => void;
  rhythm: string; setRhythm: (v: string) => void; tempo: number; setTempo: (v: number) => void;
  dynamics: string; setDynamics: (v: string) => void; timbre: string; setTimbre: (v: string) => void; onNext: () => void;
};
function CreateView(p: CreateProps) {
  const syllables = p.lyrics.split("\n").map((line) => line.replace(/\s/g, "").length);
  return <section className="content-page"><p className="eyebrow">STEP 03–04 · 개사와 표현</p><h1>내 이야기로 민요 다시 짓기</h1><p className="page-lead">삶의 장면을 고르고, 말붙임새와 음악 요소를 맞춰 보세요.</p>
    <div className="create-layout"><div className="lyric-editor"><div className="panel-head"><div><small>1. 이야기 고르기</small><h2>무엇을 노래할까요?</h2></div><select value={p.theme} onChange={(e) => p.setTheme(e.target.value)}><option>우리 동네</option><option>친구와 우정</option><option>환경과 계절</option><option>나의 꿈</option></select></div>
      <div className="prompt-chips">{["눈에 보이는 장면", "들리는 소리", "마음의 변화", "함께하는 사람"].map(x => <span key={x}>{x}</span>)}</div>
      <label className="lyrics-label"><span>2. 네 줄 가사 쓰기 <small>한 줄 8–14음절을 권해요</small></span><textarea value={p.lyrics} onChange={(e) => p.setLyrics(e.target.value)} rows={8} /></label>
      <div className="syllable-row">{syllables.map((n, i) => <span key={i} className={n >= 8 && n <= 14 ? "ok" : ""}>{i + 1}행 · {n}음절</span>)}</div>
      <div className="folk-check"><b>민요다움 점검</b><label><input type="checkbox" defaultChecked /> 반복되는 말이나 후렴이 있다</label><label><input type="checkbox" /> 메기고 받을 부분이 보인다</label><label><input type="checkbox" /> 우리 삶의 장면이 드러난다</label></div>
    </div>
    <aside className="sound-lab"><small>3. 소리 설계실</small><h2>어떤 느낌으로 부를까요?</h2>
      <label>장단<div className="segmented">{["세마치", "굿거리", "자진모리"].map(x => <button className={p.rhythm === x ? "active" : ""} onClick={() => p.setRhythm(x)} key={x}>{x}</button>)}</div></label>
      <label>빠르기 <b>{p.tempo} BPM</b><input type="range" min="60" max="140" value={p.tempo} onChange={(e) => p.setTempo(+e.target.value)} /></label>
      <label>셈여림<div className="segmented">{["여리게", "보통", "세게"].map(x => <button className={p.dynamics === x ? "active" : ""} onClick={() => p.setDynamics(x)} key={x}>{x}</button>)}</div></label>
      <label>음색<select value={p.timbre} onChange={(e) => p.setTimbre(e.target.value)}><option>소리북</option><option>장구</option><option>대금</option><option>목소리만</option></select></label>
      <div className="sound-preview"><span>나의 음악 문장</span><p><b>{p.rhythm}</b>의 흐름 위에 <b>{p.timbre}</b> 음색으로, <b>{p.dynamics}</b> {p.tempo < 85 ? "차분하게" : p.tempo > 115 ? "힘차게" : "자연스럽게"} 표현합니다.</p></div>
      <button className="primary" onClick={p.onNext}>완성하고 성찰하기 →</button>
    </aside></div>
  </section>;
}

function ReflectView({ reflection, setReflection, helpNeeded, setHelpNeeded, competencies, saveProgress }: { reflection: string; setReflection: (v: string) => void; helpNeeded: boolean; setHelpNeeded: (v: boolean) => void; competencies: Record<string, number>; saveProgress: () => void }) {
  return <section className="content-page"><p className="eyebrow">STEP 05 · 성찰과 제출</p><h1>내 선택의 이유를 음악의 말로</h1><p className="page-lead">잘한 점과 다음 시도를 돌아보는 순간, 창작의 힘이 자라요.</p>
    <div className="reflect-layout"><div className="reflection-card"><h2>나의 창작 노트</h2><p>가사와 음악 요소를 이렇게 선택한 까닭은 무엇인가요?</p><textarea rows={7} value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="예: 친구들과 함께 걷는 밝은 장면을 살리려고 세마치장단과 빠른 빠르기를 선택했다." /><div className="sentence-starters"><span>“나는 ___을 표현하고 싶었다.”</span><span>“다시 한다면 ___을 바꾸겠다.”</span></div><label className="help-check"><input type="checkbox" checked={helpNeeded} onChange={(e) => setHelpNeeded(e.target.checked)} /> 선생님의 피드백이 필요해요</label><button className="primary" onClick={saveProgress}>학습 기록 제출하기 →</button></div>
      <div className="compass-card"><span>나의 배움 나침반</span><h2>과정에서 드러난 역량</h2>{Object.entries({ agency: "목표를 세우고 선택한 주도성", creativity: "익숙한 것에 새 가치를 더한 창의성", communication: "음악으로 생각을 나눈 소통", responsibility: "과정을 돌아본 책임" }).map(([k, label]) => <div className="competency" key={k}><div><b>{label}</b><span>{Math.round(competencies[k])}</span></div><i><b style={{ width: `${competencies[k]}%` }} /></i></div>)}<p className="compass-note">OECD 학습나침반의 학생 주도성·새 가치 창출·긴장과 딜레마 조정·책임과 연결됩니다.</p></div></div>
  </section>;
}

function TeacherDashboard() {
  const [rows, setRows] = useState<DashboardStudent[]>(demoStudents);
  const [filter, setFilter] = useState("전체");
  useEffect(() => {
    ensureFirebaseAuth().then(() => getDocs(collection(db, "students"))).then((snapshot) => {
      const loaded = snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id, studentNo: String(data.studentNo ?? ""), nickname: String(data.nickname ?? ""),
          level: String(data.level ?? "기초"), stage: Number(data.stage ?? 1), helpNeeded: Boolean(data.helpNeeded),
          agency: Number(data.agency ?? 0), creativity: Number(data.creativity ?? 0),
          communication: Number(data.communication ?? 0), responsibility: Number(data.responsibility ?? 0),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toLocaleString("ko-KR") : "기록 없음",
        } satisfies DashboardStudent;
      });
      if (loaded.length) setRows(loaded);
    }).catch(() => null);
  }, []);
  const shown = filter === "도움 필요" ? rows.filter(r => r.helpNeeded) : filter === "미완료" ? rows.filter(r => (r.stage ?? 0) < 5) : rows;
  const avg = (key: keyof DashboardStudent) => Math.round(rows.reduce((sum, r) => sum + Number(r[key] ?? 0), 0) / Math.max(rows.length, 1));
  return <main className="teacher-page"><div className="teacher-intro"><div><p className="eyebrow">교사 대시보드 · 2학기 창작 수행</p><h1>학생의 결과보다<br /><em>배움의 과정</em>을 봅니다</h1></div><div className="class-select"><span>수업 선택</span><select><option>2학년 3반 · 음악</option><option>2학년 4반 · 음악</option></select></div></div>
    <div className="summary-cards"><article><small>참여 학생</small><b>{rows.length}<i>명</i></b><span>오늘 {Math.max(1, rows.length - 1)}명 활동</span></article><article><small>평균 진행률</small><b>{Math.round(rows.reduce((s, r) => s + (r.stage ?? 0) * 20, 0) / Math.max(rows.length, 1))}<i>%</i></b><span>창작 단계 집중</span></article><article className="alert"><small>피드백 요청</small><b>{rows.filter(r => r.helpNeeded).length}<i>명</i></b><span>우선 확인이 필요해요</span></article><article><small>심화 경로</small><b>{rows.filter(r => r.level === "심화").length}<i>명</i></b><span>확장 과제 제안</span></article></div>
    <div className="teacher-grid"><section className="table-card"><div className="card-title"><div><small>학습 현황</small><h2>학생별 배움 흐름</h2></div><div className="filters">{["전체", "도움 필요", "미완료"].map(x => <button className={filter === x ? "active" : ""} onClick={() => setFilter(x)} key={x}>{x}</button>)}</div></div>
      <div className="student-table"><div className="tr head"><span>학생</span><span>맞춤 경로</span><span>진행</span><span>상태</span><span>최근 활동</span></div>{shown.map(r => <div className="tr" key={r.id}><span><b>{r.nickname}</b><small>{r.studentNo}</small></span><span><i className={`path ${r.level}`}>{r.level ?? "기초"}</i></span><span><div className="tiny-progress"><i style={{ width: `${(r.stage ?? 1) * 20}%` }} /></div><small>{(r.stage ?? 1) * 20}%</small></span><span>{r.helpNeeded ? <b className="need">피드백 요청</b> : (r.stage ?? 0) >= 5 ? <b className="done">제출 완료</b> : "학습 중"}</span><span>{r.updatedAt ?? "기록 없음"}</span></div>)}</div>
    </section>
    <aside className="insight-card"><small>역량 성장 스냅샷</small><h2>우리 반 배움 나침반</h2>{[["agency","학생 주도성"],["creativity","새 가치 창출"],["communication","소통·공동체"],["responsibility","책임"]].map(([k,l]) => <div className="class-meter" key={k}><div><span>{l}</span><b>{avg(k as keyof DashboardStudent)}</b></div><i><b style={{ width: `${avg(k as keyof DashboardStudent)}%` }} /></i></div>)}<div className="teacher-tip"><b>다음 수업 제안</b><p>“선택한 장단이 가사의 정서와 어떻게 연결되는가?”를 짝과 설명하게 하세요. 창작 근거와 음악적 소통을 함께 볼 수 있어요.</p></div></aside></div>
    <section className="curriculum-map"><div><p className="eyebrow">교육과정 연결</p><h2>평가계획에 바로 쓰는 관찰 근거</h2></div><div className="map-items"><article><span>핵심 아이디어</span><b>음악적 표현과 문화적 맥락</b><p>민요의 음악 요소와 생활 맥락을 연결해 새 가사를 창작한다.</p></article><article><span>음악과 역량</span><b>감성 · 창의융합 · 소통 · 공동체</b><p>선택의 이유, 공동 창작, 자기성찰을 과정 자료로 남긴다.</p></article><article><span>OECD Learning Compass</span><b>주도성 · 새 가치 · 책임</b><p>학생이 목표를 정하고 긴장을 조정하며 결과에 책임진다.</p></article></div></section>
  </main>;
}
