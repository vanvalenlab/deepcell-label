/* eslint-disable jest/expect-expect */
/* eslint-disable no-undef */

describe('Homepage content', () => {
  it('finds DeepCell Label text', () => {
    cy.visit('/');
    cy.contains('DeepCell Label');
    cy.contains('Upload');
    cy.contains('select an example file');
    cy.contains('Submit');
    cy.contains('The Van Valen Lab');
    cy.contains('Caltech');
  });
});

describe('Create a project from an example file', () => {
  it('opens the project page', () => {
    cy.visit('/');
    cy.get('.MuiNativeSelect-select').select('2D tissue segmentation');
    cy.get('#submitExample').click();
    cy.get('.MuiLinearProgress-root');
    cy.url({ timeout: 30000 })
      .should('include', '/project')
      .and('include', 'projectId=')
      .and('include', 'download=true');
    cy.get('.MuiCircularProgress-svg');
    cy.get('canvas');
    cy.contains('DeepCell Label');
    cy.contains('Instructions');
    cy.contains('Download');
    cy.contains('Segmentations');
    cy.contains('Channels');
    cy.contains('Undo');
    cy.contains('Redo');
    cy.get('.MuiCircularProgress-svg').should('not.exist');
  });
});

it('shows loading spinner', () => {
  cy.visit('/project?projectId=fakefakefake');
  cy.get('.MuiCircularProgress-svg');
});

it('Creates a tracking project', () => {
  cy.visit('/');
  cy.get('.MuiNativeSelect-select').select('uncorrected tracking timelapse');
  cy.get('#submitExample').click();
  cy.get('.MuiLinearProgress-root');
  cy.url({ timeout: 30000 })
    .should('include', '/project')
    .and('include', 'projectId=')
    .and('include', 'download=true')
    .and('include', 'track=true');
  cy.get('.MuiCircularProgress-svg');
  cy.get('canvas');
  cy.contains('Track');
  cy.get('.MuiCircularProgress-svg').should('not.exist');
});

it('updates state with keybinds', () => {
  cy.visit('/');
  cy.get('.MuiNativeSelect-select').select('2D tissue segmentation');
  cy.get('#submitExample').click();
  cy.get('.MuiLinearProgress-root');
  cy.url({ timeout: 30000 }).should('include', '/project');
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

// it('remove channel', () => {
//   cy.visit('/');
//   cy.get('.MuiNativeSelect-select').select('2D tissue segmentation');
//   cy.get('#submitExample').click();
//   cy.url({ timeout: 30000 }).should('include', '/project');

//   cy.get('channel 0');
//   cy.get(['data-testid=MoreVertIcon']).click();
//   cy.get('Remove');
//   cy.get('channel 0').should('not.exist');
// });
