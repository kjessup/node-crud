import { GConstructor, CRUDObjectBase, CRUDCommandBase } from ".";
import { IDatabaseConnection } from "./database";

export interface Insertable {
    insert(): Insert;
}

export function InsertableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T) {
    return class extends Base implements Insertable {
        insert(): Insert {
            return new Insert(this.databaseConnection);
        }
    };
}

export class Insert extends CRUDCommandBase {
    constructor(
        databaseConnection: IDatabaseConnection) {
            super(databaseConnection);
        }
}
