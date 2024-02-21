import 'reflect-metadata';
import { AndExpression, BlobExpression, BoolExpression, CRUDBooleanExpression, CRUDExpression, ColumnExpression, ColumnExpression2, DateExpression, DecimalExpression, EqualityExpression, ExpressionProducer, GreaterThanEqualExpression, GreaterThanExpression, InEqualityExpression, InExpression, IntegerExpression, LazyExpression, LessThanEqualExpression, LessThanExpression, LikeExpression, NotExpression, NullExpression, OpExpression, OrExpression, SBlobExpression, StringExpression, UUIDExpression } from "./expression/expression";

export class CRUDSQLGenError extends Error {}
export class CRUDSQLExeError extends Error {}

export type Expression = CRUDExpression;
export type ExpressionBinding = [string, Expression];
export type ObjectBinding = [string, any];
export type Bindings = ObjectBinding[];

export interface IDatabaseConnection {
    sqlGenDelegate(): SQLGenDelegate;
    sqlExeDelegate(forSQL: string): SQLExeDelegate;
    close(): void;
}

export type GConstructor<T = {}> = new (...args: any[]) => T;

export class CRUDObjectBase {
    constructor(public databaseConnection: IDatabaseConnection) { }
    setState(state: SQLGenState) { }
    setSQL(state: SQLGenState) { }
}

export class CRUDFromObjectBase extends CRUDObjectBase {
    constructor(public from: CRUDObjectBase) {
        super(from.databaseConnection);
    }
    setState(state: SQLGenState): void {
        this.from.setState(state);
    }
    setSQL(state: SQLGenState): void {
        this.from.setSQL(state);
    }
}

export class CRUDCommandBase extends CRUDFromObjectBase {
    constructor(from: CRUDObjectBase) {
        super(from);
    }
}

export interface SQLExeDelegate { 
    exe<Shape extends Object>(bindings: ExpressionBinding[]): Promise<Shape[]>;
}

export interface SQLGenDelegate { 
    bindings: ExpressionBinding[];
	getBinding(forExpr: Expression): string;
    quote(identifier: string): string;
}

export enum SQLCommand {
    select, insert, update, delete, count, unknown
}

export type SQLStatement = {
    sql: string;
    bindings: ExpressionBinding[];
}

type SQLColumnLiteral = {
    name: string;
    alias?: string;
}

type SQLColumnExpr = {
    expr: Expression;
    alias: string;
}

export type SQLColumnData = SQLColumnLiteral | SQLColumnExpr;

function fmtCol(state: SQLGenState, table: string, d: SQLColumnData): string {
    if ('expr' in d) {
        return `${d.expr.sqlSnippet(state)} AS ${d.alias}`;
    }
    const t = state.tableData.filter(t => t.tableName == table)[0];
    return `${t.alias}.${d.name === '*' ? d.name : state.delegate.quote(d.name)}${d.alias ? ' AS ' + d.alias : ''}`;
}

export type SQLTableData = {
    tableName: string;
    alias: string;
    selectCols: SQLColumnData[];
    joinData?: SQLJoinData;
}

export type SQLJoinData = {
    joinType: JoinType,
    sourceColumn: string,
    joinTable: string,
    joinColumn: string
}

export type SQLOrdering = {
    by: CRUDExpression;
    direction: OrderDirection;
}

export type SQLLimit = {
    max: number, 
    skip: number
}

export class SQLGenState {
    constructor(public delegate: SQLGenDelegate) { }
    command = SQLCommand.unknown;
    tableData: SQLTableData[] = [];
    whereExpr?: CRUDBooleanExpression;
    accumulatedOrderings: SQLOrdering[] = [];
    currentLimit?: SQLLimit;
    statement: SQLStatement = {sql:'', bindings:[]};
    updateObjects: Object[] = [];

    aliasCounter = 0;

    addTable(tableName: string, selectCols: SQLColumnData[], joinData: SQLJoinData | undefined = undefined) {
        this.tableData.push(
            {tableName, selectCols, alias: this.nextAlias(), joinData})
    }

    private nextAlias(): string {
        return `t${this.aliasCounter++}`;
    }
};

type MasterTable = {
    table: SQLTableData;
    delegate: SQLExeDelegate;
}

function zip<A, B>(a: A[], b: B[]): [A, B][] {
    const length = Math.min(a.length, b.length);
    const zipped: [A, B][] = [];
    for(let i = 0; i < length; i++) {
        zipped.push([a[i], b[i]]);
    }
    return zipped;
}

export class SQLTopExeDelegate implements SQLExeDelegate {
    master: MasterTable;

    constructor(public state: SQLGenState, database: IDatabaseConnection) {
        this.master = {table: state.tableData[0], delegate: database.sqlExeDelegate(state.statement.sql)};
    }
    exe<Shape extends Object>(bindings: ExpressionBinding[]): Promise<Shape[]> {
        return this.master?.delegate.exe(bindings);
    }    
}

export class Database {
    constructor(public databaseConnection: IDatabaseConnection) {}
    table<T extends Object>(table: TableType<T>, columns: SQLColumnData[] = []): TableBase {
        if (columns.length == 0) {
            columns.push({name:'*'});
        }
        return new TableBase(this.databaseConnection, table.tableName, columns);
    }
    async run(statement: string, bindings: ExpressionBinding[] = []): Promise<void> {
        const delegate = this.databaseConnection.sqlExeDelegate(statement);
		await delegate.exe<{}>(bindings);
        return;
    }
    async sql<Shape extends Object>(statement: string, bindings: ExpressionBinding[] = []): Promise<Shape[]> {
        let ret: Shape[] = [];
        const delegate = this.databaseConnection.sqlExeDelegate(statement);
		return await delegate.exe<Shape>(bindings);
    }
    async transaction<Shape>(body: () => Promise<Shape>): Promise<Shape> {
        let ret: Shape | undefined;
        await this.run('BEGIN');
        try {
            ret = await body();
        } catch (error) {
            await this.run('ROLLBACK');
            throw error;
        }
        await this.run('COMMIT');
        return ret!;
    }
    close() {
        this.databaseConnection.close();
    }
}

function handleSet(o: Object): { keys: string[], values: any[] } {
    let keys: string[] = [];
    let values: any[] = [];
    for (let key in o) {
        if (o.hasOwnProperty(key)) {
            keys.push(key);
            values.push((o as any)[key]);
        }
    }
    return { keys, values };
}

// -- new meta
const metadataKey = Symbol('modelMetadata');
const tableMetadataKey = Symbol('tableName');

export type TableColumnMetadata = {
    name: string;
    table: string;
};

type MetaType<T> = {
    readonly [P in keyof T]-?: TableColumnMetadata;
};

export type TableType<T extends Object> = MetaType<T> & {
    tableName: string;
}

export function Table(tableName: string): ClassDecorator {
    return function (constructor: Function) {
        Reflect.defineMetadata(tableMetadataKey, tableName, constructor);
    };
}

export function Column(columnName?: string): PropertyDecorator {
    return function (target: Object, propertyKey: string | symbol) {
        const columnActualName = columnName || propertyKey.toString();
        const existingColumns = Reflect.getMetadata(metadataKey, target.constructor) || {};
        existingColumns[propertyKey] = { name: columnActualName, propertyKey: propertyKey.toString() };
        Reflect.defineMetadata(metadataKey, existingColumns, target.constructor);
    };
}

export function generateMetadata<T extends Object>(target: new () => T): TableType<T> {
    const tableName = Reflect.getMetadata(tableMetadataKey, target) || target.name.toLowerCase();
    const properties: Record<string, any> = Reflect.getMetadata(metadataKey, target) || {};
    const columns: Record<string, TableColumnMetadata> = Object.keys(properties).reduce((acc, propertyKey) => {
        const propertyMetadata = properties[propertyKey];
        acc[propertyKey] = {
            name: propertyMetadata.name || propertyKey, // Assuming there's a 'name' in the metadata; adjust as needed
            table: tableName
        };
        return acc;
    }, {} as Record<string, TableColumnMetadata>);
    return { tableName, ...columns } as TableType<T>;
}

// export function table<T extends Object>(db: Database, table: TableType<T>, columns?: SQLColumnData[]) {
//     return db.table(table.tableName, columns);
// }

// -- 

export class TableBase extends 
        SelectableMixin(
        WhereableMixin(
        JoinableMixin(
        OrderableMixin(
        LimitableMixin(
        InsertableMixin(
            CRUDObjectBase)))))) {
    constructor(
            databaseConnection: IDatabaseConnection, 
            public tableName: string, 
            public columns: SQLColumnData[]) {
        super(databaseConnection);
    }
    setState(state: SQLGenState): void {
        state.addTable(this.tableName, this.columns);
    }
    setSQL(state: SQLGenState): void {
        const { delegate, accumulatedOrderings: orderings, currentLimit: limit } = state;
        state.accumulatedOrderings = [];
        state.currentLimit = undefined;
        state.aliasCounter = 0;

        const t0 = state.tableData[0];
        const tx = Array(...state.tableData).splice(1);
        const aliasMap: any = state.tableData.reduce((obj, item) => {
            return { 
              ...obj, 
              [item.tableName]: item.alias
            };
          }, {});
        const nameQ = delegate.quote(t0.tableName);
        const aliasQ = delegate.quote(t0.alias);

        switch (state.command) {
            case SQLCommand.select:
            case SQLCommand.count: {
                let sqlStr = 
                    `SELECT ${state.tableData.map(t => {
                        return t.selectCols.map(c => fmtCol(state, t.tableName, c)).join(',');
                    }).filter(s => s != '').join(',')} FROM ${nameQ} AS ${aliasQ}`;
                sqlStr += tx.map(t => 
                    `\n${t.joinData?.joinType} JOIN ${delegate.quote(t.tableName)} AS ${t.alias} ON ${t.alias}.${t.joinData?.sourceColumn} = ${aliasMap[t.joinData!.joinTable]}.${t.joinData?.joinColumn}`).join('');
                if (state.whereExpr !== undefined) {
                    sqlStr += 
                    `\nWHERE ${state.whereExpr.sqlSnippet(state)}`;
                }
                if (state.command !== SQLCommand.count) { 
                    if(orderings !== undefined && orderings.length > 0) {
                        sqlStr += 
                        `\nORDER BY ${orderings.map(o => 
                            `${o.by.sqlSnippet(state)}${o.direction == OrderDirection.descending ? ' DESC' : ''}`).join(',')}`;
                    }
                    if (limit !== undefined) {
                        sqlStr += 
                        `\nLIMIT ${limit.max} OFFSET ${limit.skip}`;
                    }
                } else {
                    sqlStr = 
                    `SELECT COUNT(*) AS count FROM (${sqlStr}) AS c`;
                }
                state.statement.sql = sqlStr;
                state.statement.bindings = delegate.bindings;
                break;
            }
            case SQLCommand.update: {
                const kvp = handleSet(state.updateObjects[0] ?? {});

                let sqlStr = 
                    `UPDATE ${nameQ} AS ${aliasQ}\n` +
                    `SET ${zip(kvp.keys, kvp.values.map(o => any(o))).map(
                        o => `${delegate.quote(o[0])} = ${o[1].sqlSnippet(state)}`)}\n`;
                //if (state.whereExpr !== undefined) {
                sqlStr += 
                    `WHERE ${state.whereExpr!.sqlSnippet(state)}`;
                //}
                state.statement.sql = sqlStr;
                state.statement.bindings = delegate.bindings;
                break;
            }
            case SQLCommand.insert: {
                const kvp = handleSet(state.updateObjects[0] || {});
                const sqlStart = `INSERT INTO ${nameQ} AS ${aliasQ} (${kvp.keys.join(',')}) VALUES `;
                const stats = state.updateObjects.map(uo => {
                    const kvp = handleSet(uo);
                    return `(${kvp.values.map(o => any(o).sqlSnippet(state))})`;
                })
                const sqlStr = `${sqlStart}${stats.join(', ')}`;
                state.statement.sql = sqlStr;
                state.statement.bindings = delegate.bindings;
                break;
            }
            case SQLCommand.delete: {
                let sqlStr = 
                    `DELETE FROM ${nameQ} AS ${aliasQ}\n`;
                sqlStr += 
                    `WHERE ${state.whereExpr!.sqlSnippet(state)}`;
                state.statement.sql = sqlStr;
                state.statement.bindings = delegate.bindings;
                break;
            }
            default:
                break;
        }
    }
}

export interface Selectable {
    select<Shape extends Object>(): Select<Shape>;
    first<Shape extends Object>(): Promise<Shape | undefined>;
    count(): Promise<number>;
}

export function SelectableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T) {
    return class extends Base implements Selectable {
        select<Shape extends Object>(): Select<Shape> {
            return new Select(this);
        }
        async first<Shape extends Object>(): Promise<Shape | undefined> {
            const rows = await this.select<Shape>().rows();
            for (let row of rows) {
                return row;
            }
            return undefined;
        }
        async count(): Promise<number> {
            let state = new SQLGenState(this.databaseConnection.sqlGenDelegate());
            state.command = SQLCommand.count;
            this.setState(state);
            this.setSQL(state);
            
            const stat = state.statement.sql;
		    const exeDelegate = this.databaseConnection.sqlExeDelegate(stat);
            const results = await exeDelegate.exe<{count:number}>(state.statement.bindings);
            return results[0].count;
        }
    };
}

export enum OrderDirection {
    ascending = 'ASC', descending = 'DESC'
}

export interface Orderable {
    order(by: CRUDExpression, direction: OrderDirection): Ordering;
}

export function OrderableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T) {
    return class extends Base implements Orderable {
        order(by: CRUDExpression, direction: OrderDirection): Ordering {
            return new Ordering(this, by, direction);
        }
    };
}

export class Ordering extends 
        OrderableMixin(
        JoinableMixin(
        SelectableMixin(
        WhereableMixin(
        LimitableMixin(
            CRUDFromObjectBase))))) {
    constructor(from: CRUDObjectBase, public by: CRUDExpression, public direction: OrderDirection) {
        super(from);
    }
    setState(state: SQLGenState): void {
        state.accumulatedOrderings.push(
            {by: this.by, direction: this.direction});
        super.setState(state);
    }
}

export interface Limitable {
    limit(max: number, skip: number): Limit;
}

export function LimitableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T) {
    return class extends Base implements Limitable {
        limit(max: number, skip: number): Limit {
            return new Limit(this, max, skip);
        }
    };
}

export class Limit extends 
        OrderableMixin(
        JoinableMixin(
        SelectableMixin(
        WhereableMixin(
            CRUDFromObjectBase)))) {
    constructor(from: CRUDObjectBase, public max: number, public skip: number) {
        super(from);
    }
    setState(state: SQLGenState): void {
        super.setState(state);
        state.currentLimit = {max: this.max, skip: this.skip};
    }
}

export enum JoinType {
    inner = '', left = 'LEFT', right = 'RIGHT', full = 'FULL'
}

export interface Joinable {
    join(type: JoinType, srcTable: string, srcCol: string, joinTable: string, joinCol: string, selectCols: SQLColumnData[]): Join;
}

export function JoinableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T) {
    return class extends Base implements Joinable {
        join(joinType: JoinType, 
            sourceTable: string, 
            sourceCol: string, 
            joinTable: string, 
            joinCol: string, 
            selectCols: SQLColumnData[] = [{name:'*'}]): Join {
            return new Join(this, joinType, sourceTable, sourceCol, joinTable, joinCol, selectCols);
        }
    };
}

export class Join extends 
        WhereableMixin(
        SelectableMixin(
        JoinableMixin(
        OrderableMixin(
        LimitableMixin(
            CRUDFromObjectBase))))) {
    constructor(from: CRUDObjectBase, 
        public joinType: JoinType, 
        public sourceTable: string,
        public sourceColumn: string,
        public joinTable: string,
        public joinColumn: string, 
        public selectCols: SQLColumnData[]) {
        super(from);
    }
    setState(state: SQLGenState): void {
        super.setState(state);
        state.addTable(this.sourceTable, this.selectCols, {
            joinType: this.joinType,
            sourceColumn: this.sourceColumn,
            joinTable: this.joinTable,
            joinColumn: this.joinColumn});
    }
}

export interface Whereable {
    where(expr: CRUDExpression): Where;
}

export function WhereableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T) {
    return class extends Base implements Whereable {
        where(expr: CRUDBooleanExpression): Where {
            return new Where(this, expr);
        }
    };
}

export class Where extends 
        LimitableMixin(
        OrderableMixin(
        UpdateableMixin(
        DeleteableMixin(
        SelectableMixin(CRUDFromObjectBase))))) {
    constructor(from: CRUDObjectBase, public expr: CRUDBooleanExpression) {
        super(from);
    }
    setState(state: SQLGenState): void {
        super.setState(state);
        state.whereExpr = this.expr;
    }
}

export interface Deleteable {
    delete(): Promise<Delete>;
}

export function DeleteableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T) {
    return class extends Base implements Deleteable {
        async delete(): Promise<Delete> {
            const d = new Delete(this);
            await d.run();
            return d;
        }
    };
}

export class Delete extends CRUDCommandBase {
    constructor(from: CRUDObjectBase) {
        super(from);
    }
    async run() {
        let state = new SQLGenState(this.databaseConnection.sqlGenDelegate());
        state.command = SQLCommand.delete;
        this.setState(state);
        this.setSQL(state);
        const stat = state.statement
        let exeDelegate = this.databaseConnection.sqlExeDelegate(stat.sql);
        await exeDelegate.exe<{}>(state.delegate.bindings);
    }
}

export interface Updateable {
    update<Shape extends Object>(set: Shape): Promise<Update<Shape>>;
    updateReturning<Shape extends Object, Returning extends Object>(set: Shape): UpdateReturning<Shape, Returning>;
}

export function UpdateableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T) {
    return class extends Base implements Updateable {
        updateReturning<Shape extends Object, Returning extends Object>(set: Shape): UpdateReturning<Shape, Returning> {
            return new UpdateReturning(this, set);
        }
        async update<Shape extends Object>(set: Shape): Promise<Update<Shape>> {
            const u = new Update(this, set);
            await u.run();
            return u;
        }
    };
}

export interface Insertable {
    insert<O extends Object>(...objects: O[]): Promise<Insert>;
    insertReturning<O extends Object, Returning extends Object>(...objects: O[]): InsertReturning<Returning>;
}

export function InsertableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T) {
    return class extends Base implements Insertable {
        insertReturning<O extends Object, Returning extends Object>(...objects: O[]): InsertReturning<Returning> {
            return new InsertReturning(this, objects);
        }
        async insert<O extends Object>(...objects: O[]): Promise<Insert> {
            const i = new Insert(this, objects);
            await i.run();
            return i;
        }
    };
}

export class Select<Shape extends Object> extends CRUDCommandBase {
    constructor(from: CRUDObjectBase) {
        super(from);
    }
    async rows(): Promise<Shape[]> {
        let state = new SQLGenState(this.databaseConnection.sqlGenDelegate());
        state.command = SQLCommand.select;
        this.setState(state);
        this.setSQL(state);
        if (state.accumulatedOrderings.length != 0) {
            throw new CRUDSQLGenError(`Orderings were not consumed: ${state.accumulatedOrderings}`)
        }
        const gen = new SQLTopExeDelegate(state, this.databaseConnection);
        return await gen.exe<Shape>(state.delegate.bindings ?? []);
    }
}

// TODO: updated row count
export class Update<Shape extends Object> extends CRUDCommandBase {
    constructor(from: CRUDObjectBase, public set: Shape) {
        super(from);
    }
    async run() {
        let state = new SQLGenState(this.databaseConnection.sqlGenDelegate());
        state.command = SQLCommand.update;
        state.updateObjects.push(this.set);
        this.setState(state);
        this.setSQL(state);
        const stat = state.statement
        let exeDelegate = this.databaseConnection.sqlExeDelegate(stat.sql);
        await exeDelegate.exe<{}>(state.delegate.bindings);
    }
}

export class UpdateReturning<Shape extends Object, Returning extends Object> extends CRUDCommandBase {
    constructor(from: CRUDObjectBase, public set: Shape) {
        super(from);
    }
    setSQL(state: SQLGenState): void {
        this.from.setSQL(state);
        state.statement.sql += `\nRETURNING *`;
    }
    async rows(): Promise<Returning[]> {
        const delegate = this.databaseConnection.sqlGenDelegate();
        let state = new SQLGenState(delegate);
        state.command = SQLCommand.update;
        state.updateObjects.push(this.set);
        this.setState(state);
        this.setSQL(state);
        const gen = new SQLTopExeDelegate(state, this.databaseConnection);
        return await gen.exe<Returning>(state.delegate.bindings ?? []);
    }
    async first(): Promise<Returning> {
        const r = await this.rows();
        return r[0];
    }
}

export class Insert extends CRUDCommandBase {
    constructor(from: CRUDObjectBase, public objects: Object[]) {
        super(from);
    }
    async run() {
        const delegate = this.databaseConnection.sqlGenDelegate();
        let state = new SQLGenState(delegate);
        state.command = SQLCommand.insert;
        state.updateObjects.push(...this.objects);
        this.setState(state);
        this.setSQL(state);
        const stat = state.statement
        let exeDelegate = this.databaseConnection.sqlExeDelegate(stat.sql);
        await exeDelegate.exe<{}>(state.delegate.bindings);
    }
}

export class InsertReturning<Returning extends Object> extends CRUDCommandBase {
    constructor(from: CRUDObjectBase, public objects: Object[]) {
        super(from);
    }
    setSQL(state: SQLGenState): void {
        this.from.setSQL(state);
        state.statement.sql += ` RETURNING *`;
    }
    async rows(): Promise<Returning[]> {
        const delegate = this.databaseConnection.sqlGenDelegate();
        let state = new SQLGenState(delegate);
        state.command = SQLCommand.insert;
        state.updateObjects.push(...this.objects);
        this.setState(state);
        this.setSQL(state);
        const gen = new SQLTopExeDelegate(state, this.databaseConnection);
        return await gen.exe<Returning>(state.delegate.bindings ?? []);
    }
    async first(): Promise<Returning> {
        const r = await this.rows();
        return r[0];
    }
}

// -------

// Helper for CRUDBooleanExpression
export function op(op: string, lhs: CRUDExpression, rhs: CRUDExpression): OpExpression {
    return new OpExpression(op, lhs, rhs);
}

export function and(lhs: CRUDExpression, rhs: CRUDExpression, ...rest: CRUDExpression[]): AndExpression {
    return new AndExpression(lhs, rhs, ...rest);
}

export function or(lhs: CRUDExpression, rhs: CRUDExpression, ...rest: CRUDExpression[]): OrExpression {
    return new OrExpression(lhs, rhs, ...rest);
}

export function eq(lhs: CRUDExpression, rhs: CRUDExpression): EqualityExpression {
    return new EqualityExpression(lhs, rhs);
}

export function col2(name: string): ColumnExpression {
    return new ColumnExpression(name);
}

export function col(column: TableColumnMetadata): ColumnExpression {
    return new ColumnExpression2(column.table, column.name);
}

export function eqCol(column: TableColumnMetadata, rhs: CRUDExpression): EqualityExpression {
    return new EqualityExpression(col(column), rhs);
}

export function neqCol(column: TableColumnMetadata, rhs: CRUDExpression): InEqualityExpression {
    return new InEqualityExpression(col(column), rhs);
}

export function neq(lhs: CRUDExpression, rhs: CRUDExpression): InEqualityExpression {
    return new InEqualityExpression(lhs, rhs);
}

export function not(rhs: CRUDExpression): NotExpression {
    return new NotExpression(rhs);
}

export function lt(lhs: CRUDExpression, rhs: CRUDExpression): LessThanExpression {
    return new LessThanExpression(lhs, rhs);
}

export function lte(lhs: CRUDExpression, rhs: CRUDExpression): LessThanEqualExpression {
    return new LessThanEqualExpression(lhs, rhs);
}

export function gt(lhs: CRUDExpression, rhs: CRUDExpression): GreaterThanExpression {
    return new GreaterThanExpression(lhs, rhs);
}

export function gte(lhs: CRUDExpression, rhs: CRUDExpression): GreaterThanEqualExpression {
    return new GreaterThanEqualExpression(lhs, rhs);
}

export function inExp(lhs: CRUDExpression, rhs: CRUDExpression[]): InExpression {
    return new InExpression(lhs, rhs);
}

export function like(lhs: CRUDExpression, wild1: boolean, string: string, wild2: boolean): LikeExpression {
    return new LikeExpression(lhs, wild1, string, wild2);
}

export function lazy(expressionProducer: ExpressionProducer): LazyExpression {
    return new LazyExpression(expressionProducer);
}

// Helper for CRUDExpression
export function int(int: number): IntegerExpression {
    return new IntegerExpression(int);
}

export function dec(decimal: number): DecimalExpression {
    return new DecimalExpression(decimal);
}

export function str(str: string): StringExpression {
    return new StringExpression(str);
}

export function blob(blob: Uint8Array): BlobExpression {
    return new BlobExpression(blob);
}

export function sblob(sblob: Int8Array): SBlobExpression {
    return new SBlobExpression(sblob);
}

export function bool(bool: boolean): BoolExpression {
    return new BoolExpression(bool);
}

export function date(date: Date): DateExpression {
    return new DateExpression(date);
}

export function uuid(uuid: string): UUIDExpression {
    return new UUIDExpression(uuid);
}

export function nullExp(): NullExpression {
    return new NullExpression();
}

export function any(a: any): CRUDExpression {
    switch (typeof a) {
        case 'number':
            //javascript does not have an inbuilt method to check if the number is integer or float
            //checking if it is a float or integer
            return Number(a) === a && a % 1 !== 0 ? dec(a) : int(a);
        case 'string':
            return str(a);
        case 'boolean':
            return bool(a);
        case 'object':
            if(a instanceof Date) {
                return date(a);
            } else if(a instanceof Uint8Array) {
                return blob(a);
            } else if (a instanceof Int8Array) {
                return sblob(a);
            }
            return str(JSON.stringify(a));
        case 'undefined':
        case 'function':
            return nullExp();
        default:
            throw new Error(`Unknown type ${typeof a}`);
    }
}


