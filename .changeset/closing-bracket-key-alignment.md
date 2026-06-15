---
'json-edit-react': patch
---

The closing bracket of an expanded object/array now aligns horizontally with the key (the start of the opening line), matching how JSON pretty-printers position a close bracket under the line that opened it. Previously it carried a depth-dependent offset that drifted toward the collapse chevron at the default indent. The alignment is now independent of the `indent` prop (#220).

Breaking only for custom CSS that positioned the outside closing bracket via `.jer-bracket-outside`: it no longer sets `padding-left`, so any rule that compensated for the old offset should be removed.
