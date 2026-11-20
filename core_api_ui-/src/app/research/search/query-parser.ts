
/**
 * Boolean query parser for CORE's Elasticsearch query-string syntax.
 *
 * Supports:
 * - Search terms and quoted phrases
 * - Field-qualified terms and phrases
 * - AND, OR and NOT operators
 * - Parenthetical grouping
 * - Implicit OR between adjacent expressions
 */

export const MAX_QUERY_LENGTH = 500;

export type TokenType =
  | 'TERM'
  | 'PHRASE'
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'LPAREN'
  | 'RPAREN';

export interface QueryToken {
  type: TokenType;
  value: string;
  position: number;
}

export interface QueryIssue {
  message: string;
  position: number | null;
}

export interface QueryValidation {
  valid: boolean;
  errors: QueryIssue[];
  warnings: QueryIssue[];
  /** Normalized query ready for submission. Empty when invalid. */
  normalized: string;
  tokens: QueryToken[];
}

export interface YearRange {
  yearFrom: number | null;
  yearTo: number | null;
}

const BOOLEAN_OPERATORS = new Set(['AND', 'OR', 'NOT']);
const LOWERCASE_OPERATORS = new Set(['and', 'or', 'not']);

const isBooleanOperator = (value: string): value is 'AND' | 'OR' | 'NOT' =>
  BOOLEAN_OPERATORS.has(value);

const isOperand = (token: QueryToken | undefined): boolean =>
  token?.type === 'TERM' || token?.type === 'PHRASE';

const isBinaryOperator = (token: QueryToken | undefined): boolean =>
  token?.type === 'AND' || token?.type === 'OR';

/**
 * Tokenizes a query while preserving quoted phrases and field-qualified values.
 *
 * Positions refer to the original input string.
 */
export function tokenize(
  input: string
): { tokens: QueryToken[]; errors: QueryIssue[] } {
  const tokens: QueryToken[] = [];
  const errors: QueryIssue[] = [];

  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (/\s/.test(char)) {
      index++;
      continue;
    }

    if (char === '(' || char === ')') {
      tokens.push({
        type: char === '(' ? 'LPAREN' : 'RPAREN',
        value: char,
        position: index,
      });

      index++;
      continue;
    }

    // Handle standalone quoted phrases.
    if (char === '"') {
      const end = input.indexOf('"', index + 1);

      if (end === -1) {
        errors.push({
          message: 'Unclosed quotation mark. Close the phrase with a matching ".',
          position: index,
        });
        break;
      }

      const phrase = input.slice(index + 1, end).trim();

      if (!phrase) {
        errors.push({
          message: 'Empty phrase "". Put words inside the quotation marks.',
          position: index,
        });
      } else {
        tokens.push({
          type: 'PHRASE',
          value: `"${normalizeWhitespace(phrase)}"`,
          position: index,
        });
      }

      index = end + 1;
      continue;
    }

    // Read a term, including field-qualified quoted values.
    const start = index;
    let value = '';

    while (index < input.length && !/[\s()]/.test(input[index])) {
      if (input[index] !== '"') {
        value += input[index];
        index++;
        continue;
      }

      const end = input.indexOf('"', index + 1);

      if (end === -1) {
        errors.push({
          message: 'Unclosed quotation mark. Close the phrase with a matching ".',
          position: index,
        });

        index = input.length;
        break;
      }

      const phrase = input.slice(index + 1, end);

      value += `"${normalizeWhitespace(phrase)}"`;
      index = end + 1;
    }

    if (!value) {
      continue;
    }

    const type: TokenType = isBooleanOperator(value)
      ? value
      : 'TERM';

    tokens.push({
      type,
      value,
      position: start,
    });
  }

  return { tokens, errors };
}

/**
 * Collapses consecutive whitespace characters into a single space.
 */
function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Validates the logical structure of a tokenized query.
 *
 * Adjacent operands are allowed and interpreted as implicit OR.
 */
function validateTokenStructure(tokens: QueryToken[]): QueryIssue[] {
  const errors: QueryIssue[] = [];

  const openParentheses: QueryToken[] = [];

  let expectingOperand = true;

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];

    switch (token.type) {
      case 'LPAREN': {
        if (!expectingOperand) {
          // Adjacent expressions are treated as implicit OR.
          expectingOperand = true;
        }

        openParentheses.push(token);
        expectingOperand = true;
        break;
      }

      case 'RPAREN': {
        if (expectingOperand) {
          errors.push({
            message: 'Unexpected closing parenthesis or empty parentheses.',
            position: token.position,
          });
        }

        if (openParentheses.length === 0) {
          errors.push({
            message: 'Closing parenthesis ")" has no matching "(".',
            position: token.position,
          });
        } else {
          openParentheses.pop();
        }

        expectingOperand = false;
        break;
      }

      case 'AND':
      case 'OR': {
        if (expectingOperand) {
          errors.push({
            message: `${token.type} requires a search expression before it.`,
            position: token.position,
          });
        }

        expectingOperand = true;
        break;
      }

      case 'NOT': {
        // NOT can be used as a unary operator or between expressions.
        // In either case, another expression must follow it.
        expectingOperand = true;
        break;
      }

      case 'TERM':
      case 'PHRASE': {
        if (!expectingOperand) {
          // Adjacent terms use implicit OR.
          expectingOperand = false;
        } else {
          expectingOperand = false;
        }

        break;
      }
    }
  }

  if (expectingOperand && tokens.length > 0) {
    const lastToken = tokens[tokens.length - 1];

    errors.push({
      message: `${lastToken.value} requires a search expression after it.`,
      position: lastToken.position,
    });
  }

  for (const open of openParentheses) {
    errors.push({
      message: 'Opening parenthesis "(" is never closed.',
      position: open.position,
    });
  }

  return errors;
}

/**
 * Validates a user's search expression.
 */
export function validateQuery(input: string): QueryValidation {
  const errors: QueryIssue[] = [];
  const warnings: QueryIssue[] = [];

  const trimmed = input.trim();

  if (!trimmed) {
    return {
      valid: false,
      errors: [{ message: 'Enter a search query.', position: null }],
      warnings,
      normalized: '',
      tokens: [],
    };
  }

  if (trimmed.length > MAX_QUERY_LENGTH) {
    errors.push({
      message: `Query is too long (${trimmed.length}/${MAX_QUERY_LENGTH} characters).`,
      position: null,
    });
  }

  const { tokens, errors: tokenErrors } = tokenize(input);

  errors.push(...tokenErrors);

  if (tokens.length > 0 && !tokens.some(isOperand)) {
    errors.push({
      message: 'Add at least one search term.',
      position: null,
    });
  }

  errors.push(...validateTokenStructure(tokens));

  // Warn when lowercase Boolean keywords are used as search terms.
  for (const token of tokens) {
    if (
      token.type === 'TERM' &&
      LOWERCASE_OPERATORS.has(token.value)
    ) {
      const operator = token.value.toUpperCase();

      warnings.push({
        message: `"${token.value}" is searched as a word. Use uppercase ${operator} for the Boolean operator.`,
        position: token.position,
      });
    }
  }

  // Remove duplicate warnings while preserving their original order.
  const uniqueWarnings = warnings.filter(
    (warning, index, collection) =>
      collection.findIndex(
        (item) =>
          item.message === warning.message &&
          item.position === warning.position
      ) === index
  );

  const valid = errors.length === 0;

  return {
    valid,
    errors,
    warnings: uniqueWarnings,
    normalized: valid ? normalizeTokens(tokens) : '',
    tokens,
  };
}

/**
 * Serializes tokens into a normalized query string.
 */
function serialize(tokens: QueryToken[]): string {
  return tokens.reduce((result, token, index) => {
    const previous = tokens[index - 1];

    const needsSpace =
      index > 0 &&
      previous.type !== 'LPAREN' &&
      token.type !== 'RPAREN';

    return result + (needsSpace ? ' ' : '') + token.value;
  }, '');
}

/**
 * Checks whether the first opening parenthesis matches the final token.
 */
function isWrappedInParentheses(tokens: QueryToken[]): boolean {
  if (
    tokens.length < 2 ||
    tokens[0].type !== 'LPAREN' ||
    tokens[tokens.length - 1].type !== 'RPAREN'
  ) {
    return false;
  }

  let depth = 0;

  for (let index = 0; index < tokens.length; index++) {
    if (tokens[index].type === 'LPAREN') {
      depth++;
    } else if (tokens[index].type === 'RPAREN') {
      depth--;
    }

    if (depth === 0 && index < tokens.length - 1) {
      return false;
    }
  }

  return depth === 0;
}

/**
 * Normalizes a valid token sequence.
 *
 * Removes redundant parentheses surrounding the entire expression.
 */
export function normalizeTokens(tokens: QueryToken[]): string {
  let normalizedTokens = tokens;

  while (isWrappedInParentheses(normalizedTokens)) {
    normalizedTokens = normalizedTokens.slice(1, -1);
  }

  return serialize(normalizedTokens);
}

/**
 * Combines a validated search expression with optional publication-year filters.
 *
 * OR expressions are grouped to ensure year constraints apply to the
 * complete search expression.
 */
export function buildCoreQuery(
  normalized: string,
  { yearFrom, yearTo }: YearRange
): string {
  const query = normalized.trim();

  if (!query) {
    return '';
  }

  const filters: string[] = [];

  let from = yearFrom;
  let to = yearTo;

  // Ensure the year range is in ascending order.
  if (from !== null && to !== null && from > to) {
    [from, to] = [to, from];
  }

  if (from !== null) {
    filters.push(`yearPublished>=${from}`);
  }

  if (to !== null) {
    filters.push(`yearPublished<=${to}`);
  }

  if (filters.length === 0) {
    return query;
  }

  const hasOr = tokenize(query).tokens.some(
    (token) => token.type === 'OR'
  );

  const baseQuery = hasOr ? `(${query})` : query;

  return [baseQuery, ...filters].join(' AND ');
}
