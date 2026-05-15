# Global modal system

One provider, one host, one hook — replaces the 200+ scattered `useState` modal patterns across the codebase.

## Usage

### Open a modal from anywhere

```tsx
import { useModal } from '@/lib/modals/store';

function DownloadButton({ resourceId }: { resourceId: string }) {
  const { open } = useModal();
  return (
    <Button onClick={() => open('download-gate', { resourceId })}>
      Download
    </Button>
  );
}
```

That's it. No local `useState`, no prop drilling, no rendering the modal yourself.

### Close from inside a modal

The modal component receives an `onClose` prop automatically — wire it to your dismiss button or shadcn Dialog `onOpenChange`.

### Close from anywhere

```tsx
const { close, closeAll } = useModal();

close();                                 // closes top of stack
close({ id: 'download-gate' });          // closes most recent matching id
close({ key: '...' });                   // closes a specific instance
closeAll();                              // empties the stack (e.g. on sign-out)
```

## Adding a new modal

1. Add the id and typed data payload to `client/src/lib/modals/types.ts`:
   ```ts
   export type ModalId = | 'download-gate' | ... | 'my-new-modal';
   export interface ModalDataMap {
     ...
     'my-new-modal': { something: string };
   }
   ```

2. Lazy-import the component in `client/src/lib/modals/registry.tsx` and add it to `MODAL_REGISTRY`.

3. Open it from any component:
   ```tsx
   open('my-new-modal', { something: 'value' });
   ```

## Architecture

```
ModalProvider (Context + useReducer, holds the stack)
└── App
    └── ... your tree ...
└── GlobalModalHost (renders the stack)
    └── <Suspense> wraps each modal so they lazy-load on first open
```

Stack-aware: opening modal B over modal A pushes B on top; closing B reveals A. Use this for confirmation flows, drill-down detail views, etc.

## Migration from local-state modals

Before:
```tsx
function Page() {
  const [showModal, setShowModal] = useState(false);
  const [resourceId, setResourceId] = useState<string>();

  return (
    <>
      <Button onClick={() => { setResourceId('123'); setShowModal(true); }}>Open</Button>
      {showModal && resourceId && (
        <DownloadGateModal
          resourceId={resourceId}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
```

After:
```tsx
function Page() {
  const { open } = useModal();
  return <Button onClick={() => open('download-gate', { resourceId: '123' })}>Open</Button>;
}
```

The component itself stays the same — the migration is at the **call site** only.

## Why not Zustand / Jotai / Redux?

Standalone state libraries add a dependency for what's a tiny domain. React Context + useReducer is enough here, type-safe, and matches the codebase's existing context patterns (FeatureFlagProvider, VisitorProvider, etc.).
