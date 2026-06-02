---
'json-edit-react': patch
---

Bump the rollup TypeScript `target` from `es6` to `es2020`, shrinking the published bundle by ~0.9 kB gzipped (−4.6%).

The `react >=18` peer dependency already rules out the legacy browsers that `es6` was downleveling for, so emitting native `async`/`await`, object spread, and rest destructuring drops the tslib downlevel helpers (`__awaiter`, `__rest`, `__spreadArray`, …) entirely — they were ~13% of the pre-minified bundle. No source or behaviour change.
