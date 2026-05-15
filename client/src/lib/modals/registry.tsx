/**
 * Global modal registry
 * ─────────────────────────────────────────────────────────────────
 * Maps ModalId -> React component (lazy-loaded).
 *
 * Each registered component receives the typed `data` payload as props,
 * plus an `onClose` handler that pops this modal off the stack.
 *
 * Add a new modal:
 *   1. Add its id + data type in types.ts
 *   2. Lazy-import here
 *   3. Map id -> component in MODAL_REGISTRY
 */

import { lazy, type ComponentType } from 'react';
import type { ModalId, ModalDataMap } from './types';

export type ModalComponentProps<Id extends ModalId> = ModalDataMap[Id] extends undefined
  ? { onClose: () => void }
  : ModalDataMap[Id] & { onClose: () => void };

// Lazy-loaded modal components. Each export must be `default` or named —
// adapt the .then() shape per component.
const DownloadGateModal = lazy(() =>
  import('@/components/download-gate-modal').then((m) => ({
    // download-gate-modal exports `DownloadGateModal` (named) — adapt as needed
    default: (m as { DownloadGateModal?: ComponentType<any>; default?: ComponentType<any> })
      .DownloadGateModal ?? (m as { default: ComponentType<any> }).default,
  })),
);

const ExportGateModal = lazy(() =>
  import('@/components/export-gate-modal').then((m) => ({
    default: (m as { ExportGateModal?: ComponentType<any>; default?: ComponentType<any> })
      .ExportGateModal ?? (m as { default: ComponentType<any> }).default,
  })),
);

const ChartPopoutModal = lazy(() =>
  import('@/components/chart-popout-modal').then((m) => ({
    default: (m as { ChartPopoutModal?: ComponentType<any>; default?: ComponentType<any> })
      .ChartPopoutModal ?? (m as { default: ComponentType<any> }).default,
  })),
);

const TablePopoutModal = lazy(() =>
  import('@/components/table-popout-modal').then((m) => ({
    default: (m as { TablePopoutModal?: ComponentType<any>; default?: ComponentType<any> })
      .TablePopoutModal ?? (m as { default: ComponentType<any> }).default,
  })),
);

export const MODAL_REGISTRY: { [K in ModalId]?: ComponentType<any> } = {
  'download-gate': DownloadGateModal,
  'export-gate':   ExportGateModal,
  'chart-popout':  ChartPopoutModal,
  'table-popout':  TablePopoutModal,
  // 'mobile-menu' deliberately omitted — handled inline in <Navigation>; included
  // in the type union so future migration is one-line.
};
