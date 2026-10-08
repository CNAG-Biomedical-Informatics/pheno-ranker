import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)

// JSDOM has no text layout; CodeMirror still needs the Range measurement APIs.
Range.prototype.getClientRects = () => [] as unknown as DOMRectList
Range.prototype.getBoundingClientRect = () => new DOMRect()

HTMLDialogElement.prototype.showModal = function () { this.open = true }
HTMLDialogElement.prototype.close = function () { this.open = false }
