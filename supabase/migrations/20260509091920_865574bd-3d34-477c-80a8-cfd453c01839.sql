
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'New User',
  age INT NOT NULL DEFAULT 25,
  bio TEXT NOT NULL DEFAULT '',
  photo_url TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  interests TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles read auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.demo_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INT NOT NULL,
  bio TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  city TEXT NOT NULL,
  interests TEXT[] NOT NULL DEFAULT '{}'
);
ALTER TABLE public.demo_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo read auth" ON public.demo_profiles FOR SELECT TO authenticated USING (true);

CREATE TABLE public.swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  swiped_id UUID NOT NULL,
  liked BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(swiper_id, swiped_id)
);
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "swipes read own" ON public.swipes FOR SELECT TO authenticated USING (auth.uid() = swiper_id);
CREATE POLICY "swipes insert own" ON public.swipes FOR INSERT TO authenticated WITH CHECK (auth.uid() = swiper_id);

CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_a, user_b),
  CHECK (user_a < user_b)
);
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches read own" ON public.matches FOR SELECT TO authenticated USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msgs read own match" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND (m.user_a = auth.uid() OR m.user_b = auth.uid())));
CREATE POLICY "msgs insert own match" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND (m.user_a = auth.uid() OR m.user_b = auth.uid())));

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_swipe()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE reciprocal BOOLEAN; ua UUID; ub UUID;
BEGIN
  IF NEW.liked THEN
    SELECT liked INTO reciprocal FROM public.swipes WHERE swiper_id = NEW.swiped_id AND swiped_id = NEW.swiper_id;
    IF reciprocal THEN
      ua := LEAST(NEW.swiper_id, NEW.swiped_id);
      ub := GREATEST(NEW.swiper_id, NEW.swiped_id);
      INSERT INTO public.matches (user_a, user_b) VALUES (ua, ub) ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_swipe_created AFTER INSERT ON public.swipes FOR EACH ROW EXECUTE FUNCTION public.handle_swipe();

INSERT INTO public.demo_profiles (name, age, bio, photo_url, city, interests) VALUES
  ('Aria', 26, 'Coffee, sunsets, indie music. Looking for quiet mornings together.', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=900', 'Brooklyn', ARRAY['Coffee','Music','Travel']),
  ('Maya', 28, 'Designer by day, dancer by night. Tell me your favorite song.', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=900', 'Lisbon', ARRAY['Design','Dance','Wine']),
  ('Sofia', 24, 'Climber, reader, dog mom. Probably outside right now.', 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=900', 'Barcelona', ARRAY['Climbing','Books','Dogs']),
  ('Liam', 29, 'Builder of things. Coffee snob. Looking for someone curious.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900', 'Berlin', ARRAY['Tech','Coffee','Cycling']),
  ('Noah', 27, 'Photographer chasing golden hour. Bring snacks.', 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=900', 'Tokyo', ARRAY['Photography','Hiking','Sushi']),
  ('Zara', 25, 'Yoga teacher, plant collector, terrible at chess.', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900', 'Bali', ARRAY['Yoga','Plants','Beach']),
  ('Eli', 30, 'Chef. Will cook for stories. Vinyl over streaming.', 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=900', 'New York', ARRAY['Food','Music','Films']),
  ('Iris', 23, 'Architecture student. Long walks, longer conversations.', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=900', 'Paris', ARRAY['Art','Walks','Books']);
