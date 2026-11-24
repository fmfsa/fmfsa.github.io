# fmfsa.github.io

Personal academic website of Francisco Madaleno — PhD candidate at the Technical University of Denmark (Machine Learning for Smart Mobility group), working on causality and machine learning.

Plain static site, no build step:

- `index.html` — home (hero, about, research interests, selected publications, news)
- `publications.html` — peer-reviewed papers, preprints, and talks
- `style.css` — all styling (design tokens in `:root`)
- `assets/` — headshot, publication figures, CV PDF, and the network-to-abstraction animation

The page background is white; publication cards use the original cream (`--cream`).
The SVG animation moves from isolated nodes to a neural network, then a causal DAG whose nodes merge into an abstraction. The script in `assets/research-graph.js` supports pause/play, respects reduced-motion preferences, and stops updating when offscreen.

## Local preview

```
python3 -m http.server 8000
```

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml`, which publishes the repo root to the `gh-pages` branch served by GitHub Pages at https://fmfsa.github.io/.

## CV auto-update

`.github/workflows/update-cv.yml` runs daily (and on manual dispatch): it downloads the CV PDF from Google Drive and, if it changed, commits it to `assets/Francisco-Madaleno-CV.pdf` and redeploys. The file must stay shared as "Anyone with the link: Viewer". To update the CV, replace the file in Drive with "Manage versions" so its ID (and the workflow's link) stays the same.
