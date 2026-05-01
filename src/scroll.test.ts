import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { autoScroll, SCROLL_EDGE_THRESHOLD, SCROLL_STEP } from './scroll.js';

const ORIGINAL_INNER_HEIGHT = window.innerHeight;

function setViewportHeight(height: number): void {
    Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        get: () => height,
    });
}

describe('autoScroll', () => {
    let scrollBy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
        setViewportHeight(800);
    });

    afterEach(() => {
        scrollBy.mockRestore();
        setViewportHeight(ORIGINAL_INNER_HEIGHT);
    });

    it('does nothing when the cursor is in the middle of the viewport', () => {
        autoScroll(400);
        expect(scrollBy).not.toHaveBeenCalled();
    });

    it('scrolls down (positive Y) when the cursor is in the bottom edge band', () => {
        // viewportHeight (800) - clientY (770) = 30 < 60 → bottom edge
        autoScroll(770);
        expect(scrollBy).toHaveBeenCalledTimes(1);
        expect(scrollBy).toHaveBeenCalledWith(0, SCROLL_STEP);
    });

    it('scrolls up (negative Y) when the cursor is in the top edge band', () => {
        // clientY (30) < 60 → top edge
        autoScroll(30);
        expect(scrollBy).toHaveBeenCalledTimes(1);
        expect(scrollBy).toHaveBeenCalledWith(0, -SCROLL_STEP);
    });

    it('does not scroll when the cursor sits exactly on the top-edge boundary', () => {
        // clientY = 60 means clientY < 60 is false → no scroll
        autoScroll(SCROLL_EDGE_THRESHOLD);
        expect(scrollBy).not.toHaveBeenCalled();
    });

    it('does not scroll when the cursor sits exactly on the bottom-edge boundary', () => {
        // viewportHeight - clientY = 60 means < 60 is false → no scroll
        autoScroll(800 - SCROLL_EDGE_THRESHOLD);
        expect(scrollBy).not.toHaveBeenCalled();
    });

    it('scrolls down at the very bottom of the viewport', () => {
        autoScroll(800);
        expect(scrollBy).toHaveBeenCalledTimes(1);
        expect(scrollBy).toHaveBeenCalledWith(0, SCROLL_STEP);
    });

    it('scrolls up at the very top of the viewport', () => {
        autoScroll(0);
        expect(scrollBy).toHaveBeenCalledTimes(1);
        expect(scrollBy).toHaveBeenCalledWith(0, -SCROLL_STEP);
    });

    it('reads viewport height fresh on each call (no cached value)', () => {
        setViewportHeight(400);
        autoScroll(370); // 400 - 370 = 30 < 60 → bottom band
        expect(scrollBy).toHaveBeenCalledTimes(1);
        expect(scrollBy).toHaveBeenCalledWith(0, SCROLL_STEP);

        scrollBy.mockClear();
        setViewportHeight(1200);
        autoScroll(370); // 1200 - 370 = 830 → middle, no scroll
        expect(scrollBy).not.toHaveBeenCalled();
    });
});

describe('scroll constants', () => {
    it('exports the legacy 2.x threshold and step values', () => {
        expect(SCROLL_EDGE_THRESHOLD).toBe(60);
        expect(SCROLL_STEP).toBe(10);
    });
});
