// Comprehensive wordlists for content moderation
// Severity levels: 1 = mild, 2 = moderate, 3 = strong, 4 = severe

const wordlists = {
    english: {
        profanity: [
            // All words downgraded to severity 1 except sexual/explicit
            { word: "damn", severity: 1 },
            { word: "hell", severity: 1 },
            { word: "crap", severity: 1 },
            { word: "bloody", severity: 1 },
            { word: "sucks", severity: 1 },
            
            { word: "shit", severity: 1 },
            { word: "piss", severity: 1 },
            { word: "bitch", severity: 1 },
            { word: "bastard", severity: 1 },
            { word: "ass", severity: 1 },
            { word: "asshole", severity: 1 },
            { word: "bullshit", severity: 1 },
            { word: "dickhead", severity: 1 },
            { word: "moron", severity: 1 },
            { word: "idiot", severity: 1 },
            { word: "stupid", severity: 1 },
            { word: "dumb", severity: 1 },
            
            // Strong profanity (sexual/explicit) kept original severity
            { word: "fuck", severity: 3 },
            { word: "fucking", severity: 3 },
            { word: "fucker", severity: 3 },
            { word: "motherfucker", severity: 3 },
            { word: "cocksucker", severity: 3 },
            { word: "whore", severity: 3 },
            { word: "slut", severity: 3 },
            { word: "pussy", severity: 3 },
            { word: "dick", severity: 3 },
            { word: "cock", severity: 3 },
            { word: "penis", severity: 3 },
            { word: "vagina", severity: 3 },
            
            // Severe/hate speech downgraded to 1
            { word: "nigger", severity: 1 },
            { word: "faggot", severity: 1 },
            { word: "retard", severity: 1 },
            { word: "nazi", severity: 1 },
            { word: "terrorist", severity: 1 },
            { word: "kill yourself", severity: 1 },
            { word: "kys", severity: 1 },
            { word: "suicide", severity: 1 }
        ]
    },
    
    hindi: {
        profanity: [
            // All downgraded to severity 1 except sexual/explicit
            { word: "बेवकूफ", severity: 1 },
            { word: "मूर्ख", severity: 1 },
            { word: "गधा", severity: 1 },
            { word: "बकवास", severity: 1 },
            
            { word: "हरामी", severity: 1 },
            { word: "कुत्ता", severity: 1 },
            { word: "सुअर", severity: 1 },
            { word: "कमीना", severity: 1 },
            { word: "गंदा", severity: 1 },
            { word: "भेंचोद", severity: 1 },
            { word: "रंडी", severity: 3 },
            
            // Strong sexual/explicit kept original severity
            { word: "मादरचोद", severity: 3 },
            { word: "भोसड़ी", severity: 3 },
            { word: "गांडू", severity: 3 },
            { word: "लंड", severity: 3 },
            { word: "चूत", severity: 3 },
            { word: "रंडी", severity: 3 },
            { word: "भोसड़ा", severity: 3 },
            
            // Severe threats downgraded to 1
            { word: "मार डालूंगा", severity: 1 },
            { word: "आतंकवादी", severity: 1 },
            { word: "मर जा", severity: 1 }
        ]
    },
    
    hinglish: {
        profanity: [
            { word: "bakwas", severity: 1 },
            { word: "bewakoof", severity: 1 },
            { word: "gadha", severity: 1 },
            { word: "stupid", severity: 1 },
            
            { word: "harami", severity: 1 },
            { word: "kutta", severity: 1 },
            { word: "suar", severity: 1 },
            { word: "kamina", severity: 1 },
            { word: "ganda", severity: 1 },
            { word: "bhenchod", severity: 3 },
            { word: "bc", severity: 3 },
            { word: "randi", severity: 3 },
            { word: "saala", severity: 1 },
            { word: "ullu", severity: 1 },
            
            // Strong sexual/explicit
            { word: "madarchod", severity: 3 },
            { word: "mc", severity: 3 },
            { word: "bhosadi", severity: 3 },
            { word: "gandu", severity: 3 },
            { word: "land", severity: 3 },
            { word: "lund", severity: 3 },
            { word: "chut", severity: 3 },
            { word: "bhosdike", severity: 3 },
            { word: "chutiya", severity: 3 },
            { word: "rand", severity: 3 },
            { word: "bhen ke laude", severity: 3 },
            { word: "bkl", severity: 3 },
            { word: "mc bc", severity: 3 },
            
            // Severe threats downgraded to 1
            { word: "mar dalunga", severity: 1 },
            { word: "maar dalunga", severity: 1 },
            { word: "terrorist", severity: 1 },
            { word: "atankwadi", severity: 1 },
            { word: "mar ja", severity: 1 },
            { word: "suicide kar", severity: 1 }
        ]
    },
    
    patterns: {
        hateSpeech: [
            // All patterns downgraded to 1 except sexual harassment
            { pattern: "kill\\s+all\\s+\\w+", severity: 1 },
            { pattern: "death\\s+to\\s+\\w+", severity: 1 },
            { pattern: "\\w+\\s+should\\s+die", severity: 1 },
            { pattern: "gas\\s+the\\s+\\w+", severity: 1 },
            { pattern: "lynch\\s+\\w+", severity: 1 },
            { pattern: "rape\\s+\\w+", severity: 3 },
            { pattern: "burn\\s+\\w+\\s+alive", severity: 1 },
            { pattern: "hitler\\s+was\\s+right", severity: 1 },
            { pattern: "final\\s+solution", severity: 1 },
            
            { pattern: "fuck\\s+islam", severity: 1 },
            { pattern: "fuck\\s+hinduism", severity: 1 },
            { pattern: "fuck\\s+christianity", severity: 1 },
            { pattern: "fuck\\s+buddhism", severity: 1 },
            { pattern: "fuck\\s+sikhs", severity: 1 },
            { pattern: "fuck\\s+jews", severity: 1 },
            
            { pattern: "dirty\\s+\\w+", severity: 1 },
            { pattern: "filthy\\s+\\w+", severity: 1 },
            { pattern: "subhuman", severity: 1 },
            { pattern: "inferior\\s+race", severity: 1 },
            { pattern: "master\\s+race", severity: 1 }
        ],
        
        harassment: [
            { pattern: "kill\\s+yourself", severity: 1 },
            { pattern: "go\\s+die", severity: 1 },
            { pattern: "commit\\s+suicide", severity: 1 },
            { pattern: "end\\s+your\\s+life", severity: 1 },
            { pattern: "nobody\\s+likes\\s+you", severity: 1 },
            { pattern: "you\\s+are\\s+worthless", severity: 1 },
            { pattern: "you\\s+should\\s+not\\s+exist", severity: 1 },
            { pattern: "waste\\s+of\\s+space", severity: 1 },
            { pattern: "world\\s+would\\s+be\\s+better\\s+without\\s+you", severity: 1 },
            { pattern: "your\\s+parents\\s+hate\\s+you", severity: 1 },
            { pattern: "you\\s+deserve\\s+to\\s+suffer", severity: 1 },
            { pattern: "i\\s+hope\\s+you\\s+die", severity: 1 },
            { pattern: "rot\\s+in\\s+hell", severity: 1 },
            
            // Sexual harassment kept original severity
            { pattern: "send\\s+nudes", severity: 3 },
            { pattern: "show\\s+me\\s+your", severity: 3 },
            { pattern: "i\\s+want\\s+to\\s+fuck\\s+you", severity: 4 },
            { pattern: "suck\\s+my", severity: 3 },
            { pattern: "come\\s+to\\s+my\\s+room", severity: 3 },
            
            // Doxxing threats downgraded
            { pattern: "i\\s+know\\s+where\\s+you\\s+live", severity: 1 },
            { pattern: "i\\s+will\\s+find\\s+you", severity: 1 },
            { pattern: "your\\s+address\\s+is", severity: 1 },
            { pattern: "i\\s+have\\s+your\\s+photos", severity: 1 }
        ],
        
        spam: [
            { pattern: "(.)\\1{10,}", severity: 1 },
            { pattern: "\\s{5,}", severity: 1 },
            { pattern: "[!@#$%^&*()]{5,}", severity: 1 },
            { pattern: "[A-Z]{20,}", severity: 1 },
            { pattern: "[\ud800-\udfff]{3,}", severity: 1 }
        ]
    },
    
    adult: {
        explicit: [
            // Sexual/explicit words keep original severity
            { word: "porn", severity: 3 },
            { word: "sex", severity: 2 },
            { word: "xxx", severity: 3 },
            { word: "nude", severity: 3 },
            { word: "naked", severity: 3 },
            { word: "horny", severity: 3 },
            { word: "masturbate", severity: 3 },
            { word: "orgasm", severity: 3 },
            { word: "anal", severity: 3 },
            { word: "oral", severity: 3 },
            { word: "blowjob", severity: 3 },
            { word: "handjob", severity: 3 },
            { word: "69", severity: 3 },
            { word: "gangbang", severity: 4 },
            { word: "bukkake", severity: 4 }
        ]
    },
    
    drugs: {
        substances: [
            // All downgraded to 1
            { word: "weed", severity: 1 },
            { word: "marijuana", severity: 1 },
            { word: "cocaine", severity: 1 },
            { word: "heroin", severity: 1 },
            { word: "meth", severity: 1 },
            { word: "ecstasy", severity: 1 },
            { word: "lsd", severity: 1 },
            { word: "acid", severity: 1 },
            { word: "molly", severity: 1 },
            { word: "crack", severity: 1 },
            { word: "fentanyl", severity: 1 },
            { word: "opioid", severity: 1 },
            { word: "xanax", severity: 1 },
            { word: "adderall", severity: 1 }
        ]
    },
    
    violence: {
        threats: [
            // All downgraded to 1
            { word: "kill", severity: 1 },
            { word: "murder", severity: 1 },
            { word: "assassinate", severity: 1 },
            { word: "shoot", severity: 1 },
            { word: "stab", severity: 1 },
            { word: "bomb", severity: 1 },
            { word: "explode", severity: 1 },
            { word: "torture", severity: 1 },
            { word: "lynch", severity: 1 },
            { word: "hang", severity: 1 },
            { word: "behead", severity: 1 },
            { word: "execute", severity: 1 }
        ]
    }
};


// Helper functions for wordlist management
const wordlistHelpers = {
    // Get all words above a certain severity threshold
    getWordsBySeverity: (language, minSeverity = 1) => {
        if (!wordlists[language] || !wordlists[language].profanity) {
            return [];
        }
        return wordlists[language].profanity
            .filter(item => item.severity >= minSeverity)
            .map(item => item.word);
    },
    
    // Get all patterns above a certain severity threshold
    getPatternsBySeverity: (category, minSeverity = 1) => {
        if (!wordlists.patterns || !wordlists.patterns[category]) {
            return [];
        }
        return wordlists.patterns[category]
            .filter(item => item.severity >= minSeverity)
            .map(item => item.pattern);
    },
    
    // Combine wordlists from multiple languages
    getCombinedWordlist: (languages, minSeverity = 1) => {
        const combined = [];
        languages.forEach(lang => {
            if (wordlists[lang] && wordlists[lang].profanity) {
                const words = wordlists[lang].profanity
                    .filter(item => item.severity >= minSeverity);
                combined.push(...words);
            }
        });
        return combined;
    },
    
    // Check if a word exists in any wordlist
    isKnownProfanity: (word) => {
        const lowerWord = word.toLowerCase();
        for (const [lang, data] of Object.entries(wordlists)) {
            if (data.profanity) {
                for (const item of data.profanity) {
                    if (item.word.toLowerCase() === lowerWord) {
                        return { found: true, language: lang, severity: item.severity };
                    }
                }
            }
        }
        return { found: false };
    },
    
    // Get severity level name
    getSeverityName: (level) => {
        const names = {
            1: 'Mild',
            2: 'Moderate', 
            3: 'Strong',
            4: 'Severe'
        };
        return names[level] || 'Unknown';
    }
};

module.exports = {
    ...wordlists,
    helpers: wordlistHelpers
};
