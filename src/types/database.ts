export type FieldType = 'text' | 'number' | 'select' | 'checkbox' | 'relation';

export interface Field {
  id: string; // e.g. "f1"
  name: string;
  type: FieldType;
  options?: string[]; // for 'select'
  relationTableId?: string; // for 'relation': target table id
  relationDisplayFieldId?: string; // field to show as label
}

export interface RecordRow {
  id: string; // e.g. "r1"
  [fieldId: string]: any; // for 'relation', stores target record ID
}

export interface Table {
  id: string; // e.g. "t1"
  name: string;
  fields: Field[];
  rows: RecordRow[];
}

export type ViewType = 'table' | 'card' | 'kanban' | 'list';

export interface ViewConfig {
  id: string;
  tableId: string;
  name: string;
  type: ViewType;
  groupByFieldId?: string; // used for kanban / card grouping
}

export interface DatabaseState {
  version: 1;
  title: string;
  tables: Table[];
  views: ViewConfig[];
  activeViewId: string;
}
