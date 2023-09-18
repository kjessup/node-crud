
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
    by: string;
    desc: boolean;
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
            case SQLCommand.select, SQLCommand.count: {
                const sqlStr = 
                    `SELECT ${state.tableData.map(t => `${t.alias}.*`).join(',')} 
                    FROM ${nameQ} AS ${aliasQ}`;
                const joinStr = 
                    [' ', ...tx.map(t => 
                    `JOIN ${t.tableName} AS ${t.alias} 
                        ON ${t.alias}.${t.joinData?.sourceColumn} = ${aliasMap[t.joinData!.joinTable]}.${t.joinData?.joinColumn}`)].join('\n');
                if (state.whereExpr != undefined) {

                }
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

export enum OrderDirection {
    ascending, descending
}

export interface Orderable {
    order(by: string, direction: OrderDirection): Ordering;
}

export function OrderableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T) {
    return class extends Base implements Orderable {
        order(by: string, direction: OrderDirection): Ordering {
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
    constructor(from: CRUDObjectBase, public by: string, public direction: OrderDirection) {
        super(from);
    }
    setSQL(state: SQLGenState): void {
        state.accumulatedOrderings.push(
            {by: this.by, desc: this.direction == OrderDirection.descending});
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

export interface Updateable {
    update(): Update;
}

export function UpdateableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T) {
    return class extends Base implements Updateable {
        update(): Update {
            return new Update(this);
        }
    };
}

export class Update extends CRUDCommandBase {
    constructor(from: CRUDObjectBase) {
            super(from);
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

export interface Insertable {
    insert(): Insert;
}

export function InsertableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T) {
    return class extends Base implements Insertable {
        insert(): Insert {
            return new Insert(this);
        }
    };
}

export class Insert extends CRUDCommandBase {
    constructor(from: CRUDObjectBase) {
            super(from);
        }
}
