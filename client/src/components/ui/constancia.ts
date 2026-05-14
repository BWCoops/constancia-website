/*
 * Constancia UI Component barrel
 * ─────────────────────────────────────────────────────────────────
 * Import all shared components from this single entry point:
 *
 *   import { GlassCard, PageSection, SectionHeading, ProofBar, InfoBox, CutIcon }
 *     from "@/components/ui/constancia"
 *
 * This keeps import paths clean and makes refactoring easier —
 * component file moves only require an update here, not across every consumer.
 */

export { GlassCard }       from "./glass-card";
export { PageSection }     from "./page-section";
export { SectionHeading }  from "./section-heading";
export { ProofBar }        from "./proof-bar";
export type { ProofBarItem } from "./proof-bar";
export { InfoBox }         from "./info-box";

export { Button, buttonVariants } from "./button";
export type { ButtonProps }       from "./button";

export { CutIcon }     from "./cut-icon";
export type { CutIconProps } from "./cut-icon";

// Global modal system (single import surface)
export { useModal, useModalStack, ModalProvider } from "@/lib/modals/store";
export type { ModalId, ModalDataMap } from "@/lib/modals/types";
