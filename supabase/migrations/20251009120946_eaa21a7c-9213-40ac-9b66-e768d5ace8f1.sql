-- Create incomes table
CREATE TABLE public.incomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for incomes
CREATE POLICY "Users can view their own incomes" 
ON public.incomes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own incomes" 
ON public.incomes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own incomes" 
ON public.incomes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own incomes" 
ON public.incomes 
FOR DELETE 
USING (auth.uid() = user_id);