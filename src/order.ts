import { dir } from "console";
import { GConstructor, CRUDObjectBase } from ".";
import { IDatabaseConnection } from "./database";
import { JoinableMixin } from "./join";
import { SelectableMixin } from "./select";
import { WhereableMixin } from "./where";
import { LimitableMixin } from "./limit";

export enum OrderDirection {
    ascending, descending
}

export interface Orderable {
    order(by: string, direction: OrderDirection): Ordering;
}

export function OrderableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T) {
    return class extends Base implements Orderable {
        order(by: string, direction: OrderDirection): Ordering {
            return new Ordering(this.databaseConnection, by, direction);
        }
    };
}

export class Ordering extends 
        OrderableMixin(
        JoinableMixin(
        SelectableMixin(
        WhereableMixin(
        LimitableMixin(
            CRUDObjectBase))))) {
    constructor(
        databaseConnection: IDatabaseConnection, public by: string, public direction: OrderDirection) {
            super(databaseConnection);
        }
}
