import 'reflect-metadata';
import { AndExpression, BlobExpression, BoolExpression, CRUDBooleanExpression, CRUDExpression, ColumnExpression, DateExpression, DecimalExpression, EqualityExpression, ExpressionProducer, GreaterThanEqualExpression, GreaterThanExpression, InEqualityExpression, InExpression, IntegerExpression, LazyExpression, LessThanEqualExpression, LessThanExpression, LikeExpression, NotExpression, NullExpression, OpExpression, OrExpression, SBlobExpression, StringExpression, UUIDExpression } from "./expression/expression";
export declare class CRUDSQLGenError extends Error {
}
export declare class CRUDSQLExeError extends Error {
}
export type Expression = CRUDExpression;
export type ExpressionBinding = Expression | [string, Expression];
export type ObjectBinding = [string, any];
export type Bindings = ObjectBinding[];
export interface IDatabaseConnection {
    sqlGenDelegate(): SQLGenDelegate;
    sqlExeDelegate(forSQL: string): SQLExeDelegate;
    close(): void;
}
export type GConstructor<T = {}> = new (...args: any[]) => T;
export declare class CRUDObjectBase {
    databaseConnection: IDatabaseConnection;
    constructor(databaseConnection: IDatabaseConnection);
    setState(state: SQLGenState): void;
    setSQL(state: SQLGenState): void;
}
export declare class CRUDFromObjectBase extends CRUDObjectBase {
    from: CRUDObjectBase;
    constructor(from: CRUDObjectBase);
    setState(state: SQLGenState): void;
    setSQL(state: SQLGenState): void;
}
export declare class CRUDCommandBase extends CRUDFromObjectBase {
    constructor(from: CRUDObjectBase);
}
export interface SQLExeDelegate {
    exe<Shape extends Object>(bindings: ExpressionBinding[]): Promise<Shape[]>;
}
export interface SQLGenDelegate {
    bindings: ExpressionBinding[];
    getBinding(forExpr: Expression): string;
    quote(identifier: string): string;
}
export declare enum SQLCommand {
    select = 0,
    insert = 1,
    update = 2,
    delete = 3,
    count = 4,
    min = 5,
    max = 6,
    avg = 7,
    unknown = 8
}
export type SQLStatement = {
    sql: string;
    bindings: ExpressionBinding[];
};
type SQLColumnLiteral = {
    name: string;
    alias?: string;
};
type SQLColumnExpr = {
    expr: Expression;
    alias: string;
};
export type SQLColumnData = SQLColumnLiteral | SQLColumnExpr;
export type SQLTableData = {
    tableName: string;
    alias: string;
    selectCols: SQLColumnData[];
    joinData?: SQLJoinData;
};
export type SQLJoinData = {
    joinType: JoinType;
    sourceColumn: string;
    joinTable: string;
    joinColumn: string;
};
export type SQLOrdering = {
    by: CRUDExpression;
    direction: OrderDirection;
};
export type SQLLimit = {
    max: number;
    skip: number;
};
export declare class SQLGenState {
    delegate: SQLGenDelegate;
    constructor(delegate: SQLGenDelegate);
    command: SQLCommand;
    tableData: SQLTableData[];
    whereExpr?: CRUDBooleanExpression;
    accumulatedOrderings: SQLOrdering[];
    currentLimit?: SQLLimit;
    statement: SQLStatement;
    updateObjects: Object[];
    aggregateExpr?: CRUDExpression;
    aliasCounter: number;
    addTable(tableName: string, selectCols: SQLColumnData[], joinData?: SQLJoinData | undefined): void;
    private nextAlias;
}
type MasterTable = {
    table: SQLTableData;
    delegate: SQLExeDelegate;
};
export declare class SQLTopExeDelegate implements SQLExeDelegate {
    state: SQLGenState;
    master: MasterTable;
    constructor(state: SQLGenState, database: IDatabaseConnection);
    exe<Shape extends Object>(bindings: ExpressionBinding[]): Promise<Shape[]>;
}
export declare class Database {
    databaseConnection: IDatabaseConnection;
    constructor(databaseConnection: IDatabaseConnection);
    table<T extends Object>(table: TableType<T>, ...columns: SQLColumnData[]): TableBase;
    run(statement: string, ...bindings: ExpressionBinding[]): Promise<void>;
    sql<Shape extends Object>(statement: string, ...bindings: ExpressionBinding[]): Promise<Shape[]>;
    q<Shape extends Object>(parts: TemplateStringsArray, ...values: any[]): Promise<Shape[]>;
    transaction<Shape>(body: () => Promise<Shape>): Promise<Shape>;
    close(): void;
}
export type TableColumnMetadata = {
    name: string;
    table: string;
};
type MetaType<T> = {
    readonly [P in keyof T]-?: TableColumnMetadata;
};
export type TableType<T extends Object> = MetaType<T> & {
    tableName: string;
};
export declare function Table(tableName: string): ClassDecorator;
export declare function Column(columnName?: string): PropertyDecorator;
export declare function generateMetadata<T extends Object>(target: new () => T): TableType<T>;
declare const TableBase_base: {
    new (...args: any[]): {
        select<Shape extends Object>(): Select<Shape>;
        first<Shape extends Object>(): Promise<Shape | undefined>;
        _inner(state: SQLGenState): Promise<number>;
        count(): Promise<number>;
        min(column: CRUDExpression): Promise<number>;
        max(column: CRUDExpression): Promise<number>;
        avg(column: CRUDExpression): Promise<number>;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & {
    new (...args: any[]): {
        where(expr: CRUDBooleanExpression, ...andExpr: CRUDExpression[]): Where;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & {
    new (...args: any[]): {
        join(joinType: JoinType, sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        innerJoin(sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        leftJoin(sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        rightJoin(sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        fullJoin(sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & {
    new (...args: any[]): {
        order(by: CRUDExpression, direction?: OrderDirection): Ordering;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & {
    new (...args: any[]): {
        limit(max: number, skip?: number): Limit;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & {
    new (...args: any[]): {
        insertReturning<O extends Object, Returning extends Object>(...objects: O[]): InsertReturning<Returning>;
        insert<O extends Object>(...objects: O[]): Promise<Insert>;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & typeof CRUDObjectBase;
export declare class TableBase extends TableBase_base {
    tableName: string;
    columns: SQLColumnData[];
    constructor(databaseConnection: IDatabaseConnection, tableName: string, columns: SQLColumnData[]);
    column?: CRUDExpression;
    setState(state: SQLGenState): void;
    setSQL(state: SQLGenState): void;
}
export interface Selectable {
    select<Shape extends Object>(): Select<Shape>;
    first<Shape extends Object>(): Promise<Shape | undefined>;
    count(): Promise<number>;
    min(column: CRUDExpression): Promise<number>;
    max(column: CRUDExpression): Promise<number>;
    avg(column: CRUDExpression): Promise<number>;
}
export declare function SelectableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T): {
    new (...args: any[]): {
        select<Shape extends Object>(): Select<Shape>;
        first<Shape extends Object>(): Promise<Shape | undefined>;
        _inner(state: SQLGenState): Promise<number>;
        count(): Promise<number>;
        min(column: CRUDExpression): Promise<number>;
        max(column: CRUDExpression): Promise<number>;
        avg(column: CRUDExpression): Promise<number>;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & T;
export declare enum OrderDirection {
    ascending = "ASC",
    descending = "DESC"
}
export interface Orderable {
    order(by: CRUDExpression, direction: OrderDirection): Ordering;
}
export declare function OrderableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T): {
    new (...args: any[]): {
        order(by: CRUDExpression, direction?: OrderDirection): Ordering;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & T;
declare const Ordering_base: {
    new (...args: any[]): {
        order(by: CRUDExpression, direction?: OrderDirection): Ordering;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & {
    new (...args: any[]): {
        join(joinType: JoinType, sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        innerJoin(sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        leftJoin(sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        rightJoin(sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        fullJoin(sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & {
    new (...args: any[]): {
        select<Shape extends Object>(): Select<Shape>;
        first<Shape extends Object>(): Promise<Shape | undefined>;
        _inner(state: SQLGenState): Promise<number>;
        count(): Promise<number>;
        min(column: CRUDExpression): Promise<number>;
        max(column: CRUDExpression): Promise<number>;
        avg(column: CRUDExpression): Promise<number>;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & {
    new (...args: any[]): {
        where(expr: CRUDBooleanExpression, ...andExpr: CRUDExpression[]): Where;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & {
    new (...args: any[]): {
        limit(max: number, skip?: number): Limit;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & typeof CRUDFromObjectBase;
export declare class Ordering extends Ordering_base {
    by: CRUDExpression;
    direction: OrderDirection;
    constructor(from: CRUDObjectBase, by: CRUDExpression, direction: OrderDirection);
    setState(state: SQLGenState): void;
}
export interface Limitable {
    limit(max: number, skip: number): Limit;
}
export declare function LimitableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T): {
    new (...args: any[]): {
        limit(max: number, skip?: number): Limit;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & T;
declare const Limit_base: {
    new (...args: any[]): {
        order(by: CRUDExpression, direction?: OrderDirection): Ordering;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & {
    new (...args: any[]): {
        join(joinType: JoinType, sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        innerJoin(sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        leftJoin(sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        rightJoin(sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        fullJoin(sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & {
    new (...args: any[]): {
        select<Shape extends Object>(): Select<Shape>;
        first<Shape extends Object>(): Promise<Shape | undefined>;
        _inner(state: SQLGenState): Promise<number>;
        count(): Promise<number>;
        min(column: CRUDExpression): Promise<number>;
        max(column: CRUDExpression): Promise<number>;
        avg(column: CRUDExpression): Promise<number>;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & {
    new (...args: any[]): {
        where(expr: CRUDBooleanExpression, ...andExpr: CRUDExpression[]): Where;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & typeof CRUDFromObjectBase;
export declare class Limit extends Limit_base {
    maximum: number;
    skip: number;
    constructor(from: CRUDObjectBase, maximum: number, skip: number);
    setState(state: SQLGenState): void;
}
export declare enum JoinType {
    inner = "",
    left = "LEFT",
    right = "RIGHT",
    full = "FULL"
}
export interface Joinable {
    join(type: JoinType, srcTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols: SQLColumnData[]): Join;
}
export declare function JoinableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T): {
    new (...args: any[]): {
        join(joinType: JoinType, sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        innerJoin(sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        leftJoin(sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        rightJoin(sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        fullJoin(sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & T;
declare const Join_base: {
    new (...args: any[]): {
        where(expr: CRUDBooleanExpression, ...andExpr: CRUDExpression[]): Where;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & {
    new (...args: any[]): {
        select<Shape extends Object>(): Select<Shape>;
        first<Shape extends Object>(): Promise<Shape | undefined>;
        _inner(state: SQLGenState): Promise<number>;
        count(): Promise<number>;
        min(column: CRUDExpression): Promise<number>;
        max(column: CRUDExpression): Promise<number>;
        avg(column: CRUDExpression): Promise<number>;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & {
    new (...args: any[]): {
        join(joinType: JoinType, sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        innerJoin(sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        leftJoin(sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        rightJoin(sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        fullJoin(sourceTable: TableColumnMetadata, joinTable: TableColumnMetadata, selectCols?: SQLColumnData[]): Join;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & {
    new (...args: any[]): {
        order(by: CRUDExpression, direction?: OrderDirection): Ordering;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & {
    new (...args: any[]): {
        limit(max: number, skip?: number): Limit;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & typeof CRUDFromObjectBase;
export declare class Join extends Join_base {
    joinType: JoinType;
    sourceTable: string;
    sourceColumn: string;
    joinTable: string;
    joinColumn: string;
    selectCols: SQLColumnData[];
    constructor(from: CRUDObjectBase, joinType: JoinType, sourceTable: string, sourceColumn: string, joinTable: string, joinColumn: string, selectCols: SQLColumnData[]);
    setState(state: SQLGenState): void;
}
export interface Whereable {
    where(expr: CRUDExpression, ...andExpr: CRUDExpression[]): Where;
}
export declare function WhereableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T): {
    new (...args: any[]): {
        where(expr: CRUDBooleanExpression, ...andExpr: CRUDExpression[]): Where;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & T;
declare const Where_base: {
    new (...args: any[]): {
        limit(max: number, skip?: number): Limit;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & {
    new (...args: any[]): {
        order(by: CRUDExpression, direction?: OrderDirection): Ordering;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & {
    new (...args: any[]): {
        updateReturning<Shape extends Object, Returning extends Object>(set: Shape): UpdateReturning<Shape, Returning>;
        update<Shape extends Object>(set: Shape): Promise<Update<Shape>>;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & {
    new (...args: any[]): {
        delete(): Promise<Delete>;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & {
    new (...args: any[]): {
        select<Shape extends Object>(): Select<Shape>;
        first<Shape extends Object>(): Promise<Shape | undefined>;
        _inner(state: SQLGenState): Promise<number>;
        count(): Promise<number>;
        min(column: CRUDExpression): Promise<number>;
        max(column: CRUDExpression): Promise<number>;
        avg(column: CRUDExpression): Promise<number>;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & typeof CRUDFromObjectBase;
export declare class Where extends Where_base {
    expr: CRUDBooleanExpression;
    constructor(from: CRUDObjectBase, expr: CRUDBooleanExpression);
    setState(state: SQLGenState): void;
}
export interface Deleteable {
    delete(): Promise<Delete>;
}
export declare function DeleteableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T): {
    new (...args: any[]): {
        delete(): Promise<Delete>;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & T;
export declare class Delete extends CRUDCommandBase {
    constructor(from: CRUDObjectBase);
    run(): Promise<void>;
}
export interface Updateable {
    update<Shape extends Object>(set: Shape): Promise<Update<Shape>>;
    updateReturning<Shape extends Object, Returning extends Object>(set: Shape): UpdateReturning<Shape, Returning>;
}
export declare function UpdateableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T): {
    new (...args: any[]): {
        updateReturning<Shape extends Object, Returning extends Object>(set: Shape): UpdateReturning<Shape, Returning>;
        update<Shape extends Object>(set: Shape): Promise<Update<Shape>>;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & T;
export interface Insertable {
    insert<O extends Object>(...objects: O[]): Promise<Insert>;
    insertReturning<O extends Object, Returning extends Object>(...objects: O[]): InsertReturning<Returning>;
}
export declare function InsertableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T): {
    new (...args: any[]): {
        insertReturning<O extends Object, Returning extends Object>(...objects: O[]): InsertReturning<Returning>;
        insert<O extends Object>(...objects: O[]): Promise<Insert>;
        databaseConnection: IDatabaseConnection;
        setState(state: SQLGenState): void;
        setSQL(state: SQLGenState): void;
    };
} & T;
export declare class Select<Shape extends Object> extends CRUDCommandBase {
    constructor(from: CRUDObjectBase);
    rows(): Promise<Shape[]>;
}
export declare class Update<Shape extends Object> extends CRUDCommandBase {
    set: Shape;
    constructor(from: CRUDObjectBase, set: Shape);
    run(): Promise<void>;
}
export declare class UpdateReturning<Shape extends Object, Returning extends Object> extends CRUDCommandBase {
    set: Shape;
    constructor(from: CRUDObjectBase, set: Shape);
    setSQL(state: SQLGenState): void;
    rows(): Promise<Returning[]>;
    first(): Promise<Returning>;
}
export declare class Insert extends CRUDCommandBase {
    objects: Object[];
    constructor(from: CRUDObjectBase, objects: Object[]);
    run(): Promise<void>;
}
export declare class InsertReturning<Returning extends Object> extends CRUDCommandBase {
    objects: Object[];
    constructor(from: CRUDObjectBase, objects: Object[]);
    setSQL(state: SQLGenState): void;
    rows(): Promise<Returning[]>;
    first(): Promise<Returning>;
}
export declare function op(op: string, lhs: CRUDExpression, rhs: CRUDExpression): OpExpression;
export declare function and(lhs: CRUDExpression, rhs: CRUDExpression, ...rest: CRUDExpression[]): AndExpression;
export declare function or(lhs: CRUDExpression, rhs: CRUDExpression, ...rest: CRUDExpression[]): OrExpression;
export declare function eq(lhs: CRUDExpression, rhs: CRUDExpression): EqualityExpression;
export declare function col2(name: string): ColumnExpression;
export declare function col(column: TableColumnMetadata): ColumnExpression;
export declare function eqCol(column: TableColumnMetadata, rhs: CRUDExpression): EqualityExpression;
export declare function neqCol(column: TableColumnMetadata, rhs: CRUDExpression): InEqualityExpression;
export declare function neq(lhs: CRUDExpression, rhs: CRUDExpression): InEqualityExpression;
export declare function not(rhs: CRUDExpression): NotExpression;
export declare function lt(lhs: CRUDExpression, rhs: CRUDExpression): LessThanExpression;
export declare function lte(lhs: CRUDExpression, rhs: CRUDExpression): LessThanEqualExpression;
export declare function gt(lhs: CRUDExpression, rhs: CRUDExpression): GreaterThanExpression;
export declare function gte(lhs: CRUDExpression, rhs: CRUDExpression): GreaterThanEqualExpression;
export declare function inExp(lhs: CRUDExpression, rhs: CRUDExpression[]): InExpression;
export declare function like(lhs: CRUDExpression, wild1: boolean, string: string, wild2: boolean): LikeExpression;
export declare function lazy(expressionProducer: ExpressionProducer): LazyExpression;
export declare function int(int: number): IntegerExpression;
export declare function dec(decimal: number): DecimalExpression;
export declare function str(str: string): StringExpression;
export declare function blob(blob: Uint8Array): BlobExpression;
export declare function sblob(sblob: Int8Array): SBlobExpression;
export declare function bool(bool: boolean): BoolExpression;
export declare function date(date: Date): DateExpression;
export declare function uuid(uuid: string): UUIDExpression;
export declare function nullExp(): NullExpression;
export declare function any(a: any): CRUDExpression;
export {};
