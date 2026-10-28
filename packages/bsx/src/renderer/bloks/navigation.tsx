import {
  Accordion as ShadAccordion,
  AccordionContent as ShadAccordionContent,
  AccordionItem as ShadAccordionItem,
  AccordionTrigger as ShadAccordionTrigger,
} from '../../vendor/core/ui/accordion';
import {
  Breadcrumb as ShadBreadcrumb,
  BreadcrumbItem as ShadBreadcrumbItem,
  BreadcrumbLink as ShadBreadcrumbLink,
  BreadcrumbList as ShadBreadcrumbList,
  BreadcrumbPage as ShadBreadcrumbPage,
  BreadcrumbSeparator as ShadBreadcrumbSeparator,
} from '../../vendor/core/ui/breadcrumb';
import {
  Collapsible as ShadCollapsible,
  CollapsibleContent as ShadCollapsibleContent,
  CollapsibleTrigger as ShadCollapsibleTrigger,
} from '../../vendor/core/ui/collapsible';
import {
  Menubar as ShadMenubar,
  MenubarContent as ShadMenubarContent,
  MenubarItem as ShadMenubarItem,
  MenubarMenu as ShadMenubarMenu,
  MenubarSeparator as ShadMenubarSeparator,
  MenubarTrigger as ShadMenubarTrigger,
} from '../../vendor/core/ui/menubar';
import {
  Pagination as ShadPagination,
  PaginationContent as ShadPaginationContent,
  PaginationEllipsis as ShadPaginationEllipsis,
  PaginationItem as ShadPaginationItem,
  PaginationLink as ShadPaginationLink,
  PaginationNext as ShadPaginationNext,
  PaginationPrevious as ShadPaginationPrevious,
} from '../../vendor/core/ui/pagination';
import {
  Tabs as ShadTabs,
  TabsContent as ShadTabsContent,
  TabsList as ShadTabsList,
  TabsTrigger as ShadTabsTrigger,
} from '../../vendor/core/ui/tabs';
import type {navigationContracts} from '../../catalogs/parts/navigation';
import {useAction, useBlok, useEventAction, useValue, type BlokRender} from '../runtime';
import {renderIcon} from './icons';
import {
  asBoolean,
  asString,
  asStringList,
  renderChildList,
  renderContent,
  useControlledValue,
} from './shared';

type Contracts = typeof navigationContracts;

/**
 * Navigation and disclosure bloks.
 *
 * Like the overlays, each family is a root plus parts, and the parts reach
 * their root through React context — see the note in `overlays.tsx` about why
 * that works across `buildChild`, and why triggers are never `asChild`.
 */

const TabsRender: BlokRender<Contracts['Tabs']> = ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    // Interaction state is the component's own (v2: no `bind` on a stateful component).
    const bind = undefined;
    const value = useValue(blok.value);
    const defaultValue = useValue(blok.defaultValue);
    const className = useValue(blok.className);
    const onChange = useEventAction(blok.onChange);

    const controlled = useControlledValue<string>({
      bind,
      value,
      defaultValue,
      fallback: '',
      parse: asString,
    });

    return (
      <ShadTabs
        value={controlled.value === '' ? undefined : controlled.value}
        className={className}
        onValueChange={next => {
          controlled.setValue(next);
          onChange?.(next);
        }}
      >
        {renderChildList(children, buildChild)}
      </ShadTabs>
    );
};

const TabsListRender: BlokRender<Contracts['TabsList']> = ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadTabsList className={className}>{renderChildList(children, buildChild)}</ShadTabsList>
    );
};

const TabsTriggerRender: BlokRender<Contracts['TabsTrigger']> = ({component, schema}) => {
    const blok = useBlok(component, schema);
    const value = useValue(blok.value);
    const label = useValue(blok.label);
    const icon = useValue(blok.icon);
    const disabled = useValue(blok.disabled);
    const className = useValue(blok.className);

    return (
      <ShadTabsTrigger value={value ?? ''} disabled={disabled === true} className={className}>
        {renderIcon(icon)}
        {label ?? value}
      </ShadTabsTrigger>
    );
};

const TabsContentRender: BlokRender<Contracts['TabsContent']> = ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const value = useValue(blok.value);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadTabsContent value={value ?? ''} className={className}>
        {renderChildList(children, buildChild)}
      </ShadTabsContent>
    );
};

const AccordionRender: BlokRender<Contracts['Accordion']> = ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    // Interaction state is the component's own (v2: no `bind` on a stateful component).
    const bind = undefined;
    const multiple = useValue(blok.multiple);
    const defaultValue = useValue(blok.defaultValue);
    const collapsible = useValue(blok.collapsible);
    const className = useValue(blok.className);
    const onChange = useEventAction(blok.onChange);

    const single = useControlledValue<string>({
      bind: multiple ? undefined : bind,
      value: undefined,
      defaultValue,
      fallback: '',
      parse: asString,
    });
    const many = useControlledValue<string[]>({
      bind: multiple ? bind : undefined,
      value: undefined,
      defaultValue: defaultValue ? [defaultValue] : undefined,
      fallback: [],
      parse: asStringList,
    });

    if (multiple) {
      return (
        <ShadAccordion
          type="multiple"
          value={many.value}
          className={className}
          onValueChange={next => {
            many.setValue(next);
            onChange?.(next);
          }}
        >
          {renderChildList(children, buildChild)}
        </ShadAccordion>
      );
    }

    return (
      <ShadAccordion
        type="single"
        collapsible={collapsible ?? true}
        value={single.value}
        className={className}
        onValueChange={next => {
          single.setValue(next);
          onChange?.(next);
        }}
      >
        {renderChildList(children, buildChild)}
      </ShadAccordion>
    );
};

const AccordionItemRender: BlokRender<Contracts['AccordionItem']> = ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const value = useValue(blok.value);
    const children = useValue(blok.children);
    const disabled = useValue(blok.disabled);
    const className = useValue(blok.className);

    return (
      <ShadAccordionItem value={value ?? ''} disabled={disabled === true} className={className}>
        {renderChildList(children, buildChild)}
      </ShadAccordionItem>
    );
};

const AccordionTriggerRender: BlokRender<Contracts['AccordionTrigger']> = ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const label = useValue(blok.label);
    const icon = useValue(blok.icon);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadAccordionTrigger className={className}>
        {renderIcon(icon)}
        {renderContent(children ?? label, buildChild)}
      </ShadAccordionTrigger>
    );
};

const AccordionContentRender: BlokRender<Contracts['AccordionContent']> = ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadAccordionContent className={className}>
        {renderChildList(children, buildChild)}
      </ShadAccordionContent>
    );
};

const CollapsibleRender: BlokRender<Contracts['Collapsible']> = ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    // Interaction state is the component's own (v2: no `bind` on a stateful component).
    const bind = undefined;
    const open = useValue(blok.open);
    const defaultOpen = useValue(blok.defaultOpen);
    const className = useValue(blok.className);
    const onChange = useEventAction(blok.onChange);

    const controlled = useControlledValue<boolean>({
      bind,
      value: open,
      defaultValue: defaultOpen,
      fallback: false,
      parse: asBoolean,
    });

    return (
      <ShadCollapsible
        open={controlled.value}
        className={className}
        onOpenChange={next => {
          controlled.setValue(next);
          onChange?.(next);
        }}
      >
        {renderChildList(children, buildChild)}
      </ShadCollapsible>
    );
};

const CollapsibleTriggerRender: BlokRender<Contracts['CollapsibleTrigger']> = ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const label = useValue(blok.label);
    const icon = useValue(blok.icon);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadCollapsibleTrigger className={className}>
        {renderIcon(icon)}
        {renderContent(children ?? label, buildChild)}
      </ShadCollapsibleTrigger>
    );
};

const CollapsibleContentRender: BlokRender<Contracts['CollapsibleContent']> = ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadCollapsibleContent className={className}>
        {renderChildList(children, buildChild)}
      </ShadCollapsibleContent>
    );
};

const BreadcrumbRender: BlokRender<Contracts['Breadcrumb']> = ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadBreadcrumb className={className}>
        <ShadBreadcrumbList>{renderChildList(children, buildChild)}</ShadBreadcrumbList>
      </ShadBreadcrumb>
    );
};

const BreadcrumbItemRender: BlokRender<Contracts['BreadcrumbItem']> = ({component, schema}) => {
    const blok = useBlok(component, schema);
    const label = useValue(blok.label);
    const href = useValue(blok.href);
    const current = useValue(blok.current);
    const onClick = useAction(blok.onClick);
    const className = useValue(blok.className);

    return (
      <ShadBreadcrumbItem className={className}>
        {current ? (
          <ShadBreadcrumbPage>{label}</ShadBreadcrumbPage>
        ) : (
          <ShadBreadcrumbLink href={href} onClick={onClick}>
            {label}
          </ShadBreadcrumbLink>
        )}
      </ShadBreadcrumbItem>
    );
};

const BreadcrumbSeparatorRender: BlokRender<Contracts['BreadcrumbSeparator']> = ({component, schema}) => {
    const blok = useBlok(component, schema);
    const className = useValue(blok.className);

    return <ShadBreadcrumbSeparator className={className} />;
};

const PaginationRender: BlokRender<Contracts['Pagination']> = ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadPagination className={className}>
        <ShadPaginationContent>{renderChildList(children, buildChild)}</ShadPaginationContent>
      </ShadPagination>
    );
};

const PaginationItemRender: BlokRender<Contracts['PaginationItem']> = ({component, schema}) => {
    const blok = useBlok(component, schema);
    const label = useValue(blok.label);
    const kind = useValue(blok.kind);
    const active = useValue(blok.active);
    const onClick = useAction(blok.onClick);
    const className = useValue(blok.className);

    return (
      <ShadPaginationItem className={className}>
        {kind === 'ellipsis' ? (
          <ShadPaginationEllipsis />
        ) : kind === 'previous' ? (
          <ShadPaginationPrevious onClick={onClick} />
        ) : kind === 'next' ? (
          <ShadPaginationNext onClick={onClick} />
        ) : (
          <ShadPaginationLink isActive={active} onClick={onClick}>
            {label}
          </ShadPaginationLink>
        )}
      </ShadPaginationItem>
    );
};

const MenubarRender: BlokRender<Contracts['Menubar']> = ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadMenubar className={className}>{renderChildList(children, buildChild)}</ShadMenubar>
    );
};

const MenubarMenuRender: BlokRender<Contracts['MenubarMenu']> = ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const label = useValue(blok.label);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadMenubarMenu>
        <ShadMenubarTrigger className={className}>{label}</ShadMenubarTrigger>
        <ShadMenubarContent>{renderChildList(children, buildChild)}</ShadMenubarContent>
      </ShadMenubarMenu>
    );
};

const MenubarItemRender: BlokRender<Contracts['MenubarItem']> = ({component, schema}) => {
    const blok = useBlok(component, schema);
    const label = useValue(blok.label);
    const icon = useValue(blok.icon);
    const onSelect = useAction(blok.onSelect);
    const disabled = useValue(blok.disabled);
    const className = useValue(blok.className);

    return (
      <ShadMenubarItem
        disabled={disabled === true}
        className={className}
        onSelect={() => onSelect?.()}
      >
        {renderIcon(icon)}
        {label}
      </ShadMenubarItem>
    );
};

const MenubarSeparatorRender: BlokRender<Contracts['MenubarSeparator']> = ({component, schema}) => {
    const blok = useBlok(component, schema);
    const className = useValue(blok.className);

    return <ShadMenubarSeparator className={className} />;
};

export const navigationRenders = {
  Tabs: TabsRender,
  TabsList: TabsListRender,
  TabsTrigger: TabsTriggerRender,
  TabsContent: TabsContentRender,
  Accordion: AccordionRender,
  AccordionItem: AccordionItemRender,
  AccordionTrigger: AccordionTriggerRender,
  AccordionContent: AccordionContentRender,
  Collapsible: CollapsibleRender,
  CollapsibleTrigger: CollapsibleTriggerRender,
  CollapsibleContent: CollapsibleContentRender,
  Breadcrumb: BreadcrumbRender,
  BreadcrumbItem: BreadcrumbItemRender,
  BreadcrumbSeparator: BreadcrumbSeparatorRender,
  Pagination: PaginationRender,
  PaginationItem: PaginationItemRender,
  Menubar: MenubarRender,
  MenubarMenu: MenubarMenuRender,
  MenubarItem: MenubarItemRender,
  MenubarSeparator: MenubarSeparatorRender,
};
