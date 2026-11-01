import { Entity } from '../schema';
import { entityPresetManager } from '../presets/entityPresetManager';

export type Rule = {
  id: string;
  name: string;
  condition: string; // e.g., "entity.tag == 'Bride'"
  action: string; // e.g., "applyPreset('soft_skin')"
};

class WorkflowRulesEngine {
  private rules: Rule[] = [];

  addRule(rule: Omit<Rule, 'id'>): Rule {
    const now = Date.now();
    const id = `rule_${now}_${rule.name.replace(/\s+/g, '_').toLowerCase()}`;
    const newRule: Rule = {
      ...rule,
      id
    };
    this.rules.push(newRule);
    return newRule;
  }

  removeRule(id: string): void {
    this.rules = this.rules.filter(r => r.id !== id);
  }

  getRules(): Rule[] {
    return this.rules;
  }

  async evaluate(entity: Entity): Promise<string[]> {
    const photocodes: string[] = [];

    for (const rule of this.rules) {
      if (this.evaluateCondition(rule.condition, entity)) {
        const code = await this.executeAction(rule.action, entity);
        if (code) photocodes.push(code);
      }
    }

    return photocodes;
  }

  private evaluateCondition(condition: string, entity: Entity): boolean {
    // Simple parser for "entity.tag == 'Bride'"
    const tagMatch = condition.match(/entity\.tag\s*==\s*['"]([^'"]+)['"]/);
    if (tagMatch) {
      const tag = tagMatch[1];
      return entity.metadata?.tags?.includes(tag) ?? false;
    }

    const nameMatch = condition.match(/entity\.name\s*==\s*['"]([^'"]+)['"]/);
    if (nameMatch) {
      const name = nameMatch[1];
      return entity.metadata?.name === name;
    }

    return false;
  }

  private async executeAction(action: string, entity: Entity): Promise<string | null> {
    // Simple parser for "applyPreset('preset_id')"
    const presetMatch = action.match(/applyPreset\(['"]([^'"]+)['"]\)/);
    if (presetMatch) {
      const presetId = presetMatch[1];
      const preset = await entityPresetManager.getPreset(presetId);
      if (preset) {
        // Inject entity scope into preset if not already present
        let code = preset.photocode || '';
        if (!code.includes(`entity: ${entity.metadata?.name}`)) {
          code = `entity: ${entity.metadata?.name || entity.id}\n  ${code.split('\n').join('\n  ')}`;
        }
        return code;
      }
    }
    return null;
  }
}

export const workflowRulesEngine = new WorkflowRulesEngine();

export async function evaluateRules(entity: Entity): Promise<string[]> {
  return await workflowRulesEngine.evaluate(entity);
}
