import { Puzzle } from '../types/puzzle';

// Constants
const ALPHA = 0.8;  // Weight for theme selection based on rating differences
const BETA = 1.0;   // Weight for puzzle popularity in scoring
const GAMMA = 1.0;  // Weight for rating difference impact in scoring
const DEFAULT_RATING = 1200;  // Default rating for new themes

// Update rating range to be tighter
const RATING_RANGE = 150; // Look for puzzles within ±150 of user's rating
const MAX_PUZZLES_TO_SCORE = 50; // Maximum number of puzzles to score for efficiency

interface UserThemeRatings {
    [theme: string]: number;
}

function log(message: string, data?: any) {
    console.log(`[PuzzleSelector] ${message}`, data ? data : '');
}

function computeThemeProbabilities(userThemeRatings: UserThemeRatings): { [theme: string]: number } {
    // If no ratings exist, create default ratings for all themes
    if (Object.keys(userThemeRatings).length === 0) {
        log('No theme ratings found. Using equal probabilities for all themes.');
        return {
            'Mate': 0.167,
            'Endgame': 0.167,
            'Defense': 0.167,
            'Quiet Move': 0.167,
            'Capturing Defender': 0.167,
            'Fork': 0.167
        };
    }

    const maxRating = Math.max(...Object.values(userThemeRatings));
    log(`Computing theme probabilities. Max rating: ${maxRating}`);
    
    // Compute raw scores - higher score means MORE likely to be selected
    const themeScores: { [theme: string]: number } = {};
    
    // First, ensure all themes have a base score
    const allThemes = ['Mate', 'Endgame', 'Defense', 'Quiet Move', 'Capturing Defender', 'Fork'];
    allThemes.forEach(theme => {
        if (theme in userThemeRatings) {
            // For rated themes, prefer those with lower ratings
            themeScores[theme] = ALPHA * ((maxRating - userThemeRatings[theme]) + 1) + (1 - ALPHA);
        } else {
            // For unrated themes, give them a slightly higher chance to encourage exploration
            themeScores[theme] = ALPHA * ((maxRating - DEFAULT_RATING) + 1) + (1 - ALPHA) * 1.2;
        }
    });
    
    // Normalize to probabilities
    const totalScore = Object.values(themeScores).reduce((a, b) => a + b, 0);
    const themeProbs: { [theme: string]: number } = {};
    for (const [theme, score] of Object.entries(themeScores)) {
        themeProbs[theme] = score / totalScore;
    }
    
    log('Theme probabilities:');
    Object.entries(themeProbs).forEach(([theme, prob]) => {
        log(`  ${theme}: ${prob.toFixed(3)} (rating: ${userThemeRatings[theme] || DEFAULT_RATING}${theme in userThemeRatings ? '' : ' default'})`);
    });
    
    return themeProbs;
}

function pickTheme(themeProbs: { [theme: string]: number }): string {
    const themes = Object.keys(themeProbs);
    if (themes.length === 0) {
        log('No themes available. Using default theme.');
        return 'Mate';  // Changed default to Mate as it's more fundamental
    }

    // Use weighted random selection
    const rand = Math.random();
    let cumSum = 0;
    
    // Sort themes by probability for more predictable selection
    const sortedThemes = themes.sort((a, b) => themeProbs[b] - themeProbs[a]);
    
    for (const theme of sortedThemes) {
        cumSum += themeProbs[theme];
        if (rand <= cumSum) {
            log(`Selected theme: ${theme} (probability: ${themeProbs[theme].toFixed(3)})`);
            return theme;
        }
    }
    
    // Fallback to highest probability theme
    const selectedTheme = sortedThemes[0];
    log(`Selected theme (fallback): ${selectedTheme} (probability: ${themeProbs[selectedTheme].toFixed(3)})`);
    return selectedTheme;
}

function computePuzzleScore(
    puzzle: Puzzle,
    userThemeRatings: UserThemeRatings,
    beta: number = BETA,
    gamma: number = GAMMA
): number {
    // Compute average user rating for puzzle themes
    const themeRatings = puzzle.themes
        .map(t => userThemeRatings[t] || DEFAULT_RATING);  // Use default rating for unknown themes
    
    if (themeRatings.length === 0) {
        log(`Puzzle ${puzzle.id} has no valid themes`);
        return 0.0;
    }
    
    const puzzleRatingForUser = themeRatings.reduce((a, b) => a + b, 0) / themeRatings.length;
    const diff = Math.abs(puzzle.rating - puzzleRatingForUser);
    
    // Compute components of the score
    const popularityComponent = Math.pow(puzzle.popularity / 100, beta);  // Divide by 100 as popularity is in percentage
    const ratingPenalty = 1 / (1 + Math.pow(diff, gamma));
    const score = popularityComponent * ratingPenalty;
    
    log(`
Puzzle ${puzzle.id} score calculation:
- Puzzle rating: ${puzzle.rating}
- Themes: ${puzzle.themes.join(', ')}
- Theme ratings: ${themeRatings.join(', ')} (weighted average: ${puzzleRatingForUser.toFixed(1)})
- Rating difference: ${diff}
- Popularity: ${(puzzle.popularity / 100).toFixed(2)}
- Popularity component (pop^${beta}): ${popularityComponent.toFixed(3)}
- Rating penalty (1/(1+diff^${gamma})): ${ratingPenalty.toFixed(3)}
- Final score: ${score.toFixed(3)}
`);
    
    return score;
}

function pickPuzzleForTheme(
    theme: string,
    puzzles: Puzzle[],
    userThemeRatings: UserThemeRatings,
    usedPuzzleIds: Set<string>
): Puzzle | null {
    log(`\n=== Picking puzzle for theme: ${theme} ===`);
    const userRating = userThemeRatings[theme] || DEFAULT_RATING;  // Use default rating if theme rating doesn't exist
    log(`User rating for theme: ${userRating} ${userThemeRatings[theme] ? '' : '(default)'}`);

    // First filter: theme and unused status
    const themeFilteredPuzzles = puzzles.filter(p => 
        !usedPuzzleIds.has(p.id) && p.themes.includes(theme)
    );
    log(`Found ${themeFilteredPuzzles.length} unused puzzles for theme ${theme}`);

    // Second filter: rating range (using strict ±150 range)
    const ratingFilteredPuzzles = themeFilteredPuzzles.filter(p => 
        Math.abs(p.rating - userRating) <= RATING_RANGE
    );
    log(`Found ${ratingFilteredPuzzles.length} puzzles within rating range ±${RATING_RANGE} of user rating ${userRating}`);

    if (ratingFilteredPuzzles.length === 0) {
        // If no puzzles in range, take the closest ones but log a warning
        themeFilteredPuzzles.sort((a, b) => 
            Math.abs(a.rating - userRating) - Math.abs(b.rating - userRating)
        );
        const closestPuzzles = themeFilteredPuzzles.slice(0, MAX_PUZZLES_TO_SCORE);
        log(`WARNING: No puzzles within ideal range (±${RATING_RANGE}). Using ${closestPuzzles.length} closest puzzles instead.`);
        log(`Rating range of closest puzzles: ${Math.min(...closestPuzzles.map(p => p.rating))} to ${Math.max(...closestPuzzles.map(p => p.rating))}`);
        return selectPuzzleFromPool(closestPuzzles, userThemeRatings);
    }

    // If we have too many puzzles in range, take a random sample
    let puzzlesToScore = ratingFilteredPuzzles;
    if (ratingFilteredPuzzles.length > MAX_PUZZLES_TO_SCORE) {
        // Shuffle and take first MAX_PUZZLES_TO_SCORE
        puzzlesToScore = [...ratingFilteredPuzzles]
            .sort(() => Math.random() - 0.5)
            .slice(0, MAX_PUZZLES_TO_SCORE);
        log(`Randomly selected ${MAX_PUZZLES_TO_SCORE} puzzles from ${ratingFilteredPuzzles.length} in range`);
    }

    return selectPuzzleFromPool(puzzlesToScore, userThemeRatings);
}

function selectPuzzleFromPool(
    puzzles: Puzzle[],
    userThemeRatings: UserThemeRatings
): Puzzle | null {
    if (puzzles.length === 0) {
        log(`No valid puzzles found`);
        return null;
    }

    // Log distribution of available puzzles
    const ratings = puzzles.map(p => p.rating);
    log(`
Available puzzle statistics:
- Count: ${puzzles.length}
- Rating range: ${Math.min(...ratings)} to ${Math.max(...ratings)}
`);

    // Compute scores for puzzles
    const puzzleScores = puzzles.map(puzzle => ({
        puzzle,
        score: computePuzzleScore(puzzle, userThemeRatings)
    }));

    // Sort by score for logging
    puzzleScores.sort((a, b) => b.score - a.score);
    log('\nTop 5 puzzle scores:');
    puzzleScores.slice(0, 5).forEach(({puzzle, score}) => {
        log(`Puzzle ${puzzle.id}: score=${score.toFixed(3)}, rating=${puzzle.rating}, diff=${Math.abs(puzzle.rating - userThemeRatings[puzzle.themes[0]])}`);
    });

    // Weighted random selection
    const totalScore = puzzleScores.reduce((sum, {score}) => sum + score, 0);
    const rand = Math.random() * totalScore;
    let cumSum = 0;
    let selectedPuzzle: Puzzle | null = null;

    for (const {puzzle, score} of puzzleScores) {
        cumSum += score;
        if (rand <= cumSum) {
            selectedPuzzle = puzzle;
            break;
        }
    }

    // Fallback to highest scored puzzle if random selection fails
    if (!selectedPuzzle) {
        selectedPuzzle = puzzleScores[0].puzzle;
    }

    log(`\n=== Final Selection ===`);
    log(`Selected puzzle ${selectedPuzzle.id}:
- Rating: ${selectedPuzzle.rating}
- Themes: ${selectedPuzzle.themes.join(', ')}
- Popularity: ${(selectedPuzzle.popularity / 100).toFixed(2)}
- Score: ${puzzleScores.find(ps => ps.puzzle.id === selectedPuzzle!.id)!.score.toFixed(3)}
- Rating difference from user: ${Math.abs(selectedPuzzle.rating - userThemeRatings[selectedPuzzle.themes[0]])}
`);

    return selectedPuzzle;
}

export function getNextPuzzle(
    userThemeRatings: UserThemeRatings,
    puzzles: Puzzle[],
    usedPuzzleIds: Set<string>
): Puzzle | null {
    log('Starting puzzle selection process');
    log(`User has ratings for ${Object.keys(userThemeRatings).length} themes`);
    
    // Compute theme probabilities and select theme
    const themeProbs = computeThemeProbabilities(userThemeRatings);
    const selectedTheme = pickTheme(themeProbs);
    
    // Pick and return puzzle for selected theme
    return pickPuzzleForTheme(selectedTheme, puzzles, userThemeRatings, usedPuzzleIds);
} 