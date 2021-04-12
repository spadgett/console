import * as React from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import { useDispatch, useSelector } from 'react-redux';
import { Dropdown, DropdownItem, DropdownToggle, Title } from '@patternfly/react-core';
import { CaretDownIcon } from '@patternfly/react-icons';
import { Perspective, useExtensions, isPerspective } from '@console/plugin-sdk';
import { formatNamespaceRoute, setActiveCluster } from '@console/internal/actions/ui';
import { getActiveCluster } from '@console/internal/reducers/ui';
import { detectFeatures, clearSSARFlags } from '@console/internal/actions/features';
import { K8sResourceCommon } from '@console/internal/module/k8s';
import { RootState } from '../../redux';
import { history } from '../utils';
import { K8sResourceKind, referenceForModel } from '../../module/k8s';
import { ConsoleLinkModel } from '../../models';
import { useK8sWatchResource } from '../utils/k8s-watch-hook';
import { useTranslation } from 'react-i18next';
import { useActiveNamespace, useActivePerspective, ACM_LINK_ID } from '@console/shared';
import { STORAGE_PREFIX } from '@console/shared/src/constants/common';
import * as acmIcon from '../../imgs/ACM-icon.svg';

export type NavHeaderProps = {
  onPerspectiveSelected: () => void;
};

const ClusterIcon: React.FC<{}> = () => <span className="co-m-resource-icon">C</span>;

const NavHeader: React.FC<NavHeaderProps> = ({ onPerspectiveSelected }) => {
  const dispatch = useDispatch();
  const activeCluster = useSelector((state: RootState) => getActiveCluster(state));
  const [activeNamespace] = useActiveNamespace();
  const [activePerspective, setActivePerspective] = useActivePerspective();
  const [isClusterDropdownOpen, setClusterDropdownOpen] = React.useState(false);
  const [isPerspectiveDropdownOpen, setPerspectiveDropdownOpen] = React.useState(false);
  const [managedClusters] = useK8sWatchResource<K8sResourceCommon[]>({
    kind: 'cluster.open-cluster-management.io~v1~ManagedCluster',
    namespaced: false,
    isList: true,
    cluster: 'local-cluster',
  });
  const perspectiveExtensions = useExtensions<Perspective>(isPerspective);
  const [acmLink] = useK8sWatchResource<K8sResourceKind>({
    kind: referenceForModel(ConsoleLinkModel),
    name: ACM_LINK_ID,
    optional: true,
  });
  const { t } = useTranslation();
  const togglePerspectiveOpen = React.useCallback(() => {
    setPerspectiveDropdownOpen(!isPerspectiveDropdownOpen);
  }, [isPerspectiveDropdownOpen]);

  const onClusterSelect = (event, cluster: string): void => {
    event.preventDefault();
    setClusterDropdownOpen(false);
    // TODO: Move this logic into `setActiveCluster`?
    dispatch(setActiveCluster(cluster));
    dispatch(clearSSARFlags());
    dispatch(detectFeatures());
    const oldPath = window.location.pathname;
    const newPath = formatNamespaceRoute(activeNamespace, oldPath, window.location, true);
    if (newPath !== oldPath) {
      history.pushPath(newPath);
    }
    window.localStorage.setItem(`${STORAGE_PREFIX}/last-cluster`, cluster);
  };

  const onPerspectiveSelect = React.useCallback(
    (event: React.MouseEvent<HTMLLinkElement>, perspective: Perspective): void => {
      event.preventDefault();
      if (perspective.properties.id !== activePerspective) {
        setActivePerspective(perspective.properties.id);
        // Navigate to root and let the default page determine where to go to next
        history.push('/');
      }

      setPerspectiveDropdownOpen(false);
      onPerspectiveSelected && onPerspectiveSelected();
    },
    [activePerspective, onPerspectiveSelected, setActivePerspective],
  );

  const renderToggle = React.useCallback(
    (icon: React.ReactNode, name: string) => (
      <DropdownToggle
        isOpen={isPerspectiveDropdownOpen}
        onToggle={togglePerspectiveOpen}
        toggleIndicator={CaretDownIcon}
        data-test-id="perspective-switcher-toggle"
      >
        <Title headingLevel="h2" size="md">
          <span className="oc-nav-header__icon">{icon}</span>
          {name}
        </Title>
      </DropdownToggle>
    ),
    [isPerspectiveDropdownOpen, togglePerspectiveOpen],
  );

  const clusterItems = (managedClusters ?? []).map((managedCluster) => (
    <DropdownItem
      key={managedCluster.metadata.name}
      component="button"
      onClick={(e) => onClusterSelect(e, managedCluster.metadata.name)}
    >
      <ClusterIcon />
      {managedCluster.metadata.name}
    </DropdownItem>
  ));

  const perspectiveItems = React.useMemo(() => {
    const items = perspectiveExtensions.map((nextPerspective: Perspective) => (
      <DropdownItem
        key={nextPerspective.properties.id}
        onClick={(event: React.MouseEvent<HTMLLinkElement>) =>
          onPerspectiveSelect(event, nextPerspective)
        }
        isHovered={nextPerspective.properties.id === activePerspective}
      >
        <Title headingLevel="h2" size="md" data-test-id="perspective-switcher-menu-option">
          <span className="oc-nav-header__icon">{nextPerspective.properties.icon}</span>
          {nextPerspective.properties.name}
        </Title>
      </DropdownItem>
    ));
    if (acmLink) {
      items.push(
        <DropdownItem
          key={ACM_LINK_ID}
          onClick={() => {
            window.location.href = acmLink.spec.href;
          }}
          isHovered={ACM_LINK_ID === activePerspective}
        >
          <Title headingLevel="h2" size="md" data-test-id="perspective-switcher-menu-option">
            <span className="oc-nav-header__icon">
              <img
                src={acmIcon}
                height="12em"
                width="12em"
                alt="Advanced Cluster Management icon"
              />
            </span>
            {t('public~Advanced Cluster Management')}
          </Title>
        </DropdownItem>,
      );
    }
    return items;
  }, [acmLink, activePerspective, onPerspectiveSelect, perspectiveExtensions, t]);

  const { icon, name } = React.useMemo(
    () => perspectiveExtensions.find((p) => p.properties.id === activePerspective).properties,
    [activePerspective, perspectiveExtensions],
  );

  return (
    <>
      {clusterItems.length && (
        <div className="oc-nav-header">
          <Dropdown
            isOpen={isClusterDropdownOpen}
            toggle={
              <DropdownToggle onToggle={() => setClusterDropdownOpen(!isClusterDropdownOpen)}>
                <Title headingLevel="h2" size="md">
                  <ClusterIcon />
                  {activeCluster}
                </Title>
              </DropdownToggle>
            }
            dropdownItems={clusterItems}
          />
        </div>
      )}
      <div
        className="oc-nav-header"
        data-tour-id="tour-perspective-dropdown"
        data-quickstart-id="qs-perspective-switcher"
      >
        <Dropdown
          isOpen={isPerspectiveDropdownOpen}
          toggle={renderToggle(icon, name)}
          dropdownItems={perspectiveItems}
          data-test-id="perspective-switcher-menu"
        />
      </div>
    </>
  );
};

export default NavHeader;
