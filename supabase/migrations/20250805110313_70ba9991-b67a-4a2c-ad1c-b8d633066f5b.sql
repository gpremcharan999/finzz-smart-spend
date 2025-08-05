-- Fix function search path security issues
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Create function to handle new user signup with secure search path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'User'));
  
  INSERT INTO public.user_balance (user_id, balance, savings)
  VALUES (NEW.id, 0, 0);
  
  -- Insert default categories
  INSERT INTO public.categories (user_id, name, color) VALUES
    (NEW.id, 'Food', '#EF4444'),
    (NEW.id, 'Transport', '#3B82F6'),
    (NEW.id, 'Shopping', '#10B981'),
    (NEW.id, 'Bills', '#F59E0B'),
    (NEW.id, 'Entertainment', '#8B5CF6'),
    (NEW.id, 'Healthcare', '#EC4899'),
    (NEW.id, 'Education', '#06B6D4'),
    (NEW.id, 'Groceries', '#84CC16');
  
  RETURN NEW;
END;
$$;

-- Create function to update updated_at timestamp with secure search path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recreate triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_balance_updated_at
  BEFORE UPDATE ON public.user_balance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();