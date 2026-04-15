import { existsSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';

function collectFlowFiles(rootDir: string): string[] {
  const stack: string[] = [rootDir];
  const flowFiles: string[] = [];

  while (stack.length > 0) {
    const currentPath = stack.pop();
    if (!currentPath) {
      continue;
    }

    for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
      const fullPath = resolve(currentPath, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
        flowFiles.push(fullPath);
      }
    }
  }

  return flowFiles.sort((left, right) => left.localeCompare(right));
}

function main(): void {
  const maestroDir = resolve(process.cwd(), '.maestro');

  if (!existsSync(maestroDir) || !statSync(maestroDir).isDirectory()) {
    console.error('Required .maestro directory was not found.');
    console.error('Create .maestro and add at least one flow file (*.yaml or *.yml).');
    process.exit(1);
  }

  const flowFiles = collectFlowFiles(maestroDir);
  if (flowFiles.length === 0) {
    console.error('No Maestro flow files were found under .maestro/.');
    console.error('Add at least one flow file (*.yaml or *.yml).');
    process.exit(1);
  }

  console.log(`Found ${flowFiles.length} Maestro flow file(s):`);
  for (const flowFile of flowFiles) {
    console.log(`- ${relative(process.cwd(), flowFile)}`);
  }
}

main();
