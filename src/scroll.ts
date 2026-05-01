/**
 * Distance from a viewport edge (top or bottom) at which the auto-scroller
 * starts firing. With this set to 60 px and the cursor at, say, `clientY = 30`,
 * each pointer-move tick scrolls upward by {@link SCROLL_STEP}.
 *
 * Matches the 2.x behaviour. Exported as a named const so consumers (and
 * tests) can refer to it instead of repeating the magic number.
 */
export const SCROLL_EDGE_THRESHOLD = 60;

/**
 * Distance scrolled per pointer-move tick when the cursor is inside the
 * {@link SCROLL_EDGE_THRESHOLD} band. Small on purpose: the user feels a
 * smooth crawl rather than a jump, since a fresh tick fires on every move.
 */
export const SCROLL_STEP = 10;

/**
 * Scroll the window when the cursor sits within {@link SCROLL_EDGE_THRESHOLD}
 * pixels of the top or bottom of the viewport. Designed to be called from a
 * pointer-move handler — every invocation scrolls at most one
 * {@link SCROLL_STEP}, never both directions in one call.
 *
 * No-op when the cursor is in the middle of the viewport. Cursors near the
 * top scroll up (negative Y); cursors near the bottom scroll down.
 */
export function autoScroll(clientY: number): void {
    const viewportHeight = window.innerHeight;
    if (viewportHeight - clientY < SCROLL_EDGE_THRESHOLD) {
        window.scrollBy(0, SCROLL_STEP);
    } else if (clientY < SCROLL_EDGE_THRESHOLD) {
        window.scrollBy(0, -SCROLL_STEP);
    }
}
