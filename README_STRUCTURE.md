# README structure (proposed)

A proposed reorganization of [README.md](README.md). This captures **section order and nesting only** — not the prose. It's a working/planning doc, not shipped.

## Organizing principles

- **Top-level sections descend by how many users need them.** State and change-handling first; niche/advanced and reference last.
- **Within each section, subsections go basic → advanced.** Start with the common, one-line case (a boolean, a prebuilt theme) and build toward the powerful case (a filter function, a style function).
- **Developer-facing and end-user-facing docs are explicitly labelled.** "Implementation" is for the developer integrating the component; "Using the editor" is for the people who use the rendered UI.
- **The `(nodeData) => result` shape is introduced once, early, then linked everywhere.** It's the backbone of the API — permissions, type selection, search, styling, custom-node matching, custom text and every callback all share it. Defining it up front and cross-linking removes the repetition (and gives the orphaned `#filter-functions` anchor a real home).

## Outline

### Front matter — kept from the current README

```
# json-edit-react              intro · Explore the Demo · Features
## Installation                + ### Optional companion packages (themes / components / utils overview)
## Implementation              > For developers — adding & configuring the component in your app
## Using the editor            > For end users — interacting with the rendered editor  (renamed from "Usage")
## Props Reference             categorised quick-lookup table
```

`Implementation` and `Using the editor` sit adjacent with parallel audience subtitles so the developer-vs-end-user split is unmissable. `Using the editor` is the interaction vocabulary — click / Enter / Esc to edit, the +/– buttons, type selection, drag-to-reorder, copy, collapse/expand, the search box — each forward-linking to the developer section that configures it.

### Body — importance-ordered, simple → deep

```
## Managing state                                  everyone starts here
   ### Controlled component — `data` + `setData`
   ### Read-only display — `JsonViewer`
   ### Typed data — `JsonEditor<T>`

## Node data & filter functions                    the shared vocabulary — introduced before anything uses it
   ### The `NodeData` object                       key · path · value · fullData · parentData · level · index · size
   ### Filter functions — `(nodeData) => result`   the shared shape + the "where it's used" table below
                                                    (this subheading provides the #filter-functions anchor)

## Controlling editing                             first concrete payoff of the filter-function concept
   ### Permissions — `allowEdit` / `allowDelete` / `allowAdd`     boolean → filter function
   ### Restricting data types — `allowTypeSelection`
       #### Enums
   ### New-key restrictions & default values
   ### Drag-and-drop reordering
   ### Editing a node as raw text / JSON           (the `TextEditor` override → links to Custom nodes)

## Reacting to changes                             the core of "an editor"
   ### `onUpdate` — accept, reject, transform      simple: just save
   ### Async updates & gating — `hold()`           advanced
   ### `onChange` — validating each keystroke
   ### `onError`
   ### `onCopy`
   ### JSON Schema validation                      worked example

## Appearance & theming
   ### Using a prebuilt theme (`@json-edit-react/themes`)
   ### Customising styles — the `theme` object     colours → style objects → style functions
   ### CSS classes
   ### Style fragments
   ### Icons
   ### Initial expansion & `collapse`

## Search & filtering
   ### Basic search — `searchText` + `searchFilter`
   ### Custom search — `SearchFilterFunction`

## Localisation
   ### `translations`
   ### Dynamic text — `customText`                 (current "Custom Text" folds in here)

## Keyboard control

## Custom nodes & components                       powerful, advanced
   ### Using the prebuilt components (`@json-edit-react/components`)
       #### Active hyperlinks (example)
   ### Writing a custom node — `condition` + `component`   (incl. handling values via `setValue`)
   ### Customising the key — `keyComponent`
   ### Collection nodes & collections-as-values
   ### Decorating the default node — `passOriginalNode`, `showOnView` / `showOnEdit`
   ### Replacing the text/code editor — `TextEditor` (`CodeEditor`)
   ### Custom buttons

## Programmatic control                            advanced
   ### Listening to the lifecycle — `onEditEvent`
   ### Driving the editor — the `editorRef` handle   collapse · startEdit · confirm · cancel

## Performance                                     matters on large data
   ### Fine-grained re-rendering & referentially-stable props

## Undo & redo (`@json-edit-react/utils`)
   ### `useUndo`
   ### `useConfirmOnUpdate`

## Exported helpers & types                        reference
   ### Functions & components   `StringDisplay` · `StringEdit` · `AutogrowTextArea` · `toPathString` · `matchNode` · …
   ### Types

## Issues & support  ·  ## Roadmap  ·  ## Inspiration  ·  ## Changelog
```

### The "Filter functions" usage table

Lives in **Node data & filter functions** → `### Filter functions`. It's the cross-link hub — every row points at the section where the function is actually used.

| Type | Shape | Drives | Section |
| --- | --- | --- | --- |
| `FilterFunction` | `(nodeData) => boolean` | `allowEdit` / `allowDelete` / `allowAdd` / `allowDrag`, `collapse` | Controlling editing |
| `TypeFilterFunction` | `(nodeData) => boolean \| DataType[]` | `allowTypeSelection` | Controlling editing |
| `SearchFilterFunction` | `(nodeData, searchText) => boolean` | `searchFilter` | Search & filtering |
| Style function | `(nodeData) => CSS \| null` | `theme` styles | Appearance & theming |
| `CustomTextFunction` | `(nodeData) => string \| null` | `customText` | Localisation |
| `condition` | `(nodeData) => boolean` | `customNodeDefinitions` | Custom nodes & components |
| `DefaultValueFunction` | `(nodeData, newKey?) => value` | `defaultValue` | Controlling editing |
| `NewKeyOptionsFunction` | `(nodeData) => string[] \| null` | `newKeyOptions` | Controlling editing |

Closing note in that section: the side-effect callbacks (`onUpdate` / `onChange` / `onError` / `onCollapse` / `onCopy` / `onEditEvent`) receive the **same** `NodeData` plus their own extras — link to *Reacting to changes* and *Programmatic control*.

## Notable changes from the current README

- **New foundational section** "Node data & filter functions" at #2 — the concept currently introduced incidentally wherever it's first used. Its `### Filter functions` subheading restores the `#filter-functions` anchor that the README links to 14 times but no longer defines (a heading rename orphaned it).
- **De-duplicated headings.** The current README has two `## External control` sections (→ one "Programmatic control") and two search sections (`### Search and Filtering` + `## Search/Filtering` → one "Search & filtering").
- **Callbacks grouped.** `onUpdate` / `onChange` / `onError` / `onCopy` / JSON Schema all live under one "Reacting to changes" section instead of being spread across "Update Functions" and elsewhere.
- **One extension home.** "Custom Nodes", "Custom Buttons" and the prebuilt-components package consolidate under "Custom nodes & components"; "Custom Text" moves under Localisation (it's dynamic string overrides).
- **Performance promoted** from a buried `> [!IMPORTANT]` note under Custom Nodes to its own short section (mirrors migration-guide §13).
- **Companion packages woven in** rather than scattered: overview in Installation, then `themes` → Appearance, `components` → Custom nodes, `utils` → Undo.

## Open questions / your call

- **Controlling editing at #3 vs #4.** Placed at #3 here, right after the filter-function concept, as its first concrete example. If you prefer strict importance order, swap it below "Reacting to changes" (#4) — the concept section at #2 already does the heavy lifting, so the rest of the doc can reference filter functions freely either way.
- **`#filter-functions` anchor.** This structure assumes the `### Filter functions` subheading becomes the canonical target. Confirm during your README review pass that the 14 existing self-links should repoint there (they currently resolve to nothing).
- **"Using the editor" naming.** Alternatives if "Usage → Using the editor" doesn't land: "Interacting with the editor" or "The editing experience".
