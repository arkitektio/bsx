import * as React from 'react';
import {
  AlertDialog as ShadAlertDialog,
  AlertDialogAction as ShadAlertDialogAction,
  AlertDialogCancel as ShadAlertDialogCancel,
  AlertDialogContent as ShadAlertDialogContent,
  AlertDialogDescription as ShadAlertDialogDescription,
  AlertDialogFooter as ShadAlertDialogFooter,
  AlertDialogHeader as ShadAlertDialogHeader,
  AlertDialogTitle as ShadAlertDialogTitle,
  AlertDialogTrigger as ShadAlertDialogTrigger,
} from '../../vendor/core/ui/alert-dialog';
import {
  ContextMenu as ShadContextMenu,
  ContextMenuCheckboxItem as ShadContextMenuCheckboxItem,
  ContextMenuContent as ShadContextMenuContent,
  ContextMenuItem as ShadContextMenuItem,
  ContextMenuLabel as ShadContextMenuLabel,
  ContextMenuSeparator as ShadContextMenuSeparator,
  ContextMenuTrigger as ShadContextMenuTrigger,
} from '../../vendor/core/ui/context-menu';
import {
  Dialog as ShadDialog,
  DialogClose as ShadDialogClose,
  DialogContent as ShadDialogContent,
  DialogDescription as ShadDialogDescription,
  DialogFooter as ShadDialogFooter,
  DialogHeader as ShadDialogHeader,
  DialogTitle as ShadDialogTitle,
  DialogTrigger as ShadDialogTrigger,
} from '../../vendor/core/ui/dialog';
import {
  Drawer as ShadDrawer,
  DrawerContent as ShadDrawerContent,
  DrawerDescription as ShadDrawerDescription,
  DrawerFooter as ShadDrawerFooter,
  DrawerHeader as ShadDrawerHeader,
  DrawerTitle as ShadDrawerTitle,
  DrawerTrigger as ShadDrawerTrigger,
} from '../../vendor/core/ui/drawer';
import {
  DropdownMenu as ShadDropdownMenu,
  DropdownMenuCheckboxItem as ShadDropdownMenuCheckboxItem,
  DropdownMenuContent as ShadDropdownMenuContent,
  DropdownMenuItem as ShadDropdownMenuItem,
  DropdownMenuLabel as ShadDropdownMenuLabel,
  DropdownMenuSeparator as ShadDropdownMenuSeparator,
  DropdownMenuTrigger as ShadDropdownMenuTrigger,
} from '../../vendor/core/ui/dropdown-menu';
import {
  HoverCard as ShadHoverCard,
  HoverCardContent as ShadHoverCardContent,
  HoverCardTrigger as ShadHoverCardTrigger,
} from '../../vendor/core/ui/hover-card';
import {
  Popover as ShadPopover,
  PopoverContent as ShadPopoverContent,
  PopoverTrigger as ShadPopoverTrigger,
} from '../../vendor/core/ui/popover';
import {
  Sheet as ShadSheet,
  SheetContent as ShadSheetContent,
  SheetDescription as ShadSheetDescription,
  SheetFooter as ShadSheetFooter,
  SheetHeader as ShadSheetHeader,
  SheetTitle as ShadSheetTitle,
  SheetTrigger as ShadSheetTrigger,
} from '../../vendor/core/ui/sheet';
import {
  Tooltip as ShadTooltip,
  TooltipContent as ShadTooltipContent,
  TooltipTrigger as ShadTooltipTrigger,
} from '../../vendor/core/ui/tooltip';
import type {overlayContracts} from '../../catalogs/parts/overlays';
import {useAction, useBlok, useEventAction, useValue, type BlokRender} from '../runtime';
import {renderIcon} from './icons';
import {
  asBoolean,
  renderChildList,
  renderContent,
  useControlledValue,
} from './shared';

type Contracts = typeof overlayContracts;

/**
 * Overlay surfaces: dialogs, sheets, popovers, tooltips and menus.
 *
 * Each family is a Radix root plus its parts, and each part is its own blok.
 * The parts find their root through React context, which reaches them because
 * `buildChild` renders a real child element — see `shared/render.tsx`.
 *
 * The one thing this rules out is `asChild`: `BlokNode` is a memo component
 * and does not forward refs, so a Radix Slot around a child blok would fail.
 * That is why every trigger is a blok that renders the Radix trigger *itself*
 * and puts the label inside, rather than a wrapper around a Button blok.
 */

type OverlayRootComponent = React.ComponentType<{
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}>;

/**
 * Open/closed state follows the same rules as a form control's value: `open`
 * wins, then a `bind` path, and with neither the surface keeps its own state.
 */
const overlayRootRender =
  (Root: OverlayRootComponent): BlokRender<Contracts['Dialog']> =>
  ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const children = useValue(blok.children);
      // Interaction state is the component's own (v2: no `bind` on a stateful component).
      const bind = undefined;
      const open = useValue(blok.open);
      const defaultOpen = useValue(blok.defaultOpen);
      const onOpenChange = useEventAction(blok.onOpenChange);

      const controlled = useControlledValue<boolean>({
        bind,
        value: open,
        defaultValue: defaultOpen,
        fallback: false,
        parse: asBoolean,
      });

      return (
        <Root
          open={controlled.value}
          onOpenChange={next => {
            controlled.setValue(next);
            onOpenChange?.(next);
          }}
        >
          {renderChildList(children, buildChild)}
        </Root>
      );
  };

type TriggerComponent = React.ComponentType<{
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}>;

const triggerRender =
  (Trigger: TriggerComponent): BlokRender<Contracts['DialogTrigger']> =>
  ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const label = useValue(blok.label);
      const icon = useValue(blok.icon);
      const children = useValue(blok.children);
      const disabled = useValue(blok.disabled);
      const className = useValue(blok.className);

      return (
        <Trigger disabled={disabled === true} className={className}>
          {renderIcon(icon)}
          {renderContent(children ?? label, buildChild)}
        </Trigger>
      );
  };

type PanelComponent = React.ComponentType<{
  className?: string;
  children?: React.ReactNode;
}>;

/** A part that is just "a styled box of children" — headers, footers, bodies. */
const panelRender =
  (Panel: PanelComponent): BlokRender<Contracts['DialogHeader']> =>
  ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const children = useValue(blok.children);
      const className = useValue(blok.className);

      return <Panel className={className}>{renderChildList(children, buildChild)}</Panel>;
  };

type TextPartComponent = React.ComponentType<{
  className?: string;
  children?: React.ReactNode;
}>;

/** A part that carries a single line of text — titles and descriptions. */
const textPartRender =
  (Part: TextPartComponent): BlokRender<Contracts['DialogTitle']> =>
  ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const text = useValue(blok.text);
      const children = useValue(blok.children);
      const className = useValue(blok.className);

      return <Part className={className}>{renderContent(children ?? text, buildChild)}</Part>;
  };

/* -------------------------------------------------------------------------- */
/* Dialog                                                                     */
/* -------------------------------------------------------------------------- */

const DialogContentRender: BlokRender<Contracts['DialogContent']> = ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const showCloseButton = useValue(blok.showCloseButton);
    const className = useValue(blok.className);

    return (
      <ShadDialogContent showCloseButton={showCloseButton ?? true} className={className}>
        {renderChildList(children, buildChild)}
      </ShadDialogContent>
    );
};

/* -------------------------------------------------------------------------- */
/* AlertDialog                                                                */
/* -------------------------------------------------------------------------- */

const AlertDialogActionRender: BlokRender<Contracts['AlertDialogAction']> = ({component, schema}) => {
    const blok = useBlok(component, schema);
    const label = useValue(blok.label);
    const onClick = useAction(blok.onClick);
    const className = useValue(blok.className);

    return (
      <ShadAlertDialogAction onClick={onClick} className={className}>
        {label ?? 'Continue'}
      </ShadAlertDialogAction>
    );
};
const AlertDialogCancelRender: BlokRender<Contracts['AlertDialogCancel']> = ({component, schema}) => {
    const blok = useBlok(component, schema);
    const label = useValue(blok.label);
    const className = useValue(blok.className);

    return <ShadAlertDialogCancel className={className}>{label ?? 'Cancel'}</ShadAlertDialogCancel>;
};

/* -------------------------------------------------------------------------- */
/* Sheet and Drawer                                                           */
/* -------------------------------------------------------------------------- */

const SheetContentRender: BlokRender<Contracts['SheetContent']> = ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const side = useValue(blok.side);
    const showCloseButton = useValue(blok.showCloseButton);
    const className = useValue(blok.className);

    return (
      <ShadSheetContent
        side={side ?? 'right'}
        showCloseButton={showCloseButton ?? true}
        className={className}
      >
        {renderChildList(children, buildChild)}
      </ShadSheetContent>
    );
};

/* -------------------------------------------------------------------------- */
/* Popover, Tooltip, HoverCard                                                */
/* -------------------------------------------------------------------------- */

/** The three anchored surfaces share one content shape. */
type AnchoredContentComponent = React.ComponentType<{
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  className?: string;
  children?: React.ReactNode;
}>;

const anchoredContentRender =
  (Content: AnchoredContentComponent): BlokRender<Contracts['PopoverContent']> =>
  ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const children = useValue(blok.children);
      const side = useValue(blok.side);
      const align = useValue(blok.align);
      const sideOffset = useValue(blok.sideOffset);
      const className = useValue(blok.className);

      return (
        <Content side={side} align={align} sideOffset={sideOffset} className={className}>
          {renderContent(children, buildChild)}
        </Content>
      );
  };

/* -------------------------------------------------------------------------- */
/* Menus                                                                      */
/* -------------------------------------------------------------------------- */

type MenuItemComponent = React.ComponentType<{
  disabled?: boolean;
  variant?: 'default' | 'destructive';
  className?: string;
  onSelect?: (event: Event) => void;
  children?: React.ReactNode;
}>;

const menuItemRender =
  (Item: MenuItemComponent): BlokRender<Contracts['DropdownMenuItem']> =>
  ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const label = useValue(blok.label);
      const icon = useValue(blok.icon);
      const children = useValue(blok.children);
      const onSelect = useAction(blok.onSelect);
      const variant = useValue(blok.variant);
      const disabled = useValue(blok.disabled);
      const className = useValue(blok.className);

      return (
        <Item
          disabled={disabled === true}
          variant={variant ?? 'default'}
          className={className}
          onSelect={() => onSelect?.()}
        >
          {renderIcon(icon)}
          {renderContent(children ?? label, buildChild)}
        </Item>
      );
  };

type MenuCheckboxItemComponent = React.ComponentType<{
  checked?: boolean;
  disabled?: boolean;
  className?: string;
  onCheckedChange?: (checked: boolean) => void;
  children?: React.ReactNode;
}>;

const menuCheckboxItemRender =
  (Item: MenuCheckboxItemComponent): BlokRender<Contracts['DropdownMenuCheckboxItem']> =>
  ({component, schema}) => {
      const blok = useBlok(component, schema);
      const label = useValue(blok.label);
      const bind = useValue(blok.bind);
      const checked = useValue(blok.checked);
      const disabled = useValue(blok.disabled);
      const className = useValue(blok.className);
      const onChange = useEventAction(blok.onChange);

      const controlled = useControlledValue<boolean>({
        bind,
        value: checked,
        defaultValue: undefined,
        fallback: false,
        parse: asBoolean,
      });

      return (
        <Item
          checked={controlled.value}
          disabled={disabled === true}
          className={className}
          onCheckedChange={next => {
            controlled.setValue(next);
            onChange?.(next);
          }}
        >
          {label}
        </Item>
      );
  };

const DropdownMenuSeparatorRender: BlokRender<Contracts['DropdownMenuSeparator']> = ({component, schema}) => {
    const blok = useBlok(component, schema);
    const className = useValue(blok.className);

    return <ShadDropdownMenuSeparator className={className} />;
};

const ContextMenuTriggerRender: BlokRender<Contracts['ContextMenuTrigger']> = ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const disabled = useValue(blok.disabled);
    const className = useValue(blok.className);

    return (
      <ShadContextMenuTrigger disabled={disabled === true} className={className}>
        {renderContent(children, buildChild)}
      </ShadContextMenuTrigger>
    );
};
const ContextMenuSeparatorRender: BlokRender<Contracts['ContextMenuSeparator']> = ({component, schema}) => {
    const blok = useBlok(component, schema);
    const className = useValue(blok.className);

    return <ShadContextMenuSeparator className={className} />;
};

export const overlayRenders = {
  Dialog: overlayRootRender(ShadDialog),
  DialogTrigger: triggerRender(ShadDialogTrigger),
  DialogContent: DialogContentRender,
  DialogHeader: panelRender(ShadDialogHeader),
  DialogFooter: panelRender(ShadDialogFooter),
  DialogTitle: textPartRender(ShadDialogTitle),
  DialogDescription: textPartRender(ShadDialogDescription),
  DialogClose: triggerRender(ShadDialogClose),
  AlertDialog: overlayRootRender(ShadAlertDialog),
  AlertDialogTrigger: triggerRender(ShadAlertDialogTrigger),
  AlertDialogContent: panelRender(ShadAlertDialogContent),
  AlertDialogHeader: panelRender(ShadAlertDialogHeader),
  AlertDialogFooter: panelRender(ShadAlertDialogFooter),
  AlertDialogTitle: textPartRender(ShadAlertDialogTitle),
  AlertDialogDescription: textPartRender(ShadAlertDialogDescription),
  AlertDialogAction: AlertDialogActionRender,
  AlertDialogCancel: AlertDialogCancelRender,
  Sheet: overlayRootRender(ShadSheet),
  SheetTrigger: triggerRender(ShadSheetTrigger),
  SheetContent: SheetContentRender,
  SheetHeader: panelRender(ShadSheetHeader),
  SheetFooter: panelRender(ShadSheetFooter),
  SheetTitle: textPartRender(ShadSheetTitle),
  SheetDescription: textPartRender(ShadSheetDescription),
  Drawer: overlayRootRender(ShadDrawer),
  DrawerTrigger: triggerRender(ShadDrawerTrigger),
  DrawerContent: panelRender(ShadDrawerContent),
  DrawerHeader: panelRender(ShadDrawerHeader),
  DrawerFooter: panelRender(ShadDrawerFooter),
  DrawerTitle: textPartRender(ShadDrawerTitle),
  DrawerDescription: textPartRender(ShadDrawerDescription),
  Popover: overlayRootRender(ShadPopover),
  PopoverTrigger: triggerRender(ShadPopoverTrigger),
  PopoverContent: anchoredContentRender(ShadPopoverContent),
  Tooltip: overlayRootRender(ShadTooltip),
  TooltipTrigger: triggerRender(ShadTooltipTrigger),
  TooltipContent: anchoredContentRender(ShadTooltipContent),
  HoverCard: overlayRootRender(ShadHoverCard),
  HoverCardTrigger: triggerRender(ShadHoverCardTrigger),
  HoverCardContent: anchoredContentRender(ShadHoverCardContent),
  DropdownMenu: overlayRootRender(ShadDropdownMenu),
  DropdownMenuTrigger: triggerRender(ShadDropdownMenuTrigger),
  DropdownMenuContent: panelRender(ShadDropdownMenuContent),
  DropdownMenuLabel: textPartRender(ShadDropdownMenuLabel),
  DropdownMenuItem: menuItemRender(ShadDropdownMenuItem),
  DropdownMenuCheckboxItem: menuCheckboxItemRender(ShadDropdownMenuCheckboxItem),
  DropdownMenuSeparator: DropdownMenuSeparatorRender,
  ContextMenu: overlayRootRender(ShadContextMenu),
  ContextMenuTrigger: ContextMenuTriggerRender,
  ContextMenuContent: panelRender(ShadContextMenuContent),
  ContextMenuLabel: textPartRender(ShadContextMenuLabel),
  ContextMenuItem: menuItemRender(ShadContextMenuItem),
  ContextMenuCheckboxItem: menuCheckboxItemRender(ShadContextMenuCheckboxItem),
  ContextMenuSeparator: ContextMenuSeparatorRender,
};
