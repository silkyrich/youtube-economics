/* ──────────────────────────────────────────────────────────────────
   The YouTube Economics Calculator
   All maths runs in the browser.  No data leaves the page.
   ────────────────────────────────────────────────────────────────── */

/* Default formatter — USD, no decimals unless the value is small. */
const fmt$ = (n) => {
  if (!isFinite(n)) return "—";
  const abs = Math.abs(n);
  const opts = abs >= 1000 ? { maximumFractionDigits: 0 }
            : abs >= 10   ? { maximumFractionDigits: 0 }
            :               { maximumFractionDigits: 2 };
  return (n < 0 ? "–$" : "$") + Math.abs(n).toLocaleString("en-US", opts);
};
const fmtN = (n, d=0) => isFinite(n) ? n.toLocaleString("en-US",{maximumFractionDigits:d}) : "—";
const fmtPct = (n, d=0) => isFinite(n) ? `${(n*100).toFixed(d)}%` : "—";

/* ──────────  Read inputs from DOM into a plain state object ──────────
   The number input (input.num) is the source of truth — it can hold
   values outside the slider's clamp range when the user types a
   precise figure that doesn't fit on the scrubber. */
function readState() {
  const s = {};
  document.querySelectorAll(".row[data-key]").forEach(row => {
    const key = row.dataset.key;
    const num = row.querySelector("input.num");
    if (num && num.value !== "") {
      const v = parseFloat(num.value);
      if (isFinite(v)) { s[key] = v; return; }
    }
    /* Fallback: read from the slider (used before initNumberInputs runs) */
    const inp = row.querySelector("input[type=range]");
    if (inp) {
      let v = parseFloat(inp.value);
      if (inp.dataset.log === "true") v = Math.pow(10, v);
      s[key] = v;
    }
  });
  s.country = document.getElementById("country").value;
  s.seTax   = document.getElementById("seTax").checked;
  return s;
}

/* ──────────  Core economic model ────────── */
function model(s) {
  /* Time --------------------------------------------------- */
  const productionHours = s.videosPerMonth * s.hoursPerVideo;
  const totalHours      = productionHours + s.overheadHours;
  const annualHours     = totalHours * 12;

  /* Revenue ------------------------------------------------ */
  // monetised views per video
  const monetisedViews   = s.viewsPerVideo * (s.watchedFraction / 100);
  // Ad revenue per video = RPM * (monetised views / 1000)
  const adPerVideo       = monetisedViews / 1000 * s.rpm;
  // Sponsorship: only some videos get one, and sponsor CPM applies to *raw* views
  const sponsorPerVideo  = (s.sponsorShare / 100) * (s.viewsPerVideo / 1000) * s.sponsorRate;

  const adRevenue        = adPerVideo      * s.videosPerMonth;
  const sponsorRevenue   = sponsorPerVideo * s.videosPerMonth;
  const otherRevenue     = s.memberRevenue;

  /* Long-tail catalogue uplift: assume back catalogue averages ~25% of
     a new video's first-month views *forever*.  Modelled as a small
     steady-state multiplier on ad+sponsor revenue. */
  const tail = 0.25;
  const grossRevenue = (adRevenue + sponsorRevenue) * (1 + tail) + otherRevenue;

  /* Costs -------------------------------------------------- */
  const variableCosts = s.varCosts * s.videosPerMonth;
  const fixedCosts    = s.fixedCosts;
  const gearAmort     = s.gearCost / 36;        // 3-year straight-line
  const totalCosts    = variableCosts + fixedCosts + gearAmort;

  const preTaxProfit  = grossRevenue - totalCosts;

  /* Tax ---------------------------------------------------- */
  const country = COUNTRIES.find(c => c.code === s.country) || COUNTRIES[0];
  const incomeTax = Math.max(0, preTaxProfit) * (s.taxRate / 100);
  const seTaxAmt  = s.seTax ? Math.max(0, preTaxProfit) * (country.se / 100) : 0;
  const totalTax  = incomeTax + seTaxAmt;
  const afterTax  = preTaxProfit - totalTax;

  /* Hourly wages ------------------------------------------- */
  const grossHourly   = totalHours > 0 ? grossRevenue / totalHours : 0;
  const preTaxHourly  = totalHours > 0 ? preTaxProfit / totalHours : 0;
  const netHourly     = totalHours > 0 ? afterTax     / totalHours : 0;

  /* Minimum wage on a comparable post-tax basis.
     Assume minimum-wage worker pays ~half the creator's tax rate
     (lower bracket, no SE tax). */
  const minTaxRate = Math.min(s.taxRate / 100, 0.20);
  const minNet     = country.min * (1 - minTaxRate);
  const medianNet  = country.median * (1 - Math.min(s.taxRate / 100, 0.30));

  return {
    s, country,
    productionHours, totalHours, annualHours,
    adRevenue, sponsorRevenue, otherRevenue,
    tailRevenue: (adRevenue + sponsorRevenue) * tail,
    grossRevenue,
    variableCosts, fixedCosts, gearAmort, totalCosts,
    preTaxProfit, incomeTax, seTaxAmt, totalTax, afterTax,
    grossHourly, preTaxHourly, netHourly,
    minNet, medianNet,
    swe: country.swe,
  };
}

/* ──────────  Verdict UI ────────── */
function paintVerdict(r) {
  document.getElementById("hourly").textContent  = fmt$(r.netHourly) + " /hr";
  document.getElementById("takeHome").textContent= fmt$(r.afterTax);
  document.getElementById("hours").textContent   = fmtN(r.totalHours) + " h";

  const margin = r.grossRevenue > 0 ? r.preTaxProfit / r.grossRevenue : 0;
  document.getElementById("margin").textContent  = fmtPct(margin, 0);

  const minNet = r.minNet;
  const ratio  = minNet > 0 ? r.netHourly / minNet : 0;
  let label, cls, sub;
  if (r.netHourly < 0) {
    label = "Losing money"; cls = "bad";
    sub   = `Below zero — costs exceed revenue.`;
  } else if (ratio < 1) {
    label = `Below minimum wage`; cls = "bad";
    sub   = `That's ${fmtPct(ratio,0)} of the local post-tax minimum wage (${fmt$(minNet)}/hr).`;
  } else if (ratio < 1.5) {
    label = `Around minimum wage`; cls = "warn";
    sub   = `Roughly ${fmtPct(ratio,0)} of post-tax minimum wage (${fmt$(minNet)}/hr).`;
  } else if (ratio < 3) {
    label = `Above minimum, below median`; cls = "warn";
    sub   = `About ${fmtPct(ratio,0)} of minimum wage, ${fmtPct(r.netHourly/r.medianNet,0)} of local median.`;
  } else if (r.netHourly < r.swe * (1 - 0.30)) {
    label = `Solid income`; cls = "good";
    sub   = `Comfortably above median (${fmt$(r.medianNet)}/hr post-tax).`;
  } else {
    label = `Genuinely lucrative`; cls = "good";
    sub   = `Above a typical software-engineer salary in this country.`;
  }
  const badge = document.getElementById("badge");
  badge.textContent = label;
  badge.className   = "badge " + cls;
  document.getElementById("hourlyVs").textContent = sub;

  /* Punchy one-liner that translates the numbers into plain English */
  const line = document.getElementById("verdictLine");
  if (line) {
    const monthlyAtMinWage = r.minNet * r.totalHours;
    const delta = r.afterTax - monthlyAtMinWage;
    if (r.afterTax < 0) {
      line.innerHTML = `For <strong>${fmtN(r.totalHours)} hours</strong> of work each month,
        you're <strong>losing ${fmt$(-r.afterTax)}</strong> — a minimum-wage job for the same hours
        in ${r.country.name} would pay <strong>${fmt$(monthlyAtMinWage)}</strong> post-tax,
        an effective gap of <strong>${fmt$(monthlyAtMinWage - r.afterTax)}</strong> / month.`;
    } else if (delta < 0) {
      line.innerHTML = `For <strong>${fmtN(r.totalHours)} hours</strong> of work each month,
        you're earning <strong>${fmt$(r.afterTax)}</strong> after tax.
        The same hours at the local minimum wage would pay <strong>${fmt$(monthlyAtMinWage)}</strong> —
        a shortfall of <strong>${fmt$(-delta)}</strong> / month.`;
    } else {
      line.innerHTML = `For <strong>${fmtN(r.totalHours)} hours</strong> of work each month,
        you're earning <strong>${fmt$(r.afterTax)}</strong> after tax —
        <strong>${fmt$(delta)}</strong> / month <em>above</em> what minimum-wage work would pay
        for the same time, in ${r.country.name}.`;
    }
  }
}

/* ──────────  Breakdown chart + table ────────── */
let breakdownChart;
function paintBreakdown(r) {
  const data = [
    { k: "Ad revenue",          v:  r.adRevenue,      pos: true  },
    { k: "Sponsorships",        v:  r.sponsorRevenue, pos: true  },
    { k: "Long-tail (catalogue)",v: r.tailRevenue,    pos: true  },
    { k: "Memberships / other", v:  r.otherRevenue,   pos: true  },
    { k: "Per-video costs",     v: -r.variableCosts,  pos: false },
    { k: "Fixed costs",         v: -r.fixedCosts,     pos: false },
    { k: "Gear (amortised)",    v: -r.gearAmort,      pos: false },
    { k: "Income tax",          v: -r.incomeTax,      pos: false },
    { k: "Self-employed tax",   v: -r.seTaxAmt,       pos: false },
  ];
  const tbody = document.getElementById("breakdownTable");
  tbody.innerHTML = `
    <thead><tr><th>Item</th><th>$ / month</th></tr></thead>
    <tbody>
      ${data.map(d => `
        <tr class="${d.pos ? "pos":"neg"}">
          <td>${d.k}</td><td class="amt">${fmt$(d.v)}</td>
        </tr>`).join("")}
      <tr class="total"><td>Take-home</td><td>${fmt$(r.afterTax)}</td></tr>
    </tbody>`;

  // Doughnut: revenue sources
  const ctx = document.getElementById("breakdownChart");
  const labels = ["Ads","Sponsors","Long-tail","Memberships"];
  const vals   = [r.adRevenue, r.sponsorRevenue, r.tailRevenue, r.otherRevenue].map(v => Math.max(0,v));
  const colors = ["#5b8cff","#ff3b3b","#9c6bff","#2ecc71"];
  if (!breakdownChart) {
    breakdownChart = new Chart(ctx, {
      type: "doughnut",
      data: { labels, datasets: [{ data: vals, backgroundColor: colors, borderColor: "#141821", borderWidth: 2 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "62%",
        plugins: {
          legend: { position: "bottom", labels: { color: "#c8cee0", padding: 12, boxWidth: 12 } },
          tooltip: { callbacks: { label: c => `${c.label}: ${fmt$(c.parsed)}` } },
        }
      },
    });
  } else {
    breakdownChart.data.datasets[0].data = vals;
    breakdownChart.update("none");
  }
}

/* ──────────  Wage comparison chart ────────── */
let wageChart;
function paintWage(r) {
  const minTaxRate = Math.min(r.s.taxRate / 100, 0.20);
  const labels = ["Pre-tax\n(your channel)","Post-tax\n(your channel)","Min wage\n(post-tax)","Median wage\n(post-tax)","Software dev\n(post-tax)"];
  const vals   = [r.preTaxHourly, r.netHourly, r.minNet, r.medianNet, r.swe * (1 - Math.min(r.s.taxRate/100, 0.30))];
  const colors = vals.map(v => {
    if (v < 0) return "#ff5c5c";
    if (v < r.minNet) return "#ff5c5c";
    if (v < r.medianNet) return "#f5b14c";
    return "#2ecc71";
  });

  const ctx = document.getElementById("wageChart");
  if (!wageChart) {
    wageChart = new Chart(ctx, {
      type: "bar",
      data: { labels, datasets: [{ data: vals, backgroundColor: colors, borderRadius: 8 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => `${fmt$(c.parsed.y)} /hr` } },
        },
        scales: {
          x: { ticks: { color: "#c8cee0", font: { size: 11 }, callback: function(v){ return this.getLabelForValue(v).split("\n"); } }, grid: { display: false } },
          y: { ticks: { color: "#8a93a6", callback: v => fmt$(v) }, grid: { color: "#1f2533" } },
        }
      },
    });
  } else {
    wageChart.data.labels = labels;
    wageChart.data.datasets[0].data = vals;
    wageChart.data.datasets[0].backgroundColor = colors;
    wageChart.update("none");
  }
}

/* ──────────  Tipping-point chart ────────── */
let tippingChart;
function paintTipping(r) {
  const points = [];
  const xs = [];
  for (let p = 2; p <= 8; p += 0.05) {
    const views = Math.pow(10, p);
    const trial = { ...r.s, viewsPerVideo: views };
    const m = model(trial);
    points.push({ x: views, y: m.netHourly });
    xs.push(views);
  }

  // find crossover with minimum wage
  let cross = null;
  for (let i=1; i<points.length; i++) {
    if ((points[i-1].y - r.minNet) * (points[i].y - r.minNet) < 0) {
      const a = points[i-1], b = points[i];
      const t = (r.minNet - a.y) / (b.y - a.y);
      cross = a.x + t * (b.x - a.x);
      break;
    }
  }

  const ctx = document.getElementById("tippingChart");
  const datasets = [
    {
      label: "Your hourly rate (after tax)",
      data: points,
      borderColor: "#5b8cff",
      backgroundColor: "rgba(91,140,255,.12)",
      fill: true,
      pointRadius: 0,
      borderWidth: 2.5,
      tension: 0.25,
    },
    {
      label: "Local minimum wage (post-tax)",
      data: [{ x: xs[0], y: r.minNet }, { x: xs[xs.length-1], y: r.minNet }],
      borderColor: "#ff5c5c",
      borderDash: [6, 6],
      pointRadius: 0,
      borderWidth: 2,
      fill: false,
    },
    {
      label: "Median wage (post-tax)",
      data: [{ x: xs[0], y: r.medianNet }, { x: xs[xs.length-1], y: r.medianNet }],
      borderColor: "#f5b14c",
      borderDash: [3, 5],
      pointRadius: 0,
      borderWidth: 1.5,
      fill: false,
    },
  ];

  if (cross) {
    datasets.push({
      label: "Crossover",
      data: [{ x: cross, y: r.minNet }],
      borderColor: "#fff",
      backgroundColor: "#fff",
      pointRadius: 6,
      pointHoverRadius: 8,
      showLine: false,
    });
  }

  if (!tippingChart) {
    tippingChart = new Chart(ctx, {
      type: "line",
      data: { datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { color: "#c8cee0", boxWidth: 12, padding: 12 } },
          tooltip: { callbacks: {
            title: c => `${fmtN(c[0].parsed.x)} views / video`,
            label: c => `${c.dataset.label}: ${fmt$(c.parsed.y)} /hr`,
          }},
        },
        scales: {
          x: {
            type: "logarithmic",
            ticks: { color: "#8a93a6", callback: v => {
              const s = v.toString();
              if (/^1e|^[1-9]0*$/.test(s) || [1,10,100,1000,10000,100000,1000000,10000000].includes(v))
                return fmtN(v);
              return null;
            }},
            grid: { color: "#1f2533" },
            title: { display: true, text: "Average views per video (log scale)", color: "#8a93a6" },
          },
          y: {
            ticks: { color: "#8a93a6", callback: v => fmt$(v) },
            grid: { color: "#1f2533" },
            title: { display: true, text: "Hourly rate after tax", color: "#8a93a6" },
          },
        }
      },
    });
  } else {
    tippingChart.data.datasets = datasets;
    tippingChart.update("none");
  }

  const note = document.getElementById("tippingNote");
  if (cross) {
    note.innerHTML = `📍 <strong>Tipping point:</strong> at your current effort, costs and RPM,
      you need <strong>${fmtN(Math.round(cross))} views per video</strong>, every month,
      to match the post-tax minimum wage in ${r.country.name}.`;
  } else {
    note.innerHTML = points[points.length-1].y < r.minNet
      ? `❌ <strong>No tipping point in the modelled range.</strong> Even at 30M views per video this set-up can't beat minimum wage — production hours or costs are too high.`
      : `✅ <strong>Already past it.</strong> At fewer than ${fmtN(Math.round(points[0].x))} views/video you already beat the minimum wage with these inputs.`;
  }
}

/* ──────────  Tornado sensitivity ────────── */
let tornadoChart;
function paintTornado(r) {
  const base = r.afterTax;
  // Variables we'll wiggle ±25%
  const vars = [
    ["viewsPerVideo",  "Views per video"],
    ["rpm",            "RPM ($/1000)"],
    ["videosPerMonth", "Videos / month"],
    ["hoursPerVideo",  "Hours / video"],
    ["sponsorRate",    "Sponsor CPM"],
    ["sponsorShare",   "Sponsored %"],
    ["watchedFraction","Monetised %"],
    ["taxRate",        "Tax rate"],
    ["varCosts",       "Per-video cost"],
    ["fixedCosts",     "Fixed costs"],
  ];
  const rows = vars.map(([k,label]) => {
    const cur = r.s[k];
    const lo = { ...r.s, [k]: cur * 0.75 };
    const hi = { ...r.s, [k]: cur * 1.25 };
    const a = model(lo).afterTax - base;
    const b = model(hi).afterTax - base;
    return { label, low: Math.min(a,b), high: Math.max(a,b), magnitude: Math.max(Math.abs(a),Math.abs(b)) };
  }).sort((x,y) => y.magnitude - x.magnitude);

  const labels = rows.map(r => r.label);
  const lows   = rows.map(r => r.low);
  const highs  = rows.map(r => r.high);

  const ctx = document.getElementById("tornadoChart");
  if (!tornadoChart) {
    tornadoChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "If –25%", data: lows,  backgroundColor: "#ff5c5c", borderRadius: 6 },
          { label: "If +25%", data: highs, backgroundColor: "#2ecc71", borderRadius: 6 },
        ]
      },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { color: "#c8cee0", boxWidth: 12, padding: 12 } },
          tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmt$(c.parsed.x)} / month` } }
        },
        scales: {
          x: { ticks: { color: "#8a93a6", callback: v => fmt$(v) }, grid: { color: "#1f2533" },
               title: { display: true, text: "Change in monthly take-home", color: "#8a93a6" } },
          y: { ticks: { color: "#c8cee0" }, grid: { display: false } },
        }
      },
    });
  } else {
    tornadoChart.data.labels = labels;
    tornadoChart.data.datasets[0].data = lows;
    tornadoChart.data.datasets[1].data = highs;
    tornadoChart.update("none");
  }
}

/* ──────────  Year-on-year trajectory ────────── */
let trajChart;
function paintTrajectory(r) {
  // Catalogue model: each month the back catalogue contributes more tail.
  // We let the tail multiplier grow toward a cap of 1.5× as catalogue size grows.
  const months = 36;
  const monthly = [];
  for (let m = 1; m <= months; m++) {
    const tailMult = Math.min(1.5, 0.25 + 0.04 * m); // ramps 0.25 → 1.5 over ~30mo
    const tail = (r.adRevenue + r.sponsorRevenue) * tailMult;
    const rev  = r.adRevenue + r.sponsorRevenue + tail + r.otherRevenue;
    const prof = rev - r.totalCosts;
    const tax  = Math.max(0, prof) * (r.s.taxRate/100 + (r.s.seTax ? r.country.se/100 : 0));
    monthly.push(prof - tax);
  }
  const ctx = document.getElementById("trajectoryChart");
  if (!trajChart) {
    trajChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: monthly.map((_,i) => `M${i+1}`),
        datasets: [{
          label: "After-tax monthly income",
          data: monthly,
          borderColor: "#2ecc71",
          backgroundColor: "rgba(46,204,113,.15)",
          fill: true,
          tension: 0.3,
          pointRadius: 0,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false },
                   tooltip: { callbacks: { label: c => `${fmt$(c.parsed.y)} / month` } } },
        scales: {
          x: { ticks: { color: "#8a93a6", maxTicksLimit: 12 }, grid: { display: false } },
          y: { ticks: { color: "#8a93a6", callback: v => fmt$(v) }, grid: { color: "#1f2533" } },
        }
      },
    });
  } else {
    trajChart.data.datasets[0].data = monthly;
    trajChart.update("none");
  }
}

/* ──────────  Per-input units & formatting ────────── */
const UNITS = {
  videosPerMonth:  { suffix: "/ mo",  dp: 2 },
  hoursPerVideo:   { suffix: "h",     dp: 2 },
  overheadHours:   { suffix: "h",     dp: 0 },
  viewsPerVideo:   { suffix: "views", dp: 0 },
  watchedFraction: { suffix: "%",     dp: 0 },
  rpm:             { prefix: "$",     dp: 2 },
  sponsorRate:     { prefix: "$",     dp: 0 },
  sponsorShare:    { suffix: "%",     dp: 0 },
  memberRevenue:   { prefix: "$",     dp: 0 },
  fixedCosts:      { prefix: "$",     dp: 0 },
  varCosts:        { prefix: "$",     dp: 0 },
  gearCost:        { prefix: "$",     dp: 0 },
  taxRate:         { suffix: "%",     dp: 0 },
};

function fmtNumValue(v, dp = 2) {
  if (!isFinite(v)) return "0";
  // Trim trailing zeros (1.50 -> 1.5, 2.00 -> 2).
  return (+v.toFixed(dp)).toString();
}
function fmtBig(n) {
  if (!isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1e12) return (n/1e12).toFixed(1).replace(/\.0$/,"") + "T";
  if (a >= 1e9)  return (n/1e9 ).toFixed(1).replace(/\.0$/,"") + "B";
  if (a >= 1e6)  return (n/1e6 ).toFixed(1).replace(/\.0$/,"") + "M";
  if (a >= 1e3)  return (n/1e3 ).toFixed(1).replace(/\.0$/,"") + "K";
  return Math.round(n).toString();
}

/* Replace each row's <output> with a number-input + prefix/suffix */
function initNumberInputs() {
  document.querySelectorAll(".row[data-key]").forEach(row => {
    const key = row.dataset.key;
    const out = row.querySelector("output");
    const u   = UNITS[key];
    if (!out || !u) return;
    const wrap = document.createElement("span");
    wrap.className = "numwrap";
    const parts = [];
    if (u.prefix) parts.push(`<span class="prefix">${u.prefix}</span>`);
    parts.push(`<input type="number" class="num" step="any" inputmode="decimal" />`);
    if (u.suffix) parts.push(`<span class="suffix">${u.suffix}</span>`);
    wrap.innerHTML = parts.join("");
    out.replaceWith(wrap);

    const num = wrap.querySelector("input.num");

    /* number → slider (clamped) + model */
    num.addEventListener("input", () => {
      const v = parseFloat(num.value);
      if (!isFinite(v)) return;
      syncSliderFromNumber(row, v);
      updateAll(/*skipNumberInputs*/ true);
    });
    /* tidy formatting on blur */
    num.addEventListener("blur", () => {
      const v = parseFloat(num.value);
      if (!isFinite(v)) return;
      num.value = fmtNumValue(v, u.dp);
    });
  });
}

function syncSliderFromNumber(row, value) {
  const slider = row.querySelector("input[type=range]");
  if (!slider) return;
  const min = parseFloat(slider.min), max = parseFloat(slider.max);
  let sliderVal = slider.dataset.log === "true"
    ? Math.log10(Math.max(1, value))
    : value;
  slider.value = Math.min(max, Math.max(min, sliderVal));
}

function syncNumberFromSlider(row, key) {
  const slider = row.querySelector("input[type=range]");
  const num    = row.querySelector("input.num");
  if (!slider || !num) return;
  let v = parseFloat(slider.value);
  if (slider.dataset.log === "true") v = Math.pow(10, v);
  num.value = fmtNumValue(v, (UNITS[key] || {}).dp);
}

/* ──────────  Wire up ────────── */
function refreshSliderTracks() {
  document.querySelectorAll("input[type=range]").forEach(inp => {
    const min = parseFloat(inp.min), max = parseFloat(inp.max);
    const p = ((parseFloat(inp.value) - min) / (max - min)) * 100;
    inp.style.setProperty("--p", `${p}%`);
  });
}

function updateAll() {
  refreshSliderTracks();
  const s = readState();
  const r = model(s);
  paintVerdict(r);
  paintBreakdown(r);
  paintWage(r);
  paintTipping(r);
  paintTornado(r);
  paintTrajectory(r);
  writeHash(s);
}

/* ──────────  URL hash state ────────── */
function writeHash(s) {
  const order = ["videosPerMonth","hoursPerVideo","overheadHours","viewsPerVideo",
                 "watchedFraction","rpm","sponsorRate","sponsorShare",
                 "memberRevenue","fixedCosts","varCosts","gearCost","taxRate"];
  const parts = order.map(k => {
    const v = s[k];
    return Number.isFinite(v) ? (+v.toFixed(4)) : "";
  });
  parts.push(s.country, s.seTax ? 1 : 0);
  const next = "#s=" + parts.join(",");
  if (location.hash !== next) {
    try { history.replaceState(null, "", next); }
    catch { /* some browsers refuse on file:// — ignore */ }
  }
}

function readHash() {
  const m = /^#s=(.+)$/.exec(location.hash);
  if (!m) return null;
  const p = m[1].split(",");
  if (p.length < 15) return null;
  return {
    videosPerMonth: +p[0], hoursPerVideo: +p[1], overheadHours: +p[2],
    viewsPerVideo: +p[3], watchedFraction: +p[4], rpm: +p[5],
    sponsorRate: +p[6], sponsorShare: +p[7], memberRevenue: +p[8],
    fixedCosts: +p[9], varCosts: +p[10], gearCost: +p[11], taxRate: +p[12],
    country: p[13], seTax: p[14] === "1",
  };
}

function applyState(st) {
  Object.entries(st).forEach(([k, v]) => {
    if (k === "country") {
      document.getElementById("country").value = v;
    } else if (k === "seTax") {
      document.getElementById("seTax").checked = !!v;
    } else if (typeof v === "number" && Number.isFinite(v)) {
      setValue(k, v);
    }
  });
}

/* Set both the slider (clamped) and the number input to a real value. */
function setValue(key, value) {
  const row = document.querySelector(`.row[data-key="${key}"]`);
  if (!row) return;
  const num = row.querySelector("input.num");
  if (num) num.value = fmtNumValue(value, (UNITS[key] || {}).dp);
  syncSliderFromNumber(row, value);
}

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  Object.entries(p).forEach(([k,v]) => {
    if (typeof v === "number") setValue(k, v);
  });
  document.querySelectorAll(".preset-buttons button").forEach(b => {
    b.classList.toggle("active", b.dataset.preset === name);
  });
  /* Clear any currently selected channel — the user has overridden it */
  const cs = document.getElementById("channelSelect");
  if (cs) cs.value = "";
  document.getElementById("channelInfo")?.classList.add("hidden");
  updateAll();
}

/* ──────────  Real-channel picker ────────── */
function applyChannel(id) {
  const c = (typeof CHANNELS !== "undefined" ? CHANNELS : []).find(x => x.id === id);
  if (!c) return;
  Object.entries(c.state).forEach(([k, v]) => setValue(k, v));
  /* Channel state doesn't carry country/tax — leave the user's selection alone */
  document.querySelectorAll(".preset-buttons button").forEach(b => b.classList.remove("active"));
  const info = document.getElementById("channelInfo");
  if (info) {
    const age = new Date().getFullYear() - c.since;
    info.innerHTML = `
      <div class="ci-head">
        <strong>${c.name}</strong> <span class="muted small">· ${c.niche}</span>
      </div>
      <div class="ci-stats">
        <div><div class="muted small">Subscribers</div><strong>${fmtBig(c.subs)}</strong></div>
        <div><div class="muted small">Lifetime views</div><strong>${fmtBig(c.totalViews)}</strong></div>
        <div><div class="muted small">Videos uploaded</div><strong>${fmtBig(c.videos)}</strong></div>
        <div><div class="muted small">Channel age</div><strong>${age} yrs</strong></div>
      </div>
      ${c.note ? `<div class="ci-note">${c.note}</div>` : ""}
      <div class="ci-disclaimer">
        Public stats only. Earnings on the right are an estimate from views × niche-typical RPM —
        not from YouTube's books. Real revenue is private to the channel.
      </div>`;
    info.classList.remove("hidden");
  }
  updateAll();
}

function initChannelPicker() {
  const sel = document.getElementById("channelSelect");
  if (!sel || typeof CHANNELS === "undefined") return;
  const groups = {};
  CHANNELS.forEach(c => (groups[c.group] = groups[c.group] || []).push(c));
  for (const [g, items] of Object.entries(groups)) {
    const og = document.createElement("optgroup");
    og.label = g;
    items.forEach(c => {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.name;
      og.appendChild(o);
    });
    sel.appendChild(og);
  }
  sel.addEventListener("change", () => { if (sel.value) applyChannel(sel.value); });
}

function initCountrySelect() {
  const sel = document.getElementById("country");
  COUNTRIES.forEach(c => {
    const o = document.createElement("option");
    o.value = c.code; o.textContent = c.name;
    sel.appendChild(o);
  });
  // Best-effort default
  const guess = (navigator.language || "").toLowerCase();
  if      (guess.startsWith("en-gb")) sel.value = "UK";
  else if (guess.startsWith("en-au")) sel.value = "AU";
  else if (guess.startsWith("en-ca")) sel.value = "CA";
  else if (guess.startsWith("de"))    sel.value = "DE";
  else if (guess.startsWith("fr"))    sel.value = "FR";
  else if (guess.startsWith("es"))    sel.value = "ES";
  else if (guess.startsWith("it"))    sel.value = "IT";
  else if (guess.startsWith("nl"))    sel.value = "NL";
  else if (guess.startsWith("ja"))    sel.value = "JP";
  else if (guess.startsWith("pt-br")) sel.value = "BR";
  else                                sel.value = "US";

  sel.addEventListener("change", () => {
    // Auto-set tax to country default the first time only
    const c = COUNTRIES.find(x => x.code === sel.value);
    if (c) setValue("taxRate", c.taxDefault);
    updateAll();
  });
}

function init() {
  initNumberInputs();
  initCountrySelect();
  initChannelPicker();
  document.getElementById("seTax").addEventListener("change", updateAll);
  /* Slider drag → mirror value into the matching number input + update */
  document.querySelectorAll(".row[data-key] input[type=range]").forEach(slider => {
    const row = slider.closest(".row[data-key]");
    const key = row.dataset.key;
    slider.addEventListener("input", () => {
      syncNumberFromSlider(row, key);
      updateAll();
    });
  });
  document.querySelectorAll(".preset-buttons button").forEach(b => {
    b.addEventListener("click", () => applyPreset(b.dataset.preset));
  });

  const shareBtn = document.getElementById("shareBtn");
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      const url = location.href;
      try { await navigator.clipboard.writeText(url); }
      catch { /* fall back: select the URL in the bar */ window.prompt("Copy this link:", url); }
      const txt = shareBtn.querySelector(".share-txt");
      const orig = txt.textContent;
      txt.textContent = "Copied!";
      shareBtn.classList.add("copied");
      setTimeout(() => { txt.textContent = orig; shareBtn.classList.remove("copied"); }, 1600);
    });
  }

  // If a shared hash is present, restore it. Otherwise show a typical
  // part-time creator — losing money — as the honest default.
  const hashState = readHash();
  if (hashState) {
    applyPreset("parttime");        // seed everything to known values first
    applyState(hashState);
    updateAll();
  } else {
    applyPreset("parttime");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
