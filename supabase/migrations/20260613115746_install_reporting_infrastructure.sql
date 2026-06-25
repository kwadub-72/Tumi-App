-- Create enums
CREATE TYPE target_type_enum AS ENUM ('profile', 'post', 'map');
CREATE TYPE report_status_enum AS ENUM ('pending', 'reviewed', 'dismissed', 'resolved');

-- Create reports table
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_type target_type_enum NOT NULL,
    target_id UUID NOT NULL,
    header_category TEXT NOT NULL,
    sub_category TEXT NOT NULL,
    status report_status_enum DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_report UNIQUE(reporter_id, target_id)
);

-- Create user_bug_reports table
CREATE TABLE public.user_bug_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    device_info JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row-Level Security
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bug_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated inserts to reports" ON public.reports
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Allow authenticated inserts to user_bug_reports" ON public.user_bug_reports
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
