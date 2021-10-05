import * as React from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore: FIXME missing exports due to out-of-sync @types/react-redux version
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import isMultiClusterEnabled from '@console/app/src/utils/isMultiClusterEnabled';
import { setActiveCluster, formatNamespaceRoute } from '@console/internal/actions/ui';
import { getCluster } from '@console/internal/components/utils/link';
import { history } from '@console/internal/components/utils/router';
// import { useActiveNamespace } from '@console/shared';
import store from '@console/internal/redux';
import { LAST_CLUSTER_USER_SETTINGS_KEY } from '@console/shared/src/constants';
import { useUserSettings } from '@console/shared/src/hooks/useUserSettings';

export const multiClusterRoutePrefixes = ['/k8s/all-namespaces', '/k8s/cluster', '/k8s/ns'];

type ClusterContextType = {
  cluster?: string;
  setCluster?: (cluster: string) => void;
};

export const ClusterContext = React.createContext<ClusterContextType>({});

export const useValuesForClusterContext = () => {
  const [lastCluster, setLastCluster, lastClusterLoaded] = useUserSettings<string>(
    LAST_CLUSTER_USER_SETTINGS_KEY,
    'local-cluster',
    true,
  );
  const dispatch = useDispatch();
  const setCluster = React.useCallback(
    (cluster: string) => {
      dispatch(setActiveCluster(cluster));
      setLastCluster(cluster);
    },
    [dispatch, setLastCluster],
  );

  // const [activeNamespace] = useActiveNamespace();
  //  const activeNamespace = useSelector(({ UI }) => UI.get('activeNamespace'));

  const urlCluster = getCluster(useLocation().pathname);
  React.useEffect(() => {
    if (urlCluster) {
      setLastCluster(urlCluster);
      dispatch(setActiveCluster(urlCluster));
    } else if (lastClusterLoaded && lastCluster) {
      dispatch(setActiveCluster(lastCluster));
    }

    if (
      isMultiClusterEnabled() &&
      lastClusterLoaded &&
      lastCluster &&
      !urlCluster &&
      multiClusterRoutePrefixes.some((pattern) => window.location.pathname.startsWith(pattern))
    ) {
      const activeNamespace = store.getState().UI.get('activeNamespace');
      const newPath = formatNamespaceRoute(
        activeNamespace,
        window.location.pathname,
        window.location,
        false,
        lastCluster,
      );

      if (newPath !== window.location.pathname) {
        history.pushPath(newPath);
      }
    }
    // Only run this hook after last cluster is loaded or window path changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastClusterLoaded, urlCluster, window.location.pathname]);

  return {
    cluster: lastCluster,
    setCluster,
    loaded: lastClusterLoaded,
  };
};
