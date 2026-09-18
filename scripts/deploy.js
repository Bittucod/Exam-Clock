import { execSync } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';

console.log('1. Building project with astro build...');
execSync('npm run build', { stdio: 'inherit' });

console.log('2. Staging dist files to main branch...');
const tempIndex = path.resolve('.git', 'temp_index');
process.env.GIT_INDEX_FILE = tempIndex;

try {
  execSync('git --work-tree=dist add --all', { stdio: 'inherit' });
  const tree = execSync('git write-tree').toString().trim();
  
  let parentArg = '';
  try {
    const parentCommit = execSync('git rev-parse --verify refs/heads/main').toString().trim();
    if (parentCommit) {
      parentArg = `-p ${parentCommit}`;
    }
  } catch {}

  const commitMessage = `Production build output - ${new Date().toISOString()}`;
  const commit = execSync(`git commit-tree ${tree} ${parentArg} -m "${commitMessage}"`).toString().trim();
  execSync(`git update-ref refs/heads/main ${commit}`, { stdio: 'inherit' });
  
  console.log('3. Pushing main branch to origin...');
  execSync('git push origin main', { stdio: 'inherit' });
  console.log('✓ Successfully updated and pushed main branch with latest build output!');
} finally {
  delete process.env.GIT_INDEX_FILE;
  if (existsSync(tempIndex)) {
    try {
      unlinkSync(tempIndex);
    } catch {}
  }
}
