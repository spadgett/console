import * as React from 'react';
import { sortable, SortByDirection } from '@patternfly/react-table';
import i18next from 'i18next';
import { size } from 'lodash';
import { useTranslation } from 'react-i18next';
import {
  ListPageBody,
  ListPageCreate,
  ListPageFilter,
  ListPageHeader,
  ResourceLink,
  TableData,
  VirtualizedTable,
  useListPageFilter,
} from '@console/dynamic-plugin-sdk/src/api/dynamic-core-api';
import { RowProps, TableColumn } from '@console/dynamic-plugin-sdk/src/extensions/console-types';
import { useK8sWatchResource } from '@console/dynamic-plugin-sdk/src/utils/k8s/hooks/useK8sWatchResource';
import { Timestamp } from '@console/internal/components/utils'; // TODO: not in SDK yet
import { ConfigMapKind } from '../types/config-map';

type ConfigMapListPageProps = {
  namespace?: string;
};

const configMapSize = (obj: ConfigMapKind) => size(obj.data) + size(obj.binaryData);

const getColumns = (): TableColumn<ConfigMapKind>[] => [
  {
    title: i18next.t('workloads~Name'),
    id: 'name',
    sort: 'metadata.name',
    transforms: [sortable],
  },
  {
    title: i18next.t('workloads~Namespace'),
    id: 'namespace',
    sort: 'metadata.namespace',
    transforms: [sortable],
  },
  {
    title: i18next.t('workloads~Size'),
    id: 'size',
    transforms: [sortable],
    sort: (data: ConfigMapKind[], direction: SortByDirection) =>
      data.sort((a: ConfigMapKind, b: ConfigMapKind) => {
        const result = configMapSize(a) - configMapSize(b);
        return direction === SortByDirection.asc ? result : result * -1;
      }),
  },
  {
    title: i18next.t('workloads~Created'),
    id: 'created',
    sort: 'metadata.creationTimestamp',
    transforms: [sortable],
  },
];

const ConfigMapRow: React.FC<RowProps<ConfigMapKind>> = ({ obj, activeColumnIDs }) => {
  const columns = getColumns();
  return (
    <>
      <TableData id={columns[0].id} activeColumnIDs={activeColumnIDs}>
        <ResourceLink
          kind="ConfigMap"
          name={obj.metadata.name}
          namespace={obj.metadata.namespace}
        />
      </TableData>
      <TableData id={columns[1].id} activeColumnIDs={activeColumnIDs}>
        <ResourceLink kind="Namespace" name={obj.metadata.namespace} />
      </TableData>
      <TableData id={columns[2].id} activeColumnIDs={activeColumnIDs}>
        {configMapSize(obj)}
      </TableData>
      <TableData id={columns[3].id} activeColumnIDs={activeColumnIDs}>
        <Timestamp timestamp={obj.metadata.creationTimestamp} />
      </TableData>
    </>
  );
};

type ConfigMapTableProps = {
  data: ConfigMapKind[];
  unfilteredData: ConfigMapKind[];
  loaded: boolean;
  loadError: any;
};

const ConfigMapTable: React.FC<ConfigMapTableProps> = ({
  data,
  unfilteredData,
  loaded,
  loadError,
}) => {
  const columns = getColumns();
  return (
    <VirtualizedTable<ConfigMapKind>
      data={data}
      unfilteredData={unfilteredData}
      loaded={loaded}
      loadError={loadError}
      columns={columns}
      Row={ConfigMapRow}
    />
  );
};

const ConfigMapListPage: React.FC<ConfigMapListPageProps> = ({ namespace }) => {
  const { t } = useTranslation('workloads');
  const [configMaps, loaded, loadError] = useK8sWatchResource<ConfigMapKind[]>({
    groupVersionKind: {
      version: 'v1',
      kind: 'ConfigMap',
    },
    isList: true,
    namespaced: true,
    namespace,
  });

  const [data, filteredData, onFilterChange] = useListPageFilter(configMaps);

  return (
    <>
      <ListPageHeader title={t('ConfigMaps')}>
        <ListPageCreate groupVersionKind="ConfigMap">Create ConfigMap</ListPageCreate>
      </ListPageHeader>
      <ListPageBody>
        <ListPageFilter data={data} loaded={loaded} onFilterChange={onFilterChange} />
        <ConfigMapTable
          data={filteredData}
          unfilteredData={data}
          loaded={loaded}
          loadError={loadError}
        />
      </ListPageBody>
    </>
  );
};

export default ConfigMapListPage;
