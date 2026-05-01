import { afterEach, describe, expect, it, vi } from 'vitest';
import Dragster, { type DragsterEventInfo } from './index.js';

const ITEM_CLASS = 'demo-block';
const REGION_CLASS = 'demo-region';
const DRAG_ONLY_CLASS = 'demo-drag-only';

interface Setup {
    dragster: Dragster;
    regionA: HTMLElement;
    regionB: HTMLElement;
    items: HTMLElement[];
}

function mockRect(el: HTMLElement, rect: Partial<DOMRect>): void {
    const merged = {
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        toJSON: () => ({}),
        ...rect,
    } as DOMRect;
    Object.defineProperty(el, 'getBoundingClientRect', {
        configurable: true,
        value: () => merged,
    });
}

function createScene(itemsPerRegion = 2): Setup {
    const regionA = document.createElement('div');
    regionA.classList.add(REGION_CLASS);
    document.body.appendChild(regionA);

    const regionB = document.createElement('div');
    regionB.classList.add(REGION_CLASS);
    document.body.appendChild(regionB);

    const items: HTMLElement[] = [];
    let y = 0;
    for (const region of [regionA, regionB]) {
        for (let i = 0; i < itemsPerRegion; i++) {
            const item = document.createElement('div');
            item.classList.add(ITEM_CLASS);
            item.dataset.index = `${items.length}`;
            region.appendChild(item);
            mockRect(item, { top: y, left: 0, width: 200, height: 50, bottom: y + 50, right: 200 });
            items.push(item);
            y += 60;
        }
    }

    const dragster = new Dragster({
        elementSelector: `.${ITEM_CLASS}`,
        regionSelector: `.${REGION_CLASS}`,
        dragOnlyRegionCssClass: DRAG_ONLY_CLASS,
    });

    return { dragster, regionA, regionB, items };
}

function fireMouse(
    target: HTMLElement,
    type: 'mousedown' | 'mousemove' | 'mouseup',
    options: { clientX?: number; clientY?: number } = {},
): MouseEvent {
    const { clientX = 50, clientY = 60 } = options;
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY });
    target.dispatchEvent(event);
    return event;
}

afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
});

describe('Dragster — construction', () => {
    it('wraps every matching draggable in a dragster-draggable wrapper stamped with its instanceId', () => {
        const { items } = createScene();
        for (const item of items) {
            const parent = item.parentElement!;
            expect(parent.classList.contains('dragster-draggable')).toBe(true);
            expect(parent.dataset.dragsterId).toMatch(/^dragster-\d+-[0-9a-f]+$/);
        }
    });

    it('does not wrap items whose parent is already a wrapper (re-construction is safe)', () => {
        const { dragster } = createScene(1);
        const wrapperCountBefore = document.querySelectorAll('.dragster-draggable').length;
        dragster.update();
        expect(document.querySelectorAll('.dragster-draggable').length).toBe(wrapperCountBefore);
    });

    it('tags every region matching regionSelector with the internal class + instanceId', () => {
        const { regionA, regionB } = createScene();
        for (const region of [regionA, regionB]) {
            expect(region.classList.contains('dragster-drag-region')).toBe(true);
            expect(region.dataset.dragsterId).toBeDefined();
        }
    });

    it('uses unique instanceIds across constructions', () => {
        const region1 = document.createElement('div');
        region1.classList.add('demo-r1');
        document.body.appendChild(region1);
        const region2 = document.createElement('div');
        region2.classList.add('demo-r2');
        document.body.appendChild(region2);

        const a = new Dragster({ regionSelector: '.demo-r1', elementSelector: `.${ITEM_CLASS}` });
        const b = new Dragster({ regionSelector: '.demo-r2', elementSelector: `.${ITEM_CLASS}` });
        expect(region1.dataset.dragsterId).not.toBe(region2.dataset.dragsterId);
        a.destroy();
        b.destroy();
    });

    it('falls back to defaults when called with no arguments', () => {
        // Default selectors don't match anything in our test DOM, but the constructor
        // must still complete without throwing.
        const region = document.createElement('div');
        region.classList.add('dragster-region');
        document.body.appendChild(region);
        const item = document.createElement('div');
        item.classList.add('dragster-block');
        region.appendChild(item);

        const d = new Dragster();
        expect(item.parentElement!.classList.contains('dragster-draggable')).toBe(true);
        d.destroy();
    });
});

describe('Dragster — on/off chaining', () => {
    it('on() returns the same Dragster for chaining', () => {
        const { dragster } = createScene();
        const result = dragster.on('beforeDragStart', () => {});
        expect(result).toBe(dragster);
    });

    it('off() returns the same Dragster for chaining', () => {
        const { dragster } = createScene();
        const listener = () => {};
        dragster.on('beforeDragStart', listener);
        const result = dragster.off('beforeDragStart', listener);
        expect(result).toBe(dragster);
    });
});

describe('Dragster — drag lifecycle (mouse)', () => {
    it('emits beforeDragStart and afterDragStart with drag.node populated when picking up a draggable', () => {
        const { dragster, items } = createScene();
        const before = vi.fn();
        const after = vi.fn();
        dragster.on('beforeDragStart', before);
        dragster.on('afterDragStart', after);

        fireMouse(items[0]!, 'mousedown');

        expect(before).toHaveBeenCalledTimes(1);
        expect(after).toHaveBeenCalledTimes(1);
        const info = after.mock.calls[0]![0] as DragsterEventInfo;
        // drag.node is the wrapper, not the user element.
        expect(info.drag.node).toBe(items[0]!.parentElement);
        expect(info.shadow.node).not.toBeNull();
    });

    it('cancelling beforeDragStart aborts the drag', () => {
        const { dragster, items } = createScene();
        dragster.on('beforeDragStart', () => false);
        const after = vi.fn();
        dragster.on('afterDragStart', after);

        fireMouse(items[0]!, 'mousedown');
        expect(after).not.toHaveBeenCalled();
        expect(document.querySelector('.dragster-temp')).toBeNull();
    });

    it('completes a full pickup → move → drop and reorders the dragged wrapper into the placeholder slot', () => {
        const { dragster, items } = createScene();
        const wrapperA = items[0]!.parentElement!;
        const wrapperC = items[2]!.parentElement!;
        const targetRegion = items[2]!.parentElement!.parentElement!;

        // Pretend cursor lands on wrapperC's bottom half during move; placeholder will be inserted after wrapperC.
        mockRect(wrapperC, { left: 0, top: 200, width: 200, height: 50, bottom: 250 });
        const elementFromPoint = vi.spyOn(document, 'elementFromPoint').mockReturnValue(wrapperC);

        const afterDrop = vi.fn();
        dragster.on('afterDragDrop', afterDrop);

        fireMouse(items[0]!, 'mousedown');
        fireMouse(document.body, 'mousemove', { clientX: 100, clientY: 240 });
        fireMouse(document.body, 'mouseup');

        elementFromPoint.mockRestore();

        expect(afterDrop).toHaveBeenCalledTimes(1);
        const info = afterDrop.mock.calls[0]![0] as DragsterEventInfo;
        expect(info.dropped).toBe(wrapperA);
        // wrapperA should have been moved next to wrapperC inside the target region.
        expect(wrapperA.parentElement).toBe(targetRegion);
        expect(wrapperA.previousElementSibling).toBe(wrapperC);
    });

    it('does not emit afterDragDrop when there is no placeholder at drop time (mousedown then mouseup with no move)', () => {
        const { dragster, items } = createScene();
        const afterDrop = vi.fn();
        const afterEnd = vi.fn();
        dragster.on('afterDragDrop', afterDrop);
        dragster.on('afterDragEnd', afterEnd);

        fireMouse(items[0]!, 'mousedown');
        fireMouse(document.body, 'mouseup');

        expect(afterDrop).not.toHaveBeenCalled();
        // afterDragEnd fires regardless — the drag happened, it just had no drop target.
        expect(afterEnd).toHaveBeenCalledTimes(1);
    });

    it('cleans up shadow + dragging class after a successful drop', () => {
        const { items } = createScene();
        const wrapperC = items[2]!.parentElement!;
        mockRect(wrapperC, { left: 0, top: 200, width: 200, height: 50, bottom: 250 });
        vi.spyOn(document, 'elementFromPoint').mockReturnValue(wrapperC);

        fireMouse(items[0]!, 'mousedown');
        fireMouse(document.body, 'mousemove', { clientX: 100, clientY: 240 });
        fireMouse(document.body, 'mouseup');

        expect(document.querySelector('.dragster-temp')).toBeNull();
        expect(document.querySelector('.dragster-drop-placeholder')).toBeNull();
        expect(document.querySelector('.is-dragging')).toBeNull();
    });

    it('updates eventInfo.placeholder during move so listeners see the live drop slot', () => {
        const { dragster, items } = createScene();
        const wrapperC = items[2]!.parentElement!;
        mockRect(wrapperC, { left: 0, top: 200, width: 200, height: 50, bottom: 250 });
        vi.spyOn(document, 'elementFromPoint').mockReturnValue(wrapperC);

        let lastInfo: DragsterEventInfo | null = null;
        dragster.on('afterDragMove', (info) => {
            lastInfo = info;
        });

        fireMouse(items[0]!, 'mousedown');
        fireMouse(document.body, 'mousemove', { clientX: 100, clientY: 240 });

        expect(lastInfo).not.toBeNull();
        expect(lastInfo!.placeholder.node).not.toBeNull();
        expect(lastInfo!.placeholder.position).toBe('bottom');
        expect(lastInfo!.drop.node).toBe(wrapperC);
    });
});

describe('Dragster — scrollWindowOnDrag', () => {
    it('does not scroll when scrollWindowOnDrag is false (default)', () => {
        const { dragster, items } = createScene();
        const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
        Object.defineProperty(window, 'innerHeight', { configurable: true, get: () => 800 });

        fireMouse(items[0]!, 'mousedown');
        fireMouse(document.body, 'mousemove', { clientX: 100, clientY: 5 });

        expect(scrollBy).not.toHaveBeenCalled();
        dragster.destroy();
    });

    it('scrolls the window when scrollWindowOnDrag is true and cursor is in the edge band', () => {
        const region = document.createElement('div');
        region.classList.add(REGION_CLASS);
        document.body.appendChild(region);
        const item = document.createElement('div');
        item.classList.add(ITEM_CLASS);
        region.appendChild(item);
        mockRect(item, { left: 0, top: 0, width: 100, height: 50 });

        const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
        Object.defineProperty(window, 'innerHeight', { configurable: true, get: () => 800 });

        const d = new Dragster({
            elementSelector: `.${ITEM_CLASS}`,
            regionSelector: `.${REGION_CLASS}`,
            scrollWindowOnDrag: true,
        });
        vi.spyOn(document, 'elementFromPoint').mockReturnValue(null);

        fireMouse(item, 'mousedown');
        fireMouse(document.body, 'mousemove', { clientX: 100, clientY: 10 });

        expect(scrollBy).toHaveBeenCalledWith(0, -10);
        d.destroy();
    });
});

describe('Dragster — update / updateRegions', () => {
    it('update() wraps newly-added items', () => {
        const { dragster, regionA } = createScene();
        const newItem = document.createElement('div');
        newItem.classList.add(ITEM_CLASS);
        regionA.appendChild(newItem);
        expect(newItem.parentElement!.classList.contains('dragster-draggable')).toBe(false);

        dragster.update();

        expect(newItem.parentElement!.classList.contains('dragster-draggable')).toBe(true);
    });

    it('updateRegions() picks up newly-added regions and arms them for pointer-down', () => {
        const { dragster } = createScene();
        const newRegion = document.createElement('div');
        newRegion.classList.add(REGION_CLASS);
        document.body.appendChild(newRegion);
        const newItem = document.createElement('div');
        newItem.classList.add(ITEM_CLASS);
        newRegion.appendChild(newItem);

        dragster.update();
        dragster.updateRegions();

        expect(newRegion.classList.contains('dragster-drag-region')).toBe(true);

        const before = vi.fn();
        dragster.on('beforeDragStart', before);
        fireMouse(newItem, 'mousedown');
        expect(before).toHaveBeenCalledTimes(1);
    });
});

describe('Dragster — destroy', () => {
    it('untags regions and removes pointer-down listeners', () => {
        const { dragster, regionA, items } = createScene();
        dragster.destroy();

        expect(regionA.classList.contains('dragster-drag-region')).toBe(false);
        expect(regionA.dataset.dragsterId).toBeUndefined();

        const before = vi.fn();
        // Register on a fresh emitter via .on() — but destroy clears listeners.
        // Verify that no event reaches a listener attached after destroy either.
        dragster.on('beforeDragStart', before);
        fireMouse(items[0]!, 'mousedown');
        expect(before).not.toHaveBeenCalled();
    });

    it('is idempotent (calling twice does not throw)', () => {
        const { dragster } = createScene();
        dragster.destroy();
        expect(() => dragster.destroy()).not.toThrow();
    });

    it('further update() / updateRegions() calls after destroy are no-ops', () => {
        const { dragster, regionA } = createScene();
        dragster.destroy();
        const newItem = document.createElement('div');
        newItem.classList.add(ITEM_CLASS);
        regionA.appendChild(newItem);

        dragster.update();
        dragster.updateRegions();

        expect(newItem.parentElement!.classList.contains('dragster-draggable')).toBe(false);
    });
});

describe('Dragster — dragHandleCssClass', () => {
    it('starts a drag only when mousedown lands on an element with the handle class', () => {
        const region = document.createElement('div');
        region.classList.add(REGION_CLASS);
        document.body.appendChild(region);
        const item = document.createElement('div');
        item.classList.add(ITEM_CLASS);
        region.appendChild(item);
        const handle = document.createElement('span');
        handle.classList.add('handle');
        item.appendChild(handle);
        mockRect(item, { left: 0, top: 0, width: 100, height: 50 });

        const d = new Dragster({
            elementSelector: `.${ITEM_CLASS}`,
            regionSelector: `.${REGION_CLASS}`,
            dragHandleCssClass: 'handle',
        });

        const before = vi.fn();
        d.on('beforeDragStart', before);

        // Mousedown on the user item without the handle class is ignored.
        fireMouse(item, 'mousedown');
        expect(before).not.toHaveBeenCalled();

        // Mousedown on the handle starts the drag.
        fireMouse(handle, 'mousedown');
        expect(before).toHaveBeenCalledTimes(1);

        d.destroy();
    });
});
