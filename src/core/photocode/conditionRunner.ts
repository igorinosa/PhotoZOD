import { ImageMetadata } from '../engines/metadata/exif';

export class ConditionEngine {
  static evaluate(condition: string, metadata: ImageMetadata): boolean {
    console.log(`[ConditionEngine] Evaluating condition: ${condition}`);
    
    try {
      // Basic parser for: field operator value
      const match = condition.match(/([a-zA-Z_]+)\s*(>|<|>=|<=|==|!=|=)\s*(.+)/);
      if (!match) return true; // Default to true if unparseable
      
      const [, field, operator, valueStr] = match;
      
      // Get field value from metadata
      let actualValue: any;
      switch (field.toLowerCase()) {
        case 'iso': actualValue = metadata.iso; break;
        case 'aperture': actualValue = metadata.aperture; break;
        case 'shutter': actualValue = metadata.shutterSpeed; break;
        case 'camera': actualValue = metadata.camera; break;
        case 'lens': actualValue = metadata.lens; break;
        default: return true; // Unknown field
      }
      
      if (actualValue === undefined) return false;
      
      // Parse expected value
      let expectedValue: any = valueStr.trim().replace(/['"]/g, '');
      if (!isNaN(Number(expectedValue))) {
        expectedValue = Number(expectedValue);
      }
      
      // Evaluate
      switch (operator) {
        case '>': return actualValue > expectedValue;
        case '<': return actualValue < expectedValue;
        case '>=': return actualValue >= expectedValue;
        case '<=': return actualValue <= expectedValue;
        case '==': 
        case '=': return actualValue == expectedValue;
        case '!=': return actualValue != expectedValue;
        default: return true;
      }
    } catch (e) {
      console.error(`[ConditionEngine] Error evaluating condition: ${condition}`, e);
      return true;
    }
  }
}
