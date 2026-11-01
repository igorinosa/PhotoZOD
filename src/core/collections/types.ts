export type Collection = {
  id: string;
  name: string;
  rule: RuleNode;   // SSOT
  createdAt: number;
  updatedAt: number;
  isSmart?: boolean;
  readonly?: boolean;
};

export type RuleNode =
  | {
      type: "condition";
      field: string;
      operator: string;
      value: any;
    }
  | {
      type: "group";
      operator: "AND" | "OR";
      children: RuleNode[];
    };

export type CollectionRule = RuleNode;

export function validateRule(node: RuleNode) {
  const validOperators = ["=", "!=", ">", ">=", "<", "<=", "contains", "not_contains", "exists", "not_exists", "length>", "length>=", "length<", "length<=", "length="];

  if (node.type === "condition") {
    if (!node.field) throw new Error("Filter field is required");
    if (!validOperators.includes(node.operator)) {
      throw new Error(`Unsupported operator: ${node.operator}`);
    }
  } else if (node.type === "group") {
    if (!node.children.length) throw new Error("Empty group");
    for (const child of node.children) {
      validateRule(child);
    }
  }
}
