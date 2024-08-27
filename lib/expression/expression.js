"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullExpression = exports.UUIDExpression = exports.DateExpression = exports.BoolExpression = exports.SBlobExpression = exports.BlobExpression = exports.StringExpression = exports.DecimalExpression = exports.IntegerExpression = exports.LazyExpression = exports.LikeExpression = exports.InExpression = exports.GreaterThanEqualExpression = exports.GreaterThanExpression = exports.LessThanEqualExpression = exports.LessThanExpression = exports.NotExpression = exports.InEqualityExpression = exports.EqualityExpression = exports.OrExpression = exports.AndExpression = exports.OpExpression = exports.ColumnExpression2 = exports.ColumnExpression = exports.CRUDBooleanExpression = exports.CRUDExpressionClass = void 0;
const index_js_1 = require("../index.js");
Boolean.prototype.primitiveType = function () {
    return this;
};
Boolean.prototype.sqlSnippet = function (state) {
    return state.delegate.getBinding(new BoolExpression(this));
};
Number.prototype.primitiveType = function () {
    return this;
};
Number.prototype.sqlSnippet = function (state) {
    return state.delegate.getBinding(new IntegerExpression(this));
};
String.prototype.primitiveType = function () {
    return this;
};
String.prototype.sqlSnippet = function (state) {
    return state.delegate.getBinding(new StringExpression(this));
};
class CRUDExpressionClass {
    sqlSnippet(state) {
        throw new index_js_1.CRUDSQLGenError('sqlSnippet not implemented.');
    }
    primitiveType() {
        return undefined;
    }
}
exports.CRUDExpressionClass = CRUDExpressionClass;
class CRUDBooleanExpression extends CRUDExpressionClass {
}
exports.CRUDBooleanExpression = CRUDBooleanExpression;
class ColumnExpression extends CRUDExpressionClass {
    constructor(column) {
        super();
        this.column = column;
    }
    sqlSnippet(state) {
        return state.delegate.quote(this.column);
    }
}
exports.ColumnExpression = ColumnExpression;
class ColumnExpression2 extends CRUDExpressionClass {
    constructor(table, column) {
        super();
        this.table = table;
        this.column = column;
    }
    sqlSnippet(state) {
        return state.tableData.filter(t => t.tableName == this.table).map(t => `${t.alias}.${state.delegate.quote(this.column)}`)[0];
    }
}
exports.ColumnExpression2 = ColumnExpression2;
class OpExpression extends CRUDBooleanExpression {
    constructor(op, lhs, rhs) {
        super();
        this.op = op;
        this.lhs = lhs;
        this.rhs = rhs;
    }
    sqlSnippet(state) {
        return `(${this.lhs.sqlSnippet(state)} ${this.op} ${this.rhs.sqlSnippet(state)})`;
    }
}
exports.OpExpression = OpExpression;
class AndExpression extends CRUDBooleanExpression {
    constructor(lhs, rhs, ...rest) {
        super();
        this.operands = [lhs, rhs, ...rest];
    }
    sqlSnippet(state) {
        return `(${this.operands.map(o => o.sqlSnippet(state)).join(' AND ')})`;
    }
}
exports.AndExpression = AndExpression;
class OrExpression extends CRUDBooleanExpression {
    constructor(lhs, rhs, ...rest) {
        super();
        this.operands = [lhs, rhs, ...rest];
    }
    sqlSnippet(state) {
        return `(${this.operands.map(o => o.sqlSnippet(state)).join(' OR ')})`;
    }
}
exports.OrExpression = OrExpression;
class EqualityExpression extends CRUDBooleanExpression {
    constructor(lhs, rhs) {
        super();
        this.lhs = lhs;
        this.rhs = rhs;
    }
    sqlSnippet(state) {
        if (this.rhs.primitiveType() === undefined) {
            return `${this.lhs.sqlSnippet(state)} IS NULL`;
        }
        return `${this.lhs.sqlSnippet(state)} = ${this.rhs.sqlSnippet(state)}`;
    }
}
exports.EqualityExpression = EqualityExpression;
class InEqualityExpression extends CRUDBooleanExpression {
    constructor(lhs, rhs) {
        super();
        this.lhs = lhs;
        this.rhs = rhs;
    }
    sqlSnippet(state) {
        if (this.rhs.primitiveType() === undefined) {
            return `${this.lhs.sqlSnippet(state)} IS NOT NULL`;
        }
        return `${this.lhs.sqlSnippet(state)} <> ${this.rhs.sqlSnippet(state)}`;
    }
}
exports.InEqualityExpression = InEqualityExpression;
class NotExpression extends CRUDBooleanExpression {
    constructor(rhs) {
        super();
        this.rhs = rhs;
    }
    sqlSnippet(state) {
        return `NOT ${this.rhs.sqlSnippet(state)}`;
    }
}
exports.NotExpression = NotExpression;
class LessThanExpression extends CRUDBooleanExpression {
    constructor(lhs, rhs) {
        super();
        this.lhs = lhs;
        this.rhs = rhs;
    }
    sqlSnippet(state) {
        return `${this.lhs.sqlSnippet(state)} < ${this.rhs.sqlSnippet(state)}`;
    }
}
exports.LessThanExpression = LessThanExpression;
class LessThanEqualExpression extends CRUDBooleanExpression {
    constructor(lhs, rhs) {
        super();
        this.lhs = lhs;
        this.rhs = rhs;
    }
    sqlSnippet(state) {
        return `${this.lhs.sqlSnippet(state)} <= ${this.rhs.sqlSnippet(state)}`;
    }
}
exports.LessThanEqualExpression = LessThanEqualExpression;
class GreaterThanExpression extends CRUDBooleanExpression {
    constructor(lhs, rhs) {
        super();
        this.lhs = lhs;
        this.rhs = rhs;
    }
    sqlSnippet(state) {
        return `${this.lhs.sqlSnippet(state)} > ${this.rhs.sqlSnippet(state)}`;
    }
}
exports.GreaterThanExpression = GreaterThanExpression;
class GreaterThanEqualExpression extends CRUDBooleanExpression {
    constructor(lhs, rhs) {
        super();
        this.lhs = lhs;
        this.rhs = rhs;
    }
    sqlSnippet(state) {
        return `${this.lhs.sqlSnippet(state)} >= ${this.rhs.sqlSnippet(state)}`;
    }
}
exports.GreaterThanEqualExpression = GreaterThanEqualExpression;
class InExpression extends CRUDBooleanExpression {
    constructor(lhs, rhs) {
        super();
        this.lhs = lhs;
        this.rhs = rhs;
    }
    sqlSnippet(state) {
        return `${this.lhs.sqlSnippet(state)} IN (${this.rhs.map(e => e.sqlSnippet(state))})`;
    }
}
exports.InExpression = InExpression;
class LikeExpression extends CRUDBooleanExpression {
    constructor(lhs, wild1, string, wild2) {
        super();
        this.lhs = lhs;
        this.wild1 = wild1;
        this.string = string;
        this.wild2 = wild2;
    }
    sqlSnippet(state) {
        const lstr = `${this.wild1 ? '%' : ''}${this.string.replace(/\\/g, '\\\\').replace(/%/g, '\\%')}${this.wild2 ? '%' : ''}`;
        this.rhs = new StringExpression(lstr);
        return `(${this.lhs.sqlSnippet(state)} LIKE ${this.rhs.sqlSnippet(state)})`;
    }
}
exports.LikeExpression = LikeExpression;
class LazyExpression extends CRUDExpressionClass {
    constructor(expressionProducer) {
        super();
        this.expressionProducer = expressionProducer;
    }
    sqlSnippet(state) {
        return this.expressionProducer().sqlSnippet(state);
    }
}
exports.LazyExpression = LazyExpression;
class IntegerExpression extends CRUDExpressionClass {
    constructor(int) {
        super();
        this.int = int;
    }
    sqlSnippet(state) {
        return `${this.int}`; //state.delegate.getBinding(this);
    }
    primitiveType() {
        return this.int;
    }
}
exports.IntegerExpression = IntegerExpression;
class DecimalExpression extends CRUDExpressionClass {
    constructor(decimal) {
        super();
        this.decimal = decimal;
    }
    sqlSnippet(state) {
        return `${this.decimal}`; //state.delegate.getBinding(this);
    }
    primitiveType() {
        return this.decimal;
    }
}
exports.DecimalExpression = DecimalExpression;
class StringExpression extends CRUDExpressionClass {
    constructor(str) {
        super();
        this.str = str;
    }
    sqlSnippet(state) {
        return state.delegate.getBinding(this);
    }
    primitiveType() {
        return this.str;
    }
}
exports.StringExpression = StringExpression;
class BlobExpression extends CRUDExpressionClass {
    constructor(blob) {
        super();
        this.blob = blob;
    }
    sqlSnippet(state) {
        return state.delegate.getBinding(this);
    }
    primitiveType() {
        return this.blob;
    }
}
exports.BlobExpression = BlobExpression;
class SBlobExpression extends CRUDExpressionClass {
    constructor(sblob) {
        super();
        this.sblob = sblob;
    }
    sqlSnippet(state) {
        return state.delegate.getBinding(this);
    }
    primitiveType() {
        return this.sblob;
    }
}
exports.SBlobExpression = SBlobExpression;
class BoolExpression extends CRUDExpressionClass {
    constructor(bool) {
        super();
        this.bool = bool;
    }
    sqlSnippet(state) {
        return state.delegate.getBinding(this);
    }
    primitiveType() {
        return this.bool;
    }
}
exports.BoolExpression = BoolExpression;
class DateExpression extends CRUDExpressionClass {
    constructor(date) {
        super();
        this.date = date;
    }
    sqlSnippet(state) {
        return state.delegate.getBinding(this);
    }
    primitiveType() {
        return this.date;
    }
}
exports.DateExpression = DateExpression;
class UUIDExpression extends CRUDExpressionClass {
    constructor(uuid) {
        super();
        this.uuid = uuid;
    }
    sqlSnippet(state) {
        return state.delegate.getBinding(this);
    }
    primitiveType() {
        return this.uuid;
    }
}
exports.UUIDExpression = UUIDExpression;
class NullExpression extends CRUDExpressionClass {
    constructor() {
        super();
    }
    sqlSnippet(state) {
        return 'NULL';
    }
}
exports.NullExpression = NullExpression;
//# sourceMappingURL=expression.js.map