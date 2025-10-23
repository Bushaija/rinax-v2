-- Query to verify which facilities have already been planned
-- This should match the logic in the getPlanned handler

-- Parameters for the test case:
-- program: 'Malaria'
-- facilityType: 'health_center' 
-- districtId: 13
-- reportingPeriodId: 2

-- First, let's see what facilities exist in district 13 with facility type 'health_center'
SELECT 
    f.id,
    f.name,
    f.facility_type,
    f.district_id
FROM facilities f
WHERE f.facility_type = 'health_center' 
    AND f.district_id = 13
ORDER BY f.name;

-- Now let's check which of these facilities have already been planned
-- (This matches the logic from the handler)
SELECT DISTINCT
    f.id as facility_id,
    f.name as facility_name,
    f.facility_type,
    f.district_id,
    p.project_type,
    rp.id as reporting_period_id
FROM schema_form_data_entries sfde
INNER JOIN projects p ON sfde.project_id = p.id
INNER JOIN facilities f ON sfde.facility_id = f.id  
INNER JOIN reporting_periods rp ON p.reporting_period_id = rp.id
WHERE sfde.entity_type = 'planning'
    AND p.project_type = 'Malaria'
    AND f.facility_type = 'health_center'
    AND f.district_id = 13
    AND p.reporting_period_id = 2
ORDER BY f.name;

-- Combined query to show which facilities should be available vs planned
WITH planned_facilities AS (
    SELECT DISTINCT sfde.facility_id
    FROM schema_form_data_entries sfde
    INNER JOIN projects p ON sfde.project_id = p.id
    INNER JOIN facilities f ON sfde.facility_id = f.id
    INNER JOIN reporting_periods rp ON p.reporting_period_id = rp.id
    WHERE sfde.entity_type = 'planning'
        AND p.project_type = 'Malaria'
        AND f.facility_type = 'health_center'
        AND f.district_id = 13
        AND p.reporting_period_id = 2
)
SELECT 
    f.id,
    f.name,
    f.facility_type,
    f.district_id,
    CASE 
        WHEN pf.facility_id IS NOT NULL THEN 'ALREADY_PLANNED'
        ELSE 'AVAILABLE'
    END as status
FROM facilities f
LEFT JOIN planned_facilities pf ON f.id = pf.facility_id
WHERE f.facility_type = 'health_center' 
    AND f.district_id = 13
ORDER BY f.name;

-- Specific check for 'tanda' and 'byumba' facilities
SELECT 
    f.id,
    f.name,
    f.facility_type,
    f.district_id,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM schema_form_data_entries sfde
            INNER JOIN projects p ON sfde.project_id = p.id
            WHERE sfde.facility_id = f.id
                AND sfde.entity_type = 'planning'
                AND p.project_type = 'Malaria'
                AND p.reporting_period_id = 2
        ) THEN 'ALREADY_PLANNED'
        ELSE 'AVAILABLE'
    END as planning_status
FROM facilities f
WHERE f.name IN ('tanda', 'byumba')
    AND f.district_id = 13
ORDER BY f.name;