import { SQLGenState } from '../index.js';
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
export declare abstract class CRUDExpressionClass {
    sqlSnippet(state: SQLGenState): string;
    primitiveType(): any | undefined;
}
export type CRUDExpression = CRUDExpressionClass | string | number;
export type ExpressionProducer = () => CRUDExpression;
export declare abstract class CRUDBooleanExpression extends CRUDExpressionClass {
}
export declare class ColumnExpression extends CRUDExpressionClass {
    column: string;
    constructor(column: string);
    sqlSnippet(state: SQLGenState): string;
}
export declare class ColumnExpression2 extends CRUDExpressionClass {
    table: string;
    column: string;
    constructor(table: string, column: string);
    sqlSnippet(state: SQLGenState): string;
}
export declare class OpExpression extends CRUDBooleanExpression {
    op: string;
    lhs: CRUDExpression;
    rhs: CRUDExpression;
    constructor(op: string, lhs: CRUDExpression, rhs: CRUDExpression);
    sqlSnippet(state: SQLGenState): string;
}
export declare class AndExpression extends CRUDBooleanExpression {
    operands: CRUDExpression[];
    constructor(lhs: CRUDExpression, rhs: CRUDExpression, ...rest: CRUDExpression[]);
    sqlSnippet(state: SQLGenState): string;
}
export declare class OrExpression extends CRUDBooleanExpression {
    operands: CRUDExpression[];
    constructor(lhs: CRUDExpression, rhs: CRUDExpression, ...rest: CRUDExpression[]);
    sqlSnippet(state: SQLGenState): string;
}
export declare class EqualityExpression extends CRUDBooleanExpression {
    lhs: CRUDExpression;
    rhs: CRUDExpression;
    constructor(lhs: CRUDExpression, rhs: CRUDExpression);
    sqlSnippet(state: SQLGenState): string;
}
export declare class InEqualityExpression extends CRUDBooleanExpression {
    lhs: CRUDExpression;
    rhs: CRUDExpression;
    constructor(lhs: CRUDExpression, rhs: CRUDExpression);
    sqlSnippet(state: SQLGenState): string;
}
export declare class NotExpression extends CRUDBooleanExpression {
    rhs: CRUDExpression;
    constructor(rhs: CRUDExpression);
    sqlSnippet(state: SQLGenState): string;
}
export declare class LessThanExpression extends CRUDBooleanExpression {
    lhs: CRUDExpression;
    rhs: CRUDExpression;
    constructor(lhs: CRUDExpression, rhs: CRUDExpression);
    sqlSnippet(state: SQLGenState): string;
}
export declare class LessThanEqualExpression extends CRUDBooleanExpression {
    lhs: CRUDExpression;
    rhs: CRUDExpression;
    constructor(lhs: CRUDExpression, rhs: CRUDExpression);
    sqlSnippet(state: SQLGenState): string;
}
export declare class GreaterThanExpression extends CRUDBooleanExpression {
    lhs: CRUDExpression;
    rhs: CRUDExpression;
    constructor(lhs: CRUDExpression, rhs: CRUDExpression);
    sqlSnippet(state: SQLGenState): string;
}
export declare class GreaterThanEqualExpression extends CRUDBooleanExpression {
    lhs: CRUDExpression;
    rhs: CRUDExpression;
    constructor(lhs: CRUDExpression, rhs: CRUDExpression);
    sqlSnippet(state: SQLGenState): string;
}
export declare class InExpression extends CRUDBooleanExpression {
    lhs: CRUDExpression;
    rhs: CRUDExpression[];
    constructor(lhs: CRUDExpression, rhs: CRUDExpression[]);
    sqlSnippet(state: SQLGenState): string;
}
export declare class LikeExpression extends CRUDBooleanExpression {
    lhs: CRUDExpression;
    wild1: boolean;
    string: string;
    wild2: boolean;
    rhs: CRUDExpression;
    constructor(lhs: CRUDExpression, wild1: boolean, string: string, wild2: boolean);
    sqlSnippet(state: SQLGenState): string;
}
export declare class LazyExpression extends CRUDExpressionClass {
    expressionProducer: ExpressionProducer;
    constructor(expressionProducer: ExpressionProducer);
    sqlSnippet(state: SQLGenState): string;
}
export declare class IntegerExpression extends CRUDExpressionClass {
    int: number;
    constructor(int: number);
    sqlSnippet(state: SQLGenState): string;
    primitiveType(): any | undefined;
}
export declare class DecimalExpression extends CRUDExpressionClass {
    decimal: number;
    constructor(decimal: number);
    sqlSnippet(state: SQLGenState): string;
    primitiveType(): any | undefined;
}
export declare class StringExpression extends CRUDExpressionClass {
    str: string;
    constructor(str: string);
    sqlSnippet(state: SQLGenState): string;
    primitiveType(): any | undefined;
}
export declare class BlobExpression extends CRUDExpressionClass {
    blob: Uint8Array;
    constructor(blob: Uint8Array);
    sqlSnippet(state: SQLGenState): string;
    primitiveType(): any | undefined;
}
export declare class SBlobExpression extends CRUDExpressionClass {
    sblob: Int8Array;
    constructor(sblob: Int8Array);
    sqlSnippet(state: SQLGenState): string;
    primitiveType(): any | undefined;
}
export declare class BoolExpression extends CRUDExpressionClass {
    bool: boolean;
    constructor(bool: boolean);
    sqlSnippet(state: SQLGenState): string;
    primitiveType(): any | undefined;
}
export declare class DateExpression extends CRUDExpressionClass {
    date: Date;
    constructor(date: Date);
    sqlSnippet(state: SQLGenState): string;
    primitiveType(): any | undefined;
}
export declare class UUIDExpression extends CRUDExpressionClass {
    uuid: string;
    constructor(uuid: string);
    sqlSnippet(state: SQLGenState): string;
    primitiveType(): any | undefined;
}
export declare class NullExpression extends CRUDExpressionClass {
    constructor();
    sqlSnippet(state: SQLGenState): string;
}
