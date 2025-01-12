-- Create user_ratings table
CREATE TABLE IF NOT EXISTS user_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    theme VARCHAR(255) NOT NULL,
    rating INTEGER NOT NULL DEFAULT 1200,
    rd INTEGER NOT NULL DEFAULT 350,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, theme)
);

-- Create seen_puzzles table
CREATE TABLE IF NOT EXISTS seen_puzzles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    puzzle_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, puzzle_id)
);

-- Create current_puzzle table
CREATE TABLE IF NOT EXISTS current_puzzle (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    puzzle_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Create RLS policies
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seen_puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_puzzle ENABLE ROW LEVEL SECURITY;

-- User can only read and write their own data
CREATE POLICY "Users can read own ratings" ON user_ratings
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ratings" ON user_ratings
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ratings" ON user_ratings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own seen puzzles" ON seen_puzzles
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own seen puzzles" ON seen_puzzles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own current puzzle" ON current_puzzle
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own current puzzle" ON current_puzzle
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own current puzzle" ON current_puzzle
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own current puzzle" ON current_puzzle
    FOR DELETE USING (auth.uid() = user_id); 