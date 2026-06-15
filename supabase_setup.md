# Supabase Backend Setup Guide

This guide walks you through setting up the Supabase backend required for the World Cup 2026 Predictor application.

## 1. Create a Supabase Project
1. Go to [Supabase](https://supabase.com/) and create an account if you don't have one.
2. Click **New Project** and select your organization.
3. Provide a name (e.g., "WC 2026 Predictor") and a strong database password.
4. Choose a region closest to your primary user base and click **Create New Project**.

## 2. Retrieve API Credentials
1. In your project dashboard, navigate to **Project Settings** (the gear icon) > **API**.
2. Note down the **Project URL** and the **anon / public** API key. You will need to plug these into your `index.html` or hosting environment variables.

## 3. Enable Email Authentication
1. Go to **Authentication** > **Providers**.
2. Ensure **Email** is enabled.
3. By default, Supabase requires email confirmation. If you want a seamless signup for testing, you can toggle **Confirm email** off, though it's recommended to leave it on for production.

## 4. Set Up the Database Schema
Navigate to the **SQL Editor** in the Supabase dashboard and run the following SQL script to create the necessary tables and security policies.

```sql
-- Create a table for user profiles
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a table for storing brackets
CREATE TABLE public.brackets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  bracket_data JSONB NOT NULL,
  final_score_home INT,
  final_score_away INT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brackets ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone." 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." 
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Brackets Policies
CREATE POLICY "Brackets are viewable by everyone." 
  ON public.brackets FOR SELECT USING (true);

CREATE POLICY "Users can insert their own bracket." 
  ON public.brackets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bracket." 
  ON public.brackets FOR UPDATE USING (auth.uid() = user_id);

-- Create a function to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the function on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

## 5. Next Steps
Once your database is configured, copy your `Project URL` and `anon key` into the application's configuration section. The app will now be able to handle user signups, log ins, and bracket storage!
