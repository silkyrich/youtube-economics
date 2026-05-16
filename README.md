# YouTube Economics

An interactive calculator that models the real profitability of running a
YouTube channel — production hours, videos released, average views, RPM,
sponsorships, equipment, fixed and variable costs, and tax.

Sliders drive a live verdict (effective hourly wage vs local minimum wage),
a revenue breakdown, a wage-vs-minimum-wage comparison, a tipping-point
sweep over views-per-video, a tornado sensitivity chart and a 36-month
catalogue trajectory.

**Live site:** https://silkyrich.github.io/youtube-economics/

## Run locally

It's a static site — no build step:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy

`main` pushes deploy to GitHub Pages via the workflow in
`.github/workflows/pages.yml`. Repo Settings → Pages must be set to
**Source: GitHub Actions**.
