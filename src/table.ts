
import { CRUDObjectBase } from ".";
import { IDatabaseConnection } from "./database";
import { DeleteableMixin } from "./delete";
import { InsertableMixin } from "./insert";
import { JoinableMixin } from "./join";
import { LimitableMixin } from "./limit";
import { OrderableMixin } from "./order";
import { SelectableMixin } from "./select";
import { UpdateableMixin } from "./update";
import { WhereableMixin } from "./where";

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
    constructor(databaseConnection: IDatabaseConnection, public name: string) {
        super(databaseConnection);
    }
}
