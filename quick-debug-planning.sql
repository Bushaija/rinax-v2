-- Quick debug query to identify why GOODS_SERVICES_PLANNING is missing
-- Run this in your database console

-- 1. Check if GOODS_SERVICES_PLANNING event exists
SELECT 'STEP 1: GOODS_SERVICES_PLANNING event' as step;
SELECT id, code, name FROM events WHERE code = 'GOODS_SERVICES_PLANNING';

-- 2. Check planning activities mapped to this event
SELECT 'STEP 2: Planning activities mapped to GOODS_SERVICES_PLANNING' as step;
SELECT 
    da.id as activity_id,
    da.code as activity_code,
    da.name as activity_name,
    da.project_type,
    da.module_type
FROM configurable_event_mappings cem
JOIN events e ON cem.event_id = e.id
JOIN dynamic_activities da ON cem.activity_id = da.id
WHERE e.code = 'GOODS_SERVICES_PLANNING'
    AND da.project_type = 'Malaria'
    AND da.module_type = 'planning'
    AND cem.is_active = true;

-- 3. Check planning data for facility 20, period 2
SELECT 'STEP 3: Planning data for facility 20, period 2' as step;
SELECT 
    sfde.id,
    sfde.entity_id,
    sfde.entity_type,
    CAST(sfde.form_data->>'amount' AS NUMERIC) as amount
FROM schema_form_data_entries sfde
WHERE sfde.facility_id = 20
    AND sfde.reporting_period_id = 2
    AND sfde.entity_type = 'planning'
    AND sfde.entity_id IN (
        SELECT da.id
        FROM configurable_event_mappings cem
        JOIN events e ON cem.event_id = e.id
        JOIN dynamic_activities da ON cem.activity_id = da.id
        WHERE e.code = 'GOODS_SERVICES_PLANNING'
            AND da.project_type = 'Malaria'
            AND da.module_type = 'planning'
            AND cem.is_active = true
    );

-- 4. The critical aggregation query (what the system should be running)
SELECT 'STEP 4: Critical aggregation query result' as step;
SELECT 
    e.code as event_code,
    COUNT(*) as entry_count,
    SUM(CAST(sfde.form_data->>'amount' AS NUMERIC)) as total_amount
FROM schema_form_data_entries sfde
JOIN configurable_event_mappings cem ON sfde.entity_id = cem.activity_id
JOIN events e ON cem.event_id = e.id
WHERE sfde.project_id = 1
    AND sfde.facility_id = 20
    AND sfde.reporting_period_id = 2
    AND sfde.entity_type = 'planning'
    AND e.code = 'GOODS_SERVICES_PLANNING'
    AND sfde.entity_id IS NOT NULL
GROUP BY e.code;