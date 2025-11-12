export interface TimePeriodResult {
  description: string;
  startDate: string;
  endDate: string;
}

export type TimePeriodType = 'day' | 'week' | 'months' | 'years' | 'custom';

/**
 * Calculates the date range based on the selected time period
 */
export function getTimePeriodDescription(
  timePeriodType: TimePeriodType,
  timePeriodValue: number,
  customDateFrom: string,
  customDateTo: string
): TimePeriodResult {
  const today = new Date();
  let startDate: Date;
  let endDate = today;

  if (timePeriodType === 'custom') {
    if (!customDateFrom || !customDateTo) {
      // Default fallback
      startDate = new Date(today);
      startDate.setMonth(today.getMonth() - 6);
      return {
        description: 'the last 6 months',
        startDate: startDate.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      };
    }
    startDate = new Date(customDateFrom);
    endDate = new Date(customDateTo);
    const startStr = startDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const endStr = endDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return {
      description: `from ${startStr} to ${endStr}`,
      startDate: customDateFrom,
      endDate: customDateTo,
    };
  }

  switch (timePeriodType) {
    case 'day':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 1);
      return {
        description: 'the last day',
        startDate: startDate.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      };
    case 'week':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
      return {
        description: 'the last week',
        startDate: startDate.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      };
    case 'months':
      startDate = new Date(today);
      startDate.setMonth(today.getMonth() - timePeriodValue);
      return {
        description: `the last ${timePeriodValue} month${timePeriodValue > 1 ? 's' : ''}`,
        startDate: startDate.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      };
    case 'years':
      startDate = new Date(today);
      startDate.setFullYear(today.getFullYear() - timePeriodValue);
      return {
        description: `the last ${timePeriodValue} year${timePeriodValue > 1 ? 's' : ''}`,
        startDate: startDate.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      };
    default:
      startDate = new Date(today);
      startDate.setMonth(today.getMonth() - 6);
      return {
        description: 'the last 6 months',
        startDate: startDate.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      };
  }
}
