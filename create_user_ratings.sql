create table if not exists user_ratings (id uuid default uuid_generate_v4() primary key, user_id uuid references auth.users not null, ratings jsonb not null, updated_at timestamp with time zone default timezone('utc'::text, now()) not null, created_at timestamp with time zone default timezone('utc'::text, now()) not null, unique(user_id)); alter table user_ratings enable row level security; create policy \
Users
can
view
their
own
ratings\ on user_ratings for select using (auth.uid() = user_id); create policy \Users
can
update
their
own
ratings\ on user_ratings for insert with check (auth.uid() = user_id); create policy \Users
can
update
their
own
ratings\ on user_ratings for update using (auth.uid() = user_id);
