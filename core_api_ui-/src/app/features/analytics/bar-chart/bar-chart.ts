import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Chart, ChartConfiguration, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import { ChartDatum } from '../bar-chart/chart-aggregation';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

function cssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** Thin Chart.js wrapper. Re-renders in place when data changes and emits the clicked datum. */
@Component({
  selector: 'app-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart-canvas" [style.height.px]="height()">
      <canvas #canvas role="img" [attr.aria-label]="ariaLabel()"></canvas>
    </div>
  `,
})
export class BarChart {
  readonly data = input.required<ChartDatum[]>();
  readonly orientation = input<'vertical' | 'horizontal'>('vertical');
  readonly height = input(260);
  readonly ariaLabel = input('Bar chart');
  readonly highlight = input<string | null>(null);
  readonly datumSelected = output<ChartDatum>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart<'bar'> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.chart?.destroy());

    afterRenderEffect(() => {
      const data = this.data();
      const horizontal = this.orientation() === 'horizontal';
      const highlight = this.highlight();
      const primary = cssVar('--chart-primary', '#0f766e');
      const muted = cssVar('--chart-muted', '#99d5cf');
      const text = cssVar('--muted-foreground', '#5b6473');
      const grid = cssVar('--border', '#e5e7eb');
      const colors = data.map((d) => (highlight === null || d.label === highlight ? primary : muted));

      if (this.chart && (this.chart.options.indexAxis === 'y') === horizontal) {
        this.chart.data.labels = data.map((d) => d.label);
        this.chart.data.datasets[0].data = data.map((d) => d.value);
        this.chart.data.datasets[0].backgroundColor = colors;
        this.chart.update();
        return;
      }

      this.chart?.destroy();
      const config: ChartConfiguration<'bar'> = {
        type: 'bar',
        data: {
          labels: data.map((d) => d.label),
          datasets: [{ data: data.map((d) => d.value), backgroundColor: colors, borderRadius: 3, maxBarThickness: 40 }],
        },
        options: {
          indexAxis: horizontal ? 'y' : 'x',
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 250 },
          onClick: (_event, elements) => {
            const index = elements[0]?.index;
            if (index !== undefined) this.datumSelected.emit(this.data()[index]);
          },
          onHover: (event, elements) => {
            const target = event.native?.target as HTMLElement | undefined;
            if (target) target.style.cursor = elements.length ? 'pointer' : 'default';
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: { label: (ctx) => ` ${Number(ctx.raw).toLocaleString()} papers` },
            },
          },
          scales: {
            x: {
              grid: { display: horizontal, color: grid },
              ticks: { color: text, maxRotation: 0, autoSkip: true, autoSkipPadding: 8 },
              beginAtZero: true,
            },
            y: {
              grid: { display: !horizontal, color: grid },
              ticks: {
                color: text,
                callback: function (value) {
                  const label = this.getLabelForValue(Number(value));
                  return horizontal && label.length > 28 ? `${label.slice(0, 27)}…` : label;
                },
              },
              beginAtZero: true,
            },
          },
        },
      };
      this.chart = new Chart(this.canvas().nativeElement, config);
    });
  }
}
