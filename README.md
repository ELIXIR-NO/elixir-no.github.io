# ELIXIR Norway Website

Source for the [elixir.no](https://elixir.no) website — the public face of the Norwegian ELIXIR node.

Built with [Astro](https://astro.build) (static output), [React](https://react.dev), [Tailwind CSS](https://tailwindcss.com), and [MDX](https://mdxjs.com). Content is managed through MDX files in `src/content/`.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Content Manager (CMS)](#content-manager-cms)
- [Content Authoring](#content-authoring)
- [Development Commands](#development-commands)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Prerequisites

- **Node.js** v20 or later — [nodejs.org](https://nodejs.org)
- **pnpm** — install globally with `npm install -g pnpm`

```bash
node -v   # should print v20.x.x or higher
pnpm -v
```

---

## Getting Started

```bash
git clone https://github.com/ELIXIR-NO/website.git
cd elixir-no.github.io
pnpm install
pnpm start
```

Open [http://localhost:4321](http://localhost:4321) in your browser. Changes to `src/content/` are reflected immediately.

---

## Project Structure

```
elixir-no.github.io/
├── .github/
│   └── workflows/
│       ├── gh-pages.yml        # Deploy to GitHub Pages on push to main
│       └── pr-test.yml         # Build check on pull requests
├── public/                     # Static assets served as-is
├── src/
│   ├── components/             # Astro and React components
│   │   └── sections/           # Page section building blocks
│   ├── content/                # MDX content (the main area for contributors)
│   │   ├── about/              # ELIXIR node information by institution
│   │   ├── banner/             # Top overlay banner content
│   │   ├── events/             # Events, organised by year (events/YYYY/slug/)
│   │   ├── funding-and-projects/ # Funded projects and initiatives
│   │   ├── landing/            # Homepage content
│   │   ├── news/               # News articles, organised by year (news/YYYY/slug/)
│   │   ├── research-support/   # Research support page
│   │   ├── accessibility/      # Accessibility statement
│   │   └── config.ts           # Content collection schemas
│   ├── lib/                    # Shared hooks and utilities
│   ├── pages/                  # Astro page routes
│   ├── plugins/                # Custom Astro/Vite/rehype plugins
│   ├── styles/                 # Global SCSS
│   └── types/                  # TypeScript type definitions
├── astro.config.mjs            # Astro configuration
├── tailwind.config.mjs         # Tailwind CSS configuration
└── package.json
```

### Key source directories

| Directory | Purpose |
|---|---|
| `src/content/about/` | Institutional pages for each ELIXIR Norway partner (Oslo, Bergen, Tromsø, Trondheim, AAS) |
| `src/content/news/` | News articles, one MDX file per article inside `news/YYYY/slug/` |
| `src/content/events/` | Upcoming and past events, organised as `events/YYYY/slug/` |
| `src/content/funding-and-projects/` | Individual project pages for grants and EU projects |
| `src/content/landing/` | Homepage copy and structure |
| `src/content/banner/` | Sitewide top banner (e.g. maintenance notices) |
| `src/content/research-support/` | Research support landing page content |
| `src/components/` | Shared UI components (Astro + React + TSX) |
| `src/plugins/` | `rehypeRelativeAssets` (rewrites MDX asset paths) and `copyContentAssets` (copies co-located images to `dist/`) |

---

## Content Manager (CMS)

Non-technical contributors can edit content through a web-based admin interface at **[elixir.no/admin](https://elixir.no/admin)** — no code, terminal, or git knowledge required.

**Requirements:** A GitHub account with write access to this repository.

**What you can edit:**

| Section | What you can do |
|---------|----------------|
| **News** | Create, edit articles. Set title, date (date picker), summary, cover image, tags, authors. |
| **Events** | Create, edit events. Same fields as news. |
| **Services** | Create, edit service pages. Title, summary, logo, tags. |
| **Funding & Projects** | Create, edit projects. Full metadata: status, category, funder, period, keywords. |
| **People** | Add, edit, remove staff members. Upload photos. Assign ELIXIR group roles. |
| **Slides** | Add, edit, reorder, remove homepage carousel slides. Upload images. |
| **Banner** | Toggle the site-wide announcement banner on/off. Edit message (supports markdown). |

**How it works:**
1. Visit `/admin` and sign in with GitHub
2. Select a section from the sidebar
3. Browse entries, click to edit, or create new
4. Click "Save as Pull Request" — review the PR title and description
5. A pull request is created on GitHub
6. A developer reviews and merges — the site redeploys automatically

All changes go through pull requests. Nothing is committed directly to main.

For technical details on the CMS architecture, OAuth setup, and troubleshooting, see [docs/cms-setup.md](docs/cms-setup.md).

---

## Content Authoring

For developers who prefer editing MDX files directly, most day-to-day changes are edits to files inside `src/content/`. For a step-by-step guide on common tasks, see the [project wiki](https://github.com/ELIXIR-NO/website/wiki).

### Adding news or events

Create a new directory under the appropriate year and add an `index.mdx`:

```
src/content/news/2026/my-article/
└── index.mdx
src/content/events/2026/my-event/
└── index.mdx
```

Co-locate any images in the same directory alongside the MDX file.

### Asset paths in MDX

**Never hardcode absolute paths** like `/assets/...` or `/data/...`. These break when the site is served from a subpath.

**Standard images and links** — use relative paths; they are rewritten automatically by the `rehypeRelativeAssets` plugin:

```mdx
![My image](./photo.png)
[Download](./report.pdf)
```

**JSX component props inside MDX** (e.g. `src=`, `figSrc=`) — relative paths are not processed by rehype. Use the `BASE` pattern instead:

```mdx
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

<MyComponent src={`${BASE}/assets/figures/my-image.svg`} />
```

**In `.astro` and `.tsx` components** — same pattern:

```ts
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
// then: `${BASE}/assets/...`, `${BASE}/data/...`, etc.
```

In production `BASE` is an empty string, so paths resolve normally. If a base path is ever configured, all references adjust automatically.

---

## Development Commands

| Command | Description |
|---|---|
| `pnpm start` | Start local dev server at `localhost:4321` |
| `pnpm build` | Type-check, build static output, and run Pagefind indexing |
| `pnpm preview` | Preview the production build locally |
| `pnpm dev:build` | Full build then start dev server (needed for search to work locally) |
| `pnpm test:pages` | Smoke-test all generated pages |

Search (Pagefind) is not available during plain `pnpm start`. Run `pnpm dev:build` once to generate the index, then use `pnpm start` for subsequent development.

---

## Deployment

The site is built as a fully static site and deployed to **GitHub Pages**, publicly accessible via a reverse proxy at `https://elixir.no`.

```
Browser → elixir.no (UiO reverse proxy, Harika TLS cert)
              |
    elixir-no.github.io/website/  (GitHub Pages, static)
```

### CI/CD

Deployment is fully automated:

- **Push to `main`** triggers `.github/workflows/gh-pages.yml`, which builds the site and deploys to GitHub Pages.
- **Pull requests** trigger `.github/workflows/pr-test.yml`, which runs a build check without deploying.

No manual steps are required to deploy — merging to `main` is sufficient.

### Reverse proxy

DNS for `elixir.no` is managed by UiO. Traffic is routed through a reverse proxy managed by UiB (hosted on NREC), which forwards requests to the static site on GitHub Pages. This keeps the public URL stable and independent of the underlying hosting provider.

```
  DNS                   Proxy                   Website
  UiO Managed           UiB Managed
┌─────────────┐       ┌─────────────┐       ┌──────────────────────┐
│             │ <──── │             │ <──── │                      │
│  elixir.no  │       │  <ip nrec>  │       │  elixir-no.github.io │
│             │ ────> │             │ ────> │                      │
└─────────────┘       └─────────────┘       └──────────────────────┘
```

---

## Maintenance Scripts

Two interactive bash scripts are provided to manage slides and people without manually editing JSON.

**Requirement:** `jq` must be installed (`sudo apt install jq` or `brew install jq`). Bash 4+ is required (macOS ships with Bash 3 — run `brew install bash` if needed).

### Slides

```bash
bash scripts/manage-slides.sh
```

Manages `src/data/slides.json` and the images in `public/data/slides/`.

| Action | What it does |
|---|---|
| Add | Prompts for an image file (copies it to `src/data/slides/`), alt text, and caption |
| Remove | Lists slides by index; prompts for confirmation before deleting |
| Update | Edit the image, alt text, or caption of an existing slide |

### People

```bash
bash scripts/manage-people.sh
```

Manages `src/data/people.json` and the photos in `public/data/people/`.

| Action | What it does |
|---|---|
| Add | Select an existing org (or create a new one), fill in name/title/photo/profile URL, assign ELIXIR group memberships. Photo is copied to `src/data/people/`. |
| Remove | Select by org then by person; prompts for confirmation |
| Update | Edit any field — name, title, photo, profile URL, or group memberships |
| List | Shows all people grouped by organisation |

---

## Contributing

For minor edits and content updates, see the [wiki](https://github.com/ELIXIR-NO/website/wiki).

For code changes:

1. Fork or clone the repository.
2. Create a feature branch:
   ```bash
   git checkout -b feature/your-change
   ```
3. Make your changes and verify the build:
   ```bash
   pnpm build
   ```
4. Commit and push, then open a pull request against `main`.

---

## Questions?

Open an issue at [github.com/ELIXIR-NO/website/issues](https://github.com/ELIXIR-NO/website/issues) or reach out through the project's communication channels.
