export interface FeatureDefinition {
  category: 'adjustment' | 'metadata' | 'retouch' | 'mask';
  engine: {
    name: string;
    method: string;
  };
  params: Record<string, any>;
  zod: {
    intents: string[];
    examples: string[];
  };
  photocode: {
    syntax: string;
    supported: boolean;
  };
  deprecated?: boolean;
  replacement?: string;
}

export const FEATURE_REGISTRY: Record<string, FeatureDefinition> = {
  // --- Adjustments ---
  "Exposure": {
    category: "adjustment",
    engine: {
      name: "ImageEngine",
      method: "adjustExposure"
    },
    params: { min: -5, max: 5, type: "number" },
    zod: {
      intents: ["brighten", "increase exposure", "darken", "exposure", "light"],
      examples: ["make image brighter", "darken the photo"]
    },
    photocode: {
      syntax: "Exposure: +0.5",
      supported: true
    }
  },
  "Contrast": {
    category: "adjustment",
    engine: {
      name: "ImageEngine",
      method: "adjustContrast"
    },
    params: { min: -100, max: 100, type: "number" },
    zod: {
      intents: ["contrast", "punch", "flat"],
      examples: ["increase contrast", "make it punchy"]
    },
    photocode: {
      syntax: "Contrast: 10",
      supported: true
    }
  },
  "Saturation": {
    category: "adjustment",
    engine: {
      name: "ImageEngine",
      method: "adjustSaturation"
    },
    params: { min: -100, max: 100, type: "number" },
    zod: {
      intents: ["saturation", "color", "vivid", "black and white", "b&w"],
      examples: ["make colors pop", "convert to black and white"]
    },
    photocode: {
      syntax: "Saturation: 15",
      supported: true
    }
  },
  "Temperature": {
    category: "adjustment",
    engine: {
      name: "ImageEngine",
      method: "adjustTemperature"
    },
    params: { min: -100, max: 100, type: "number" },
    zod: {
      intents: ["temperature", "warm", "cool", "white balance"],
      examples: ["warm up the image", "make it cooler"]
    },
    photocode: {
      syntax: "Temperature: 500",
      supported: true
    }
  },
  "Tint": {
    category: "adjustment",
    engine: {
      name: "ImageEngine",
      method: "adjustTint"
    },
    params: { min: -100, max: 100, type: "number" },
    zod: {
      intents: ["tint", "green", "magenta"],
      examples: ["adjust tint to magenta"]
    },
    photocode: {
      syntax: "Tint: 10",
      supported: true
    }
  },
  "Vibrance": {
    category: "adjustment",
    engine: {
      name: "ImageEngine",
      method: "adjustVibrance"
    },
    params: { min: -100, max: 100, type: "number" },
    zod: {
      intents: ["vibrance", "pop"],
      examples: ["increase vibrance"]
    },
    photocode: {
      syntax: "Vibrance: 20",
      supported: true
    }
  },
  "Highlights": {
    category: "adjustment",
    engine: {
      name: "ImageEngine",
      method: "adjustHighlights"
    },
    params: { min: -100, max: 100, type: "number" },
    zod: {
      intents: ["highlights", "brights"],
      examples: ["recover highlights", "lower brights"]
    },
    photocode: {
      syntax: "Highlights: -20",
      supported: true
    }
  },
  "Shadows": {
    category: "adjustment",
    engine: {
      name: "ImageEngine",
      method: "adjustShadows"
    },
    params: { min: -100, max: 100, type: "number" },
    zod: {
      intents: ["shadows", "darks", "lift shadows"],
      examples: ["lift shadows", "darken shadows"]
    },
    photocode: {
      syntax: "Shadows: 15",
      supported: true
    }
  },
  "Whites": {
    category: "adjustment",
    engine: {
      name: "ImageEngine",
      method: "adjustWhites"
    },
    params: { min: -100, max: 100, type: "number" },
    zod: {
      intents: ["whites", "white point"],
      examples: ["increase whites"]
    },
    photocode: {
      syntax: "Whites: 10",
      supported: true
    }
  },
  "Blacks": {
    category: "adjustment",
    engine: {
      name: "ImageEngine",
      method: "adjustBlacks"
    },
    params: { min: -100, max: 100, type: "number" },
    zod: {
      intents: ["blacks", "black point"],
      examples: ["crush blacks"]
    },
    photocode: {
      syntax: "Blacks: -10",
      supported: true
    }
  },
  "Clarity": {
    category: "adjustment",
    engine: {
      name: "ImageEngine",
      method: "adjustClarity"
    },
    params: { min: -100, max: 100, type: "number" },
    zod: {
      intents: ["clarity", "midtone contrast"],
      examples: ["increase clarity"]
    },
    photocode: {
      syntax: "Clarity: 15",
      supported: true
    }
  },
  "Dehaze": {
    category: "adjustment",
    engine: {
      name: "ImageEngine",
      method: "adjustDehaze"
    },
    params: { min: -100, max: 100, type: "number" },
    zod: {
      intents: ["dehaze", "fog", "haze"],
      examples: ["remove haze", "add fog"]
    },
    photocode: {
      syntax: "Dehaze: 20",
      supported: true
    }
  },
  "Vignette": {
    category: "adjustment",
    engine: {
      name: "ImageEngine",
      method: "adjustVignette"
    },
    params: { min: -100, max: 100, type: "number" },
    zod: {
      intents: ["vignette", "dark edges"],
      examples: ["add vignette", "darken edges"]
    },
    photocode: {
      syntax: "Vignette: -15",
      supported: true
    }
  },
  "Sharpness": {
    category: "adjustment",
    engine: {
      name: "ImageEngine",
      method: "adjustSharpness"
    },
    params: { min: 0, max: 100, type: "number" },
    zod: {
      intents: ["sharpness", "sharpen", "crisp"],
      examples: ["sharpen image", "make it crisp"]
    },
    photocode: {
      syntax: "Sharpness: 25",
      supported: true
    }
  },

  // --- Retouching ---
  "Skin Smooth": {
    category: "retouch",
    engine: {
      name: "RetouchEngine",
      method: "skinSmooth"
    },
    params: { min: 0, max: 100, type: "number" },
    zod: {
      intents: ["smooth skin", "soften skin", "skin"],
      examples: ["smooth the skin"]
    },
    photocode: {
      syntax: "Skin Smooth: 30",
      supported: true
    }
  },
  "Noise Reduction": {
    category: "retouch",
    engine: {
      name: "RetouchEngine",
      method: "noiseReduction"
    },
    params: { min: 0, max: 100, type: "number" },
    zod: {
      intents: ["noise reduction", "denoise", "grain"],
      examples: ["reduce noise", "remove grain"]
    },
    photocode: {
      syntax: "Noise Reduction: 20",
      supported: true
    }
  },

  // --- Metadata ---
  "Metadata.Date.shift": {
    category: "metadata",
    engine: {
      name: "DateEngine",
      method: "applyDateShift"
    },
    params: { format: "+1h | -30m", type: "string" },
    zod: {
      intents: ["fix time", "adjust date", "timezone", "shift time", "change time"],
      examples: ["fix camera time by 2 hours"]
    },
    photocode: {
      syntax: "Metadata:\n  Date:\n    shift: +2h",
      supported: true
    }
  },
  "Metadata.Date.set": {
    category: "metadata",
    engine: {
      name: "DateEngine",
      method: "setAbsoluteDate"
    },
    params: { format: "ISO8601", type: "string" },
    zod: {
      intents: ["set time", "set date"],
      examples: ["set date to 2026-01-01"]
    },
    photocode: {
      syntax: "Metadata:\n  Date:\n    set: 2026-01-01T12:00:00Z",
      supported: true
    }
  },
  "Metadata.Copyright": {
    category: "metadata",
    engine: {
      name: "MetadataEngine",
      method: "injectCopyright"
    },
    params: { format: "object", type: "object" },
    zod: {
      intents: ["copyright", "protect", "watermark metadata"],
      examples: ["add copyright info"]
    },
    photocode: {
      syntax: "Metadata:\n  Copyright:\n    author: \"John Doe\"\n    notice: \"© 2026\"",
      supported: true
    }
  },
  "Metadata.Copyright.author": {
    category: "metadata",
    engine: {
      name: "MetadataEngine",
      method: "injectCopyrightAuthor"
    },
    params: { format: "string", type: "string" },
    zod: {
      intents: ["author", "creator", "add copyright", "author name"],
      examples: ["add my name to metadata"]
    },
    photocode: {
      syntax: "Metadata:\n  Copyright:\n    author: \"John Doe\"",
      supported: true
    }
  },
  "Metadata.Copyright.notice": {
    category: "metadata",
    engine: {
      name: "MetadataEngine",
      method: "injectCopyrightNotice"
    },
    params: { format: "string", type: "string" },
    zod: {
      intents: ["copyright notice"],
      examples: ["set copyright notice"]
    },
    photocode: {
      syntax: "Metadata:\n  Copyright:\n    notice: \"© 2026\"",
      supported: true
    }
  },
  "Metadata.Copyright.email": {
    category: "metadata",
    engine: {
      name: "MetadataEngine",
      method: "injectCopyrightEmail"
    },
    params: { format: "string", type: "string" },
    zod: {
      intents: ["email"],
      examples: ["add email to metadata"]
    },
    photocode: {
      syntax: "Metadata:\n  Copyright:\n    email: \"john@example.com\"",
      supported: true
    }
  },
  "Metadata.Copyright.website": {
    category: "metadata",
    engine: {
      name: "MetadataEngine",
      method: "injectCopyrightWebsite"
    },
    params: { format: "string", type: "string" },
    zod: {
      intents: ["website", "url"],
      examples: ["add website to metadata"]
    },
    photocode: {
      syntax: "Metadata:\n  Copyright:\n    website: \"www.example.com\"",
      supported: true
    }
  },
  "Metadata.Scrub": {
    category: "metadata",
    engine: {
      name: "MetadataEngine",
      method: "scrub"
    },
    params: {
      mode: ["safe", "full", "custom"],
      remove: "array",
      preserve: "array"
    },
    zod: {
      intents: [
        "remove metadata",
        "strip metadata",
        "remove gps",
        "protect privacy",
        "clean photo data"
      ],
      examples: [
        "remove all metadata",
        "remove gps from image",
        "clean private data before export"
      ]
    },
    photocode: {
      syntax: "Metadata:\n  Scrub:\n    mode: safe",
      supported: true
    }
  }
};

export const TARGET_REGISTRY = [
  "Subject", "Background", "Sky", "Portrait", "Landscape"
];
