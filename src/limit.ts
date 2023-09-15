import { dir } from "console";
import { GConstructor, CRUDObjectBase } from ".";
import { IDatabaseConnection } from "./database";
import { JoinableMixin } from "./join";
import { SelectableMixin } from "./select";
import { WhereableMixin } from "./where";
import { OrderableMixin } from "./order";

export interface Limitable {
    limit(max: number, skip: number): Limit;
}

export function LimitableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T) {
    return class extends Base implements Limitable {
        limit(max: number, skip: number): Limit {
            return new Limit(this.databaseConnection, max, skip);
        }
    };
}

export class Limit extends 
        OrderableMixin(
        JoinableMixin(
        SelectableMixin(
        WhereableMixin(
            CRUDObjectBase)))) {
    constructor(
        databaseConnection: IDatabaseConnection, public max: number, public skip: number) {
            super(databaseConnection);
        }
}
