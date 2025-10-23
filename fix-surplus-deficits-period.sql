-- Fix for Surplus/deficits of the period showing null (-)
-- This updates the database record to have the correct configuration

UPDATE statement_templates 
SET 
    calculation_formula = '(TAX_REVENUE + GRANTS + TRANSFERS_CENTRAL_TREASURY + TRANSFERS_PUBLIC_ENTITIES + FINES_PENALTIES_LICENSES + PROPERTY_INCOME + SALES_GOODS_SERVICES + PROCEEDS_SALE_CAPITAL + OTHER_REVENUE + DOMESTIC_BORROWINGS + EXTERNAL_BORROWINGS) - (COMPENSATION_EMPLOYEES + GOODS_SERVICES + GRANTS_TRANSFERS + SUBSIDIES + SOCIAL_ASSISTANCE + FINANCE_COSTS + ACQUISITION_FIXED_ASSETS + REPAYMENT_BORROWINGS + OTHER_EXPENSES)',
    aggregation_method = 'DIFF',
    is_total_line = true,
    updated_at = CURRENT_TIMESTAMP
WHERE 
    line_code = 'SURPLUS_DEFICITS_PERIOD' 
    AND statement_code = 'ASSETS_LIAB';

-- Verify the update
SELECT 
    id,
    statement_code,
    line_item,
    line_code,
    calculation_formula,
    aggregation_method,
    is_total_line,
    is_subtotal_line,
    updated_at
FROM statement_templates 
WHERE line_code = 'SURPLUS_DEFICITS_PERIOD' 
    AND statement_code = 'ASSETS_LIAB';