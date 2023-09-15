import { GConstructor, CRUDObjectBase, CRUDCommandBase } from ".";
import { IDatabaseConnection } from "./database";

export interface Updateable {
    update(): Update;
}

export function UpdateableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T) {
    return class extends Base implements Updateable {
        update(): Update {
            return new Update(this.databaseConnection);
        }
    };
}

export class Update extends CRUDCommandBase {
    constructor(
        databaseConnection: IDatabaseConnection) {
            super(databaseConnection);
        }
}
