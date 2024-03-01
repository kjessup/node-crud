import { CRUDSQLGenError, SQLGenState } from '../index.js';
declare global {
    interface Number {
        primitiveType(): any | undefined;
        sqlSnippet(state: SQLGenState): string;
    }
    interface String {
        primitiveType(): any | undefined;
        sqlSnippet(state: SQLGenState): string;
    }
    interface Boolean {
        primitiveType(): any | undefined;
        sqlSnippet(state: SQLGenState): string;
    }
}

Boolean.prototype.primitiveType = function () {
    return this;
};

Boolean.prototype.sqlSnippet = function (state: SQLGenState) {
    return state.delegate.getBinding(new BoolExpression(this as boolean));
}

Number.prototype.primitiveType = function () {
    return this;
};

Number.prototype.sqlSnippet = function (state: SQLGenState) {
    return state.delegate.getBinding(new IntegerExpression(this as number));
}

String.prototype.primitiveType = function () {
    return this;
};

String.prototype.sqlSnippet = function (state: SQLGenState) {
    return state.delegate.getBinding(new StringExpression(this as string));
}

export abstract class CRUDExpressionClass {
    sqlSnippet(state: SQLGenState): string {
        throw new CRUDSQLGenError('sqlSnippet not implemented.');
    }
    primitiveType(): any | undefined {
        return undefined;
    }
}

export type CRUDExpression = CRUDExpressionClass | string | number;

export type ExpressionProducer = () => CRUDExpression;

export abstract class CRUDBooleanExpression extends CRUDExpressionClass {

}

export class ColumnExpression extends CRUDExpressionClass {
    constructor(public column: string) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return state.delegate.quote(this.column);
    }
}

export class ColumnExpression2 extends CRUDExpressionClass {
    constructor(public table: string, public column: string) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return state.tableData.filter(t => t.tableName == this.table).map(t => `${t.alias}.${state.delegate.quote(this.column)}`)[0];
    }
}

export class OpExpression extends CRUDBooleanExpression {
    constructor(public op: string, public lhs: CRUDExpression, public rhs: CRUDExpression) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return `(${this.lhs.sqlSnippet(state)} ${this.op} ${this.rhs.sqlSnippet(state)})`;
    }
}

export class AndExpression extends CRUDBooleanExpression {
    public operands: CRUDExpression[]
    constructor(lhs: CRUDExpression, rhs: CRUDExpression, ...rest: CRUDExpression[]) {
        super();
        this.operands = [lhs, rhs, ...rest];
    }
    sqlSnippet(state: SQLGenState): string {
        return `(${this.operands.map(o => o.sqlSnippet(state)).join(' AND ')})`;
    }
}

export class OrExpression extends CRUDBooleanExpression {
    public operands: CRUDExpression[]
    constructor(lhs: CRUDExpression, rhs: CRUDExpression, ...rest: CRUDExpression[]) {
        super();
        this.operands = [lhs, rhs, ...rest];
    }
    sqlSnippet(state: SQLGenState): string {
        return `(${this.operands.map(o => o.sqlSnippet(state)).join(' OR ')})`;
    }
}

export class EqualityExpression extends CRUDBooleanExpression {
    constructor(public lhs: CRUDExpression, public rhs: CRUDExpression) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        if (this.rhs.primitiveType() === undefined) {
            return `${this.lhs.sqlSnippet(state)} IS NULL`;
        }
        return `${this.lhs.sqlSnippet(state)} = ${this.rhs.sqlSnippet(state)}`;
    }
}

export class InEqualityExpression extends CRUDBooleanExpression {
    constructor(public lhs: CRUDExpression, public rhs: CRUDExpression) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        if (this.rhs.primitiveType() === undefined) {
            return `${this.lhs.sqlSnippet(state)} IS NOT NULL`;
        }
        return `${this.lhs.sqlSnippet(state)} <> ${this.rhs.sqlSnippet(state)}`;
    }
}

export class NotExpression extends CRUDBooleanExpression {
    constructor(public rhs: CRUDExpression) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return `NOT ${this.rhs.sqlSnippet(state)}`;
    }
}

export class LessThanExpression extends CRUDBooleanExpression {
    constructor(public lhs: CRUDExpression, public rhs: CRUDExpression) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return `${this.lhs.sqlSnippet(state)} < ${this.rhs.sqlSnippet(state)}`;
    }
}

export class LessThanEqualExpression extends CRUDBooleanExpression {
    constructor(public lhs: CRUDExpression, public rhs: CRUDExpression) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return `${this.lhs.sqlSnippet(state)} <= ${this.rhs.sqlSnippet(state)}`;
    }
}

export class GreaterThanExpression extends CRUDBooleanExpression {
    constructor(public lhs: CRUDExpression, public rhs: CRUDExpression) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return `${this.lhs.sqlSnippet(state)} > ${this.rhs.sqlSnippet(state)}`;
    }
}

export class GreaterThanEqualExpression extends CRUDBooleanExpression {
    constructor(public lhs: CRUDExpression, public rhs: CRUDExpression) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return `${this.lhs.sqlSnippet(state)} >= ${this.rhs.sqlSnippet(state)}`;
    }
}

export class InExpression extends CRUDBooleanExpression {
    constructor(public lhs: CRUDExpression, public rhs: CRUDExpression[]) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return `${this.lhs.sqlSnippet(state)} IN (${this.rhs.map(e => e.sqlSnippet(state))})`;
    }
}

export class LikeExpression extends CRUDBooleanExpression {
    rhs!: CRUDExpression;
    constructor(
        public lhs: CRUDExpression,
        public wild1: boolean,
        public string: string,
        public wild2: boolean) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        const lstr = `${this.wild1 ? '%' : ''}${this.string.replace(/\\/g, '\\\\').replace(/%/g, '\\%')}${this.wild2 ? '%' : ''}`;
        this.rhs = new StringExpression(lstr);
        return `(${this.lhs.sqlSnippet(state)} LIKE ${this.rhs.sqlSnippet(state)})`;
    }
}

export class LazyExpression extends CRUDExpressionClass {
    constructor(public expressionProducer: ExpressionProducer) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return this.expressionProducer().sqlSnippet(state);
    }
}

export class IntegerExpression extends CRUDExpressionClass {
    constructor(public int: number) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return `${this.int}`;//state.delegate.getBinding(this);
    }
    primitiveType(): any | undefined {
        return this.int;
    }
}

export class DecimalExpression extends CRUDExpressionClass {
    constructor(public decimal: number) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return `${this.decimal}`;//state.delegate.getBinding(this);
    }
    primitiveType(): any | undefined {
        return this.decimal;
    }
}

export class StringExpression extends CRUDExpressionClass {
    constructor(public str: string) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return state.delegate.getBinding(this);
    }
    primitiveType(): any | undefined {
        return this.str;
    }
}

export class BlobExpression extends CRUDExpressionClass {
    constructor(public blob: Uint8Array) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return state.delegate.getBinding(this);
    }
    primitiveType(): any | undefined {
        return this.blob;
    }
}

export class SBlobExpression extends CRUDExpressionClass {
    constructor(public sblob: Int8Array) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return state.delegate.getBinding(this);
    }
    primitiveType(): any | undefined {
        return this.sblob;
    }
}

export class BoolExpression extends CRUDExpressionClass {
    constructor(public bool: boolean) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return state.delegate.getBinding(this);
    }
    primitiveType(): any | undefined {
        return this.bool;
    }
}

export class DateExpression extends CRUDExpressionClass {
    constructor(public date: Date) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return state.delegate.getBinding(this);
    }
    primitiveType(): any | undefined {
        return this.date;
    }
}

export class UUIDExpression extends CRUDExpressionClass {
    constructor(public uuid: string) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return state.delegate.getBinding(this);
    }
    primitiveType(): any | undefined {
        return this.uuid;
    }
}

export class NullExpression extends CRUDExpressionClass {
    constructor() {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return 'NULL';
    }
}
