/**
 * Type of visualization such as histogram, trend, timeline etc.,
 * that will be extended while implementing
 */
export type VizType =
    'histogram' |
    'globe';

/**
 * Type of action of visualization data retrieving,
 * such as group or calculate percentile
 */
export type VizAction =
    'accumulate' |
    'group';

/**
 * Any value that can appear in the DS
 */
export type ValueType = string | number | boolean | null;

/**
 * Address of a cell in the table.
 * In format row id, column number on name
 */
export type CellType = [string | number, string | number];

/**
 * {@link Predicate} that matches exact value
 */
export interface EqPredicate<T> {
  op: 'eq';
  value: T;
}

/**
 * {@link Predicate} that matches on of values in the list
 */
export interface InPredicate<T> {
  op: 'in';
  values: T[];
}

/**
 * {@link Predicate} that matches numeric value by range inclusion,
 * including the lower bound and excluding the upper bound
 */
export interface InRangePredicate {
  op: 'inrange';
  range_min: number;
  range_max: number;
}

/**
 * {@link Predicate} that matches numeric value to be greater than
 */
export interface GtPredicate {
  op: 'gt';
  value: number;
}

/**
 * {@link Predicate} that matches numeric value to be greater or equal than
 */
export interface GtePredicate {
  op: 'gte';
  value: number;
}

/**
 * {@link Predicate} that matches numeric value to be lower than
 */
export interface LtPredicate {
  op: 'lt';
  value: number;
}

/**
 * {@link Predicate} that matches numeric value to be lower or equal than
 */
export interface LtePredicate {
  op: 'lte';
  value: number;
}

/**
 * {@link Predicate} that matches number of predicate with OR condition
 */
export interface OrPredicate {
  op: 'or';
  expression: Predicate[];
}

/**
 * {@link Predicate} that matches number of predicate with AND condition
 */
export interface AndPredicate {
  op: 'and';
  expression: Predicate[];
}

/**
 * {@link Predicate} that matches NOT a predicate
 */
export interface NotPredicate {
  op: 'not';
  expression: Predicate;
}

/**
 * Predicate that matches string value by inclusion
 */
export interface InStrPredicate<T> {
  op: 'instr';
  value: T;
}

/**
 * Part of meta information about group or filter.
 * Will be extended while implementing
 */
export type Predicate<T = ValueType> =
    EqPredicate<T> |
    InPredicate<T> |
    InRangePredicate |
    GtPredicate |
    GtePredicate |
    LtPredicate |
    LtePredicate |
    OrPredicate |
    AndPredicate |
    NotPredicate |
    InStrPredicate<T>;

/**
 * Properties specific to a table column
 */
export interface ColSpecificProps {
  /**
   * column for grouping or filter
   */
  col: string;
  /**
   * the label key in the classification collection for the given
   * column; classified (detailed) value by this key is used instead of column value;
   * if not specified, column value directly is used
   */
  label?: string;
  /**
   * the predicate which defines if the row get into result,
   * e.g. we may want to group values inside 3 sigma interval only;
   * if not specified, all rows are used.
   */
  predicate?: Predicate;
}

/**
 * Properties of "accumulate" action
 */
export type AccumulateProps = ( ColSpecificProps | {} ) & {
  action: 'accumulate';
  /**
   * function which reduces values to the single accumulated
   * value, one of pre-defined or custom (TBD)
   */
  accumulater?: 'count' | 'avg' | 'median' | 'min' | 'max';
}

/**
 * {@link Reducer} to group values by ranges
 */
export interface RangeReducer {
  type: 'range';

  /**
   * Minimum bound of the ranges. If not specified,
   * defined automatically by data distribution
   */
  min?: number;

  /**
   * Maximum bound of the ranges. If not specified,
   * defined automatically by data distribution
   */
  max?: number;

  /**
   * Step, i.e. width of one range. If not specified,
   * defined automatically by data distribution
   */
  step?: number;
}

/**
 * All known reducers
 */
export type Reducer = RangeReducer;

/**
 * Properties of "group" action
 */
export type GroupProps = ( ColSpecificProps | {} ) & {
  action: 'group';
  /**
   * function which reduces groups i.e. defines which value goes
   * to which group; for example we may want to divide the interval to 10
   * sub-intervals and group values within them;
   * if not specified, each value makes its own group
   */
  reducer?: Reducer;
}

/**
 * Properties of visualization data retrieving,
 * such as interval and granularity for grouping ect.
 */
export type VizProps = AccumulateProps | GroupProps;

interface VizBaseMeta {
  /**
   * Key of the visualization graph, if many
   * of them appears on the same level. Can be used
   * in the hints, legend etc.
   */
  key: string;

  /**
   * String representation is used in UI
   */
  stringrepr?: string;
}

/**
 * Meta information about a graph which defines
 * both visualization pipeline request to the server and
 * (together with visualization data from the server) rendering.
 * Visualization is a hierarchy of graphs, e.g. a histogram
 * has a child graph or several of them, which
 * positioning and style are defined by the parent graph
 * but rendering is defined by the child graph and data is
 * defined by the visualization data on a child level
 */
export interface VizGraphMeta extends VizBaseMeta {

  /**
   * Selector for label of a visualization item in the graph, in format of
   *  `@gizt/selector`. Applying to {@link VizDataItem}
   * If not defined, {@link VizDataItem.id} will be used
   */
  labelselector?: string;
  /**
   * visualization type, see {@link VizType}
   */
  type: VizType;
  /**
   * properties of visualization graph
   */
  props: GroupProps;
  /**
   * child graphs
   */
  children?: { [k: string]: VizMeta };
}

export interface VizPointMeta extends VizBaseMeta {
  /**
   * properties of visualization point
   */
  props: AccumulateProps;

  /**
   * Just to use in the VizMeta interface
   */
  children?: {};
}

export type VizMeta = VizGraphMeta | VizPointMeta;

/**
 * Item of {@link VizPipeline}
 */
export interface VizPipelineItem {
  action: string;

  [prop: string]: any;
}

/**
 * Visualization pipeline which is visualization request parameter
 */
export type VizPipeline = VizPipelineItem[];

/**
 * Item of visualization data returned by server,
 * if grouping was requested
 */
export interface VizDataItem {
  id: any;

  [k: string]: VizDataValue;
}

/**
 * Value of each element of VizData. Currently either number or nested graph
 */
export type VizDataValue = number | VizData;

/**
 * Visualization data returned by server
 */
export type VizData = VizDataItem[];

/**
 * Filter by selecting one or more of multiple values
 */
export interface MultiselectFilterProposal<T = ValueType> {
  type: 'multiselect';
  col: string;
  label: string;
  values: T[];

  /**
   * Selector for label of an item in the list, in format of
   * `@gizt/selector`. Applying to `T`
   */
  labelselector?: string;

  /**
   * Selector for value of an item which is filter applied to,
   * in format of `@gizt/selector`. Applying to `T`
   */
  valueselector?: string;

  /**
   * Field name in the DB
   */
  valuefield?: string;
}

export interface RangeFilterProposal {
  type: 'range';
  col: string;
  label: string;

  /**
   * minimum limit of the range
   */
  min: number;

  /**
   * maximum limit of the range
   */
  max: number;

  /**
   * format of the label, by default 'number'
   */
  labelformat?: 'number' | 'datetime';
}

/**
 * Filter by searching (normally text)
 */
export interface SearchFilterProposal {
  type: 'search';
}

/**
 * Type of the classified values
 */
export type ComplexValueType = { id: ValueType; [p: string]: any; } | null;

/**
 * Any of known filter types
 */
export type FilterProposal =
    MultiselectFilterProposal<ValueType> |
    MultiselectFilterProposal<ComplexValueType> |
    RangeFilterProposal |
    SearchFilterProposal;

/**
 * Filter interface
 */
export interface BaseFilter<ThisType extends BaseFilter<ThisType>> {
  /**
   * Get a filter query item produced by this filter
   */
  q(): FilterQueryItem | undefined;

  /**
   * Render this filter in a col dropdown menu
   */
  render: React.FC<{ filter: ThisType; onFilter: () => any }>;
}

export type MultiselectFilter<T> =
    BaseFilter<MultiselectFilter<T>>
    & MultiselectFilterProposal<T>
    & {
  selected: T[];
}

export type RangeFilter = BaseFilter<RangeFilter> & RangeFilterProposal & {
  /**
   * lower boundary of the range, inclusive
   */
  range_min: number;

  /**
   * upper boundary of the range, exclusive
   */
  range_max: number;

  /**
   * if include all values, in this case boundaries ignored
   */
  all: boolean;

  /**
   * if include uncategorized (non-numeric) values, in this case
   * boundaries ignored
   */
  uncategorized: boolean;

  /**
   * if include outliers (not within [min, max)) values, in this case
   * boundaries ignored
   */
  outliers: boolean;
}

export type SearchFilter = BaseFilter<SearchFilter> & SearchFilterProposal & {
  term?: string;
}

/**
 * Meta information about a filter applied to DS
 */
export type Filter =
    MultiselectFilter<ValueType> |
    MultiselectFilter<ComplexValueType> |
    RangeFilter |
    SearchFilter;

/**
 * Item of {@link FilterQuery}
 */
export type FilterQueryItem = ColSpecificProps;

/**
 * Filter query which is filter request parameter to the server
 */
export type FilterQuery = FilterQueryItem[];

/**
 * Meta information about DS, such as name, owner, column types etc.
 */
export interface DsMeta {
  /**
   * Ds's unique ID
   */
  id?: string;

  /**
   * Unique name
   */
  name?: string;

  /**
   * Type of the DS source
   */
  type?: string;

  /**
   * Extra DS information. May include access, source, etc.
   */
  extra?: { [k: string]: any };

  /**
   * Columns' name in the specific order
   */
  cols?: string[];

  /**
   * Status of analysis of column types,
   */
  classification?: {
    /**
     * "finished" if analysis is finished
     */
    status?: string;

    /**
     * Date&time when classification started
     */
    started?: Date;

    /**
     * Estimated analysis time in milliseconds
     */
    estimated?: number;
  }

  /**
   * Status of analysis of each column and labels assigned to it,
   * such as "number" or "currency" or other specifying a type of column's detailed value
   */
  detailization?: {
    [col: string]: { status?: string; labels?: string[]; };
  }

  /**
   * Proposed visualization returned by server,
   * in the very format of visualization meta information
   */
  visualization?: {
    [col: string]: VizMeta[];
  }

  /**
   * Proposed filtering returned by server,
   * in the very format of filter proposal
   */
  filtering?: {
    [col: string]: FilterProposal[];
  }
}

/**
 * All information about DS, including DS meta information,
 * visualization and filtering
 */
export interface DsInfo {
  /**
   * Meta info on ds, can be retrieved by /ls API
   */
  meta: DsMeta;

  /**
   * Proposed visualization
   */
  vizMetaProposed?: VizMeta[];

  /**
   * Proposed visualization for each column
   * @deprecated
   */
  vizMetaProposedByCol?: { [col: string]: VizMeta[]; };

  /**
   * Visualization selected by a user, can be combined as Lego
   * by hints on column drop-downs or on visualization area
   */
  vizMeta?: VizGraphMeta;

  /**
   * Filters, both proposed and selected by a user
   */
  filters?: Filter[];

  /**
   * Filters by column
   * @deprecated
   */
  filtersByCol?: { [col: string]: Filter[]; }

  /**
   * Error of retrieving {@link meta}
   */
  err?: string;

  /**
   * Cell selected by default
   */
  anchor?: CellType;

  /**
   * Initialize the {@link DsInfo} object given new {@link meta},
   * when a user selects the other DS or DS processing on the server updates.
   *
   * Visualization and filter proposals are filled by thus returned from
   * the server
   * @param info can contain {@link meta} returned by the server,
   * pre-set visualization and filters
   * @return new copy of the object
   */
  init(info: DsInfoInit): DsInfo;

  /**
   * Add proposed graph to visualization.
   * Can append as a child, or replace, or do some custom logic,
   * depending on graph's nature.
   * @param vizMeta
   */
  appendViz(vizMeta: VizMeta): VizGraphMeta | undefined;

  /**
   * Check if a certain graph is included to the current
   * visualization
   * @param vizMeta
   */
  isVizSelected(vizMeta: VizMeta): boolean;

  /**
   * Get visualization pipeline
   */
  getPipeline(): VizPipeline | undefined;

  /**
   * Get filter query to the server
   */
  getFilterQuery(): FilterQuery | undefined;

  /**
   * Set new visualization, e.g. from saved one, hand-written JSON etc.
   * @param vizMeta
   */
  setViz(vizMeta: VizMeta): void;

  /**
   * Set new filters, e.g. from saved ones, hand-written JSON etc.
   * @param filters
   */
  setFilters(filters: Filter[]): void;
}

/**
 * Part of {@link DsInfo} that can be used in init.
 */
export interface DsInfoInit {
  /**
   * Mandatory meta
   */
  meta: DsInfo["meta"];

  /**
   * Visualization, e.g. saved on the server or browser storage.
   */
  vizMeta?: DsInfo["vizMeta"];

  /**
   * Filters, e.g. saved on the server or browser storage.
   */
  filters?: DsInfo["filters"];

  /**
   * Anchor, e.g. saved on the server, browser storage or URL.
   */
  anchor?: DsInfo["anchor"];
}
