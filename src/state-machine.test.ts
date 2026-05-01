import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter, type DragsterEventInfo, type DragsterEventMap } from './events.js';
import { CLASS_DRAGGING, CLASS_HIDDEN, CLASS_SHADOW, StateMachine, type StateMachineConfig } from './state-machine.js';

const REGION_BOUNDARY_CLASS = 'dragster-drag-region';
const DRAG_ONLY_CLASS = 'drag-only';
const ITEM_CLASS = 'user-item';

interface Setup {
    machine: StateMachine;
    region: HTMLElement;
    draggable: HTMLElement;
    emitter: EventEmitter<DragsterEventMap>;
    config: StateMachineConfig;
}

function mockRect(el: HTMLElement, rect: Partial<DOMRect>): void {
    const merged: DOMRect = {
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
    region.classList.add('user-region', REGION_BOUNDARY_CLASS, ...extraClasses);
    document.body.appendChild(region);
    return region;
}

function createDraggable(parent: HTMLElement, rect: Partial<DOMRect> = {}): HTMLElement {
    const item = document.createElement('div');
    item.classList.add(ITEM_CLASS);
    parent.appendChild(item);
    mockRect(item, { left: 10, top: 20, width: 100, height: 50, right: 110, bottom: 70, ...rect });
    return item;
}

function setup(overrides: Partial<StateMachineConfig> = {}): Setup {
    const region = createRegion();
    const draggable = createDraggable(region);
    const emitter = new EventEmitter<DragsterEventMap>();
    const config: StateMachineConfig = {
        regions: [region],
        isDraggable: (el) => el.classList.contains(ITEM_CLASS),
        dragHandleCssClass: false,
        dragOnlyRegionCssClass: DRAG_ONLY_CLASS,
        shadowElementUnderMouse: false,
        instanceId: 'inst-1',
        emitter,
        ...overrides,
    };
    const machine = new StateMachine(config);
    return { machine, region, draggable, emitter, config };
}

function fireMouse(
    target: HTMLElement,
    type: 'mousedown' | 'mousemove' | 'mouseup',
    options: { clientX?: number; clientY?: number; button?: number } = {},
): MouseEvent {
    const { clientX = 50, clientY = 60, button = 0 } = options;
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY, button });
    target.dispatchEvent(event);
    return event;
}

/**
 * happy-dom does not ship a `TouchEvent` constructor. We synthesise one by
 * dispatching a plain Event whose `changedTouches` property satisfies the
 * `'changedTouches' in event` test in {@link isTouchEvent}.
 */
function fireTouch(
    target: HTMLElement,
    type: 'touchstart' | 'touchmove' | 'touchend',
    options: { clientX?: number; clientY?: number } = {},
): Event {
    const { clientX = 50, clientY = 60 } = options;
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'changedTouches', {
        configurable: true,
        get: () => [{ clientX, clientY }],
    });
    target.dispatchEvent(event);
    return event;
}

afterEach(() => {
    document.body.innerHTML = '';
});

describe('StateMachine — pickup', () => {
    it('starts idle', () => {
        const { machine } = setup();
        expect(machine.getState()).toBe('idle');
        expect(machine.getDraggedElement()).toBeNull();
        expect(machine.getShadowElement()).toBeNull();
    });

    it('transitions to dragging on mousedown over a draggable', () => {
        const { machine, draggable } = setup();
        fireMouse(draggable, 'mousedown');
        expect(machine.getState()).toBe('dragging');
        expect(machine.getDraggedElement()).toBe(draggable);
    });

    it('walks up from a nested target to find the draggable', () => {
        const { machine, draggable } = setup();
        const inner = document.createElement('span');
        draggable.appendChild(inner);
        fireMouse(inner, 'mousedown');
        expect(machine.getState()).toBe('dragging');
        expect(machine.getDraggedElement()).toBe(draggable);
    });

    it('stays idle when mousedown lands on a region with no draggable ancestor', () => {
        const { machine, region, emitter } = setup();
        const orphan = document.createElement('div');
        region.appendChild(orphan);
        const before = vi.fn();
        emitter.on('beforeDragStart', before);
        fireMouse(orphan, 'mousedown');
        expect(machine.getState()).toBe('idle');
        expect(before).not.toHaveBeenCalled();
    });

    it('ignores right-click without emitting any event', () => {
        const { machine, draggable, emitter } = setup();
        const before = vi.fn();
        emitter.on('beforeDragStart', before);
        fireMouse(draggable, 'mousedown', { button: 2 });
        expect(machine.getState()).toBe('idle');
        expect(before).not.toHaveBeenCalled();
    });

    it('respects beforeDragStart cancellation', () => {
        const { machine, draggable, emitter } = setup();
        const after = vi.fn();
        emitter.on('beforeDragStart', () => false);
        emitter.on('afterDragStart', after);
        fireMouse(draggable, 'mousedown');
        expect(machine.getState()).toBe('idle');
        expect(after).not.toHaveBeenCalled();
        expect(document.querySelector(`.${CLASS_SHADOW}`)).toBeNull();
        expect(draggable.classList.contains(CLASS_DRAGGING)).toBe(false);
    });

    it('with dragHandleCssClass set, ignores mousedown on a non-handle target', () => {
        const { machine, draggable } = setup({ dragHandleCssClass: 'handle' });
        fireMouse(draggable, 'mousedown');
        expect(machine.getState()).toBe('idle');
    });

    it('with dragHandleCssClass set, accepts mousedown on a handle inside the draggable', () => {
        const { machine, draggable } = setup({ dragHandleCssClass: 'handle' });
        const handle = document.createElement('span');
        handle.classList.add('handle');
        draggable.appendChild(handle);
        fireMouse(handle, 'mousedown');
        expect(machine.getState()).toBe('dragging');
    });

    it('ignores subsequent mousedowns while already dragging', () => {
        const { machine, region, draggable, emitter } = setup();
        const second = createDraggable(region);
        fireMouse(draggable, 'mousedown');
        const before = vi.fn();
        emitter.on('beforeDragStart', before);
        fireMouse(second, 'mousedown');
        expect(machine.getDraggedElement()).toBe(draggable);
        expect(before).not.toHaveBeenCalled();
    });

    it('does not pick up a draggable that lives in a different region (boundary stop)', () => {
        const region = createRegion();
        const draggable = createDraggable(region);
        const otherRegion = createRegion();
        // Nest otherRegion inside draggable so an ancestor walk from a deep target
        // would otherwise pass through it. We click inside it; the walk must stop
        // at the inner region boundary and never reach `draggable`.
        draggable.appendChild(otherRegion);
        const inner = document.createElement('div');
        otherRegion.appendChild(inner);
        const emitter = new EventEmitter<DragsterEventMap>();
        const machine = new StateMachine({
            regions: [region, otherRegion],
            isDraggable: (el) => el.classList.contains(ITEM_CLASS),
            dragHandleCssClass: false,
            dragOnlyRegionCssClass: DRAG_ONLY_CLASS,
            shadowElementUnderMouse: false,
            instanceId: 'inst-1',
            emitter,
        });
        fireMouse(inner, 'mousedown');
        expect(machine.getState()).toBe('idle');
    });

    it('preventDefault is called when a drag starts', () => {
        const { draggable } = setup();
        const event = fireMouse(draggable, 'mousedown');
        expect(event.defaultPrevented).toBe(true);
    });

    it('preventDefault is NOT called when there is no draggable to grab', () => {
        const { region } = setup();
        const orphan = document.createElement('div');
        region.appendChild(orphan);
        const event = fireMouse(orphan, 'mousedown');
        expect(event.defaultPrevented).toBe(false);
    });

    it('adds the dragging class to the draggable on pickup', () => {
        const { draggable } = setup();
        fireMouse(draggable, 'mousedown');
        expect(draggable.classList.contains(CLASS_DRAGGING)).toBe(true);
    });
});

describe('StateMachine — shadow element', () => {
    it('creates a shadow with the dragged element dimensions and instanceId stamp', () => {
        const { machine, draggable } = setup();
        mockRect(draggable, { left: 0, top: 0, width: 120, height: 40 });
        fireMouse(draggable, 'mousedown');
        const shadow = machine.getShadowElement()!;
        expect(shadow).toBeTruthy();
        expect(shadow.classList.contains(CLASS_SHADOW)).toBe(true);
        expect(shadow.classList.contains(CLASS_HIDDEN)).toBe(true);
        expect(shadow.style.width).toBe('120px');
        expect(shadow.style.height).toBe('40px');
        expect(shadow.style.position).toBe('fixed');
        expect(shadow.dataset.dragsterId).toBe('inst-1');
        expect(document.body.contains(shadow)).toBe(true);
    });

    it("clones the dragged element's innerHTML onto the shadow", () => {
        const { machine, draggable } = setup();
        draggable.innerHTML = '<span class="content">hello</span>';
        fireMouse(draggable, 'mousedown');
        expect(machine.getShadowElement()!.innerHTML).toBe('<span class="content">hello</span>');
    });

    it('populates eventInfo.drag.node and eventInfo.shadow.node before afterDragStart', () => {
        const { draggable, emitter } = setup();
        let captured: DragsterEventInfo | null = null;
        emitter.on('afterDragStart', (info) => {
            captured = info;
        });
        fireMouse(draggable, 'mousedown');
        expect(captured).not.toBeNull();
        expect(captured!.drag.node).toBe(draggable);
        expect(captured!.shadow.node).not.toBeNull();
    });
});

describe('StateMachine — move', () => {
    it('updates shadow position to default (centered horizontally, top under cursor)', () => {
        const { machine, draggable } = setup();
        mockRect(draggable, { left: 10, top: 20, width: 100, height: 50 });
        fireMouse(draggable, 'mousedown', { clientX: 50, clientY: 60 });
        fireMouse(document.body, 'mousemove', { clientX: 200, clientY: 300 });
        const shadow = machine.getShadowElement()!;
        // Default mode: top = clientY, left = clientX - width/2
        expect(shadow.style.top).toBe('300px');
        expect(shadow.style.left).toBe('150px');
    });

    it('with shadowElementUnderMouse, preserves the original cursor-relative offset', () => {
        const { machine, draggable } = setup({ shadowElementUnderMouse: true });
        mockRect(draggable, { left: 10, top: 20, width: 100, height: 50 });
        fireMouse(draggable, 'mousedown', { clientX: 50, clientY: 60 });
        // offset = rect.left - clientX = 10 - 50 = -40; rect.top - clientY = 20 - 60 = -40
        fireMouse(document.body, 'mousemove', { clientX: 200, clientY: 300 });
        const shadow = machine.getShadowElement()!;
        expect(shadow.style.left).toBe('160px'); // 200 + (-40)
        expect(shadow.style.top).toBe('260px'); // 300 + (-40)
    });

    it('reveals the shadow (removes hidden class) on first move', () => {
        const { machine, draggable } = setup();
        fireMouse(draggable, 'mousedown');
        expect(machine.getShadowElement()!.classList.contains(CLASS_HIDDEN)).toBe(true);
        fireMouse(document.body, 'mousemove');
        expect(machine.getShadowElement()!.classList.contains(CLASS_HIDDEN)).toBe(false);
    });

    it('writes the latest position into eventInfo.shadow.top / .left', () => {
        const { machine, draggable } = setup();
        fireMouse(draggable, 'mousedown');
        fireMouse(document.body, 'mousemove', { clientX: 200, clientY: 300 });
        const info = machine.getEventInfo();
        expect(info.shadow.top).toBe(300);
        expect(info.shadow.left).toBe(150); // 200 - 100/2
    });

    it('respects beforeDragMove cancellation: skips shadow update and afterDragMove', () => {
        const { machine, draggable, emitter } = setup();
        fireMouse(draggable, 'mousedown');
        const after = vi.fn();
        emitter.on('beforeDragMove', () => false);
        emitter.on('afterDragMove', after);
        const shadow = machine.getShadowElement()!;
        const beforeTop = shadow.style.top;
        fireMouse(document.body, 'mousemove', { clientX: 200, clientY: 300 });
        expect(shadow.style.top).toBe(beforeTop);
        expect(after).not.toHaveBeenCalled();
        expect(shadow.classList.contains(CLASS_HIDDEN)).toBe(true);
    });

    it('mousemove without an active drag is a no-op', () => {
        const { emitter } = setup();
        const before = vi.fn();
        emitter.on('beforeDragMove', before);
        fireMouse(document.body, 'mousemove');
        expect(before).not.toHaveBeenCalled();
    });

    it('invokes onMove hook with eventInfo and live cursor coordinates between shadow update and afterDragMove', () => {
        const onMove = vi.fn();
        const { draggable, emitter } = setup({ onMove });
        const order: string[] = [];
        emitter.on('afterDragMove', () => {
            order.push('afterDragMove');
        });
        onMove.mockImplementation(() => {
            order.push('onMove');
        });
        fireMouse(draggable, 'mousedown');
        onMove.mockClear();
        order.length = 0;

        fireMouse(document.body, 'mousemove', { clientX: 200, clientY: 300 });

        expect(onMove).toHaveBeenCalledTimes(1);
        const [info, point] = onMove.mock.calls[0]!;
        expect(info.drag.node).toBe(draggable);
        expect(point).toEqual({ clientX: 200, clientY: 300 });
        // onMove fires before afterDragMove so listeners see updates the hook made.
        expect(order).toEqual(['onMove', 'afterDragMove']);
    });

    it('skips onMove when beforeDragMove cancels the move', () => {
        const onMove = vi.fn();
        const { draggable, emitter } = setup({ onMove });
        fireMouse(draggable, 'mousedown');
        onMove.mockClear();

        emitter.on('beforeDragMove', () => false);
        fireMouse(document.body, 'mousemove');

        expect(onMove).not.toHaveBeenCalled();
    });
});

describe('StateMachine — drop', () => {
    it('returns to idle on mouseup and tears down shadow + dragging class', () => {
        const { machine, draggable } = setup();
        fireMouse(draggable, 'mousedown');
        const shadow = machine.getShadowElement()!;
        fireMouse(document.body, 'mouseup');
        expect(machine.getState()).toBe('idle');
        expect(machine.getShadowElement()).toBeNull();
        expect(machine.getDraggedElement()).toBeNull();
        expect(document.body.contains(shadow)).toBe(false);
        expect(draggable.classList.contains(CLASS_DRAGGING)).toBe(false);
    });

    it('emits afterDragEnd by default (no onDrop configured)', () => {
        const { draggable, emitter } = setup();
        const afterDrop = vi.fn();
        const afterEnd = vi.fn();
        emitter.on('afterDragDrop', afterDrop);
        emitter.on('afterDragEnd', afterEnd);
        fireMouse(draggable, 'mousedown');
        fireMouse(document.body, 'mouseup');
        expect(afterDrop).not.toHaveBeenCalled();
        expect(afterEnd).toHaveBeenCalledOnce();
    });

    it('beforeDragEnd cancellation skips both afterDragDrop and afterDragEnd, but still cleans up', () => {
        const onDrop = vi.fn(() => null);
        const { machine, draggable, emitter } = setup({ onDrop });
        const afterDrop = vi.fn();
        const afterEnd = vi.fn();
        emitter.on('beforeDragEnd', () => false);
        emitter.on('afterDragDrop', afterDrop);
        emitter.on('afterDragEnd', afterEnd);
        fireMouse(draggable, 'mousedown');
        fireMouse(document.body, 'mouseup');
        expect(machine.getState()).toBe('idle');
        expect(machine.getShadowElement()).toBeNull();
        expect(onDrop).not.toHaveBeenCalled();
        expect(afterDrop).not.toHaveBeenCalled();
        expect(afterEnd).not.toHaveBeenCalled();
    });

    it('onDrop receives the live event info', () => {
        const onDrop = vi.fn((info: DragsterEventInfo) => info);
        const { draggable } = setup({ onDrop });
        fireMouse(draggable, 'mousedown');
        fireMouse(document.body, 'mouseup');
        expect(onDrop).toHaveBeenCalledOnce();
        const arg = onDrop.mock.calls[0]![0]!;
        expect(arg.drag.node).toBe(draggable);
    });

    it('onDrop returning null skips afterDragDrop but still emits afterDragEnd', () => {
        const onDrop = vi.fn(() => null);
        const { draggable, emitter } = setup({ onDrop });
        const afterDrop = vi.fn();
        const afterEnd = vi.fn();
        emitter.on('afterDragDrop', afterDrop);
        emitter.on('afterDragEnd', afterEnd);
        fireMouse(draggable, 'mousedown');
        fireMouse(document.body, 'mouseup');
        expect(afterDrop).not.toHaveBeenCalled();
        expect(afterEnd).toHaveBeenCalledOnce();
    });

    it('onDrop returning a mutated info forwards it to afterDragDrop', () => {
        const replacement: DragsterEventInfo = {
            drag: { node: null },
            drop: { node: null },
            shadow: { node: null, top: 0, left: 0 },
            placeholder: { node: null, position: null },
            dropped: document.createElement('div'),
            clonedFrom: null,
            clonedTo: null,
        };
        const onDrop = vi.fn(() => replacement);
        const { draggable, emitter } = setup({ onDrop });
        let received: DragsterEventInfo | null = null;
        emitter.on('afterDragDrop', (info) => {
            received = info;
        });
        fireMouse(draggable, 'mousedown');
        fireMouse(document.body, 'mouseup');
        expect(received).toBe(replacement);
    });

    it('preserves event-info reference between beforeDragEnd and afterDragEnd when no onDrop', () => {
        const { draggable, emitter } = setup();
        let beforeInfo: DragsterEventInfo | null = null;
        let afterInfo: DragsterEventInfo | null = null;
        emitter.on('beforeDragEnd', (info) => {
            beforeInfo = info;
        });
        emitter.on('afterDragEnd', (info) => {
            afterInfo = info;
        });
        fireMouse(draggable, 'mousedown');
        fireMouse(document.body, 'mouseup');
        expect(beforeInfo).not.toBeNull();
        expect(afterInfo).toBe(beforeInfo);
    });

    it('emits the lifecycle in canonical order', () => {
        const order: string[] = [];
        const onDrop = vi.fn((info: DragsterEventInfo) => info);
        const { draggable, emitter } = setup({ onDrop });
        emitter.on('beforeDragStart', () => {
            order.push('beforeDragStart');
        });
        emitter.on('afterDragStart', () => {
            order.push('afterDragStart');
        });
        emitter.on('beforeDragMove', () => {
            order.push('beforeDragMove');
        });
        emitter.on('afterDragMove', () => {
            order.push('afterDragMove');
        });
        emitter.on('beforeDragEnd', () => {
            order.push('beforeDragEnd');
        });
        emitter.on('afterDragDrop', () => {
            order.push('afterDragDrop');
        });
        emitter.on('afterDragEnd', () => {
            order.push('afterDragEnd');
        });
        fireMouse(draggable, 'mousedown');
        fireMouse(document.body, 'mousemove');
        fireMouse(document.body, 'mouseup');
        expect(order).toEqual([
            'beforeDragStart',
            'afterDragStart',
            'beforeDragMove',
            'afterDragMove',
            'beforeDragEnd',
            'afterDragDrop',
            'afterDragEnd',
        ]);
    });
});

describe('StateMachine — touch normalisation', () => {
    it('starts a drag on touchstart', () => {
        const { machine, draggable } = setup();
        fireTouch(draggable, 'touchstart', { clientX: 50, clientY: 60 });
        expect(machine.getState()).toBe('dragging');
    });

    it('updates shadow position on touchmove using changedTouches[0]', () => {
        const { machine, draggable } = setup();
        mockRect(draggable, { left: 10, top: 20, width: 100, height: 50 });
        fireTouch(draggable, 'touchstart', { clientX: 50, clientY: 60 });
        fireTouch(document.body, 'touchmove', { clientX: 200, clientY: 300 });
        const shadow = machine.getShadowElement()!;
        expect(shadow.style.top).toBe('300px');
        expect(shadow.style.left).toBe('150px');
    });

    it('ends the drag on touchend', () => {
        const { machine, draggable } = setup();
        fireTouch(draggable, 'touchstart');
        fireTouch(document.body, 'touchend');
        expect(machine.getState()).toBe('idle');
    });

    it('mouse-up does not end a touch-started drag (input-mode separation)', () => {
        const { machine, draggable } = setup();
        fireTouch(draggable, 'touchstart');
        // mouseup is not attached during a touch-mode drag, so it must not fire afterDragEnd.
        // We can't observe the listener directly, so verify state stays dragging.
        fireMouse(document.body, 'mouseup');
        expect(machine.getState()).toBe('dragging');
    });
});

describe('StateMachine — destroy', () => {
    it('detaches pointer-down listeners so subsequent mousedowns are no-ops', () => {
        const { machine, draggable, emitter } = setup();
        machine.destroy();
        const before = vi.fn();
        emitter.on('beforeDragStart', before);
        fireMouse(draggable, 'mousedown');
        expect(before).not.toHaveBeenCalled();
        expect(machine.getState()).toBe('idle');
    });

    it('cleans up an in-flight drag silently (no events emitted)', () => {
        const { machine, draggable, emitter } = setup();
        fireMouse(draggable, 'mousedown');
        const shadow = machine.getShadowElement()!;
        const afterEnd = vi.fn();
        emitter.on('afterDragEnd', afterEnd);

        machine.destroy();

        expect(machine.getState()).toBe('idle');
        expect(document.body.contains(shadow)).toBe(false);
        expect(draggable.classList.contains(CLASS_DRAGGING)).toBe(false);
        expect(afterEnd).not.toHaveBeenCalled();
    });

    it('after destroy, lingering move/up listeners are gone', () => {
        const { machine, draggable, emitter } = setup();
        fireMouse(draggable, 'mousedown');
        machine.destroy();
        const afterMove = vi.fn();
        emitter.on('afterDragMove', afterMove);
        fireMouse(document.body, 'mousemove');
        expect(afterMove).not.toHaveBeenCalled();
    });
});

describe('StateMachine — rebindRegions', () => {
    let setupInstance: Setup;

    beforeEach(() => {
        setupInstance = setup();
    });

    it('attaches pointer-down listeners to the new region set', () => {
        const { machine } = setupInstance;
        const newRegion = createRegion();
        const newDraggable = createDraggable(newRegion);
        machine.rebindRegions([newRegion]);
        fireMouse(newDraggable, 'mousedown');
        expect(machine.getState()).toBe('dragging');
    });

    it('detaches pointer-down listeners from the previous region set', () => {
        const { machine, draggable } = setupInstance;
        const newRegion = createRegion();
        machine.rebindRegions([newRegion]);
        fireMouse(draggable, 'mousedown');
        expect(machine.getState()).toBe('idle');
    });

    it('an in-flight drag survives a rebind (move/up listeners are on document.body)', () => {
        const { machine, draggable } = setupInstance;
        fireMouse(draggable, 'mousedown');
        machine.rebindRegions([createRegion()]);
        fireMouse(document.body, 'mousemove', { clientX: 250, clientY: 350 });
        expect(machine.getState()).toBe('dragging');
        expect(machine.getShadowElement()!.style.top).toBe('350px');
        fireMouse(document.body, 'mouseup');
        expect(machine.getState()).toBe('idle');
    });
});
