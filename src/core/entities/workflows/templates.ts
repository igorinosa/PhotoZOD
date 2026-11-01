import { Rule, workflowRulesEngine } from './rules';

export type WorkflowTemplate = {
  id: string;
  name: string;
  description: string;
  rules: Omit<Rule, 'id'>[];
};

class WorkflowTemplateManager {
  private templates: WorkflowTemplate[] = [];

  constructor() {
    // Default templates
    this.templates.push({
      id: 'template_wedding',
      name: 'Wedding',
      description: 'Standard wedding workflow',
      rules: [
        { name: 'Bride Soft Skin', condition: "entity.tag == 'Bride'", action: "applyPreset('soft_skin')" },
        { name: 'Groom Contrast', condition: "entity.tag == 'Groom'", action: "applyPreset('contrast_sharp')" },
        { name: 'Guests Light Correction', condition: "entity.tag == 'Guest'", action: "applyPreset('light_correction')" }
      ]
    });
  }

  getTemplates(): WorkflowTemplate[] {
    return this.templates;
  }

  applyTemplate(templateId: string): void {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) throw new Error(`Template ${templateId} not found`);

    for (const rule of template.rules) {
      workflowRulesEngine.addRule(rule);
    }
  }
}

export const workflowTemplateManager = new WorkflowTemplateManager();
