/* eslint-disable jest/expect-expect */
/* eslint-disable no-undef */
import { deleteDB } from 'idb';
import { getUniqueId } from './utils';

after(() => {
  deleteDB('deepcell-label');
});

it('finds DeepCell Label homepage text', () => {
  cy.visit('/');
  cy.contains('DeepCell Label');
  cy.contains('Upload');
  cy.contains('select an example file');
  cy.contains('Submit');
  cy.contains('The Van Valen Lab');
  cy.contains('Caltech');
});

it('Create a project from an example file', () => {
  cy.visit('/');
  cy.get('.MuiNativeSelect-select').select('2D tissue segmentation');
  cy.get('#submitExample').click();
  cy.get('.MuiLinearProgress-root');
  cy.url({ timeout: 30000 })
    .should('include', '/project')
    .and('include', 'projectId=')
    .and('include', 'download=true');
  cy.get('.MuiCircularProgress-svg');
  cy.get('canvas', { timeout: 10000 });
  cy.contains('DeepCell Label');
  cy.contains('Instructions');
  cy.contains('Download');
  cy.contains('Segmentations');
  cy.contains('Channels');
  cy.contains('Undo');
  cy.contains('Redo');
  cy.get('.MuiCircularProgress-svg').should('not.exist');
});

it('shows loading spinner', () => {
  cy.visit(`/project?projectId=${getUniqueId()}`);
  cy.get('.MuiCircularProgress-svg');
});

// TODO: load tracking results on backend
// it('Creates a tracking project', () => {
//   cy.visit('/');
//   cy.get('.MuiNativeSelect-select').select('uncorrected tracking timelapse');
//   cy.get('#submitExample').click();
//   cy.get('.MuiLinearProgress-root');
//   cy.url({ timeout: 30000 })
//     .should('include', '/project')
//     .and('include', 'projectId=')
//     .and('include', 'download=true')
//   cy.get('.MuiCircularProgress-svg');
//   cy.get('canvas');
//   cy.contains('Divisions');
//   cy.get('.MuiCircularProgress-svg').should('not.exist');
// });

it('updates state with keybinds', () => {
  const id = getUniqueId();
  cy.intercept('GET', `/api/project/${id}`, { fixture: 'rgb.zip' });

  cy.visit(`/project?projectId=${id}`);
  cy.get('.MuiCircularProgress-svg').should('not.exist');
  cy.get('body').type('b');
  cy.contains('Brush').should('have.attr', 'aria-pressed', 'true');
  cy.get('body').type('e');
  cy.contains('Eraser').should('have.attr', 'aria-pressed', 'true');
  cy.get('body').type('k');
  cy.contains('Trim').should('have.attr', 'aria-pressed', 'true');
  cy.get('body').type('g');
  cy.contains('Flood').should('have.attr', 'aria-pressed', 'true');

  cy.get('body').type('y');

  cy.get('body').type('t');
  cy.contains('Threshold').should('have.attr', 'aria-pressed', 'true');
});

it('opens instructions', () => {
  const id = getUniqueId();
  cy.intercept('GET', `/api/project${id}`, { fixture: 'rgb.zip' });

  cy.visit(`/project?projectId=${id}`);
  cy.contains('Instructions').click();
  cy.contains('Display').click();
  cy.contains('Canvas').click();
  cy.contains('Select Labels').click();
  cy.contains('Tools').click();
  cy.contains('Actions').click();
});

it('shows quality control interface', () => {
  const [id1, id2] = [getUniqueId(), getUniqueId()];
  cy.intercept('GET', `/api/project/${id1}`, { fixture: 'rgb.zip' });
  cy.intercept('GET', `/api/project/${id2}`, { fixture: 'rgb.zip' });

  cy.visit(`project?projectId=${id1},${id2}`);
  cy.contains('Accept').click();
  cy.contains('Reject').click();
  cy.contains('Download QC').click();
});

it('removes channel', () => {
  const id = getUniqueId();
  cy.intercept('GET', `/api/project/${id}`, { fixture: 'rgb.zip' });

  cy.visit(`project?projectId=${id}`);
  cy.contains('channel 0');
  cy.get('[data-testid="layer0-options"]').click();
  cy.contains('Remove').click();
  cy.contains('channel 0').should('not.exist');
});
