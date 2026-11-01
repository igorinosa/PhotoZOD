// PhotoCode Contract
// Version: 1.0.0
export interface PhotoCodeInput {
  photocode: string;
}

export interface PhotoCodeOutput {
  executionPlan: any; // Define execution plan structure
}

// Rules:
// 1. ALL edits must come from PhotoCode
// 2. UI cannot apply edits directly
// 3. AI must generate PhotoCode, not pixels
