# ACADEMIC PROJECT REPORT: DESIGN AND IMPLEMENTATION OF A SIMPLE TWO-PASS COMPILER WITH INTERMEDIATE CODE GENERATION

**Course:** System Programming (Spring 2025-2026)  
**Department:** Computer/Software Engineering Department  
**Faculty:** Faculty of Engineering, Istanbul Health and Technology University  
**Instructor:** Computer/Software Engineering Department Academic Faculty  
**Student Name:** Sercan Özkan  
**Student ID:** SercanOzkan55  
**Submission Date:** 02.06.2026  

---

## 1. Introduction and Objectives

This project presents the comprehensive design and hand-coded implementation of a functional **Two-Pass Compiler** (augmented with a third pass for Intermediate Representation / Three-Address Code generation) for a structured subset of a high-level imperative programming language. 

Compilers are complex software systems divided into a **Front-End** (analysis) and a **Back-End** (synthesis). The front-end is responsible for checking syntax, understanding semantic meaning, and building an intermediate structure, while the back-end compiles this structure into target assembly, virtual machine bytecodes, or machine instructions. This project focuses on the foundational analysis phases, static semantics verification, symbol table scope modeling, and intermediate representation (IR) assembly generation.

### 1.1 Objectives
The primary objectives of this project are:
- To design a context-free grammar (CFG) in Backus-Naur Form (BNF) representing programming language constructs such as variable declarations, assignments, loop iterations, conditional branches, and arithmetic evaluations.
- To implement **Pass 1 (Lexical Analyzer)** that scans source characters, handles multi-line comments, maintains scoping offsets, and constructs a token stream.
- To implement **Pass 2 (Syntax and Semantic Analyzer)** using a hand-coded recursive descent parser that validates syntax, recovers from minor errors, builds an Abstract Syntax Tree (AST), and performs static type checking.
- To design a block-scoped **Symbol Table** maintaining variable types, declaration lines, scope levels, and memory offset structures.
- To write an **Intermediate Representation (IR)** generator translating source statements into Three-Address Code (TAC) representing assembly-level instruction jumps.
- To implement a **Web GUI Dashboard** showing live compiler tokenization, symbol properties, ASCII syntax trees, intermediate codes, and line-mapped compiler diagnostics.

---

## 2. Source Language Grammar (BNF)

To implement a parser without using compiler-generators (e.g., Lex, Yacc, ANTLR), the language grammar must be unambiguous and free of left-recursion. Left-recursion causes recursive descent parsers to enter infinite loops, and ambiguity makes parsing non-deterministic.

We designed a context-free grammar suitable for a LL(1) lookahead parser. Operator precedence is handled by nesting grammar rules, forcing higher-precedence operators to be evaluated deeper in the syntax tree.

### 2.1 Complete BNF Grammar
The grammar is defined as follows (where `ε` represents the empty string/null production):

```bnf
Program           ::= StatementList

StatementList     ::= Statement StatementList
                    | ε

Statement         ::= Declaration
                    | Assignment
                    | Selection
                    | Iteration
                    | Print

Declaration       ::= Type IDENTIFIER ";"

Type              ::= "int"
                    | "float"

Assignment        ::= IDENTIFIER "=" Expression ";"

Selection         ::= "if" "(" Expression ")" Block ElsePart

ElsePart          ::= "else" Block
                    | ε

Iteration         ::= "while" "(" Expression ")" Block

Print             ::= "print" "(" PrintArg ")" ";"

PrintArg          ::= STRING_LITERAL
                    | Expression

Block             ::= "{" StatementList "}"

Expression        ::= LogicalOr

LogicalOr         ::= LogicalAnd LogicalOrTail
LogicalOrTail     ::= "||" LogicalAnd LogicalOrTail
                    | ε

LogicalAnd        ::= Equality LogicalAndTail
LogicalAndTail    ::= "&&" Equality LogicalAndTail
                    | ε

Equality          ::= Relational EqualityTail
EqualityTail      ::= "==" Relational EqualityTail
                    | "!=" Relational EqualityTail
                    | ε

Relational        ::= Additive RelationalTail
RelationalTail    ::= "<" Additive RelationalTail
                    | ">" Additive RelationalTail
                    | "<=" Additive RelationalTail
                    | ">=" Additive RelationalTail
                    | ε

Additive          ::= Multiplicative AdditiveTail
AdditiveTail      ::= "+" Multiplicative AdditiveTail
                    | "-" Multiplicative AdditiveTail
                    | ε

Multiplicative    ::= Primary MultiplicativeTail
MultiplicativeTail::= "*" Primary MultiplicativeTail
                    | "/" Primary MultiplicativeTail
                    | ε

Primary           ::= IDENTIFIER
                    | INTEGER_LITERAL
                    | FLOAT_LITERAL
                    | STRING_LITERAL
                    | "(" Expression ")"
                    | "-" Primary
                    | "!" Primary
```

### 2.2 Operator Precedence and Associativity Structure
The grammar naturally implements operator precedence through the call-stack order of parsing functions. The hierarchy of operators is resolved as follows:

| Level | Operator | Description | Associativity | Parsing Rule |
|:---:|:---:|:---|:---:|:---|
| 1 (Highest) | `()`, `-`, `!` | Grouping, Unary Negations | Right-to-Left | `Primary` |
| 2 | `*`, `/` | Multiplication, Division | Left-to-Right | `Multiplicative` |
| 3 | `+`, `-` | Addition, Subtraction | Left-to-Right | `Additive` |
| 4 | `<`, `>`, `<=`, `>=`| Relational Comparisons | Left-to-Right | `Relational` |
| 5 | `==`, `!=` | Equality Checking | Left-to-Right | `Equality` |
| 6 | `&&` | Logical Conjunction (AND) | Left-to-Right | `LogicalAnd` |
| 7 (Lowest) | `\|\|` | Logical Disjunction (OR) | Left-to-Right | `LogicalOr` |

---

## 3. Pass 1: Lexical Analyzer (Lexer) Implementation

The Lexical Analyzer (Lexer) acts as the first pass of the compiler. It reads the source code character-by-character and groups them into a linear stream of **Tokens** while filtering out whitespaces and comments.

### 3.1 Token Object Model
Every generated token is represented by a structured object mapping its metadata:
```json
{
  "type": "TOKEN_TYPE",
  "value": "string_lexeme",
  "line": 12,
  "col": 4
}
```

### 3.2 Token Types and Classifications
- **KEYWORD**: Reserved keywords representing type declarations (`int`, `float`), loops (`while`), branches (`if`, `else`), and output commands (`print`).
- **IDENTIFIER**: Variable names. Matches regular expression `[a-zA-Z_][a-zA-Z0-9_]*`.
- **INTEGER_LITERAL**: Positive decimal integer sequences (e.g., `42`, `0`).
- **FLOAT_LITERAL**: Floating-point numbers containing a decimal point (e.g., `3.1415`, `0.05`).
- **STRING_LITERAL**: Text sequences enclosed in double quotes (e.g., `"Result is large"`).
- **OPERATOR**: Operator symbols (`+`, `-`, `*`, `/`, `=`, `==`, `!=`, `<`, `>`, `<=`, `>=`, `&&`, `||`, `!`).
- **DELIMITER**: Structural punctuation marks (`;`, `,`, `(`, `)`, `{`, `}`).

### 3.3 Lexer Execution Steps and DFA Logic
The scanning loop uses a pointer `pos` to traverse the string:
1. **Whitespace and Line Control**: Checks for spaces, tabs, and carriage returns. If `\n` is matched, the global `line` tracker is incremented, and `col` resets to 1.
2. **Comment Skipping**:
   - Single-line comments (`//`): When matching `//`, the scanner skips characters until a newline `\n` is hit.
   - Block comments (`/* ... */`): When matching `/*`, the scanner skips characters until it finds `*/`. If the file ends without matching `*/`, a lexical error (*"Unterminated block comment"*) is thrown.
3. **Identifier and Keyword Processing**: If a character is alphabetical (`[a-zA-Z_]`), it accumulates alphanumeric characters. The lexeme is matched against keywords (`int`, `float`, etc.); if it matches, a `KEYWORD` token is emitted, otherwise an `IDENTIFIER` token is created.
4. **Number Processing**: If a character is a digit (`[0-9]`), it is accumulated. If a dot `.` is encountered, the scanner continues accumulating digits for the fraction part.
   - *Lexical Checks*: If multiple dots are found (e.g. `3.14.15`), a malformed literal error is reported. If a number ends with a dot (e.g. `3.`), it throws an error.
5. **String Matching**: If a double quote `"` is matched, the lexer scans until it finds the closing `"`. If a newline occurs before the quote is closed, it logs an unterminated string error.
6. **Compound Operator Resolution**: For characters like `=`, `!`, `<`, `>`, `&`, `|`, the lexer checks the lookahead character. It matches compound operators like `==`, `!=`, `<=`, `>=`, `&&`, `||` first. If the next character does not form a compound operator, it falls back to single-character operators.
7. **Delimiters**: Punctuation symbols (`;`, `,`, `(`, `)`, `{`, `}`) are matched directly.
8. **Invalid Characters**: Any character not matching these rules (e.g. `$`, `#`, `@`) is caught as a lexical error (*"Unexpected character 'x'"*).

---

## 4. Pass 2: Parser and Semantic Analyzer

The Parser takes the linear token stream produced by the Lexer and constructs a hierarchical representation of the program structure.

### 4.1 Recursive Descent Parsing
We implement a top-down recursive descent parsing architecture. The parser has a set of recursive helper functions matching the rules of our BNF grammar. Starting from the root rule `parseProgram()`, it evaluates the token stream using a single-token lookahead.

### 4.2 Abstract Syntax Tree (AST) Nodes
The result of parsing is an **Abstract Syntax Tree (AST)**, where every statement and expression is modeled as a tree node:

| Node Type | Properties | Description |
|:---|:---|:---|
| `Program` | `body` (Array of Statement Nodes) | Root node of the program. |
| `VarDecl` | `varType` (int/float), `id` (name), `line` | Variable declaration statement. |
| `Assignment` | `id` (LHS), `expr` (RHS Node), `line` | Variable assignment statement. |
| `IfStatement` | `cond` (Expr Node), `thenBranch` (Block), `elseBranch` (Block) | Branching control flow statement. |
| `WhileStatement` | `cond` (Expr Node), `body` (Block Node) | Iteration loop control flow statement. |
| `PrintStatement` | `arg` (Literal or Expr Node) | Output statement. |
| `Block` | `body` (Array of Statement Nodes) | Local scope container block. |
| `BinaryExpr` | `operator`, `left` (Node), `right` (Node), `evalType` | Binary expression operator node. |
| `UnaryExpr` | `operator`, `right` (Node), `evalType` | Unary negation node (`-` or `!`). |
| `Literal` | `valueType` (int/float/string), `value` | Primitive value literal node. |
| `Identifier` | `name`, `evalType` | Variable lookup expression node. |

---

## 5. Symbol Table and Scope Management

The Symbol Table stores information about declared variables, including their type, scope depth, and simulated memory layout.

### 5.1 Hierarchical Scoping Stack
To support local scopes within blocks (`{ ... }`), the Symbol Table uses a **Stack of HashMaps**.
- When the parser enters a block (`{`), a new scope map is pushed onto the stack.
- When exiting a block (`}`), the top scope map is popped off the stack.

### 5.2 Symbol Record Attributes
For each declared variable, the table records:
1. **Name**: The variable name.
2. **Type**: `int` or `float`.
3. **Scope Level**: The scope depth (0 for global scope, 1 for first nested block scope, etc.).
4. **Memory Offset**: A simulated memory address. To simulate a real hardware environment, we calculate offsets based on types:
   - `int` variables reserve **4 bytes** of memory.
   - `float` variables reserve **8 bytes** of memory.
   - The memory offset counter increments globally with each declaration.
5. **Declared Line**: The line number where the variable was defined.

---

## 6. Static Semantic Analysis and Type System

Static semantic checks verify that the program follows the rules of the language before runtime. The semantic analyzer runs during parsing and throws semantic errors if rules are violated:

### 6.1 Variable Scoping Checks
- **Duplicate Declaration**: When a variable declaration (`Type ID;`) is compiled, the symbol table checks if that name is already defined *within the current scope*. If so, a redeclaration error is thrown:
  `Semantic Error (Line L): Variable 'x' is already declared in this scope`.
- **Undeclared Variables**: When a variable is used in assignments, expressions, or print statements, the compiler searches the scope stack from the current scope level up to the global scope. If it is not found in any scope, an error is thrown:
  `Semantic Error (Line L): Undeclared variable 'x' used in expression/assignment`.

### 6.2 Type Inference and Type Checking Rules
The compiler enforces static typing. Expressions evaluate to a type (`int`, `float`, or `string`), which is verified for compatibility:
- **Assignment Type Rules**:
  - Assigning a value to an `int` variable: The expression must evaluate to `int`. If it evaluates to `float` or `string`, a type mismatch error is thrown.
  - Assigning a value to a `float` variable: The expression can evaluate to `float` or `int` (integers are promoted to float implicitly). Assigning a `string` is rejected.
- **Arithmetic Type Rules**:
  - The operands of arithmetic operations (`+`, `-`, `*`, `/`) must be numeric (`int` or `float`). Operations on strings are rejected.
  - If both operands are `int`, the expression evaluates to `int`.
  - If one or both operands are `float`, the expression evaluates to `float` (implicit promotion).
- **Comparison Type Rules**:
  - Relational operations (`<`, `>`, `<=`, `>=`) require both operands to be numeric.
  - Equality operations (`==`, `!=`) allow comparing numeric types, or string types with other strings. Comparing a string with a numeric type throws a type mismatch error.
- **Logical Operations**:
  - Operands of logical operations (`&&`, `||`, `!`) must be numeric (non-string). They return `int` (where 0 represents false, and 1 represents true).

---

## 7. Intermediate Representation (Three-Address Code)

To satisfy the compiler requirement of translating source code into intermediate code, we implemented a **Three-Address Code (TAC)** generator. 

Three-Address Code represents a program as a sequence of simple instructions with at most three operands, resembling assembly language.

### 7.1 Instruction Format
TAC instructions use temporary variables (`t0`, `t1`, `t2`...) and label names (`L0`, `L1`...) for control flow:
- **Binary operations**: `temp = operand1 op operand2`
- **Unary operations**: `temp = op operand1`
- **Assignments**: `variable = operand`
- **Jumps and Labels**: `ifFalse condition goto Label`, `goto Label`, `Label:`
- **Print operations**: `print operand`

### 7.2 Translation Rules
- **Arithmetic Expressions**: Nested arithmetic operations are broken down into temporary variables. For example, `result = x + y * 2` yields:
  ```assembly
  t0 = y * 2
  t1 = x + t0
  result = t1
  ```
- **If-Else Branching**: Translated using conditional jumps and label markers:
  ```assembly
  // Source: if (result > 15) { print("large"); } else { print("small"); }
  t2 = result > 15
  ifFalse t2 goto L0
  print "Result is large"
  goto L1
  L0:
  print "Result is small"
  L1:
  ```
- **While Loops**: Loops are translated by placing a label at the start of the condition, checking the condition, jumping to the end label if false, running the body, and jumping back to the start:
  ```assembly
  // Source: while (x > 0) { x = x - 1; }
  L2:
  t3 = x > 0
  ifFalse t3 goto L3
  t4 = x - 1
  x = t4
  goto L2
  L3:
  ```

---

## 8. Error Handling and Recovery Strategy

A high-quality compiler must report compile-time errors clearly instead of crashing on the first error. We implemented a robust error recovery and reporting strategy:

### 8.1 Error Categories
1. **Lexical Errors**: Catch unrecognized symbols and malformed literals (unclosed comments, malformed float numbers). The lexer reports the exact line and column numbers.
2. **Syntax Errors**: Catch grammatical mismatches (e.g., missing semicolons, missing brackets, unbalanced parentheses).
3. **Semantic Errors**: Catch logical rule violations (undeclared variables, duplicate declarations, type compatibility errors).

### 8.2 Parser Synchronization and Error Recovery
If a syntax error occurs during statement parsing, the compiler does not stop. Instead, it catches the exception, logs it, and executes a **synchronization routine**:
- The parser skips tokens until it finds a statement boundary delimiter (a semicolon `;` or a closing brace `}`).
- Once a delimiter is found, the parser recovers and continues parsing subsequent statements.
- This allows the compiler to catch and report multiple syntax and semantic errors in a single run.

---

## 9. User Interface Design and Logic

The compiler interface is integrated into the **Holo-Cyber OS Portfolio Desktop**:

1. **Draggable Window Shell**: Built using CSS flexbox. Supports dragging via the title bar and taskbar tab switching.
2. **Source Code Editor**: A side-by-side layout:
   - An active line number gutter that updates dynamically as you type.
   - Live cursor tracking showing line and column metrics (e.g., `LN 10, COL 4`).
   - Gutter highlighting indicating the line currently being edited.
3. **Control Buttons**:
   - **`LOAD_SAMPLE`**: Loads the valid sample program containing variable declarations, arithmetic expressions, if-else statements, print commands, and a while loop.
   - **`UPLOAD_FILE`**: Opens a file dialog allowing you to load text files from your disk.
   - **`CLEAR`**: Resets the editor and diagnostics panels.
   - **`RUN_COMPILER()`**: Runs lexical, syntax, and semantic checks on the source code.
4. **Tab Panels**:
   - **`LEXER`**: Renders a table of the scanned token stream (Line, Token, Type). Clicking a row highlights the corresponding line in the editor.
   - **`SYMBOLS`**: Lists all variables, showing their scope levels, types, and hexadecimal memory offsets (e.g. `0x0000`, `0x0004`, `0x000C`).
   - **`AST_TREE`**: Visualizes the parsed AST hierarchy in a clean ASCII tree diagram.
   - **`IR_CODE`**: Displays the generated Three-Address Code (TAC).
   - **`DIAGS`**: Shows success statuses or a list of colored error cards. Clicking an error card centers and highlights that line in the editor.

---

## 10. Challenges Faced and Solutions

### 10.1 Challenge 1: Left Recursion and Precedence in Expressions
*Problem*: Traditional expression rules in BNF often contain left-recursion (e.g. `E -> E + T`), which causes recursive descent parsers to loop infinitely.
*Solution*: We eliminated left-recursion by rewriting rules using EBNF repetitions (equivalent to loops in code) and structured functions from lowest to highest precedence (LogicalOr -> LogicalAnd -> Equality -> Relational -> Additive -> Multiplicative -> Primary).

### 10.2 Challenge 2: Gutter Line Synchronization
*Problem*: Textarea components do not natively support scrolling sync with a separate line number column.
*Solution*: We added an event listener in `app.js` that splits text values by newline, generates line numbers dynamically, and binds the gutter's `scrollTop` directly to the textarea's scroll position.

### 10.3 Challenge 3: Maintaining Variable Offsets across Scopes
*Problem*: A naive implementation reset memory offsets on block exit, which could overwrite variables in outer scopes.
*Solution*: We decoupled variable scope levels from their memory allocations. Offsets are tracked globally and incremented by 4 or 8 bytes depending on type declarations, keeping memory assignments safe across scopes.

---

## 11. Conclusion and Team Responsibilities

The compiler design project meets all the requirements of the System Programming course:
- All components (Lexer, Parser, Symbol Table, Semantic Analyzer, and TAC generator) were written manually from scratch in JavaScript without using any external parser generators.
- Built a web-based GUI window matching the portfolio's cyberpunk visual theme.
- Successfully verified syntax and semantic checks using the university's sample program and testing scenarios.

### 11.1 Student Responsibility
- **Sercan Özkan (SercanOzkan55)**:
  - Designed the CFG context-free grammar.
  - Implemented the character-by-character Lexer scanner.
  - Coded the Recursive Descent Parser and AST tree builder.
  - Wrote the block-scoped Symbol Table and simulated memory layout.
  - Implemented semantic type-checking logic.
  - Wrote the Three-Address Code intermediate representation generator.
  - Built the web GUI dashboard and interactive event bindings.
  - Prepared the academic project report and verification plan.
