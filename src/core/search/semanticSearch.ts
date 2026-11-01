import { RuleNode } from '../collections/types';
import { entityStore } from '../entities/entityStore';

const NOISE_WORDS = new Set(['photos', 'images', 'pictures', 'of', 'from', 'the', 'a', 'an', 'in', 'on', 'at', 'with', 'and', 'or', 'show', 'me', 'find']);

export async function parseSemanticQuery(query: string): Promise<RuleNode | null> {
  const orGroups = query.split(/\s+or\s+/i).map(g => g.trim()).filter(g => g.length > 0);
  if (orGroups.length === 0) return null;

  const parsedOrGroups: RuleNode[] = [];

  for (const group of orGroups) {
    const words = group.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    if (words.length === 0) continue;

    const rules: RuleNode[] = [];
    let i = 0;
    let negateNext = false;

    while (i < words.length) {
      const word = words[i];

      if (word === 'not') {
        negateNext = true;
        i++;
        continue;
      }

      // Skip noise words
      if (NOISE_WORDS.has(word)) {
        i++;
        continue;
      }

      let rule: RuleNode | null = null;
      let advance = 1;

      if (word.startsWith('person:')) {
        const personName = word.replace('person:', '').toLowerCase();
        const people = await entityStore.getAll();
        const matchedPeople = people.filter(p => p.name && p.name.toLowerCase().includes(personName));
        if (matchedPeople.length > 0) {
          if (matchedPeople.length === 1) {
            rule = { type: 'condition', field: 'entityIds', operator: 'contains', value: matchedPeople[0].id };
          } else {
            rule = {
              type: 'group',
              operator: 'OR',
              children: matchedPeople.map(p => ({ type: 'condition', field: 'entityIds', operator: 'contains', value: p.id }))
            };
          }
        } else {
          // No match, create a rule that always fails
          rule = { type: 'condition', field: 'entityIds', operator: 'contains', value: 'non_existent_id' };
        }
      }
      // Quality signals
      else if (['best', 'great', 'awesome', 'amazing', 'perfect'].includes(word)) {
        rule = { type: 'condition', field: 'qualityScore', operator: '>', value: 0.8 };
      }
      else if (['good', 'nice', 'decent'].includes(word)) {
        rule = { type: 'condition', field: 'qualityScore', operator: '>', value: 0.6 };
      }
      // Time filters
      else if (word === 'recent' || word === 'recently' || word === 'new') {
        rule = { type: 'condition', field: 'importedAt', operator: '>', value: Date.now() - (7 * 24 * 60 * 60 * 1000) };
      }
      else if (word === 'today') {
        rule = { type: 'condition', field: 'importedAt', operator: '>', value: Date.now() - (24 * 60 * 60 * 1000) };
      }
      else if (word === 'yesterday') {
        rule = { type: 'condition', field: 'importedAt', operator: '>', value: Date.now() - (2 * 24 * 60 * 60 * 1000) };
      }
      else if (word === 'last' && i + 1 < words.length) {
        const nextWord = words[i + 1];
        if (nextWord === 'week') {
          rule = { type: 'condition', field: 'importedAt', operator: '>', value: Date.now() - (7 * 24 * 60 * 60 * 1000) };
          advance = 2;
        } else if (nextWord === 'month') {
          rule = { type: 'condition', field: 'importedAt', operator: '>', value: Date.now() - (30 * 24 * 60 * 60 * 1000) };
          advance = 2;
        } else if (nextWord === 'year') {
          rule = { type: 'condition', field: 'importedAt', operator: '>', value: Date.now() - (365 * 24 * 60 * 60 * 1000) };
          advance = 2;
        }
      }

      if (!rule) {
        // Pick status
        if (['picked', 'pick', 'flagged', 'flag'].includes(word)) {
          rule = { type: 'condition', field: 'pickStatus', operator: '=', value: 'picked' };
        }
        else if (['rejected', 'reject', 'x'].includes(word)) {
          rule = { type: 'condition', field: 'pickStatus', operator: '=', value: 'rejected' };
        }
        else if (['unflagged', 'unpicked', 'neutral'].includes(word)) {
          rule = { type: 'condition', field: 'pickStatus', operator: '=', value: 'unflagged' };
        }
        // Trash status
        else if (['trash', 'trashed', 'deleted'].includes(word)) {
          rule = { type: 'condition', field: 'isTrashed', operator: '=', value: true };
        }
        else if (['bad'].includes(word)) {
          rule = { type: 'condition', field: 'culling', operator: '=', value: 'trash' };
        }
        else if (['kept', 'keep', 'saved', 'favorites'].includes(word)) {
          rule = { type: 'condition', field: 'culling', operator: '=', value: 'keep' };
        }
        else if (['maybe', 'unsure'].includes(word)) {
          rule = { type: 'condition', field: 'culling', operator: '=', value: 'maybe' };
        }
        else if (word === 'unrated') {
          rule = { type: 'condition', field: 'unrated', operator: '=', value: true };
        }
        else if (word === 'untagged') {
          rule = { type: 'condition', field: 'no-tags', operator: '=', value: true };
        }
        // Format Groups
        else if (['raw', 'cr2', 'nef', 'arw', 'dng', 'raf'].includes(word)) {
          rule = { type: 'condition', field: 'formatGroup', operator: '=', value: 'raw' };
        }
        else if (['jpeg', 'jpg'].includes(word)) {
          rule = { type: 'condition', field: 'formatGroup', operator: '=', value: 'jpeg' };
        }
        else if (['png'].includes(word)) {
          rule = { type: 'condition', field: 'formatGroup', operator: '=', value: 'png' };
        }
        else if (['heic', 'heif'].includes(word)) {
          rule = { type: 'condition', field: 'formatGroup', operator: '=', value: 'heic' };
        }
        else if (['tiff', 'webp', 'bmp', 'gif', 'other'].includes(word)) {
          rule = { type: 'condition', field: 'formatGroup', operator: '=', value: 'other' };
        }
        else if (word === 'no' && i + 1 < words.length && words[i + 1] === 'color') {
          rule = { type: 'condition', field: 'no color', operator: '=', value: true };
          advance = 2;
        }
      }

      if (!rule) {
        // Content types
        if (['portrait', 'portraits', 'face', 'faces', 'people', 'person'].includes(word)) {
          rule = { type: 'condition', field: 'ai.faces', operator: 'length>', value: 0 };
        }
        else if (['duplicate', 'duplicates'].includes(word)) {
          rule = { type: 'condition', field: 'duplicateGroupId', operator: '!=', value: null };
        }
        // Colors
        else if (['red', 'green', 'blue'].includes(word)) {
          rule = { type: 'condition', field: 'colorTag', operator: '=', value: word };
        }
        // Star ratings
        else if (['1', '2', '3', '4', '5'].includes(word) && i + 1 < words.length && ['star', 'stars'].includes(words[i + 1])) {
          rule = { type: 'condition', field: 'rating', operator: '>=', value: parseInt(word, 10) };
          advance = 2;
        }
        // Fallback: Person name matching or Tag
        else {
          const people = await entityStore.getAll();
          const matchedPeople = people.filter(p => p.name && p.name.toLowerCase().split(/\s+/).includes(word));
          if (matchedPeople.length > 0) {
            if (matchedPeople.length === 1) {
              rule = { type: 'condition', field: 'entityIds', operator: 'contains', value: matchedPeople[0].id };
            } else {
              rule = {
                type: 'group',
                operator: 'OR',
                children: matchedPeople.map(p => ({ type: 'condition', field: 'entityIds', operator: 'contains', value: p.id }))
              };
            }
          } else {
            rule = { type: 'condition', field: 'ai.tags', operator: 'contains', value: word };
          }
        }
      }

      if (rule) {
        if (negateNext && rule.type === 'condition') {
          rule.operator = invertOperator(rule.operator);
          negateNext = false;
        }
        rules.push(rule);
        i += advance;
      } else {
        i++;
      }
    }

    if (rules.length === 1) {
      parsedOrGroups.push(rules[0]);
    } else if (rules.length > 1) {
      parsedOrGroups.push({ type: 'group', operator: 'AND', children: rules });
    }
  }

  if (parsedOrGroups.length === 0) return null;
  if (parsedOrGroups.length === 1) return parsedOrGroups[0];

  return {
    type: 'group',
    operator: 'OR',
    children: parsedOrGroups
  };
}

function invertOperator(op: string): string {
  switch (op) {
    case '=': return '!=';
    case '!=': return '=';
    case '>': return '<=';
    case '>=': return '<';
    case '<': return '>=';
    case '<=': return '>';
    case 'contains': return 'not_contains';
    case 'not_contains': return 'contains';
    case 'exists': return 'not_exists';
    case 'not_exists': return 'exists';
    case 'length>': return 'length<=';
    case 'length>=': return 'length<';
    case 'length<': return 'length>=';
    case 'length<=': return 'length>';
    case 'length=': return 'length!=';
    default: return op;
  }
}
