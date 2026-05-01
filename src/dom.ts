/**
 * Low-level DOM utilities used across Dragster modules.
 * Pure or self-contained functions only — no module-level state.
 */

export type Predicate<T> = (value: T) => boolean;

export interface CreateElementOptions {
    classes?: ReadonlyArray<string>;
    dataset?: Readonly<Record<string, string>>;
    style?: Partial<CSSStyleDeclaration>;
}

/**
 * Walk from `start` up the DOM tree, returning the first element (including
 * `start` itself) that satisfies `predicate`. If `stopAt` is provided and
 * matches before `predicate` does, the walk terminates and returns `null`.
 */
export function findAncestor(
    start: HTMLElement,
    predicate: Predicate<HTMLElement>,
    stopAt?: Predicate<HTMLElement>,
): HTMLElement | null {
    let current: HTMLElement | null = start;
    while (current) {
        if (stopAt?.(current)) return null;
        if (predicate(current)) return current;
        current = current.parentElement;
    }
    return null;
}

/** Insert `newNode` immediately before `refNode`. No-op if `refNode` is detached or null. */
export function insertBefore(refNode: HTMLElement | null, newNode: HTMLElement): void {
    refNode?.parentNode?.insertBefore(newNode, refNode);
}

/** Insert `newNode` immediately after `refNode`. No-op if `refNode` is detached or null. */
export function insertAfter(refNode: HTMLElement | null, newNode: HTMLElement): void {
    refNode?.parentNode?.insertBefore(newNode, refNode.nextSibling);
}

/** Remove `node` from its parent. Safe with already-detached or null nodes. */
export function removeNode(node: HTMLElement | null | undefined): void {
    node?.remove();
}

/** Whether the event is a touch event (touchstart / touchmove / touchend). */
export function isTouchEvent(event: Event): event is TouchEvent {
    return 'changedTouches' in event;
}

/**
 * Extract the canonical pointer location from a mouse or touch event.
 * For touch events, uses `changedTouches[0]` (the originating touch for
 * touchstart/move/end). Returns `{ clientX: 0, clientY: 0 }` if a touch
 * event has no changed touches — should not happen in practice.
 */
export function getEventPoint(event: MouseEvent | TouchEvent): { clientX: number; clientY: number } {
    if (isTouchEvent(event)) {
        const touch = event.changedTouches[0];
        return touch ? { clientX: touch.clientX, clientY: touch.clientY } : { clientX: 0, clientY: 0 };
    }
    return { clientX: event.clientX, clientY: event.clientY };
}

/** Create an element with optional classes / dataset entries / inline styles. */
export function createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    options: CreateElementOptions = {},
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName);
    if (options.classes && options.classes.length > 0) {
        element.classList.add(...options.classes);
    }
    if (options.dataset) {
        for (const [key, value] of Object.entries(options.dataset)) {
            element.dataset[key] = value;
        }
    }
    if (options.style) {
        Object.assign(element.style, options.style);
    }
    return element;
}

/**
 * Computed top + bottom margins of `element` in CSS pixels. Falls back to 0
 * when the parsed value is NaN (e.g. `auto`).
 */
export function getVerticalMargins(element: HTMLElement): { top: number; bottom: number } {
    const styles = window.getComputedStyle(element);
    const top = parseInt(styles.marginTop, 10);
    const bottom = parseInt(styles.marginBottom, 10);
    return {
        top: Number.isNaN(top) ? 0 : top,
        bottom: Number.isNaN(bottom) ? 0 : bottom,
    };
}
