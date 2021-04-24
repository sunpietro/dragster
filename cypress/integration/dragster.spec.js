/// <reference types="Cypress" />

describe('Dragster.js', () => {
    before(() => {
        cy.visit('http://127.0.0.1:8370');
    });

    it('drags and drops an element from one region to another', () => {
        const draggableSelector = '#container-0 .dragster-region:nth-child(1) .dragster-draggable:nth-child(1)';
        const droppableSelector = '#container-0 .dragster-region:nth-child(2) .dragster-draggable:nth-child(1)';

        cy.get(draggableSelector).contains('1.1');
        cy.get(droppableSelector).contains('Dragster Block 2.1');

        // cy.get(draggableSelector).then(($draggable) => {
        cy.findByText('1.1').then(($draggable) => {
            cy.get(droppableSelector).then(($droppable) => {
                const droppable = $droppable[0];
                const coords = droppable.getBoundingClientRect();

                cy.wrap($draggable).trigger('mousedown');
                cy.wrap($draggable).trigger('mousemove', coords.x, coords.y, { force: true });

                cy.get('.dragster-drop-placeholder').should('exist');
                cy.get('.dragster-drop-placeholder').parent().next().should('contain.text', '2.2');

                cy.wrap($draggable).trigger('mouseup', coords.x, coords.y, { force: true });

                cy.findByText('1.1').should('exist');
                cy.findByText('1.1').parent().next().should('contain.text', '2.2');
            });
        });
    });

    // it('copies an element while dragging it from read-only region', () => {});

    // it('updates elements order correctly after dropping it in the region', () => {});

    // it('prevents dropping parent elements in nested regions unless it is specified differently', () => {});

    // it('prevents dropping nested draggable elements on a parent draggable region', () => {});

    // it('replaces elements on drop', () => {});
});
