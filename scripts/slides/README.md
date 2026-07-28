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
  out. `funding-and-projects` refs have two segments (no year), and no entry in
  that collection can surface until its schema gains a `cover` field: the
  selector only considers articles that have one.
- Neither key, treated as evergreen (fail closed) and stamped `evergreen: true`
  on the next run, so the tag shows up in that run's PR diff. Should not occur
  after bootstrap.

## The bot never guesses

It acts only where one reading of the file is possible, and stops otherwise.
Every state below is one a human can author but no bot run can produce, so
stopping costs a rotation and resolving one silently costs a slide:

- an entry carrying both ownership keys (dropping either one unclaims the
  article, and the next run puts it on screen a second time)
- two entries naming the same `sourceArticle` (keeping one deletes the other
  and its image)
- a `sourceArticle` that is not a ref string
- more pinned slides than `MAX_SLIDES`

Each halts the run with the offending `src` named and writes nothing. The
workflow reports it on the `slides-bot` issue, and a human resolves it by
editing `slides.json`. `pnpm slides:validate` catches all of them before a
merge, which is why `pr-test.yml` runs it on every PR.

Bot-created image files are named `<collection>-<year>-<slug>.<ext>`, and the bot
only ever deletes unreferenced files matching that shape (`BOT_FILE_RE`). The
collection is in the name for two reasons: a slug is unique only within its
collection (news and events both hold `2025/elixir-industry-engagement-day`),
and it keeps bot names clear of CMS uploads, which are slugified from the alt
text and so can start with a year. `apply()` additionally refuses to copy over
any file a retained slide still points at.

Only bot-created images are subject to the width, aspect and size gates.
Anything a human put there predates the automation and is grandfathered, which
is why a pinned image is best left under a name the bot cannot generate.

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
