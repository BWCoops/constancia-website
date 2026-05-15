/**
 * Global modal store
 * ─────────────────────────────────────────────────────────────────
 * Context + reducer. No external dependencies — uses React primitives.
 *
 * Renders nothing on its own; pair with <GlobalModalHost /> mounted near
 * the app root.
 */

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  type ReactNode,
} from 'react';
import type { ModalId, ModalDataMap, OpenModal } from './types';

type ModalState = { stack: OpenModal[] };

type ModalAction =
  | { type: 'open';     modal: OpenModal }
  | { type: 'close';    id?: ModalId; key?: string }
  | { type: 'closeAll' };

function reducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'open':
      return { stack: [...state.stack, action.modal] };
    case 'close':
      if (action.key) {
        return { stack: state.stack.filter((m) => m.key !== action.key) };
      }
      if (action.id) {
        // Close most recent matching id
        const idx = [...state.stack].reverse().findIndex((m) => m.id === action.id);
        if (idx === -1) return state;
        const realIdx = state.stack.length - 1 - idx;
        return { stack: state.stack.filter((_, i) => i !== realIdx) };
      }
      // No id/key: close top
      return { stack: state.stack.slice(0, -1) };
    case 'closeAll':
      return { stack: [] };
  }
}

const ModalStateContext = createContext<ModalState | null>(null);
const ModalDispatchContext = createContext<React.Dispatch<ModalAction> | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { stack: [] });
  const stateValue = useMemo(() => state, [state]);
  return (
    <ModalStateContext.Provider value={stateValue}>
      <ModalDispatchContext.Provider value={dispatch}>
        {children}
      </ModalDispatchContext.Provider>
    </ModalStateContext.Provider>
  );
}

export function useModalStack(): readonly OpenModal[] {
  const state = useContext(ModalStateContext);
  if (!state) {
    throw new Error('useModalStack must be used inside <ModalProvider>');
  }
  return state.stack;
}

interface ModalApi {
  /** Push a modal onto the stack. Same id can be opened multiple times — each gets its own key. */
  open: <Id extends ModalId>(id: Id, data: ModalDataMap[Id]) => string;
  /** Close a specific modal by key (preferred), or the most recent of an id, or the top-most. */
  close: (target?: { id?: ModalId; key?: string }) => void;
  /** Empty the stack. Use sparingly — usually only on route change or sign-out. */
  closeAll: () => void;
}

export function useModal(): ModalApi {
  const dispatch = useContext(ModalDispatchContext);
  if (!dispatch) {
    throw new Error('useModal must be used inside <ModalProvider>');
  }
  return useMemo<ModalApi>(
    () => ({
      open: (id, data) => {
        const key = `${id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        dispatch({ type: 'open', modal: { id, data, key } as OpenModal });
        return key;
      },
      close: (target) => dispatch({ type: 'close', id: target?.id, key: target?.key }),
      closeAll: () => dispatch({ type: 'closeAll' }),
    }),
    [dispatch],
  );
}
