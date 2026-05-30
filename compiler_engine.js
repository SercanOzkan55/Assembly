/**
 * Manually hand-coded Lexer, Parser, Symbol Table, and Semantic Analyzer
 * for the Two-Pass Compiler design project.
 */

class CompilerEngine {
  constructor() {
    this.source = "";
    this.tokens = [];
    this.errors = [];
    this.symbolTable = []; // Flattened representation of all symbols for UI display
    this.scopeStack = [new Map()]; // Stack of symbol map scopes
    this.memoryOffset = 0; // Simulated memory address tracker
  }

  // ==========================================
  // PASS 1: LEXICAL ANALYSIS (LEXER)
  // ==========================================
  tokenize(source) {
    this.source = source;
    this.tokens = [];
    this.errors = [];
    
    let pos = 0;
    let line = 1;
    let col = 1;
    const len = source.length;

    const isAlpha = c => /[a-zA-Z_]/.test(c);
    const isDigit = c => /[0-9]/.test(c);
    const isAlphaNum = c => /[a-zA-Z0-9_]/.test(c);

    while (pos < len) {
      let char = source[pos];

      // Newlines
      if (char === '\n') {
        line++;
        col = 1;
        pos++;
        continue;
      }

      // Whitespace
      if (/\s/.test(char)) {
        pos++;
        col++;
        continue;
      }

      // Comments
      if (char === '/' && pos + 1 < len && source[pos + 1] === '/') {
        // Line comment
        pos += 2;
        while (pos < len && source[pos] !== '\n') {
          pos++;
        }
        continue;
      }

      if (char === '/' && pos + 1 < len && source[pos + 1] === '*') {
        // Block comment
        pos += 2;
        col += 2;
        let closed = false;
        while (pos < len) {
          if (source[pos] === '\n') {
            line++;
            col = 1;
            pos++;
          } else if (source[pos] === '*' && pos + 1 < len && source[pos + 1] === '/') {
            pos += 2;
            col += 2;
            closed = true;
            break;
          } else {
            pos++;
            col++;
          }
        }
        if (!closed) {
          this.errors.push({
            phase: "Lexical",
            message: "Unterminated block comment",
            line: line,
            col: col
          });
        }
        continue;
      }

      // String Literals
      if (char === '"') {
        let value = "";
        let startCol = col;
        pos++; col++; // skip opening quote
        let closed = false;
        while (pos < len) {
          let c = source[pos];
          if (c === '\n') {
            break; // unclosed string on this line
          }
          if (c === '"') {
            closed = true;
            pos++; col++;
            break;
          }
          value += c;
          pos++; col++;
        }
        if (!closed) {
          this.errors.push({
            phase: "Lexical",
            message: "Unterminated string literal",
            line: line,
            col: startCol
          });
        } else {
          this.tokens.push({
            type: "STRING_LITERAL",
            value: value,
            line: line,
            col: startCol
          });
        }
        continue;
      }

      // Numeric Literals
      if (isDigit(char)) {
        let value = "";
        let startCol = col;
        let dotCount = 0;
        
        while (pos < len) {
          let c = source[pos];
          if (c === '.') {
            dotCount++;
            value += c;
            pos++; col++;
          } else if (isDigit(c)) {
            value += c;
            pos++; col++;
          } else {
            break;
          }
        }

        if (dotCount > 1) {
          this.errors.push({
            phase: "Lexical",
            message: `Malformed floating-point literal '${value}'`,
            line: line,
            col: startCol
          });
        } else if (value.endsWith('.')) {
          this.errors.push({
            phase: "Lexical",
            message: `Malformed floating-point literal '${value}', missing decimal digits`,
            line: line,
            col: startCol
          });
        } else {
          this.tokens.push({
            type: dotCount === 1 ? "FLOAT_LITERAL" : "INTEGER_LITERAL",
            value: value,
            line: line,
            col: startCol
          });
        }
        continue;
      }

      // Identifiers and Keywords
      if (isAlpha(char)) {
        let value = "";
        let startCol = col;
        while (pos < len && isAlphaNum(source[pos])) {
          value += source[pos];
          pos++; col++;
        }

        const keywords = ["int", "float", "if", "else", "while", "print"];
        if (keywords.includes(value)) {
          this.tokens.push({
            type: "KEYWORD",
            value: value,
            line: line,
            col: startCol
          });
        } else {
          this.tokens.push({
            type: "IDENTIFIER",
            value: value,
            line: line,
            col: startCol
          });
        }
        continue;
      }

      // Multi-character Operators
      if (char === '=' && pos + 1 < len && source[pos + 1] === '=') {
        this.tokens.push({ type: "OPERATOR", value: "==", line: line, col: col });
        pos += 2; col += 2;
        continue;
      }
      if (char === '!' && pos + 1 < len && source[pos + 1] === '=') {
        this.tokens.push({ type: "OPERATOR", value: "!=", line: line, col: col });
        pos += 2; col += 2;
        continue;
      }
      if (char === '<' && pos + 1 < len && source[pos + 1] === '=') {
        this.tokens.push({ type: "OPERATOR", value: "<=", line: line, col: col });
        pos += 2; col += 2;
        continue;
      }
      if (char === '>' && pos + 1 < len && source[pos + 1] === '=') {
        this.tokens.push({ type: "OPERATOR", value: ">=", line: line, col: col });
        pos += 2; col += 2;
        continue;
      }
      if (char === '&' && pos + 1 < len && source[pos + 1] === '&') {
        this.tokens.push({ type: "OPERATOR", value: "&&", line: line, col: col });
        pos += 2; col += 2;
        continue;
      }
      if (char === '|' && pos + 1 < len && source[pos + 1] === '|') {
        this.tokens.push({ type: "OPERATOR", value: "||", line: line, col: col });
        pos += 2; col += 2;
        continue;
      }

      // Single-character Operators
      const operators = ['+', '-', '*', '/', '=', '<', '>', '!'];
      if (operators.includes(char)) {
        this.tokens.push({
          type: "OPERATOR",
          value: char,
          line: line,
          col: col
        });
        pos++; col++;
        continue;
      }

      // Delimiters
      const delimiters = [';', ',', '(', ')', '{', '}'];
      if (delimiters.includes(char)) {
        this.tokens.push({
          type: "DELIMITER",
          value: char,
          line: line,
          col: col
        });
        pos++; col++;
        continue;
      }

      // Lexical error: Unexpected character
      this.errors.push({
        phase: "Lexical",
        message: `Unexpected character '${char}'`,
        line: line,
        col: col
      });
      pos++; col++;
    }

    return this.tokens;
  }

  // ==========================================
  // PASS 2: SYNTAX & SEMANTIC ANALYSIS (PARSER)
  // ==========================================
  parse(tokens) {
    this.tokens = tokens;
    this.symbolTable = [];
    this.scopeStack = [new Map()];
    this.memoryOffset = 0;
    
    let index = 0;

    const peek = () => this.tokens[index] || null;
    const previous = () => this.tokens[index - 1] || null;
    
    const check = (type, val = null) => {
      let t = peek();
      if (!t) return false;
      if (t.type !== type) return false;
      if (val !== null && t.value !== val) return false;
      return true;
    };

    const advance = () => {
      if (index < this.tokens.length) index++;
      return previous();
    };

    const match = (type, val = null) => {
      if (check(type, val)) {
        return advance();
      }
      return null;
    };

    const consume = (type, val = null, errMsg = "") => {
      let t = match(type, val);
      if (t) return t;

      let current = peek();
      let line = current ? current.line : (previous() ? previous().line : 1);
      let col = current ? current.col : (previous() ? previous().col : 1);
      throw {
        phase: "Syntax",
        message: errMsg || `Expected token type '${type}'${val ? ` with value '${val}'` : ''}`,
        line: line,
        col: col
      };
    };

    // Scoping Utilities for Semantic Checks
    const pushScope = () => {
      this.scopeStack.push(new Map());
    };
    
    const popScope = () => {
      this.scopeStack.pop();
    };

    const declareVariable = (name, type, line) => {
      let currentScope = this.scopeStack[this.scopeStack.length - 1];
      if (currentScope.has(name)) {
        this.errors.push({
          phase: "Semantic",
          message: `Variable '${name}' is already declared in this scope`,
          line: line
        });
        return;
      }
      
      let scopeLevel = this.scopeStack.length - 1;
      let offset = this.memoryOffset;
      this.memoryOffset += (type === "int" ? 4 : 8); // int is 4 bytes, float is 8 bytes

      let variableRecord = {
        name: name,
        type: type,
        scopeLevel: scopeLevel,
        memoryOffset: offset,
        declaredLine: line,
        value: "undefined"
      };

      currentScope.set(name, variableRecord);
      this.symbolTable.push(variableRecord);
    };

    const lookupVariable = (name) => {
      for (let i = this.scopeStack.length - 1; i >= 0; i--) {
        if (this.scopeStack[i].has(name)) {
          return this.scopeStack[i].get(name);
        }
      }
      return null;
    };

    // --- RECURSIVE DESCENT FUNCTIONS ---

    // Program ::= StatementList
    const parseProgram = () => {
      let body = parseStatementList();
      return { type: "Program", body: body };
    };

    // StatementList ::= Statement StatementList | epsilon
    const parseStatementList = () => {
      let list = [];
      while (peek() !== null && !check("DELIMITER", "}")) {
        try {
          let stmt = parseStatement();
          if (stmt) list.push(stmt);
        } catch (err) {
          if (err.phase) {
            this.errors.push(err);
            // Synchronize on semicolons or closing braces to continue parsing
            advance();
            while (peek() !== null && !check("DELIMITER", ";") && !check("DELIMITER", "}")) {
              advance();
            }
            if (check("DELIMITER", ";")) advance();
          } else {
            throw err; // unexpected runtime issue
          }
        }
      }
      return list;
    };

    // Statement ::= Declaration | Assignment | Selection | Iteration | Print
    const parseStatement = () => {
      let t = peek();
      if (!t) return null;

      if (t.type === "KEYWORD") {
        if (t.value === "int" || t.value === "float") {
          return parseDeclaration();
        } else if (t.value === "if") {
          return parseSelection();
        } else if (t.value === "while") {
          return parseIteration();
        } else if (t.value === "print") {
          return parsePrint();
        }
      }
      
      if (t.type === "IDENTIFIER") {
        return parseAssignment();
      }

      throw {
        phase: "Syntax",
        message: `Unexpected token '${t.value}' at start of statement`,
        line: t.line,
        col: t.col
      };
    };

    // Declaration ::= Type ID ";"
    const parseDeclaration = () => {
      let typeToken = advance(); // int or float
      let idToken = consume("IDENTIFIER", null, "Expected variable name after type");
      consume("DELIMITER", ";", "Expected ';' at the end of declaration");

      declareVariable(idToken.value, typeToken.value, typeToken.line);
      let varRecord = lookupVariable(idToken.value);

      return {
        type: "VarDecl",
        varType: typeToken.value,
        id: idToken.value,
        scopeLevel: varRecord ? varRecord.scopeLevel : (this.scopeStack.length - 1),
        line: typeToken.line
      };
    };

    // Assignment ::= ID "=" Expression ";"
    const parseAssignment = () => {
      let idToken = advance();
      let varRecord = lookupVariable(idToken.value);
      if (!varRecord) {
        this.errors.push({
          phase: "Semantic",
          message: `Undeclared variable '${idToken.value}' used in assignment`,
          line: idToken.line
        });
      }

      consume("OPERATOR", "=", "Expected '=' in assignment");
      let expr = parseExpression();
      consume("DELIMITER", ";", "Expected ';' after assignment");

      // Semantic Check: Type Checking
      if (varRecord && expr.evalType) {
        if (varRecord.type === "int" && expr.evalType === "float") {
          this.errors.push({
            phase: "Semantic",
            message: `Type mismatch: cannot assign 'float' expression to 'int' variable '${idToken.value}'`,
            line: idToken.line
          });
        } else if (varRecord.type === "int" && expr.evalType === "string") {
          this.errors.push({
            phase: "Semantic",
            message: `Type mismatch: cannot assign 'string' to 'int' variable '${idToken.value}'`,
            line: idToken.line
          });
        } else if (varRecord.type === "float" && expr.evalType === "string") {
          this.errors.push({
            phase: "Semantic",
            message: `Type mismatch: cannot assign 'string' to 'float' variable '${idToken.value}'`,
            line: idToken.line
          });
        }
      }

      return {
        type: "Assignment",
        id: idToken.value,
        scopeLevel: varRecord ? varRecord.scopeLevel : 0,
        expr: expr,
        line: idToken.line
      };
    };

    // Selection ::= "if" "(" Expression ")" Block ElsePart
    const parseSelection = () => {
      let ifToken = advance(); // if
      consume("DELIMITER", "(", "Expected '(' after 'if'");
      let cond = parseExpression();
      consume("DELIMITER", ")", "Expected ')' after if condition");
      
      let thenBranch = parseBlock();
      let elseBranch = null;

      if (match("KEYWORD", "else")) {
        elseBranch = parseBlock();
      }

      // Semantic check: condition must be convertible to boolean (non-string)
      if (cond.evalType === "string") {
        this.errors.push({
          phase: "Semantic",
          message: "Condition in 'if' statement must be a numeric or logical expression, not string",
          line: ifToken.line
        });
      }

      return {
        type: "IfStatement",
        cond: cond,
        thenBranch: thenBranch,
        elseBranch: elseBranch,
        line: ifToken.line
      };
    };

    // Iteration ::= "while" "(" Expression ")" Block
    const parseIteration = () => {
      let whileToken = advance(); // while
      consume("DELIMITER", "(", "Expected '(' after 'while'");
      let cond = parseExpression();
      consume("DELIMITER", ")", "Expected ')' after while condition");
      let body = parseBlock();

      // Semantic check: condition must be convertible to boolean (non-string)
      if (cond.evalType === "string") {
        this.errors.push({
          phase: "Semantic",
          message: "Condition in 'while' loop must be a numeric or logical expression, not string",
          line: whileToken.line
        });
      }

      return {
        type: "WhileStatement",
        cond: cond,
        body: body,
        line: whileToken.line
      };
    };

    // Print ::= "print" "(" PrintArg ")" ";"
    // PrintArg ::= StringLiteral | Expression
    const parsePrint = () => {
      let printToken = advance(); // print
      consume("DELIMITER", "(", "Expected '(' after 'print'");
      
      let arg;
      let next = peek();
      if (next && next.type === "STRING_LITERAL") {
        let t = advance();
        arg = { type: "Literal", valueType: "string", value: t.value, evalType: "string", line: t.line };
      } else {
        arg = parseExpression();
      }
      
      consume("DELIMITER", ")", "Expected ')' after print argument");
      consume("DELIMITER", ";", "Expected ';' after print statement");

      return {
        type: "PrintStatement",
        arg: arg,
        line: printToken.line
      };
    };

    // Block ::= "{" StatementList "}"
    const parseBlock = () => {
      let openBrace = consume("DELIMITER", "{", "Expected '{' to start block");
      pushScope();
      let body = parseStatementList();
      consume("DELIMITER", "}", "Expected '}' to end block");
      popScope();
      
      return {
        type: "Block",
        body: body,
        line: openBrace.line
      };
    };

    // Expression ::= LogicalOr
    const parseExpression = () => {
      return parseLogicalOr();
    };

    // LogicalOr ::= LogicalAnd ( "||" LogicalAnd )*
    const parseLogicalOr = () => {
      let node = parseLogicalAnd();
      while (peek() && peek().type === "OPERATOR" && peek().value === "||") {
        let opToken = advance();
        let right = parseLogicalAnd();
        
        let evalType = "int"; // logical returns 0 or 1 (int)
        if (node.evalType === "string" || right.evalType === "string") {
          this.errors.push({
            phase: "Semantic",
            message: "Cannot perform logical OR operation on string operands",
            line: opToken.line
          });
          evalType = "int";
        }

        node = {
          type: "BinaryExpr",
          operator: opToken.value,
          left: node,
          right: right,
          evalType: evalType,
          line: opToken.line
        };
      }
      return node;
    };

    // LogicalAnd ::= Equality ( "&&" Equality )*
    const parseLogicalAnd = () => {
      let node = parseEquality();
      while (peek() && peek().type === "OPERATOR" && peek().value === "&&") {
        let opToken = advance();
        let right = parseEquality();

        let evalType = "int";
        if (node.evalType === "string" || right.evalType === "string") {
          this.errors.push({
            phase: "Semantic",
            message: "Cannot perform logical AND operation on string operands",
            line: opToken.line
          });
          evalType = "int";
        }

        node = {
          type: "BinaryExpr",
          operator: opToken.value,
          left: node,
          right: right,
          evalType: evalType,
          line: opToken.line
        };
      }
      return node;
    };

    // Equality ::= Relational ( ( "==" | "!=" ) Relational )*
    const parseEquality = () => {
      let node = parseRelational();
      while (peek() && peek().type === "OPERATOR" && (peek().value === "==" || peek().value === "!=")) {
        let opToken = advance();
        let right = parseRelational();

        let evalType = "int";
        // Enforce basic type sanity
        if ((node.evalType === "string" && right.evalType !== "string") ||
            (node.evalType !== "string" && right.evalType === "string")) {
          this.errors.push({
            phase: "Semantic",
            message: `Type mismatch in equality comparison: cannot compare '${node.evalType}' with '${right.evalType}'`,
            line: opToken.line
          });
        }

        node = {
          type: "BinaryExpr",
          operator: opToken.value,
          left: node,
          right: right,
          evalType: evalType,
          line: opToken.line
        };
      }
      return node;
    };

    // Relational ::= Additive ( ( "<" | ">" | "<=" | ">=" ) Additive )*
    const parseRelational = () => {
      let node = parseAdditive();
      while (peek() && peek().type === "OPERATOR" && 
            (peek().value === "<" || peek().value === ">" || peek().value === "<=" || peek().value === ">=")) {
        let opToken = advance();
        let right = parseAdditive();

        let evalType = "int";
        if (node.evalType === "string" || right.evalType === "string") {
          this.errors.push({
            phase: "Semantic",
            message: `Cannot compare non-numeric operands of type '${node.evalType}' and '${right.evalType}'`,
            line: opToken.line
          });
        }

        node = {
          type: "BinaryExpr",
          operator: opToken.value,
          left: node,
          right: right,
          evalType: evalType,
          line: opToken.line
        };
      }
      return node;
    };

    // Additive ::= Multiplicative ( ( "+" | "-" ) Multiplicative )*
    const parseAdditive = () => {
      let node = parseMultiplicative();
      while (peek() && peek().type === "OPERATOR" && (peek().value === "+" || peek().value === "-")) {
        let opToken = advance();
        let right = parseMultiplicative();

        let evalType = "int";
        if (node.evalType === "string" || right.evalType === "string") {
          this.errors.push({
            phase: "Semantic",
            message: `Arithmetic addition/subtraction is not supported for 'string' operands`,
            line: opToken.line
          });
        } else if (node.evalType === "float" || right.evalType === "float") {
          evalType = "float";
        }

        node = {
          type: "BinaryExpr",
          operator: opToken.value,
          left: node,
          right: right,
          evalType: evalType,
          line: opToken.line
        };
      }
      return node;
    };

    // Multiplicative ::= Primary ( ( "*" | "/" ) Primary )*
    const parseMultiplicative = () => {
      let node = parsePrimary();
      while (peek() && peek().type === "OPERATOR" && (peek().value === "*" || peek().value === "/")) {
        let opToken = advance();
        let right = parsePrimary();

        let evalType = "int";
        if (node.evalType === "string" || right.evalType === "string") {
          this.errors.push({
            phase: "Semantic",
            message: `Arithmetic multiplication/division is not supported for 'string' operands`,
            line: opToken.line
          });
        } else if (node.evalType === "float" || right.evalType === "float") {
          evalType = "float";
        }

        node = {
          type: "BinaryExpr",
          operator: opToken.value,
          left: node,
          right: right,
          evalType: evalType,
          line: opToken.line
        };
      }
      return node;
    };

    // Primary ::= ID | IntegerLiteral | FloatLiteral | StringLiteral | "(" Expression ")" | "-" Primary | "!" Primary
    const parsePrimary = () => {
      let t = peek();
      if (!t) {
        throw {
          phase: "Syntax",
          message: "Unexpected end of input inside expression",
          line: previous() ? previous().line : 1,
          col: previous() ? previous().col : 1
        };
      }

      if (t.type === "IDENTIFIER") {
        advance();
        let varRecord = lookupVariable(t.value);
        if (!varRecord) {
          this.errors.push({
            phase: "Semantic",
            message: `Undeclared variable '${t.value}' used in expression`,
            line: t.line
          });
        }
        return {
          type: "Identifier",
          name: t.value,
          scopeLevel: varRecord ? varRecord.scopeLevel : 0,
          evalType: varRecord ? varRecord.type : "int", // fallback to int
          line: t.line
        };
      }

      if (t.type === "INTEGER_LITERAL") {
        advance();
        return {
          type: "Literal",
          valueType: "int",
          value: parseInt(t.value, 10),
          evalType: "int",
          line: t.line
        };
      }

      if (t.type === "FLOAT_LITERAL") {
        advance();
        return {
          type: "Literal",
          valueType: "float",
          value: parseFloat(t.value),
          evalType: "float",
          line: t.line
        };
      }

      if (t.type === "STRING_LITERAL") {
        advance();
        return {
          type: "Literal",
          valueType: "string",
          value: t.value,
          evalType: "string",
          line: t.line
        };
      }

      if (t.type === "DELIMITER" && t.value === "(") {
        advance();
        let expr = parseExpression();
        consume("DELIMITER", ")", "Expected ')' to close parentheses");
        return expr;
      }

      // Unary Operators: - and !
      if (t.type === "OPERATOR" && (t.value === "-" || t.value === "!")) {
        let opToken = advance();
        let right = parsePrimary();
        
        let evalType = right.evalType;
        if (opToken.value === "!" && right.evalType === "string") {
          this.errors.push({
            phase: "Semantic",
            message: "Cannot apply logical NOT operator '!' to a string operand",
            line: opToken.line
          });
          evalType = "int";
        } else if (opToken.value === "-" && right.evalType === "string") {
          this.errors.push({
            phase: "Semantic",
            message: "Cannot apply unary minus '-' to a string operand",
            line: opToken.line
          });
          evalType = "int";
        }
        if (opToken.value === "!") {
          evalType = "int"; // logical returns boolean int
        }

        return {
          type: "UnaryExpr",
          operator: opToken.value,
          right: right,
          evalType: evalType,
          line: opToken.line
        };
      }

      throw {
        phase: "Syntax",
        message: `Unexpected token '${t.value}' in expression`,
        line: t.line,
        col: t.col
      };
    };

    // Begin Parse Execution
    let ast = parseProgram();
    
    // Check if there are leftover trailing tokens
    if (peek() !== null) {
      this.errors.push({
        phase: "Syntax",
        message: `Extraneous code after program structure at '${peek().value}'`,
        line: peek().line,
        col: peek().col
      });
    }

    return ast;
  }

  // ==========================================
  // HELPER: FORMAT ABSTRACT SYNTAX TREE (AST)
  // ==========================================
  stringifyAST(node, indent = "") {
    if (!node) return "null";

    let res = "";
    const typeLabel = node.type;
    
    switch (node.type) {
      case "Program":
        res += "Program\n";
        node.body.forEach((stmt, idx) => {
          const isLast = idx === node.body.length - 1;
          res += indent + (isLast ? "└── " : "├── ") + this.stringifyAST(stmt, indent + (isLast ? "    " : "│   "));
        });
        break;

      case "VarDecl":
        res += `VarDecl: ${node.varType} ${node.id} (Line ${node.line})\n`;
        break;

      case "Assignment":
        res += `Assignment: ${node.id} = (Line ${node.line})\n`;
        res += indent + "└── " + this.stringifyAST(node.expr, indent + "    ");
        break;

      case "IfStatement":
        res += `IfStatement (Line ${node.line})\n`;
        res += indent + "├── Condition:\n";
        res += indent + "│   └── " + this.stringifyAST(node.cond, indent + "│       ") + "\n";
        res += indent + "├── Then:\n";
        res += indent + "│   └── " + this.stringifyAST(node.thenBranch, indent + "│       ");
        if (node.elseBranch) {
          res += "\n" + indent + "└── Else:\n";
          res += indent + "    └── " + this.stringifyAST(node.elseBranch, indent + "        ");
        }
        break;

      case "WhileStatement":
        res += `WhileStatement (Line ${node.line})\n`;
        res += indent + "├── Condition:\n";
        res += indent + "│   └── " + this.stringifyAST(node.cond, indent + "│       ") + "\n";
        res += indent + "└── Body:\n";
        res += indent + "    └── " + this.stringifyAST(node.body, indent + "        ");
        break;

      case "PrintStatement":
        res += `PrintStatement (Line ${node.line})\n`;
        res += indent + "└── Argument:\n";
        res += indent + "    └── " + this.stringifyAST(node.arg, indent + "        ");
        break;

      case "Block":
        res += "Block\n";
        node.body.forEach((stmt, idx) => {
          const isLast = idx === node.body.length - 1;
          res += indent + (isLast ? "└── " : "├── ") + this.stringifyAST(stmt, indent + (isLast ? "    " : "│   "));
        });
        break;

      case "BinaryExpr":
        res += `BinaryExpr: '${node.operator}' (evals to: ${node.evalType}) (Line ${node.line})\n`;
        res += indent + "├── Left:\n";
        res += indent + "│   └── " + this.stringifyAST(node.left, indent + "│       ") + "\n";
        res += indent + "└── Right:\n";
        res += indent + "    └── " + this.stringifyAST(node.right, indent + "        ");
        break;

      case "UnaryExpr":
        res += `UnaryExpr: '${node.operator}' (evals to: ${node.evalType}) (Line ${node.line})\n`;
        res += indent + "└── Right:\n";
        res += indent + "    └── " + this.stringifyAST(node.right, indent + "        ");
        break;

      case "Literal":
        res += `Literal: "${node.value}" (${node.valueType}) (Line ${node.line})\n`;
        break;

      case "Identifier":
        res += `Identifier: ${node.name} (type: ${node.evalType}) (Line ${node.line})\n`;
        break;

      default:
        res += `Unknown node type ${node.type}\n`;
    }

    return res;
  }

  // ==========================================
  // INTERMEDIATE CODE GENERATION (THREE-ADDRESS CODE)
  // ==========================================
  generateTAC(ast) {
    if (!ast) return "No intermediate representation (TAC) generated.";
    
    let tempCounter = 0;
    let labelCounter = 0;
    let codeLines = [];

    const newTemp = () => `t${tempCounter++}`;
    const newLabel = () => `L${labelCounter++}`;

    const walk = (node) => {
      if (!node) return "";

      switch (node.type) {
        case "Program":
          node.body.forEach(stmt => walk(stmt));
          return "";

        case "VarDecl":
          codeLines.push(`// declare ${node.varType} ${node.id}_${node.scopeLevel}`);
          return "";

        case "Assignment": {
          const rhs = walk(node.expr);
          codeLines.push(`${node.id}_${node.scopeLevel} = ${rhs}`);
          return "";
        }

        case "IfStatement": {
          const cond = walk(node.cond);
          const labelFalse = newLabel();
          codeLines.push(`ifFalse ${cond} goto ${labelFalse}`);
          walk(node.thenBranch);
          if (node.elseBranch) {
            const labelEnd = newLabel();
            codeLines.push(`goto ${labelEnd}`);
            codeLines.push(`${labelFalse}:`);
            walk(node.elseBranch);
            codeLines.push(`${labelEnd}:`);
          } else {
            codeLines.push(`${labelFalse}:`);
          }
          return "";
        }

        case "WhileStatement": {
          const labelStart = newLabel();
          const labelEnd = newLabel();
          codeLines.push(`${labelStart}:`);
          const cond = walk(node.cond);
          codeLines.push(`ifFalse ${cond} goto ${labelEnd}`);
          walk(node.body);
          codeLines.push(`goto ${labelStart}`);
          codeLines.push(`${labelEnd}:`);
          return "";
        }

        case "PrintStatement": {
          const arg = walk(node.arg);
          codeLines.push(`print ${arg}`);
          return "";
        }

        case "Block":
          node.body.forEach(stmt => walk(stmt));
          return "";

        case "BinaryExpr": {
          const left = walk(node.left);
          const right = walk(node.right);
          const temp = newTemp();
          codeLines.push(`${temp} = ${left} ${node.operator} ${right}`);
          return temp;
        }

        case "UnaryExpr": {
          const right = walk(node.right);
          const temp = newTemp();
          codeLines.push(`${temp} = ${node.operator}${right}`);
          return temp;
        }

        case "Literal":
          if (node.valueType === "string") {
            return `"${node.value}"`;
          }
          return node.value.toString();

        case "Identifier":
          return `${node.name}_${node.scopeLevel}`;

        default:
          return "";
      }
    };

    walk(ast);
    return codeLines.join('\n');
  }

  // ==========================================
  // FACADE COMPILE ENTRYPOINT
  // ==========================================
  compile(source) {
    try {
      let tokens = this.tokenize(source);
      let ast = null;
      let parseTreeText = "";
      let tacText = "";
      
      // Pass 2 runs only if Lexical errors are not found, or let's run anyway but track all
      ast = this.parse(tokens);
      if (ast) {
        parseTreeText = this.stringifyAST(ast);
        if (this.errors.length === 0) {
          tacText = this.generateTAC(ast);
        } else {
          tacText = "No IR generated due to compilation errors.";
        }
      }
      
      return {
        tokens: this.tokens,
        symbolTable: this.symbolTable,
        ast: ast,
        parseTreeText: parseTreeText,
        tacText: tacText,
        errors: this.errors
      };
    } catch (err) {
      // In case critical parser error aborted the parse
      if (err.phase) {
        this.errors.push(err);
      } else {
        this.errors.push({
          phase: "Compiler Engine Error",
          message: err.toString(),
          line: 1
        });
      }
      return {
        tokens: this.tokens,
        symbolTable: this.symbolTable,
        ast: null,
        parseTreeText: "Compilation failed.",
        tacText: "No IR generated.",
        errors: this.errors
      };
    }
  }
}

// Attach to window for global access inside portfolio site
if (typeof window !== "undefined") {
  window.CompilerEngine = CompilerEngine;
}
if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
  module.exports = CompilerEngine;
}
