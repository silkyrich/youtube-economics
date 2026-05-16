/* ─────────────  Reference data ─────────────
   Wage benchmarks are gross hourly figures in USD for cross-country
   comparability. Median full-time wage is converted from local
   OECD / ONS data for a 40h/week full-time worker.  Numbers are
   2025/2026 references, rounded.  All maths in app.js is in USD.
   These are intentionally approximate — they're a sense-check, not a
   tax return. */
const COUNTRIES = [
  { code: "US",  name: "United States (federal)",       min:  7.25, median: 23.50, swe: 60, taxDefault: 25, se: 15.3 },
  { code: "USC", name: "United States (California)",    min: 16.50, median: 28.00, swe: 75, taxDefault: 35, se: 15.3 },
  { code: "USN", name: "United States (New York)",      min: 16.00, median: 27.00, swe: 70, taxDefault: 33, se: 15.3 },
  { code: "USF", name: "United States (Florida)",       min: 13.00, median: 22.00, swe: 55, taxDefault: 24, se: 15.3 },
  { code: "UK",  name: "United Kingdom",                min: 14.80, median: 22.50, swe: 45, taxDefault: 28, se:  9.0 },
  { code: "AU",  name: "Australia",                     min: 17.00, median: 27.00, swe: 55, taxDefault: 32, se:  0.0 },
  { code: "CA",  name: "Canada (federal)",              min: 12.50, median: 21.00, swe: 50, taxDefault: 30, se:  9.9 },
  { code: "DE",  name: "Germany",                       min: 14.30, median: 22.00, swe: 45, taxDefault: 38, se:  0.0 },
  { code: "FR",  name: "France",                        min: 13.40, median: 20.00, swe: 40, taxDefault: 35, se: 22.0 },
  { code: "NL",  name: "Netherlands",                   min: 15.10, median: 22.00, swe: 48, taxDefault: 37, se:  0.0 },
  { code: "IE",  name: "Ireland",                       min: 14.80, median: 22.00, swe: 50, taxDefault: 33, se:  4.0 },
  { code: "ES",  name: "Spain",                         min:  8.40, median: 14.00, swe: 30, taxDefault: 28, se: 30.0 },
  { code: "IT",  name: "Italy",                         min:  9.50, median: 14.50, swe: 30, taxDefault: 32, se: 26.0 },
  { code: "JP",  name: "Japan",                         min:  7.50, median: 14.00, swe: 35, taxDefault: 22, se:  0.0 },
  { code: "IN",  name: "India",                         min:  1.20, median:  3.50, swe: 12, taxDefault: 20, se:  0.0 },
  { code: "BR",  name: "Brazil",                        min:  1.90, median:  4.20, swe: 14, taxDefault: 22, se: 20.0 },
  { code: "MX",  name: "Mexico",                        min:  2.20, median:  4.50, swe: 14, taxDefault: 20, se:  0.0 },
  { code: "ZA",  name: "South Africa",                  min:  1.50, median:  4.00, swe: 14, taxDefault: 25, se:  0.0 },
];

/* ─────────────  Preset scenarios  ─────────────
   Every numeric key matches the data-key attribute on the slider rows.
   viewsPerVideo is stored as the *real* number (the slider stores log10). */
const PRESETS = {
  hobbyist: {
    label: "Weekend hobbyist",
    videosPerMonth: 2,
    hoursPerVideo: 12,
    overheadHours: 6,
    viewsPerVideo: 1500,
    watchedFraction: 50,
    rpm: 3,
    sponsorRate: 0,
    sponsorShare: 0,
    memberRevenue: 0,
    fixedCosts: 30,
    varCosts: 0,
    gearCost: 800,
  },
  parttime: {
    label: "Part-time vlogger",
    videosPerMonth: 6,
    hoursPerVideo: 10,
    overheadHours: 15,
    viewsPerVideo: 8000,
    watchedFraction: 55,
    rpm: 4,
    sponsorRate: 18,
    sponsorShare: 10,
    memberRevenue: 50,
    fixedCosts: 80,
    varCosts: 30,
    gearCost: 2500,
  },
  midtier: {
    label: "Mid-tier gamer",
    videosPerMonth: 12,
    hoursPerVideo: 6,
    overheadHours: 25,
    viewsPerVideo: 25000,
    watchedFraction: 55,
    rpm: 2.5,
    sponsorRate: 15,
    sponsorShare: 20,
    memberRevenue: 200,
    fixedCosts: 120,
    varCosts: 20,
    gearCost: 4000,
  },
  finance: {
    label: "Finance niche",
    videosPerMonth: 4,
    hoursPerVideo: 25,
    overheadHours: 20,
    viewsPerVideo: 15000,
    watchedFraction: 60,
    rpm: 22,
    sponsorRate: 45,
    sponsorShare: 50,
    memberRevenue: 400,
    fixedCosts: 200,
    varCosts: 50,
    gearCost: 5000,
  },
  fulltime: {
    label: "Full-time grinder",
    videosPerMonth: 8,
    hoursPerVideo: 22,
    overheadHours: 30,
    viewsPerVideo: 120000,
    watchedFraction: 60,
    rpm: 5,
    sponsorRate: 28,
    sponsorShare: 40,
    memberRevenue: 1000,
    fixedCosts: 300,
    varCosts: 250,
    gearCost: 8000,
  },
  mrbeast: {
    label: "\"MrBeast-style\"",
    videosPerMonth: 1,
    hoursPerVideo: 100,
    overheadHours: 60,
    viewsPerVideo: 5000000,
    watchedFraction: 65,
    rpm: 6,
    sponsorRate: 60,
    sponsorShare: 100,
    memberRevenue: 5000,
    fixedCosts: 2500,
    varCosts: 50000,
    gearCost: 25000,
  },
};

/* ─────────────  Real-channel scenarios  ─────────────
   Subscriber, lifetime view and video-count figures are from public
   channel pages (rounded to plausible 2025-era values).  YouTube does
   NOT publish revenue, so every number under `state` is a model
   estimate built from public view counts × niche-typical RPM and a
   sensible guess at production cadence and costs.  Treat them as a
   starting point, not as fact. */
const CHANNELS = [
  /* ── Variety & mega-channels ─────────────────────────────────── */
  {
    id: "mrbeast", name: "MrBeast", niche: "Variety / stunts",
    group: "🌍 Variety & mega-channels",
    subs: 340e6, totalViews: 80e9, videos: 850, since: 2012,
    state: {
      videosPerMonth: 1.5, hoursPerVideo: 250, overheadHours: 100,
      viewsPerVideo: 150e6, watchedFraction: 65, rpm: 6,
      sponsorRate: 20, sponsorShare: 100,
      memberRevenue: 5000, fixedCosts: 3000, varCosts: 1000000, gearCost: 50000,
    },
    note: "Per-video production budgets are publicly reported at $3–5M+. The model uses $1M to stay on the slider scale; type a higher number into the cost field to see actual MrBeast economics.",
  },
  {
    id: "tseries", name: "T-Series", niche: "Music label (India)",
    group: "🌍 Variety & mega-channels",
    subs: 280e6, totalViews: 280e9, videos: 25000, since: 2006,
    state: {
      videosPerMonth: 100, hoursPerVideo: 8, overheadHours: 80,
      viewsPerVideo: 5e6, watchedFraction: 55, rpm: 0.5,
      sponsorRate: 0, sponsorShare: 0,
      memberRevenue: 0, fixedCosts: 5000, varCosts: 500, gearCost: 20000,
    },
    note: "A music label uploading Bollywood music videos at huge cadence. Very low RPM per view, but enormous volume.",
  },
  {
    id: "cocomelon", name: "Cocomelon", niche: "Kids / nursery rhymes",
    group: "🌍 Variety & mega-channels",
    subs: 190e6, totalViews: 200e9, videos: 1100, since: 2006,
    state: {
      videosPerMonth: 8, hoursPerVideo: 200, overheadHours: 80,
      viewsPerVideo: 80e6, watchedFraction: 55, rpm: 1.2,
      sponsorRate: 0, sponsorShare: 0,
      memberRevenue: 0, fixedCosts: 10000, varCosts: 8000, gearCost: 20000,
    },
    note: "Kids/COPPA-flagged content has very low RPM ($0.30–$1.50 typical) because most personalised ads are disabled.",
  },
  {
    id: "markrober", name: "Mark Rober", niche: "Science / stunts",
    group: "🌍 Variety & mega-channels",
    subs: 60e6, totalViews: 14e9, videos: 200, since: 2011,
    state: {
      videosPerMonth: 0.7, hoursPerVideo: 250, overheadHours: 60,
      viewsPerVideo: 60e6, watchedFraction: 60, rpm: 6,
      sponsorRate: 25, sponsorShare: 80,
      memberRevenue: 5000, fixedCosts: 5000, varCosts: 50000, gearCost: 30000,
    },
  },

  /* ── Gaming ──────────────────────────────────────────────────── */
  {
    id: "pewdiepie", name: "PewDiePie", niche: "Gaming / commentary",
    group: "🎮 Gaming",
    subs: 110e6, totalViews: 30e9, videos: 4700, since: 2010,
    state: {
      videosPerMonth: 8, hoursPerVideo: 5, overheadHours: 30,
      viewsPerVideo: 3e6, watchedFraction: 60, rpm: 2.5,
      sponsorRate: 30, sponsorShare: 30,
      memberRevenue: 2000, fixedCosts: 500, varCosts: 100, gearCost: 8000,
    },
  },
  {
    id: "markiplier", name: "Markiplier", niche: "Gaming / Let's Play",
    group: "🎮 Gaming",
    subs: 37e6, totalViews: 22e9, videos: 5800, since: 2012,
    state: {
      videosPerMonth: 20, hoursPerVideo: 4, overheadHours: 30,
      viewsPerVideo: 1e6, watchedFraction: 55, rpm: 2.5,
      sponsorRate: 30, sponsorShare: 25,
      memberRevenue: 1500, fixedCosts: 400, varCosts: 50, gearCost: 6000,
    },
  },
  {
    id: "jacksepticeye", name: "Jacksepticeye", niche: "Gaming / Let's Play",
    group: "🎮 Gaming",
    subs: 31e6, totalViews: 17e9, videos: 6000, since: 2007,
    state: {
      videosPerMonth: 25, hoursPerVideo: 3.5, overheadHours: 30,
      viewsPerVideo: 500e3, watchedFraction: 55, rpm: 2.2,
      sponsorRate: 30, sponsorShare: 25,
      memberRevenue: 1500, fixedCosts: 500, varCosts: 50, gearCost: 5000,
    },
  },
  {
    id: "dantdm", name: "DanTDM", niche: "Gaming / kids-friendly",
    group: "🎮 Gaming",
    subs: 28e6, totalViews: 19e9, videos: 4500, since: 2012,
    state: {
      videosPerMonth: 25, hoursPerVideo: 3, overheadHours: 25,
      viewsPerVideo: 400e3, watchedFraction: 55, rpm: 1.8,
      sponsorRate: 25, sponsorShare: 30,
      memberRevenue: 800, fixedCosts: 400, varCosts: 50, gearCost: 5000,
    },
  },

  /* ── Tech ────────────────────────────────────────────────────── */
  {
    id: "mkbhd", name: "Marques Brownlee (MKBHD)", niche: "Tech reviews",
    group: "💻 Tech",
    subs: 20e6, totalViews: 4e9, videos: 1700, since: 2008,
    state: {
      videosPerMonth: 6, hoursPerVideo: 30, overheadHours: 40,
      viewsPerVideo: 4e6, watchedFraction: 60, rpm: 11,
      sponsorRate: 55, sponsorShare: 60,
      memberRevenue: 2000, fixedCosts: 3000, varCosts: 500, gearCost: 30000,
    },
  },
  {
    id: "ltt", name: "Linus Tech Tips", niche: "Tech / studio",
    group: "💻 Tech",
    subs: 16e6, totalViews: 7e9, videos: 6800, since: 2008,
    state: {
      videosPerMonth: 30, hoursPerVideo: 10, overheadHours: 60,
      viewsPerVideo: 800e3, watchedFraction: 55, rpm: 9,
      sponsorRate: 40, sponsorShare: 70,
      memberRevenue: 8000, fixedCosts: 30000, varCosts: 1500, gearCost: 50000,
    },
    note: "LTT runs as a ~120-person studio. Fixed costs reflect a payroll-style overhead, not a typical solo creator.",
  },
  {
    id: "mrwhosetheboss", name: "Mrwhosetheboss", niche: "Tech reviews",
    group: "💻 Tech",
    subs: 20e6, totalViews: 5e9, videos: 1100, since: 2011,
    state: {
      videosPerMonth: 5, hoursPerVideo: 25, overheadHours: 35,
      viewsPerVideo: 4e6, watchedFraction: 60, rpm: 10,
      sponsorRate: 50, sponsorShare: 60,
      memberRevenue: 1000, fixedCosts: 2000, varCosts: 500, gearCost: 20000,
    },
  },

  /* ── Education & science ─────────────────────────────────────── */
  {
    id: "veritasium", name: "Veritasium", niche: "Science / education",
    group: "🧪 Education & science",
    subs: 17e6, totalViews: 2e9, videos: 400, since: 2010,
    state: {
      videosPerMonth: 1.5, hoursPerVideo: 80, overheadHours: 40,
      viewsPerVideo: 6e6, watchedFraction: 60, rpm: 8,
      sponsorRate: 60, sponsorShare: 80,
      memberRevenue: 500, fixedCosts: 1500, varCosts: 2000, gearCost: 15000,
    },
  },
  {
    id: "kurzgesagt", name: "Kurzgesagt", niche: "Animated science",
    group: "🧪 Education & science",
    subs: 22e6, totalViews: 2.4e9, videos: 200, since: 2013,
    state: {
      videosPerMonth: 1, hoursPerVideo: 1200, overheadHours: 60,
      viewsPerVideo: 10e6, watchedFraction: 60, rpm: 9,
      sponsorRate: 80, sponsorShare: 90,
      memberRevenue: 30000, fixedCosts: 10000, varCosts: 30000, gearCost: 20000,
    },
    note: "Kurzgesagt is an animation studio (~30 staff). Hours/video reflects ~6 artists working ~200 hours each.",
  },
  {
    id: "vsauce", name: "Vsauce", niche: "Curiosity / science",
    group: "🧪 Education & science",
    subs: 22e6, totalViews: 4e9, videos: 350, since: 2010,
    state: {
      videosPerMonth: 0.5, hoursPerVideo: 80, overheadHours: 20,
      viewsPerVideo: 8e6, watchedFraction: 60, rpm: 7,
      sponsorRate: 60, sponsorShare: 60,
      memberRevenue: 0, fixedCosts: 1000, varCosts: 1000, gearCost: 8000,
    },
  },
  {
    id: "3b1b", name: "3Blue1Brown", niche: "Mathematics",
    group: "🧪 Education & science",
    subs: 7e6, totalViews: 600e6, videos: 150, since: 2015,
    state: {
      videosPerMonth: 0.5, hoursPerVideo: 100, overheadHours: 15,
      viewsPerVideo: 4e6, watchedFraction: 60, rpm: 8,
      sponsorRate: 40, sponsorShare: 40,
      memberRevenue: 5000, fixedCosts: 200, varCosts: 100, gearCost: 3000,
    },
    note: "Largely Patreon-funded; member revenue captures the public Patreon take.",
  },
  {
    id: "tomscott", name: "Tom Scott", niche: "Curiosities / travel",
    group: "🧪 Education & science",
    subs: 7e6, totalViews: 1.5e9, videos: 800, since: 2007,
    state: {
      videosPerMonth: 4, hoursPerVideo: 40, overheadHours: 20,
      viewsPerVideo: 2e6, watchedFraction: 60, rpm: 6,
      sponsorRate: 50, sponsorShare: 60,
      memberRevenue: 0, fixedCosts: 1000, varCosts: 1500, gearCost: 8000,
    },
  },

  /* ── Finance & business ──────────────────────────────────────── */
  {
    id: "grahamstephan", name: "Graham Stephan", niche: "Personal finance",
    group: "💰 Finance & business",
    subs: 5e6, totalViews: 1e9, videos: 1500, since: 2016,
    state: {
      videosPerMonth: 12, hoursPerVideo: 6, overheadHours: 40,
      viewsPerVideo: 700e3, watchedFraction: 60, rpm: 25,
      sponsorRate: 50, sponsorShare: 70,
      memberRevenue: 1500, fixedCosts: 1000, varCosts: 50, gearCost: 5000,
    },
  },
  {
    id: "coffeezilla", name: "Coffeezilla", niche: "Investigative / finance",
    group: "💰 Finance & business",
    subs: 4e6, totalViews: 600e6, videos: 200, since: 2018,
    state: {
      videosPerMonth: 2, hoursPerVideo: 60, overheadHours: 30,
      viewsPerVideo: 3e6, watchedFraction: 65, rpm: 18,
      sponsorRate: 60, sponsorShare: 60,
      memberRevenue: 500, fixedCosts: 2000, varCosts: 500, gearCost: 8000,
    },
  },
  {
    id: "patrickboyle", name: "Patrick Boyle", niche: "Finance commentary",
    group: "💰 Finance & business",
    subs: 750e3, totalViews: 100e6, videos: 400, since: 2019,
    state: {
      videosPerMonth: 4, hoursPerVideo: 15, overheadHours: 15,
      viewsPerVideo: 300e3, watchedFraction: 60, rpm: 30,
      sponsorRate: 30, sponsorShare: 30,
      memberRevenue: 0, fixedCosts: 200, varCosts: 50, gearCost: 2000,
    },
  },
  {
    id: "andreijikh", name: "Andrei Jikh", niche: "Personal finance",
    group: "💰 Finance & business",
    subs: 2e6, totalViews: 250e6, videos: 800, since: 2019,
    state: {
      videosPerMonth: 8, hoursPerVideo: 10, overheadHours: 30,
      viewsPerVideo: 300e3, watchedFraction: 55, rpm: 22,
      sponsorRate: 40, sponsorShare: 60,
      memberRevenue: 200, fixedCosts: 500, varCosts: 100, gearCost: 4000,
    },
  },
  {
    id: "aliabdaal", name: "Ali Abdaal", niche: "Productivity / business",
    group: "💰 Finance & business",
    subs: 6e6, totalViews: 500e6, videos: 700, since: 2017,
    state: {
      videosPerMonth: 4, hoursPerVideo: 20, overheadHours: 50,
      viewsPerVideo: 500e3, watchedFraction: 60, rpm: 15,
      sponsorRate: 55, sponsorShare: 60,
      memberRevenue: 5000, fixedCosts: 5000, varCosts: 200, gearCost: 8000,
    },
    note: "Most of Ali's income comes from courses and books, not YouTube. This model only covers the platform side.",
  },

  /* ── Vlog & lifestyle ────────────────────────────────────────── */
  {
    id: "caseyneistat", name: "Casey Neistat", niche: "Vlog",
    group: "🎬 Vlog & lifestyle",
    subs: 13e6, totalViews: 3e9, videos: 1200, since: 2010,
    state: {
      videosPerMonth: 2, hoursPerVideo: 25, overheadHours: 20,
      viewsPerVideo: 1e6, watchedFraction: 55, rpm: 5,
      sponsorRate: 35, sponsorShare: 50,
      memberRevenue: 0, fixedCosts: 1000, varCosts: 500, gearCost: 15000,
    },
  },
  {
    id: "emmachamberlain", name: "Emma Chamberlain", niche: "Vlog / lifestyle",
    group: "🎬 Vlog & lifestyle",
    subs: 12e6, totalViews: 1.5e9, videos: 200, since: 2017,
    state: {
      videosPerMonth: 1.5, hoursPerVideo: 30, overheadHours: 15,
      viewsPerVideo: 3e6, watchedFraction: 55, rpm: 4,
      sponsorRate: 35, sponsorShare: 60,
      memberRevenue: 0, fixedCosts: 500, varCosts: 1000, gearCost: 5000,
    },
    note: "Most of Emma's income comes from Chamberlain Coffee and brand deals outside YouTube — this only models the platform.",
  },
  {
    id: "loganpaul", name: "Logan Paul", niche: "Vlog / stunts",
    group: "🎬 Vlog & lifestyle",
    subs: 23e6, totalViews: 7e9, videos: 800, since: 2013,
    state: {
      videosPerMonth: 2, hoursPerVideo: 30, overheadHours: 30,
      viewsPerVideo: 4e6, watchedFraction: 55, rpm: 5,
      sponsorRate: 60, sponsorShare: 80,
      memberRevenue: 1000, fixedCosts: 3000, varCosts: 5000, gearCost: 15000,
    },
  },
];
