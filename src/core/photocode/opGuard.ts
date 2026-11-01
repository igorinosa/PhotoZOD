import { Operation } from './compiler';

export function guardOperation(op: any): Operation {
  if (!op) throw new Error("Null operation");
  if (!op.type) throw new Error("Invalid operation: missing type");

  if (!op.params) {
    op.params = {};
  }

  return op as Operation;
}
