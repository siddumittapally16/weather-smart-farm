CREATE TABLE public.crop_fields (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 field_name text NOT NULL CHECK (char_length(field_name) BETWEEN 1 AND 100),
 crop text NOT NULL CHECK (char_length(crop) BETWEEN 1 AND 100),
 sowing_date date NOT NULL,
 expected_harvest_date date,
 harvest_progress integer NOT NULL DEFAULT 0 CHECK (harvest_progress BETWEEN 0 AND 100),
 area_acres numeric CHECK (area_acres > 0),
 notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 2000),
 location_name text NOT NULL,
 region text,
 country text,
 latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
 longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (expected_harvest_date IS NULL OR expected_harvest_date >= sowing_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crop_fields TO authenticated;
GRANT ALL ON public.crop_fields TO service_role;
ALTER TABLE public.crop_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own fields" ON public.crop_fields FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Create own fields" ON public.crop_fields FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own fields" ON public.crop_fields FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own fields" ON public.crop_fields FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX crop_fields_user_id_idx ON public.crop_fields(user_id);
CREATE FUNCTION public.touch_crop_field() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER touch_crop_field BEFORE UPDATE ON public.crop_fields FOR EACH ROW EXECUTE FUNCTION public.touch_crop_field();