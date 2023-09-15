import { GConstructor, CRUDObjectBase, CRUDCommandBase } from ".";
import { IDatabaseConnection } from "./database";

export interface Deleteable {
    delete(): Delete;
}

export function DeleteableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T) {
    return class extends Base implements Deleteable {
        delete(): Delete {
            return new Delete(this.databaseConnection);
        }
    };
}

export class Delete extends CRUDCommandBase {
    constructor(
        databaseConnection: IDatabaseConnection) {
            super(databaseConnection);
        }
}
