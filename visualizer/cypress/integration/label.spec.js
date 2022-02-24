describe('First Test', () => {
  it('Does not do much!', () => {
    expect(true).to.equal(true);
  });
});

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
    cy.url({ timeout: 30000 }).should('include', '/project');
  });
});
