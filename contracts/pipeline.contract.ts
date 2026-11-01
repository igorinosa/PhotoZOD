// Pipeline Contract
// Version: 1.0.0
export enum PipelineStage {
  IMPORT = 'IMPORT',
  IDENTITY = 'IDENTITY',
  VISUAL_MATCH = 'VISUAL_MATCH',
  ANALYSIS = 'ANALYSIS',
  ENTITY = 'ENTITY',
  EXECUTION = 'EXECUTION'
}

// Rules:
// Order MUST be: Import -> Identity -> Visual Match -> Analysis -> Entity -> Execution
