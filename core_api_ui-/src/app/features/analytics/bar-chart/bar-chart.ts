
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  Tooltip,
  type ChartConfiguration,
} from 'chart.js';

import { ChartDatum } from '../chart-aggregation';

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
);

function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();

  return value || fallback;
}

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,

  template: `
    <div
      class="chart-canvas"
      [style.height.px]="height()"
      [class.chart-horizontal]="orientation() === 'horizontal'"
    >
      <canvas
        #canvas
        role="img"
        [attr.aria-label]="ariaLabel()"
        aria-describedby="chart-accessibility-description"
      ></canvas>

      <span
        id="chart-accessibility-description"
        class="sr-only"
      >
        {{ ariaLabel() }}.
        Select a bar to explore the corresponding publication data.
      </span>
    </div>
  `,
})
export class BarChart {

  readonly data = input.required<ChartDatum[]>();

  readonly orientation =
    input<'vertical' | 'horizontal'>('vertical');

  readonly height = input(260);

  readonly ariaLabel =
    input('Research publications by year');

  readonly highlight = input<string | null>(null);

  readonly datumSelected = output<ChartDatum>();

  private readonly canvas =
    viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private readonly destroyRef = inject(DestroyRef);

  private chart: Chart<'bar'> | null = null;

  constructor() {

    this.destroyRef.onDestroy(() => {
      this.chart?.destroy();
      this.chart = null;
    });

    afterRenderEffect(() => {

      const data = this.data();
      const orientation = this.orientation();
      const highlight = this.highlight();
      const height = this.height();

      const theme = this.getChartTheme();

      this.renderChart(
        data,
        orientation,
        highlight,
        height,
        theme
      );

    });
  }

  private getChartTheme() {

    return {
      primary: cssVar('--chart-primary', '#30343b'),

      accent: cssVar('--chart-accent', '#f28c28'),

      muted: cssVar('--chart-muted', '#dce0e5'),

      text: cssVar('--muted-foreground', '#77808c'),

      grid: cssVar('--border', '#edf0f3'),

      surface: cssVar('--surface', '#ffffff'),

      tooltipBackground: cssVar('--foreground', '#25282d'),
    };
  }

  private renderChart(
    data: ChartDatum[],
    orientation: 'vertical' | 'horizontal',
    highlight: string | null,
    height: number,
    theme: ReturnType<BarChart['getChartTheme']>,
  ): void {

    const canvas = this.canvas().nativeElement;

    const horizontal = orientation === 'horizontal';

    const labels = data.map(datum => datum.label);

    const values = data.map(datum => datum.value);

    const colors = data.map(datum => {

      if (highlight !== null) {
        return datum.label === highlight
          ? theme.accent
          : theme.muted;
      }

      return theme.primary;

    });

    // Recreate chart only when orientation changes.

    if (
      this.chart &&
      (this.chart.options.indexAxis === 'y') !== horizontal
    ) {

      this.chart.destroy();
      this.chart = null;

    }

    // Update existing chart.

    if (this.chart) {

      this.chart.data.labels = labels;

      this.chart.data.datasets[0].data = values;

      this.chart.data.datasets[0].backgroundColor = colors;

      this.chart.options.plugins!.tooltip!.backgroundColor =
        theme.tooltipBackground;

      this.chart.update('none');

      return;
    }

    const configuration: ChartConfiguration<'bar'> = {

      type: 'bar',

      data: {

        labels,

        datasets: [

          {
            label: 'Publications',

            data: values,

            backgroundColor: colors,

            hoverBackgroundColor: theme.accent,

            borderRadius: 5,

            borderSkipped: false,

            maxBarThickness: horizontal ? 20 : 28,

            categoryPercentage: 0.78,

            barPercentage: 0.82,
          }

        ],
      },

      options: {

        indexAxis: horizontal ? 'y' : 'x',

        responsive: true,

        maintainAspectRatio: false,

        resizeDelay: 100,

        animation: {
          duration: 350,
          easing: 'easeOutQuart',
        },

        interaction: {
          mode: 'nearest',
          intersect: true,
        },

        layout: {
          padding: {
            top: 8,
            right: 8,
            bottom: 4,
            left: 4,
          },
        },

        onClick: (_event, elements) => {

          const index = elements[0]?.index;

          if (index === undefined) return;

          const datum = this.data()[index];

          if (datum) {
            this.datumSelected.emit(datum);
          }

        },

        onHover: (event, elements) => {

          const target =
            event.native?.target as HTMLElement | undefined;

          if (target) {
            target.style.cursor =
              elements.length > 0 ? 'pointer' : 'default';
          }

        },

        plugins: {

          legend: {
            display: false,
          },

          tooltip: {

            enabled: true,

            backgroundColor: theme.tooltipBackground,

            titleColor: '#ffffff',

            bodyColor: '#ffffff',

            padding: 13,

            cornerRadius: 8,

            displayColors: false,

            caretSize: 5,

            titleFont: {
              size: 12,
              weight: 'bold',
            },

            bodyFont: {
              size: 12,
              weight: 'normal',
            },

            callbacks: {

              title: (items) =>
                `Publication year: ${items[0]?.label ?? ''}`,

              label: (context) =>
                ` ${Number(context.raw).toLocaleString()} papers`,

            },
          },
        },

        scales: {

          x: {

            beginAtZero: true,

            border: {
              display: false,
            },

            grid: {

              display: horizontal,

              color: theme.grid,

              drawTicks: false,

            },

            ticks: {

              color: theme.text,

              font: {
                size: 10,
                weight: 'normal',
              },

              maxRotation: 0,

              minRotation: 0,

              autoSkip: true,

              maxTicksLimit: horizontal ? 6 : 7,

              padding: 9,

            },

          },

          y: {

            beginAtZero: true,

            border: {
              display: false,
            },

            grid: {

              display: !horizontal,

              color: theme.grid,

              drawTicks: false,

            },

            ticks: {

              color: theme.text,

              font: {
                size: 10,
              },

              padding: 9,

              precision: 0,

              callback: function(value) {

                const label = this.getLabelForValue(Number(value));

                if (horizontal && String(label).length > 25) {
                  return `${String(label).slice(0, 24)}…`;
                }

                return Number(value).toLocaleString();

              },

            },

          },

        },

      },

    };

    this.chart = new Chart(canvas, configuration);

  }

}
