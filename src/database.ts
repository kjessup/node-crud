
import { Table } from "./table";

export interface IDatabaseConnection {}

export class Database {
    constructor(public databaseConnection: IDatabaseConnection) {}
    table(name: string): Table {
        return new Table(this.databaseConnection, name);
    }
}
