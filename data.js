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
    /* Note: this isn't really MrBeast (his per-video budgets reach
       ~$3–5M, which doesn't fit a typical slider).  This is a top-1%
       channel: huge audience, sponsorships on every video, and a
       proportional team-and-production cost. */
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
