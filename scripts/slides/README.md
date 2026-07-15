# Slides automation

Keeps `src/data/slides.json` (the homepage highlights carousel) fresh via a
twice-weekly GitHub Actions job. Canonical data lives in `src/data/slides.json`
and `src/data/slides/`; `public/data/slides/` is gitignored and regenerated at
build by `src/plugins/content-assets.mjs`. Never edit `public/`.

## Ownership tags

Every slide entry carries exactly one signal:

- `"evergreen": true`, pinned. Always kept, text frozen, image never deleted by
  the bot. Set this to protect a slide.
- `"sourceArticle": "collection/year/slug"`, bot-managed. Scored from that
  article each run; rotated by recency + editorial weight; dropped when it ages
  out. `funding-and-projects` refs have two segments (no year).
- Neither key, treated as evergreen (fail closed) and logged. Should not occur
  after bootstrap.

Bot-created image files are named `<year>-<slug>.<ext>`. The bot only ever
deletes files matching `^\d{4}-[a-z0-9-]+\.(png|jpe?g|webp)$` that are no longer
referenced and belonged to a `sourceArticle` entry, so legacy/human files
(none start with a 4-digit year) are structurally safe.

## CMS interaction

The `/admin` SlidesEditor seeds its form with `useState({ ...slide })` and edits
only `alt`/`caption`/`src`, so `sourceArticle`/`evergreen` survive both editing
and reordering. Ownership keys are preserved end to end; no action required.

## Operator commands

- `pnpm slides:collect`, print the ranked candidate pool + current state (dry).
- `pnpm slides:refresh`, run the full pipeline locally (writes files).
- `pnpm slides:validate`, run the sanity gate against the working tree.
- `bash scripts/manage-slides.sh`, interactive manual editor (unchanged).

The GitHub workflow `.github/workflows/refresh-highlights.yml` runs the pipeline
on cron (Mon 07:00 UTC, Fri 15:00 UTC) and on manual dispatch, then opens a PR
and auto-merges. On any hard failure it opens/updates one `slides-bot`-labelled
issue instead of merging.
