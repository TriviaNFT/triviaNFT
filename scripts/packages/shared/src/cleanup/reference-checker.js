"use strict";
/**
 * Reference checker for finding file references in codebase
 *
 * This module provides utilities for checking if files are referenced
 * in the codebase before performing operations like deletion or moving.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.findReferences = findReferences;
exports.isFileUsed = isFileUsed;
var child_process_1 = require("child_process");
var path = __importStar(require("path"));
var fs = __importStar(require("fs"));
/**
 * File extensions to search for references
 */
var SEARCHABLE_EXTENSIONS = [
    '.ts', '.tsx', '.js', '.jsx',
    '.json', '.html', '.md', '.css',
    '.yml', '.yaml', '.sh', '.ps1',
];
/**
 * Directories to exclude from reference search
 */
var EXCLUDED_DIRS = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.next',
    '.turbo',
    'layer',
    '.expo',
];
/**
 * Finds all references to a file in the codebase
 * @param filePath - The file path to search for (can be relative or absolute)
 * @param rootPath - The root directory to search from
 * @returns Array of file references
 */
function findReferences(filePath, rootPath) {
    var references = [];
    // Normalize the file path for searching
    var fileName = path.basename(filePath);
    var relativePath = path.relative(rootPath, filePath);
    // Build search patterns - search for filename and relative path
    var searchPatterns = [
        fileName,
        relativePath,
        relativePath.replace(/\\/g, '/'), // Unix-style path
    ];
    // Try to use ripgrep (rg) first, fall back to grep
    var hasRipgrep = checkCommandExists('rg');
    for (var _i = 0, searchPatterns_1 = searchPatterns; _i < searchPatterns_1.length; _i++) {
        var pattern = searchPatterns_1[_i];
        try {
            var results = hasRipgrep
                ? searchWithRipgrep(pattern, rootPath)
                : searchWithGrep(pattern, rootPath);
            references.push.apply(references, results);
        }
        catch (error) {
            // Continue with other patterns if one fails
            continue;
        }
    }
    // Remove duplicates based on filePath and lineNumber
    var uniqueRefs = Array.from(new Map(references.map(function (ref) { return ["".concat(ref.filePath, ":").concat(ref.lineNumber), ref]; })).values());
    return uniqueRefs;
}
/**
 * Checks if a file is referenced anywhere in the codebase
 * @param filePath - The file path to check
 * @param rootPath - The root directory to search from
 * @returns True if the file is referenced, false otherwise
 */
function isFileUsed(filePath, rootPath) {
    var references = findReferences(filePath, rootPath);
    // Filter out self-references (the file referencing itself)
    var targetFileName = path.basename(filePath);
    var externalReferences = references.filter(function (ref) {
        var refFileName = path.basename(ref.filePath);
        return refFileName !== targetFileName;
    });
    return externalReferences.length > 0;
}
/**
 * Checks if a command exists in the system
 */
function checkCommandExists(command) {
    try {
        var checkCmd = process.platform === 'win32'
            ? "where ".concat(command)
            : "which ".concat(command);
        (0, child_process_1.execSync)(checkCmd, { stdio: 'ignore' });
        return true;
    }
    catch (_a) {
        return false;
    }
}
/**
 * Searches for a pattern using ripgrep
 */
function searchWithRipgrep(pattern, rootPath) {
    var references = [];
    // Build ripgrep command with exclusions
    var excludeArgs = EXCLUDED_DIRS.map(function (dir) { return "--glob !".concat(dir); }).join(' ');
    // Escape special characters in pattern for regex
    var escapedPattern = escapeRegex(pattern);
    var command = "rg --line-number --no-heading --color never ".concat(excludeArgs, " \"").concat(escapedPattern, "\" \"").concat(rootPath, "\"");
    try {
        var output = (0, child_process_1.execSync)(command, {
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        });
        references.push.apply(references, parseSearchOutput(output, rootPath));
    }
    catch (error) {
        // Exit code 1 means no matches found, which is fine
        if (error.status !== 1) {
            throw error;
        }
    }
    return references;
}
/**
 * Searches for a pattern using grep (fallback)
 */
function searchWithGrep(pattern, rootPath) {
    var references = [];
    if (process.platform === 'win32') {
        // On Windows, we need to search each file type separately
        // because findstr doesn't support the same filtering as grep
        return searchWithWindowsFindstr(pattern, rootPath);
    }
    // Build grep command with exclusions
    var excludeArgs = EXCLUDED_DIRS.map(function (dir) { return "--exclude-dir=".concat(dir); }).join(' ');
    var includeArgs = SEARCHABLE_EXTENSIONS.map(function (ext) { return "--include=*".concat(ext); }).join(' ');
    // Escape special characters in pattern
    var escapedPattern = escapeRegex(pattern);
    var command = "grep -rn ".concat(excludeArgs, " ").concat(includeArgs, " \"").concat(escapedPattern, "\" \"").concat(rootPath, "\"");
    try {
        var output = (0, child_process_1.execSync)(command, {
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        });
        references.push.apply(references, parseSearchOutput(output, rootPath));
    }
    catch (error) {
        // Exit code 1 means no matches found, which is fine
        if (error.status !== 1) {
            throw error;
        }
    }
    return references;
}
/**
 * Searches for a pattern using Windows findstr
 * This is a simplified search that just checks if the pattern exists in files
 */
function searchWithWindowsFindstr(pattern, rootPath) {
    var references = [];
    // Recursively search files
    function searchDirectory(dir) {
        try {
            var entries = fs.readdirSync(dir, { withFileTypes: true });
            var _loop_1 = function (entry) {
                var fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    // Skip excluded directories
                    if (EXCLUDED_DIRS.includes(entry.name) || entry.name.startsWith('.')) {
                        return "continue";
                    }
                    searchDirectory(fullPath);
                }
                else if (entry.isFile()) {
                    // Check if file has searchable extension
                    var ext = path.extname(entry.name);
                    if (!SEARCHABLE_EXTENSIONS.includes(ext)) {
                        return "continue";
                    }
                    // Search file content
                    try {
                        var content = fs.readFileSync(fullPath, 'utf-8');
                        var lines = content.split('\n');
                        lines.forEach(function (line, index) {
                            if (line.includes(pattern)) {
                                references.push({
                                    filePath: path.relative(rootPath, fullPath),
                                    lineNumber: index + 1,
                                    content: line.trim(),
                                });
                            }
                        });
                    }
                    catch (error) {
                        return "continue";
                    }
                }
            };
            for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
                var entry = entries_1[_i];
                _loop_1(entry);
            }
        }
        catch (error) {
            // Skip directories we can't read
            return;
        }
    }
    searchDirectory(rootPath);
    return references;
}
/**
 * Parses search output into FileReference objects
 */
function parseSearchOutput(output, rootPath) {
    var references = [];
    var lines = output.split('\n').filter(function (line) { return line.trim(); });
    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
        var line = lines_1[_i];
        // Parse format: filepath:lineNumber:content
        var match = line.match(/^(.+?):(\d+):(.*)$/);
        if (match) {
            var filePath = match[1], lineNumber = match[2], content = match[3];
            references.push({
                filePath: path.relative(rootPath, filePath),
                lineNumber: parseInt(lineNumber, 10),
                content: content.trim(),
            });
        }
    }
    return references;
}
/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
