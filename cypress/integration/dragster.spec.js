/// <reference types="Cypress" />

describe('Dragster.js', () => {
    beforeEach(() => {
        cy.visit('http://127.0.0.1:8370');
    });

    it('drags and drops an element from one region to another', () => {
        const draggableSelector = '1.1';

        cy.findByText(draggableSelector).then(($draggable) => {
            cy.wrap($draggable).trigger('mousedown');

            cy.wrap($draggable).trigger('mousemove', 300, 10, {
                force: true,
            });

            cy.get('.dragster-drop-placeholder').should('exist');

            cy.wrap($draggable).trigger('mouseup');

            cy.findByText(draggableSelector).parent().next().should('contain.text', 'Dragster Block 2.1');
        });
    });

    it('copies an element while dragging it from read-only region', () => {
        const draggableSelector = '3.1';

        cy.findByText(draggableSelector).then(($draggable) => {
            cy.wrap($draggable).trigger('mousedown');
            cy.wrap($draggable).trigger('mousemove', -200, 0, {
                force: true,
            });

            cy.get('.dragster-drop-placeholder').should('exist');

            cy.wrap($draggable).trigger('mouseup');

            cy.findByTestId('test-drop-copy')
                .findByText(draggableSelector)
                .parent()
                .next()
                .should('contain.text', 'Dragster Block 2.1');

            cy.findAllByText(draggableSelector).should('have.length', 2);
        });
    });

    // it('updates elements order correctly after dropping it in the region', () => {});

    // it('prevents dropping parent elements in nested regions unless it is specified differently', () => {});

    // it('prevents dropping nested draggable elements on a parent draggable region', () => {});

    // it('replaces elements on drop', () => {});
});
