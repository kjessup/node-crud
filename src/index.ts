
import { CRUDExpression } from "./expression/expression";
import { IDatabaseConnection } from "./database";
// import { Table } from "./table";
// import { Join } from "./join";
// import { Select, Ordering, Limit } from "./select";
// import { Where } from "./where";

export type Expression = CRUDExpression;
export type ExpressionBinding = [string, Expression];
export type Bindings = ExpressionBinding[];

export type GConstructor<T = {}> = new (...args: any[]) => T;

export class CRUDObjectBase {
    constructor(public databaseConnection: IDatabaseConnection) {}
}

export class CRUDCommandBase extends CRUDObjectBase {
    constructor(databaseConnection: IDatabaseConnection) {
        super(databaseConnection);
    }
}

export interface IModelObject {
    
}

export interface TableDesc<O extends IModelObject> {
    table: string;
    pk: string;
}

export interface FieldDesc {
    tableAlias: string;
    fieldName: string;
    alias?: string;
    function?: string;
    distinct?: boolean;
}

export interface SubQueryDesc {
    subQuery: QueryExpression;
    alias: string;
}

export type SelectedField = FieldDesc | SubQueryDesc;

export type Selectable = SelectedField[];

export interface InsertObject {
    columns?: string[]; // An array that represents the specific columns we want to insert into.
    values: any[]; // The values we want to insert into the table (rows of data).
}

export interface UpdateObject {
    set: Record<string, any>; // A collection of column and value pairs to update.
}

export interface JoinDesc {
    sourceTableAlias: string;
    sourceKeyColumn: string;
    joinTableAlias: string;
    joinKeyColumn: string;
    joinSelectColumns: FieldDesc[];
}

export interface QueryExpression extends CRUDExpression {
    tables?: Record<string, TableDesc<IModelObject>>;
    select?: Selectable;
    where?: Expression;
    delete?: Expression;
    insert?: InsertObject;
    update?: UpdateObject;
    join?: JoinDesc[];
}

