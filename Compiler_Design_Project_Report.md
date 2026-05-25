# PROJECT REPORT: DESIGN AND IMPLEMENTATION OF A SIMPLE TWO-PASS COMPILER

**Course:** System Programming (Spring 2025-2026)  
**Department:** Computer/Software Engineering Department  
**Faculty:** Faculty of Engineering, Istanbul Health and Technology University  
**Submission Date:** 02.06.2026  

---

## 1. System Design and Architecture Overview

The compiler is designed as a classic **Two-Pass Compiler** that executes translation, validation, and semantic verification in two discrete stages (passes) from source code to structural representation. 

The architecture is divided into the following key components:

```
                  ┌──────────────────────┐
                  │     Source Code      │
                  └──────────┬───────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ PASS 1: Lexical Analyzer (Lexer)                       │
 ├────────────────────────────────────────────────────────┤
 │ - Scans character-by-character                         │
 │ - Skips whitespaces & comments                         │
 │ - Emits Token Stream & Tracks Line Numbers             │
 │ - Populates Symbol Table Scopes                        │
 └──────────────────────────┬─────────────────────────────┘
                             │
                             ├───────────────────────┐
                             │ Token Stream          │ Symbol Table
                             ▼                       ▼
 ┌────────────────────────────────────────────────────────┐
 │ PASS 2: Parser & Semantic Analyzer                     │
 ├────────────────────────────────────────────────────────┤
 │ - Top-Down Recursive Descent Parser                    │
 │ - Generates Abstract Syntax Tree (AST)                 │
 │ - Evaluates expression types                           │
 │ - Enforces type compatibility and scope declaration     │
 └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ AST & Symbol Table   │
                  │   Diagnostic Output  │
                  └──────────────────────┘
```

1. **Pass 1 - Lexical Analysis (Lexer)**: Takes the raw character input stream of the source code, scans it, and groups character sequences into meaningful lexical units called **Tokens**. During tokenization, comments and whitespaces are ignored.
2. **Pass 2 - Syntax & Semantic Analysis (Parser)**: Validates the token stream against the Context-Free Grammar defined in Backus-Naur Form (BNF). It uses a top-down **Recursive Descent Parsing** strategy to build an **Abstract Syntax Tree (AST)**. Simultaneously (or on the generated AST), it performs static semantic checking: scoping, declaration validation, and type-compatibility checks.
3. **Symbol Table Module**: A hierarchical scoped map stack that persists declarations, structural types, scoping levels, and memory offsets.
4. **Graphical/Visual UI**: A web-based desktop application integrated as a terminal console element (`COMPILER.EXE`) that renders source code side-by-side with token streams, symbol records, abstract parse structures, and error diagnostics.

---

## 2. BNF Grammar Definition of the Source Language

The source language is a simple block-scoped structured imperative language. It is defined using the following Backus-Naur Form (BNF) grammar, which has been designed to eliminate ambiguity and left-recursion, making it ideal for recursive descent parsing:

```bnf
Program           ::= StatementList
StatementList     ::= Statement StatementList | ε
Statement         ::= Declaration | Assignment | Selection | Iteration | Print

Declaration       ::= Type IDENTIFIER ";"
Type              ::= "int" | "float"

Assignment        ::= IDENTIFIER "=" Expression ";"

Selection         ::= "if" "(" Expression ")" Block ElsePart
ElsePart          ::= "else" Block | ε

Iteration         ::= "while" "(" Expression ")" Block

Print             ::= "print" "(" PrintArg ")" ";"
PrintArg          ::= STRING_LITERAL | Expression

Block             ::= "{" StatementList "}"

Expression        ::= LogicalOr
LogicalOr         ::= LogicalAnd ( "||" LogicalAnd )*
LogicalAnd        ::= Equality ( "&&" Equality )*
Equality          ::= Relational ( ( "==" | "!=" ) Relational )*
Relational        ::= Additive ( ( "<" | ">" | "<=" | ">=" ) Additive )*
Additive          ::= Multiplicative ( ( "+" | "-" ) Multiplicative )*
Multiplicative    ::= Primary ( ( "*" | "/" ) Primary )*
Primary           ::= IDENTIFIER 
                    | INTEGER_LITERAL 
                    | FLOAT_LITERAL 
                    | STRING_LITERAL 
                    | "(" Expression ")" 
                    | "-" Primary 
                    | "!" Primary
```

### Precedence Levels and Associativity:
1. `()` (Grouping), `-` (Unary Minus), `!` (Logical Negation) — Highest Precedence, Right-to-Left associativity.
2. `*`, `/` (Multiplicative) — Left-to-Right associativity.
3. `+`, `-` (Additive) — Left-to-Right associativity.
4. `<`, `>`, `<=`, `>=` (Relational comparisons) — Left-to-Right associativity.
5. `==`, `!=` (Equality checking) — Left-to-Right associativity.
6. `&&` (Logical AND) — Left-to-Right associativity.
7. `||` (Logical OR) — Lowest Precedence, Left-to-Right associativity.

---

## 3. Pass 1: Lexical Analysis (Lexer) Implementation

The Lexer scans the string source code character-by-character and classifies matching substrings into discrete token records.

### Token Specifications:
- **KEYWORD**: Keywords reserved by the language (`int`, `float`, `if`, `else`, `while`, `print`).
- **IDENTIFIER**: Variables conforming to regex pattern `[a-zA-Z_][a-zA-Z0-9_]*`.
- **INTEGER_LITERAL**: Sequences of decimal digits (e.g., `10`, `0`, `45`).
- **FLOAT_LITERAL**: Decimal digits containing a single decimal point (e.g., `3.14`, `0.05`).
- **STRING_LITERAL**: Substrings enclosed in double quotes `""` (e.g., `"Result is large"`).
- **OPERATOR**: Operator symbols (`+`, `-`, `*`, `/`, `=`, `==`, `!=`, `<`, `>`, `<=`, `>=`, `&&`, `||`, `!`).
- **DELIMITER**: Punctuation delimiters (`;`, `,`, `(`, `)`, `{`, `}`).

### Core Scanning Algorithm:
The scanner reads input using a pointer `pos` while tracking `line` and `col` metrics.
1. **Whitespaces and Newlines**: Skipped, incrementing `line` and resetting `col` on `\n`.
2. **Comments**:
   - Single-line comments (`//`): Scanners skip to the end of the line.
   - Multi-line comments (`/* ... */`): Skipped until closing sequence `*/` is matched. If the file ends before `*/`, a lexical error is logged.
3. **Identifiers/Keywords**: Accumulated while characters remain alphanumeric or underscores. The resulting string is matched against keywords; otherwise, it is categorized as an `IDENTIFIER`.
4. **Numbers**: Scans digit sequences. If a dot `.` is encountered, it switches to scanning decimal fractions. If multiple dots are found, a lexical error is reported.
5. **Strings**: Accumulates characters between enclosing double quotes. Unclosed strings extending past a newline trigger a lexical error.
6. **Compound Operators**: Resolves double-char operators (e.g. `==`, `!=`, `<=`, `>=`, `&&`, `||`) by checking the lookahead character before falling back to single characters.

---

## 4. Pass 2: Syntax and Semantic Analysis (Parser)

The Parser acts as the second pass of compilation, taking the token stream from the Lexer and building the program's logical structural representation.

### Parsing Strategy:
We implement a **Top-Down Recursive Descent Parser** with a LL(1) lookahead. Each non-terminal in the BNF grammar maps to a specific helper method (e.g. `parseStatement()`, `parseExpression()`, `parseTerm()`). The parser consumes tokens matching expectations or throws a syntax error stating what token was expected versus what was found.

### AST Architecture:
The parser produces an **Abstract Syntax Tree (AST)** represented as a tree hierarchy of nodes:
- `Program`: The root containing statements.
- `VarDecl`: Variable declaration nodes showing types and names.
- `Assignment`: Contains assignment target and RHS expression node.
- `IfStatement`/`WhileStatement`: Node tracking condition and executable block bodies.
- `BinaryExpr`: Expresses operators and reference pointers to left/right expressions.
- `Literal`/`Identifier`: Evaluates base values or variable lookups.

### Semantic Checks:
Semantic validation happens dynamically during AST generation:
1. **Variable Declarations**: 
   - Before variables can be declared, they are checked against the current scope. If already declared, a duplicate declaration error is raised.
   - Declared variables are written into the active Scope Map.
2. **Variable Usage (Scoping Check)**:
   - When a variable is used in assignments, prints, or expressions, the compiler searches the scope stack from the current block scope up to the global scope.
   - If the variable is not found in any active scope, an undeclared variable error is logged.
3. **Type Compatibility Checking**:
   - **Assignments**: The type of the RHS expression is computed. If the LHS variable is `int` and the expression evaluates to `float`, a type mismatch error is thrown. Strings cannot be assigned to numeric types. Implicit conversion is allowed for `int` expressions assigned to `float` variables.
   - **Operators**: Enforces that arithmetic operands (`+`, `-`, `*`, `/`) and comparisons (`<`, `>`, `<=`, `>=`) must be numeric types (`int` or `float`). Strings are rejected. Operations involving floats promote the overall expression evaluation to `float`.
   - **Conditions**: Condition checks in `if` and `while` structures must evaluate to a numeric or logical type (i.e. not `string`).

---

## 5. Symbol Table Structure and Management

The Symbol Table is implemented using a **Scope Stack** of HashMaps, supporting lexical block scoping (e.g. `{` creates a scope, `}` destroys it).

### Symbol Table Attributes:
For each declared variable, the table records:
- **Name**: The string identifier name.
- **Type**: `int` or `float`.
- **Scope Level**: Integer scope depth (0 for global scope, 1 for block scope, etc.).
- **Memory Offset**: Simulated byte-address index tracking data locations. `int` variables occupy `4 bytes`, while `float` variables allocate `8 bytes`.
- **Declared Line**: The line number where declaration was compiled.

```
       Scope Stack Layout (Conceptual)
      ┌───────────────────────────────┐
      │ Scope 1 (Block Scope)         │
      │ - result: float (Offset 8)    │
      └──────────────┬────────────────┘
                     │ Parent Link
                     ▼
      ┌───────────────────────────────┐
      │ Scope 0 (Global Scope)        │
      │ - x: int (Offset 0)           │
      │ - y: int (Offset 4)           │
      └───────────────────────────────┘
```

---

## 6. Error Handling Strategy

The compiler implements a strict, descriptive multi-tier error logging interface. Instead of aborting execution immediately upon detecting the first error, the compiler attempts to catch all errors across passes by running syntax synchronizations where possible:

1. **Lexical Errors**: Catch malformed number literals (e.g., `3.14.15` or trailing dot `3.`), unclosed string literals, and unexpected characters (e.g., `$`, `#`). Highlighting is displayed on the exact line number.
2. **Syntax Errors**: Catch missing semi-colons, unbalanced parenthesis or braces, or misplaced operators. Upon catching a syntax mismatch, the parser reports the expected delimiter/token, logs the location, and skips tokens until the next structural delimiter (`;` or `}`) to recover and continue parsing subsequent blocks.
3. **Semantic Errors**: Catch variable redeclaration within the same block scope, variable usage without declaration, and type mismatches in operations and assignments. These error messages specify variable names, mismatch details, and declaration lines.

---

## 7. UI walkthrough and Logic Explanation

The Compiler is integrated directly into the **Holo-Cyber OS Portfolio Desktop**:
1. **Interactive Launch Icon**: Clicking the `COMPILER.EXE` desktop shortcut initiates the application window.
2. **Source Editor**: Features a clean text editing space with an active line number gutter that auto-updates and scrolls in sync with text inputs. The header shows live cursor information (`LN X, COL Y`).
3. **Control Bar**:
   - `LOAD_SAMPLE`: Loads the valid university program sample in one click.
   - `CLEAR`: Resets editor contents and clears diagnostic tabs.
   - `RUN_COMPILER()`: Runs compilation passes and updates reporting tabs.
4. **Compiler Results Tabs**:
   - **LEXER**: Displays a complete table of the scanned token stream. Clicking a row automatically highlights and centers the token line in the Source Editor.
   - **SYMBOLS**: Displays scope depth, type mappings, and hexadecimal memory offsets (e.g. `0x0000`, `0x0004`, `0x000C`).
   - **AST_TREE**: Displays the generated parser Abstract Syntax Tree as an interactive hierarchical tree representation (using ASCII indentation branch structures: `├──` and `└──`).
   - **DIAGS**: Diagnostic logs summarizing success status or list of colored compiler errors. Clicking an error jumps to the exact error line in the editor.

---

## 8. Challenges Faced and Solutions Implemented

### Challenge 1: Gutter and Line Sync Scroll in Textareas
Textareas don't natively align line numbers on vertical scrolls. 
- *Solution*: Developed a sync handler in `app.js` that splits text values by newline, updates a list of line number elements dynamically, and binds the gutter's `scrollTop` directly to the textarea's `scrollTop` event.

### Challenge 2: Error Recovery in Parser
Recursive descent parsers usually crash on the first error, leaving later errors unparsed.
- *Solution*: Implemented a synchronization routine using `try/catch` statements in `parseStatementList()`. When a statement fails to parse, the syntax error is caught, and the parser advances the token pointer until it finds a statement delimiter (`;` or `}`) to parse the next statements, collecting multiple errors.

### Challenge 3: Operator Precedence and Precedence Climbing
Standard arithmetic expressions can result in tree structures that evaluate operations in the wrong order if parsed flat.
- *Solution*: Layered the expression parser into progressive priority levels: LogicalOr -> LogicalAnd -> Equality -> Relational -> Additive -> Multiplicative -> Primary. This structure forces multiplicative operators (`*`, `/`) to be nested lower in the AST than additive ones (`+`, `-`), ensuring correct evaluation order.

---

## 9. Responsibility of Group Members

As a student project submission, the individual contributions are allocated as follows:
- **Sercan Özkan (Student ID: 55)**:
  - Designed the CFG context-free grammar and BNF representations.
  - Implemented the character-by-character Lexer scanner.
  - Coded the Recursive Descent Parser and Abstract Syntax Tree stringifier.
  - Configured block scope stack lookup and symbol memory offsets.
  - Crafted the cyberpunk-themed UI window manager integration and interactive event bindings.
  - Documented compiler error logs, verification strategies, and compile outputs.
