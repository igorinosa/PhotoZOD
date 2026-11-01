import { CollectionRule, RuleNode } from './types';

export type UICondition = {
  field: string;
  operator: string;
  value: any;
};

export type UIGroup = {
  type: "AND" | "OR";
  conditions: (UICondition | UIGroup)[];
};

export function compileUIRule(uiGroup: UIGroup): CollectionRule {
  return convert(uiGroup);
}

function convert(group: UIGroup): RuleNode {
  return {
    type: "group",
    operator: group.type,
    children: group.conditions.map(item => {
      if ("conditions" in item) return convert(item as UIGroup);

      const condition = item as UICondition;
      return {
        type: "condition",
        field: condition.field,
        operator: condition.operator,
        value: condition.value
      };
    })
  };
}

export function validateUIRule(rule: UIGroup) {
  if (!rule.conditions.length) throw new Error("Empty rule");
  
  for (const item of rule.conditions) {
    if ("conditions" in item) {
      validateUIRule(item as UIGroup);
    } else {
      const condition = item as UICondition;
      if (!condition.field) throw new Error("Condition field is required");
      if (!condition.operator) throw new Error("Condition operator is required");
    }
  }
}
