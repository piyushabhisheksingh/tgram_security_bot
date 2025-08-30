// Comprehensive wordlists for content moderation
// Severity levels: 1 = mild, 2 = moderate, 3 = strong, 4 = severe

const wordlists = {
    english: {
        profanity: [
            // Mild profanity (severity 1)
            { word: "damn", severity: 1 },
            { word: "hell", severity: 1 },
            { word: "crap", severity: 1 },
            { word: "bloody", severity: 1 },
            { word: "sucks", severity: 1 },
            
            // Moderate profanity (severity 2)
            { word: "shit", severity: 2 },
            { word: "piss", severity: 2 },
            { word: "bitch", severity: 2 },
            { word: "bastard", severity: 2 },
            { word: "ass", severity: 2 },
            { word: "asshole", severity: 2 },
            { word: "bullshit", severity: 2 },
            { word: "dickhead", severity: 2 },
            { word: "moron", severity: 2 },
            { word: "idiot", severity: 2 },
            { word: "stupid", severity: 2 },
            { word: "dumb", severity: 2 },
            
            // Strong profanity (severity 3)
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
            
            // Severe/hate speech (severity 4)
            { word: "nigger", severity: 4 },
            { word: "faggot", severity: 4 },
            { word: "retard", severity: 4 },
            { word: "nazi", severity: 4 },
            { word: "terrorist", severity: 4 },
            { word: "kill yourself", severity: 4 },
            { word: "kys", severity: 4 },
            { word: "suicide", severity: 4 }
        ]
    },
    
    hindi: {
        profanity: [
            // Mild (severity 1)
            { word: "बेवकूफ", severity: 1 },
            { word: "मूर्ख", severity: 1 },
            { word: "गधा", severity: 1 },
            { word: "बकवास", severity: 1 },
            
            // Moderate (severity 2)
            { word: "हरामी", severity: 2 },
            { word: "कुत्ता", severity: 2 },
            { word: "सुअर", severity: 2 },
            { word: "कमीना", severity: 2 },
            { word: "गंदा", severity: 2 },
            { word: "भेंचोद", severity: 2 },
            { word: "रंडी", severity: 2 },
            
            // Strong (severity 3)
            { word: "मादरचोद", severity: 3 },
            { word: "भोसड़ी", severity: 3 },
            { word: "गांडू", severity: 3 },
            { word: "लंड", severity: 3 },
            { word: "चूत", severity: 3 },
            { word: "रंडी", severity: 3 },
            { word: "भोसड़ा", severity: 3 },
            
            // Severe (severity 4)
            { word: "मार डालूंगा", severity: 4 },
            { word: "आतंकवादी", severity: 4 },
            { word: "मर जा", severity: 4 }
        ]
    },
    
    hinglish: {
        profanity: [
            // Mild (severity 1)
            { word: "bakwas", severity: 1 },
            { word: "bewakoof", severity: 1 },
            { word: "gadha", severity: 1 },
            { word: "stupid", severity: 1 },
            
            // Moderate (severity 2)
            { word: "harami", severity: 2 },
            { word: "kutta", severity: 2 },
            { word: "suar", severity: 2 },
            { word: "kamina", severity: 2 },
            { word: "ganda", severity: 2 },
            { word: "bhenchod", severity: 2 },
            { word: "bc", severity: 2 },
            { word: "randi", severity: 2 },
            { word: "saala", severity: 2 },
            { word: "ullu", severity: 2 },
            
            // Strong (severity 3)
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
            
            // Severe (severity 4)
            { word: "mar dalunga", severity: 4 },
            { word: "maar dalunga", severity: 4 },
            { word: "terrorist", severity: 4 },
            { word: "atankwadi", severity: 4 },
            { word: "mar ja", severity: 4 },
            { word: "suicide kar", severity: 4 }
        ]
    },
    
    patterns: {
        hateSpeech: [
            { pattern: "kill\\s+all\\s+\\w+", severity: 4 },
            { pattern: "death\\s+to\\s+\\w+", severity: 4 },
            { pattern: "\\w+\\s+should\\s+die", severity: 4 },
            { pattern: "gas\\s+the\\s+\\w+", severity: 4 },
            { pattern: "lynch\\s+\\w+", severity: 4 },
            { pattern: "rape\\s+\\w+", severity: 4 },
            { pattern: "burn\\s+\\w+\\s+alive", severity: 4 },
            { pattern: "hitler\\s+was\\s+right", severity: 4 },
            { pattern: "final\\s+solution", severity: 4 },
            
            // Religious hate
            { pattern: "fuck\\s+islam", severity: 4 },
            { pattern: "fuck\\s+hinduism", severity: 4 },
            { pattern: "fuck\\s+christianity", severity: 4 },
            { pattern: "fuck\\s+buddhism", severity: 4 },
            { pattern: "fuck\\s+sikhs", severity: 4 },
            { pattern: "fuck\\s+jews", severity: 4 },
            
            // Racial slurs and hate
            { pattern: "dirty\\s+\\w+", severity: 3 },
            { pattern: "filthy\\s+\\w+", severity: 3 },
            { pattern: "subhuman", severity: 4 },
            { pattern: "inferior\\s+race", severity: 4 },
            { pattern: "master\\s+race", severity: 4 }
        ],
        
        harassment: [
            { pattern: "kill\\s+yourself", severity: 4 },
            { pattern: "go\\s+die", severity: 4 },
            { pattern: "commit\\s+suicide", severity: 4 },
            { pattern: "end\\s+your\\s+life", severity: 4 },
            { pattern: "nobody\\s+likes\\s+you", severity: 3 },
            { pattern: "you\\s+are\\s+worthless", severity: 3 },
            { pattern: "you\\s+should\\s+not\\s+exist", severity: 4 },
            { pattern: "waste\\s+of\\s+space", severity: 3 },
            { pattern: "world\\s+would\\s+be\\s+better\\s+without\\s+you", severity: 4 },
            { pattern: "your\\s+parents\\s+hate\\s+you", severity: 3 },
            { pattern: "you\\s+deserve\\s+to\\s+suffer", severity: 4 },
            { pattern: "i\\s+hope\\s+you\\s+die", severity: 4 },
            { pattern: "rot\\s+in\\s+hell", severity: 3 },
            
            // Sexual harassment
            { pattern: "send\\s+nudes", severity: 3 },
            { pattern: "show\\s+me\\s+your", severity: 3 },
            { pattern: "i\\s+want\\s+to\\s+fuck\\s+you", severity: 4 },
            { pattern: "suck\\s+my", severity: 3 },
            { pattern: "come\\s+to\\s+my\\s+room", severity: 3 },
            
            // Doxxing threats
            { pattern: "i\\s+know\\s+where\\s+you\\s+live", severity: 4 },
            { pattern: "i\\s+will\\s+find\\s+you", severity: 4 },
            { pattern: "your\\s+address\\s+is", severity: 4 },
            { pattern: "i\\s+have\\s+your\\s+photos", severity: 3 }
        ],
        
        spam: [
            { pattern: "(.)\\1{10,}", severity: 2 }, // Repeated characters
            { pattern: "\\s{5,}", severity: 1 }, // Multiple spaces
            { pattern: "[!@#$%^&*()]{5,}", severity: 2 }, // Special character spam
            { pattern: "[A-Z]{20,}", severity: 2 }, // All caps spam
            { pattern: "[\ud800-\udfff]{3,}", severity: 2 } // Emoji spam
        ]
    },
    
    // Additional categories for comprehensive filtering
    adult: {
        explicit: [
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
            { word: "weed", severity: 2 },
            { word: "marijuana", severity: 2 },
            { word: "cocaine", severity: 3 },
            { word: "heroin", severity: 3 },
            { word: "meth", severity: 3 },
            { word: "ecstasy", severity: 3 },
            { word: "lsd", severity: 3 },
            { word: "acid", severity: 2 },
            { word: "molly", severity: 3 },
            { word: "crack", severity: 3 },
            { word: "fentanyl", severity: 4 },
            { word: "opioid", severity: 3 },
            { word: "xanax", severity: 2 },
            { word: "adderall", severity: 2 }
        ]
    },
    
    violence: {
        threats: [
            { word: "kill", severity: 3 },
            { word: "murder", severity: 4 },
            { word: "assassinate", severity: 4 },
            { word: "shoot", severity: 3 },
            { word: "stab", severity: 3 },
            { word: "bomb", severity: 4 },
            { word: "explode", severity: 4 },
            { word: "torture", severity: 4 },
            { word: "lynch", severity: 4 },
            { word: "hang", severity: 3 },
            { word: "behead", severity: 4 },
            { word: "execute", severity: 4 }
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
