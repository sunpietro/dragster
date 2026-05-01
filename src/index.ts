import { createElement } from './dom.js';
import {
    EventEmitter,
    type DragsterEventInfo,
    type DragsterEventMap,
    type DragsterEventName,
    type DragsterListener,
} from './events.js';
import { PlaceholderManager } from './placeholder.js';
import { RegionTracker } from './regions.js';
import { autoScroll } from './scroll.js';
import { StateMachine } from './state-machine.js';

/** Class added to the wrapper inserted around each user draggable. */
const CLASS_DRAGGABLE = 'dragster-draggable';

/**
 * Public configuration accepted by {@link Dragster}. Every field is optional
 * and falls back to the defaults below; pass an empty object to accept all
 * defaults.
 */
export interface DragsterOptions {
    /** CSS selector matching the user's draggable items. Default: `.dragster-block`. */
    elementSelector?: string;
    /** CSS selector matching the user's drop region containers. Default: `.dragster-region`. */
    regionSelector?: string;
    /**
     * If a string, mousedown only starts a drag when the event target carries
     * this class — useful for dedicated drag-handle UIs. `false` (default)
     * lets any descendant of a draggable initiate the drag.
     */
    dragHandleCssClass?: string | false;
    /** Class identifying drag-only regions (drags out allowed, drops in not). */
    dragOnlyRegionCssClass?: string;
    /** When true, regions auto-resize to fit their items on every drag move. */
    updateRegionsHeight?: boolean;
    /** Floor for region height when auto-resize is on. */
    minimumRegionHeight?: number;
    /** When true, the viewport auto-scrolls when the cursor approaches a top/bottom edge. */
    scrollWindowOnDrag?: boolean;
    /**
     * When true (default), each user item is wrapped in an internal element
     * that the library uses to track and reorder the drag. The wrapper
     * survives between drags. When false, the library expects the user to
     * have already wrapped the items themselves (advanced).
     */
    wrapDraggableElements?: boolean;
    /**
     * When true, the floating shadow stays at its original cursor-relative
     * offset. When false (default), the shadow centres horizontally below
     * the cursor — matching legacy 2.x behaviour.
     */
    shadowElementUnderMouse?: boolean;
}

type ResolvedOptions = Required<DragsterOptions>;

const DEFAULT_OPTIONS: ResolvedOptions = {
    elementSelector: '.dragster-block',
    regionSelector: '.dragster-region',
    dragHandleCssClass: false,
    dragOnlyRegionCssClass: 'dragster-region--drag-only',
    updateRegionsHeight: true,
    minimumRegionHeight: 60,
    scrollWindowOnDrag: false,
    wrapDraggableElements: true,
    shadowElementUnderMouse: false,
};

let instanceCounter = 0;

function nextInstanceId(): string {
    instanceCounter += 1;
    return `dragster-${instanceCounter}-${Math.floor(Math.random() * 0x10000).toString(16)}`;
}

export type { DragsterEventInfo, DragsterEventMap, DragsterEventName, DragsterListener } from './events.js';

/**
 * Public entry point. Construct one instance per drag-and-drop scope; call
 * `.on()` to subscribe to lifecycle events, `.update()` after adding new
 * draggables to the DOM, and `.destroy()` to tear everything down.
 *
 * The seven `onBefore*` / `onAfter*` callback options from 2.x are replaced
 * by the typed `.on()` / `.off()` methods on this class. See the README
 * "Migrating from 2.x" section for a side-by-side mapping.
 */
export default class Dragster {
    private readonly options: ResolvedOptions;
    private readonly instanceId: string;
    private readonly emitter = new EventEmitter<DragsterEventMap>();
    private readonly regionTracker: RegionTracker;
    private readonly placeholderManager: PlaceholderManager;
    private readonly stateMachine: StateMachine;
    private destroyed = false;

    constructor(options: DragsterOptions = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.instanceId = nextInstanceId();

        this.wrapDraggables();

        this.regionTracker = new RegionTracker({
            regionSelector: this.options.regionSelector,
            elementSelector: this.options.elementSelector,
            minimumRegionHeight: this.options.minimumRegionHeight,
            autoUpdateHeight: this.options.updateRegionsHeight,
            instanceId: this.instanceId,
        });

        this.placeholderManager = new PlaceholderManager({
            instanceId: this.instanceId,
            isDraggable: (el) => this.isDraggable(el),
            isOwnedRegion: (el) => this.isOwnedRegion(el),
            isDragOnlyRegion: (el) => el.classList.contains(this.options.dragOnlyRegionCssClass),
        });

        this.stateMachine = new StateMachine({
            regions: this.regionTracker.getRegions(),
            isDraggable: (el) => this.isDraggable(el),
            dragHandleCssClass: this.options.dragHandleCssClass,
            dragOnlyRegionCssClass: this.options.dragOnlyRegionCssClass,
            shadowElementUnderMouse: this.options.shadowElementUnderMouse,
            instanceId: this.instanceId,
            emitter: this.emitter,
            onMove: (info, point) => this.handleMove(info, point),
            onDrop: (info) => this.handleDrop(info),
        });

        if (this.options.updateRegionsHeight) this.regionTracker.updateHeights();
    }

    /** Subscribe to a lifecycle event. Returns the same Dragster for chaining. */
    on<E extends DragsterEventName>(event: E, listener: DragsterListener<E>): this {
        this.emitter.on(event, listener);
        return this;
    }

    /** Unsubscribe a previously-registered listener. Returns the same Dragster for chaining. */
    off<E extends DragsterEventName>(event: E, listener: DragsterListener<E>): this {
        this.emitter.off(event, listener);
        return this;
    }

    /** Pick up newly-added draggable items and recompute region heights. Call after mutating the DOM. */
    update(): void {
        if (this.destroyed) return;
        this.wrapDraggables();
        this.regionTracker.updateHeights();
    }

    /** Pick up newly-added regions, retag them, and rebind pointer-down listeners. */
    updateRegions(): void {
        if (this.destroyed) return;
        this.regionTracker.refresh();
        this.stateMachine.rebindRegions(this.regionTracker.getRegions());
    }

    /** Detach every listener, untag every region, and clean up any in-flight drag. Idempotent. */
    destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;
        this.stateMachine.destroy();
        this.placeholderManager.destroy();
        this.regionTracker.destroy();
        this.emitter.removeAllListeners();
    }

    private isDraggable(element: HTMLElement): boolean {
        return element.classList.contains(CLASS_DRAGGABLE) && element.dataset.dragsterId === this.instanceId;
    }

    private isOwnedRegion(element: HTMLElement): boolean {
        return this.regionTracker.getRegions().includes(element);
    }

    private wrapDraggables(): void {
        if (!this.options.wrapDraggableElements) return;
        const elements = document.querySelectorAll<HTMLElement>(this.options.elementSelector);
        for (const element of elements) {
            const parent = element.parentElement;
            if (!parent) continue;
            if (parent.classList.contains(CLASS_DRAGGABLE)) continue;
            const wrapper = createElement('div', {
                classes: [CLASS_DRAGGABLE],
                dataset: { dragsterId: this.instanceId },
            });
            parent.insertBefore(wrapper, element);
            wrapper.appendChild(element);
        }
    }

    private handleMove(info: DragsterEventInfo, point: { clientX: number; clientY: number }): void {
        if (!info.drag.node) return;

        // `elementFromPoint` can return SVG / MathML / generic Element (e.g.
        // when the cursor sits on top of a `<use>` or `<path>` inside one of
        // the user's `.dragster-block`s). Walk up to the nearest HTMLElement
        // so placeholder/region predicates — which assume `dataset` and the
        // HTML class API — get a valid target.
        let current: Element | null = document.elementFromPoint(point.clientX, point.clientY);
        while (current && !(current instanceof HTMLElement)) {
            current = current.parentElement;
        }
        const pointerTarget = current;

        const result = this.placeholderManager.update({
            pointerTarget,
            clientY: point.clientY,
            draggedElement: info.drag.node,
        });

        info.placeholder.node = result.node;
        info.placeholder.position = result.position;
        info.drop.node = result.dropTarget;

        if (this.options.scrollWindowOnDrag) {
            autoScroll(point.clientY);
        }
        if (this.options.updateRegionsHeight) {
            this.regionTracker.updateHeights();
        }
    }

    private handleDrop(info: DragsterEventInfo): DragsterEventInfo | null {
        const placement = this.placeholderManager.getCurrent();
        const dragged = info.drag.node;

        if (!placement.node || !dragged || !placement.node.parentNode) {
            this.placeholderManager.clear();
            return null;
        }

        // Slot the dragged wrapper into the placeholder's spot, then remove the placeholder.
        // Using insertBefore with the placeholder as the reference puts dragged in the same
        // position; the `dragged.parentNode === placement.node.parentNode` case (drop in
        // place at the same DOM location) is a no-op the browser handles correctly.
        placement.node.parentNode.insertBefore(dragged, placement.node);
        this.placeholderManager.clear();

        info.dropped = dragged;
        info.placeholder.node = null;
        info.placeholder.position = null;

        if (this.options.updateRegionsHeight) {
            this.regionTracker.updateHeights();
        }

        return info;
    }
}
