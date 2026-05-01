import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { createDefaultEventInfo, EventEmitter, type DragsterEventInfo, type DragsterEventMap } from './events.js';

describe('EventEmitter — runtime', () => {
    it('delivers the emitted payload to a single listener', () => {
        const emitter = new EventEmitter<{ ping: number }>();
        const seen: number[] = [];
        emitter.on('ping', (n) => {
            seen.push(n);
        });

        emitter.emit('ping', 42);

        expect(seen).toEqual([42]);
    });

    it('fires every listener subscribed to the same event', () => {
        const emitter = new EventEmitter<{ ping: string }>();
        const a = vi.fn();
        const b = vi.fn();
        emitter.on('ping', a);
        emitter.on('ping', b);

        emitter.emit('ping', 'hello');

        expect(a).toHaveBeenCalledOnce();
        expect(b).toHaveBeenCalledOnce();
        expect(a).toHaveBeenCalledWith('hello');
        expect(b).toHaveBeenCalledWith('hello');
    });

    it('does not fire listeners subscribed to other events', () => {
        const emitter = new EventEmitter<{ a: number; b: number }>();
        const onB = vi.fn();
        emitter.on('b', onB);

        emitter.emit('a', 1);

        expect(onB).not.toHaveBeenCalled();
    });

    it('emits return true when all listeners return non-false', () => {
        const emitter = new EventEmitter<{ ping: void }>();
        emitter.on('ping', () => {});
        emitter.on('ping', () => undefined);

        expect(emitter.emit('ping', undefined)).toBe(true);
    });

    it('emit returns false when any listener returns false', () => {
        const emitter = new EventEmitter<{ ping: void }>();
        emitter.on('ping', () => {});
        emitter.on('ping', () => false);
        emitter.on('ping', () => {});

        expect(emitter.emit('ping', undefined)).toBe(false);
    });

    it('runs all listeners even when one cancels (no short-circuit)', () => {
        const emitter = new EventEmitter<{ ping: void }>();
        const order: string[] = [];
        emitter.on('ping', () => {
            order.push('first');
            return false;
        });
        emitter.on('ping', () => {
            order.push('second');
        });

        emitter.emit('ping', undefined);

        expect(order).toEqual(['first', 'second']);
    });

    it('emit on an event with no listeners returns true', () => {
        const emitter = new EventEmitter<{ ping: number }>();
        expect(emitter.emit('ping', 1)).toBe(true);
    });

    it('off removes the specific listener and only that one', () => {
        const emitter = new EventEmitter<{ ping: number }>();
        const a = vi.fn();
        const b = vi.fn();
        emitter.on('ping', a);
        emitter.on('ping', b);

        emitter.off('ping', a);
        emitter.emit('ping', 1);

        expect(a).not.toHaveBeenCalled();
        expect(b).toHaveBeenCalledOnce();
    });

    it('off is a no-op when the listener was not registered', () => {
        const emitter = new EventEmitter<{ ping: number }>();
        const a = vi.fn();
        const unregistered = vi.fn();
        emitter.on('ping', a);

        expect(() => emitter.off('ping', unregistered)).not.toThrow();
        emitter.emit('ping', 1);
        expect(a).toHaveBeenCalledOnce();
    });

    it('off is a no-op for an event with no listeners', () => {
        const emitter = new EventEmitter<{ ping: number }>();
        expect(() => emitter.off('ping', vi.fn())).not.toThrow();
    });

    it('snapshot iteration: off during emit does not skip later listeners', () => {
        const emitter = new EventEmitter<{ ping: void }>();
        const order: string[] = [];
        const second = vi.fn(() => {
            order.push('second');
        });
        emitter.on('ping', () => {
            order.push('first');
            emitter.off('ping', second);
        });
        emitter.on('ping', second);

        emitter.emit('ping', undefined);

        // The mutation is observed on the *next* emission, not this one.
        expect(order).toEqual(['first', 'second']);
    });

    it('snapshot iteration: on during emit does not fire newly-added listener', () => {
        const emitter = new EventEmitter<{ ping: void }>();
        const order: string[] = [];
        const lateAdded = vi.fn(() => {
            order.push('late');
        });
        emitter.on('ping', () => {
            order.push('first');
            emitter.on('ping', lateAdded);
        });

        emitter.emit('ping', undefined);

        expect(order).toEqual(['first']);
        expect(lateAdded).not.toHaveBeenCalled();

        emitter.emit('ping', undefined);
        expect(order).toEqual(['first', 'first', 'late']);
    });

    it('removeAllListeners clears one event when called with an argument', () => {
        const emitter = new EventEmitter<{ a: void; b: void }>();
        const onA = vi.fn();
        const onB = vi.fn();
        emitter.on('a', onA);
        emitter.on('b', onB);

        emitter.removeAllListeners('a');
        emitter.emit('a', undefined);
        emitter.emit('b', undefined);

        expect(onA).not.toHaveBeenCalled();
        expect(onB).toHaveBeenCalledOnce();
    });

    it('removeAllListeners clears every event when called with no argument', () => {
        const emitter = new EventEmitter<{ a: void; b: void }>();
        const onA = vi.fn();
        const onB = vi.fn();
        emitter.on('a', onA);
        emitter.on('b', onB);

        emitter.removeAllListeners();
        emitter.emit('a', undefined);
        emitter.emit('b', undefined);

        expect(onA).not.toHaveBeenCalled();
        expect(onB).not.toHaveBeenCalled();
    });

    it('listenerCount reports the number of registered listeners', () => {
        const emitter = new EventEmitter<{ ping: void }>();
        expect(emitter.listenerCount('ping')).toBe(0);
        const a = vi.fn();
        const b = vi.fn();
        emitter.on('ping', a);
        emitter.on('ping', b);
        expect(emitter.listenerCount('ping')).toBe(2);
        emitter.off('ping', a);
        expect(emitter.listenerCount('ping')).toBe(1);
    });

    it('on returns the emitter for chaining', () => {
        const emitter = new EventEmitter<{ ping: void }>();
        const result = emitter.on('ping', () => {});
        expect(result).toBe(emitter);
    });

    it('off and removeAllListeners return the emitter for chaining', () => {
        const emitter = new EventEmitter<{ ping: void }>();
        const listener = vi.fn();
        emitter.on('ping', listener);
        expect(emitter.off('ping', listener)).toBe(emitter);
        expect(emitter.removeAllListeners()).toBe(emitter);
    });
});

describe('createDefaultEventInfo', () => {
    it('returns the canonical empty shape', () => {
        const info = createDefaultEventInfo();
        expect(info).toEqual({
            drag: { node: null },
            drop: { node: null },
            shadow: { node: null, top: 0, left: 0 },
            placeholder: { node: null, position: null },
            dropped: null,
            clonedFrom: null,
            clonedTo: null,
        });
    });

    it('returns a fresh object on each call (no shared references)', () => {
        const a = createDefaultEventInfo();
        const b = createDefaultEventInfo();
        expect(a).not.toBe(b);
        expect(a.drag).not.toBe(b.drag);
        expect(a.shadow).not.toBe(b.shadow);
        expect(a.placeholder).not.toBe(b.placeholder);
    });
});

describe('EventEmitter — type-level (compile-time)', () => {
    it('rejects unknown event names', () => {
        const emitter = new EventEmitter<DragsterEventMap>();
        // @ts-expect-error 'typo' is not in DragsterEventMap
        emitter.on('typo', () => {});
        // @ts-expect-error 'typo' is not in DragsterEventMap
        emitter.emit('typo', createDefaultEventInfo());
        // @ts-expect-error 'typo' is not in DragsterEventMap
        emitter.off('typo', () => {});
    });

    it('rejects wrong payload types in emit', () => {
        const emitter = new EventEmitter<DragsterEventMap>();
        // @ts-expect-error number is not assignable to DragsterEventInfo
        emitter.emit('beforeDragStart', 123);
        // @ts-expect-error string is not assignable to DragsterEventInfo
        emitter.emit('afterDragDrop', 'hello');
    });

    it('infers the listener payload type from the event name', () => {
        const emitter = new EventEmitter<DragsterEventMap>();
        emitter.on('beforeDragStart', (info) => {
            expectTypeOf(info).toEqualTypeOf<DragsterEventInfo>();
            expectTypeOf(info.drag.node).toEqualTypeOf<HTMLElement | null>();
            expectTypeOf(info.placeholder.position).toEqualTypeOf<'top' | 'bottom' | null>();
        });
    });

    it('listener may return void or false but not other values', () => {
        const emitter = new EventEmitter<DragsterEventMap>();
        emitter.on('beforeDragStart', () => {}); // void
        emitter.on('beforeDragStart', () => false); // false
        emitter.on('beforeDragStart', () => undefined); // undefined ≡ void
        // @ts-expect-error string is not assignable to void | false
        emitter.on('beforeDragStart', () => 'cancel');
        // @ts-expect-error number is not assignable to void | false
        emitter.on('beforeDragStart', () => 42);
        // @ts-expect-error true is not assignable to void | false
        emitter.on('beforeDragStart', () => true);
    });
});
