import { tokenize } from '../../photocode/tokenizer';
import { Parser } from '../../photocode/parser';
import { Validator } from '../../photocode/validator';
import { Compiler, Operation } from '../../photocode/compiler';
import { executor } from '../../photocode/executor';
import { ImageMetadata } from '../../engines/metadata/exif';
import { blobToFloat32Array, float32ArrayToBlob } from './imageUtils';

export class RenderPipeline {
  private validator = new Validator();
  private compiler = new Compiler();

  public async compilePhotoCode(code: string, defaultAssetId?: string): Promise<Operation[]> {
    try {
      const tokens = tokenize(code);
      const parser = new Parser(tokens);
      const ast = parser.parse();
      
      this.validator.validate(ast);
      
      return await this.compiler.compile(ast, defaultAssetId);
    } catch (error) {
      console.error('[RenderPipeline] Compilation failed:', error);
      throw error;
    }
  }

  public async render(
    code: string, 
    sourceBlob: Blob, 
    metadata: ImageMetadata, 
    imageId: string
  ): Promise<Blob> {
    const operations = await this.compilePhotoCode(code, imageId);
    
    // Convert Blob to Float32Array
    const { buffer, width, height } = await blobToFloat32Array(sourceBlob);

    // Execute operations
    const processedBuffer = await executor.execute(operations, buffer, metadata, imageId);

    // Convert Float32Array back to Blob
    return float32ArrayToBlob(processedBuffer, width, height);
  }
}

export const renderPipeline = new RenderPipeline();
