import { useState } from 'react'
import { JsonEditor } from '@json-edit-react'

// Identifiers available (unqualified) inside react-live playground code. Kept
// minimal and realistic — what a consumer would actually import. The selected
// `theme` is merged in per-render by LiveCodeBlock.
export const liveScope = { JsonEditor, useState }
