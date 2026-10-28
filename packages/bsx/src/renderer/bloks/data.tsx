import * as React from 'react';
import {
  Avatar as ShadAvatar,
  AvatarFallback as ShadAvatarFallback,
  AvatarImage as ShadAvatarImage,
} from '../../vendor/core/ui/avatar';
import {
  Card as ShadCard,
  CardContent as ShadCardContent,
  CardDescription as ShadCardDescription,
  CardFooter as ShadCardFooter,
  CardHeader as ShadCardHeader,
  CardTitle as ShadCardTitle,
} from '../../vendor/core/ui/card';
import {
  Carousel as ShadCarousel,
  CarouselContent as ShadCarouselContent,
  CarouselItem as ShadCarouselItem,
  CarouselNext as ShadCarouselNext,
  CarouselPrevious as ShadCarouselPrevious,
} from '../../vendor/core/ui/carousel';
import {
  ChartContainer as ShadChartContainer,
  ChartLegend as ShadChartLegend,
  ChartLegendContent as ShadChartLegendContent,
  ChartTooltip as ShadChartTooltip,
  ChartTooltipContent as ShadChartTooltipContent,
  type ChartConfig,
} from '../../vendor/core/ui/chart';
import {
  Item as ShadItem,
  ItemActions as ShadItemActions,
  ItemContent as ShadItemContent,
  ItemDescription as ShadItemDescription,
  ItemGroup as ShadItemGroup,
  ItemMedia as ShadItemMedia,
  ItemTitle as ShadItemTitle,
} from '../../vendor/core/ui/item';
import {
  Table as ShadTable,
  TableBody as ShadTableBody,
  TableCaption as ShadTableCaption,
  TableCell as ShadTableCell,
  TableFooter as ShadTableFooter,
  TableHead as ShadTableHead,
  TableHeader as ShadTableHeader,
  TableRow as ShadTableRow,
} from '../../vendor/core/ui/table';
import {cn} from '../../vendor/core/util/utils';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import type {dataContracts} from '../../catalogs/parts/data';
import {useAction, useBlok, useValue, type BlokRender} from '../runtime';
import {useAssetImageUrl} from '../assets';
import {useBlokSnapshotMode} from '../../preview/snapshotMode';
import {renderIcon} from './icons';
import {
  buildLayoutStyle,
  mapAlign,
  mapJustify,
  mapTextAlign,
  renderChildList,
  renderContent,
  useBaseLayoutProps,
} from './shared';

type Contracts = typeof dataContracts;

/** Content containers, tables, media and charts. */

/* -------------------------------------------------------------------------- */
/* Card                                                                       */
/* -------------------------------------------------------------------------- */

const CardRender: BlokRender<Contracts['Card']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const layoutProps = useBaseLayoutProps(blok);
  const children = useValue(blok.children);
  const size = useValue(blok.size);
  const className = useValue(blok.className);

  return (
    <ShadCard
      size={size ?? 'default'}
      style={buildLayoutStyle(layoutProps)}
      className={cn('min-w-0', className)}
    >
      {renderChildList(children, buildChild)}
    </ShadCard>
  );
};

const CardHeaderRender: BlokRender<Contracts['CardHeader']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const layoutProps = useBaseLayoutProps(blok);
  const children = useValue(blok.children);
  const className = useValue(blok.className);

  return (
    <ShadCardHeader className={className} style={buildLayoutStyle(layoutProps)}>
      {renderChildList(children, buildChild)}
    </ShadCardHeader>
  );
};

/** `CardTitle` and `CardDescription` differ only in the element they render. */
const cardTextRender =
  (Part: typeof ShadCardTitle | typeof ShadCardDescription): BlokRender<Contracts['CardTitle']> =>
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const text = useValue(blok.text);
    const children = useValue(blok.children);
    const className = useValue(blok.className);
    const align = useValue(blok.align);

    return (
      <Part className={cn(mapTextAlign(align), className)}>
        {renderContent(children ?? text, buildChild)}
      </Part>
    );
  };

const CardContentRender: BlokRender<Contracts['CardContent']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const layoutProps = useBaseLayoutProps(blok);
  const children = useValue(blok.children);
  const className = useValue(blok.className);
  const gap = useValue(blok.gap);

  return (
    <ShadCardContent className={className} style={buildLayoutStyle(layoutProps)}>
      <div className="flex min-w-0 flex-col" style={{gap}}>
        {renderChildList(children, buildChild)}
      </div>
    </ShadCardContent>
  );
};

const CardFooterRender: BlokRender<Contracts['CardFooter']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const layoutProps = useBaseLayoutProps(blok);
  const children = useValue(blok.children);
  const className = useValue(blok.className);
  const justify = useValue(blok.justify);
  const align = useValue(blok.align);

  return (
    <ShadCardFooter
      className={cn(mapJustify(justify), mapAlign(align), className)}
      style={buildLayoutStyle(layoutProps)}
    >
      {renderChildList(children, buildChild)}
    </ShadCardFooter>
  );
};

/* -------------------------------------------------------------------------- */
/* Table                                                                      */
/* -------------------------------------------------------------------------- */

type TablePartComponent = React.ComponentType<{
  className?: string;
  children?: React.ReactNode;
}>;

const tablePartRender =
  (Part: TablePartComponent): BlokRender<Contracts['TableHeader']> =>
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return <Part className={className}>{renderChildList(children, buildChild)}</Part>;
  };

const TableRender: BlokRender<Contracts['Table']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const children = useValue(blok.children);
  const caption = useValue(blok.caption);
  const className = useValue(blok.className);

  return (
    <ShadTable className={className}>
      {caption ? <ShadTableCaption>{caption}</ShadTableCaption> : null}
      {renderChildList(children, buildChild)}
    </ShadTable>
  );
};

const TableRowRender: BlokRender<Contracts['TableRow']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const children = useValue(blok.children);
  const onClick = useAction(blok.onClick);
  const className = useValue(blok.className);

  return (
    <ShadTableRow
      onClick={onClick}
      className={cn(onClick && 'cursor-pointer', className)}
    >
      {renderChildList(children, buildChild)}
    </ShadTableRow>
  );
};

/** `TableHead` and `TableCell` share one shape over two elements. */
const tableCellRender =
  (Part: typeof ShadTableHead | typeof ShadTableCell): BlokRender<Contracts['TableHead']> =>
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const text = useValue(blok.text);
    const children = useValue(blok.children);
    const align = useValue(blok.align);
    const className = useValue(blok.className);

    return (
      <Part className={cn(mapTextAlign(align), className)}>
        {renderContent(children ?? text, buildChild)}
      </Part>
    );
  };

/* -------------------------------------------------------------------------- */
/* Avatar and Item                                                            */
/* -------------------------------------------------------------------------- */

const AvatarRender: BlokRender<Contracts['Avatar']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  const url = useValue(blok.src);
  const asset = useAssetImageUrl(component, 'src');
  const src = asset.named ? asset.url : url;
  const alt = useValue(blok.alt);
  const fallback = useValue(blok.fallback);
  const size = useValue(blok.size);
  const className = useValue(blok.className);

  return (
    <ShadAvatar size={size ?? 'default'} className={className}>
      {src ? <ShadAvatarImage src={src} alt={alt} /> : null}
      <ShadAvatarFallback>{fallback ?? alt?.slice(0, 2).toUpperCase()}</ShadAvatarFallback>
    </ShadAvatar>
  );
};

const ItemGroupRender: BlokRender<Contracts['ItemGroup']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const children = useValue(blok.children);
  const className = useValue(blok.className);

  return (
    <ShadItemGroup className={className}>{renderChildList(children, buildChild)}</ShadItemGroup>
  );
};

const ItemRender: BlokRender<Contracts['Item']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const title = useValue(blok.title);
  const description = useValue(blok.description);
  const icon = useValue(blok.icon);
  const children = useValue(blok.children);
  const variant = useValue(blok.variant);
  const size = useValue(blok.size);
  const onClick = useAction(blok.onClick);
  const className = useValue(blok.className);

  return (
    <ShadItem
      variant={variant ?? 'default'}
      size={size ?? 'default'}
      onClick={onClick}
      className={cn(onClick && 'cursor-pointer', className)}
    >
      {icon ? <ShadItemMedia variant="icon">{renderIcon(icon)}</ShadItemMedia> : null}
      <ShadItemContent>
        {title ? <ShadItemTitle>{title}</ShadItemTitle> : null}
        {description ? <ShadItemDescription>{description}</ShadItemDescription> : null}
      </ShadItemContent>
      {children ? (
        <ShadItemActions>{renderChildList(children, buildChild)}</ShadItemActions>
      ) : null}
    </ShadItem>
  );
};

/* -------------------------------------------------------------------------- */
/* Carousel                                                                   */
/* -------------------------------------------------------------------------- */

const CarouselRender: BlokRender<Contracts['Carousel']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const children = useValue(blok.children);
  const orientation = useValue(blok.orientation);
  const showControls = useValue(blok.showControls);
  const className = useValue(blok.className);

  return (
    <ShadCarousel orientation={orientation ?? 'horizontal'} className={className}>
      <ShadCarouselContent>{renderChildList(children, buildChild)}</ShadCarouselContent>
      {showControls === false ? null : (
        <>
          <ShadCarouselPrevious />
          <ShadCarouselNext />
        </>
      )}
    </ShadCarousel>
  );
};

const CarouselItemRender: BlokRender<Contracts['CarouselItem']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const children = useValue(blok.children);
  const className = useValue(blok.className);

  return (
    <ShadCarouselItem className={className}>
      {renderChildList(children, buildChild)}
    </ShadCarouselItem>
  );
};

/* -------------------------------------------------------------------------- */
/* Chart                                                                      */
/* -------------------------------------------------------------------------- */

const CHART_SERIES_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

/** Draws the one data-configured component: series are options, not slots (see the contract). */
const ChartRender: BlokRender<Contracts['Chart']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  const type = useValue(blok.type);
  const data = useValue(blok.data);
  const categoryKey = useValue(blok.categoryKey);
  const series = useValue(blok.series);
  const stacked = useValue(blok.stacked);
  const showGrid = useValue(blok.showGrid);
  const showLegend = useValue(blok.showLegend);
  const height = useValue(blok.height);
  // A preview is taken once the drawing settles: no series grows into place.
  const animated = !useBlokSnapshotMode();
  const className = useValue(blok.className);

  const rows = data ?? [];
  const category = categoryKey ?? 'name';
  const resolvedSeries = (series ?? []).map((entry, index) => ({
    ...entry,
    color: entry.color ?? CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length],
  }));

  const config: ChartConfig = Object.fromEntries(
    resolvedSeries.map(entry => [entry.key, {label: entry.label ?? entry.key, color: entry.color}]),
  );

  if (rows.length === 0 || resolvedSeries.length === 0) {
    return null;
  }

  const grid = showGrid === false ? null : <CartesianGrid vertical={false} />;
  const legend = showLegend ? <ShadChartLegend content={<ShadChartLegendContent />} /> : null;
  const tooltip = <ShadChartTooltip content={<ShadChartTooltipContent />} />;
  const axes = (
    <>
      <XAxis dataKey={category} tickLine={false} axisLine={false} tickMargin={8} />
      <YAxis tickLine={false} axisLine={false} tickMargin={8} />
    </>
  );

  const body = (() => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={rows}>
            {grid}
            {axes}
            {tooltip}
            {legend}
            {resolvedSeries.map(entry => (
              <Bar
                key={entry.key}
                dataKey={entry.key}
                fill={entry.color}
                stackId={stacked ? 'stack' : undefined}
                radius={4}
                isAnimationActive={animated}
              />
            ))}
          </BarChart>
        );
      case 'area':
        return (
          <AreaChart data={rows}>
            {grid}
            {axes}
            {tooltip}
            {legend}
            {resolvedSeries.map(entry => (
              <Area
                key={entry.key}
                dataKey={entry.key}
                stroke={entry.color}
                fill={entry.color}
                fillOpacity={0.25}
                stackId={stacked ? 'stack' : undefined}
                isAnimationActive={animated}
              />
            ))}
          </AreaChart>
        );
      case 'pie':
        return (
          <PieChart>
            {tooltip}
            {legend}
            <Pie data={rows} dataKey={resolvedSeries[0].key} nameKey={category} isAnimationActive={animated}>
              {rows.map((_row, index) => (
                <Cell
                  key={index}
                  fill={CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length]}
                />
              ))}
            </Pie>
          </PieChart>
        );
      case 'line':
      default:
        return (
          <LineChart data={rows}>
            {grid}
            {axes}
            {tooltip}
            {legend}
            {resolvedSeries.map(entry => (
              <Line key={entry.key} dataKey={entry.key} stroke={entry.color} dot={false} isAnimationActive={animated} />
            ))}
          </LineChart>
        );
    }
  })();

  return (
    <ShadChartContainer config={config} className={className} style={{height}}>
      {body}
    </ShadChartContainer>
  );
};

export const dataRenders = {
  Card: CardRender,
  CardHeader: CardHeaderRender,
  CardTitle: cardTextRender(ShadCardTitle),
  CardDescription: cardTextRender(ShadCardDescription),
  CardContent: CardContentRender,
  CardFooter: CardFooterRender,
  Table: TableRender,
  TableHeader: tablePartRender(ShadTableHeader),
  TableBody: tablePartRender(ShadTableBody),
  TableFooter: tablePartRender(ShadTableFooter),
  TableRow: TableRowRender,
  TableHead: tableCellRender(ShadTableHead),
  TableCell: tableCellRender(ShadTableCell),
  Avatar: AvatarRender,
  ItemGroup: ItemGroupRender,
  Item: ItemRender,
  Carousel: CarouselRender,
  CarouselItem: CarouselItemRender,
  Chart: ChartRender,
};
