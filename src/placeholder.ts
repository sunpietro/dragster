import { createElement, findAncestor, insertAfter, insertBefore, removeNode } from './dom.js';

/** Class on the temporary placeholder element inserted to indicate the drop slot. */
export const CLASS_PLACEHOLDER = 'dragster-drop-placeholder';

/**
 * Where the placeholder sits relative to its drop target.
 *
 *   `top`    — placeholder is the *previous* sibling of the drop target
 *              (drop puts the dragged element above the target).
 *   `bottom` — placeholder is the *next* sibling of the drop target, OR
 *              the last child of a region target (drop puts the dragged
 *              element below the target / at the end of the region).
 */
export type PlaceholderPosition = 'top' | 'bottom';

/** Snapshot of the manager's current placeholder placement. */
export interface PlaceholderState {
    /** The placeholder element if one is active, else `null`. */
    node: HTMLElement | null;
    /** Position relative to {@link dropTarget}. `null` when no placeholder is active. */
    position: PlaceholderPosition | null;
    /**
     * The element the placeholder is anchored to. May be either:
     *   - a draggable element (top/bottom), or
     *   - a region (always `bottom`, append-to-end).
     * `null` when no placeholder is active.
     */
    dropTarget: HTMLElement | null;
}

export interface PlaceholderManagerConfig {
    /** Per-instance id stamped on placeholders so cross-instance cleanup is safe. */
    instanceId: string;
    /** CSS selector matching draggable user content within a region (used to detect empty vs. populated regions). */
    elementSelector: string;
    /** Predicate identifying a draggable element (typically: wrapper class + matching instanceId). */
    isDraggable: (element: HTMLElement) => boolean;
    /** Predicate matching a region this manager's owning instance manages. */
    isOwnedRegion: (element: HTMLElement) => boolean;
    /** Predicate matching a drag-only region (drops are not allowed; drags out are). */
    isDragOnlyRegion: (element: HTMLElement) => boolean;
}

export interface PlaceholderUpdateInput {
    /**
     * The element directly under the cursor — typically the result of
     * `document.elementFromPoint(clientX, clientY)`. May be `null` when the
     * cursor leaves the document or hits a non-element node.
     */
    pointerTarget: HTMLElement | null;
    /** Cursor Y coordinate in client (viewport-relative) space. */
    clientY: number;
    /** The element currently being dragged — never receives a placeholder. */
    draggedElement: HTMLElement;
}

/**
 * Decides where the drop placeholder should live and keeps that decision
 * reflected in the DOM. Pure with respect to the cursor input — every call
 * to {@link update} converges on the same DOM state for the same arguments,
 * regardless of how many times you call it.
 *
 * Decision tree (first match wins):
 *   1. cursor on the existing placeholder         → leave it as-is
 *   2. cursor on a draggable other than the source
 *      AND not inside a drag-only region          → place top/bottom relative to that draggable
 *   3. cursor directly on a non-drag-only region  → append to that region
 *   4. anything else                              → clear the placeholder
 *
 * The top/bottom split for case 2 is by viewport-Y midpoint of the target's
 * bounding rect: `clientY < rect.top + rect.height/2` is `top`, otherwise `bottom`.
 */
export class PlaceholderManager {
    private readonly config: PlaceholderManagerConfig;
    private state: PlaceholderState = { node: null, position: null, dropTarget: null };

    constructor(config: PlaceholderManagerConfig) {
        this.config = config;
    }

    /** Snapshot of the current placement. The returned object is a fresh copy. */
    getCurrent(): PlaceholderState {
        return { ...this.state };
    }

    /**
     * Recompute the placeholder's position. Called from a pointer-move
     * handler. Idempotent: repeated calls with the same inputs perform at
     * most one DOM mutation across the whole sequence (the initial insert).
     */
    update(input: PlaceholderUpdateInput): PlaceholderState {
        const { pointerTarget, clientY, draggedElement } = input;

        if (!pointerTarget) {
            this.clear();
            return this.snapshot();
        }

        // Cursor sitting on our own placeholder → preserve current state.
        if (pointerTarget === this.state.node || pointerTarget.classList.contains(CLASS_PLACEHOLDER)) {
            return this.snapshot();
        }

        const dropTarget = findAncestor(
            pointerTarget,
            (el) => this.config.isDraggable(el),
            (el) => this.config.isOwnedRegion(el) && !this.config.isDragOnlyRegion(el),
        );

        if (dropTarget && dropTarget !== draggedElement) {
            const inDragOnly = findAncestor(dropTarget, (el) => this.config.isDragOnlyRegion(el)) !== null;
            if (!inDragOnly) {
                return this.placeOnTarget(dropTarget, clientY);
            }
        }

        if (this.config.isOwnedRegion(pointerTarget) && !this.config.isDragOnlyRegion(pointerTarget)) {
            return this.placeInRegion(pointerTarget);
        }

        this.clear();
        return this.snapshot();
    }

    /** Remove the active placeholder, if any. Safe to call repeatedly. */
    clear(): void {
        if (this.state.node) {
            removeNode(this.state.node);
            this.state = { node: null, position: null, dropTarget: null };
        }
        // Defensive sweep: in case a stale placeholder owned by this instance
        // somehow lingers (e.g. a consumer cloned a node that contained one),
        // remove every match. Cheap — there is at most one in normal flow.
        const stragglers = document.querySelectorAll<HTMLElement>(`.${CLASS_PLACEHOLDER}`);
        for (const node of stragglers) {
            if (node.dataset.dragsterId === this.config.instanceId) {
                removeNode(node);
            }
        }
    }

    /** Detach any active placeholder and reset state. Safe to call when idle. */
    destroy(): void {
        this.clear();
    }

    private placeOnTarget(target: HTMLElement, clientY: number): PlaceholderState {
        const rect = target.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const position: PlaceholderPosition = clientY < midpoint ? 'top' : 'bottom';

        if (this.state.dropTarget === target && this.state.position === position && this.state.node) {
            return this.snapshot();
        }

        this.removeActiveNode();
        const placeholder = this.createPlaceholder();
        if (position === 'top') {
            insertBefore(target, placeholder);
        } else {
            insertAfter(target, placeholder);
        }
        this.state = { node: placeholder, position, dropTarget: target };
        return this.snapshot();
    }

    private placeInRegion(region: HTMLElement): PlaceholderState {
        if (this.state.dropTarget === region && this.state.position === 'bottom' && this.state.node) {
            return this.snapshot();
        }

        this.removeActiveNode();
        const placeholder = this.createPlaceholder();
        region.appendChild(placeholder);
        this.state = { node: placeholder, position: 'bottom', dropTarget: region };
        return this.snapshot();
    }

    private removeActiveNode(): void {
        if (this.state.node) {
            removeNode(this.state.node);
            this.state = { node: null, position: null, dropTarget: null };
        }
    }

    private createPlaceholder(): HTMLElement {
        return createElement('div', {
            classes: [CLASS_PLACEHOLDER],
            dataset: { dragsterId: this.config.instanceId },
        });
    }

    private snapshot(): PlaceholderState {
        return { ...this.state };
    }
}
