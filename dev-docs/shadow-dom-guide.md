# Shadow DOM support guide

How to make `json-edit-react` usable inside a Shadow DOM, and what the trade-offs are. Tracks [issue #225](https://github.com/CarlosNZ/json-edit-react/issues/225).

## The problem

The component's CSS is inlined into the JS bundle and injected into `document.head` at runtime (`rollup-plugin-styles` running in its default `inject` mode). Styles in `document.head` do not cross the shadow boundary, so when the editor is rendered inside a shadow root it renders **completely unstyled**. Because the sheet is inlined and never shipped as a standalone file, a consumer also has no way to grab the CSS and inject it into the shadow root themselves.

This affects anyone embedding the editor in a web component, micro-frontend, browser-extension UI, or any other shadow-root context. It's niche but a genuine functional gap.

## The fix

Ship `style.css` as a standalone artifact that consumers can import and inject wherever they need it — while keeping the zero-config inline+inject behaviour for the common (light-DOM) case.

### 1. Emit a standalone `build/style.css`

Keep the main bundle inlining + injecting CSS as it does today. Add a separate extract pass (or a separate output) so the build *also* writes an un-injected `build/style.css`. The two paths are independent: the `.` entry inlines its own copy, and `build/style.css` is reached only through the explicit subpath import below.

### 2. Add the subpath export

v2's `package.json` has an `exports` map, which locks the package down — any subpath import is refused unless explicitly declared. Add:

```json
"exports": {
  ".": {
    "types": "./build/index.d.ts",
    "import": "./build/index.esm.js",
    "require": "./build/index.cjs.js",
    "default": "./build/index.esm.js"
  },
  "./style.css": "./build/style.css"
}
```

`style.css` is already covered by `files: ["build/**/*"]`, so no change is needed there.

### 3. Change `:root` to `:root, :host` in `src/style.css`

This is the part that actually makes the sheet work *inside* a shadow root, and it's nearly free.

When the sheet is adopted into a shadow root, `:root` matches nothing — there is no document root element inside the shadow tree — so the `--jer-*` custom properties defined in the first block of `src/style.css` never get set, and every static rule that depends on them breaks. `:host` matches the shadow host, the custom properties land there, and they inherit down into the shadow tree.

```css
:root,
:host {
  --jer-select-border: #b6b6b6;
  /* ...rest of the custom properties... */
}
```

This is harmless in the normal light-DOM case: `:host` simply matches nothing there.

## Consumer usage

Inside a shadow root, import the stylesheet and inject it into the shadow root rather than relying on the auto-injected copy in `document.head`:

```js
import 'json-edit-react/style.css'
```

or, for explicit control over the injection target, fetch the file's contents and attach them to the shadow root (e.g. via a `<style>` element or a constructable stylesheet on `shadowRoot.adoptedStyleSheets`).

## Trade-offs

- **Effective (consumer) bundle size: unchanged.** A normal `import { JsonEditor } from 'json-edit-react'` resolves to the `.` entry, which inlines its own CSS and never references `build/style.css`. Nothing imports that file unless the consumer reaches for the subpath, so it never enters a normal bundle graph. The bundlephobia number (measured on the `.` entry) is unaffected.
- **Published package size: grows by ~9 KB raw / ~3 KB gzipped** — one extra file in the npm tarball. Negligible.
- **Double inclusion for shadow-DOM users.** A consumer following the escape hatch ends up with the CSS twice: once inert in `document.head` (from the auto-injection) and once in their shadow root. This is an explicit opt-in for a niche case, and the inert copy costs nothing functionally. Everyone else pays nothing.

## What was deliberately not done

A heavier "dual build" — one artifact with injection, one without — was rejected. It doubles the artifact matrix for a niche case, and the single extract-file approach delivers the same capability for one extra output file.
