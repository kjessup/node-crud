"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsertReturning = exports.Insert = exports.UpdateReturning = exports.Update = exports.Select = exports.Delete = exports.Where = exports.Join = exports.JoinType = exports.Limit = exports.Ordering = exports.OrderDirection = exports.TableBase = exports.Database = exports.SQLTopExeDelegate = exports.SQLGenState = exports.SQLCommand = exports.CRUDCommandBase = exports.CRUDFromObjectBase = exports.CRUDObjectBase = exports.CRUDSQLExeError = exports.CRUDSQLGenError = void 0;
exports.Table = Table;
exports.Column = Column;
exports.generateMetadata = generateMetadata;
exports.SelectableMixin = SelectableMixin;
exports.OrderableMixin = OrderableMixin;
exports.LimitableMixin = LimitableMixin;
exports.JoinableMixin = JoinableMixin;
exports.WhereableMixin = WhereableMixin;
exports.DeleteableMixin = DeleteableMixin;
exports.UpdateableMixin = UpdateableMixin;
exports.InsertableMixin = InsertableMixin;
exports.op = op;
exports.and = and;
exports.or = or;
exports.eq = eq;
exports.col2 = col2;
exports.col = col;
exports.eqCol = eqCol;
exports.neqCol = neqCol;
exports.neq = neq;
exports.not = not;
exports.lt = lt;
exports.lte = lte;
exports.gt = gt;
exports.gte = gte;
exports.inExp = inExp;
exports.like = like;
exports.lazy = lazy;
exports.int = int;
exports.dec = dec;
exports.str = str;
exports.blob = blob;
exports.sblob = sblob;
exports.bool = bool;
exports.date = date;
exports.uuid = uuid;
exports.nullExp = nullExp;
exports.any = any;
require("reflect-metadata");
const expression_1 = require("./expression/expression");
class CRUDSQLGenError extends Error {
}
exports.CRUDSQLGenError = CRUDSQLGenError;
class CRUDSQLExeError extends Error {
}
exports.CRUDSQLExeError = CRUDSQLExeError;
class CRUDObjectBase {
    constructor(databaseConnection) {
        this.databaseConnection = databaseConnection;
    }
    setState(state) { }
    setSQL(state) { }
}
exports.CRUDObjectBase = CRUDObjectBase;
class CRUDFromObjectBase extends CRUDObjectBase {
    constructor(from) {
        super(from.databaseConnection);
        this.from = from;
    }
    setState(state) {
        this.from.setState(state);
    }
    setSQL(state) {
        this.from.setSQL(state);
    }
}
exports.CRUDFromObjectBase = CRUDFromObjectBase;
class CRUDCommandBase extends CRUDFromObjectBase {
    constructor(from) {
        super(from);
    }
}
exports.CRUDCommandBase = CRUDCommandBase;
var SQLCommand;
(function (SQLCommand) {
    SQLCommand[SQLCommand["select"] = 0] = "select";
    SQLCommand[SQLCommand["insert"] = 1] = "insert";
    SQLCommand[SQLCommand["update"] = 2] = "update";
    SQLCommand[SQLCommand["delete"] = 3] = "delete";
    SQLCommand[SQLCommand["count"] = 4] = "count";
    SQLCommand[SQLCommand["min"] = 5] = "min";
    SQLCommand[SQLCommand["max"] = 6] = "max";
    SQLCommand[SQLCommand["avg"] = 7] = "avg";
    SQLCommand[SQLCommand["unknown"] = 8] = "unknown";
})(SQLCommand || (exports.SQLCommand = SQLCommand = {}));
function fmtCol(state, table, d) {
    if ('expr' in d) {
        return `${d.expr.sqlSnippet(state)} AS ${d.alias}`;
    }
    const t = state.tableData.filter(t => t.tableName == table)[0];
    return `${t.alias}.${d.name === '*' ? d.name : state.delegate.quote(d.name)}${d.alias ? ' AS ' + d.alias : ''}`;
}
class SQLGenState {
    constructor(delegate) {
        this.delegate = delegate;
        this.command = SQLCommand.unknown;
        this.tableData = [];
        this.accumulatedOrderings = [];
        this.statement = { sql: '', bindings: [] };
        this.updateObjects = [];
        this.aliasCounter = 0;
    }
    addTable(tableName, selectCols, joinData = undefined) {
        this.tableData.push({ tableName, selectCols, alias: this.nextAlias(), joinData });
    }
    nextAlias() {
        return `t${this.aliasCounter++}`;
    }
}
exports.SQLGenState = SQLGenState;
;
function zip(a, b) {
    const length = Math.min(a.length, b.length);
    const zipped = [];
    for (let i = 0; i < length; i++) {
        zipped.push([a[i], b[i]]);
    }
    return zipped;
}
class SQLTopExeDelegate {
    constructor(state, database) {
        this.state = state;
        this.master = { table: state.tableData[0], delegate: database.sqlExeDelegate(state.statement.sql) };
    }
    exe(bindings) {
        return this.master?.delegate.exe(bindings);
    }
}
exports.SQLTopExeDelegate = SQLTopExeDelegate;
class Database {
    constructor(databaseConnection) {
        this.databaseConnection = databaseConnection;
    }
    table(table, ...columns) {
        if (columns.length == 0) {
            columns.push({ name: '*' });
        }
        return new TableBase(this.databaseConnection, table.tableName, columns);
    }
    async run(statement, ...bindings) {
        const delegate = this.databaseConnection.sqlExeDelegate(statement);
        await delegate.exe(bindings);
        return;
    }
    async sql(statement, ...bindings) {
        const delegate = this.databaseConnection.sqlExeDelegate(statement);
        return await delegate.exe(bindings);
    }
    async q(parts, ...values) {
        let text = '';
        const bindValues = [];
        // Iterate through the parts of the template string
        parts.forEach((part, index) => {
            text += part; // Add the current static part to the text
            if (index < values.length) {
                bindValues.push(values[index]); // Push the current value to the bindValues array
                text += `$${index + 1}`; // Add the parameter marker to the text
            }
        });
        return await this.sql(text, ...bindValues);
    }
    async transaction(body) {
        let ret;
        await this.run('BEGIN');
        try {
            ret = await body();
        }
        catch (error) {
            await this.run('ROLLBACK');
            throw error;
        }
        await this.run('COMMIT');
        return ret;
    }
    close() {
        this.databaseConnection.close();
    }
}
exports.Database = Database;
function handleSet(o) {
    let keys = [];
    let values = [];
    for (let key in o) {
        if (o.hasOwnProperty(key)) {
            keys.push(key);
            values.push(o[key]);
        }
    }
    return { keys, values };
}
// -- new meta
const metadataKey = Symbol('modelMetadata');
const tableMetadataKey = Symbol('tableName');
function Table(tableName) {
    return function (constructor) {
        Reflect.defineMetadata(tableMetadataKey, tableName, constructor);
    };
}
function Column(columnName) {
    return function (target, propertyKey) {
        const columnActualName = columnName || propertyKey.toString();
        const existingColumns = Reflect.getMetadata(metadataKey, target.constructor) || {};
        existingColumns[propertyKey] = { name: columnActualName, propertyKey: propertyKey.toString() };
        Reflect.defineMetadata(metadataKey, existingColumns, target.constructor);
    };
}
function generateMetadata(target) {
    const tableName = Reflect.getMetadata(tableMetadataKey, target) || target.name.toLowerCase();
    const properties = Reflect.getMetadata(metadataKey, target) || {};
    const columns = Object.keys(properties).reduce((acc, propertyKey) => {
        const propertyMetadata = properties[propertyKey];
        acc[propertyKey] = {
            name: propertyMetadata.name || propertyKey, // Assuming there's a 'name' in the metadata; adjust as needed
            table: tableName
        };
        return acc;
    }, {});
    return { tableName, ...columns };
}
// -- 
class TableBase extends SelectableMixin(WhereableMixin(JoinableMixin(OrderableMixin(LimitableMixin(InsertableMixin(CRUDObjectBase)))))) {
    constructor(databaseConnection, tableName, columns) {
        super(databaseConnection);
        this.tableName = tableName;
        this.columns = columns;
    }
    setState(state) {
        state.addTable(this.tableName, this.columns);
    }
    setSQL(state) {
        const { delegate, accumulatedOrderings: orderings, currentLimit: limit } = state;
        state.accumulatedOrderings = [];
        state.currentLimit = undefined;
        state.aliasCounter = 0;
        const t0 = state.tableData[0];
        const tx = Array(...state.tableData).splice(1);
        const aliasMap = state.tableData.reduce((obj, item) => {
            return {
                ...obj,
                [item.tableName]: item.alias
            };
        }, {});
        const nameQ = delegate.quote(t0.tableName);
        const aliasQ = delegate.quote(t0.alias);
        const whereClauseF = () => (state.whereExpr !== undefined) ? `\nWHERE ${state.whereExpr.sqlSnippet(state)}` : '';
        const orderClauseF = () => (orderings !== undefined && orderings.length > 0) ? `\nORDER BY ${orderings.map(o => `${o.by.sqlSnippet(state)}${o.direction == OrderDirection.descending ? ' DESC' : ''}`).join(',')}` : '';
        const limitClauseF = () => (limit !== undefined) ? `\nLIMIT ${limit.max} OFFSET ${limit.skip}` : '';
        switch (state.command) {
            case SQLCommand.select: {
                let sqlStr = `SELECT ${state.tableData.map(t => {
                    return t.selectCols.map(c => fmtCol(state, t.tableName, c)).join(',');
                }).filter(s => s != '').join(',')} FROM ${nameQ} AS ${aliasQ}`;
                sqlStr += tx.map(t => `\n${t.joinData?.joinType} JOIN ${delegate.quote(t.tableName)} AS ${t.alias} ON ${t.alias}.${t.joinData?.sourceColumn} = ${aliasMap[t.joinData.joinTable]}.${t.joinData?.joinColumn}`).join('');
                sqlStr += `${whereClauseF()}${orderClauseF()}${limitClauseF()}`;
                state.statement.sql = sqlStr;
                state.statement.bindings = delegate.bindings;
                break;
            }
            case SQLCommand.count: {
                let col = state.aggregateExpr ? state.aggregateExpr.sqlSnippet(state) : '*';
                let sqlStr = `SELECT COUNT(${col}) as result FROM ${nameQ} AS ${aliasQ}`;
                sqlStr += tx.map(t => `\n${t.joinData?.joinType} JOIN ${delegate.quote(t.tableName)} AS ${t.alias} ON ${t.alias}.${t.joinData?.sourceColumn} = ${aliasMap[t.joinData.joinTable]}.${t.joinData?.joinColumn}`).join('');
                sqlStr += `${whereClauseF()}${limitClauseF()}`;
                state.statement.sql = sqlStr;
                state.statement.bindings = delegate.bindings;
                break;
            }
            case SQLCommand.min: {
                let col = state.aggregateExpr?.sqlSnippet(state);
                let sqlStr = `SELECT MIN(${col}) as result FROM ${nameQ} AS ${aliasQ}`;
                sqlStr += tx.map(t => `\n${t.joinData?.joinType} JOIN ${delegate.quote(t.tableName)} AS ${t.alias} ON ${t.alias}.${t.joinData?.sourceColumn} = ${aliasMap[t.joinData.joinTable]}.${t.joinData?.joinColumn}`).join('');
                sqlStr += `${whereClauseF()}${limitClauseF()}`;
                state.statement.sql = sqlStr;
                state.statement.bindings = delegate.bindings;
                break;
            }
            case SQLCommand.max: {
                let col = state.aggregateExpr?.sqlSnippet(state);
                let sqlStr = `SELECT MAX(${col}) as result FROM ${nameQ} AS ${aliasQ}`;
                sqlStr += tx.map(t => `\n${t.joinData?.joinType} JOIN ${delegate.quote(t.tableName)} AS ${t.alias} ON ${t.alias}.${t.joinData?.sourceColumn} = ${aliasMap[t.joinData.joinTable]}.${t.joinData?.joinColumn}`).join('');
                sqlStr += `${whereClauseF()}${limitClauseF()}`;
                state.statement.sql = sqlStr;
                state.statement.bindings = delegate.bindings;
                break;
            }
            case SQLCommand.avg: {
                let col = state.aggregateExpr?.sqlSnippet(state);
                let sqlStr = `SELECT AVG(${col}) as result FROM ${nameQ} AS ${aliasQ}`;
                sqlStr += tx.map(t => `\n${t.joinData?.joinType} JOIN ${delegate.quote(t.tableName)} AS ${t.alias} ON ${t.alias}.${t.joinData?.sourceColumn} = ${aliasMap[t.joinData.joinTable]}.${t.joinData?.joinColumn}`).join('');
                sqlStr += `${whereClauseF()}${limitClauseF()}`;
                state.statement.sql = sqlStr;
                state.statement.bindings = delegate.bindings;
                break;
            }
            case SQLCommand.update: {
                const kvp = handleSet(state.updateObjects[0] ?? {});
                let sqlStr = `UPDATE ${nameQ} AS ${aliasQ}\n` +
                    `SET ${zip(kvp.keys, kvp.values.map(o => any(o))).map(o => `${delegate.quote(o[0])} = ${o[1].sqlSnippet(state)}`)}\n`;
                //if (state.whereExpr !== undefined) {
                sqlStr +=
                    `WHERE ${state.whereExpr?.sqlSnippet(state)}`;
                //}
                state.statement.sql = sqlStr;
                state.statement.bindings = delegate.bindings;
                break;
            }
            case SQLCommand.insert: {
                const kvp = handleSet(state.updateObjects[0] || {});
                const sqlStart = `INSERT INTO ${nameQ} AS ${aliasQ} (${kvp.keys.join(',')}) VALUES `;
                const stats = state.updateObjects.map(uo => {
                    const kvp = handleSet(uo);
                    return `(${kvp.values.map(o => any(o).sqlSnippet(state))})`;
                });
                const sqlStr = `${sqlStart}${stats.join(', ')}`;
                state.statement.sql = sqlStr;
                state.statement.bindings = delegate.bindings;
                break;
            }
            case SQLCommand.delete: {
                let sqlStr = `DELETE FROM ${nameQ} AS ${aliasQ}\n`;
                sqlStr +=
                    `WHERE ${state.whereExpr?.sqlSnippet(state)}`;
                state.statement.sql = sqlStr;
                state.statement.bindings = delegate.bindings;
                break;
            }
            default:
                break;
        }
    }
}
exports.TableBase = TableBase;
function SelectableMixin(Base) {
    return class extends Base {
        select() {
            return new Select(this);
        }
        async first() {
            const rows = await this.select().rows();
            for (let row of rows) {
                return row;
            }
            return undefined;
        }
        async _inner(state) {
            this.setState(state);
            this.setSQL(state);
            const stat = state.statement.sql;
            const exeDelegate = this.databaseConnection.sqlExeDelegate(stat);
            const results = await exeDelegate.exe(state.statement.bindings);
            return results[0].result;
        }
        async count() {
            let state = new SQLGenState(this.databaseConnection.sqlGenDelegate());
            state.command = SQLCommand.count;
            return this._inner(state);
        }
        async min(column) {
            let state = new SQLGenState(this.databaseConnection.sqlGenDelegate());
            state.command = SQLCommand.min;
            state.aggregateExpr = column;
            return this._inner(state);
        }
        async max(column) {
            let state = new SQLGenState(this.databaseConnection.sqlGenDelegate());
            state.command = SQLCommand.max;
            state.aggregateExpr = column;
            return this._inner(state);
        }
        async avg(column) {
            let state = new SQLGenState(this.databaseConnection.sqlGenDelegate());
            state.command = SQLCommand.avg;
            state.aggregateExpr = column;
            return this._inner(state);
        }
    };
}
var OrderDirection;
(function (OrderDirection) {
    OrderDirection["ascending"] = "ASC";
    OrderDirection["descending"] = "DESC";
})(OrderDirection || (exports.OrderDirection = OrderDirection = {}));
function OrderableMixin(Base) {
    return class extends Base {
        order(by, direction = OrderDirection.ascending) {
            return new Ordering(this, by, direction);
        }
    };
}
class Ordering extends OrderableMixin(JoinableMixin(SelectableMixin(WhereableMixin(LimitableMixin(CRUDFromObjectBase))))) {
    constructor(from, by, direction) {
        super(from);
        this.by = by;
        this.direction = direction;
    }
    setState(state) {
        state.accumulatedOrderings.push({ by: this.by, direction: this.direction });
        super.setState(state);
    }
}
exports.Ordering = Ordering;
function LimitableMixin(Base) {
    return class extends Base {
        limit(max, skip = 0) {
            return new Limit(this, max, skip);
        }
    };
}
class Limit extends OrderableMixin(JoinableMixin(SelectableMixin(WhereableMixin(CRUDFromObjectBase)))) {
    constructor(from, maximum, skip) {
        super(from);
        this.maximum = maximum;
        this.skip = skip;
    }
    setState(state) {
        super.setState(state);
        state.currentLimit = { max: this.maximum, skip: this.skip };
    }
}
exports.Limit = Limit;
var JoinType;
(function (JoinType) {
    JoinType["inner"] = "";
    JoinType["left"] = "LEFT";
    JoinType["right"] = "RIGHT";
    JoinType["full"] = "FULL";
})(JoinType || (exports.JoinType = JoinType = {}));
function JoinableMixin(Base) {
    return class extends Base {
        join(joinType, sourceTable, joinTable, selectCols = [{ name: '*' }]) {
            return new Join(this, joinType, sourceTable.table, sourceTable.name, joinTable.table, joinTable.name, selectCols);
        }
        innerJoin(sourceTable, joinTable, selectCols = [{ name: '*' }]) {
            return this.join(JoinType.inner, sourceTable, joinTable, selectCols);
        }
        leftJoin(sourceTable, joinTable, selectCols = [{ name: '*' }]) {
            return this.join(JoinType.left, sourceTable, joinTable, selectCols);
        }
        rightJoin(sourceTable, joinTable, selectCols = [{ name: '*' }]) {
            return this.join(JoinType.right, sourceTable, joinTable, selectCols);
        }
        fullJoin(sourceTable, joinTable, selectCols = [{ name: '*' }]) {
            return this.join(JoinType.full, sourceTable, joinTable, selectCols);
        }
    };
}
class Join extends WhereableMixin(SelectableMixin(JoinableMixin(OrderableMixin(LimitableMixin(CRUDFromObjectBase))))) {
    constructor(from, joinType, sourceTable, sourceColumn, joinTable, joinColumn, selectCols) {
        super(from);
        this.joinType = joinType;
        this.sourceTable = sourceTable;
        this.sourceColumn = sourceColumn;
        this.joinTable = joinTable;
        this.joinColumn = joinColumn;
        this.selectCols = selectCols;
    }
    setState(state) {
        super.setState(state);
        state.addTable(this.sourceTable, this.selectCols, {
            joinType: this.joinType,
            sourceColumn: this.sourceColumn,
            joinTable: this.joinTable,
            joinColumn: this.joinColumn
        });
    }
}
exports.Join = Join;
function WhereableMixin(Base) {
    return class extends Base {
        where(expr, ...andExpr) {
            if (andExpr.length == 0) {
                return new Where(this, expr);
            }
            const extrapression = [expr, ...andExpr].reduce((lhs, rhs) => and(lhs, rhs));
            return new Where(this, extrapression);
        }
    };
}
class Where extends LimitableMixin(OrderableMixin(UpdateableMixin(DeleteableMixin(SelectableMixin(CRUDFromObjectBase))))) {
    constructor(from, expr) {
        super(from);
        this.expr = expr;
    }
    setState(state) {
        super.setState(state);
        state.whereExpr = this.expr;
    }
}
exports.Where = Where;
function DeleteableMixin(Base) {
    return class extends Base {
        async delete() {
            const d = new Delete(this);
            await d.run();
            return d;
        }
    };
}
class Delete extends CRUDCommandBase {
    constructor(from) {
        super(from);
    }
    async run() {
        let state = new SQLGenState(this.databaseConnection.sqlGenDelegate());
        state.command = SQLCommand.delete;
        this.setState(state);
        this.setSQL(state);
        const stat = state.statement;
        let exeDelegate = this.databaseConnection.sqlExeDelegate(stat.sql);
        await exeDelegate.exe(state.delegate.bindings);
    }
}
exports.Delete = Delete;
function UpdateableMixin(Base) {
    return class extends Base {
        updateReturning(set) {
            return new UpdateReturning(this, set);
        }
        async update(set) {
            const u = new Update(this, set);
            await u.run();
            return u;
        }
    };
}
function InsertableMixin(Base) {
    return class extends Base {
        insertReturning(...objects) {
            return new InsertReturning(this, objects);
        }
        async insert(...objects) {
            const i = new Insert(this, objects);
            await i.run();
            return i;
        }
    };
}
class Select extends CRUDCommandBase {
    constructor(from) {
        super(from);
    }
    async rows() {
        let state = new SQLGenState(this.databaseConnection.sqlGenDelegate());
        state.command = SQLCommand.select;
        this.setState(state);
        this.setSQL(state);
        if (state.accumulatedOrderings.length != 0) {
            throw new CRUDSQLGenError(`Orderings were not consumed: ${state.accumulatedOrderings}`);
        }
        const gen = new SQLTopExeDelegate(state, this.databaseConnection);
        return await gen.exe(state.delegate.bindings ?? []);
    }
}
exports.Select = Select;
// TODO: updated row count
class Update extends CRUDCommandBase {
    constructor(from, set) {
        super(from);
        this.set = set;
    }
    async run() {
        let state = new SQLGenState(this.databaseConnection.sqlGenDelegate());
        state.command = SQLCommand.update;
        state.updateObjects.push(this.set);
        this.setState(state);
        this.setSQL(state);
        const stat = state.statement;
        let exeDelegate = this.databaseConnection.sqlExeDelegate(stat.sql);
        await exeDelegate.exe(state.delegate.bindings);
    }
}
exports.Update = Update;
class UpdateReturning extends CRUDCommandBase {
    constructor(from, set) {
        super(from);
        this.set = set;
    }
    setSQL(state) {
        this.from.setSQL(state);
        state.statement.sql += `\nRETURNING *`;
    }
    async rows() {
        const delegate = this.databaseConnection.sqlGenDelegate();
        let state = new SQLGenState(delegate);
        state.command = SQLCommand.update;
        state.updateObjects.push(this.set);
        this.setState(state);
        this.setSQL(state);
        const gen = new SQLTopExeDelegate(state, this.databaseConnection);
        return await gen.exe(state.delegate.bindings ?? []);
    }
    async first() {
        const r = await this.rows();
        return r[0];
    }
}
exports.UpdateReturning = UpdateReturning;
class Insert extends CRUDCommandBase {
    constructor(from, objects) {
        super(from);
        this.objects = objects;
    }
    async run() {
        const delegate = this.databaseConnection.sqlGenDelegate();
        let state = new SQLGenState(delegate);
        state.command = SQLCommand.insert;
        state.updateObjects.push(...this.objects);
        this.setState(state);
        this.setSQL(state);
        const stat = state.statement;
        let exeDelegate = this.databaseConnection.sqlExeDelegate(stat.sql);
        await exeDelegate.exe(state.delegate.bindings);
    }
}
exports.Insert = Insert;
class InsertReturning extends CRUDCommandBase {
    constructor(from, objects) {
        super(from);
        this.objects = objects;
    }
    setSQL(state) {
        this.from.setSQL(state);
        state.statement.sql += ` RETURNING *`;
    }
    async rows() {
        const delegate = this.databaseConnection.sqlGenDelegate();
        let state = new SQLGenState(delegate);
        state.command = SQLCommand.insert;
        state.updateObjects.push(...this.objects);
        this.setState(state);
        this.setSQL(state);
        const gen = new SQLTopExeDelegate(state, this.databaseConnection);
        return await gen.exe(state.delegate.bindings ?? []);
    }
    async first() {
        const r = await this.rows();
        return r[0];
    }
}
exports.InsertReturning = InsertReturning;
// -------
// Helper for CRUDBooleanExpression
function op(op, lhs, rhs) {
    return new expression_1.OpExpression(op, lhs, rhs);
}
function and(lhs, rhs, ...rest) {
    return new expression_1.AndExpression(lhs, rhs, ...rest);
}
function or(lhs, rhs, ...rest) {
    return new expression_1.OrExpression(lhs, rhs, ...rest);
}
function eq(lhs, rhs) {
    return new expression_1.EqualityExpression(lhs, rhs);
}
function col2(name) {
    return new expression_1.ColumnExpression(name);
}
function col(column) {
    return new expression_1.ColumnExpression2(column.table, column.name);
}
function eqCol(column, rhs) {
    return new expression_1.EqualityExpression(col(column), rhs);
}
function neqCol(column, rhs) {
    return new expression_1.InEqualityExpression(col(column), rhs);
}
function neq(lhs, rhs) {
    return new expression_1.InEqualityExpression(lhs, rhs);
}
function not(rhs) {
    return new expression_1.NotExpression(rhs);
}
function lt(lhs, rhs) {
    return new expression_1.LessThanExpression(lhs, rhs);
}
function lte(lhs, rhs) {
    return new expression_1.LessThanEqualExpression(lhs, rhs);
}
function gt(lhs, rhs) {
    return new expression_1.GreaterThanExpression(lhs, rhs);
}
function gte(lhs, rhs) {
    return new expression_1.GreaterThanEqualExpression(lhs, rhs);
}
function inExp(lhs, rhs) {
    return new expression_1.InExpression(lhs, rhs);
}
function like(lhs, wild1, string, wild2) {
    return new expression_1.LikeExpression(lhs, wild1, string, wild2);
}
function lazy(expressionProducer) {
    return new expression_1.LazyExpression(expressionProducer);
}
// Helper for CRUDExpression
function int(int) {
    return new expression_1.IntegerExpression(int);
}
function dec(decimal) {
    return new expression_1.DecimalExpression(decimal);
}
function str(str) {
    return new expression_1.StringExpression(str);
}
function blob(blob) {
    return new expression_1.BlobExpression(blob);
}
function sblob(sblob) {
    return new expression_1.SBlobExpression(sblob);
}
function bool(bool) {
    return new expression_1.BoolExpression(bool);
}
function date(date) {
    return new expression_1.DateExpression(date);
}
function uuid(uuid) {
    return new expression_1.UUIDExpression(uuid);
}
function nullExp() {
    return new expression_1.NullExpression();
}
function any(a) {
    if (a === null) {
        return nullExp();
    }
    switch (typeof a) {
        case 'number':
            //javascript does not have an inbuilt method to check if the number is integer or float
            //checking if it is a float or integer
            return Number(a) === a && a % 1 !== 0 ? dec(a) : int(a);
        case 'string':
            return str(a);
        case 'boolean':
            return bool(a);
        case 'object':
            if (a instanceof Date) {
                return date(a);
            }
            else if (a instanceof Uint8Array) {
                return blob(a);
            }
            else if (a instanceof Int8Array) {
                return sblob(a);
            }
            return str(JSON.stringify(a));
        case 'undefined':
        case 'function':
            return nullExp();
        default:
            throw new Error(`Unknown type ${typeof a}`);
    }
}
//# sourceMappingURL=index.js.map