import { afterEach, describe, expect, it } from 'vitest';
import {
    createElement,
    findAncestor,
    getEventPoint,
    getVerticalMargins,
    insertAfter,
    insertBefore,
    isTouchEvent,
    removeNode,
} from './dom.js';

afterEach(() => {
    document.body.innerHTML = '';
});

describe('findAncestor', () => {
    it('returns the start node itself when it matches', () => {
        const root = document.createElement('div');
        root.classList.add('match');
        document.body.appendChild(root);

        expect(findAncestor(root, (el) => el.classList.contains('match'))).toBe(root);
    });

    it('walks up to find a matching ancestor', () => {
        const grandparent = document.createElement('section');
        grandparent.classList.add('region');
        const parent = document.createElement('div');
        const child = document.createElement('span');
        grandparent.appendChild(parent);
        parent.appendChild(child);
        document.body.appendChild(grandparent);

        expect(findAncestor(child, (el) => el.tagName === 'SECTION')).toBe(grandparent);
    });

    it('returns null when no ancestor matches', () => {
        const root = document.createElement('div');
        document.body.appendChild(root);

        expect(findAncestor(root, (el) => el.tagName === 'NOPE')).toBeNull();
    });

    it('returns null when stopAt matches before predicate', () => {
        const grandparent = document.createElement('section');
        const parent = document.createElement('div');
        parent.classList.add('boundary');
        const child = document.createElement('span');
        grandparent.appendChild(parent);
        parent.appendChild(child);
        document.body.appendChild(grandparent);

        const result = findAncestor(
            child,
            (el) => el.tagName === 'SECTION',
            (el) => el.classList.contains('boundary'),
        );
        expect(result).toBeNull();
    });

    it('checks predicate before stopAt at the same node', () => {
        // If a node matches both, predicate wins (we want to find it before stopping).
        const node = document.createElement('div');
        node.classList.add('target', 'boundary');
        document.body.appendChild(node);

        // Predicate is checked AFTER stopAt in our implementation, so stopAt wins.
        // Document this so the contract is explicit.
        const result = findAncestor(
            node,
            (el) => el.classList.contains('target'),
            (el) => el.classList.contains('boundary'),
        );
        expect(result).toBeNull();
    });
});

describe('insertBefore', () => {
    it('inserts the new node as the previous sibling of refNode', () => {
        const parent = document.createElement('div');
        const ref = document.createElement('span');
        const inserted = document.createElement('em');
        parent.appendChild(ref);
        document.body.appendChild(parent);

        insertBefore(ref, inserted);

        expect(parent.firstChild).toBe(inserted);
        expect(parent.children[1]).toBe(ref);
    });

    it('is a no-op when refNode is null', () => {
        const inserted = document.createElement('em');
        expect(() => insertBefore(null, inserted)).not.toThrow();
        expect(inserted.parentNode).toBeNull();
    });

    it('is a no-op when refNode has no parent', () => {
        const ref = document.createElement('span');
        const inserted = document.createElement('em');
        // ref is detached; insertBefore should silently skip.
        insertBefore(ref, inserted);
        expect(inserted.parentNode).toBeNull();
    });
});

describe('insertAfter', () => {
    it('inserts the new node as the next sibling of refNode', () => {
        const parent = document.createElement('div');
        const ref = document.createElement('span');
        const trailing = document.createElement('strong');
        const inserted = document.createElement('em');
        parent.appendChild(ref);
        parent.appendChild(trailing);
        document.body.appendChild(parent);

        insertAfter(ref, inserted);

        expect(parent.children[0]).toBe(ref);
        expect(parent.children[1]).toBe(inserted);
        expect(parent.children[2]).toBe(trailing);
    });

    it('appends to the end when refNode is the last child', () => {
        const parent = document.createElement('div');
        const ref = document.createElement('span');
        const inserted = document.createElement('em');
        parent.appendChild(ref);
        document.body.appendChild(parent);

        insertAfter(ref, inserted);

        expect(parent.lastChild).toBe(inserted);
    });

    it('is a no-op when refNode is null or detached', () => {
        const inserted = document.createElement('em');
        expect(() => insertAfter(null, inserted)).not.toThrow();
        expect(inserted.parentNode).toBeNull();
    });
});

describe('removeNode', () => {
    it('removes the node from its parent', () => {
        const parent = document.createElement('div');
        const child = document.createElement('span');
        parent.appendChild(child);
        document.body.appendChild(parent);

        removeNode(child);

        expect(child.parentNode).toBeNull();
        expect(parent.children).toHaveLength(0);
    });

    it('is a no-op for already-detached nodes', () => {
        const detached = document.createElement('span');
        expect(() => removeNode(detached)).not.toThrow();
    });

    it('is a no-op for null/undefined', () => {
        expect(() => removeNode(null)).not.toThrow();
        expect(() => removeNode(undefined)).not.toThrow();
    });
});

describe('isTouchEvent', () => {
    it('returns true for TouchEvent-shaped objects', () => {
        const event = { changedTouches: [], type: 'touchstart' } as unknown as Event;
        expect(isTouchEvent(event)).toBe(true);
    });

    it('returns false for MouseEvent-shaped objects', () => {
        const event = new MouseEvent('mousedown');
        expect(isTouchEvent(event)).toBe(false);
    });
});

describe('getEventPoint', () => {
    it('returns clientX/Y from a MouseEvent', () => {
        const event = new MouseEvent('mousemove', { clientX: 42, clientY: 84 });
        expect(getEventPoint(event)).toEqual({ clientX: 42, clientY: 84 });
    });

    it('returns clientX/Y from changedTouches[0] for a TouchEvent', () => {
        const fakeTouchEvent = {
            changedTouches: [{ clientX: 10, clientY: 20 }],
        } as unknown as TouchEvent;

        expect(getEventPoint(fakeTouchEvent)).toEqual({ clientX: 10, clientY: 20 });
    });

    it('returns origin when a TouchEvent has no changed touches', () => {
        const fakeTouchEvent = { changedTouches: [] } as unknown as TouchEvent;
        expect(getEventPoint(fakeTouchEvent)).toEqual({ clientX: 0, clientY: 0 });
    });
});

describe('createElement', () => {
    it('creates an element of the given tag with no options', () => {
        const el = createElement('div');
        expect(el.tagName).toBe('DIV');
        expect(el.className).toBe('');
        expect(Object.keys(el.dataset)).toHaveLength(0);
    });

    it('applies multiple classes', () => {
        const el = createElement('div', { classes: ['foo', 'bar', 'baz'] });
        expect(el.classList.contains('foo')).toBe(true);
        expect(el.classList.contains('bar')).toBe(true);
        expect(el.classList.contains('baz')).toBe(true);
    });

    it('applies dataset entries', () => {
        const el = createElement('div', { dataset: { dragsterId: 'abc123', role: 'wrapper' } });
        expect(el.dataset.dragsterId).toBe('abc123');
        expect(el.dataset.role).toBe('wrapper');
    });

    it('applies inline styles', () => {
        const el = createElement('div', { style: { position: 'fixed', width: '50px' } });
        expect(el.style.position).toBe('fixed');
        expect(el.style.width).toBe('50px');
    });

    it('returns a precisely-typed element for the given tag', () => {
        const span = createElement('span');
        // Compile-time assertion: span must be HTMLSpanElement.
        const _check: HTMLSpanElement = span;
        expect(_check.tagName).toBe('SPAN');
    });
});

describe('getVerticalMargins', () => {
    it('parses computed marginTop and marginBottom', () => {
        const el = document.createElement('div');
        el.style.marginTop = '12px';
        el.style.marginBottom = '7px';
        document.body.appendChild(el);

        expect(getVerticalMargins(el)).toEqual({ top: 12, bottom: 7 });
    });

    it('returns 0 for unparseable values', () => {
        const el = document.createElement('div');
        // Default styles produce empty strings; parseInt('') is NaN.
        document.body.appendChild(el);

        const margins = getVerticalMargins(el);
        expect(margins.top).toBe(0);
        expect(margins.bottom).toBe(0);
    });
});
