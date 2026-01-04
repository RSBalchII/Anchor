const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Aggregates all readable text content from a directory and its subdirectories
 * into a single YAML file under 100k characters, respecting .gitignore rules.
 */
function createFullCorpusRecursive() {
  // Set the root directory to scan as the directory containing this script
  const rootDirToScan = path.dirname(__filename);

  const outputYamlFile = path.join(rootDirToScan, 'combined_text.yaml');

  console.log(`Scanning Target Directory: ${rootDirToScan}`);

  // Read and parse .gitignore file
  const gitignorePath = path.join(rootDirToScan, '.gitignore');
  let gitignorePatterns = [];
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    gitignorePatterns = gitignoreContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(pattern => {
        // Convert gitignore pattern to a regex
        let regexPattern = pattern
          .replace(/\./g, '\\.') // Escape dots
          .replace(/\*/g, '.*')  // Convert * to .*
          .replace(/\?/g, '.'); // Convert ? to .

        // Add start and end anchors
        if (!pattern.startsWith('/')) {
          regexPattern = '.*' + regexPattern;
        } else {
          regexPattern = regexPattern.substring(1);
        }

        if (!pattern.endsWith('/**') && !pattern.endsWith('/*')) {
          regexPattern += '$';
        }

        return new RegExp(regexPattern);
      });
  }

  const textExtensions = new Set([
    '.md', '.poml', '.yaml', '.yml', '.txt',
    '.py', '.js', '.ts', '.css', '.sh', '.ps1', '.html', '.bat'
  ]);

  // Files to exclude from the corpus itself to avoid recursion
  const excludeFiles = new Set([
    path.basename(outputYamlFile),
    'package-lock.json',
    'yarn.lock'
  ]);

  const filesToProcess = [];

  function walkDirectory(currentPath) {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);

      // Check if this path matches any gitignore pattern
      const relPath = path.relative(rootDirToScan, itemPath);
      const isIgnored = gitignorePatterns.some(pattern => pattern.test(relPath) || pattern.test(relPath + '/'));

      if (isIgnored) {
        continue; // Skip this file/directory if it matches gitignore
      }

      if (stat.isDirectory()) {
        walkDirectory(itemPath);
      } else if (stat.isFile()) {
        const ext = path.extname(item).toLowerCase();
        if (textExtensions.has(ext) && !excludeFiles.has(item)) {
          filesToProcess.push(itemPath);
        }
      }
    }
  }

  walkDirectory(rootDirToScan);
  filesToProcess.sort();

  if (filesToProcess.length === 0) {
    console.log(`No processable files found in '${rootDirToScan}'.`);
    return;
  }

  console.log(`Found ${filesToProcess.length} files to process.`);

  const memoryRecords = [];
  let totalCharCount = 0;
  const maxChars = 200000; // 200k characters limit

  for (const filePath of filesToProcess) {
    if (totalCharCount >= maxChars) {
      console.log(`Reached character limit of ${maxChars}, stopping processing.`);
      break;
    }

    console.log(`Processing '${filePath}'...`);
    try {
      // Get file metadata
      const fileStats = fs.statSync(filePath);
      const modTime = fileStats.mtimeMs; // milliseconds timestamp
      const relPath = path.relative(rootDirToScan, filePath);

      // Read file content
      const rawContent = fs.readFileSync(filePath);
      // For simplicity in JS, we'll assume UTF-8, but could implement encoding detection
      const decodedContent = rawContent.toString('utf-8');

      // Check if adding this file would exceed the character limit
      if (totalCharCount + decodedContent.length > maxChars) {
        // Truncate content to fit within the limit
        const remainingChars = maxChars - totalCharCount;
        if (remainingChars > 0) {
          const truncatedContent = decodedContent.substring(0, remainingChars);
          memoryRecords.push({
            role: 'system',
            type: 'document',
            source: relPath,
            timestamp: Math.floor(modTime), // Convert to integer
            content: truncatedContent
          });
          totalCharCount += truncatedContent.length;
          console.log(`Truncated content for '${relPath}' to fit within character limit.`);
        }
        break; // Reached the limit, stop processing
      } else {
        // Add full content
        memoryRecords.push({
          role: 'system',
          type: 'document',
          source: relPath,
          timestamp: Math.floor(modTime), // Convert to integer
          content: decodedContent
        });
        totalCharCount += decodedContent.length;
      }

    } catch (e) {
      console.log(`An unexpected error occurred with file '${filePath}': ${e.message}`);
    }
  }

  // Generate YAML Memory File
  console.log(`Generating YAML Memory: ${outputYamlFile}`);

  // Custom YAML representer for multiline strings
  const schema = yaml.DEFAULT_SCHEMA.extend([
    new yaml.Type('!long-string', {
      kind: 'scalar',
      predicate: (data) => typeof data === 'string' && data.includes('\n'),
      represent: (data) => ({ value: data, style: '|' })
    })
  ]);

  // Use default representer with multiline string style
  const yamlContent = yaml.dump(memoryRecords, {
    lineWidth: -1, // Don't wrap lines
    noRefs: true,
    quotingType: '"', // Use double quotes when needed
    forceQuotes: false
  });

  fs.writeFileSync(outputYamlFile, yamlContent, 'utf-8');

  console.log('\nCorpus aggregation complete.');
  console.log(`YAML Memory: '${outputYamlFile}'`);
  console.log(`Total characters: ${totalCharCount}`);
  console.log(`Files processed: ${memoryRecords.length}`);
}

// Run the function if this script is executed directly
if (require.main === module) {
  createFullCorpusRecursive();
}

module.exports = { createFullCorpusRecursive };
