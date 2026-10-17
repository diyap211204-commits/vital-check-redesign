
export const STEPS = ["Profile", "Body", "Sugar", "Pressure", "Report"];
export const C = { good: "var(--good)", warn: "var(--warn)", bad: "var(--bad)" };
export const ACT = [["Mostly sitting", 1.2], ["Light activity", 1.375], ["Moderate exercise", 1.55], ["Very active", 1.725]];
export const EMPTY = { sex: "female", age: "", act: 1, ft: "", inch: "", su: "in", height: "", weight: "", waist: "", fasting: "", post: "", sys: "", dia: "" };
export const INPUT_STORAGE_KEY = "vc-inputs-v2";
export const num = (v) => (v === "" || isNaN(+v) ? null : +v);
export const load = () => { try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(INPUT_STORAGE_KEY) || "{}") }; } catch { return EMPTY; } };

export function analyse(f) {
  const h = num(f.height), w = num(f.weight), wa = num(f.waist), a = num(f.age);
  const fs = num(f.fasting), pm = num(f.post), sy = num(f.sys), di = num(f.dia);
  const o = { items: [], recs: [], chips: [], score: 100, alert: false };
  const item = (title, icon, value, level, label, text, bar) => { o.items.push({ title, icon, value, level, label, text, bar }); if (level === "bad") o.alert = true; };
  const rec = (icon, text) => o.recs.push({ icon, text });
  let goal = 0;
  if (h && w) {
    const m = h / 100, bmi = w / (m * m), lo = 18.5 * m * m, hi = 24.9 * m * m;
    let lv = "good", lb = "Healthy weight", tx = `Your healthy range is ${lo.toFixed(1)} to ${hi.toFixed(1)} kg.`;
    if (bmi < 18.5) { lv = "warn"; lb = "Underweight"; o.score -= 12; goal = 300; tx += ` Gain about ${(lo - w).toFixed(1)} kg.`; rec("🥜", "Add nutrient-dense calories: nuts, dairy, eggs, legumes, and strength training to build muscle."); }
    else if (bmi >= 30) { lv = "bad"; lb = "Obese"; o.score -= 28; goal = -500; tx += ` Lose about ${(w - hi).toFixed(1)} kg.`; rec("🏃", "Aim for 0.25-0.5 kg loss a week with a modest deficit and 150+ minutes of brisk activity."); }
    else if (bmi >= 25) { lv = "warn"; lb = "Overweight"; o.score -= 14; goal = -500; tx += ` Lose about ${(w - hi).toFixed(1)} kg.`; rec("🥗", "Losing 5% of body weight improves sugar and blood pressure. Cut sugary drinks, walk 30 minutes daily."); }
    else rec("✅", "Your weight is in the ideal range. Keep balanced meals and regular activity.");
    item("Body Mass Index", "⚖️", bmi.toFixed(1), lv, lb, tx, { v: bmi, min: 15, max: 40, segs: [[18.5, "warn"], [25, "good"], [30, "warn"], [40, "bad"]] });
    o.chips.push(["Ideal weight", `${lo.toFixed(0)}-${hi.toFixed(0)} kg`], ["Water", `${(w * 0.033).toFixed(1)} L/day`]);
    if (a) {
      const bmr = 10 * w + 6.25 * h - 5 * a + (f.sex === "male" ? 5 : -161), t = Math.round((bmr * ACT[f.act][1] + goal) / 10) * 10;
      o.chips.unshift(["Daily calories", `${t} kcal`]);
    }
  }
  if (wa && h) {
    const [l1, l2] = f.sex === "male" ? [94, 102] : [80, 88], r = wa / h;
    let lv = "good", lb = "Low risk";
    if (wa >= l2 || r > 0.6) { lv = "bad"; lb = "High risk"; o.score -= 18; } else if (wa >= l1 || r >= 0.5) { lv = "warn"; lb = "Raised risk"; o.score -= 9; }
    item("Waist size", "📏", `${wa} cm`, lv, lb, `Waist-to-height ratio ${r.toFixed(2)} (aim below 0.50). Belly fat raises heart and diabetes risk.`, { v: wa, min: l1 - 25, max: l2 + 25, segs: [[l1, "good"], [l2, "warn"], [l2 + 25, "bad"]] });
    if (lv !== "good") rec("💪", "Reduce belly fat: more fibre and protein, fewer refined carbs, 2-3 strength sessions weekly.");
  }
  if (fs != null || pm != null) {
    const lf = fs == null ? 0 : fs >= 126 ? 2 : fs >= 100 ? 1 : 0, lp = pm == null ? 0 : pm >= 200 ? 2 : pm >= 140 ? 1 : 0, L = Math.max(lf, lp);
    const nm = ["Normal", "Prediabetes range", "Diabetes range"], hypo = fs != null && fs < 70;
    if (fs != null) item("Fasting sugar", "🌅", `${fs} mg/dL`, hypo ? "warn" : ["good", "warn", "bad"][lf], hypo ? "Low" : nm[lf], hypo ? "Below 70 mg/dL is low. Recheck, and see a doctor if it repeats." : "Normal is under 100, prediabetes 100-125, diabetes 126 or more.", { v: fs, min: 60, max: 180, segs: [[70, "warn"], [100, "good"], [126, "warn"], [180, "bad"]] });
    if (pm != null) item("Post-meal sugar (1.5 h)", "🍽️", `${pm} mg/dL`, ["good", "warn", "bad"][lp], nm[lp], "Normal is under 140, prediabetes 140-199, diabetes 200 or more.", { v: pm, min: 80, max: 260, segs: [[140, "good"], [200, "warn"], [260, "bad"]] });
    o.score -= [0, 12, 25][L];
    o.diab = { L, title: ["No diabetes signs in your readings", "Prediabetes range: act now, it is reversible", "Readings are in the diabetes range"][L] };
    if (L === 0) rec("🍎", "Sugar looks normal. Limit sweets and refined flour, and retest yearly.");
    if (L === 1) { rec("🚶", "Walk 10-15 minutes after meals, choose whole grains and vegetables, and ask for an HbA1c test."); rec("🥣", "Swap white rice, bread and sweet drinks for millets, oats, dal and salad."); }
    if (L === 2) { rec("🩺", "See a doctor soon for HbA1c and a confirmatory test. One reading alone does not diagnose diabetes."); rec("🥣", "Eat smaller, regular meals with protein and fibre; avoid sugary drinks and sweets."); }
  }
  if (sy && di) {
    let lv = "good", lb = "Healthy", tx = "Under 120/80 is the target.";
    if (sy > 180 || di > 120) { lv = "bad"; lb = "Unhealthy: crisis"; tx = "Get medical care today, especially with headache, chest pain or breathlessness."; o.score -= 35; }
    else if (sy >= 140 || di >= 90) { lv = "bad"; lb = "Unhealthy: Stage 2"; tx = "Consistently high readings need medical review."; o.score -= 25; }
    else if (sy >= 130 || di >= 80) { lv = "warn"; lb = "Unhealthy: Stage 1"; tx = "Lifestyle changes first; confirm with repeat readings."; o.score -= 15; }
    else if (sy >= 120) { lv = "warn"; lb = "Elevated"; tx = "Slightly above ideal. Watch salt and stress."; o.score -= 6; }
    item("Blood pressure", "❤️", `${sy}/${di}`, lv, lb, tx, { v: sy, min: 90, max: 190, segs: [[120, "good"], [130, "warn"], [140, "warn"], [190, "bad"]] });
    rec(lv === "good" ? "✅" : "🧂", lv === "good" ? "Blood pressure is healthy. Keep salt moderate and stay active." : "Keep salt under 5 g a day, eat potassium-rich foods (banana, spinach), sleep 7-8 hours, and measure at the same time daily.");
  }
  rec("💧", "Drink enough water, avoid smoking, and get a full check-up every year.");
  o.score = Math.max(0, o.score);
  return o;
}

export const Bar = ({ v, min, max, segs }) => {
  let prev = min;
  const pos = Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));
  return (
    <div className="bar">
      <div className="track">{segs.map(([to, c]) => { const w = ((to - prev) / (max - min)) * 100; prev = to; return <i key={to} style={{ width: w + "%", background: C[c] }} />; })}</div>
      <b style={{ left: pos + "%" }} />
      <div className="ends"><span>{min}</span><span>{max}</span></div>
    </div>
  );
};

export const Field = ({ label, unit, name, f, set, hint, err }) => (
  <label className="field">
    <span className="lab">{label}</span>
    <span className="inp"><input type="number" inputMode="decimal" min="0" value={f[name]} onChange={(e) => set(name, e.target.value)} /><em>{unit}</em></span>
    {err ? <small className="err">{err}</small> : hint && <small>{hint}</small>}
  </label>
);


export const SAMPLE = { sex: "male", age: "38", act: 1, ft: "5", inch: "8", weight: "84", waist: "39", fasting: "112", post: "158", sys: "134", dia: "86" };
export const METRICS = [["weight", "Weight", "kg"], ["bmi", "BMI", ""], ["fasting", "Fasting sugar", "mg/dL"], ["post", "Post-meal sugar", "mg/dL"], ["sys", "Systolic BP", "mmHg"], ["score", "Health score", ""]];
export const PLANS = {
  sugar: ["Sugar-smart plan", "Low glycaemic meals for steady blood sugar.", [["Breakfast", "Moong dal chilla, mint chutney", "Vegetable omelette, 1 multigrain toast"], ["Lunch", "2 jowar rotis, dal, sabzi, salad, curd", "1 roti, grilled fish or chicken, sabzi, salad"], ["Snack", "Roasted chana or a few almonds", "Boiled egg, cucumber"], ["Dinner", "Millet khichdi with vegetables, buttermilk", "Light chicken or egg curry, sauteed vegetables"]]],
  lean: ["Lean plan", "Fewer calories, more protein and fibre.", [["Breakfast", "Vegetable oats upma", "2 egg whites, oats porridge"], ["Lunch", "1 roti, paneer or dal, big salad", "1 roti, grilled chicken, big salad"], ["Snack", "Fruit and sprouts chaat", "Fruit, 1 boiled egg"], ["Dinner", "Vegetable soup, paneer tikka", "Vegetable soup, grilled fish"]]],
  bal: ["Balanced plan", "Even meals to keep weight and energy steady.", [["Breakfast", "Poha with peanuts, fruit", "Egg bhurji, 2 toast, fruit"], ["Lunch", "2 rotis, dal, sabzi, curd", "Rice, dal, fish or chicken curry, salad"], ["Snack", "Nuts and a glass of milk", "Nuts and a glass of milk"], ["Dinner", "Roti, paneer, vegetables", "Roti, chicken or egg, vegetables"]]],
};

export function Chart({ pts, unit }) {
  if (pts.length < 2) return <p className="sub">Save at least two readings with this value to see a trend.</p>;
  const ys = pts.map((p) => p.y), lo = Math.min(...ys), sp = Math.max(...ys) - lo || 1;
  const X = (i) => 30 + i * (540 / (pts.length - 1)), Y = (y) => 160 - ((y - lo) / sp) * 110;
  return (
    <svg viewBox="0 0 600 210" className="chart" role="img" aria-label="Trend chart">
      <polyline fill="none" stroke="var(--acct)" strokeWidth="3" strokeLinejoin="round" points={pts.map((p, i) => `${X(i)},${Y(p.y)}`).join(" ")} />
      {pts.map((p, i) => <g key={p.d}><circle cx={X(i)} cy={Y(p.y)} r="5" fill="var(--panel)" stroke="var(--acct)" strokeWidth="3" /><text x={X(i)} y={Y(p.y) - 12} textAnchor="middle" fill="var(--ink)" fontSize="13">{p.y}</text><text x={X(i)} y="198" textAnchor="middle" fill="var(--muted)" fontSize="11">{p.d.slice(5)}</text></g>)}
    </svg>
  );
}
