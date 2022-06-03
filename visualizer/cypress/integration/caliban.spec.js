/* eslint-disable jest/expect-expect */
/* eslint-disable no-undef */
import { deleteDB } from 'idb';
import { getUniqueId } from './utils';

after(() => {
  deleteDB('deepcell-label');
});

it('shows loading spinner', () => {
  cy.visit(`/project?projectId=${getUniqueId()}`);
  cy.get('.MuiCircularProgress-svg');
});

it('shows tracking controls after loading divisions', () => {
  const id = getUniqueId();
  cy.intercept('GET', `/api/project/${id}`, { fixture: 'oneDivision.zip' });
  cy.visit(`/project?projectId=${id}`);
  cy.get('.MuiCircularProgress-svg').should('not.exist');
  cy.contains('Divisions').click();
  cy.contains('Parent');
  cy.contains('Daughters');
});

it('shows division', () => {
  const id = getUniqueId();
  cy.intercept('GET', `/api/project/${id}`, { fixture: 'oneDivision.zip' });
  // contains cells 23, 31, 134, and 135
  // cell 31 divides into 134 and 135 on frame 1
  cy.visit(`/project?projectId=${id}`);
  cy.get('.MuiCircularProgress-svg').should('not.exist');
  cy.contains('Divisions').click();
  cy.get('body').type('['); // Should select cell 136 (new cell)
  cy.contains('136');
  cy.get('body').type('['); // Should select cell 135
  // Parent cell
  cy.contains('31');
  // Daughters
  cy.contains('134');
  cy.contains('135');
});
