import { GConstructor, CRUDObjectBase } from ".";
import { IDatabaseConnection } from "./database";
import { LimitableMixin } from "./limit";
import { OrderableMixin } from "./order";
import { SelectableMixin } from "./select";
import { WhereableMixin } from "./where";

export interface Joinable {
    join(srcTable: string, srcCol: string, joinTable: string, joinCol: string): Join;
}

export function JoinableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T) {
    return class extends Base implements Joinable {
        join(sourceTable: string, sourceCol: string, joinTable: string, joinCol: string): Join {
            return new Join(this.databaseConnection, sourceTable, sourceCol, joinTable, joinCol);
        }
    };
}

export class Join extends 
        WhereableMixin(
        SelectableMixin(
        JoinableMixin(
        OrderableMixin(
        LimitableMixin(
            CRUDObjectBase))))) {
    constructor(
        databaseConnection: IDatabaseConnection, 
        public sourceTable: string,
        public sourceColumn: string,
        public joinTable: string,
        public joinColumn: string) {
        super(databaseConnection);
    }
}
