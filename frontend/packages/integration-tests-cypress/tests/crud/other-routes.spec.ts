import { checkErrors } from '../../support';
import { nav } from '../../views/nav';
import { listPage } from '../../views/list-page';
import { guidedTour } from '../../views/guided-tour';

describe('Visiting other routes', () => {
  before(() => {
    cy.login();
  });

  afterEach(() => {
    checkErrors();
  });

  after(() => {
    cy.logout();
  });

  const otherRoutes = [
    '/',
    '/k8s/cluster/clusterroles/view',
    '/k8s/cluster/nodes',
    '/k8s/all-namespaces/events',
    '/k8s/all-namespaces/import',
    '/api-explorer',
    '/api-resource/ns/default/core~v1~Pod',
    '/api-resource/ns/default/core~v1~Pod/schema',
    '/api-resource/ns/default/core~v1~Pod/instances',
    ...(Cypress.env('openshift') === true
      ? [
          '/api-resource/ns/default/core~v1~Pod/access',
          '/k8s/cluster/user.openshift.io~v1~User',
          '/k8s/ns/openshift-machine-api/machine.openshift.io~v1beta1~Machine',
          '/k8s/ns/openshift-machine-api/machine.openshift.io~v1beta1~MachineSet',
          '/k8s/ns/openshift-machine-api/autoscaling.openshift.io~v1beta1~MachineAutoscaler',
          '/k8s/ns/openshift-machine-api/machine.openshift.io~v1beta1~MachineHealthCheck',
          '/k8s/cluster/machineconfiguration.openshift.io~v1~MachineConfig',
          '/k8s/cluster/machineconfiguration.openshift.io~v1~MachineConfigPool',
          '/k8s/all-namespaces/monitoring.coreos.com~v1~Alertmanager',
          '/k8s/ns/openshift-monitoring/monitoring.coreos.com~v1~Alertmanager/main',
          '/settings/cluster',
          '/monitoring/query-browser',
          // Test loading search page for a kind with no static model.
          '/search/all-namespaces?kind=config.openshift.io~v1~Console',
        ]
      : []),
  ];
  otherRoutes.forEach((route) => {
    it(`successfully displays view for route: ${route}`, () => {
      cy.visit(route);
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(5000); // wait for page to load
      cy.byLegacyTestID('error-page').should('not.exist');
      cy.testA11y(`${route} page`);
    });
  });
});

describe('Test perspective query parameters', () => {
  before(() => {
    cy.login();
  });

  beforeEach(() => {
    cy.visit('/k8s/cluster/projects');
    listPage.rows.shouldBeLoaded();
  });

  afterEach(() => {
    checkErrors();
  });

  after(() => {
    cy.logout();
  });

  it('tests Developer query parameter', () => {
    nav.sidenav.switcher.changePerspectiveTo('Administrator');
    nav.sidenav.switcher.shouldHaveText('Administrator');
    cy.visit('/topology/all-namespaces', {
      qs: {
        view: 'graph',
        perspective: 'dev',
      },
    });
    guidedTour.close();
    nav.sidenav.switcher.shouldHaveText('Developer');
  });
  it('tests Administrator query parameter', () => {
    nav.sidenav.switcher.changePerspectiveTo('Developer');
    guidedTour.close();
    nav.sidenav.switcher.shouldHaveText('Developer');
    cy.visit('/dashboards', {
      qs: {
        perspective: 'admin',
      },
    });
    nav.sidenav.switcher.shouldHaveText('Administrator');
  });
});
