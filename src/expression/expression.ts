
export type ExpressionProducer = () => CRUDExpression;

export abstract class CRUDExpression {}

export class ColumnExpression extends CRUDExpression {
    constructor(public column: string) {
        super();
    }
}

export class AndExpression extends CRUDExpression {
    constructor(public lhs: CRUDExpression, public rhs: CRUDExpression) {
        super();
    }
}

export class OrExpression extends CRUDExpression {
    constructor(public lhs: CRUDExpression, public rhs: CRUDExpression) {
        super();
    }
}

export class EqualityExpression extends CRUDExpression {
    constructor(public lhs: CRUDExpression, public rhs: CRUDExpression) {
        super();
    }
}

export class InEqualityExpression extends CRUDExpression {
    constructor(public lhs: CRUDExpression, public rhs: CRUDExpression) {
        super();
    }
}

export class NotExpression extends CRUDExpression {
    constructor(public rhs: CRUDExpression) {
        super();
    }
}

export class LessThanExpression extends CRUDExpression {
    constructor(public lhs: CRUDExpression, public rhs: CRUDExpression) {
        super();
    }
}

export class LessThanEqualExpression extends CRUDExpression {
    constructor(public lhs: CRUDExpression, public rhs: CRUDExpression) {
        super();
    }
}

export class GreaterThanExpression extends CRUDExpression {
    constructor(public lhs: CRUDExpression, public rhs: CRUDExpression) {
        super();
    }
}

export class GreaterThanEqualExpression extends CRUDExpression {
    constructor(public lhs: CRUDExpression, public rhs: CRUDExpression) {
        super();
    }
}

export class InExpression extends CRUDExpression {
    constructor(public lhs: CRUDExpression, public rhs: CRUDExpression[]) {
        super();
    }
}

export class LikeExpression extends CRUDExpression {
    constructor(public lhs: CRUDExpression, public wild1: boolean, public string: string, public wild2: boolean) {
        super();
    }
}

export class LazyExpression extends CRUDExpression {
    constructor(public expressionProducer: ExpressionProducer) {
        super();
    }
}

export class IntegerExpression extends CRUDExpression {
    constructor(public int: number) {
        super();
    }
}

export class DecimalExpression extends CRUDExpression {
    constructor(public decimal: number) {
        super();
    }
}

export class StringExpression extends CRUDExpression {
    constructor(public str: string) {
        super();
    }
}

class BlobExpression extends CRUDExpression {
    constructor(public blob: Uint8Array) {
        super();
    }
}

class SBlobExpression extends CRUDExpression {
    constructor(public sblob: Int8Array) {
        super();
    }
}


export class BoolExpression extends CRUDExpression {
    constructor(public bool: boolean) {
        super();
    }
}

export class DateExpression extends CRUDExpression {
    constructor(public date: Date) {
        super();
    }
}

export class UUIDExpression extends CRUDExpression {
    constructor(public uuid: string) {
        super();
    }
}

export class NullExpression extends CRUDExpression {
    constructor() {
        super();
    }
}
