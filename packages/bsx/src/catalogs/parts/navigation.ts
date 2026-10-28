import * as z from 'zod';
import type {BlokComponentContracts} from '../../renderer/runtime/catalog';
import {BlokPropSchemas} from '../../renderer/runtime/schemas';
import {actionProp, boolSchema, childListSchema, classNameSchema, contentSchema, disabledSchema} from '../props';
import {iconNameSchema} from './icons';

/**
 * Navigation and disclosure bloks: `Tabs`, `Accordion`, `Collapsible`,
 * `Breadcrumb`, `Pagination` and `Menubar`, each a root plus its parts.
 */

export const navigationContracts = {
  Tabs: {
    schema: z
      .object({
        children: childListSchema.describe('A TabsList plus one TabsContent per tab.'),
        value: BlokPropSchemas.DynamicString.optional().describe('Controlled active tab.'),
        defaultValue: BlokPropSchemas.DynamicString.optional().describe('Initially active tab.'),
        className: classNameSchema,
        onChange: actionProp('Runs when the active tab changes. May read event.value.'),
      })
      .describe('A tabbed surface.'),
  },
  TabsList: {
    schema: z
      .object({
        children: childListSchema.describe('TabsTrigger children.'),
        className: classNameSchema,
      })
      .describe('The row of tab triggers.'),
  },
  TabsTrigger: {
    schema: z
      .object({
        value: z.string().describe('The tab this trigger activates.'),
        label: BlokPropSchemas.DynamicString.optional().describe('Trigger text.'),
        icon: iconNameSchema.describe('Icon rendered before the label.'),
        disabled: disabledSchema,
        className: classNameSchema,
      })
      .describe('One tab in a TabsList.'),
  },
  TabsContent: {
    schema: z
      .object({
        value: z.string().describe('The tab this panel belongs to.'),
        children: childListSchema,
        className: classNameSchema,
      })
      .describe('The panel shown for one tab.'),
  },
  Accordion: {
    schema: z
      .object({
        children: childListSchema.describe('AccordionItem children.'),
        multiple: boolSchema.describe('Allow more than one section open at a time.'),
        defaultValue: BlokPropSchemas.DynamicString.optional().describe('Initially open item.'),
        collapsible: boolSchema.describe(
          'Allow closing the open section in single mode. Defaults to true.',
        ),
        className: classNameSchema,
        onChange: actionProp('Runs when the open sections change. May read event.value.'),
      })
      .describe('A stack of collapsible sections.'),
  },
  AccordionItem: {
    schema: z
      .object({
        value: z.string().describe('Identifies this section.'),
        children: childListSchema.describe('An AccordionTrigger and an AccordionContent.'),
        disabled: disabledSchema,
        className: classNameSchema,
      })
      .describe('One section of an Accordion.'),
  },
  AccordionTrigger: {
    schema: z
      .object({
        label: BlokPropSchemas.DynamicString.optional().describe('Section heading.'),
        icon: iconNameSchema.describe('Icon rendered before the label.'),
        children: contentSchema,
        className: classNameSchema,
      })
      .describe('The clickable heading of an AccordionItem.'),
  },
  AccordionContent: {
    schema: z
      .object({
        children: childListSchema,
        className: classNameSchema,
      })
      .describe('The body of an AccordionItem.'),
  },
  Collapsible: {
    schema: z
      .object({
        children: childListSchema.describe('A CollapsibleTrigger and a CollapsibleContent.'),
        open: BlokPropSchemas.DynamicBoolean.optional().describe('Controlled open state.'),
        defaultOpen: boolSchema.describe('Open on mount when uncontrolled.'),
        className: classNameSchema,
        onChange: actionProp('Runs when it opens or closes. May read event.value.'),
      })
      .describe('A single region that can be shown or hidden.'),
  },
  CollapsibleTrigger: {
    schema: z
      .object({
        label: BlokPropSchemas.DynamicString.optional().describe('Trigger text.'),
        icon: iconNameSchema.describe('Icon rendered before the label.'),
        children: contentSchema,
        className: classNameSchema,
      })
      .describe('The control that shows or hides a Collapsible.'),
  },
  CollapsibleContent: {
    schema: z
      .object({
        children: childListSchema,
        className: classNameSchema,
      })
      .describe('The region a Collapsible shows or hides.'),
  },
  Breadcrumb: {
    schema: z
      .object({
        children: childListSchema.describe('BreadcrumbItem and BreadcrumbSeparator children.'),
        className: classNameSchema,
      })
      .describe('A trail of links back up the hierarchy.'),
  },
  BreadcrumbItem: {
    schema: z
      .object({
        label: BlokPropSchemas.DynamicString.optional().describe('Crumb text.'),
        href: BlokPropSchemas.DynamicString.optional().describe('Link target.'),
        current: boolSchema.describe('Render as the current page rather than a link.'),
        onClick: actionProp('Runs when the crumb is clicked.'),
        className: classNameSchema,
      })
      .describe('One crumb in a Breadcrumb.'),
  },
  BreadcrumbSeparator: {
    schema: z.object({className: classNameSchema}).describe('The divider between two crumbs.'),
  },
  Pagination: {
    schema: z
      .object({
        children: childListSchema.describe('PaginationItem children.'),
        className: classNameSchema,
      })
      .describe('Page navigation controls.'),
  },
  PaginationItem: {
    schema: z
      .object({
        label: BlokPropSchemas.DynamicString.optional().describe('Page label.'),
        kind: z
          .enum(['page', 'previous', 'next', 'ellipsis'])
          .optional()
          .describe('Which control this item is. Defaults to "page".'),
        active: boolSchema.describe('Mark as the current page.'),
        onClick: actionProp('Runs when the control is clicked.'),
        className: classNameSchema,
      })
      .describe('One control inside a Pagination.'),
  },
  Menubar: {
    schema: z
      .object({
        children: childListSchema.describe('MenubarMenu children.'),
        className: classNameSchema,
      })
      .describe('A horizontal bar of menus.'),
  },
  MenubarMenu: {
    schema: z
      .object({
        label: BlokPropSchemas.DynamicString.optional().describe('Menu title in the bar.'),
        children: childListSchema.describe('MenubarItem children.'),
        className: classNameSchema,
      })
      .describe('One menu in a Menubar, with its trigger and items.'),
  },
  MenubarItem: {
    schema: z
      .object({
        label: BlokPropSchemas.DynamicString.optional().describe('Item text.'),
        icon: iconNameSchema.describe('Icon rendered before the label.'),
        onSelect: actionProp('Runs when the item is chosen.'),
        disabled: disabledSchema,
        className: classNameSchema,
      })
      .describe('One item inside a MenubarMenu.'),
  },
  MenubarSeparator: {
    schema: z.object({className: classNameSchema}).describe('A divider between menu groups.'),
  },
} satisfies BlokComponentContracts;
