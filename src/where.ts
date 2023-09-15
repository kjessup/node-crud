import { GConstructor, CRUDObjectBase } from ".";
import { IDatabaseConnection } from "./database";
import { CRUDExpression } from "./expression/expression";
import { SelectableMixin } from "./select";

export interface Whereable {
    where(expr: CRUDExpression): Where;
}

export function WhereableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T) {
    return class extends Base implements Whereable {
        where(expr: CRUDExpression): Where {
            return new Where(this.databaseConnection);
        }
    };
}

export class Where extends SelectableMixin(CRUDObjectBase) {
    constructor(
        databaseConnection: IDatabaseConnection) {
            super(databaseConnection);
        }
}
