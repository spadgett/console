import { K8sResourceCommon } from '@console/dynamic-plugin-sdk';

export type ConfigMapKind = {
  data?: { [key: string]: string };
  binaryData?: { [key: string]: string };
} & K8sResourceCommon;
