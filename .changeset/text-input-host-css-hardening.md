---
'json-edit-react': patch
---

Harden the text-editing fields against host-app CSS. The string and raw-JSON editors now pin `box-sizing` and an explicit `line-height` instead of leaving them to inherit, so a consuming app's global reset (e.g. `* { box-sizing: border-box }`) or an element-level `textarea` / `input` rule can no longer distort their layout or text wrapping. This also keeps the auto-growing textarea's hidden measuring element locked to the real `<textarea>`, fixing a latent case where the raw-JSON editor could mis-measure its height even with no host reset present.

The pinned `box-sizing` is `content-box` (the model the editor was designed against), so it's a no-op for consumers without a global reset. The raw-JSON editor's line spacing is now set explicitly and may shift very slightly.
