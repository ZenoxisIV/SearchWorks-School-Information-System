/**
 * Calculates final grade using weighted average
 * Default weights: Prelim 20%, Midterm 30%, Finals 50%
 * Grading scale: 1.0 (best) to 5.0 (worst)
 * Pass = ≤ 3.0, Fail = > 3.0
 * Result is rounded to nearest 0.25 increment
 */
export function calculateFinalGrade(
    prelim: number | string,
    midterm: number | string,
    finals: number | string,
    prelimWeight: number = 0.2,
    midtermWeight: number = 0.3,
    finalsWeight: number = 0.5,
): { finalGrade: string; remarks: string } {
    const p = Number(prelim);
    const m = Number(midterm);
    const f = Number(finals);

    // Weighted average calculation
    const weighted = p * prelimWeight + m * midtermWeight + f * finalsWeight;
    
    // Round to nearest 0.25 increment
    // Formula: Math.round(value * 4) / 4
    const rounded = Math.round(weighted * 4) / 4;
    const finalGrade = rounded.toFixed(2);

    // Determine remarks: 1.0-3.0 is PASSED, > 3.0 is FAILED
    const remarks = Number(finalGrade) <= 3.0 ? "PASSED" : "FAILED";

    return { finalGrade, remarks };
}

/**
 * Alternative: Simple average (all components equal weight)
 * Result is rounded to nearest 0.25 increment
 */
export function calculateSimpleAverage(
    prelim: number | string,
    midterm: number | string,
    finals: number | string,
): { finalGrade: string; remarks: string } {
    const p = Number(prelim);
    const m = Number(midterm);
    const f = Number(finals);

    const average = (p + m + f) / 3;
    
    // Round to nearest 0.25 increment
    const rounded = Math.round(average * 4) / 4;
    const finalGrade = rounded.toFixed(2);

    const remarks = Number(finalGrade) <= 3.0 ? "PASSED" : "FAILED";

    return { finalGrade, remarks };
}
