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

it('removes loading spinner after loading data', () => {
  const id = getUniqueId();
  cy.intercept('GET', `/api/project/${id}`, { fixture: 'spots.zip' });
  cy.visit(`/project?projectId=${id}`);
  cy.get('.MuiCircularProgress-svg').should('not.exist');
});

it('shows spots controls', () => {
  const id = getUniqueId();
  cy.intercept('GET', `/api/project/${id}`, { fixture: 'spots.zip' });
  cy.visit(`/project?projectId=${id}`);
  cy.contains('Spots').click();
  cy.contains('Outline');
  cy.contains('Color');
  cy.contains('Radius');
  cy.contains('Opacity');
});
