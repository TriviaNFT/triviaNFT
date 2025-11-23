/**
 * GitIgnore Manager
 * 
 * Manages .gitignore file operations including pattern checking,
 * adding patterns, and validation.
 */

import * as fs from 'fs';

export interface GitIgnoreSection {
  name: string;
  patterns: string[];
  comments: string[];
}

export interface GitIgnoreManager {
  checkPattern(pattern: string): boolean;
  addPattern(pattern: string, section: string): void;
  validateIgnorePatterns(requiredPatterns: string[]): boolean;
  getContent(): string;
}

/**
 * Parse .gitignore content into sections
 */
export function parseGitIgnore(content: string): Map<string, GitIgnoreSection> {
  const sections: Map<string, GitIgnoreSection> = new Map();
  const lines = content.split('\n');
  let currentSection: GitIgnoreSection | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if this is a section header (comment starting with #)
    if (trimmed.startsWith('#') && !trimmed.startsWith('##')) {
      const sectionName = trimmed.substring(1).trim();
      currentSection = {
        name: sectionName,
        patterns: [],
        comments: [line],
      };
      sections.set(sectionName, currentSection);
    } else if (currentSection) {
      // Add pattern or comment to current section
      if (trimmed.startsWith('#')) {
        currentSection.comments.push(line);
      } else if (trimmed.length > 0) {
        currentSection.patterns.push(trimmed);
      }
    }
  }

  return sections;
}

/**
 * Rebuild .gitignore content from sections
 */
export function rebuildGitIgnore(sections: Map<string, GitIgnoreSection>): string {
  const lines: string[] = [];
  
  for (const section of sections.values()) {
    // Add section header and comments
    lines.push(...section.comments);
    
    // Add patterns
    for (const pattern of section.patterns) {
      lines.push(pattern);
    }
    
    // Add blank line after section
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Check if a pattern exists in the sections
 */
export function checkPattern(sections: Map<string, GitIgnoreSection>, pattern: string): boolean {
  const normalizedPattern = pattern.trim();
  
  for (const section of sections.values()) {
    if (section.patterns.includes(normalizedPattern)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Add a pattern to a specific section
 */
export function addPattern(
  sections: Map<string, GitIgnoreSection>,
  pattern: string,
  sectionName: string
): Map<string, GitIgnoreSection> {
  const normalizedPattern = pattern.trim();
  
  // Don't add if pattern already exists
  if (checkPattern(sections, normalizedPattern)) {
    return sections;
  }

  // Find or create the section
  let section = sections.get(sectionName);
  
  if (!section) {
    // Create new section
    section = {
      name: sectionName,
      patterns: [],
      comments: [`# ${sectionName}`],
    };
    sections.set(sectionName, section);
  }

  // Add the pattern
  section.patterns.push(normalizedPattern);

  return sections;
}

/**
 * Validate that all required patterns are present
 */
export function validateIgnorePatterns(
  sections: Map<string, GitIgnoreSection>,
  requiredPatterns: string[]
): boolean {
  for (const pattern of requiredPatterns) {
    if (!checkPattern(sections, pattern)) {
      return false;
    }
  }
  return true;
}

/**
 * Creates a GitIgnore manager for a specific .gitignore file
 */
export function createGitIgnoreManager(gitignorePath: string): GitIgnoreManager {
  let content = '';
  let sections: Map<string, GitIgnoreSection> = new Map();

  // Load and parse the .gitignore file
  function load(): void {
    if (fs.existsSync(gitignorePath)) {
      content = fs.readFileSync(gitignorePath, 'utf-8');
      sections = parseGitIgnore(content);
    }
  }

  // Save the content back to file
  function save(): void {
    fs.writeFileSync(gitignorePath, content, 'utf-8');
  }

  // Initialize by loading the file
  load();

  return {
    /**
     * Check if a pattern exists in the .gitignore file
     */
    checkPattern(pattern: string): boolean {
      return checkPattern(sections, pattern);
    },

    /**
     * Add a pattern to a specific section
     */
    addPattern(pattern: string, sectionName: string): void {
      sections = addPattern(sections, pattern, sectionName);
      content = rebuildGitIgnore(sections);
      save();
    },

    /**
     * Validate that all required patterns are present
     */
    validateIgnorePatterns(requiredPatterns: string[]): boolean {
      return validateIgnorePatterns(sections, requiredPatterns);
    },

    /**
     * Get the current content of the .gitignore file
     */
    getContent(): string {
      return content;
    },
  };
}
