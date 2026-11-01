import { FormatGroup, FORMAT_MAPPING } from "./formatConstants";

export class FormatResolver {
  /**
   * Resolves the format group for a given extension or filename.
   * @param input The extension (e.g., "cr2") or filename (e.g., "image.CR2").
   * @returns The resolved FormatGroup.
   */
  static resolve(input: string): FormatGroup {
    if (!input) return "other";

    // Normalize: get extension if it's a filename, then lowercase
    let ext = input.includes(".") 
      ? input.split(".").pop() || "" 
      : input;
    
    ext = ext.toLowerCase().trim();

    if (!ext) return "other";

    return FORMAT_MAPPING[ext] || "other";
  }

  /**
   * Returns a list of all supported format groups.
   */
  static getGroups(): FormatGroup[] {
    return ["raw", "jpeg", "png", "heic", "other"];
  }
}

export const formatResolver = new FormatResolver();
