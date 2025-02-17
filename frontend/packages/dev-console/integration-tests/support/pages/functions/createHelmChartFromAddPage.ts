import { detailsPage } from '@console/cypress-integration-tests/views/details-page';
import { addOptions, devNavigationMenu, pageTitle } from '../../constants';
import { catalogPage, addPage } from '../add-flow';
import { navigateTo } from '../app';

export const createHelmChartFromAddPage = (
  releaseName: string = 'nodejs-release',
  helmChartName: string = 'Nodejs',
) => {
  navigateTo(devNavigationMenu.Add);
  addPage.verifyCard('Helm Chart');
  addPage.selectCardFromOptions(addOptions.HelmChart);
  detailsPage.titleShouldContain(pageTitle.HelmCharts);
  catalogPage.isCardsDisplayed();
  catalogPage.search(helmChartName);
  catalogPage.selectHelmChartCard(helmChartName);
  catalogPage.verifyDialog();
  catalogPage.clickButtonOnCatalogPageSidePane();
  catalogPage.verifyCreateHelmReleasePage();
  catalogPage.enterReleaseName(releaseName);
  catalogPage.clickOnInstallButton();
};
