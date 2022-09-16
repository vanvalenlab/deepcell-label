/* eslint-disable jest/expect-expect */
/* eslint-disable no-undef */
import { deleteDB } from 'idb';
import { getUniqueId } from './utils';

after(() => {
  deleteDB('deepcell-label');
});

it('selects brush tool, resizes, clicks on canvas', () => {
    const id = getUniqueId();
    cy.intercept('GET', `/api/project/${id}`, { fixture: 'rgb.zip' });
  
    cy.visit(`/project?projectId=${id}`);
    cy.get('.MuiCircularProgress-svg', { timeout: 30000 }).should('not.exist');
    cy.contains('Segment').click();
    cy.contains('Brush').click();
    cy.get('body').type('{downArrow}{downArrow}{downArrow}{downArrow}')
    cy.get('canvas').click(100, 100)
    cy.wait(500);
    cy.get('body').type('n')
    cy.wait(500);
    cy.get('canvas').click(250, 250);
    cy.wait(500);
  });

it('deletes first cell, paints over with new cell', () => {
    cy.contains('Cells').click();
    cy.contains('Select').click();
    cy.get('canvas').click(100, 100);
    cy.wait(500);
    cy.contains('Delete').click();
    cy.get('body').type('v');
    cy.get('canvas').click(250, 250);
    cy.wait(500);
    cy.contains('Segment').click();
    cy.get('body').type('v');
    cy.contains('Brush').click();
    cy.wait(500);
    cy.get('canvas').click(100, 100);
    cy.wait(500);
    cy.reload();
})

it('selects eraser tool, resizes, clicks on canvas', () => {
    cy.get('body').type('v');
    cy.get('canvas').click(100, 100);
    cy.wait(500);
    cy.contains('Segment').click();
    cy.contains('Eraser').click();
    cy.get('body').type('{upArrow}{upArrow}{upArrow}{upArrow}');
    cy.get('canvas').click();
});