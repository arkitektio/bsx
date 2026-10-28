import * as z from 'zod';
import type {BlokComponentContracts} from '../../renderer/runtime/catalog';
import {BlokPropSchemas} from '../../renderer/runtime/schemas';
import {
  actionProp,
  alignmentSchema,
  bindSchema,
  boolSchema,
  childListSchema,
  classNameSchema,
  contentSchema,
  disabledSchema,
  sideSchema,
} from '../props';
import {iconNameSchema} from './icons';

/**
 * Overlay surfaces: dialogs, sheets, popovers, tooltips and menus.
 *
 * Each family is a root plus its parts, and most parts share a shape with
 * their counterparts in other families: one schema factory per shape, called
 * once per member with that member's description.
 */

/**
 * Open/closed state follows the same rules as a form control's value: `open`
 * wins, then a `bind` path, and with neither the surface keeps its own state.
 */
const overlayRootSchema = (description: string) =>
  z
    .object({
      children: childListSchema.describe('The trigger and content parts of this overlay.'),
      open: BlokPropSchemas.DynamicBoolean.optional().describe('Controlled open state.'),
      defaultOpen: boolSchema.describe('Open on mount when uncontrolled.'),
      onOpenChange: actionProp('Runs when the surface opens or closes. May read event.value.'),
    })
    .describe(description);

const triggerSchema = (description: string) =>
  z
    .object({
      label: BlokPropSchemas.DynamicString.optional().describe('Trigger text.'),
      icon: iconNameSchema.describe('Icon rendered before the label.'),
      children: contentSchema,
      disabled: disabledSchema,
      className: classNameSchema,
    })
    .describe(description);

/** A part that is just "a styled box of children" — headers, footers, bodies. */
const panelSchema = (description: string) =>
  z
    .object({
      children: childListSchema,
      className: classNameSchema,
    })
    .describe(description);

/** A part that carries a single line of text — titles and descriptions. */
const textPartSchema = (description: string) =>
  z
    .object({
      text: BlokPropSchemas.DynamicString.optional().describe('The text to render.'),
      children: contentSchema,
      className: classNameSchema,
    })
    .describe(description);

/** The three anchored surfaces share one content shape. */
const anchoredContentSchema = (description: string) =>
  z
    .object({
      children: contentSchema,
      side: sideSchema,
      align: alignmentSchema,
      sideOffset: z.number().optional().describe('Distance from the trigger, in pixels.'),
      className: classNameSchema,
    })
    .describe(description);

const menuItemSchema = (description: string) =>
  z
    .object({
      label: BlokPropSchemas.DynamicString.optional().describe('Item text.'),
      icon: iconNameSchema.describe('Icon rendered before the label.'),
      children: contentSchema,
      onSelect: actionProp('Runs when the item is chosen.'),
      variant: z
        .enum(['default', 'destructive'])
        .optional()
        .describe('Item appearance.'),
      disabled: disabledSchema,
      className: classNameSchema,
    })
    .describe(description);

const menuCheckboxItemSchema = (description: string) =>
  z
    .object({
      label: BlokPropSchemas.DynamicString.optional().describe('Item text.'),
      bind: bindSchema,
      checked: BlokPropSchemas.DynamicBoolean.optional().describe('Controlled checked state.'),
      disabled: disabledSchema,
      className: classNameSchema,
      onChange: actionProp('Runs on toggle. Arguments may read event.value.'),
    })
    .describe(description);

export const overlayContracts = {
  /* Dialog */
  Dialog: {schema: overlayRootSchema('A modal dialog.')},
  DialogTrigger: {schema: triggerSchema('The control that opens a Dialog.')},
  DialogContent: {
    schema: z
      .object({
        children: childListSchema,
        showCloseButton: boolSchema.describe('Show the corner close button. Defaults to true.'),
        className: classNameSchema,
      })
      .describe('The modal panel of a Dialog.'),
  },
  DialogHeader: {schema: panelSchema('The header region of a DialogContent.')},
  DialogFooter: {schema: panelSchema('The footer region of a DialogContent.')},
  DialogTitle: {schema: textPartSchema('The accessible title of a Dialog.')},
  DialogDescription: {schema: textPartSchema('Supporting text under a DialogTitle.')},
  DialogClose: {schema: triggerSchema('A control that closes the surrounding Dialog.')},

  /* AlertDialog */
  AlertDialog: {schema: overlayRootSchema('A modal dialog that interrupts to confirm a decision.')},
  AlertDialogTrigger: {schema: triggerSchema('The control that opens an AlertDialog.')},
  AlertDialogContent: {schema: panelSchema('The modal panel of an AlertDialog.')},
  AlertDialogHeader: {schema: panelSchema('The header region of an AlertDialogContent.')},
  AlertDialogFooter: {schema: panelSchema('The footer region of an AlertDialogContent.')},
  AlertDialogTitle: {schema: textPartSchema('The accessible title of an AlertDialog.')},
  AlertDialogDescription: {schema: textPartSchema('Supporting text under an AlertDialogTitle.')},
  AlertDialogAction: {
    schema: z
      .object({
        label: BlokPropSchemas.DynamicString.optional().describe('Button text.'),
        onClick: actionProp('Runs when the action is confirmed.'),
        className: classNameSchema,
      })
      .describe('The confirming button of an AlertDialog; closes it when clicked.'),
  },
  AlertDialogCancel: {
    schema: z
      .object({
        label: BlokPropSchemas.DynamicString.optional().describe('Button text.'),
        className: classNameSchema,
      })
      .describe('The dismissing button of an AlertDialog.'),
  },

  /* Sheet and Drawer */
  Sheet: {schema: overlayRootSchema('A panel that slides in from an edge.')},
  SheetTrigger: {schema: triggerSchema('The control that opens a Sheet.')},
  SheetContent: {
    schema: z
      .object({
        children: childListSchema,
        side: sideSchema,
        showCloseButton: boolSchema.describe('Show the corner close button. Defaults to true.'),
        className: classNameSchema,
      })
      .describe('The sliding panel of a Sheet.'),
  },
  SheetHeader: {schema: panelSchema('The header region of a SheetContent.')},
  SheetFooter: {schema: panelSchema('The footer region of a SheetContent.')},
  SheetTitle: {schema: textPartSchema('The accessible title of a Sheet.')},
  SheetDescription: {schema: textPartSchema('Supporting text under a SheetTitle.')},
  Drawer: {schema: overlayRootSchema('A panel that slides up from the bottom edge.')},
  DrawerTrigger: {schema: triggerSchema('The control that opens a Drawer.')},
  DrawerContent: {schema: panelSchema('The sliding panel of a Drawer.')},
  DrawerHeader: {schema: panelSchema('The header region of a DrawerContent.')},
  DrawerFooter: {schema: panelSchema('The footer region of a DrawerContent.')},
  DrawerTitle: {schema: textPartSchema('The accessible title of a Drawer.')},
  DrawerDescription: {schema: textPartSchema('Supporting text under a DrawerTitle.')},

  /* Popover, Tooltip, HoverCard */
  Popover: {schema: overlayRootSchema('A surface anchored to a trigger, opened on click.')},
  PopoverTrigger: {schema: triggerSchema('The control that opens a Popover.')},
  PopoverContent: {schema: anchoredContentSchema('The floating panel of a Popover.')},
  Tooltip: {schema: overlayRootSchema('A short hint shown on hover or focus.')},
  TooltipTrigger: {schema: triggerSchema('The element a Tooltip describes.')},
  TooltipContent: {schema: anchoredContentSchema('The hint shown by a Tooltip.')},
  HoverCard: {schema: overlayRootSchema('A rich preview surface shown on hover.')},
  HoverCardTrigger: {schema: triggerSchema('The element a HoverCard previews.')},
  HoverCardContent: {schema: anchoredContentSchema('The floating panel of a HoverCard.')},

  /* Menus */
  DropdownMenu: {schema: overlayRootSchema('A menu opened from a button.')},
  DropdownMenuTrigger: {schema: triggerSchema('The control that opens a DropdownMenu.')},
  DropdownMenuContent: {schema: panelSchema('The menu panel of a DropdownMenu.')},
  DropdownMenuLabel: {schema: textPartSchema('A non-interactive heading inside a menu.')},
  DropdownMenuItem: {schema: menuItemSchema('One selectable item in a DropdownMenu.')},
  DropdownMenuCheckboxItem: {schema: menuCheckboxItemSchema('A menu item bound to a boolean value.')},
  DropdownMenuSeparator: {
    schema: z.object({className: classNameSchema}).describe('A divider between menu groups.'),
  },
  ContextMenu: {schema: overlayRootSchema('A menu opened by right-clicking its trigger.')},
  ContextMenuTrigger: {
    schema: z
      .object({
        children: contentSchema,
        disabled: disabledSchema,
        className: classNameSchema,
      })
      .describe('The region that opens a ContextMenu on right-click.'),
  },
  ContextMenuContent: {schema: panelSchema('The menu panel of a ContextMenu.')},
  ContextMenuLabel: {schema: textPartSchema('A non-interactive heading inside a context menu.')},
  ContextMenuItem: {schema: menuItemSchema('One selectable item in a ContextMenu.')},
  ContextMenuCheckboxItem: {
    schema: menuCheckboxItemSchema('A context-menu item bound to a boolean value.'),
  },
  ContextMenuSeparator: {
    schema: z
      .object({className: classNameSchema})
      .describe('A divider between context-menu groups.'),
  },
} satisfies BlokComponentContracts;
