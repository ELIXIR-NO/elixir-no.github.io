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
  out. `funding-and-projects` refs have two segments (no year), and nothing in
  that collection surfaces today because no entry declares a `cover`: the
  selector only considers articles that have one. Frontmatter is read straight
  off the file with gray-matter rather than through the collection schema, so
  adding a `cover` to an entry is all it takes.
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

## Layout

Four files, and `README.md`:

- `slides.js`, the whole pipeline. Sections run in dependency order (constants,
  article reading, ranking, acceptance rules, collection, selection, captions,
  apply, refresh) and everything is a pure function of its arguments except the
  clearly marked file writes in `apply` and the `spawnSync` in the caption agent.
- `slides.test.js`, the suite, sectioned to match.
- `slides.AGENTS.md`, the caption agent's rules. Loaded via the `instructions`
  key below, not by filename: opencode only auto-discovers a file called
  exactly `AGENTS.md`.
- `opencode.json`, model plus a tool allowlist that denies everything. The agent
  gets JSON in and returns JSON out; it cannot read, write, or run anything.

## Operator commands

- `pnpm slides:collect`, print the ranked candidate pool + current state (dry).
- `pnpm slides:refresh`, run the full pipeline locally (writes files).
- `pnpm slides:validate`, run the sanity gate against the working tree.
- `pnpm slides:test`, the unit suite.
- `bash scripts/manage-slides.sh`, interactive manual editor (unchanged).

Each maps to `node scripts/slides/slides.js <command>`; `refresh` and `validate`
also take `--diff-scope` to assert nothing outside `src/data/slides*` changed.

The GitHub workflow `.github/workflows/refresh-highlights.yml` runs the pipeline
on cron (Mon 07:00 UTC, Fri 15:00 UTC) and on manual dispatch, then opens a PR
from `bot/slides-refresh-<run-id>` for a human to merge. On any hard failure it
opens/updates one `slides-bot`-labelled issue and opens no PR.

Only one refresh PR is open at a time: opening a new one closes any older one.
Each run recomputes the whole carousel against main as it stands then, so an
older PR is a competing answer rather than an earlier instalment, and merging
both can restore a slide the newer run dropped. Review promptly or the work is
thrown away; the closed PR still offers a Restore branch button if you need it
back.
