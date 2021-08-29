import * as React from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore: FIXME missing exports due to out-of-sync @types/react-redux version
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { setActiveCluster, formatNamespaceRoute } from '@console/internal/actions/ui';
import { getCluster } from '@console/internal/components/utils/link';
import { history } from '@console/internal/components/utils/router';
import { useActiveNamespace } from '@console/shared';
import { LAST_CLUSTER_USER_SETTINGS_KEY } from '@console/shared/src/constants';
import { useUserSettings } from '@console/shared/src/hooks/useUserSettings';

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

  const urlCluster = getCluster(useLocation().pathname);
  const knownCluster = window.SERVER_FLAGS.clusters.includes(urlCluster);
  const [activeNamespace] = useActiveNamespace();

  React.useEffect(() => {
    if (urlCluster && knownCluster) {
      setLastCluster(urlCluster);
    }
    if (lastClusterLoaded && lastCluster) {
      dispatch(setActiveCluster(lastCluster));
    }

    if (lastClusterLoaded && (!urlCluster || !knownCluster)) {
      // might require URL change:
      const newPath = formatNamespaceRoute(
        activeNamespace,
        window.location.pathname,
        window.location,
        true,
        lastCluster,
      );

      if (newPath !== window.location.pathname) {
        history.pushPath(newPath);
      }
    }
    // Only run this hook after last cluster is loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastClusterLoaded]);

  return {
    cluster: lastCluster,
    setCluster,
    loaded: lastClusterLoaded,
  };
};
