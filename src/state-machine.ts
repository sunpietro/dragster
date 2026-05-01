import { createDefaultEventInfo, type DragsterEventInfo, type DragsterEventMap, type EventEmitter } from './events.js';
import { createElement, findAncestor, getEventPoint, isTouchEvent, removeNode } from './dom.js';
import { isRegionBoundary } from './regions.js';

/**
 * Class added to the dragged source element while a drag is in flight.
 * Consumers can style this state via CSS.
 */
export const CLASS_DRAGGING = 'is-dragging';

/** Class on the floating shadow element that follows the cursor. */
export const CLASS_SHADOW = 'dragster-temp';

/** Hidden-state class applied to the shadow before its first position update. */
export const CLASS_HIDDEN = 'dragster-is-hidden';

/**
 * Drag lifecycle states.
 *
 *   `idle`     — no drag in flight; pointer-down listeners armed.
 *   `dragging` — between a successful pickup and the matching pointer-up.
 *
 * The transient legacy states (`picking`, `dropping`) are not modelled because
 * pickup and drop are atomic in the rewrite: there is no async work between
 * "decide to start dragging" and "drag is now active", nor between "pointer
 * up arrived" and "drag is over". A two-state machine matches reality.
 */
export type DragState = 'idle' | 'dragging';

/**
 * Outcome of the {@link StateMachineConfig.onDrop} hook.
 *
 *   - {@link DragsterEventInfo} — a real drop happened; the returned info is
 *     forwarded to `afterDragDrop` listeners. Hook may mutate and return the
 *     same reference, or return a fresh object.
 *   - `null` — pointer-up landed on no valid target; `afterDragDrop` is NOT
 *     emitted. `afterDragEnd` still fires.
 */
export type DropResult = DragsterEventInfo | null;

export interface StateMachineConfig {
    /** Containers the state machine listens on for pointer-down. Stored by reference. */
    regions: readonly HTMLElement[];
    /**
     * Predicate identifying a draggable element. The state machine walks up
     * from the pointer-down target until this returns true (drag starts) or
     * the walk exits the region (no drag).
     */
    isDraggable: (element: HTMLElement) => boolean;
    /**
     * If set to a non-empty string, the pointer-down target itself must carry
     * this class for a drag to start. Used by consumers that want a dedicated
     * drag-handle UI affordance. `false` disables the gate.
     */
    dragHandleCssClass: string | false;
    /** Regions tagged with this class block drops but allow drags out (legacy 2.x semantics). */
    dragOnlyRegionCssClass: string;
    /**
     * When `true`, the shadow element is positioned with its original-relative
     * offset preserved (so the cursor stays on the same point on the element).
     * When `false` (legacy default), the shadow centres horizontally under the
     * cursor and aligns its top to the cursor.
     */
    shadowElementUnderMouse: boolean;
    /** Per-instance id stamped on the shadow element's `data-dragster-id`. */
    instanceId: string;
    /** Typed event bus the state machine emits lifecycle events on. */
    emitter: EventEmitter<DragsterEventMap>;
    /**
     * Synchronous hook run at pointer-up, between `beforeDragEnd` and
     * `afterDragDrop`/`afterDragEnd`. The seam where PR 7 wires in the
     * actual reorder. See {@link DropResult} for the return contract.
     *
     * Omitted → `afterDragDrop` is never emitted. Useful for tests or for
     * consumers wiring drop logic via a `beforeDragEnd` listener.
     */
    onDrop?: (info: DragsterEventInfo) => DropResult;
}

/**
 * Drag lifecycle as an explicit state machine.
 *
 * Owns three concerns and nothing else:
 *
 *   1. **Pointer normalisation** — mouse + touch funnelled to one handler trio.
 *   2. **Shadow element** — create on pickup, reposition on move, remove on drop.
 *   3. **Event emission with cancellation** — `before*` events whose listeners
 *      return `false` short-circuit the corresponding action (matching the
 *      legacy 2.x callback semantics).
 *
 * Placeholder positioning, scroll-on-edge, and the actual reorder are
 * deliberately not part of this module — they live in `placeholder.ts`,
 * `scroll.ts`, and the `onDrop` hook respectively.
 */
export class StateMachine {
    private state: DragState = 'idle';
    private regions: readonly HTMLElement[];
    private readonly config: StateMachineConfig;
    private shadowElement: HTMLElement | null = null;
    private draggedElement: HTMLElement | null = null;
    private eventInfo: DragsterEventInfo = createDefaultEventInfo();
    private shadowOffset: { x: number; y: number } = { x: 0, y: 0 };
    private shadowSize: { width: number; height: number } = { width: 0, height: 0 };
    private dragInputType: 'mouse' | 'touch' = 'mouse';
    private readonly bound: {
        pointerDown: (event: Event) => void;
        pointerMove: (event: Event) => void;
        pointerUp: (event: Event) => void;
    };

    constructor(config: StateMachineConfig) {
        this.config = config;
        this.regions = config.regions;
        this.bound = {
            pointerDown: (event) => this.onPointerDown(event as MouseEvent | TouchEvent),
            pointerMove: (event) => this.onPointerMove(event as MouseEvent | TouchEvent),
            pointerUp: (event) => this.onPointerUp(event as MouseEvent | TouchEvent),
        };
        this.attachPointerDownListeners(this.regions);
    }

    /** Current state. Primarily for tests / introspection. */
    getState(): DragState {
        return this.state;
    }

    /** Currently-active shadow element, or null when idle. */
    getShadowElement(): HTMLElement | null {
        return this.shadowElement;
    }

    /** Currently-active dragged element, or null when idle. */
    getDraggedElement(): HTMLElement | null {
        return this.draggedElement;
    }

    /** Live event-info reference — exposed so other modules can mutate placeholder/drop fields during the drag. */
    getEventInfo(): DragsterEventInfo {
        return this.eventInfo;
    }

    /**
     * Re-attach pointer-down listeners to a refreshed region set. Called by
     * the orchestrator after `RegionTracker.refresh()` discovers new regions.
     *
     * Safe to call mid-drag: the in-flight drag's move/up listeners live on
     * `document.body`, not on regions, so swapping the region set never
     * breaks an active drag.
     */
    rebindRegions(regions: readonly HTMLElement[]): void {
        this.detachPointerDownListeners(this.regions);
        this.regions = regions;
        this.attachPointerDownListeners(this.regions);
    }

    /**
     * Detach every listener and tear down any in-flight drag silently.
     * No lifecycle events are emitted — destruction is a quiet shutdown.
     */
    destroy(): void {
        this.detachPointerDownListeners(this.regions);
        this.detachMoveUpListeners();
        this.cleanupDragArtifacts();
        this.state = 'idle';
    }

    private attachPointerDownListeners(regions: readonly HTMLElement[]): void {
        for (const region of regions) {
            region.addEventListener('mousedown', this.bound.pointerDown);
            region.addEventListener('touchstart', this.bound.pointerDown);
        }
    }

    private detachPointerDownListeners(regions: readonly HTMLElement[]): void {
        for (const region of regions) {
            region.removeEventListener('mousedown', this.bound.pointerDown);
            region.removeEventListener('touchstart', this.bound.pointerDown);
        }
    }

    private attachMoveUpListeners(input: 'mouse' | 'touch'): void {
        const moveEvent = input === 'touch' ? 'touchmove' : 'mousemove';
        const upEvent = input === 'touch' ? 'touchend' : 'mouseup';
        document.body.addEventListener(moveEvent, this.bound.pointerMove);
        document.body.addEventListener(upEvent, this.bound.pointerUp);
    }

    private detachMoveUpListeners(): void {
        // Both pairs are removed defensively — a destroy() during an in-flight
        // drag should not leave either pair attached, regardless of input mode.
        document.body.removeEventListener('mousemove', this.bound.pointerMove);
        document.body.removeEventListener('mouseup', this.bound.pointerUp);
        document.body.removeEventListener('touchmove', this.bound.pointerMove);
        document.body.removeEventListener('touchend', this.bound.pointerUp);
    }

    private onPointerDown(event: MouseEvent | TouchEvent): void {
        if (this.state !== 'idle') return;

        // Right-click never starts a drag. Touch events have no `button`.
        if (!isTouchEvent(event) && event.button === 2) return;

        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        if (this.config.dragHandleCssClass && !target.classList.contains(this.config.dragHandleCssClass)) {
            return;
        }

        const draggedElement = this.findDraggable(target);
        if (!draggedElement) return;

        const eventInfo = createDefaultEventInfo();
        eventInfo.drag.node = draggedElement;

        if (!this.config.emitter.emit('beforeDragStart', eventInfo)) return;

        event.preventDefault();

        const point = getEventPoint(event);
        const rect = draggedElement.getBoundingClientRect();

        this.shadowOffset = { x: rect.left - point.clientX, y: rect.top - point.clientY };
        this.shadowSize = { width: rect.width, height: rect.height };
        this.shadowElement = this.createShadow(draggedElement, rect);
        eventInfo.shadow.node = this.shadowElement;

        draggedElement.classList.add(CLASS_DRAGGING);

        this.eventInfo = eventInfo;
        this.draggedElement = draggedElement;
        this.dragInputType = isTouchEvent(event) ? 'touch' : 'mouse';
        this.state = 'dragging';

        this.attachMoveUpListeners(this.dragInputType);
        this.config.emitter.emit('afterDragStart', eventInfo);
    }

    private onPointerMove(event: MouseEvent | TouchEvent): void {
        if (this.state !== 'dragging' || !this.shadowElement) return;
        if (!this.config.emitter.emit('beforeDragMove', this.eventInfo)) return;

        event.preventDefault();

        const point = getEventPoint(event);
        const top = this.config.shadowElementUnderMouse ? point.clientY + this.shadowOffset.y : point.clientY;
        const left = this.config.shadowElementUnderMouse
            ? point.clientX + this.shadowOffset.x
            : point.clientX - this.shadowSize.width / 2;

        this.shadowElement.style.top = `${top}px`;
        this.shadowElement.style.left = `${left}px`;
        this.shadowElement.classList.remove(CLASS_HIDDEN);

        this.eventInfo.shadow.top = top;
        this.eventInfo.shadow.left = left;

        this.config.emitter.emit('afterDragMove', this.eventInfo);
    }

    private onPointerUp(event: MouseEvent | TouchEvent): void {
        if (this.state !== 'dragging') return;

        // beforeDragEnd cancellation: tear down without emitting afterDragDrop or afterDragEnd.
        // Matches legacy 2.x — a cancelled end is "this drag never happened" from the listener's POV.
        if (!this.config.emitter.emit('beforeDragEnd', this.eventInfo)) {
            this.cleanupDragArtifacts();
            this.detachMoveUpListeners();
            this.state = 'idle';
            return;
        }

        event.preventDefault();

        if (this.config.onDrop) {
            const result = this.config.onDrop(this.eventInfo);
            if (result !== null) {
                this.eventInfo = result;
                this.config.emitter.emit('afterDragDrop', this.eventInfo);
            }
        }

        // Snapshot the info reference *before* cleanup so afterDragEnd listeners
        // see the same object they got in beforeDragEnd, even after we reset.
        const finalInfo = this.eventInfo;
        this.cleanupDragArtifacts();
        this.detachMoveUpListeners();
        this.state = 'idle';

        this.config.emitter.emit('afterDragEnd', finalInfo);
    }

    private cleanupDragArtifacts(): void {
        if (this.shadowElement) {
            removeNode(this.shadowElement);
            this.shadowElement = null;
        }
        if (this.draggedElement) {
            this.draggedElement.classList.remove(CLASS_DRAGGING);
            this.draggedElement = null;
        }
    }

    private findDraggable(target: HTMLElement): HTMLElement | null {
        return findAncestor(
            target,
            (el) => this.config.isDraggable(el),
            (el) => isRegionBoundary(el, this.config.dragOnlyRegionCssClass),
        );
    }

    private createShadow(dragged: HTMLElement, rect: DOMRect): HTMLElement {
        const shadow = createElement('div', {
            classes: [CLASS_SHADOW, CLASS_HIDDEN],
            dataset: { dragsterId: this.config.instanceId },
            style: {
                position: 'fixed',
                width: `${rect.width}px`,
                height: `${rect.height}px`,
            },
        });
        // Intentional innerHTML copy — preserves React's node references on the
        // shadow when consumers mount Dragster on a React subtree. See audit
        // memo: rewriting with cloneNode() would break React reconciliation.
        shadow.innerHTML = dragged.innerHTML;
        document.body.appendChild(shadow);
        return shadow;
    }
}
