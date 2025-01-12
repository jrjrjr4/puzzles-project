import { supabase } from '../lib/supabaseClient';
import { Puzzle } from '../types/puzzle';

interface UserRatings {
  overall: {
    rating: number;
    ratingDeviation: number;
  };
  categories: {
    [category: string]: {
      rating: number;
      ratingDeviation: number;
    };
  };
}

interface SeenPuzzleRow {
  puzzle_id: string;
}

export async function saveUserRatings(ratings: UserRatings) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('user_ratings')
    .upsert({
      user_id: user.id,
      overall_rating: ratings.overall.rating,
      overall_rating_deviation: ratings.overall.ratingDeviation,
      category_ratings: ratings.categories
    });

  if (error) {
    console.error('Error saving user ratings:', error);
  }
}

export async function loadUserRatings(): Promise<UserRatings | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // First try to load existing ratings
  const { data, error } = await supabase
    .from('user_ratings')
    .select()
    .eq('user_id', user.id)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error loading user ratings:', error);
    return null;
  }

  if (!data) {
    // Create default ratings if none exist
    const defaultRatings: UserRatings = {
      overall: {
        rating: 1200,
        ratingDeviation: 350
      },
      categories: {}
    };
    await saveUserRatings(defaultRatings);
    return defaultRatings;
  }

  return {
    overall: {
      rating: data.overall_rating,
      ratingDeviation: data.overall_rating_deviation
    },
    categories: data.category_ratings || {}
  };
}

export async function addSeenPuzzle(puzzleId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('seen_puzzles')
    .insert({
      user_id: user.id,
      puzzle_id: puzzleId
    });

  if (error && !error.message.includes('duplicate key')) {
    console.error('Error adding seen puzzle:', error);
  }
}

export async function loadSeenPuzzles(): Promise<Set<string>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data, error } = await supabase
    .from('seen_puzzles')
    .select('puzzle_id')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error loading seen puzzles:', error);
    return new Set();
  }

  return new Set(data?.map((row: SeenPuzzleRow) => row.puzzle_id) || []);
}

export async function saveCurrentPuzzle(puzzle: Puzzle | null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (puzzle === null) {
    const { error } = await supabase
      .from('current_puzzle')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting current puzzle:', error);
    }
    return;
  }

  const { error } = await supabase
    .from('current_puzzle')
    .upsert({
      user_id: user.id,
      puzzle_data: puzzle
    });

  if (error) {
    console.error('Error saving current puzzle:', error);
  }
}

export async function loadCurrentPuzzle(): Promise<Puzzle | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('current_puzzle')
    .select('puzzle_data')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error loading current puzzle:', error);
    return null;
  }

  return data?.puzzle_data || null;
} 