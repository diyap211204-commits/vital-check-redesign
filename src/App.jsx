import { useState, useEffect } from "react";
import { ACT, EMPTY, INPUT_STORAGE_KEY, num, load, analyse, Bar, Field, C, SAMPLE, METRICS, PLANS, Chart } from "./lib.jsx";

const VIEWS = [["overview", "Overview", "◐"], ["ideal", "Ideal weight", "◎"], ["priorities", "Priorities", "☑"], ["plan", "Meal & move", "✿"], ["trends", "Trends", "↗"]];
const TIPS = {
  "Body Mass Index": [["Cut sugary drinks and fried snacks", "Fill half your plate with vegetables", "Walk 8,000 steps a day", "Eat slowly and stop at 80% full"], ["Eat 5 smaller meals a day", "Add nuts, milk, eggs or paneer", "Lift weights 3 times a week"]],
  "Waist size": [["Strength train 3 times a week", "Add protein and fibre to every meal", "Sleep 7-8 hours; poor sleep adds belly fat", "Cut refined flour and sweets"]],
  "Fasting sugar": [["Finish dinner by 8 pm", "Swap white rice and bread for millets, oats and dal", "Walk 15 minutes after dinner", "Ask for an HbA1c test"]],
  "Post-meal sugar (1.5 h)": [["Eat vegetables and protein before carbs", "Halve rice and roti portions", "Walk 10-15 minutes after every meal", "Avoid fruit juice and sweets after meals"]],
  "Blood pressure": [["Keep salt under 5 g a day (skip pickles, papad, packaged snacks)", "Add banana, spinach, curd and coconut water", "Slow breathing for 10 minutes daily", "Measure at the same time every day and note it"]],
};
const TARGET = { "Body Mass Index": "BMI 18.5 to 24.9", "Waist size": "Waist-to-height ratio below 0.50", "Fasting sugar": "Under 100 mg/dL", "Post-meal sugar (1.5 h)": "Under 140 mg/dL", "Blood pressure": "Below 120/80 mmHg" };
const RANK = { bad: 0, warn: 1, good: 2 };

function normalize(r) {
  const errs = {}, o = { ...r };
  const ok = (k, v, lo, hi, msg) => { if (v === "" || v == null) return ""; const n = +v; if (isNaN(n) || n < lo || n > hi) { errs[k] = msg; return ""; } return String(n); };
  const cv = (v, k) => (v === "" || v == null || isNaN(+v) ? v : String(+(+v * k).toFixed(1)));
  let hc = "";
  if (r.ft !== "" || r.inch !== "") {
    const ft = +r.ft, inch = +(r.inch || 0);
    if (r.ft === "" || isNaN(ft) || ft < 3 || ft > 8 || isNaN(inch) || inch < 0 || inch >= 12) errs.height = "Enter feet (3-8) and inches (0-11), e.g. 5 ft 3 in.";
    else hc = String(+(ft * 30.48 + inch * 2.54).toFixed(1));
  }
  o.height = hc;
  o.weight = ok("weight", r.weight, 25, 300, "Weight should be 25-300 kg.");
  o.waist = ok("waist", cv(r.waist, r.su === "in" ? 2.54 : 1), 40, 200, r.su === "in" ? "Waist should be 16-79 inches." : "Waist should be 40-200 cm.");
  o.age = ok("age", r.age, 5, 110, "Age should be 5-110");
  o.fasting = ok("fasting", r.fasting, 30, 600, "Fasting sugar should be 30-600 mg/dL");
  o.post = ok("post", r.post, 30, 600, "Post-meal sugar should be 30-600 mg/dL");
  o.sys = ok("sys", r.sys, 70, 260, "Systolic should be 70-260");
  o.dia = ok("dia", r.dia, 40, 160, "Diastolic should be 40-160");
  if (o.sys && o.dia && +o.sys <= +o.dia) { errs.sys = "Systolic (upper) must be higher than diastolic"; o.sys = ""; o.dia = ""; }
  if (o.height && o.weight) { const b = +o.weight / ((+o.height / 100) ** 2); if (b < 12 || b > 65) { errs.weight = "Height and weight do not fit together. Please check your units."; o.weight = ""; } }
  if (o.height && o.waist && (+o.waist / +o.height < 0.25 || +o.waist / +o.height > 1)) { errs.waist = "Waist looks off for your height. Check units."; o.waist = ""; }
  return { f: o, errs };
}

export default function App() {
  const [view, setView] = useState("overview");
  const [raw, setRaw] = useState(load);
  const { f, errs } = normalize(raw);
  const [hist, setHist] = useState(() => { try { return JSON.parse(localStorage.getItem("vch") || "[]"); } catch { return []; } });
  const [metric, setMetric] = useState("weight");
  const [veg, setVeg] = useState(true);
  const [done, setDone] = useState({});
  const [saved, setSaved] = useState(false);
  const [rep, setRep] = useState(false);
  const [dark, setDark] = useState(() => !!(window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches));
  const set = (k, v) => setRaw((p) => ({ ...p, [k]: v }));
  const Un = (k, fld, opts) => <span className="un">{opts.map((o) => <button key={o} className={raw[k] === o ? "on" : ""} onClick={() => setRaw({ ...raw, [k]: o, [fld]: "" })}>{o}</button>)}</span>;
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; }, [dark]);
  useEffect(() => { try { localStorage.setItem(INPUT_STORAGE_KEY, JSON.stringify(raw)); } catch {} }, [raw]);
  useEffect(() => { try { localStorage.setItem("vch", JSON.stringify(hist)); } catch {} }, [hist]);

  const h = num(f.height), w = num(f.weight), a = num(f.age);
  const ready = !!(h && w), r = ready ? analyse(f) : null;
  const m = h ? h / 100 : 0, bmi = ready ? w / (m * m) : 0, lo = 18.5 * m * m, hi = 24.9 * m * m;
  const fat = ready && a ? 1.2 * bmi + 0.23 * a - (f.sex === "male" ? 10.8 : 0) - 5.4 : null;
  const weeks = !ready ? 0 : bmi >= 25 ? Math.ceil((w - hi) / 0.5) : bmi < 18.5 ? Math.ceil((lo - w) / 0.25) : 0;
  const tone = r ? (r.score >= 80 ? "good" : r.score >= 55 ? "warn" : "bad") : "good";
  const grade = r ? (r.score >= 90 ? "A" : r.score >= 80 ? "B" : r.score >= 65 ? "C" : r.score >= 50 ? "D" : "E") : "";
  const L = r && r.diab ? r.diab.L : 0;
  const plan = PLANS[L >= 1 ? "sugar" : bmi >= 25 ? "lean" : "bal"];
  const male = f.sex === "male", over = Math.max(0, h / 2.54 - 60), senior = a >= 65;
  const fm = ready ? [["Devine formula", (male ? 50 : 45.5) + 2.3 * over], ["Robinson formula", (male ? 52 : 49) + (male ? 1.9 : 1.7) * over], ["Miller formula", (male ? 56.2 : 53.1) + (male ? 1.41 : 1.36) * over], ["Hamwi formula", (male ? 48 : 45.4) + (male ? 2.7 : 2.27) * over]] : [];
  const loB = senior ? 22 * m * m : lo, hiB = senior ? 27 * m * m : hi, w22 = (senior ? 25 : 22) * m * m;
  const favg = fm.length ? fm.reduce((t, x) => t + x[1], 0) / fm.length : 0;
  let tgt = ready ? Math.min(hiB, Math.max(loB, (w22 + favg) / 2)) : 0;
  const why = [], wl = num(f.waist), wTgt = h ? Math.min(h / 2, male ? 93 : 79) : 0, wLoss = wl ? Math.max(0, wl - wTgt) : 0;
  if (ready) {
    why.push(`Average of the BMI mid-point (${w22.toFixed(1)} kg) and four standard height formulas (${favg.toFixed(1)} kg).`);
    if ((L >= 1 || num(f.sys) >= 130) && bmi >= 25) { const t2 = Math.max(loB, Math.min(tgt, 23 * m * m)); if (t2 < tgt) { tgt = t2; why.push("Moved to the lower half of your healthy range because sugar or blood pressure is raised. Weight loss lowers both."); } }
    if (wLoss > 0 && bmi >= 25) { const t3 = Math.max(loB, w - wLoss); if (t3 < tgt) { tgt = t3; why.push(`Your waist (${wl} cm) is above the ${wTgt.toFixed(0)} cm goal. Each kg lost trims roughly 1 cm, so the target allows for that.`); } }
    if (senior) why.push("At 65 or older, a slightly higher BMI (23 to 27) is healthy, so your range is adjusted.");
    if (f.act === 3) why.push("You are very active. If you carry a lot of muscle, you can sit above these numbers and still be healthy.");
  }
  const diff = ready ? tgt - w : 0, pace = diff > 0 ? 0.25 : 0.5, wk = Math.ceil(Math.abs(diff) / pace);
  const miles = [4, 8, 12].filter((x) => x * pace < Math.abs(diff) - 0.3).map((x) => [x, w + Math.sign(diff) * x * pace]);
  const col = (l) => C[l] || "var(--muted)";
  const lvl = (...t) => { const x = r ? r.items.filter((i) => t.includes(i.title)).map((i) => i.level) : []; return x.includes("bad") ? "bad" : x.includes("warn") ? "warn" : x.length ? "good" : "none"; };
  const snap = r ? [["Weight", "⚖️", lvl("Body Mass Index")], ["Waist", "📏", lvl("Waist size")], ["Sugar", "🩸", lvl("Fasting sugar", "Post-meal sugar (1.5 h)")], ["Pressure", "❤️", lvl("Blood pressure")]] : [];
  const prio = r ? [...r.items].filter((i) => TIPS[i.title]).sort((x, y) => RANK[x.level] - RANK[y.level]) : [];
  const tests = new Set();
  if (r) { if (L >= 1) { tests.add("HbA1c (3-month sugar average)"); tests.add("Lipid profile (cholesterol)"); } if (lvl("Blood pressure") !== "good" && lvl("Blood pressure") !== "none") { tests.add("Kidney function (creatinine)"); tests.add("ECG and lipid profile"); } if (lvl("Body Mass Index") !== "good" || lvl("Waist size") === "bad") { tests.add("Thyroid (TSH)"); tests.add("Liver function (SGPT)"); } }
  const goals = [];
  if (r) {
    if (bmi >= 25) goals.push(`Lose about ${Math.min(2, w - hi).toFixed(1)} kg (0.5 kg a week)`); else if (bmi < 18.5) goals.push("Gain about 1 kg with extra protein and strength work");
    if (num(f.fasting) >= 100) goals.push("Bring fasting sugar down by 10 mg/dL"); if (num(f.post) >= 140) goals.push("Keep post-meal sugar under 140 mg/dL");
    if (num(f.sys) >= 120) goals.push("Lower systolic pressure by 5 mmHg"); goals.push("Walk 7,000+ steps on at least 5 days a week", "Sleep 7 hours or more on 5 nights a week");
  }
  const changes = [];
  if (r) {
    const fs = num(f.fasting), pm = num(f.post), sy = num(f.sys), di = num(f.dia), ad = Math.abs(diff);
    changes.push(["⚖️", "Weight (recommended)", `${w} kg`, `${tgt.toFixed(1)} kg`, ad < 1 ? "On target" : `${diff < 0 ? "Lose" : "Gain"} ${ad.toFixed(1)} kg`, ad < 1 ? "good" : ad > 5 ? "bad" : "warn"]);
    if (wl) changes.push(["📏", "Waist", `${wl} cm`, `under ${wTgt.toFixed(0)} cm`, wLoss > 0 ? `Reduce ${wLoss.toFixed(0)} cm` : "On target", wLoss > 8 ? "bad" : wLoss > 0 ? "warn" : "good"]);
    if (fs != null) changes.push(["🌅", "Fasting sugar", `${fs} mg/dL`, "under 100", fs >= 100 ? `Lower by ${fs - 99}` : fs < 70 ? "Too low, recheck" : "On target", fs >= 126 ? "bad" : fs >= 100 || fs < 70 ? "warn" : "good"]);
    if (pm != null) changes.push(["🍽️", "Post-meal sugar", `${pm} mg/dL`, "under 140", pm >= 140 ? `Lower by ${pm - 139}` : "On target", pm >= 200 ? "bad" : pm >= 140 ? "warn" : "good"]);
    if (sy && di) changes.push(["❤️", "Blood pressure", `${sy}/${di}`, "below 120/80", sy >= 120 || di >= 80 ? `Lower by ${Math.max(0, sy - 119)}/${Math.max(0, di - 79)}` : "On target", sy >= 140 || di >= 90 ? "bad" : sy >= 120 || di >= 80 ? "warn" : "good"]);
  }
  const save = () => {
    const d = new Date().toISOString().slice(0, 10), e = { d, weight: w, bmi: +bmi.toFixed(1), fasting: num(f.fasting), post: num(f.post), sys: num(f.sys), score: r.score };
    setHist((p) => [...p.filter((x) => x.d !== d), e].sort((x, y) => x.d.localeCompare(y.d)));
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };
  const pts = hist.filter((e) => e[metric] != null).map((e) => ({ d: e.d, y: e[metric] }));
  const ticks = prio.reduce((n, i) => n + TIPS[i.title][i.label === "Underweight" && TIPS[i.title][1] ? 1 : 0].filter((t) => done[t]).length, 0);
  const total = prio.reduce((n, i) => n + TIPS[i.title][i.label === "Underweight" && TIPS[i.title][1] ? 1 : 0].length, 0);
  const Card = ({ t, children, cls = "" }) => <section className={"tile " + cls}><h3 className="th">{t}</h3>{children}</section>;

  const inputs = (
    <div className="form">
      <fieldset><legend>1 · Profile</legend>
        <div className="seg">{["female", "male"].map((s) => <button key={s} className={f.sex === s ? "on" : ""} onClick={() => set("sex", s)}>{s === "female" ? "Female" : "Male"}</button>)}</div>
        <div className="grid"><Field label="Age" unit="yrs" name="age" f={raw} set={set} err={errs.age} /><label className="field"><span className="lab">Activity</span><select className="sel" value={raw.act} onChange={(e) => set("act", +e.target.value)}>{ACT.map(([n], i) => <option key={n} value={i}>{n}</option>)}</select></label></div></fieldset>
      <fieldset><legend>2 · Body</legend>
        <div className="grid">
          <Field label="Height" unit="ft" name="ft" f={raw} set={set} hint="e.g. 5" err={errs.height} />
          <Field label="and" unit="in" name="inch" f={raw} set={set} hint={f.height ? `= ${f.height} cm` : "e.g. 3"} />
          <Field label="Weight" unit="kg" name="weight" f={raw} set={set} err={errs.weight} />
          <Field label={<>Waist {Un("su", "waist", ["in", "cm"])}</>} unit={raw.su} name="waist" f={raw} set={set} hint="At the navel" err={errs.waist} />
        </div></fieldset>
      <fieldset><legend>3 · Blood sugar</legend>
        <div className="grid"><Field label="Fasting" unit="mg/dL" name="fasting" f={raw} set={set} err={errs.fasting} hint="Morning, empty stomach" /><Field label="Post-meal" unit="mg/dL" name="post" f={raw} set={set} err={errs.post} hint="1.5 h after eating" /></div></fieldset>
      <fieldset><legend>4 · Blood pressure</legend>
        <div className="grid"><Field label="Systolic" unit="mmHg" name="sys" f={raw} set={set} err={errs.sys} /><Field label="Diastolic" unit="mmHg" name="dia" f={raw} set={set} err={errs.dia} /></div></fieldset>
      <div className="acts"><button className="btn ghost" onClick={() => setRaw({ ...EMPTY, ...SAMPLE })}>Load sample</button><button className="btn ghost" onClick={() => setRaw(EMPTY)}>Clear all</button></div>
    </div>
  );
  const headline = { good: "You are in good shape", warn: "A few things need attention", bad: "Several areas need care" }[tone];
  const arc = r ? (r.score / 100) * 251.3 : 0;

  return (
    <div className="shell">
      <header className="top">
        <div className="logo"><span className="mark">V</span><div><b>Vital Check</b><small>Body, sugar &amp; pressure</small></div></div>
        <nav className="tabs">{VIEWS.map(([k, n]) => <button key={k} className={view === k ? "on" : ""} onClick={() => setView(k)}>{n}</button>)}</nav>
        <div className="tools"><button className="btn solid" onClick={() => { setRep(false); setView("overview"); }}>✎ Edit details</button><button className="icon" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? "☀" : "☾"}</button></div>
      </header>

      <main className="page">
        {view === "overview" && (!r || !rep ? <div className="welcome">
          <div className="wtext"><span className="eyebrow">Your 2-minute health check</span><h1>Know your numbers.<br />Know your next step.</h1><p>Enter your height and weight to start. Add sugar and blood pressure for a fuller report with an action plan, ideal weight and meal ideas.</p>{Object.values(errs).map((e) => <p key={e} className="al">{e}</p>)}</div>
          <div className="tile wform">{inputs}<button className="btn solid wide" disabled={!ready} onClick={() => setRep(true)}>{ready ? "Show my report →" : "Enter height and weight to continue"}</button></div></div> : <>
          <div className="bento">
            <section className="tile score" style={{ "--c": col(tone) }}>
              <svg viewBox="0 0 200 118" className="gauge"><path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--line)" strokeWidth="14" strokeLinecap="round" /><path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--c)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${arc} 251.3`} /><text x="100" y="92" textAnchor="middle" className="gn">{r.score}</text><text x="100" y="112" textAnchor="middle" className="gl">HEALTH SCORE</text></svg>
              <span className="pill">Grade {grade}</span><h2>{headline}</h2><p>{prio.filter((i) => i.level !== "good").length} of {r.items.length} readings need action.</p>
            </section>
            <section className="tile stats">{[...r.chips, ...(fat != null ? [["Body fat (est.)", `${fat.toFixed(0)}%`]] : []), ["Target weight", `${tgt.toFixed(1)} kg`], ...(weeks > 0 ? [["To healthy BMI", `~${weeks} weeks`]] : [])].map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}</section>
            <section className="tile snapbar">{snap.map(([n, i, l]) => <div key={n} style={{ "--c": col(l) }}><span className="dot" /><span>{i} {n}</span><small>{{ good: "On track", warn: "Watch", bad: "Act now", none: "Not entered" }[l]}</small></div>)}</section>
          </div>
          {Object.keys(errs).length > 0 && <p className="al">Ignored values that looked wrong: {Object.values(errs).join(" ")}</p>}
          {r.alert && <p className="al">One or more readings are in a high-risk range. Please see a doctor soon.</p>}
          {r.diab && <div className={"diab " + ["good", "warn", "bad"][L]}><b>Diabetes screen</b><span>{r.diab.title}</span></div>}
          <div className="readings">{r.items.map((it) => <article className="tile read" key={it.title} style={{ "--c": col(it.level) }}><div className="rt"><h3>{it.icon} {it.title}</h3><span className="badge">{it.label}</span></div><div className="val">{it.value}</div><Bar {...it.bar} /><p>{it.text}</p></article>)}</div>
          <Card t="What needs to change"><div className="tbl">{changes.map(([i, n, now, goal, act, l]) => <div className="tr" key={n} style={{ "--c": col(l) }}><span className="cn">{i} {n}</span><span className="cv"><b>{now}</b> → {goal}</span><span className="badge">{act}</span></div>)}</div>
            {Math.abs(diff) / w > 0.1 && <p className="sub">This is a big change, so go in stages: first aim for about {(w * 0.07).toFixed(1)} kg ({diff < 0 ? "loss" : "gain"} of roughly 7%), then reassess with your doctor.</p>}</Card>
          <div className="acts"><button className="btn solid" onClick={save}>{saved ? "Saved ✓" : "Save today's reading"}</button><button className="btn ghost" onClick={() => setView("priorities")}>See how to get there →</button><button className="btn ghost" onClick={() => { try { window.print(); } catch {} }}>Print / PDF</button></div>
          <p className="disc">General guidance, not a diagnosis. Please consult a doctor to interpret your results.</p></>)}

        {view === "ideal" && (!ready ? <Card t="Ideal weight"><p className="sub">Enter your height and weight to see your ideal weight.</p></Card> : <>
          <section className="tile target" style={{ "--c": col(Math.abs(diff) < 1 ? "good" : "warn") }}>
            <div><span className="eyebrow">Recommended target weight</span><h2 className="huge">{tgt.toFixed(1)}<small> kg</small></h2><p>{Math.abs(diff) < 1 ? "You are already at your ideal weight. Focus on maintaining it." : `${diff < 0 ? "Lose" : "Gain"} about ${Math.abs(diff).toFixed(1)} kg, roughly ${wk} weeks at ${pace} kg a week.`}</p></div>
            <div className="now"><small>Current</small><b>{w} kg</b></div></section>
          <div className="two">
            <Card t="Where you are on the healthy range"><Bar v={w} min={Math.round(loB - 15)} max={Math.round(hiB + 25)} segs={[[loB, "warn"], [hiB, "good"], [hiB + 10, "warn"], [Math.round(hiB + 25), "bad"]]} /><p className="sub">Healthy weight for {h} cm: {loB.toFixed(1)} to {hiB.toFixed(1)} kg{senior ? " (adjusted for age 65+)" : ""}.</p></Card>
            <Card t="Why this target"><ul className="chk">{why.map((x) => <li key={x}><span>✔</span>{x}</li>)}</ul></Card>
          </div>
          <Card t="Ideal weight by method"><ul className="rows">
            {[["Healthy BMI range", `${loB.toFixed(1)} to ${hiB.toFixed(1)} kg`, null], ["BMI mid-point", `${w22.toFixed(1)} kg`, w22], ...fm.map(([n, v]) => [n, `${v.toFixed(1)} kg`, v]), ["Waist-based", wl ? (wLoss > 0 ? `${(w - wLoss).toFixed(1)} kg` : "Waist already healthy") : "Add your waist size", wl && wLoss > 0 ? w - wLoss : null]].map(([n, v, x]) => <li key={n}><b>{n}</b><span>{v}</span>{x != null && <em>{x - w < 0 ? "" : "+"}{(x - w).toFixed(1)} kg</em>}</li>)}</ul></Card>
          <div className="two">
            {Math.abs(diff) >= 1 && <Card t="Your milestones"><ul className="rows">{miles.map(([x, v]) => <li key={x}><b>Week {x}</b><span>{v.toFixed(1)} kg</span></li>)}<li><b>Week {wk}</b><span>{tgt.toFixed(1)} kg, reached</span></li></ul><p className="sub">{diff < 0 ? "0.5 kg a week is a safe pace. Faster loss risks muscle loss." : "0.25 kg a week keeps the gain lean. Pair extra meals with strength training."}</p></Card>}
            {wl && <Card t="Waist goal"><p className="sub">Aim for under <b>{wTgt.toFixed(0)} cm</b> (half your height, and below the {male ? "94" : "80"} cm risk line). You are at {wl} cm{wLoss > 0 ? `, so about ${wLoss.toFixed(0)} cm to go.` : ", which is already on target."}</p></Card>}
          </div></>)}

        {view === "priorities" && (!r ? <Card t="Nothing to prioritise yet"><p className="sub">Add your details on the Overview tab first.</p></Card> : <>
          <section className="tile prog"><div><small>Action checklist</small><b>{ticks}/{total} done</b></div><i><u style={{ width: total ? (ticks / total) * 100 + "%" : 0 }} /></i></section>
          <div className="readings">{prio.map((it, n) => { const tp = TIPS[it.title][it.label === "Underweight" && TIPS[it.title][1] ? 1 : 0]; return (
            <article className="tile read" key={it.title} style={{ "--c": col(it.level) }}>
              <div className="rt"><h3>{n + 1}. {it.title}</h3><span className="badge">{it.label}</span></div>
              <p className="sub">{it.text}</p>
              {it.level === "good" ? <p className="ok">On track. Keep doing what you are doing.</p> : <ul className="chk">{tp.map((t) => <li key={t}><label><input type="checkbox" checked={!!done[t]} onChange={() => setDone({ ...done, [t]: !done[t] })} />{t}</label></li>)}</ul>}
              <p className="tg">Target: <b>{TARGET[it.title]}</b></p></article>); })}</div>
          <div className="two"><Card t="Your 30-day goals"><ul className="chk">{goals.map((g) => <li key={g}><span>◎</span>{g}</li>)}</ul></Card>
            {tests.size > 0 && <Card t="Ask your doctor about"><ul className="chk">{[...tests].map((t) => <li key={t}><span>＋</span>{t}</li>)}</ul></Card>}</div></>)}

        {view === "plan" && <>
          <Card t={plan[0]}><p className="sub">{plan[1]}{!ready && " Add your measurements for a personalised plan."}</p>
            <div className="seg">{[[true, "Vegetarian"], [false, "Non-vegetarian"]].map(([v, n]) => <button key={n} className={veg === v ? "on" : ""} onClick={() => setVeg(v)}>{n}</button>)}</div>
            <div className="meals">{plan[2].map(([n, vg, nv]) => <div key={n}><small>{n}</small><span>{veg ? vg : nv}</span></div>)}</div>
            {r && r.chips[0] && r.chips[0][0] === "Daily calories" && <p className="sub">Target about {r.chips[0][1]} a day.</p>}</Card>
          <div className="two">
            <Card t="Weekly movement"><ul className="chk"><li><span>🚶</span>Walk 10-15 minutes after each main meal.</li><li><span>🏋</span>Strength training 2-3 times a week.</li>{(bmi >= 25 || L >= 1) && <li><span>🚴</span>150 minutes a week of brisk walking, cycling or swimming.</li>}<li><span>🧘</span>5-10 minutes of stretching or slow breathing before bed.</li></ul></Card>
            <Card t="Daily habits"><ul className="chk"><li><span>💧</span>Water: {ready ? (w * 0.033).toFixed(1) : "2-3"} litres a day.</li><li><span>😴</span>Sleep 7-8 hours; poor sleep raises sugar and blood pressure.</li><li><span>🧂</span>Keep salt under 5 g a day.</li></ul></Card></div></>}

        {view === "trends" && <>
          <Card t="Your progress"><div className="pills">{METRICS.map(([k, n]) => <button key={k} className={metric === k ? "on" : ""} onClick={() => setMetric(k)}>{n}</button>)}</div><Chart pts={pts} /></Card>
          <Card t="Saved readings">{hist.length === 0 ? <p className="sub">Nothing saved yet. Open Overview and tap Save today's reading.</p> : <ul className="rows">{[...hist].reverse().map((e) => <li key={e.d}><b>{e.d}</b><span>{e.weight} kg, BMI {e.bmi}{e.fasting != null && `, fasting ${e.fasting}`}{e.sys != null && `, BP ${e.sys}`}, score {e.score}</span><button className="x" aria-label="Delete" onClick={() => setHist(hist.filter((x) => x.d !== e.d))}>✕</button></li>)}</ul>}</Card></>}
      </main>

      <nav className="dock">{VIEWS.map(([k, n, ic]) => <button key={k} className={view === k ? "on" : ""} onClick={() => setView(k)}><i>{ic}</i><span>{n.split(" ")[0]}</span></button>)}</nav>

    </div>
  );
}
