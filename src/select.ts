import { GConstructor, CRUDObjectBase, CRUDCommandBase } from ".";
import { IDatabaseConnection } from "./database";
import { JoinableMixin } from "./join";

export interface Selectable {
    select(): Select;
    count(): number;
}

export function SelectableMixin<T extends GConstructor<CRUDObjectBase>>(Base: T) {
    return class extends Base implements Selectable {
        select(): Select {
            return new Select(this.databaseConnection);
        }
        count(): number {
            return 0;
        }
    };
}

export class Select extends CRUDCommandBase {
    constructor(
        databaseConnection: IDatabaseConnection) {
            super(databaseConnection);
        }
}
