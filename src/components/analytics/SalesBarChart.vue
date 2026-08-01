<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useDark } from '@vueuse/core'
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  type ChartOptions,
  type ScriptableContext,
} from 'chart.js'
import type { SalesBarChartProps } from '@/types/analytics.types'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)

const props = defineProps<SalesBarChartProps>()

const isDark = useDark()
const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart<'bar'> | null = null

const formatAxis = (v: number) => {
  const prefix = props.prefix ?? ''
  if (v >= 1000) return `${prefix}${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`
  return `${prefix}${v}`
}

// Vertical orange gradient matching the design system.
const barGradient = (ctx: ScriptableContext<'bar'>) => {
  const { chart } = ctx
  const { ctx: canvasCtx, chartArea } = chart
  if (!chartArea) return '#D2691E'
  const gradient = canvasCtx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
  gradient.addColorStop(0, '#D2691E')
  gradient.addColorStop(1, '#E8945A')
  return gradient
}

const buildOptions = (): ChartOptions<'bar'> => {
  const gridColor = isDark.value ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
  const tickColor = isDark.value ? '#a8a29e' : '#A3A3A3'

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark.value ? '#f5f5f4' : '#1A1C1C',
        titleColor: isDark.value ? '#1c1917' : '#ffffff',
        bodyColor: isDark.value ? '#1c1917' : '#ffffff',
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        titleFont: { weight: 'bold', family: 'Plus Jakarta Sans' },
        bodyFont: { weight: 'bold', family: 'Plus Jakarta Sans' },
        callbacks: {
          label: item =>
            `${props.prefix ?? ''}${(item.parsed.y ?? 0).toLocaleString('en-US', {
              minimumFractionDigits: 0,
            })}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: tickColor,
          font: { size: 10, weight: 'bold', family: 'Plus Jakarta Sans' },
        },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: gridColor },
        ticks: {
          color: tickColor,
          font: { size: 10, weight: 'bold', family: 'Plus Jakarta Sans' },
          callback: value => formatAxis(Number(value)),
          maxTicksLimit: 5,
        },
      },
    },
  }
}

const buildData = () => ({
  labels: props.data.map(d => d.label),
  datasets: [
    {
      data: props.data.map(d => d.value),
      backgroundColor: barGradient,
      hoverBackgroundColor: '#B35919',
      borderRadius: 6,
      borderSkipped: false as const,
      maxBarThickness: 38,
    },
  ],
})

const renderChart = () => {
  if (!canvas.value) return
  chart = new Chart(canvas.value, {
    type: 'bar',
    data: buildData(),
    options: buildOptions(),
  })
}

onMounted(renderChart)

onBeforeUnmount(() => {
  chart?.destroy()
  chart = null
})

// Update on data change (period/granularity switch).
watch(
  () => props.data,
  () => {
    if (!chart) return
    chart.data = buildData()
    chart.update()
  },
  { deep: true }
)

// Re-theme when the app toggles dark mode.
watch(isDark, () => {
  if (!chart) return
  chart.options = buildOptions()
  chart.update()
})
</script>

<template>
  <div class="relative h-[280px] w-full">
    <canvas ref="canvas"></canvas>
  </div>
</template>
