import fs from 'fs';
import path from 'path';

export function validateFirestoreRules(rulesPath = path.join(process.cwd(), 'firestore.rules')): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!fs.existsSync(rulesPath)) {
    return { valid: false, errors: [`firestore.rules not found at ${rulesPath}`] };
  }

  const content = fs.readFileSync(rulesPath, 'utf-8');
  const lines = content.split(/\r?\n/);

  // 1. Validate rules_version = '2'
  if (!/rules_version\s*=\s*['"]2['"]\s*;/.test(content)) {
    errors.push("Missing or invalid `rules_version = '2';` declaration.");
  }

  // 2. Validate service declaration (must be `service cloud.firestore`, never `cloud2.firestore`)
  if (!/service\s+cloud\.firestore\s*\{/.test(content)) {
    const line2 = lines[1]?.trim() || '';
    errors.push(
      `Invalid Firestore service declaration (found "${line2}"). Expected \`service cloud.firestore {\`.`
    );
  }

  // 3. Validate root database match block
  if (!/match\s+\/databases\/\{database\}\/documents\s*\{/.test(content)) {
    errors.push('Missing `match /databases/{database}/documents {` block.');
  }

  // 4. Validate balanced braces and parentheses (ignoring string literals and comments)
  const stripped = content
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/\/\/.*$/gm, '');

  let braceDepth = 0;
  let parenDepth = 0;
  for (const ch of stripped) {
    if (ch === '{') braceDepth++;
    else if (ch === '}') braceDepth--;
    else if (ch === '(') parenDepth++;
    else if (ch === ')') parenDepth--;

    if (braceDepth < 0) {
      errors.push('Unbalanced closing curly brace `}` detected in firestore.rules.');
      break;
    }
    if (parenDepth < 0) {
      errors.push('Unbalanced closing parenthesis `)` detected in firestore.rules.');
      break;
    }
  }
  if (braceDepth !== 0) {
    errors.push(`Unbalanced curly braces in firestore.rules (net depth: ${braceDepth}).`);
  }
  if (parenDepth !== 0) {
    errors.push(`Unbalanced parentheses in firestore.rules (net depth: ${parenDepth}).`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🔒 Validating firestore.rules...');
  const result = validateFirestoreRules();
  if (!result.valid) {
    console.error('❌ firestore.rules validation failed:');
    for (const err of result.errors) {
      console.error(`   - ${err}`);
    }
    process.exit(1);
  }
  console.log('✅ firestore.rules passed syntax and service validation!');
}
