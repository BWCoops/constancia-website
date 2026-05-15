/**
 * Global modal system — types
 * ─────────────────────────────────────────────────────────────────
 * Add a new modal:
 *   1. Add its id to ModalId
 *   2. Add a typed entry to ModalDataMap
 *   3. Register the component in registry.tsx
 *
 * That's it. Open it from anywhere with useModal().open('your-id', data).
 */

export type ModalId =
  | 'download-gate'
  | 'export-gate'
  | 'chart-popout'
  | 'table-popout'
  | 'mobile-menu';

/**
 * Typed data payload per modal id. Add an entry when registering a new modal
 * so call-sites get full type safety.
 */
export interface ModalDataMap {
  // DownloadGateModal accepts the full ResourceFile object so it can show
  // the right title, file type, etc. Typed as `unknown` here to avoid
  // dragging shared/schema into this lib; the consumer types it correctly.
  'download-gate': { resource: unknown };
  'export-gate':   { exportType: 'pdf' | 'xlsx'; subjectId?: string };
  'chart-popout':  { chartId: string; title?: string };
  'table-popout':  { tableId: string; title?: string };
  'mobile-menu':   undefined;
}

export interface OpenModal<Id extends ModalId = ModalId> {
  id: Id;
  data: ModalDataMap[Id];
  // Stack key — uniquely identifies this open instance even if same id appears twice
  key: string;
}
