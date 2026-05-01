import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Drag a source element onto a target element using real mousedown / mousemove /
 * mouseup events — Playwright's `dragTo` uses the HTML5 native drag-and-drop
 * surface which Dragster.js does not bind to. The intermediate `steps` matter:
 * Dragster's placeholder logic only updates on real mousemove ticks, and one
 * synthetic move would leap over every intermediate hit-test.
 */
async function performDrag(
    page: Page,
    source: Locator,
    target: Locator,
    targetOffset: { x: number; y: number } = { x: 0, y: 0 },
): Promise<void> {
    const sourceBox = await source.boundingBox();
    const targetBox = await target.boundingBox();
    if (!sourceBox || !targetBox) throw new Error('source or target not visible');

    const startX = sourceBox.x + sourceBox.width / 2;
    const startY = sourceBox.y + sourceBox.height / 2;
    const endX = targetBox.x + targetBox.width / 2 + targetOffset.x;
    const endY = targetBox.y + targetBox.height / 2 + targetOffset.y;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Tween in steps so placeholder logic sees real intermediate frames.
    await page.mouse.move(endX, endY, { steps: 10 });
}

test.describe('Dragster.js — basic move', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('drags an element from the source region onto a target in another region', async ({ page }) => {
        const dragTarget = page.getByTestId('drag-target');
        const dropTarget = page.getByTestId('drop-target');

        await performDrag(page, dragTarget, dropTarget, { x: 0, y: 12 });
        await expect(page.locator('.dragster-drop-placeholder')).toHaveCount(1);

        await page.mouse.up();

        // After drop: the wrapper containing `1.1` should now sit next to the
        // wrapper containing `Dragster Block 2.1` inside the second region.
        const nextSiblingText = await page.evaluate(() => {
            const dragged = document.querySelector('[data-testid="drag-target"]');
            const wrapper = dragged?.parentElement; // .dragster-draggable
            const next = wrapper?.nextElementSibling;
            return next?.textContent ?? '';
        });
        expect(nextSiblingText).toContain('Dragster Block 2.1');

        // The dragged item now lives inside the target region.
        const ownerRegion = await page.evaluate(() => {
            const dragged = document.querySelector('[data-testid="drag-target"]');
            const region = dragged?.closest('.dragster-region');
            return region?.getAttribute('data-testid') ?? '';
        });
        expect(ownerRegion).toBe('test-drop-copy');
    });

    test('does not collapse the source region while a drag is in flight', async ({ page }) => {
        const sourceRegion = page.getByTestId('source-region');
        const dragTarget = page.getByTestId('drag-target');
        const dropTarget = page.getByTestId('drop-target');

        const initialHeight = await sourceRegion.evaluate((el) => (el as HTMLElement).offsetHeight);
        expect(initialHeight).toBeGreaterThan(0);

        await performDrag(page, dragTarget, dropTarget);
        const heightDuringDrag = await sourceRegion.evaluate((el) => (el as HTMLElement).offsetHeight);
        // Height during drag should not collapse below the initial height; layout
        // additions (placeholder elsewhere, shadow on body) may grow it slightly.
        expect(heightDuringDrag).toBeGreaterThanOrEqual(initialHeight);

        await page.mouse.up();
    });

    test('clears the placeholder and shadow after a successful drop', async ({ page }) => {
        const dragTarget = page.getByTestId('drag-target');
        const dropTarget = page.getByTestId('drop-target');

        await performDrag(page, dragTarget, dropTarget, { x: 0, y: 12 });
        await page.mouse.up();

        await expect(page.locator('.dragster-drop-placeholder')).toHaveCount(0);
        await expect(page.locator('.dragster-temp')).toHaveCount(0);
        await expect(page.locator('.is-dragging')).toHaveCount(0);
    });
});

test.describe('Dragster.js — drag-only regions', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('does not show a drop placeholder when hovering items in a drag-only region', async ({ page }) => {
        const dragTarget = page.getByTestId('drag-target'); // start a real drag from a regular region
        const dragOnlyTarget = page.getByTestId('copy-only-target'); // drag-only region item

        await performDrag(page, dragTarget, dragOnlyTarget);
        await expect(page.locator('.dragster-drop-placeholder')).toHaveCount(0);

        await page.mouse.up();
    });
});

// Replace-elements (`container-3`) and clone (`cloneElements: true` from a
// drag-only region) modes are not yet wired in v3 — see PR 7's deferred work.
// Specs for them live as fixmes so the matrix stays visible.
test.fixme('Dragster.js — replaceElements mode swaps innerHTML on drop (TODO PR 7b)', () => {});
test.fixme('Dragster.js — cloneElements from a drag-only region keeps the source (TODO PR 7b)', () => {});
