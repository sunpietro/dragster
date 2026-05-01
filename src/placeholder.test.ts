import { afterEach, describe, expect, it } from 'vitest';
import { CLASS_PLACEHOLDER, PlaceholderManager, type PlaceholderManagerConfig } from './placeholder.js';

const ITEM_CLASS = 'user-item';
const REGION_CLASS = 'user-region';
const DRAG_ONLY_CLASS = 'drag-only';

interface Setup {
    region: HTMLElement;
    items: HTMLElement[];
    manager: PlaceholderManager;
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

function createRegion(extraClasses: string[] = []): HTMLElement {
    const region = document.createElement('div');
    region.classList.add(REGION_CLASS, ...extraClasses);
    document.body.appendChild(region);
    return region;
}

function createItem(parent: HTMLElement, rect: Partial<DOMRect> = {}): HTMLElement {
    const item = document.createElement('div');
    item.classList.add(ITEM_CLASS);
    parent.appendChild(item);
    mockRect(item, { left: 0, top: 0, width: 100, height: 50, right: 100, bottom: 50, ...rect });
    return item;
}

function makeManager(region: HTMLElement, overrides: Partial<PlaceholderManagerConfig> = {}): PlaceholderManager {
    return new PlaceholderManager({
        instanceId: 'inst-1',
        isDraggable: (el) => el.classList.contains(ITEM_CLASS),
        isOwnedRegion: (el) => el.classList.contains(REGION_CLASS),
        isDragOnlyRegion: (el) => el.classList.contains(DRAG_ONLY_CLASS),
        ...overrides,
    });
}

function setup(itemCount = 2): Setup {
    const region = createRegion();
    const items: HTMLElement[] = [];
    for (let i = 0; i < itemCount; i++) {
        items.push(createItem(region, { top: i * 60, bottom: i * 60 + 50, height: 50 }));
    }
    return { region, items, manager: makeManager(region) };
}

afterEach(() => {
    document.body.innerHTML = '';
});

describe('PlaceholderManager — initial state', () => {
    it('starts with no active placeholder', () => {
        const { manager } = setup();
        expect(manager.getCurrent()).toEqual({ node: null, position: null, dropTarget: null });
    });
});

describe('PlaceholderManager — update decision tree', () => {
    it('clears placeholder when pointerTarget is null', () => {
        const { manager, items } = setup();
        manager.update({ pointerTarget: items[1]!, clientY: 65, draggedElement: items[0]! });
        expect(manager.getCurrent().node).not.toBeNull();

        const result = manager.update({ pointerTarget: null, clientY: 0, draggedElement: items[0]! });
        expect(result.node).toBeNull();
        expect(document.querySelectorAll(`.${CLASS_PLACEHOLDER}`)).toHaveLength(0);
    });

    it('does not place a placeholder when cursor is over the dragged element itself', () => {
        const { manager, items } = setup();
        const result = manager.update({ pointerTarget: items[0]!, clientY: 25, draggedElement: items[0]! });
        expect(result.node).toBeNull();
        expect(result.position).toBeNull();
        expect(result.dropTarget).toBeNull();
    });

    it('places a TOP placeholder before another draggable when cursor is in its top half', () => {
        const { manager, items, region } = setup();
        const target = items[1]!;
        mockRect(target, { left: 0, top: 100, width: 100, height: 50, bottom: 150 });
        const result = manager.update({ pointerTarget: target, clientY: 110, draggedElement: items[0]! });
        expect(result.position).toBe('top');
        expect(result.dropTarget).toBe(target);
        expect(result.node).not.toBeNull();
        // Placeholder should be the previous sibling of target.
        expect(target.previousElementSibling).toBe(result.node);
        expect(result.node!.parentElement).toBe(region);
    });

    it('places a BOTTOM placeholder after another draggable when cursor is in its bottom half', () => {
        const { manager, items, region } = setup();
        const target = items[1]!;
        mockRect(target, { left: 0, top: 100, width: 100, height: 50, bottom: 150 });
        const result = manager.update({ pointerTarget: target, clientY: 140, draggedElement: items[0]! });
        expect(result.position).toBe('bottom');
        expect(result.dropTarget).toBe(target);
        expect(target.nextElementSibling).toBe(result.node);
        expect(result.node!.parentElement).toBe(region);
    });

    it('treats the exact midpoint as bottom (no dead zone)', () => {
        const { manager, items } = setup();
        const target = items[1]!;
        mockRect(target, { left: 0, top: 100, width: 100, height: 50, bottom: 150 });
        const result = manager.update({ pointerTarget: target, clientY: 125, draggedElement: items[0]! });
        expect(result.position).toBe('bottom');
    });

    it('does not place a placeholder when target is inside a drag-only region', () => {
        const dragOnlyRegion = createRegion([DRAG_ONLY_CLASS]);
        const item = createItem(dragOnlyRegion);
        const otherRegion = createRegion();
        const dragged = createItem(otherRegion);

        const manager = makeManager(otherRegion);
        const result = manager.update({ pointerTarget: item, clientY: 25, draggedElement: dragged });
        expect(result.node).toBeNull();
    });

    it('places a placeholder in an empty region when cursor is on the region itself', () => {
        const region = createRegion();
        const otherRegion = createRegion();
        const dragged = createItem(otherRegion);
        const manager = makeManager(region);

        const result = manager.update({ pointerTarget: region, clientY: 25, draggedElement: dragged });
        expect(result.position).toBe('bottom');
        expect(result.dropTarget).toBe(region);
        expect(result.node!.parentElement).toBe(region);
        expect(region.lastElementChild).toBe(result.node);
    });

    it('appends the placeholder when cursor is on a populated region (not on an item)', () => {
        const { manager, items, region } = setup();
        const result = manager.update({ pointerTarget: region, clientY: 200, draggedElement: items[0]! });
        expect(result.position).toBe('bottom');
        expect(result.dropTarget).toBe(region);
        expect(region.lastElementChild).toBe(result.node);
    });

    it('does not place a placeholder when cursor is on a drag-only region itself', () => {
        const dragOnlyRegion = createRegion([DRAG_ONLY_CLASS]);
        const otherRegion = createRegion();
        const dragged = createItem(otherRegion);
        const manager = makeManager(otherRegion);

        const result = manager.update({ pointerTarget: dragOnlyRegion, clientY: 25, draggedElement: dragged });
        expect(result.node).toBeNull();
    });

    it('does not place a placeholder when cursor is on an unrelated element (not region, not draggable)', () => {
        const region = createRegion();
        const dragged = createItem(region);
        const unrelated = document.createElement('div');
        document.body.appendChild(unrelated);
        const manager = makeManager(region);

        const result = manager.update({ pointerTarget: unrelated, clientY: 25, draggedElement: dragged });
        expect(result.node).toBeNull();
    });

    it('walks up from a deeply-nested target to find the wrapping draggable', () => {
        const { manager, items } = setup();
        const target = items[1]!;
        mockRect(target, { left: 0, top: 100, width: 100, height: 50, bottom: 150 });
        const inner = document.createElement('span');
        target.appendChild(inner);

        const result = manager.update({ pointerTarget: inner, clientY: 110, draggedElement: items[0]! });
        expect(result.dropTarget).toBe(target);
        expect(result.position).toBe('top');
    });
});

describe('PlaceholderManager — idempotency', () => {
    it('does not re-insert the placeholder when called repeatedly with the same target+position', () => {
        const { manager, items } = setup();
        const target = items[1]!;
        mockRect(target, { left: 0, top: 100, width: 100, height: 50, bottom: 150 });

        const first = manager.update({ pointerTarget: target, clientY: 110, draggedElement: items[0]! });
        const second = manager.update({ pointerTarget: target, clientY: 110, draggedElement: items[0]! });
        const third = manager.update({ pointerTarget: target, clientY: 115, draggedElement: items[0]! });

        expect(second.node).toBe(first.node);
        expect(third.node).toBe(first.node);
        expect(document.querySelectorAll(`.${CLASS_PLACEHOLDER}`)).toHaveLength(1);
    });

    it('moves the placeholder when position flips from top to bottom on the same target', () => {
        const { manager, items } = setup();
        const target = items[1]!;
        mockRect(target, { left: 0, top: 100, width: 100, height: 50, bottom: 150 });

        const top = manager.update({ pointerTarget: target, clientY: 110, draggedElement: items[0]! });
        const bottom = manager.update({ pointerTarget: target, clientY: 140, draggedElement: items[0]! });

        expect(top.position).toBe('top');
        expect(bottom.position).toBe('bottom');
        expect(bottom.node).not.toBe(top.node);
        expect(target.nextElementSibling).toBe(bottom.node);
        expect(document.querySelectorAll(`.${CLASS_PLACEHOLDER}`)).toHaveLength(1);
    });

    it('moves the placeholder when target changes', () => {
        const { manager, items } = setup();
        const target1 = items[0]!;
        const target2 = items[1]!;
        mockRect(target1, { left: 0, top: 0, width: 100, height: 50, bottom: 50 });
        mockRect(target2, { left: 0, top: 60, width: 100, height: 50, bottom: 110 });

        // dragged element is a fresh element so target1 is not the dragged
        const dragged = createItem(createRegion());
        const first = manager.update({ pointerTarget: target1, clientY: 25, draggedElement: dragged });
        const second = manager.update({ pointerTarget: target2, clientY: 70, draggedElement: dragged });

        expect(first.dropTarget).toBe(target1);
        expect(second.dropTarget).toBe(target2);
        expect(document.querySelectorAll(`.${CLASS_PLACEHOLDER}`)).toHaveLength(1);
    });

    it('does not re-insert when called repeatedly with the same region target', () => {
        const region = createRegion();
        const otherRegion = createRegion();
        const dragged = createItem(otherRegion);
        const manager = makeManager(region);

        const first = manager.update({ pointerTarget: region, clientY: 25, draggedElement: dragged });
        const second = manager.update({ pointerTarget: region, clientY: 200, draggedElement: dragged });

        expect(second.node).toBe(first.node);
        expect(document.querySelectorAll(`.${CLASS_PLACEHOLDER}`)).toHaveLength(1);
    });

    it('preserves the placeholder when cursor lands on the placeholder itself', () => {
        const { manager, items } = setup();
        const target = items[1]!;
        mockRect(target, { left: 0, top: 100, width: 100, height: 50, bottom: 150 });

        const first = manager.update({ pointerTarget: target, clientY: 110, draggedElement: items[0]! });
        const onPlaceholder = manager.update({
            pointerTarget: first.node,
            clientY: 95,
            draggedElement: items[0]!,
        });

        expect(onPlaceholder.node).toBe(first.node);
        expect(document.querySelectorAll(`.${CLASS_PLACEHOLDER}`)).toHaveLength(1);
    });
});

describe('PlaceholderManager — placeholder element', () => {
    it('stamps the placeholder with the manager instanceId', () => {
        const { manager, items } = setup();
        const target = items[1]!;
        mockRect(target, { left: 0, top: 100, width: 100, height: 50, bottom: 150 });

        const result = manager.update({ pointerTarget: target, clientY: 110, draggedElement: items[0]! });
        expect(result.node!.dataset.dragsterId).toBe('inst-1');
        expect(result.node!.classList.contains(CLASS_PLACEHOLDER)).toBe(true);
    });
});

describe('PlaceholderManager — clear', () => {
    it('removes the active placeholder from the DOM', () => {
        const { manager, items } = setup();
        const target = items[1]!;
        mockRect(target, { left: 0, top: 100, width: 100, height: 50, bottom: 150 });
        manager.update({ pointerTarget: target, clientY: 110, draggedElement: items[0]! });
        expect(document.querySelectorAll(`.${CLASS_PLACEHOLDER}`)).toHaveLength(1);

        manager.clear();

        expect(document.querySelectorAll(`.${CLASS_PLACEHOLDER}`)).toHaveLength(0);
        expect(manager.getCurrent()).toEqual({ node: null, position: null, dropTarget: null });
    });

    it('is a no-op when there is no active placeholder', () => {
        const { manager } = setup();
        expect(() => manager.clear()).not.toThrow();
        expect(manager.getCurrent().node).toBeNull();
    });

    it('sweeps stray placeholders that this instance owns', () => {
        const { manager, region } = setup();
        // Manually inject a stray placeholder owned by this instance.
        const stray = document.createElement('div');
        stray.classList.add(CLASS_PLACEHOLDER);
        stray.dataset.dragsterId = 'inst-1';
        region.appendChild(stray);

        manager.clear();
        expect(document.querySelectorAll(`.${CLASS_PLACEHOLDER}`)).toHaveLength(0);
    });

    it('does not remove placeholders belonging to a different instance', () => {
        const { manager, region } = setup();
        const otherInstance = document.createElement('div');
        otherInstance.classList.add(CLASS_PLACEHOLDER);
        otherInstance.dataset.dragsterId = 'inst-2';
        region.appendChild(otherInstance);

        manager.clear();
        expect(document.querySelectorAll(`.${CLASS_PLACEHOLDER}`)).toHaveLength(1);
        expect(otherInstance.parentElement).toBe(region);
    });
});

describe('PlaceholderManager — destroy', () => {
    it('removes any active placeholder', () => {
        const { manager, items } = setup();
        const target = items[1]!;
        mockRect(target, { left: 0, top: 100, width: 100, height: 50, bottom: 150 });
        manager.update({ pointerTarget: target, clientY: 110, draggedElement: items[0]! });

        manager.destroy();

        expect(document.querySelectorAll(`.${CLASS_PLACEHOLDER}`)).toHaveLength(0);
        expect(manager.getCurrent().node).toBeNull();
    });

    it('is safe to call when idle', () => {
        const { manager } = setup();
        expect(() => manager.destroy()).not.toThrow();
    });
});

describe('PlaceholderManager — getCurrent', () => {
    it('returns a fresh snapshot (mutating it does not affect the manager)', () => {
        const { manager, items } = setup();
        const target = items[1]!;
        mockRect(target, { left: 0, top: 100, width: 100, height: 50, bottom: 150 });
        manager.update({ pointerTarget: target, clientY: 110, draggedElement: items[0]! });

        const snapshot = manager.getCurrent();
        snapshot.node = null;
        snapshot.position = null;

        expect(manager.getCurrent().node).not.toBeNull();
        expect(manager.getCurrent().position).toBe('top');
    });
});
