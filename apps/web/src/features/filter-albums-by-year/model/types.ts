export const ALL = 'All' as const
export type YearOption = typeof ALL | number

// YearOption -> server `year` param. ALL means "no filter".
export const toYearParam = (y: YearOption): number | undefined => (y === ALL ? undefined : y)
