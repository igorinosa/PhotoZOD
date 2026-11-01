import { Token } from './tokenizer';

export interface ASTNode {
  type: string;
  name?: string;
  value?: string;
  expression?: string;
  entityName?: string;
  seed?: string;
  children?: ASTNode[];
}

export class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ASTNode[] {
    const ast: ASTNode[] = [];
    while (!this.isAtEnd()) {
      const node = this.parseStatement();
      if (node) ast.push(node);
    }
    return ast;
  }

  private parseStatement(): ASTNode | null {
    if (this.match('NEWLINE')) return null;

    if (this.match('IDENTIFIER')) {
      let name = this.previous().value;
      
      if (name === 'if') {
        // Conditional block
        let expression = '';
        while (!this.check('COLON') && !this.isAtEnd() && !this.check('NEWLINE')) {
          expression += this.advance().value + ' ';
        }
        expression = expression.trim();
        
        this.consume('COLON', 'Expected colon after if expression.');
        this.consume('NEWLINE', 'Expected newline after colon.');
        
        const children = this.parseBlock();
        return { type: 'ConditionalBlock', expression, children };
      }

      // Consume multi-word identifiers (e.g., "Skin Smooth")
      while (this.match('IDENTIFIER')) {
        name += ' ' + this.previous().value;
      }
      
      if (this.match('COLON')) {
        if (name === 'Seed') {
          if (this.match('IDENTIFIER') || this.match('STRING') || this.match('NUMBER')) {
            const seed = this.previous().value;
            this.consume('NEWLINE', 'Expected newline after seed value.');
            return { type: 'Seed', seed };
          }
        }

        if (name === 'entity') {
          // Entity block
          if (this.match('IDENTIFIER') || this.match('STRING')) {
            const entityName = this.previous().value;
            this.consume('NEWLINE', 'Expected newline after entity name.');
            const children = this.parseBlock();
            return { type: 'EntityBlock', entityName, children };
          }
        }
        
        if (name === 'batch') {
          // Batch block
          this.consume('NEWLINE', 'Expected newline after batch:');
          const children = this.parseBlock();
          return { type: 'BatchBlock', children };
        }
        
        if (this.match('NUMBER') || this.match('OPERATOR') || this.match('IDENTIFIER') || this.match('STRING')) {
          let value = this.previous().value;
          while (!this.check('NEWLINE') && !this.isAtEnd()) {
            value += this.advance().value;
          }
          this.consume('NEWLINE', 'Expected newline after value.');
          return { type: 'Operation', name, value };
        } else if (this.match('NEWLINE')) {
          // Block
          const children = this.parseBlock();
          return { type: 'Target', name, children };
        }
      }
    }

    this.advance();
    return null;
  }

  private parseBlock(): ASTNode[] {
    const children: ASTNode[] = [];
    if (this.match('INDENT')) {
      while (!this.check('DEDENT') && !this.isAtEnd()) {
        const child = this.parseStatement();
        if (child) children.push(child);
      }
      this.consume('DEDENT', 'Expected dedent after block.');
    }
    return children;
  }

  private match(...types: string[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: string): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: string, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(`[Parser] Error at line ${this.peek().line}: ${message}`);
  }
}
