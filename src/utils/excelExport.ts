import type ExcelJS from 'exceljs'
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Title as ChartTitlePlugin,
  Tooltip as ChartTooltipPlugin,
} from 'chart.js'

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  ChartTitlePlugin,
  ChartTooltipPlugin
)

// Shared styling so every Excel export in the app carries the same brand look.
export const EXCEL_PRIMARY_ARGB = 'FFB45309'
export const EXCEL_WHITE_ARGB = 'FFFFFFFF'
export const EXCEL_GREY_ARGB = 'FF737373'
export const EXCEL_FOOTER_FILL_ARGB = 'FFFDF2F0'

export const excelHeaderCellStyle = (cell: ExcelJS.Cell, align: 'left' | 'right' = 'left') => {
  cell.font = { bold: true, color: { argb: EXCEL_WHITE_ARGB } }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PRIMARY_ARGB } }
  cell.alignment = { horizontal: align, vertical: 'middle' }
}

// --- Shared report template: banner, KPI row, section headings, footer ---
// Every workbook in the app (Expense Report, Stock History, ...) opens with
// the same shell, so they read as one family of reports rather than
// one-off exports.

/** Writes the title/subtitle/filter-info banner starting at `startRow`; returns the next free row. */
export const writeExcelBanner = (
  sheet: ExcelJS.Worksheet,
  startRow: number,
  totalCols: number,
  title: string,
  subtitle: string,
  filterLine: string
): number => {
  let cursor = startRow
  const fullWidthRow = (text: string, font: Partial<ExcelJS.Font>, fill?: ExcelJS.Fill) => {
    const row = sheet.getRow(cursor)
    for (let col = 1; col <= totalCols; col++) {
      const cell = row.getCell(col)
      cell.value = text
      cell.font = font
      if (fill) {
        cell.fill = fill
        cell.alignment = { vertical: 'middle' }
      }
    }
    sheet.mergeCells(cursor, 1, cursor, totalCols)
    cursor += 1
  }

  fullWidthRow(
    title,
    { bold: true, size: 16, color: { argb: EXCEL_WHITE_ARGB } },
    {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: EXCEL_PRIMARY_ARGB },
    }
  )
  fullWidthRow(subtitle, { italic: true, color: { argb: EXCEL_GREY_ARGB } })
  cursor += 1
  fullWidthRow(filterLine, { bold: true })
  cursor += 1
  return cursor
}

/** A single KPI card spanning columns `from`..`to` (inclusive, 1-indexed). */
export interface ExcelKpiBlock {
  from: number
  to: number
  header: string
  value: number | string
  numFmt?: string
  caption: string
}

/** Writes a row of KPI cards (header/value/caption, 3 rows tall); returns the next free row. */
export const writeExcelKpiRow = (
  sheet: ExcelJS.Worksheet,
  startRow: number,
  blocks: ExcelKpiBlock[]
): number => {
  const headerRow = startRow
  const valueRow = startRow + 1
  const captionRow = startRow + 2

  for (const block of blocks) {
    const headerCell = sheet.getRow(headerRow).getCell(block.from)
    headerCell.value = block.header
    headerCell.font = { bold: true, size: 9, color: { argb: EXCEL_GREY_ARGB } }
    sheet.mergeCells(headerRow, block.from, headerRow, block.to)

    const valueCell = sheet.getRow(valueRow).getCell(block.from)
    valueCell.value = block.value
    valueCell.font = { bold: true, size: 16, color: { argb: EXCEL_PRIMARY_ARGB } }
    if (block.numFmt) valueCell.numFmt = block.numFmt
    sheet.mergeCells(valueRow, block.from, valueRow, block.to)

    const captionCell = sheet.getRow(captionRow).getCell(block.from)
    captionCell.value = block.caption
    captionCell.font = { size: 9, color: { argb: EXCEL_GREY_ARGB } }
    sheet.mergeCells(captionRow, block.from, captionRow, block.to)
  }

  return captionRow + 2
}

/** A single bold section heading (e.g. "Purchase History"); returns the next free row. */
export const writeExcelSectionHeading = (
  sheet: ExcelJS.Worksheet,
  startRow: number,
  totalCols: number,
  text: string
): number => {
  const row = sheet.getRow(startRow)
  for (let col = 1; col <= totalCols; col++) {
    const cell = row.getCell(col)
    cell.value = text
    cell.font = { bold: true, size: 12 }
  }
  sheet.mergeCells(startRow, 1, startRow, totalCols)
  return startRow + 1
}

/** A plain italic note row (e.g. pointing to per-month sheets); returns the next free row. */
export const writeExcelNote = (
  sheet: ExcelJS.Worksheet,
  startRow: number,
  totalCols: number,
  text: string
): number => {
  const row = sheet.getRow(startRow)
  for (let col = 1; col <= totalCols; col++) {
    const cell = row.getCell(col)
    cell.value = text
    cell.font = { italic: true, color: { argb: EXCEL_GREY_ARGB } }
  }
  sheet.mergeCells(startRow, 1, startRow, totalCols)
  return startRow + 1
}

/** The peach "report scope" disclaimer box every report ends with. */
export const writeExcelFooter = (
  sheet: ExcelJS.Worksheet,
  startRow: number,
  totalCols: number,
  heading: string,
  body: string
): void => {
  const fill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: EXCEL_FOOTER_FILL_ARGB },
  }

  const headingRow = sheet.getRow(startRow)
  for (let col = 1; col <= totalCols; col++) headingRow.getCell(col).fill = fill
  headingRow.getCell(1).value = heading
  headingRow.getCell(1).font = { bold: true, color: { argb: EXCEL_PRIMARY_ARGB } }
  sheet.mergeCells(startRow, 1, startRow, totalCols)

  const bodyRow = sheet.getRow(startRow + 1)
  for (let col = 1; col <= totalCols; col++) bodyRow.getCell(col).fill = fill
  bodyRow.getCell(1).value = body
  bodyRow.getCell(1).font = { color: { argb: EXCEL_GREY_ARGB } }
  bodyRow.getCell(1).alignment = { wrapText: true }
  bodyRow.height = 30
  sheet.mergeCells(startRow + 1, 1, startRow + 1, totalCols)
}

// --- Chart image ---
// ExcelJS has no native chart API, so a bar chart is rendered into an
// off-screen canvas with Chart.js and embedded as a picture instead.
export const renderExcelBarChartImage = (
  data: { label: string; value: number }[],
  options: { title: string; valuePrefix?: string; barColor?: string }
): Promise<string> =>
  new Promise(resolve => {
    const canvas = document.createElement('canvas')
    canvas.width = 900
    canvas.height = 380
    canvas.style.position = 'fixed'
    canvas.style.left = '-9999px'
    document.body.appendChild(canvas)

    const prefix = options.valuePrefix ?? ''
    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map(d => d.label),
        datasets: [
          {
            label: options.title,
            data: data.map(d => d.value),
            backgroundColor: options.barColor ?? '#B45309',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: false,
        animation: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: options.title, font: { size: 14, weight: 'bold' } },
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: value => `${prefix}${value}` } },
        },
      },
    })

    // animation: false renders synchronously, but toDataURL is deferred one
    // tick to be safe across browsers. A plain timer rather than
    // requestAnimationFrame: rAF is tied to the paint/compositing cycle and
    // would never fire on a canvas that never actually gets composited (e.g.
    // an off-screen automated browser), whereas a timer only needs the JS
    // event loop.
    setTimeout(() => {
      const dataUrl = canvas.toDataURL('image/png')
      chart.destroy()
      canvas.remove()
      resolve(dataUrl)
    }, 0)
  })

const DEFAULT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/**
 * "2026-08" -> "Aug 2026". Sheet tab names still need month *abbreviations*
 * (Excel caps tab names at 31 chars), so callers pass the current locale's
 * `analytics.monthsShort` via `tm()` rather than a full month-name list.
 */
export const excelMonthLabelOf = (monthKey: string, monthNames: string[] = DEFAULT_MONTH_NAMES) => {
  const [year, month] = monthKey.split('-').map(Number)
  return `${monthNames[month - 1]} ${year}`
}

export interface MonthGroup<T> {
  key: string
  label: string
  items: T[]
}

/**
 * Groups records by calendar month (newest month first), so a long export —
 * a year of restocking, a year of one item's movements — splits into
 * readable per-month chunks rather than one giant sheet.
 */
export const groupByMonth = <T>(
  items: T[],
  dateOf: (item: T) => string,
  monthNames: string[] = DEFAULT_MONTH_NAMES
): MonthGroup<T>[] => {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const key = dateOf(item).slice(0, 7)
    const group = groups.get(key)
    if (group) group.push(item)
    else groups.set(key, [item])
  }
  return [...groups.keys()]
    .sort((a, b) => b.localeCompare(a))
    .map(key => ({ key, label: excelMonthLabelOf(key, monthNames), items: groups.get(key)! }))
}

// Safety valve for a single month with an unusually large number of rows —
// falls back to chunking within that month too.
export const EXCEL_MAX_ROWS_PER_SHEET = 500

// Splitting into per-month sheets is worth the extra tabs only once there's
// enough data to make one flat table unwieldy. A handful of records that
// happen to straddle a month boundary (e.g. 3 in July, 3 in August) reads
// far better as one inline list than as two near-empty sheets.
export const EXCEL_SPLIT_BY_MONTH_THRESHOLD = 30

/** Whether a record set spanning `monthCount` months is worth splitting by month. */
export const shouldSplitByMonth = (monthCount: number, totalRecords: number): boolean =>
  monthCount > 1 && totalRecords > EXCEL_SPLIT_BY_MONTH_THRESHOLD

/** Splits into <= EXCEL_MAX_ROWS_PER_SHEET chunks, e.g. "Aug 2026 (1-500)". */
export const chunkSheetName = (label: string, start: number, end: number) =>
  `${label} (${start}-${end})`

export const downloadWorkbook = async (workbook: ExcelJS.Workbook, filename: string) => {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
