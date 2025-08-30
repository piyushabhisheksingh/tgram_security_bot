const wordlists = require('../data/wordlists');
const textNormalizer = require('./textNormalizer');

// Advanced behavioral analysis cache
const userBehaviorCache = new Map();
const messageHistory = new Map();

function detectAbusiveContent(text, moderationLevel) {
    if (!text || moderationLevel === 'no') {
        return { isAbusive: false, reasons: [], severity: 'none', obfuscationDetected: false };
    }
    
    const reasons = [];
    let maxSeverity = 'none';
    let obfuscationDetected = false;
    
    // Check against wordlists based on moderation level
    const levelThreshold = {
        'weak': 1,
        'moderate': 2,
        'strong': 3,
        'strict': 4
    }[moderationLevel] || 2;
    
    // Enhanced detection with text normalization
    const languageWordlists = [
        { name: 'english', wordlist: wordlists.english.profanity },
        { name: 'hindi', wordlist: wordlists.hindi.profanity },
        { name: 'hinglish', wordlist: wordlists.hinglish.profanity }
    ];
    
    // Check each language wordlist with enhanced matching
    for (const { name, wordlist } of languageWordlists) {
        const matches = textNormalizer.enhancedWordlistMatch(text, wordlist);
        
        for (const match of matches) {
            if (match.severity >= levelThreshold && match.confidence > 0.7) {
                const confidenceText = match.confidence < 1.0 ? ` (${Math.round(match.confidence * 100)}% confidence)` : '';
                reasons.push(`${name} profanity (${match.word}) via ${match.detectionMethod}${confidenceText}`);
                maxSeverity = getMaxSeverity(maxSeverity, getSeverityLevel(match.severity));
                
                // Mark obfuscation if not direct match
                if (match.detectionMethod !== 'direct') {
                    obfuscationDetected = true;
                }
            }
        }
    }
    
    // Check hate speech patterns with normalization
    const textVariations = textNormalizer.generateTextVariations(text);
    for (const variation of textVariations) {
        for (const pattern of wordlists.patterns.hateSpeech) {
            const regex = new RegExp(pattern.pattern, 'i');
            if (regex.test(variation)) {
                if (pattern.severity >= levelThreshold) {
                    reasons.push(`Hate speech pattern detected`);
                    maxSeverity = getMaxSeverity(maxSeverity, getSeverityLevel(pattern.severity));
                    if (variation !== text) {
                        obfuscationDetected = true;
                    }
                }
            }
        }
    }
    
    // Check harassment patterns with normalization
    for (const variation of textVariations) {
        for (const pattern of wordlists.patterns.harassment) {
            const regex = new RegExp(pattern.pattern, 'i');
            if (regex.test(variation)) {
                if (pattern.severity >= levelThreshold) {
                    reasons.push(`Harassment pattern detected`);
                    maxSeverity = getMaxSeverity(maxSeverity, getSeverityLevel(pattern.severity));
                    if (variation !== text) {
                        obfuscationDetected = true;
                    }
                }
            }
        }
    }
    
    return {
        isAbusive: reasons.length > 0,
        reasons,
        severity: maxSeverity,
        obfuscationDetected
    };
}

function detectLinks(text) {
    if (!text) {
        return { hasLinks: false, webLinks: [], telegramLinks: [] };
    }
    
    const webLinks = [];
    const telegramLinks = [];
    
    // Web link patterns
    const webLinkPatterns = [
        /https?:\/\/[^\s]+/gi,
        /www\.[^\s]+/gi,
        /[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}/gi
    ];
    
    // Telegram link patterns
    const telegramPatterns = [
        /t\.me\/[^\s]+/gi,
        /telegram\.me\/[^\s]+/gi,
        /tg:\/\/[^\s]+/gi,
        /@[a-zA-Z0-9_]{5,}/gi // Username mentions that could be channels
    ];
    
    // Find web links
    for (const pattern of webLinkPatterns) {
        const matches = text.match(pattern);
        if (matches) {
            webLinks.push(...matches);
        }
    }
    
    // Find Telegram links
    for (const pattern of telegramPatterns) {
        const matches = text.match(pattern);
        if (matches) {
            telegramLinks.push(...matches);
        }
    }
    
    return {
        hasLinks: webLinks.length > 0 || telegramLinks.length > 0,
        webLinks: [...new Set(webLinks)], // Remove duplicates
        telegramLinks: [...new Set(telegramLinks)] // Remove duplicates
    };
}

function getSeverityLevel(numericSeverity) {
    if (numericSeverity >= 4) return 'critical';
    if (numericSeverity >= 3) return 'high';
    if (numericSeverity >= 2) return 'medium';
    if (numericSeverity >= 1) return 'low';
    return 'none';
}

function getMaxSeverity(current, new_ = 'none') {
    const severityOrder = ['none', 'low', 'medium', 'high', 'critical'];
    const currentIndex = severityOrder.indexOf(current);
    const newIndex = severityOrder.indexOf(new_);
    return severityOrder[Math.max(currentIndex, newIndex)];
}

// Behavioral Pattern Analysis
function analyzeUserBehavior(userId, chatId, message) {
    const key = `${userId}:${chatId}`;
    const now = Date.now();
    
    if (!userBehaviorCache.has(key)) {
        userBehaviorCache.set(key, {
            messages: [],
            violations: [],
            patterns: {
                spamScore: 0,
                aggressionLevel: 0,
                repetitiveBehavior: 0,
                escalationTrend: 0
            },
            riskScore: 0,
            lastAnalysis: now
        });
    }
    
    const userBehavior = userBehaviorCache.get(key);
    
    // Add current message to history
    userBehavior.messages.push({
        text: message,
        timestamp: now,
        length: message.length,
        toxicity: analyzeContentToxicity(message)
    });
    
    // Keep only last 20 messages for analysis
    if (userBehavior.messages.length > 20) {
        userBehavior.messages.shift();
    }
    
    // Analyze patterns
    updateBehaviorPatterns(userBehavior);
    
    return userBehavior;
}

function updateBehaviorPatterns(userBehavior) {
    const messages = userBehavior.messages;
    const recentMessages = messages.filter(m => Date.now() - m.timestamp < 300000); // Last 5 minutes
    
    // Calculate spam score based on message frequency
    const messageFreq = recentMessages.length / 5; // messages per minute
    userBehavior.patterns.spamScore = Math.min(messageFreq / 2, 5); // Max 5
    
    // Analyze message similarity for repetitive behavior
    let similarityCount = 0;
    for (let i = 0; i < messages.length - 1; i++) {
        for (let j = i + 1; j < messages.length; j++) {
            const similarity = calculateMessageSimilarity(messages[i].text, messages[j].text);
            if (similarity > 0.7) similarityCount++;
        }
    }
    userBehavior.patterns.repetitiveBehavior = Math.min(similarityCount / 3, 5);
    
    // Analyze toxicity trend
    const toxicityTrend = messages.slice(-5).reduce((sum, msg) => sum + msg.toxicity.score, 0) / 5;
    userBehavior.patterns.aggressionLevel = toxicityTrend;
    
    // Calculate escalation trend
    if (messages.length >= 3) {
        const recent = messages.slice(-3).map(m => m.toxicity.score);
        const isEscalating = recent[2] > recent[1] && recent[1] > recent[0];
        userBehavior.patterns.escalationTrend = isEscalating ? 3 : Math.max(0, userBehavior.patterns.escalationTrend - 0.5);
    }
    
    // Update overall risk score
    userBehavior.riskScore = (
        userBehavior.patterns.spamScore +
        userBehavior.patterns.aggressionLevel +
        userBehavior.patterns.repetitiveBehavior +
        userBehavior.patterns.escalationTrend
    ) / 4;
}

function calculateMessageSimilarity(text1, text2) {
    // Simple similarity algorithm based on word overlap
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
}

// Comprehensive obfuscation detection
function detectObfuscationAttempts(text) {
    const techniques = [];
    let obfuscationScore = 0;
    
    // Detect spaced-out text
    if (textNormalizer.detectSpacedOutText(text)) {
        techniques.push('spaced_out');
        obfuscationScore += 0.3;
    }
    
    // Detect character substitutions
    const substitutionAnalysis = textNormalizer.detectCharacterSubstitution(text);
    if (substitutionAnalysis.hasSubstitutions) {
        techniques.push('character_substitution');
        obfuscationScore += substitutionAnalysis.score * 0.4;
    }
    
    // Detect excessive use of separators
    const separatorCount = (text.match(/[\-_.]{2,}/g) || []).length;
    if (separatorCount > 0) {
        techniques.push('separator_abuse');
        obfuscationScore += Math.min(separatorCount * 0.1, 0.3);
    }
    
    // Detect mixed scripts (potential look-alike abuse)
    const scripts = {
        latin: /[a-zA-Z]/.test(text),
        cyrillic: /[\u0400-\u04FF]/.test(text),
        greek: /[\u0370-\u03FF]/.test(text),
        mathematical: /[\u2100-\u214F\u2190-\u21FF\u2200-\u22FF]/.test(text)
    };
    
    const scriptCount = Object.values(scripts).filter(Boolean).length;
    if (scriptCount > 1) {
        techniques.push('mixed_scripts');
        obfuscationScore += (scriptCount - 1) * 0.2;
    }
    
    // Detect zero-width characters
    if (/[\u200B-\u200D\uFEFF]/.test(text)) {
        techniques.push('zero_width_chars');
        obfuscationScore += 0.4;
    }
    
    // Detect excessive repetition (aaaa, ...., !!!!)
    const repetitionPattern = /(.)\1{3,}/g;
    const repetitions = text.match(repetitionPattern);
    if (repetitions && repetitions.length > 0) {
        techniques.push('character_repetition');
        obfuscationScore += Math.min(repetitions.length * 0.1, 0.3);
    }
    
    // Detect reverse text patterns
    const words = text.toLowerCase().split(/\s+/);
    let reverseCount = 0;
    for (const word of words) {
        if (word.length > 3) {
            const reversed = word.split('').reverse().join('');
            // Check if reversed word might be an attempt to hide profanity
            if (/^[a-z]+$/.test(reversed) && reversed.length > 3) {
                reverseCount++;
            }
        }
    }
    if (reverseCount > 0) {
        techniques.push('reverse_text');
        obfuscationScore += Math.min(reverseCount * 0.2, 0.4);
    }
    
    // Detect unusual character density
    const totalChars = text.length;
    const specialChars = (text.match(/[^\w\s\u0900-\u097F]/g) || []).length;
    const specialCharRatio = specialChars / totalChars;
    
    if (specialCharRatio > 0.3 && totalChars > 5) {
        techniques.push('excessive_special_chars');
        obfuscationScore += Math.min(specialCharRatio - 0.3, 0.3);
    }
    
    // Detect ROT13 or similar simple ciphers
    const normalized = textNormalizer.normalizeText(text);
    const rot13Text = textNormalizer.rot13(normalized);
    
    // Check if ROT13 version contains more recognizable patterns
    const originalWordCount = normalized.split(/\s+/).filter(w => w.length > 2).length;
    const rot13WordCount = rot13Text.split(/\s+/).filter(w => w.length > 2).length;
    
    if (rot13WordCount > originalWordCount * 1.5) {
        techniques.push('simple_cipher');
        obfuscationScore += 0.3;
    }
    
    // Normalize score to 0-1 range
    obfuscationScore = Math.min(obfuscationScore, 1.0);
    
    return {
        hasObfuscation: techniques.length > 0,
        techniques,
        score: obfuscationScore,
        severity: obfuscationScore > 0.7 ? 'high' : obfuscationScore > 0.4 ? 'medium' : 'low',
        normalizedText: textNormalizer.normalizeText(text),
        variations: textNormalizer.generateTextVariations(text)
    };
}

// Advanced spam detection
function detectAdvancedSpam(text, userBehavior) {
    const spamIndicators = {
        repeatedChars: /(..)\1{4,}/.test(text), // Repeated character pairs
        unicodeSpam: /[\ud800-\udfff]{4,}/.test(text), // Excessive emojis
        numberSpam: /\d{10,}/.test(text), // Long number sequences
        urlShorteners: /(bit\.ly|tinyurl|t\.co|short\.link)/i.test(text),
        suspiciousPatterns: /^[A-Z\s!]{20,}$/.test(text), // All caps with spaces
        zalgoText: /[\u0300-\u036F]{3,}/.test(text), // Combining diacritical marks
        repetitiveWords: /(\b\w+\s*)\1{3,}/i.test(text)
    };
    
    let spamScore = 0;
    const reasons = [];
    
    Object.entries(spamIndicators).forEach(([key, detected]) => {
        if (detected) {
            spamScore += 1;
            reasons.push(key);
        }
    });
    
    // Factor in user behavior
    if (userBehavior && userBehavior.patterns.repetitiveBehavior > 2) {
        spamScore += 2;
        reasons.push('repetitive_behavior');
    }
    
    if (userBehavior && userBehavior.patterns.spamScore > 3) {
        spamScore += 1;
        reasons.push('high_frequency_messaging');
    }
    
    return {
        isSpam: spamScore >= 2,
        score: spamScore,
        reasons,
        severity: spamScore >= 4 ? 'high' : spamScore >= 2 ? 'medium' : 'low'
    };
}

// Enhanced toxicity analysis
function analyzeContentToxicity(text) {
    const indicators = {
        capsLockRatio: (text.match(/[A-Z]/g) || []).length / text.length,
        exclamationMarks: (text.match(/!/g) || []).length,
        repeatedCharacters: /(.)\1{3,}/.test(text),
        multipleSpaces: /\s{3,}/.test(text),
        specialCharSpam: (text.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/g) || []).length / text.length,
        aggressiveWords: /(kill|die|hate|destroy|annihilate)/i.test(text),
        threatLanguage: /(threat|warning|consequence|punishment)/i.test(text),
        derogatory: /(loser|trash|garbage|waste)/i.test(text)
    };
    
    let toxicityScore = 0;
    const reasons = [];
    
    if (indicators.capsLockRatio > 0.5) {
        toxicityScore += 1.5;
        reasons.push('excessive_caps');
    }
    if (indicators.exclamationMarks > 3) {
        toxicityScore += 1;
        reasons.push('excessive_exclamation');
    }
    if (indicators.repeatedCharacters) {
        toxicityScore += 1;
        reasons.push('repeated_characters');
    }
    if (indicators.specialCharSpam > 0.3) {
        toxicityScore += 1.5;
        reasons.push('special_char_spam');
    }
    if (indicators.aggressiveWords) {
        toxicityScore += 2;
        reasons.push('aggressive_language');
    }
    if (indicators.threatLanguage) {
        toxicityScore += 1.5;
        reasons.push('threatening_tone');
    }
    if (indicators.derogatory) {
        toxicityScore += 1;
        reasons.push('derogatory_language');
    }
    
    return {
        score: Math.round(toxicityScore * 10) / 10,
        indicators,
        reasons,
        level: toxicityScore >= 4 ? 'high' : toxicityScore >= 2 ? 'medium' : 'low',
        isSuspicious: toxicityScore >= 2
    };
}

// Language detection for mixed content
function detectLanguageMix(text) {
    const patterns = {
        english: /[a-zA-Z]/g,
        hindi: /[\u0900-\u097F]/g,
        arabic: /[\u0600-\u06FF]/g,
        cyrillic: /[\u0400-\u04FF]/g,
        chinese: /[\u4e00-\u9fff]/g
    };
    
    const detected = {};
    let totalChars = text.replace(/\s/g, '').length;
    
    Object.entries(patterns).forEach(([lang, pattern]) => {
        const matches = text.match(pattern) || [];
        if (matches.length > 0) {
            detected[lang] = (matches.length / totalChars) * 100;
        }
    });
    
    return {
        languages: detected,
        isMixed: Object.keys(detected).length > 1,
        primary: Object.entries(detected).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown'
    };
}

// Enhanced abuse detection with behavioral analysis and obfuscation detection
function detectAbusiveContentAdvanced(text, moderationLevel, userId, chatId) {
    // Run enhanced detection with normalization
    const basicDetection = detectAbusiveContent(text, moderationLevel);
    
    // Analyze user behavior
    const userBehavior = analyzeUserBehavior(userId, chatId, text);
    
    // Enhanced toxicity analysis
    const toxicity = analyzeContentToxicity(text);
    
    // Advanced spam detection
    const spamAnalysis = detectAdvancedSpam(text, userBehavior);
    
    // Language analysis
    const languageAnalysis = detectLanguageMix(text);
    
    // Advanced obfuscation detection
    const obfuscationAnalysis = detectObfuscationAttempts(text);
    
    // Combine all analyses
    let enhancedSeverity = basicDetection.severity;
    let additionalReasons = [...basicDetection.reasons];
    
    // Escalate based on user behavior
    if (userBehavior.riskScore > 3) {
        enhancedSeverity = getMaxSeverity(enhancedSeverity, 'medium');
        additionalReasons.push('high_risk_user_behavior');
    }
    
    if (userBehavior.patterns.escalationTrend > 2) {
        enhancedSeverity = getMaxSeverity(enhancedSeverity, 'high');
        additionalReasons.push('escalating_behavior');
    }
    
    // Add spam detection
    if (spamAnalysis.isSpam) {
        additionalReasons.push(...spamAnalysis.reasons.map(r => `spam_${r}`));
        if (spamAnalysis.severity === 'high') {
            enhancedSeverity = getMaxSeverity(enhancedSeverity, 'medium');
        }
    }
    
    // Add toxicity analysis
    if (toxicity.level === 'high') {
        enhancedSeverity = getMaxSeverity(enhancedSeverity, 'high');
        additionalReasons.push(...toxicity.reasons.map(r => `toxicity_${r}`));
    }
    
    // Add obfuscation detection
    if (obfuscationAnalysis.hasObfuscation) {
        additionalReasons.push(...obfuscationAnalysis.techniques.map(t => `obfuscation_${t}`));
        // Escalate severity for intentional obfuscation attempts
        if (obfuscationAnalysis.score > 0.6) {
            enhancedSeverity = getMaxSeverity(enhancedSeverity, 'medium');
        }
    }
    
    // Calculate combined risk score with obfuscation factor
    const obfuscationBonus = obfuscationAnalysis.hasObfuscation ? obfuscationAnalysis.score * 2 : 0;
    const combinedRiskScore = userBehavior.riskScore + obfuscationBonus;
    
    return {
        ...basicDetection,
        isAbusive: basicDetection.isAbusive || spamAnalysis.isSpam || toxicity.level === 'high' || combinedRiskScore > 4,
        reasons: [...new Set(additionalReasons)], // Remove duplicates
        severity: enhancedSeverity,
        userBehavior,
        toxicity,
        spamAnalysis,
        languageAnalysis,
        obfuscationAnalysis,
        riskScore: combinedRiskScore,
        obfuscationDetected: basicDetection.obfuscationDetected || obfuscationAnalysis.hasObfuscation
    };
}

// Escalation system
function calculateEscalationLevel(violations, currentSeverity) {
    const recentViolations = violations.filter(v => Date.now() - v.timestamp < 86400000); // Last 24 hours
    const violationCount = recentViolations.length;
    
    let escalationMultiplier = 1;
    
    if (violationCount >= 10) escalationMultiplier = 3;
    else if (violationCount >= 5) escalationMultiplier = 2;
    else if (violationCount >= 3) escalationMultiplier = 1.5;
    
    const severityMap = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
    const currentLevel = severityMap[currentSeverity] || 1;
    const escalatedLevel = Math.min(4, Math.floor(currentLevel * escalationMultiplier));
    
    const reverseMap = { 1: 'low', 2: 'medium', 3: 'high', 4: 'critical' };
    
    return {
        escalatedSeverity: reverseMap[escalatedLevel],
        escalationMultiplier,
        recentViolationCount: violationCount,
        shouldEscalate: escalationMultiplier > 1
    };
}


module.exports = {
    detectAbusiveContent,
    detectAbusiveContentAdvanced,
    detectLinks,
    analyzeContentToxicity,
    analyzeUserBehavior,
    detectAdvancedSpam,
    detectLanguageMix,
    detectObfuscationAttempts,
    calculateEscalationLevel,
    calculateMessageSimilarity,
    getSeverityLevel,
    getMaxSeverity
};
