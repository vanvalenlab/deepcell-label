/* eslint-disable jest/expect-expect */
/* eslint-disable no-undef */

it('shows loading spinner', () => {
  cy.visit('/project?projectId=fakefakefake');
  cy.get('.MuiCircularProgress-svg');
});

it('shows tracking controls after loading lineage', () => {
  cy.intercept('GET', '/api/project/fakefakefake', { fixture: 'oneDivision.zip' });
  cy.visit('/project?projectId=fakefakefake');
  cy.get('.MuiCircularProgress-svg').should('not.exist');
  cy.contains('Parent');
  cy.contains('Daughters');
  cy.contains('Selected');
  cy.contains('Hovering');
  cy.contains('Frame');
});

it('shows division', () => {
  cy.intercept('GET', '/api/project/fakefakefake', { fixture: 'oneDivision.zip' });
  // contains cells 23, 31, 134, and 135
  // cell 31 divides into 134 and 135 on frame 1
  cy.visit('/project?projectId=fakefakefake');
  cy.get('.MuiCircularProgress-svg').should('not.exist');
  cy.get('body').type('['); // Should select cell 135
  // Parent cell
  cy.contains('31');
  // Daughters
  cy.contains('134');
  cy.contains('135');
});
