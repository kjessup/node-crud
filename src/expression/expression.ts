import { CRUDSQLGenError, SQLGenState } from "..";

export type ExpressionProducer = () => CRUDExpression;

export abstract class CRUDExpression {
    sqlSnippet(state: SQLGenState): string {
        throw new CRUDSQLGenError('sqlSnippet not implemented.');
    }
    primitiveType(): any | undefined {
        return undefined;
    }
}

export abstract class CRUDBooleanExpression {
    
}

export class ColumnExpression extends CRUDExpression {
    constructor(public column: string) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return state.delegate.quote(this.column);
    }
}

export class AndExpression extends CRUDBooleanExpression {
    constructor(public lhs: CRUDExpression, public rhs: CRUDExpression) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return `(${this.lhs.sqlSnippet(state)} AND ${this.rhs.sqlSnippet(state)})`;
    }
}

export class OrExpression extends CRUDBooleanExpression {
    constructor(public lhs: CRUDExpression, public rhs: CRUDExpression) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return `(${this.lhs.sqlSnippet(state)} OR ${this.rhs.sqlSnippet(state)})`;
    }
}

export class EqualityExpression extends CRUDBooleanExpression {
    constructor(public lhs: CRUDExpression, public rhs: CRUDExpression) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return `${this.lhs.sqlSnippet(state)} = ${this.rhs.sqlSnippet(state)}`;
    }
}

export class InEqualityExpression extends CRUDBooleanExpression {
    constructor(public lhs: CRUDExpression, public rhs: CRUDExpression) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
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
    constructor(
        public lhs: CRUDExpression, 
        public wild1: boolean, 
        public string: string, 
        public wild2: boolean) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        const lstr = `${this.wild1 ? '%' : ''}${this.string.replace(/%/g, '\\%')}${this.wild2 ? '%' : ''}`;
        return `${this.lhs.sqlSnippet(state)} LIKE ${new StringExpression(lstr).sqlSnippet(state)})`;
    }
}

export class LazyExpression extends CRUDExpression {
    constructor(public expressionProducer: ExpressionProducer) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return this.expressionProducer().sqlSnippet(state);
    }
}

export class IntegerExpression extends CRUDExpression {
    constructor(public int: number) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return state.delegate.getBinding(this);
    }
    primitiveType(): any | undefined {
        return this.int;
    }
}

export class DecimalExpression extends CRUDExpression {
    constructor(public decimal: number) {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return state.delegate.getBinding(this);
    }
    primitiveType(): any | undefined {
        return this.decimal;
    }
}

export class StringExpression extends CRUDExpression {
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

class BlobExpression extends CRUDExpression {
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

class SBlobExpression extends CRUDExpression {
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


export class BoolExpression extends CRUDExpression {
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

export class DateExpression extends CRUDExpression {
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

export class UUIDExpression extends CRUDExpression {
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

export class NullExpression extends CRUDExpression {
    constructor() {
        super();
    }
    sqlSnippet(state: SQLGenState): string {
        return 'NULL';
    }
}
