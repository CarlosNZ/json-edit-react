---
'json-edit-react': major
---

The `collapse` prop now defaults to `3` (previously `false`). The tree opens with its top three levels of nesting expanded and deeper nodes collapsed, so deeply-nested data no longer renders its full depth on first paint. Data that's three levels or shallower is unaffected (still fully expanded). To restore the always-fully-open behaviour, pass `collapse={false}`.
