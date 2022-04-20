/* eslint-disable jest/expect-expect */
/* eslint-disable no-undef */

it('shows loading spinner', () => {
  cy.visit('/project?projectId=fakefakefake');
  cy.get('.MuiCircularProgress-svg');
});

it('removes loading spinner after loading data', () => {
  cy.intercept('GET', '/api/project/fakefakefake', { fixture: 'spots.zip' });
  cy.visit('/project?projectId=fakefakefake');
  cy.get('.MuiCircularProgress-svg').should('not.exist');
});

it('shows spots controls', () => {
  cy.visit('/project?projectId=fakefakefake');
  cy.contains('Spots');
  cy.contains('Outline');
  cy.contains('Color');
  cy.contains('Radius');
  cy.contains('Opacity');
});

it('shows segmentation controls', () => {
  cy.visit('/project?projectId=fakefakefake');
  cy.contains('Segmentations');
  cy.contains('Outline');
  cy.contains('Highlight');
  cy.contains('Opacity');
});

it('shows channel controls', () => {
  cy.visit('/project?projectId=fakefakefake');
  cy.contains('Channels');
  cy.contains('Multi-channel');
});

it('opens instructions', () => {
  cy.intercept('GET', '/api/project/fakefakefake', { fixture: 'spots.zip' });

  cy.visit('/project?projectId=fakefakefake');
  cy.contains('Instructions').click();
});

it('removes channel', () => {
  cy.intercept('GET', '/api/project/fakefakefake', { fixture: 'spots.zip' });

  cy.visit('/project?projectId=fakefakefake');
  cy.contains('channel 0');
  cy.get('[data-testid="layer0-options"]').click();
  cy.contains('Remove').click();
  cy.contains('channel 0').should('not.exist');
});
