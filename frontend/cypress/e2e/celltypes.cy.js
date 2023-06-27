/* eslint-disable jest/expect-expect */
/* eslint-disable no-undef */
import { deleteDB } from 'idb';
import { getUniqueId } from './utils';

after(() => {
  deleteDB('deepcell-label');
});

describe('Cell Type Editing', () => {
  beforeEach(() => {
    cy.viewport(1280, 720);
    const id = getUniqueId();
    cy.intercept('GET', `/api/project/${id}`, { fixture: 'rgb.zip' });
    cy.visit(`/project?projectId=${id}`);
    cy.get('.MuiCircularProgress-svg', { timeout: 30000 }).should('not.exist');
    cy.contains('Cell Types').click();
    cy.get('[aria-label="Add New Cell Type"]').click();
    cy.get('[title="#24fecd"]').click();
  });

  it('adds cell type properly', () => {
    cy.get('[data-testid="SquareRoundedIcon"]').should('have.css', 'color', 'rgb(36, 254, 205)');
  });

  it('changes color of cell type', () => {
    cy.get('[data-testid="ColorizeIcon"]').click();
    cy.get('[title="#9900EF"]').click();
    cy.get('[data-testid="SquareRoundedIcon"]').should('have.css', 'color', 'rgb(153, 0, 239)');
  });

  it('adds and removes cells', () => {
    cy.contains('Untitled 1').click();
    cy.get('[aria-label="Add Cells"]').click();
    cy.contains('Click a cell to add to cell type Untitled 1.');
    cy.get('canvas').then(($canvas) => {
      const canvasWidth = $canvas.width();
      const canvasHeight = $canvas.height();
      cy.wrap($canvas).scrollIntoView().click(0, 0);
      cy.contains('Click again to add cell 1 to cell type Untitled 1.');
      cy.wrap($canvas).scrollIntoView().click(0, 0);
      cy.wrap($canvas)
        .scrollIntoView()
        .click(canvasWidth - 1, canvasHeight - 1);
      cy.wrap($canvas)
        .scrollIntoView()
        .click(canvasWidth - 1, canvasHeight - 1);
      cy.wrap($canvas)
        .scrollIntoView()
        .trigger('mouseover', canvasWidth / 4, canvasHeight / 4)
        .click()
        .wait(100);
      // Note: the hover UI has been removed temporarily and is thus not tested
      // cy.contains('Untitled 1 (1)');
      cy.get('[class$=-MuiAccordionSummary-content]').within(() => {
        cy.contains('2');
      });
    });
    cy.get('[data-testid="CheckCircleOutlineIcon"]').click();
    cy.get('[aria-label="Remove Cells"]').click();
    cy.contains('Click a cell to remove from cell type Untitled 1.');
    cy.get('canvas').then(($canvas) => {
      const canvasWidth = $canvas.width();
      const canvasHeight = $canvas.height();
      cy.wrap($canvas).scrollIntoView().click(0, 0);
      cy.contains('Click again to remove cell 1 from cell type Untitled 1.');
      cy.wrap($canvas).scrollIntoView().click(0, 0);
      cy.wrap($canvas)
        .scrollIntoView()
        .trigger('mouseover', canvasWidth / 4, canvasHeight / 4)
        .click();
      // Note: the hover UI has been removed temporarily and is thus not tested
      // cy.contains('Untitled 1 (1)').should('not.exist');
    });
    cy.get('[data-testid="CheckCircleOutlineIcon"]').click();
    cy.contains('Click a cell').should('not.exist');
  });

  it('adds another cell type and toggles properly', () => {
    cy.get('[aria-label="Add New Cell Type"]').click();
    cy.get('[title="#58b5e1"]').click();
    cy.get('[data-testid="SquareRoundedIcon"]')
      .last()
      .should('have.css', 'color', 'rgb(88, 181, 225)');
    cy.get('[id="cell-type-controls"]').within(() => {
      cy.get('[type="checkbox"]').first().click();
      cy.get('[data-testid="CheckBoxOutlineBlankIcon"]').eq(1).should('exist');
      cy.get('[data-testid="CheckBoxOutlineBlankIcon"]').eq(2).should('exist');
      cy.get('[data-testid="CheckBoxIcon"]').should('not.exist');
      cy.get('[type="checkbox"]').eq(2).click();
      cy.get('[type="checkbox"]').eq(3).click();
      for (let i = 0; i < 3; i++) {
        cy.get('[data-testid="CheckBoxIcon"]').eq(i).should('exist');
      }
    });
  });

  it('edits name and deletes', () => {
    cy.get('[id="editDeleteMenu"]').last().click();
    cy.contains('Edit Name').click();
    cy.focused().clear().type('Test Name{enter}');
    cy.contains('Test Name');
    cy.get('[id="editDeleteMenu"]').last().click();
    cy.contains('Delete').click();
    cy.get('Test Name').should('not.exist');
  });
});
