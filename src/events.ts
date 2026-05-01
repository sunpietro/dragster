/**
 * Information passed to every Dragster event listener. Mirrors the shape of
 * `event.dragster` from the legacy 2.x callbacks so consumer code that read
 * `event.dragster.drag.node` etc. ports straight over to `.on()` listeners
 * with identical field paths.
 */
export interface DragsterEventInfo {
    drag: { node: HTMLElement | null };
    drop: { node: HTMLElement | null };
    shadow: { node: HTMLElement | null; top: number; left: number };
    placeholder: { node: HTMLElement | null; position: 'top' | 'bottom' | null };
    dropped: HTMLElement | null;
    clonedFrom: HTMLElement | null;
    clonedTo: HTMLElement | null;
}

/**
 * Event-name → payload-type mapping. The seven entries replace the seven
 * `onBefore*`/`onAfter*` callback options from 2.x. New events can be added
 * here without breaking existing subscribers.
 */
export interface DragsterEventMap {
    beforeDragStart: DragsterEventInfo;
    afterDragStart: DragsterEventInfo;
    beforeDragMove: DragsterEventInfo;
    afterDragMove: DragsterEventInfo;
    beforeDragEnd: DragsterEventInfo;
    afterDragEnd: DragsterEventInfo;
    afterDragDrop: DragsterEventInfo;
}

export type DragsterEventName = keyof DragsterEventMap;

/**
 * Listener for a Dragster event.
 *
 * Returning `false` from a `before*` listener cancels the corresponding
 * action (matches the 2.x `onBeforeDragStart() === false` semantics).
 * Returning `false` from an `after*` listener has no effect — the action
 * has already completed.
 */
export type DragsterListener<E extends DragsterEventName> = (info: DragsterEventMap[E]) => void | false;

/** Build a fresh `DragsterEventInfo` with all references nulled. */
export function createDefaultEventInfo(): DragsterEventInfo {
    return {
        drag: { node: null },
        drop: { node: null },
        shadow: { node: null, top: 0, left: 0 },
        placeholder: { node: null, position: null },
        dropped: null,
        clonedFrom: null,
        clonedTo: null,
    };
}

type GenericListener<T> = (payload: T) => void | false;

/**
 * Minimal typed event emitter. Generic over an event map so callers can
 * enforce both event-name and payload-type correctness at compile time.
 *
 * Cancellation aggregates: every registered listener runs regardless of
 * what previous listeners returned, and `emit` returns `false` if any
 * listener returned `false` (otherwise `true`).
 *
 * Iteration is snapshot-safe: a listener that calls `.off()` (or `.on()`)
 * during an `emit` does not affect the in-flight emission.
 */
export class EventEmitter<EventMap> {
    private readonly listeners: { [K in keyof EventMap]?: GenericListener<EventMap[K]>[] } = {};

    on<E extends keyof EventMap>(event: E, listener: GenericListener<EventMap[E]>): this {
        (this.listeners[event] ??= []).push(listener);
        return this;
    }

    off<E extends keyof EventMap>(event: E, listener: GenericListener<EventMap[E]>): this {
        const list = this.listeners[event];
        if (!list) return this;
        const idx = list.indexOf(listener);
        if (idx !== -1) list.splice(idx, 1);
        return this;
    }

    emit<E extends keyof EventMap>(event: E, payload: EventMap[E]): boolean {
        const list = this.listeners[event];
        if (!list || list.length === 0) return true;
        let cancelled = false;
        for (const listener of list.slice()) {
            if (listener(payload) === false) cancelled = true;
        }
        return !cancelled;
    }

    /** Drop every listener for `event`, or every listener of every event when called with no arguments. */
    removeAllListeners<E extends keyof EventMap>(event?: E): this {
        if (event === undefined) {
            for (const key of Object.keys(this.listeners) as Array<keyof EventMap>) {
                delete this.listeners[key];
            }
        } else {
            delete this.listeners[event];
        }
        return this;
    }

    /** Number of listeners currently registered for `event`. Primarily for tests / introspection. */
    listenerCount<E extends keyof EventMap>(event: E): number {
        return this.listeners[event]?.length ?? 0;
    }
}
