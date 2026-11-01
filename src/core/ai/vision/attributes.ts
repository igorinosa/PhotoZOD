export interface VisualAttributes {
  lighting: string;
  mood: string;
}

export function extractAttributes(caption: string): VisualAttributes {
  const lowerCaption = (caption || "").toLowerCase();
  
  let lighting = "neutral";
  if (lowerCaption.includes("sunset") || lowerCaption.includes("warm") || lowerCaption.includes("golden")) {
    lighting = "warm";
  } else if (lowerCaption.includes("dark") || lowerCaption.includes("shadow")) {
    lighting = "dark";
  } else if (lowerCaption.includes("bright") || lowerCaption.includes("sunny")) {
    lighting = "bright";
  }

  let mood = "neutral";
  if (lowerCaption.includes("dark") || lowerCaption.includes("moody") || lowerCaption.includes("dramatic")) {
    mood = "moody";
  } else if (lowerCaption.includes("bright") || lowerCaption.includes("happy") || lowerCaption.includes("sunny")) {
    mood = "bright";
  } else if (lowerCaption.includes("calm") || lowerCaption.includes("peaceful")) {
    mood = "calm";
  }

  return { lighting, mood };
}
