/**
 * 🧩 PART 7G.1.4 — TIME PARSER
 * Human input (+2h, -30m, +90s) → machine value (milliseconds)
 */

export function parseTimeShift(input: string): number {
  const regex = /^([+-])?(\d+)([hmsd])$/;
  const match = input.trim().match(regex);

  if (!match) {
    // Try absolute date if it doesn't match shift pattern?
    // For now, let's just handle shifts.
    return 0;
  }

  const sign = match[1] === '-' ? -1 : 1;
  const value = parseInt(match[2], 10);
  const unit = match[3];

  let ms = 0;
  switch (unit) {
    case 's':
      ms = value * 1000;
      break;
    case 'm':
      ms = value * 60 * 1000;
      break;
    case 'h':
      ms = value * 60 * 60 * 1000;
      break;
    case 'd':
      ms = value * 24 * 60 * 60 * 1000;
      break;
  }

  return sign * ms;
}
