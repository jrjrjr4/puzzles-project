import random
import logging
from typing import Dict, List, Union, TypedDict, Optional
from dataclasses import dataclass

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
ALPHA = 0.8  # Weight for theme selection based on rating differences
BETA = 1.0   # Weight for puzzle popularity in scoring
GAMMA = 1.0  # Weight for rating difference impact in scoring

class Puzzle(TypedDict):
    puzzleID: str
    lichessRating: int
    popularity: float
    themes: List[str]
    used: bool

def compute_theme_probabilities(user_theme_ratings: Dict[str, int]) -> Dict[str, float]:
    """
    Compute probability distribution over themes based on user ratings.
    
    Args:
        user_theme_ratings: Dictionary mapping themes to user's rating in that theme
    
    Returns:
        Dictionary mapping themes to their selection probabilities
    """
    max_rating = max(user_theme_ratings.values())
    logger.info(f"Computing theme probabilities. Max rating: {max_rating}")
    
    # Compute raw scores
    theme_scores = {
        theme: ALPHA * ((max_rating - rating) + 1) + (1 - ALPHA) * 1
        for theme, rating in user_theme_ratings.items()
    }
    
    # Normalize to probabilities
    total_score = sum(theme_scores.values())
    theme_probs = {theme: score/total_score for theme, score in theme_scores.items()}
    
    logger.info("Theme probabilities:")
    for theme, prob in theme_probs.items():
        logger.info(f"  {theme}: {prob:.3f} (rating: {user_theme_ratings[theme]})")
    
    return theme_probs

def pick_theme(theme_probs: Dict[str, float]) -> str:
    """
    Randomly select a theme based on provided probabilities.
    
    Args:
        theme_probs: Dictionary mapping themes to their selection probabilities
    
    Returns:
        Selected theme
    """
    themes = list(theme_probs.keys())
    probabilities = list(theme_probs.values())
    selected = random.choices(themes, weights=probabilities, k=1)[0]
    logger.info(f"Selected theme: {selected} (probability: {theme_probs[selected]:.3f})")
    return selected

def compute_puzzle_score(
    puzzle: Puzzle,
    user_theme_ratings: Dict[str, int],
    beta: float = BETA,
    gamma: float = GAMMA
) -> float:
    """
    Compute score for a puzzle based on user ratings and puzzle properties.
    """
    # Compute average user rating for puzzle themes
    theme_ratings = [user_theme_ratings[t] for t in puzzle['themes'] if t in user_theme_ratings]
    if not theme_ratings:
        logger.warning(f"Puzzle {puzzle['puzzleID']} has no valid themes for user ratings")
        return 0.0
    
    puzzle_rating_for_user = sum(theme_ratings) / len(theme_ratings)
    diff = abs(puzzle['lichessRating'] - puzzle_rating_for_user)
    
    # Compute components of the score
    popularity_component = puzzle['popularity'] ** beta
    rating_penalty = 1 / (1 + diff ** gamma)
    score = popularity_component * rating_penalty
    
    logger.info(f"""
Puzzle {puzzle['puzzleID']} score calculation:
- Puzzle rating: {puzzle['lichessRating']}
- Themes: {puzzle['themes']}
- Theme ratings used: {theme_ratings}
- User's average theme rating: {puzzle_rating_for_user:.1f}
- Rating difference: {diff}
- Popularity: {puzzle['popularity']:.2f}
- Popularity component (pop^{beta}): {popularity_component:.3f}
- Rating penalty (1/(1+diff^{gamma})): {rating_penalty:.3f}
- Final score: {score:.3f}
""")
    
    return score

def pick_puzzle_for_theme(
    theme: str,
    puzzles: List[Puzzle],
    user_theme_ratings: Dict[str, int]
) -> Optional[Puzzle]:
    """
    Pick a puzzle for a given theme based on user ratings.
    """
    # Filter puzzles by theme and unused status
    valid_puzzles = [p for p in puzzles if not p['used'] and theme in p['themes']]
    
    logger.info(f"\n=== Picking puzzle for theme: {theme} ===")
    logger.info(f"User rating for theme: {user_theme_ratings.get(theme)}")
    logger.info(f"Found {len(valid_puzzles)} valid puzzles for theme {theme}")
    
    if not valid_puzzles:
        logger.warning(f"No valid puzzles found for theme {theme}")
        return None
    
    # Log distribution of available puzzles
    ratings = [p['lichessRating'] for p in valid_puzzles]
    logger.info(f"""
Available puzzle statistics:
- Count: {len(valid_puzzles)}
- Rating range: {min(ratings)} to {max(ratings)}
- Available puzzles:""")
    
    # Compute scores for all valid puzzles
    puzzle_scores = []
    for puzzle in valid_puzzles:
        score = compute_puzzle_score(puzzle, user_theme_ratings)
        puzzle_scores.append(score)
    
    # Select puzzle weighted by scores
    selected_puzzle = random.choices(valid_puzzles, weights=puzzle_scores, k=1)[0]
    selected_puzzle['used'] = True
    
    logger.info("\n=== Final Selection ===")
    logger.info(f"""Selected puzzle {selected_puzzle['puzzleID']}:
- Rating: {selected_puzzle['lichessRating']}
- Themes: {selected_puzzle['themes']}
- Popularity: {selected_puzzle['popularity']:.2f}
- Score: {puzzle_scores[valid_puzzles.index(selected_puzzle)]:.3f}
- Rating difference from user: {abs(selected_puzzle['lichessRating'] - user_theme_ratings.get(theme, 0))}
""")
    
    return selected_puzzle

def get_next_puzzle(
    user_theme_ratings: Dict[str, int],
    puzzles: List[Puzzle]
) -> Optional[Puzzle]:
    """
    Get the next puzzle for a user based on their theme ratings.
    
    Args:
        user_theme_ratings: Dictionary of user's ratings in different themes
        puzzles: List of available puzzles
    
    Returns:
        Selected puzzle or None if no suitable puzzle found
    """
    logger.info("Starting puzzle selection process")
    logger.info(f"User has ratings for {len(user_theme_ratings)} themes")
    
    # Compute theme probabilities and select theme
    theme_probs = compute_theme_probabilities(user_theme_ratings)
    selected_theme = pick_theme(theme_probs)
    
    # Pick and return puzzle for selected theme
    return pick_puzzle_for_theme(selected_theme, puzzles, user_theme_ratings) 

def test_puzzle_selection():
    """
    Test function to debug puzzle selection with a specific case.
    """
    # User ratings from the image
    user_theme_ratings = {
        "capturingDefender": 1666,
        "discoveredAttack": 1398,
        "deflection": 1333,
        "quietMove": 1180,
        "fork": 1200,
        "kingsideAttack": 1200
    }
    
    # Create test puzzles including the one from the image
    puzzles = [
        {
            "puzzleID": "AMzCl",
            "lichessRating": 2354,
            "popularity": 1.0,  # 100% popularity
            "themes": ["kingsideAttack"],
            "used": False
        },
        # Add some other puzzles for comparison
        {
            "puzzleID": "test1",
            "lichessRating": 1250,
            "popularity": 0.8,
            "themes": ["kingsideAttack"],
            "used": False
        },
        {
            "puzzleID": "test2",
            "lichessRating": 1500,
            "popularity": 0.6,
            "themes": ["kingsideAttack", "fork"],
            "used": False
        }
    ]
    
    logger.info("=== Starting Test Puzzle Selection ===")
    
    # First, let's see the theme probabilities
    theme_probs = compute_theme_probabilities(user_theme_ratings)
    
    # Now let's force select kingsideAttack theme to match our case
    logger.info("\n=== Testing puzzle selection for kingsideAttack theme ===")
    puzzle = pick_puzzle_for_theme("kingsideAttack", puzzles, user_theme_ratings)
    
    if puzzle:
        logger.info("\n=== Final Selected Puzzle ===")
        logger.info(f"PuzzleID: {puzzle['puzzleID']}")
        logger.info(f"Rating: {puzzle['lichessRating']}")
        logger.info(f"Themes: {puzzle['themes']}")
        logger.info(f"Popularity: {puzzle['popularity']}")
    
    return puzzle

if __name__ == "__main__":
    test_puzzle_selection() 