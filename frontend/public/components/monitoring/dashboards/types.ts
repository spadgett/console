export type ColumnStyle = {
  alias?: string;
  decimals?: number;
  unit?: string;
  type: string;
};

export type Panel = {
  decimals?: number;
  format?: string;
  gridPos?: {
    h: number;
    w: number;
    x: number;
    y: number;
  };
  id: string;
  panels: Panel[];
  postfix?: string;
  prefix?: string;
  span: number;
  styles?: ColumnStyle[];
  targets: {
    expr: string;
  };
  title: string;
  transform?: string;
  type: string;
  units?: string;
};
