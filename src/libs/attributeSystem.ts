import { assertNotImplemented } from './utils';

enum InputOperator {
  Multiply,
  Add,
  Exponentiate,
}

enum AggregationType {
  AddRaw,
  Multiple,
  AddFinal,
}

interface IElement {
  getValue: () => number;
}

interface IStatElement extends IElement {
  setValue: (val: number) => void;
}

const OPERATOR_FUNC = {
  [InputOperator.Multiply]: (operand: number, oldValue: number) =>
    operand * oldValue,
  [InputOperator.Add]: (operand: number, oldValue: number) =>
    operand + oldValue,
  [InputOperator.Exponentiate]: (operand: number, oldValue: number) =>
    Math.pow(oldValue, operand),
} as const;

const EPSILON = 0.00001;

class Connection {
  constructor(
    private readonly input: Element,
    private readonly output: Element,
    private readonly operator: InputOperator,
    public value: number,
    readonly aggregationType: AggregationType
  ) {}

  getValue(): number {
    return OPERATOR_FUNC[this.operator](this.value, this.input.getValue());
  }

  onChange(): void {
    this.output.onInputValueChanged();
  }

  setValue(newValue: number): void {
    this.value = newValue;
  }
}

class Element implements IStatElement {
  inputs: Connection[] = [];
  outputs: Connection[] = [];
  private _value: number | null = null;
  connectedConnectionValues: Connection[] = [];

  private _computeNewValue(): number {
    let raw = 0;
    let multiply = 1;
    let final = 0;
    this.inputs.forEach(connection => {
      switch (connection.aggregationType) {
        case AggregationType.AddRaw:
          raw += connection.getValue();
          break;
        case AggregationType.Multiple:
          multiply *= connection.getValue();
          break;
        case AggregationType.AddFinal:
          final += connection.getValue();
          break;
        default:
          assertNotImplemented(connection.aggregationType);
      }
    });

    return raw * multiply + final;
  }

  onInputValueChanged(): void {
    const newValue = this._computeNewValue();
    this._setValue(newValue);
  }

  getValue(): number {
    if (this._value === null) {
      this.onInputValueChanged();
    }

    return this._value!;
  }

  setValue(val: number): void {
    if (this.inputs.length > 0) throw new Error(`can't set value with inputs`);

    // almost equal values
    if (this._value !== null && Math.abs(this._value - val) < EPSILON) {
      return;
    }

    this._setValue(val);
  }

  private _setValue(val: number): void {
    this._value = val;
    this.outputs.forEach(o => o.onChange());

    this.connectedConnectionValues.forEach(c => {
      c.setValue(val);
      c.onChange();
    });
  }
}

class AttributeSystem<
  TStatAttributes extends string,
  TAttributes extends string,
  TAll extends TStatAttributes | TAttributes = TStatAttributes | TAttributes
> {
  _elements = new Map<TAll, Element>();

  _relationships: {
    targetAtt: TAttributes;
    inputAtt: TAll;
    operator: InputOperator;
    value: number;
    operandAtt?: TAll;
  }[] = [];

  get zeroElement() {
    return this._getOrCreateElement('__zero__' as any);
  }

  constructor() {
    this.zeroElement.setValue(0);
  }

  createRelationship(
    targetAtt: TAttributes,
    inputAtt: TAll,
    operator: InputOperator,
    value: number,
    aggregationType = AggregationType.AddRaw,
    operandAtt?: TAll
  ) {
    const r = {
      targetAtt,
      inputAtt,
      operator,
      value,
      operandAtt,
    } as const;

    const outputElement = this._getOrCreateElement(targetAtt as any);
    const inputElement = this._getOrCreateElement(inputAtt as any);
    const connection = new Connection(
      inputElement,
      outputElement,
      operator,
      value,
      aggregationType
    );
    if (operandAtt != null) {
      const operandElement = this._getOrCreateElement(operandAtt);
      operandElement.connectedConnectionValues.push(connection);
    }

    inputElement.outputs.push(connection);
    outputElement.inputs.push(connection);

    this._relationships.push(r);

    if (operandAtt != null) {
      const operandElement = this._getOrCreateElement(operandAtt);
      connection.setValue(operandElement.getValue());
      connection.onChange();
    }

    return r;
  }

  private _getOrCreateElement(att: TAll) {
    const exists = this._elements.get(att);

    if (exists !== undefined) {
      return exists;
    }

    const newElement = new Element();

    this._elements.set(att, newElement);

    return newElement;
  }

  private _getValue(att: TAll): number {
    return this._getOrCreateElement(att).getValue();
  }

  hasAttribute(att: TAll): boolean {
    return this._elements.has(att);
  }

  addMultiplyRelationship(
    targetAtt: TAttributes,
    inputAtt: TAll,
    value: number = 1
  ) {
    this.createRelationship(targetAtt, inputAtt, InputOperator.Multiply, value);

    return this;
  }

  addConditionalRelationship(
    targetAtt: TAttributes,
    inputAtt: TAll,
    operandAtt: TAll
  ) {
    this.createRelationship(
      targetAtt,
      inputAtt,
      InputOperator.Multiply,
      1,
      AggregationType.AddRaw,
      operandAtt
    );

    return this;
  }

  createConditionalAttribute(att: TAttributes, dependsOn: TAll) {
    this.addValueElement(att, 1, AggregationType.AddFinal);
    this.addValueElement(att, -1, AggregationType.AddRaw);

    return this.createRelationship(
      att,
      '__zero__' as any,
      InputOperator.Exponentiate,
      0,
      AggregationType.Multiple,
      dependsOn
    );
  }

  addValueElement(
    targetAtt: TAttributes,
    value: number,
    aggregationType: AggregationType
  ) {
    const outputElement = this._getOrCreateElement(targetAtt as any);

    const inputElement = new Element();

    const connection = new Connection(
      inputElement,
      outputElement,
      InputOperator.Multiply,
      1,
      aggregationType
    );

    inputElement.outputs.push(connection);
    outputElement.inputs.push(connection);

    // IMPORTANT: after connection to trigger onChange event
    inputElement.setValue(value);

    // dispose element
    const dispose = (): void => {
      outputElement.inputs = outputElement.inputs.filter(i => i !== connection); //TODO performance hit?
      inputElement.outputs.length = 0;
      outputElement.onInputValueChanged();
    };

    return { dispose, element: inputElement as IStatElement } as const;
  }

  setValue(att: TStatAttributes, val: number) {
    const element = this._getOrCreateElement(att as any);
    element.setValue(val);
  }

  addValue(att: TStatAttributes, val: number, max?: number) {
    const element = this._getOrCreateElement(att as any);
    let newValue = element.getValue() + val;
    if (max !== undefined) {
      newValue = Math.min(max, newValue);
    }
    element.setValue(newValue);
    return newValue;
  }

  getValue(att: TAll): number {
    return this._getValue(att);
  }

  isAboveZero(att: TAll): boolean {
    return this._getValue(att) > 0;
  }
}

type GAttributesKeys =
  | 'isFemale'
  | 'isFlying'
  | 'isSwimming'
  | 'currentMana'
  | 'currentHealth'
  | 'maxMana'
  | 'maxHealth'
  | 'playerNetClass'
  | 'totalMovementSpeed'
  | 'inSafeZone'
  | 'isSpearEquipped'
  /** 1 while weapons are bound to the back bone (safe zone / social action / swim). */
  | 'weaponsOnBack'
  /** Derived combat speeds (agility / class divisor); drive the attack/cast clip rate. */
  | 'attackSpeed'
  | 'magicSpeed';

type Stats = GAttributesKeys;
type Others = GAttributesKeys;

export type MUAttributeSystem = AttributeSystem<Stats, Others>;

export function createAttributeSystem(): MUAttributeSystem {
  return new AttributeSystem<Stats, Others>();
}
