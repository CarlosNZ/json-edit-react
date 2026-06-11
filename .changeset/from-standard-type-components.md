---
'@json-edit-react/components': minor
---

All six `editOnTypeSwitch` definitions provide `fromStandardType`, so switching a node to one of these types carries the existing value into the editor instead of replacing it with the placeholder default: Symbol seeds its description from the value, BigInt and Date Object seed from parseable values (and otherwise present the raw text to fix, with the commit rejected until it parses), Color Picker seeds its text input, Date (ISO) seeds the picker from parseable dates (falling back to now), and Enhanced Link puts URL-looking values in its url field and anything else in its text field.
