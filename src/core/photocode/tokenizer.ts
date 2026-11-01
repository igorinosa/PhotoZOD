export interface Token {
  type: 'IDENTIFIER' | 'NUMBER' | 'COLON' | 'NEWLINE' | 'INDENT' | 'DEDENT' | 'EOF' | 'OPERATOR' | 'STRING';
  value: string;
  line: number;
  column: number;
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const lines = input.split('\n');
  let currentIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;

    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;

    if (indent > currentIndent) {
      tokens.push({ type: 'INDENT', value: '', line: i + 1, column: 0 });
      currentIndent = indent;
    } else if (indent < currentIndent) {
      tokens.push({ type: 'DEDENT', value: '', line: i + 1, column: 0 });
      currentIndent = indent;
    }

    const trimmed = line.trim();
    let col = indent;

    let j = 0;
    while (j < trimmed.length) {
      const char = trimmed[j];

      if (char === ':') {
        tokens.push({ type: 'COLON', value: ':', line: i + 1, column: col });
        j++;
        col++;
      } else if (/[a-zA-Z_]/.test(char)) {
        let value = '';
        while (j < trimmed.length && /[a-zA-Z0-9_]/.test(trimmed[j])) {
          value += trimmed[j];
          j++;
          col++;
        }
        tokens.push({ type: 'IDENTIFIER', value, line: i + 1, column: col - value.length });
      } else if (/[0-9.-]/.test(char) && (char !== '-' || (j + 1 < trimmed.length && /[0-9.]/.test(trimmed[j + 1])))) {
        let value = '';
        while (j < trimmed.length && /[0-9.-]/.test(trimmed[j])) {
          value += trimmed[j];
          j++;
          col++;
        }
        tokens.push({ type: 'NUMBER', value, line: i + 1, column: col - value.length });
      } else if (/[><=!+\-*/]/.test(char)) {
        let value = '';
        while (j < trimmed.length && /[><=!+\-*/]/.test(trimmed[j])) {
          value += trimmed[j];
          j++;
          col++;
        }
        tokens.push({ type: 'OPERATOR', value, line: i + 1, column: col - value.length });
      } else if (char === '"' || char === "'") {
        const quote = char;
        let value = '';
        j++;
        col++;
        while (j < trimmed.length && trimmed[j] !== quote) {
          value += trimmed[j];
          j++;
          col++;
        }
        if (j < trimmed.length) {
          j++; // skip closing quote
          col++;
        }
        tokens.push({ type: 'STRING', value, line: i + 1, column: col - value.length - 2 });
      } else if (/\s/.test(char)) {
        j++;
        col++;
      } else {
        // Fallback for other characters
        tokens.push({ type: 'IDENTIFIER', value: char, line: i + 1, column: col });
        j++;
        col++;
      }
    }
    tokens.push({ type: 'NEWLINE', value: '\n', line: i + 1, column: col });
  }

  while (currentIndent > 0) {
    tokens.push({ type: 'DEDENT', value: '', line: lines.length, column: 0 });
    currentIndent -= 2; // Assuming 2 spaces per indent
  }

  tokens.push({ type: 'EOF', value: '', line: lines.length, column: 0 });
  return tokens;
}
