# Visitor feedback

How guide feedback works and how to refresh it.

## Model

- Every **verified** build gets one GitHub issue labelled `guide-feedback`
  (`Guide feedback: <build name>`).
- Visitors vote with the 👍 (`+1`) and 👎 (`-1`) reactions on the issue. Other
  reactions are ignored.
- The issue body carries a hidden marker, `<!-- buildpath-feedback:<build id> -->`,
  so renaming an issue does not break the mapping.
- `src/generated/feedback.json` is the only thing the site reads. It holds the
  issue URL and the two counts per build; the page makes no network call.
- Votes are feedback, not a ranking. They never affect catalogue order or the
  editorial ratings.

## Refresh

```bash
npm run feedback:refresh -- --dry-run   # show issues that would be created
npm run feedback:refresh                # create missing issues, fetch counts
```

- Needs an authenticated `gh` locally, or `GH_TOKEN` in Actions.
- The script creates the `guide-feedback` label if it is missing.
- Missing issues are created only for verified builds. A build that later
  becomes stale keeps its issue but drops out of the JSON.
- `fetchedAt` moves only when a count or the set of builds changed, so a quiet
  week produces no diff.

The weekly [feedback workflow](../.github/workflows/feedback.yml) runs the
refresh, tests, builds, and opens/updates one rolling `chore/feedback` PR. It
uses `GITHUB_TOKEN`; no extra secret is needed.

## Files

| Path | Role |
|---|---|
| `src/core/feedback.ts` | Reaction counting, issue title/body/marker (pure) |
| `scripts/feedback/refresh.mjs` | Issue creation and reaction fetch |
| `src/generated/feedback.json` | Baked counts, committed |
| `src/meta/feedback.ts` | Browser accessor over the JSON |
| `src/ui/FeedbackPanel.tsx` | The build-page panel |

## Adding a build

Nothing manual: the next refresh creates the issue and adds the entry. Until it
runs, the build page shows no feedback panel (the accessor returns `undefined`).
