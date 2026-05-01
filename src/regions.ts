import { getVerticalMargins } from './dom.js';

/**
 * Internal class added to every region the tracker is managing. Used by
 * other modules (state-machine via {@link isRegionBoundary}) to recognise
 * region boundaries during DOM ancestor walks.
 */
const CLASS_REGION = 'dragster-drag-region';

export interface RegionTrackerConfig {
    /** CSS selector that the consumer uses to mark drop regions in their HTML. */
    regionSelector: string;
    /** CSS selector that identifies draggable elements within a region. */
    elementSelector: string;
    /** Floor for the height a region is resized to when it has children. */
    minimumRegionHeight: number;
    /** When false, {@link RegionTracker.updateHeights} is a no-op. */
    autoUpdateHeight: boolean;
    /** Per-instance id stamped onto each managed region's `data-dragster-id`. */
    instanceId: string;
}

/**
 * Discovers, tags, and resizes the drop regions a Dragster instance manages.
 *
 * Region heights are recomputed on every drag-move tick. With hundreds of
 * children per region, naively reading + writing in the same loop forces
 * the browser to recalculate layout once per element — see
 * https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing.
 *
 * {@link RegionTracker.updateHeights} guarantees a strict two-phase pass:
 * every measurement read happens before any inline-style write. The browser
 * pays at most one layout invalidation per call, regardless of element count.
 */
export class RegionTracker {
    private readonly regions: HTMLElement[] = [];
    private readonly config: RegionTrackerConfig;

    constructor(config: RegionTrackerConfig) {
        this.config = config;
        this.refresh();
    }

    /**
     * Re-query the DOM for region elements and tag each one. Idempotent —
     * regions that were already tracked stay tagged; regions that no
     * longer match the selector get untagged.
     */
    refresh(): void {
        const found = document.querySelectorAll<HTMLElement>(this.config.regionSelector);
        const stillPresent = new Set<HTMLElement>(found);

        for (const old of this.regions) {
            if (!stillPresent.has(old)) this.untag(old);
        }

        this.regions.length = 0;
        for (const region of found) {
            this.regions.push(region);
            this.tag(region);
        }
    }

    /** Snapshot of the regions currently being managed. Read-only. */
    getRegions(): readonly HTMLElement[] {
        return this.regions;
    }

    /**
     * Recompute and reapply each tracked region's `style.height`.
     *
     * Two-phase to avoid layout thrash:
     *   1. **Read pass** — measures every element's `offsetHeight` + margins
     *      and accumulates per-region totals into a buffer.
     *   2. **Write pass** — applies the buffered heights as inline styles.
     *
     * No DOM read happens after the first DOM write within a single call.
     * Callers may invoke this on every pointer-move tick without paying
     * O(elements) layout recalculations.
     *
     * Empty regions (no elements matching `elementSelector`) keep their
     * existing height — matching the legacy 2.x behaviour.
     */
    updateHeights(): void {
        if (!this.config.autoUpdateHeight) return;
        if (this.regions.length === 0) return;

        // --- Phase 1: read every region's measurements. No writes here. ---
        const measurements: Array<number | null> = this.regions.map((region) => {
            const elements = region.querySelectorAll<HTMLElement>(this.config.elementSelector);
            if (elements.length === 0) return null;

            let total = this.config.minimumRegionHeight;
            for (const el of elements) {
                const margins = getVerticalMargins(el);
                total += el.offsetHeight + margins.top + margins.bottom;
            }
            return total;
        });

        // --- Phase 2: apply every height write. No reads here. ---
        this.regions.forEach((region, i) => {
            const height = measurements[i];
            if (height !== null && height !== undefined) {
                region.style.height = `${height}px`;
            }
        });
    }

    /** Untag every tracked region and clear internal state. Inline `style.height` is intentionally preserved. */
    destroy(): void {
        for (const region of this.regions) {
            this.untag(region);
        }
        this.regions.length = 0;
    }

    private tag(region: HTMLElement): void {
        region.classList.add(CLASS_REGION);
        region.dataset.dragsterId = this.config.instanceId;
    }

    private untag(region: HTMLElement): void {
        region.classList.remove(CLASS_REGION);
        // Only clear our own stamp — another Dragster instance may still own this node.
        if (region.dataset.dragsterId === this.config.instanceId) {
            delete region.dataset.dragsterId;
        }
    }
}

/**
 * Predicate matching the legacy `getElement` boundary check: a Dragster-tagged
 * region that is NOT also marked drag-only. Used by state-machine ancestor
 * walks to know when to stop traversing upward.
 */
export function isRegionBoundary(element: Element, dragOnlyClass: string): boolean {
    return element.classList.contains(CLASS_REGION) && !element.classList.contains(dragOnlyClass);
}
