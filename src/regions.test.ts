import { afterEach, describe, expect, it } from 'vitest';
import { RegionTracker, isRegionBoundary, type RegionTrackerConfig } from './regions.js';

const baseConfig: Omit<RegionTrackerConfig, 'instanceId'> = {
    regionSelector: '.user-region',
    elementSelector: '.user-item',
    minimumRegionHeight: 60,
    autoUpdateHeight: true,
};

afterEach(() => {
    document.body.innerHTML = '';
});

interface Setup {
    regions: HTMLElement[];
    items: HTMLElement[];
}

function setupRegions(regionCount: number, itemsPerRegion: number, heightPerItem = 50): Setup {
    const regions: HTMLElement[] = [];
    const items: HTMLElement[] = [];
    for (let r = 0; r < regionCount; r++) {
        const region = document.createElement('div');
        region.classList.add('user-region');
        for (let i = 0; i < itemsPerRegion; i++) {
            const item = document.createElement('div');
            item.classList.add('user-item');
            Object.defineProperty(item, 'offsetHeight', {
                configurable: true,
                get: () => heightPerItem,
            });
            region.appendChild(item);
            items.push(item);
        }
        document.body.appendChild(region);
        regions.push(region);
    }
    return { regions, items };
}

describe('RegionTracker — discovery & tagging', () => {
    it('finds regions matching the selector and tags them with the internal class + instanceId', () => {
        const { regions } = setupRegions(2, 0);
        const tracker = new RegionTracker({ ...baseConfig, instanceId: 'inst-1' });

        expect(tracker.getRegions()).toHaveLength(2);
        for (const r of regions) {
            expect(r.classList.contains('dragster-drag-region')).toBe(true);
            expect(r.dataset.dragsterId).toBe('inst-1');
        }
    });

    it('leaves elements that do not match the selector untouched', () => {
        const matched = document.createElement('div');
        matched.classList.add('user-region');
        const unrelated = document.createElement('div');
        unrelated.classList.add('other-thing');
        document.body.appendChild(matched);
        document.body.appendChild(unrelated);

        new RegionTracker({ ...baseConfig, instanceId: 'inst-1' });

        expect(matched.classList.contains('dragster-drag-region')).toBe(true);
        expect(unrelated.classList.contains('dragster-drag-region')).toBe(false);
        expect(unrelated.dataset.dragsterId).toBeUndefined();
    });

    it('two trackers with distinct instanceIds tag the same region with the constructing one', () => {
        setupRegions(1, 0);
        new RegionTracker({ ...baseConfig, instanceId: 'first' });
        new RegionTracker({ ...baseConfig, instanceId: 'second' });

        const region = document.querySelector<HTMLElement>('.user-region');
        expect(region?.dataset.dragsterId).toBe('second');
    });
});

describe('RegionTracker — refresh', () => {
    it('picks up new regions added to the DOM after construction', () => {
        setupRegions(1, 0);
        const tracker = new RegionTracker({ ...baseConfig, instanceId: 'inst-1' });
        expect(tracker.getRegions()).toHaveLength(1);

        const added = document.createElement('div');
        added.classList.add('user-region');
        document.body.appendChild(added);

        tracker.refresh();

        expect(tracker.getRegions()).toHaveLength(2);
        expect(added.classList.contains('dragster-drag-region')).toBe(true);
        expect(added.dataset.dragsterId).toBe('inst-1');
    });

    it('untags regions that no longer match the selector', () => {
        const { regions } = setupRegions(2, 0);
        const tracker = new RegionTracker({ ...baseConfig, instanceId: 'inst-1' });

        const dropped = regions[0]!;
        dropped.classList.remove('user-region');

        tracker.refresh();

        expect(tracker.getRegions()).toHaveLength(1);
        expect(dropped.classList.contains('dragster-drag-region')).toBe(false);
        expect(dropped.dataset.dragsterId).toBeUndefined();
    });

    it('keeps existing tracked regions tagged across refresh calls', () => {
        const { regions } = setupRegions(1, 0);
        const tracker = new RegionTracker({ ...baseConfig, instanceId: 'inst-1' });

        tracker.refresh();
        tracker.refresh();

        expect(regions[0]!.classList.contains('dragster-drag-region')).toBe(true);
        expect(regions[0]!.dataset.dragsterId).toBe('inst-1');
    });
});

describe('RegionTracker — updateHeights', () => {
    it('sets height to minimumRegionHeight + sum of element heights', () => {
        setupRegions(1, 3, 50);
        const tracker = new RegionTracker({ ...baseConfig, instanceId: 'inst-1' });

        tracker.updateHeights();

        const [region] = tracker.getRegions();
        // 60 (minimum) + 3 * (50 + 0 + 0) = 210
        expect(region!.style.height).toBe('210px');
    });

    it('skips regions with no matching child elements (preserves existing height)', () => {
        const { regions } = setupRegions(2, 0);
        regions[0]!.style.height = '99px'; // pre-existing height
        const tracker = new RegionTracker({ ...baseConfig, instanceId: 'inst-1' });

        tracker.updateHeights();

        expect(regions[0]!.style.height).toBe('99px');
        expect(regions[1]!.style.height).toBe('');
    });

    it('is a no-op when autoUpdateHeight is false', () => {
        const { regions } = setupRegions(1, 3);
        const tracker = new RegionTracker({
            ...baseConfig,
            autoUpdateHeight: false,
            instanceId: 'inst-1',
        });

        tracker.updateHeights();

        expect(regions[0]!.style.height).toBe('');
    });

    it('handles each region independently when sizes differ', () => {
        // Region A: 2 items × 30px, Region B: 4 items × 80px
        const regionA = document.createElement('div');
        regionA.classList.add('user-region');
        for (let i = 0; i < 2; i++) {
            const el = document.createElement('div');
            el.classList.add('user-item');
            Object.defineProperty(el, 'offsetHeight', { configurable: true, get: () => 30 });
            regionA.appendChild(el);
        }
        const regionB = document.createElement('div');
        regionB.classList.add('user-region');
        for (let i = 0; i < 4; i++) {
            const el = document.createElement('div');
            el.classList.add('user-item');
            Object.defineProperty(el, 'offsetHeight', { configurable: true, get: () => 80 });
            regionB.appendChild(el);
        }
        document.body.appendChild(regionA);
        document.body.appendChild(regionB);

        const tracker = new RegionTracker({ ...baseConfig, instanceId: 'inst-1' });
        tracker.updateHeights();

        expect(regionA.style.height).toBe(`${60 + 2 * 30}px`); // 120px
        expect(regionB.style.height).toBe(`${60 + 4 * 80}px`); // 380px
    });
});

describe('RegionTracker — layout-thrash batching', () => {
    it('reads every element height before writing any region height', () => {
        const operations: Array<'read' | 'write'> = [];
        const { regions, items } = setupRegions(3, 2);

        // Re-define each item's offsetHeight to record reads.
        for (const item of items) {
            Object.defineProperty(item, 'offsetHeight', {
                configurable: true,
                get: () => {
                    operations.push('read');
                    return 50;
                },
            });
        }

        // Intercept each region's style.height setter to record writes.
        for (const region of regions) {
            let internal = '';
            Object.defineProperty(region.style, 'height', {
                configurable: true,
                get: () => internal,
                set: (value: string) => {
                    operations.push('write');
                    internal = value;
                },
            });
        }

        const tracker = new RegionTracker({ ...baseConfig, instanceId: 'inst-1' });
        tracker.updateHeights();

        // 3 regions × 2 items = 6 reads, 3 writes.
        const reads = operations.filter((o) => o === 'read');
        const writes = operations.filter((o) => o === 'write');
        expect(reads).toHaveLength(6);
        expect(writes).toHaveLength(3);

        // The contract: no `read` may follow any `write` within one call.
        const lastReadIdx = operations.lastIndexOf('read');
        const firstWriteIdx = operations.indexOf('write');
        expect(lastReadIdx).toBeLessThan(firstWriteIdx);
    });
});

describe('RegionTracker — destroy', () => {
    it('untags every tracked region and clears internal state', () => {
        const { regions } = setupRegions(2, 0);
        const tracker = new RegionTracker({ ...baseConfig, instanceId: 'inst-1' });

        tracker.destroy();

        expect(tracker.getRegions()).toHaveLength(0);
        for (const r of regions) {
            expect(r.classList.contains('dragster-drag-region')).toBe(false);
            expect(r.dataset.dragsterId).toBeUndefined();
        }
    });

    it('does not strip a dragsterId stamp owned by a different instance', () => {
        const { regions } = setupRegions(1, 0);
        const tracker = new RegionTracker({ ...baseConfig, instanceId: 'inst-1' });
        // Simulate another instance taking over the same node.
        regions[0]!.dataset.dragsterId = 'other-instance';

        tracker.destroy();

        expect(regions[0]!.dataset.dragsterId).toBe('other-instance');
    });

    it('preserves any inline style.height set during the lifetime', () => {
        setupRegions(1, 3);
        const tracker = new RegionTracker({ ...baseConfig, instanceId: 'inst-1' });
        tracker.updateHeights();
        const [region] = tracker.getRegions();
        const heightBeforeDestroy = region!.style.height;

        tracker.destroy();

        expect(region!.style.height).toBe(heightBeforeDestroy);
    });
});

describe('isRegionBoundary', () => {
    it('returns true for a tagged region without the drag-only class', () => {
        const el = document.createElement('div');
        el.classList.add('dragster-drag-region');
        expect(isRegionBoundary(el, 'drag-only')).toBe(true);
    });

    it('returns false for a tagged region that is also drag-only', () => {
        const el = document.createElement('div');
        el.classList.add('dragster-drag-region', 'drag-only');
        expect(isRegionBoundary(el, 'drag-only')).toBe(false);
    });

    it('returns false for elements that are not regions at all', () => {
        const el = document.createElement('div');
        expect(isRegionBoundary(el, 'drag-only')).toBe(false);
    });
});
