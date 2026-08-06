# fmfsa.github.io

Personal academic website of Francisco Madaleno — PhD candidate at the Technical University of Denmark (Machine Learning for Smart Mobility group), working on causality and machine learning.

Plain static site, no build step:

- `index.html` — home (hero, about, research interests, selected publications, news)
- `publications.html` — peer-reviewed papers, preprints, and talks
- `style.css` — all styling (design tokens in `:root`)
- `assets/` — headshot and CV PDF

## Local preview

```
python3 -m http.server 8000
```

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml`, which publishes the repo root to the `gh-pages` branch served by GitHub Pages at https://fmfsa.github.io/.

## CV auto-update

`.github/workflows/update-cv.yml` runs daily (and on manual dispatch): it downloads the CV Google Doc as PDF and, if it changed, commits it to `assets/Francisco-Madaleno-CV.pdf` and redeploys. The doc must stay shared as "Anyone with the link: Viewer" for the export to work.
