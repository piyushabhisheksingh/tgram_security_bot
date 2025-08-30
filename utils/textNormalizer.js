// Advanced text normalization and obfuscation detection utilities

// Character substitution mappings for leet speak and similar obfuscations
const CHAR_SUBSTITUTIONS = {
    // Numbers to letters
    '0': ['o', 'O'],
    '1': ['i', 'I', 'l', 'L', '|'],
    '3': ['e', 'E'],
    '4': ['a', 'A'],
    '5': ['s', 'S'],
    '6': ['g', 'G'],
    '7': ['t', 'T'],
    '8': ['b', 'B'],
    '9': ['g', 'G'],
    
    // Special characters to letters
    '@': ['a', 'A'],
    '€': ['e', 'E'],
    '$': ['s', 'S'],
    '!': ['i', 'I', 'l', 'L'],
    '|': ['i', 'I', 'l', 'L'],
    '()': ['o', 'O'],
    '[]': ['o', 'O'],
    '{}': ['o', 'O'],
    '<>': ['o', 'O'],
    
    // Cyrillic look-alikes
    'а': ['a'], 'А': ['A'], // Cyrillic a
    'е': ['e'], 'Е': ['E'], // Cyrillic e
    'о': ['o'], 'О': ['O'], // Cyrillic o
    'р': ['p'], 'Р': ['P'], // Cyrillic p
    'с': ['c'], 'С': ['C'], // Cyrillic c
    'у': ['y'], 'У': ['Y'], // Cyrillic y
    'х': ['x'], 'Х': ['X'], // Cyrillic x
    
    // Greek look-alikes
    'α': ['a'], 'Α': ['A'],
    'ε': ['e'], 'Ε': ['E'],
    'ο': ['o'], 'Ο': ['O'],
    'ρ': ['p'], 'Ρ': ['P'],
    'τ': ['t'], 'Τ': ['T'],
    'υ': ['y'], 'Υ': ['Y'],
    'χ': ['x'], 'Χ': ['X'],
    
    // Mathematical and other Unicode
    '∂': ['d'],
    '∆': ['A'],
    '∑': ['E'],
    '∏': ['N'],
    '∫': ['f'],
    'ℓ': ['l'],
    '∞': ['oo'],
    '†': ['t'],
    '‡': ['t'],
    '§': ['s'],
    '¶': ['p'],
    '∴': [':.'],
    '∵': ['.:'],
    
    // Accented characters
    'á': ['a'], 'à': ['a'], 'ä': ['a'], 'â': ['a'], 'ã': ['a'], 'å': ['a'],
    'Á': ['A'], 'À': ['A'], 'Ä': ['A'], 'Â': ['A'], 'Ã': ['A'], 'Å': ['A'],
    'é': ['e'], 'è': ['e'], 'ë': ['e'], 'ê': ['e'],
    'É': ['E'], 'È': ['E'], 'Ë': ['E'], 'Ê': ['E'],
    'í': ['i'], 'ì': ['i'], 'ï': ['i'], 'î': ['i'],
    'Í': ['I'], 'Ì': ['I'], 'Ï': ['I'], 'Î': ['I'],
    'ó': ['o'], 'ò': ['o'], 'ö': ['o'], 'ô': ['o'], 'õ': ['o'],
    'Ó': ['O'], 'Ò': ['O'], 'Ö': ['O'], 'Ô': ['O'], 'Õ': ['O'],
    'ú': ['u'], 'ù': ['u'], 'ü': ['u'], 'û': ['u'],
    'Ú': ['U'], 'Ù': ['U'], 'Ü': ['U'], 'Û': ['U'],
    'ý': ['y'], 'ÿ': ['y'],
    'Ý': ['Y'], 'Ÿ': ['Y'],
    'ñ': ['n'], 'Ñ': ['N'],
    'ç': ['c'], 'Ç': ['C']
};

// Common separator patterns used for obfuscation
const SEPARATOR_PATTERNS = [
    /[\s\-_\.]+/g,           // Spaces, hyphens, underscores, dots
    /[^\w\u0900-\u097F]+/g,  // Any non-word character (except Hindi)
    /[\u200B-\u200D\uFEFF]/g, // Zero-width characters
    /[^\p{L}\p{N}]+/gu,      // Non-letter, non-number characters
];

// Keyboard layout proximity for typo detection
const KEYBOARD_PROXIMITY = {
    'q': ['w', 'a', 's'],
    'w': ['q', 'e', 'a', 's', 'd'],
    'e': ['w', 'r', 's', 'd', 'f'],
    'r': ['e', 't', 'd', 'f', 'g'],
    't': ['r', 'y', 'f', 'g', 'h'],
    'y': ['t', 'u', 'g', 'h', 'j'],
    'u': ['y', 'i', 'h', 'j', 'k'],
    'i': ['u', 'o', 'j', 'k', 'l'],
    'o': ['i', 'p', 'k', 'l'],
    'p': ['o', 'l'],
    'a': ['q', 'w', 's', 'z', 'x'],
    's': ['q', 'w', 'e', 'a', 'd', 'z', 'x', 'c'],
    'd': ['w', 'e', 'r', 's', 'f', 'x', 'c', 'v'],
    'f': ['e', 'r', 't', 'd', 'g', 'c', 'v', 'b'],
    'g': ['r', 't', 'y', 'f', 'h', 'v', 'b', 'n'],
    'h': ['t', 'y', 'u', 'g', 'j', 'b', 'n', 'm'],
    'j': ['y', 'u', 'i', 'h', 'k', 'n', 'm'],
    'k': ['u', 'i', 'o', 'j', 'l', 'm'],
    'l': ['i', 'o', 'p', 'k'],
    'z': ['a', 's', 'x'],
    'x': ['a', 's', 'd', 'z', 'c'],
    'c': ['s', 'd', 'f', 'x', 'v'],
    'v': ['d', 'f', 'g', 'c', 'b'],
    'b': ['f', 'g', 'h', 'v', 'n'],
    'n': ['g', 'h', 'j', 'b', 'm'],
    'm': ['h', 'j', 'k', 'n']
};

/**
 * Normalizes text by removing obfuscation attempts and converting to standard form
 * @param {string} text - Input text to normalize
 * @returns {string} - Normalized text
 */
function normalizeText(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    let normalized = text;
    
    // Step 1: Unicode normalization (NFD - decompose then remove diacritics)
    normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Step 2: Remove zero-width characters and invisible unicode
    normalized = normalized.replace(/[\u200B-\u200D\uFEFF\u00AD\u2060]/g, '');
    
    // Step 3: Convert to lowercase for processing
    normalized = normalized.toLowerCase();
    
    // Step 4: Character substitution (leet speak, look-alikes)
    normalized = applyCharacterSubstitutions(normalized);
    
    // Step 5: Remove excessive whitespace and normalize spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
}

/**
 * Applies character substitutions to convert obfuscated characters
 * @param {string} text - Input text
 * @returns {string} - Text with substitutions applied
 */
function applyCharacterSubstitutions(text) {
    let result = text;
    
    // Apply character mappings
    for (const [obfuscated, replacements] of Object.entries(CHAR_SUBSTITUTIONS)) {
        if (replacements && replacements.length > 0) {
            // Use the first replacement as the primary substitution
            const replacement = replacements[0];
            result = result.replace(new RegExp(escapeRegex(obfuscated), 'gi'), replacement);
        }
    }
    
    return result;
}

/**
 * Generates multiple text variations to catch obfuscation attempts
 * @param {string} text - Input text
 * @returns {Array<string>} - Array of text variations
 */
function generateTextVariations(text) {
    const variations = new Set();
    
    // Original text
    variations.add(text);
    
    // Normalized version
    const normalized = normalizeText(text);
    variations.add(normalized);
    
    // Remove all separators
    for (const pattern of SEPARATOR_PATTERNS) {
        variations.add(text.replace(pattern, ''));
        variations.add(normalized.replace(pattern, ''));
    }
    
    // Spaced-out text variants (remove spaces between characters)
    const spacedOut = text.replace(/\s+/g, '');
    variations.add(spacedOut);
    variations.add(normalizeText(spacedOut));
    
    // Underscore/dash separated variants
    variations.add(text.replace(/[-_]/g, ''));
    variations.add(text.replace(/[-_]/g, ' '));
    
    // Handle reverse obfuscation
    variations.add(text.split('').reverse().join(''));
    
    // ROT13 variant (common obfuscation)
    variations.add(rot13(text));
    
    // Handle repeated characters (remove duplicates)
    variations.add(text.replace(/(.)\1+/g, '$1'));
    
    return Array.from(variations).filter(v => v.length > 0);
}

/**
 * Checks if text contains spaced-out obfuscation
 * @param {string} text - Input text
 * @returns {boolean} - True if spaced-out pattern detected
 */
function detectSpacedOutText(text) {
    // Look for patterns like "f u c k", "s h i t", etc.
    const spacedPattern = /\b[a-z]\s+[a-z]\s+[a-z]/i;
    const dotPattern = /\b[a-z]\.[a-z]\.[a-z]/i;
    const dashPattern = /\b[a-z]-[a-z]-[a-z]/i;
    const underscorePattern = /\b[a-z]_[a-z]_[a-z]/i;
    
    return spacedPattern.test(text) || 
           dotPattern.test(text) || 
           dashPattern.test(text) || 
           underscorePattern.test(text);
}

/**
 * Detects character substitution obfuscation
 * @param {string} text - Input text
 * @returns {object} - Detection results
 */
function detectCharacterSubstitution(text) {
    let substitutionCount = 0;
    const detectedSubstitutions = [];
    
    for (const [obfuscated, replacements] of Object.entries(CHAR_SUBSTITUTIONS)) {
        if (text.includes(obfuscated)) {
            substitutionCount++;
            detectedSubstitutions.push(obfuscated);
        }
    }
    
    return {
        hasSubstitutions: substitutionCount > 0,
        count: substitutionCount,
        substitutions: detectedSubstitutions,
        score: Math.min(substitutionCount / 3, 1) // Normalize to 0-1 scale
    };
}

/**
 * Calculates text similarity between two strings (for fuzzy matching)
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {number} - Similarity score (0-1)
 */
function calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

/**
 * Calculates Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Edit distance
 */
function getEditDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

/**
 * ROT13 encoding/decoding
 * @param {string} text - Input text
 * @returns {string} - ROT13 encoded/decoded text
 */
function rot13(text) {
    return text.replace(/[a-zA-Z]/g, function(char) {
        const start = char <= 'Z' ? 65 : 97;
        return String.fromCharCode(((char.charCodeAt(0) - start + 13) % 26) + start);
    });
}

/**
 * Escapes special regex characters
 * @param {string} string - Input string
 * @returns {string} - Escaped string
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detects keyboard typos (adjacent keys)
 * @param {string} word1 - First word
 * @param {string} word2 - Second word
 * @returns {boolean} - True if likely keyboard typo
 */
function isLikelyKeyboardTypo(word1, word2) {
    if (Math.abs(word1.length - word2.length) > 1) return false;
    
    let differences = 0;
    for (let i = 0; i < Math.min(word1.length, word2.length); i++) {
        const char1 = word1[i].toLowerCase();
        const char2 = word2[i].toLowerCase();
        
        if (char1 !== char2) {
            differences++;
            if (differences > 2) return false;
            
            // Check if characters are adjacent on keyboard
            const proximity = KEYBOARD_PROXIMITY[char1];
            if (!proximity || !proximity.includes(char2)) {
                return false;
            }
        }
    }
    
    return differences <= 2;
}

/**
 * Enhanced text matching that considers obfuscation
 * @param {string} text - Text to check
 * @param {Array<object>} wordlist - Wordlist with {word, severity} objects
 * @returns {Array<object>} - Matches found with confidence scores
 */
function enhancedWordlistMatch(text, wordlist) {
    const matches = [];
    const textVariations = generateTextVariations(text);
    
    for (const wordItem of wordlist) {
        const targetWord = wordItem.word.toLowerCase();
        const targetVariations = generateTextVariations(targetWord);
        
        let bestMatch = {
            confidence: 0,
            variation: '',
            method: 'none'
        };
        
        // Direct matches
        for (const textVar of textVariations) {
            for (const targetVar of targetVariations) {
                if (textVar.includes(targetVar)) {
                    bestMatch = {
                        confidence: 1.0,
                        variation: textVar,
                        method: 'direct'
                    };
                    break;
                }
            }
            if (bestMatch.confidence === 1.0) break;
        }
        
        // Fuzzy matches
        if (bestMatch.confidence < 1.0) {
            for (const textVar of textVariations) {
                for (const targetVar of targetVariations) {
                    const similarity = calculateTextSimilarity(textVar, targetVar);
                    if (similarity > 0.7 && similarity > bestMatch.confidence) {
                        bestMatch = {
                            confidence: similarity,
                            variation: textVar,
                            method: 'fuzzy'
                        };
                    }
                }
            }
        }
        
        // Keyboard typo matches
        if (bestMatch.confidence < 0.8) {
            for (const textVar of textVariations) {
                const words = textVar.split(/\s+/);
                for (const word of words) {
                    if (isLikelyKeyboardTypo(word, targetWord)) {
                        bestMatch = {
                            confidence: 0.85,
                            variation: word,
                            method: 'typo'
                        };
                        break;
                    }
                }
                if (bestMatch.method === 'typo') break;
            }
        }
        
        // If we found a good match, add it to results
        if (bestMatch.confidence > 0.7) {
            matches.push({
                word: wordItem.word,
                severity: wordItem.severity,
                confidence: bestMatch.confidence,
                matchedVariation: bestMatch.variation,
                detectionMethod: bestMatch.method,
                originalText: text
            });
        }
    }
    
    return matches;
}

module.exports = {
    normalizeText,
    generateTextVariations,
    detectSpacedOutText,
    detectCharacterSubstitution,
    calculateTextSimilarity,
    enhancedWordlistMatch,
    applyCharacterSubstitutions,
    isLikelyKeyboardTypo,
    rot13,
    CHAR_SUBSTITUTIONS,
    SEPARATOR_PATTERNS
};