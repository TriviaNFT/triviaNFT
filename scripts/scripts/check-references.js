"use strict";
/**
 * Check for broken references after cleanup
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
var reference_checker_1 = require("../packages/shared/src/cleanup/reference-checker");
var path = __importStar(require("path"));
var ROOT_PATH = path.resolve(__dirname, '..');
// Files that were deleted or moved during cleanup
var DELETED_FILES = [
    'docs',
    'Untitled design.png',
    'apps/web/test-polyfills.html',
];
var MOVED_FILES = [
    { old: 'apps/web/test-navigation.html', new: 'apps/web/e2e/fixtures/test-navigation.html' },
];
console.log('Checking for broken references...\n');
var foundIssues = false;
// Check deleted files
for (var _i = 0, DELETED_FILES_1 = DELETED_FILES; _i < DELETED_FILES_1.length; _i++) {
    var file = DELETED_FILES_1[_i];
    var refs = (0, reference_checker_1.findReferences)(file, ROOT_PATH);
    // Filter out false positives
    var actualRefs = refs.filter(function (ref) {
        // Exclude spec files (they document the cleanup)
        if (ref.filePath.includes('.kiro/specs/'))
            return false;
        // Exclude this script and verification scripts
        if (ref.filePath.includes('scripts/'))
            return false;
        // Exclude cleanup report
        if (ref.filePath.includes('CLEANUP_REPORT') || ref.filePath.includes('VERIFICATION_REPORT'))
            return false;
        // Exclude references that are just UI text or comments
        var content = ref.content.toLowerCase();
        if (content.includes('view docs') || content.includes('documentation')) {
            // Check if it's actually a path reference
            if (!content.includes('/docs') && !content.includes('docs/')) {
                return false;
            }
        }
        // Exclude external URLs
        if (content.includes('http://') || content.includes('https://'))
            return false;
        return true;
    });
    if (actualRefs.length > 0) {
        console.log("\u274C Found ".concat(actualRefs.length, " reference(s) to deleted file: ").concat(file));
        actualRefs.forEach(function (ref) {
            console.log("   ".concat(ref.filePath, ":").concat(ref.lineNumber, ": ").concat(ref.content));
        });
        foundIssues = true;
    }
    else {
        console.log("\u2705 No broken references to: ".concat(file));
    }
}
// Check moved files (old paths should not be referenced)
for (var _a = 0, MOVED_FILES_1 = MOVED_FILES; _a < MOVED_FILES_1.length; _a++) {
    var oldPath = MOVED_FILES_1[_a].old;
    var refs = (0, reference_checker_1.findReferences)(oldPath, ROOT_PATH);
    // Filter out false positives
    var actualRefs = refs.filter(function (ref) {
        if (ref.filePath.includes('.kiro/specs/'))
            return false;
        if (ref.filePath.includes('scripts/'))
            return false;
        if (ref.filePath.includes('CLEANUP_REPORT') || ref.filePath.includes('VERIFICATION_REPORT'))
            return false;
        return true;
    });
    if (actualRefs.length > 0) {
        console.log("\u274C Found ".concat(actualRefs.length, " reference(s) to old path: ").concat(oldPath));
        actualRefs.forEach(function (ref) {
            console.log("   ".concat(ref.filePath, ":").concat(ref.lineNumber, ": ").concat(ref.content));
        });
        foundIssues = true;
    }
    else {
        console.log("\u2705 No references to old path: ".concat(oldPath));
    }
}
if (!foundIssues) {
    console.log('\n✅ No broken references found!');
    process.exit(0);
}
else {
    console.log('\n❌ Broken references detected!');
    process.exit(1);
}
