
import { CRUDBooleanExpression, CRUDExpression } from "./expression/expression";

export class CRUDSQLGenError extends Error {}
export class CRUDSQLExeError extends Error {}

export type Expression = CRUDExpression;
export type ExpressionBinding = [string, Expression];
export type ObjectBinding = [string, any];
export type Bindings = ObjectBinding[];

export interface IDatabaseConnection {
    sqlGenDelegate: SQLGenDelegate;
    sqlExeDelegate(forSQL: string): SQLExeDelegate;
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
    sqlGenState?: SQLGenState;
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

export type SQLTableData = {
    tableName: string;
    alias: string;
    joinData?: SQLJoinData;
}

export type SQLJoinData = {
    sourceColumn: string,
    joinTable: string,
    joinColumn: string
}

export type SQLOrdering = {
    byTable: string;
    byColumn: string;
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

    private aliasCounter = 0;

    addTable(tableName: string, joinData: SQLJoinData | undefined = undefined) {
        this.tableData.push(
            {tableName, alias: this.nextAlias(), joinData})
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
    table(name: string): Table {
        return new Table(this.databaseConnection, name);
    }
    async run(statement: string, bindings: ExpressionBinding[]): Promise<void> {
        const delegate = this.databaseConnection.sqlExeDelegate(statement);
		await delegate.exe<{}>(bindings);
        return;
    }
    async sql<Shape extends Object>(statement: string, bindings: ExpressionBinding[]): Promise<Shape[]> {
        let ret: Shape[] = [];
        const delegate = this.databaseConnection.sqlExeDelegate(statement);
		return await delegate.exe<Shape>(bindings);
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

export class Table extends 
        SelectableMixin(
        WhereableMixin(
        JoinableMixin(
        OrderableMixin(
        UpdateableMixin(
        DeleteableMixin(
        LimitableMixin(
        InsertableMixin(
            CRUDObjectBase)))))))) {
    constructor(databaseConnection: IDatabaseConnection, public tableName: string) {
        super(databaseConnection);
    }
    setState(state: SQLGenState): void {
        state.addTable(this.tableName);
    }
    setSQL(state: SQLGenState): void {
        const { delegate, accumulatedOrderings: orderings, currentLimit: limit } = state;
        state.accumulatedOrderings = [];
        const t0 = state.tableData[0];
        const tx = state.tableData.splice(1);
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
                    `SELECT ${state.tableData.map(t => `${t.alias}.*`).join(',')} FROM ${nameQ} AS ${aliasQ}`;
                sqlStr += tx.map(t => 
                    `\nJOIN ${delegate.quote(t.tableName)} AS ${t.alias} ON ${t.alias}.${t.joinData?.sourceColumn} = ${aliasMap[t.joinData!.joinTable]}.${t.joinData?.joinColumn}`).join('');
                if (state.whereExpr !== undefined) {
                    sqlStr += 
                    `\nWHERE ${state.whereExpr.sqlSnippet(state)}`;
                }
                if (state.command !== SQLCommand.count) { 
                    if(orderings !== undefined && orderings.length > 0) {
                        sqlStr += 
                        `\nORDER BY ${orderings.map(o => 
                            `${aliasMap[o.byTable]}.${delegate.quote(o.byColumn)}${o.direction == OrderDirection.descending ? ' DESC' : ''}`).join(',')}`;
                    }
                    if (limit !== undefined) {
                        sqlStr += 
                        `\nLIMIT ${limit.max} OFFSET ${limit.skip}`;
                    }
                } else {
                    sqlStr = 
                    `SELECT COUNT(*) AS count FROM (${sqlStr})`;
                }
                state.statement.sql = sqlStr;
                state.statement.bindings = delegate.bindings;
                break;
            }
            case SQLCommand.update: {
                const kvp = handleSet(state.updateObjects ?? {});

                let sqlStr = 
                    `UPDATE ${nameQ}\n` +
                    `SET ${zip(kvp.keys, delegate.bindings.map(e => e[0])).map(o => `${o[0]} = ${o[1]}`)}\n`
                //if (state.whereExpr !== undefined) {
                    sqlStr += 
                    `WHERE ${state.whereExpr!.sqlSnippet(state)}`;
                //}
                state.statement.sql = sqlStr;
                state.statement.bindings = delegate.bindings;
                break;
            }
            case SQLCommand.insert: {
                const kvp = handleSet(state.updateObjects ?? {});

                let sqlStr = 
                    `INSERT INTO ${nameQ}\n`+ 
                    `(${kvp.keys.join(',')}) VALUES (${delegate.bindings.map(e => e[0])})\n`;
                //if (state.whereExpr !== undefined) {
                    sqlStr += 
                    `WHERE ${state.whereExpr!.sqlSnippet(state)}`;
                //}
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
            let state = new SQLGenState(this.databaseConnection.sqlGenDelegate);
            state.command = SQLCommand.count;
            this.setState(state);
            this.setSQL(state);
            
            const stat = state.statement.sql;
		    const exeDelegate = this.databaseConnection.sqlExeDelegate(stat);
            const results = await exeDelegate.exe<{count:number}>([]);
            return results[0].count;
        }
    };
}

export enum OrderDirection {
    ascending, descending
}

export interface Orderable {
    order(byTable: string, byColumn: string, direction: OrderDirection): Ordering;
}

export function OrderableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T) {
    return class extends Base implements Orderable {
        order(byTable: string, byColumn: string, direction: OrderDirection): Ordering {
            return new Ordering(this, byTable, byColumn, direction);
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
    constructor(from: CRUDObjectBase, public byTable: string, public byColumn: string, public direction: OrderDirection) {
        super(from);
    }
    setSQL(state: SQLGenState): void {
        state.accumulatedOrderings.push(
            {byTable: this.byTable, byColumn: this.byColumn, direction: this.direction});
        super.setSQL(state);
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
    setSQL(state: SQLGenState): void {
        state.currentLimit = {max: this.max, skip: this.skip};
        super.setSQL(state);
    }
}

export interface Joinable {
    join(srcTable: string, srcCol: string, joinTable: string, joinCol: string): Join;
}

export function JoinableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T) {
    return class extends Base implements Joinable {
        join(sourceTable: string, sourceCol: string, joinTable: string, joinCol: string): Join {
            return new Join(this, sourceTable, sourceCol, joinTable, joinCol);
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
        public sourceTable: string,
        public sourceColumn: string,
        public joinTable: string,
        public joinColumn: string) {
        super(from);
    }
    setState(state: SQLGenState): void {
        super.setState(state);
        state.addTable(this.sourceTable, {
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

export class Where extends SelectableMixin(CRUDFromObjectBase) {
    constructor(from: CRUDObjectBase, public expr: CRUDBooleanExpression) {
        super(from);
    }
    setState(state: SQLGenState): void {
        super.setState(state);
        state.whereExpr = this.expr;
    }
}

export interface Deleteable {
    delete(): Delete;
}

export function DeleteableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T) {
    return class extends Base implements Deleteable {
        delete(): Delete {
            return new Delete(this);
        }
    };
}

export class Delete extends CRUDCommandBase {
    constructor(from: CRUDObjectBase) {
        super(from);
        const delegate = this.databaseConnection.sqlGenDelegate;
        let state = new SQLGenState(delegate);
        state.command = SQLCommand.delete;
        this.setState(state);
        this.setSQL(state);
        this.sqlGenState = state;
        const stat = state.statement
        let exeDelegate = this.databaseConnection.sqlExeDelegate(stat.sql);
        exeDelegate.exe<{}>(state.delegate.bindings);
    }
}

export interface Updateable {
    update<Shape extends Object>(set: Shape): Update<Shape>;
    updateReturning<Shape extends Object, Returning extends Object>(set: Shape): UpdateReturning<Shape, Returning>;
}

export function UpdateableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T) {
    return class extends Base implements Updateable {
        updateReturning<Shape extends Object, Returning extends Object>(set: Shape): UpdateReturning<Shape, Returning> {
            return new UpdateReturning(this, set);
        }
        update<Shape extends Object>(set: Shape): Update<Shape> {
            return new Update(this, set);
        }
    };
}

export interface Insertable {
    insert<O extends Object>(): Insert;
    insertReturning<O extends Object, Returning extends Object>(): InsertReturning<Returning>;
}

export function InsertableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T) {
    return class extends Base implements Insertable {
        insertReturning<O extends Object, Returning extends Object>(...objects: O[]): InsertReturning<Returning> {
            throw new InsertReturning(this, objects);
        }
        insert<O extends Object>(...objects: O[]): Insert {
            return new Insert(this, objects);
        }
    };
}

export class Select<Shape extends Object> extends CRUDCommandBase {
    constructor(from: CRUDObjectBase) {
        super(from);
        let state = new SQLGenState(this.databaseConnection.sqlGenDelegate);
        state.command = SQLCommand.select;
        this.setState(state);
        this.setSQL(state);
        if (state.accumulatedOrderings.length != 0) {
            throw new CRUDSQLGenError(`Orderings were not consumed: ${state.accumulatedOrderings}`)
        }
        this.sqlGenState = state;
    }
    async rows(): Promise<Shape[]> {
        const gen = new SQLTopExeDelegate(this.sqlGenState!, this.databaseConnection);
        return await gen.exe<Shape>(this.sqlGenState?.delegate.bindings ?? []);
    }
}

// TODO: updated row count
export class Update<Shape extends Object> extends CRUDCommandBase {
    constructor(from: CRUDObjectBase, public set: Shape) {
        super(from);
        const delegate = this.databaseConnection.sqlGenDelegate;
        let state = new SQLGenState(delegate);
        state.command = SQLCommand.update;
        state.updateObjects.push(set);
        this.setState(state);
        this.setSQL(state);
        this.sqlGenState = state;
        const stat = state.statement
        let exeDelegate = this.databaseConnection.sqlExeDelegate(stat.sql);
        exeDelegate.exe<{}>(state.delegate.bindings);
    }
}

export class UpdateReturning<Shape extends Object, Returning extends Object> extends CRUDCommandBase {
    constructor(from: CRUDObjectBase, public set: Shape) {
        super(from);
        const delegate = this.databaseConnection.sqlGenDelegate;
        let state = new SQLGenState(delegate);
        state.command = SQLCommand.update;
        state.updateObjects.push(set);
        this.setState(state);
        this.setSQL(state);
        this.sqlGenState = state;
    }
    setSQL(state: SQLGenState): void {
        this.from.setSQL(state);
        state.statement.sql += `\nRETURNING *`;
    }
    async rows(): Promise<Returning[]> {
        const gen = new SQLTopExeDelegate(this.sqlGenState!, this.databaseConnection);
        return await gen.exe<Returning>(this.sqlGenState?.delegate.bindings ?? []);
    }
}

export class Insert extends CRUDCommandBase {
    constructor(from: CRUDObjectBase, objects: Object[]) {
        super(from);
        const delegate = this.databaseConnection.sqlGenDelegate;
        let state = new SQLGenState(delegate);
        state.command = SQLCommand.insert;
        state.updateObjects.push(objects);
        this.setState(state);
        this.setSQL(state);
        this.sqlGenState = state;
        const stat = state.statement
        let exeDelegate = this.databaseConnection.sqlExeDelegate(stat.sql);
        exeDelegate.exe<{}>(state.delegate.bindings);
    }
}

export class InsertReturning<Returning extends Object> extends CRUDCommandBase {
    constructor(from: CRUDObjectBase, objects: Object[]) {
        super(from);
        const delegate = this.databaseConnection.sqlGenDelegate;
        let state = new SQLGenState(delegate);
        state.command = SQLCommand.insert;
        state.updateObjects.push(objects);
        this.setState(state);
        this.setSQL(state);
        this.sqlGenState = state;
    }
    setSQL(state: SQLGenState): void {
        this.from.setSQL(state);
        state.statement.sql += `\nRETURNING *`;
    }
    async rows(): Promise<Returning[]> {
        const gen = new SQLTopExeDelegate(this.sqlGenState!, this.databaseConnection);
        return await gen.exe<Returning>(this.sqlGenState?.delegate.bindings ?? []);
    }
}
