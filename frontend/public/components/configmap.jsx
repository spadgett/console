import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { DetailsPage } from './factory';
import { ConfigMapData, ConfigMapBinaryData } from './configmap-and-secret-data';
import { Kebab, SectionHeading, navFactory, ResourceSummary } from './utils';
import { ConfigMapModel } from '../models';

const menuActions = [...Kebab.getExtensionsActionsForKind(ConfigMapModel), ...Kebab.factory.common];

const ConfigMapsDetailsPage = (props) => {
  const { t } = useTranslation();
  const ConfigMapDetails = ({ obj: configMap }) => {
    return (
      <>
        <div className="co-m-pane__body">
          <SectionHeading text={t('public~ConfigMap details')} />
          <div className="row">
            <div className="col-md-6">
              <ResourceSummary resource={configMap} />
            </div>
          </div>
        </div>
        <div className="co-m-pane__body">
          <SectionHeading text={t('public~Data')} />
          <ConfigMapData data={configMap.data} label={t('public~Data')} />
        </div>
        <div className="co-m-pane__body">
          <SectionHeading text={t('public~Binary data')} />
          <ConfigMapBinaryData data={configMap.binaryData} />
        </div>
      </>
    );
  };

  return (
    <DetailsPage
      {...props}
      menuActions={menuActions}
      pages={[navFactory.details(ConfigMapDetails), navFactory.editYaml()]}
    />
  );
};

export { ConfigMapsDetailsPage };
