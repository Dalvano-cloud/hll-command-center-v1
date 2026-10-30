import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/main.jsx', 'utf8');
function section(startText, endText) {
  const start = source.indexOf(startText);
  const end = source.indexOf(endText, start + startText.length);
  assert.notEqual(start, -1, `Missing source section: ${startText}`);
  assert.notEqual(end, -1, `Missing end marker: ${endText}`);
  return source.slice(start, end);
}

const sync = section('async function syncOperationRelations(', 'async function loadRelationalOperations(');
assert.match(sync, /\}\s*else if\s*\(isPlayerRole\)\s*\{/, 'Player role sync branch must remain active.');
assert.doesNotMatch(sync, /authoritative\.\s*\}\s*else if\s*\(isPlayerRole\)/, 'Player role branch must not be swallowed by a line comment.');
assert.doesNotMatch(sync, /from\(['"]roster_assignments['"]\)\.delete\(\)\.eq\(['"]operation_id['"],\s*opRow\.id\)/, 'Operation sync must not clear every roster assignment.');
assert.match(sync, /ignoreDuplicates:\s*true/, 'New assignments must not overwrite an assignment created concurrently by a player.');
assert.match(sync, /update\(\{attendance:\s*a\.attendance\}\)/, 'Explicit attendance changes must be persisted separately.');
assert.match(sync, /currentInDatabase!==expected/, 'Attendance writes must use an optimistic concurrency guard.');
assert.match(sync, /update\(\{squad_id:a\.squad_id,role:a\.role,ready:a\.ready\}\)/, 'Roster changes must not overwrite attendance.');

const calendar = section('function calendarLocalDate(', 'function Roster(');
assert.match(calendar, /function calendarLocalDate\(/, 'Calendar must have local date formatting.');
assert.match(calendar, /function calendarLocalTime\(/, 'Calendar must have local time formatting.');
assert.doesNotMatch(calendar, /start\.toISOString\(\)\.slice\(11,16\)/, 'Calendar edit form must not convert a local time to UTC text.');
assert.match(calendar, /linked\?\x60Operation #\$\{linked\.number\}\x60:'Clan event'/, 'Calendar event description fallback must handle linked operations correctly.');

assert.match(source, /if\(import\.meta\.env\.PROD&&!supabase\)/, 'Production must fail closed if Supabase configuration is missing.');
const reset = section('function ResetPassword(', 'function AuthenticatedApp(');
assert.match(reset, /password\.length<12/, 'Password reset must reject passwords shorter than 12 characters.');
const login = section('function Login(', 'const ROLE_LABELS=');
assert.match(login, /password\.length<12/, 'New account creation must reject passwords shorter than 12 characters.');

console.log('Production regression checks passed: attendance concurrency, player sync branch, calendar local time, fail-closed config, and password length.');
