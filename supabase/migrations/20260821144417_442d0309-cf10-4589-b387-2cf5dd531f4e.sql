UPDATE public.report_settings
SET config = config
  || jsonb_build_object('reportTitle','Patient Record','accentColor','#A67C30')
  || jsonb_build_object('sections', (config->'sections') || '{"address":true,"confidentiality":true}'::jsonb)
WHERE key = 'patient_report';