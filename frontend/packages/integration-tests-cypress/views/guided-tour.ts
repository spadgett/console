export const guidedTour = {
  close: () => {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000); // wait a sec for modal if it is going to be displayed
    cy.get('body').then(($body) => {
      if ($body.find(`[data-test="guided-tour-modal"]`).length) {
        cy.byTestID('tour-step-footer-secondary')
          .contains('Skip tour')
          .click();
      }
    });
  },
};
