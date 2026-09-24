/**
 * Controlled on/off switch. Props: checked, onChange(nextChecked), disabled,
 * color ('brand' or 'danger'), label, and size ('sm' or 'md').
 */
export { default as Toggle } from './Toggle';

/**
 * Controlled accessible checkbox. Props: checked, onChange(nextChecked),
 * indeterminate, disabled, and label.
 */
export { default as Checkbox } from './CheckBox';

/**
 * Mutually exclusive option group. `options` is [{ value, label }]; props also
 * include value, onChange(nextValue), name, and size ('sm' or 'md').
 */
export { default as SegmentedControl } from './SegmentedControl';

/**
 * Responsive contribution-style activity calendar. `entries` is [{ date,
 * count, item?, items? }], where date is a Date or YYYY-MM-DD string. Optional
 * props include days, weeks, minWeeks, maxWeeks, unitLabel, and onBoxClick(bucket).
 */
export { default as HeatmapCalendar } from './HeatmapCalendar';

/**
 * SVG donut chart. `segments` is [{ label, value, color }]. Optional props
 * include size (180), thickness (24), centerLabel ('Total'), and
 * onSegmentClick(segment), which is called only for non-empty segments.
 */
export { default as DonutChart } from './DonutChart';

/**
 * Animated horizontal grouped bar chart. `items` is [{ label, bars: [{ name,
 * value, color }] }]; optional `legend` is [{ name, color }].
 */
export { default as GroupedBarChart } from './GroupedBarChart';

/**
 * Responsive vertical comparison chart. `items` uses the same grouped-bar
 * shape; optional props are legend, valueFormatter(number), height (260), and
 * onBarClick(item).
 */
export { default as ComparisonHistogram } from './ComparisonHistogram';

/**
 * Cursor-following chart label. Pass `point` as { x, y, content } or null;
 * content may be any React node, and null renders nothing.
 */
export { default as ChartTooltip } from './ChartTooltip';

/**
 * Controlled custom dropdown. `options` accepts strings or { value, label }
 * objects. Props include value, onChange(nextValue), placeholder, disabled,
 * and className; the placeholder also clears the value with ''.
 */
export { default as Select } from './Select';

/**
 * Animated order-count bars for the six most recent months. `orders` must be
 * an array of records with an `$createdAt` date value.
 */
export { default as OrdersByMonthChart } from './OrdersByMonthChart';

/**
 * Multi-series trend chart with positive and negative values. `series` is
 * [{ key, name, color, values, dash? }] and `xLabels` matches each values array.
 * Optional props: valueFormatter(number), height (260), defaultHidden, presets.
 */
export { default as TrendAreaChart } from './TrendAreaChart';

/**
 * Stacked status composition chart. `periods` is [{ label, total, counts }],
 * `statusColors` maps status keys to hex colors, and optional `statusIcons`
 * maps keys to Lucide icons. `valueLabel` defaults to 'orders'.
 */
export { default as StatusTrendChart } from './StatusTrendChart';

/**
 * Controlled order-status editor. Props: value, onChange(nextStatus),
 * optional statuses array, and disabled. Defaults to all ORDER_STATUS_META keys.
 */
export { default as StatusPicker } from './StatusPicker';

/**
 * Controlled status filter dropdown. Props: value ('' means all),
 * onChange(nextValue), optional statuses array, and placeholder ('All statuses').
 */
export { StatusFilterSelect } from './StatusPicker';

/**
 * Metadata keyed by order status, including icon, toggleColor, text, dot,
 * badge, and ring Tailwind classes.
 */
export { ORDER_STATUS_META } from './StatusPicker';

/** Hex color values keyed by order status for charts and other SVG visuals. */
export { ORDER_STATUS_HEX } from './StatusPicker';

/**
 * Controlled editable dropdown. `options` is a string array; props include
 * value, onChange(nextValue), onBlur, placeholder, disabled, error, and className.
 * Users may type a new value that is not already in options.
 */
export { default as Combobox } from './Combobox';

export { default as CatalogSearchBar } from './CatalogSearchBar';

export { default as ImageMultiSelect } from './ImageMultiSelect';