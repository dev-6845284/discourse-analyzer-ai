export interface TimePeriodResult {
  description: string;
  startDate?: string;
  endDate?: string;
}

export type TimePeriodType = 'day' | 'week' | 'months' | 'years' | 'custom';

/**
 * Calculates the date range based on the selected time period
 * For predefined periods (day/week/month/year), only returns description
 * For custom periods, includes specific start and end dates
 */
export function getTimePeriodDescription(
  timePeriodType: TimePeriodType,
  timePeriodValue: number,
  customDateFrom: string,
  customDateTo: string
): TimePeriodResult {
  if (timePeriodType === 'custom') {
    if (!customDateFrom || !customDateTo) {
      // Default fallback
      return {
        description: 'the last 6 months',
      };
    }
    const startDate = new Date(customDateFrom);
    const endDate = new Date(customDateTo);
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

  // For predefined periods, only return description without specific dates
  switch (timePeriodType) {
    case 'day':
      return {
        description: 'the last day',
      };
    case 'week':
      return {
        description: 'the last week',
      };
    case 'months':
      return {
        description: `the last ${timePeriodValue} month${timePeriodValue > 1 ? 's' : ''}`,
      };
    case 'years':
      return {
        description: `the last ${timePeriodValue} year${timePeriodValue > 1 ? 's' : ''}`,
      };
    default:
      return {
        description: 'the last 6 months',
      };
  }
}
