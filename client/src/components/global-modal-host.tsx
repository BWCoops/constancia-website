/**
 * GlobalModalHost
 * ─────────────────────────────────────────────────────────────────
 * Mounts once at app root. Renders the modal stack from the ModalProvider.
 * Each modal receives its typed data payload as props, plus an onClose
 * handler that pops it off the stack.
 *
 * Use:
 *   <ModalProvider>
 *     <App />
 *     <GlobalModalHost />
 *   </ModalProvider>
 */

import { Suspense } from 'react';
import { useModal, useModalStack } from '@/lib/modals/store';
import { MODAL_REGISTRY } from '@/lib/modals/registry';

export function GlobalModalHost() {
  const stack = useModalStack();
  const { close } = useModal();

  if (stack.length === 0) return null;

  return (
    <>
      {stack.map((modal) => {
        const Component = MODAL_REGISTRY[modal.id];
        if (!Component) return null;

        const onClose = () => close({ key: modal.key });
        // Bridge to shadcn Dialog-style components that expect onOpenChange:
        // when the modal flips its `open` state to false, treat as close.
        const onOpenChange = (open: boolean) => { if (!open) onClose(); };
        const data = (modal.data ?? {}) as Record<string, unknown>;

        return (
          <Suspense key={modal.key} fallback={null}>
            <Component
              {...data}
              onClose={onClose}
              isOpen={true}
              open={true}
              onOpenChange={onOpenChange}
            />
          </Suspense>
        );
      })}
    </>
  );
}
