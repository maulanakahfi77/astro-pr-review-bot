# Astro PR Review Bot

AI-powered PR review using Claude with project-specific conventions. Reads your repo's `CLAUDE.md`, Serena memories, and agenticmaterial to provide context-aware reviews.

## Quick Start

Add to any repo at `.github/workflows/ai-review.yml`:

```yaml
name: AI PR Review
on:
  pull_request:
    types: [opened, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: maulanakahfi77/astro-pr-review-bot@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
        env:
          GITHUB_TOKEN: ${{ secrets.GH_PAT }}
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `anthropic_api_key` | Yes | - | Anthropic API key |
| `model` | No | `claude-sonnet-4-6` | Claude model |
| `max_files` | No | `20` | Max files to review |
| `ignore_paths` | No | - | Comma-separated glob patterns to skip |
| `review_style` | No | `inline` | `inline`, `summary`, or `checklist` |
| `extra_context` | No | - | Additional review rules |

## What it checks

- **ErrList mapping** — new errors must be added to the relevant ErrList
- **Feature flags** — behavior changes need config-based feature flags
- **Tracer spans** — public methods need tracing
- **Test coverage** — new logic needs tests
- **Commit format** — `[WF-xxxx]` prefix

## Context sources

Automatically reads from your repo:
- `CLAUDE.md` — project conventions
- `.serena/memories/` — domain-specific knowledge (only for affected domains)
- `agenticmaterial/{WF-xxxx}/` — specs and plans for the ticket

## Cost

~$0.02-0.05 per review using Claude Sonnet.
