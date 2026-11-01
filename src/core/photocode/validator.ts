import { ASTNode } from './parser';
import { FEATURE_REGISTRY, TARGET_REGISTRY } from '../system/featureRegistry';
import { assertFeature } from '../system/featureGuard';

function normalize(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '');
}

const NORMALIZED_OPERATIONS = Object.keys(FEATURE_REGISTRY).map(normalize);
const NORMALIZED_TARGETS = TARGET_REGISTRY.map(normalize);

export class Validator {
  validate(ast: ASTNode[], contextPath: string = '') {
    for (const node of ast) {
      if (!node.name) continue;

      const normalizedName = normalize(node.name);
      const fullPath = contextPath ? `${contextPath}.${normalizedName}` : normalizedName;

      if (node.type === 'Operation') {
        // If the parent path is a valid operation, this node is a parameter.
        if (contextPath && NORMALIZED_OPERATIONS.includes(contextPath)) {
          continue;
        }

        if (!NORMALIZED_OPERATIONS.includes(fullPath) && !NORMALIZED_OPERATIONS.includes(normalizedName)) {
          throw new Error(`Invalid operation: ${fullPath}`);
        }
        // Guard using the full path if it exists in registry, else fallback to name
        const keyToGuard = NORMALIZED_OPERATIONS.includes(fullPath) ? fullPath : node.name;
        assertFeature(keyToGuard);
      } else if (node.type === 'Target') {
        // Some operations might be written as blocks, e.g., Metadata: \n  Scrub: \n    mode: safe
        // We should allow this if the name is a valid target, OR if the full path is a valid operation,
        // OR if the full path is a prefix of a valid operation.
        const isOperation = NORMALIZED_OPERATIONS.includes(normalizedName) || NORMALIZED_OPERATIONS.includes(fullPath);
        const isPrefix = NORMALIZED_OPERATIONS.some(op => op.startsWith(fullPath + '.'));

        if (!NORMALIZED_TARGETS.includes(normalizedName) && !isOperation && !isPrefix) {
          throw new Error(`Invalid target: ${node.name}`);
        }
        if (node.children) {
          this.validate(node.children, fullPath);
        }
      }
    }
  }
}
