/// <reference types="Cypress" />

const DRAGGABLE_SELECTOR = '.dragster-draggable';

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

            cy.findByText(draggableSelector)
                .parent(DRAGGABLE_SELECTOR)
                .next()
                .should('contain.text', 'Dragster Block 2.1');
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
                .parent(DRAGGABLE_SELECTOR)
                .next()
                .should('contain.text', 'Dragster Block 2.1');

            cy.findAllByText(draggableSelector).should('have.length', 2);
        });
    });

    it('replaces elements on drop', () => {
        const draggableSelector = 'Dragster Block 8.2';
        const droppableSelector = 'Dragster Block 9.1';

        cy.findByText(draggableSelector).then(($draggable) => {
            cy.wrap($draggable).trigger('mousedown');

            cy.wrap($draggable).trigger('mousemove', 450, 450, {
                force: true,
            });

            cy.get('.dragster-drop-placeholder').should('not.exist');

            cy.wrap($draggable).trigger('mouseup');

            cy.get('#container-3 > .dragster-region:nth-of-type(1)').should('contain.text', droppableSelector);
            cy.get('#container-3 > .dragster-region:nth-of-type(2)').should('contain.text', draggableSelector);
            cy.findAllByText(draggableSelector).should('have.length', 1);
            cy.findAllByText(droppableSelector).should('have.length', 1);
        });
    });
});
