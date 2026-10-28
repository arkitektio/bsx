import {AspectRatio as ShadAspectRatio} from '../../vendor/core/ui/aspect-ratio';
import {ScrollArea as ShadScrollArea} from '../../vendor/core/ui/scroll-area';
import {
  ResizableHandle as ShadResizableHandle,
  ResizablePanel as ShadResizablePanel,
  ResizablePanelGroup as ShadResizablePanelGroup,
} from '../../vendor/core/ui/resizable';
import {Separator as ShadSeparator} from '../../vendor/core/ui/separator';
import {
  BentoGrid as ShadBentoGrid,
  BentoItem as ShadBentoItem,
  type BentoItemProps as ShadBentoItemProps,
} from '../../vendor/core/ui/bento-grid';
import {cn} from '../../vendor/core/util/utils';
import {
  bentoItemLayoutSchema,
  type bentoItemLayoutFields,
  type layoutContracts,
} from '../../catalogs/parts/layout';
import {
  useBlok,
  useBlokTree,
  useValue,
  type BlokComponentNode,
  type BlokRender,
} from '../runtime';
import {
  buildLayoutStyle,
  mapAlign,
  mapJustify,
  renderChildList,
  renderContent,
  useBaseLayoutProps,
} from './shared';

type Contracts = typeof layoutContracts;

/**
 * Box and structural bloks.
 *
 * Naming across the catalog: a raw HTML blok is registered under its exact
 * lowercase tag name (`div`, `section`, `table`), a shadcn blok under its
 * PascalCase component name (`Card`, `Table`). The catalog map is
 * case-sensitive, so both can coexist; the PascalCase one is always the styled
 * shadcn component.
 */

/**
 * `Flex`, `Row` and `Column` are the same render over the same schema; the
 * only difference is whether the direction is author-controlled or fixed.
 */
const flexRender =
  (fixedDirection?: 'row' | 'column'): BlokRender<Contracts['Flex']> =>
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const layoutProps = useBaseLayoutProps(blok);
    const children = useValue(blok.children);
    const direction = useValue(blok.direction);
    const wrap = useValue(blok.wrap);
    const justify = useValue(blok.justify);
    const align = useValue(blok.align);
    const bordered = useValue(blok.bordered);

    const resolvedDirection = fixedDirection ?? (direction === 'column' ? 'column' : 'row');

    return (
      <div
        className={cn(
          'flex min-w-0',
          resolvedDirection === 'column' ? 'flex-col' : 'flex-row',
          wrap && 'flex-wrap',
          mapJustify(justify),
          mapAlign(align),
          bordered && 'border border-border/70',
        )}
        style={buildLayoutStyle(layoutProps)}
      >
        {renderChildList(children, buildChild)}
      </div>
    );
  };

const GridRender: BlokRender<Contracts['Grid']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const layoutProps = useBaseLayoutProps(blok);
  const children = useValue(blok.children);
  const columns = useValue(blok.columns);
  const minColumnWidth = useValue(blok.minColumnWidth);
  const bordered = useValue(blok.bordered);

  const gridTemplateColumns = columns
    ? `repeat(${columns}, minmax(0, 1fr))`
    : `repeat(auto-fit, minmax(${minColumnWidth ?? '16rem'}, 1fr))`;

  return (
    <div
      className={cn('grid min-w-0', bordered && 'border border-border/70')}
      style={{...buildLayoutStyle(layoutProps), gridTemplateColumns}}
    >
      {renderChildList(children, buildChild)}
    </div>
  );
};

const DivRender: BlokRender<Contracts['div']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const layoutProps = useBaseLayoutProps(blok);
  const children = useValue(blok.children);
  const className = useValue(blok.className);

  return (
    <div className={cn('min-w-0', className)} style={buildLayoutStyle(layoutProps)}>
      {renderContent(children, buildChild)}
    </div>
  );
};

const SpacerRender: BlokRender<Contracts['Spacer']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  const size = useValue(blok.size);
  const grow = useValue(blok.grow);

  return (
    <div
      aria-hidden
      style={{flexBasis: size, flexGrow: grow ?? (size ? 0 : 1), flexShrink: 0}}
    />
  );
};

const SeparatorRender: BlokRender<Contracts['Separator']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  const orientation = useValue(blok.orientation);
  const className = useValue(blok.className);

  return <ShadSeparator orientation={orientation ?? 'horizontal'} className={className} />;
};

const AspectRatioRender: BlokRender<Contracts['AspectRatio']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const children = useValue(blok.children);
  const ratio = useValue(blok.ratio);
  const className = useValue(blok.className);

  return (
    <ShadAspectRatio ratio={ratio ?? 16 / 9} className={className}>
      {renderChildList(children, buildChild)}
    </ShadAspectRatio>
  );
};

const ScrollAreaRender: BlokRender<Contracts['ScrollArea']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const children = useValue(blok.children);
  const className = useValue(blok.className);
  const gap = useValue(blok.gap);
  const height = useValue(blok.height);
  const maxHeight = useValue(blok.maxHeight);

  return (
    <ShadScrollArea className={className} style={{height, maxHeight}}>
      <div className="flex min-w-0 flex-col" style={{gap}}>
        {renderChildList(children, buildChild)}
      </div>
    </ShadScrollArea>
  );
};

const ResizableRender: BlokRender<Contracts['Resizable']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const children = useValue(blok.children);
  const direction = useValue(blok.direction);
  const className = useValue(blok.className);

  return (
    <ShadResizablePanelGroup
      direction={direction === 'column' ? 'vertical' : 'horizontal'}
      className={className}
    >
      {renderChildList(children, buildChild)}
    </ShadResizablePanelGroup>
  );
};

const ResizablePanelRender: BlokRender<Contracts['ResizablePanel']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const children = useValue(blok.children);
  const defaultSize = useValue(blok.defaultSize);
  const minSize = useValue(blok.minSize);
  const maxSize = useValue(blok.maxSize);
  const className = useValue(blok.className);

  return (
    <ShadResizablePanel
      defaultSize={defaultSize}
      minSize={minSize}
      maxSize={maxSize}
      className={className}
    >
      {renderChildList(children, buildChild)}
    </ShadResizablePanel>
  );
};

const ResizableHandleRender: BlokRender<Contracts['ResizableHandle']> = ({component, schema}) => {
  const blok = useBlok(component, schema);
  const withHandle = useValue(blok.withHandle);
  const className = useValue(blok.className);

  return <ShadResizableHandle withHandle={withHandle} className={className} />;
};

type BentoItemLayout = Pick<ShadBentoItemProps, 'cols' | 'rows' | 'priority' | 'show'>;

const BentoGridRender: BlokRender<Contracts['BentoGrid']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const layoutProps = useBaseLayoutProps(blok);
  const children = useValue(blok.children);
  const columns = useValue(blok.columns);
  const rowHeight = useValue(blok.rowHeight);
  const holeCost = useValue(blok.holeCost);
  const raggedCost = useValue(blok.raggedCost);
  const animate = useValue(blok.animate);
  const appear = useValue(blok.appear);
  const className = useValue(blok.className);
  const {nodes} = useBlokTree();

  const seen = new Set<string>();
  const items = (Array.isArray(children) ? children : []).map(child => {
    const id = typeof child === 'string' ? child : child.id;
    const basePath = typeof child === 'string' ? undefined : child.basePath;
    const key = seen.has(id) ? `${id}:${seen.size}` : id;
    seen.add(key);
    const node = nodes.get(id)?.node;
    return (
      <ShadBentoItem key={key} {...(node?.component === 'BentoItem' ? staticBentoLayout(node.props) : {})}>
        {buildChild(id, basePath)}
      </ShadBentoItem>
    );
  });

  return (
    <ShadBentoGrid
      columns={columns ?? 4}
      rowHeight={rowHeight}
      holeCost={holeCost}
      raggedCost={raggedCost}
      animate={animate}
      appear={appear}
      className={className}
      style={buildLayoutStyle(layoutProps)}
    >
      {items}
    </ShadBentoGrid>
  );
};

/** A BentoItem's layout props, from their static values; a bad or dynamic one is left at the default. */
const staticBentoLayout = (props: BlokComponentNode['props']): BentoItemLayout => {
  const out: Record<string, unknown> = {};
  for (const prop of props ?? []) {
    const field = bentoItemLayoutSchema.shape[prop.key as keyof typeof bentoItemLayoutFields];
    if (!field || prop.static_value === undefined) continue;
    const parsed = field.safeParse(prop.static_value);
    if (parsed.success) out[prop.key] = parsed.data;
  }
  return out as BentoItemLayout;
};

const BentoItemRender: BlokRender<Contracts['BentoItem']> = ({buildChild, component, schema}) => {
  const blok = useBlok(component, schema);
  const layoutProps = useBaseLayoutProps(blok);
  const children = useValue(blok.children);
  const className = useValue(blok.className);

  return (
    <div
      className={cn('flex h-full min-h-0 w-full min-w-0 flex-col', className)}
      style={buildLayoutStyle(layoutProps)}
    >
      {renderChildList(children, buildChild)}
    </div>
  );
};

export const layoutRenders = {
  Flex: flexRender(),
  Row: flexRender('row'),
  Column: flexRender('column'),
  Grid: GridRender,
  div: DivRender,
  Spacer: SpacerRender,
  Separator: SeparatorRender,
  AspectRatio: AspectRatioRender,
  ScrollArea: ScrollAreaRender,
  Resizable: ResizableRender,
  ResizablePanel: ResizablePanelRender,
  ResizableHandle: ResizableHandleRender,
  BentoGrid: BentoGridRender,
  BentoItem: BentoItemRender,
};
