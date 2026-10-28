import * as z from 'zod';
import type {BlokComponentContracts} from '../../renderer/runtime/catalog';
import {BlokPropSchemas, markBindSchema} from '../../renderer/runtime/schemas';
import {
  actionProp,
  bindSchema,
  boolSchema,
  buttonSizeSchema,
  buttonVariantSchema,
  checksSchema,
  childListSchema,
  classNameSchema,
  contentSchema,
  disabledSchema,
  numberSchema,
  orientationSchema,
} from '../props';
import {iconNameSchema} from './icons';

/**
 * Buttons and form controls. Every value-carrying control takes `bind` (a
 * data-model path it reads and writes) or `value`/`defaultValue`, and its
 * change action fires after the write, with the new value as `event.value`.
 * Multi-part controls (`Select`, `RadioGroup`, `ToggleGroup`) are composed
 * from subcomponents.
 */

/** `Checkbox` and `Switch` are the same contract over two presentations. */
const booleanControlSchema = (description: string) =>
  z
    .object({
      bind: bindSchema,
      checked: BlokPropSchemas.DynamicBoolean.optional().describe('Controlled checked state.'),
      defaultChecked: boolSchema.describe('Initial state when uncontrolled.'),
      label: BlokPropSchemas.DynamicString.optional().describe('Text shown beside the control.'),
      disabled: disabledSchema,
      className: classNameSchema,
      onChange: actionProp('Runs on toggle. Arguments may read event.value.'),
      checks: checksSchema,
    })
    .describe(description);

export const formContracts = {
  Button: {
    schema: z
      .object({
        label: BlokPropSchemas.DynamicString.optional().describe('Button text.'),
        children: contentSchema,
        icon: iconNameSchema.describe('Icon rendered before the label.'),
        onClick: actionProp('Runs when the button is clicked.'),
        className: classNameSchema,
        variant: buttonVariantSchema,
        size: buttonSizeSchema,
        fullWidth: boolSchema.describe('Stretch to the full width of the parent.'),
        disabled: disabledSchema,
        checks: checksSchema,
      })
      .describe('A clickable button.'),
  },
  ButtonGroup: {
    schema: z
      .object({
        children: childListSchema,
        orientation: orientationSchema,
        className: classNameSchema,
      })
      .describe('Groups related buttons into one connected control.'),
  },
  Input: {
    schema: z
      .object({
        bind: bindSchema,
        value: BlokPropSchemas.DynamicString.optional().describe('Controlled value.'),
        defaultValue: BlokPropSchemas.DynamicString.optional().describe(
          'Initial value when uncontrolled.',
        ),
        placeholder: BlokPropSchemas.DynamicString.nullish().describe('Placeholder text.'),
        type: z
          .string()
          .optional()
          .describe('HTML input type, e.g. "text", "number", "email", "password".'),
        className: classNameSchema,
        disabled: disabledSchema,
        readOnly: boolSchema.describe('Show the value but refuse edits.'),
        fullWidth: boolSchema.describe('Stretch to the full width of the parent.'),
        action: actionProp('Runs after each edit. Arguments may read event.value.'),
      })
      .describe('A single-line text input.'),
  },
  Textarea: {
    schema: z
      .object({
        bind: bindSchema,
        value: BlokPropSchemas.DynamicString.optional().describe('Controlled value.'),
        defaultValue: BlokPropSchemas.DynamicString.optional().describe(
          'Initial value when uncontrolled.',
        ),
        placeholder: BlokPropSchemas.DynamicString.nullish().describe('Placeholder text.'),
        rows: numberSchema.describe('Visible rows.'),
        className: classNameSchema,
        disabled: disabledSchema,
        readOnly: boolSchema.describe('Show the value but refuse edits.'),
        onChange: actionProp('Runs after each edit. Arguments may read event.value.'),
      })
      .describe('A multi-line text input.'),
  },
  Label: {
    schema: z
      .object({
        text: BlokPropSchemas.DynamicString.optional().describe('Label text.'),
        children: contentSchema,
        htmlFor: z.string().optional().describe('Id of the control this labels.'),
        className: classNameSchema,
      })
      .describe('A label for a form control.'),
  },
  Checkbox: {schema: booleanControlSchema('A checkbox bound to a boolean value.')},
  Switch: {schema: booleanControlSchema('A switch bound to a boolean value.')},
  Slider: {
    schema: z
      .object({
        bind: bindSchema,
        value: numberSchema.describe('Controlled value.'),
        defaultValue: numberSchema.describe('Initial value when uncontrolled.'),
        min: numberSchema.describe('Minimum. Defaults to 0.'),
        max: numberSchema.describe('Maximum. Defaults to 100.'),
        step: numberSchema.describe('Step size.'),
        disabled: disabledSchema,
        className: classNameSchema,
        onChange: actionProp(
          'Runs while dragging, at most every 150 ms and always with the final value. Arguments may read event.value.',
        ),
        onCommit: actionProp('Runs when the drag ends. Arguments may read event.value.'),
      })
      .describe('A slider bound to a numeric value.'),
  },
  RadioGroup: {
    schema: z
      .object({
        bind: bindSchema,
        value: BlokPropSchemas.DynamicString.optional().describe('Controlled selected value.'),
        defaultValue: BlokPropSchemas.DynamicString.optional().describe(
          'Initially selected value.',
        ),
        children: childListSchema.describe('RadioGroupItem children.'),
        orientation: orientationSchema,
        disabled: disabledSchema,
        className: classNameSchema,
        onChange: actionProp('Runs on selection. Arguments may read event.value.'),
      })
      .describe('A group of mutually exclusive options.'),
  },
  RadioGroupItem: {
    schema: z
      .object({
        value: z.string().describe('The value this option selects.'),
        label: BlokPropSchemas.DynamicString.optional().describe('Text shown beside the radio.'),
        disabled: disabledSchema,
        className: classNameSchema,
      })
      .describe('One option inside a RadioGroup.'),
  },
  Select: {
    schema: z
      .object({
        bind: bindSchema,
        value: BlokPropSchemas.DynamicString.optional().describe('Controlled selected value.'),
        defaultValue: BlokPropSchemas.DynamicString.optional().describe(
          'Initially selected value.',
        ),
        children: childListSchema.describe('SelectTrigger and SelectContent children.'),
        disabled: disabledSchema,
        onChange: actionProp('Runs on selection. Arguments may read event.value.'),
      })
      .describe('A dropdown select. Compose SelectTrigger and SelectContent inside it.'),
  },
  SelectTrigger: {
    schema: z
      .object({
        placeholder: BlokPropSchemas.DynamicString.optional().describe(
          'Shown while nothing is selected.',
        ),
        size: z.enum(['default', 'sm']).optional().describe('Trigger size.'),
        className: classNameSchema,
      })
      .describe('The button that opens a Select.'),
  },
  SelectContent: {
    schema: z
      .object({
        children: childListSchema.describe('SelectItem and SelectGroup children.'),
        className: classNameSchema,
      })
      .describe('The popup list of a Select.'),
  },
  SelectGroup: {
    schema: z
      .object({
        children: childListSchema,
        className: classNameSchema,
      })
      .describe('Groups related SelectItems.'),
  },
  SelectLabel: {
    schema: z
      .object({
        text: BlokPropSchemas.DynamicString.optional().describe('Group heading.'),
        className: classNameSchema,
      })
      .describe('A heading inside a SelectGroup.'),
  },
  SelectItem: {
    schema: z
      .object({
        value: z.string().describe('The value this option selects.'),
        label: BlokPropSchemas.DynamicString.optional().describe(
          'Option text. Defaults to the value.',
        ),
        disabled: disabledSchema,
        className: classNameSchema,
      })
      .describe('One option inside a SelectContent.'),
  },
  Toggle: {
    schema: z
      .object({
        bind: bindSchema,
        pressed: BlokPropSchemas.DynamicBoolean.optional().describe('Controlled pressed state.'),
        defaultPressed: boolSchema.describe('Initial state when uncontrolled.'),
        label: BlokPropSchemas.DynamicString.optional().describe('Button text.'),
        icon: iconNameSchema.describe('Icon rendered before the label.'),
        variant: z.enum(['default', 'outline']).optional().describe('Toggle appearance.'),
        size: z.enum(['default', 'sm', 'lg']).optional().describe('Toggle size.'),
        disabled: disabledSchema,
        className: classNameSchema,
        onChange: actionProp('Runs on toggle. Arguments may read event.value.'),
      })
      .describe('A two-state toggle button.'),
  },
  ToggleGroup: {
    schema: z
      .object({
        bind: bindSchema,
        multiple: boolSchema.describe('Allow more than one item to be pressed.'),
        children: childListSchema.describe('ToggleGroupItem children.'),
        variant: z.enum(['default', 'outline']).optional().describe('Item appearance.'),
        size: z.enum(['default', 'sm', 'lg']).optional().describe('Item size.'),
        disabled: disabledSchema,
        className: classNameSchema,
        onChange: actionProp('Runs on change. Arguments may read event.value.'),
      })
      .describe('A set of toggle buttons. Binds to a string, or to a list when multiple.'),
  },
  ToggleGroupItem: {
    schema: z
      .object({
        value: z.string().describe('The value this item contributes.'),
        label: BlokPropSchemas.DynamicString.optional().describe('Item text.'),
        icon: iconNameSchema.describe('Icon rendered before the label.'),
        disabled: disabledSchema,
        className: classNameSchema,
      })
      .describe('One item inside a ToggleGroup.'),
  },
  InputOTP: {
    schema: z
      .object({
        bind: bindSchema,
        length: numberSchema.describe('Number of slots. Defaults to 6.'),
        disabled: disabledSchema,
        className: classNameSchema,
        onComplete: actionProp('Runs once every slot is filled. Arguments may read event.value.'),
      })
      .describe('A one-time-code input.'),
  },
  InputGroup: {
    schema: z
      .object({
        children: childListSchema.describe('An Input plus InputGroupAddon children.'),
        className: classNameSchema,
      })
      .describe('Wraps an input with leading or trailing addons.'),
  },
  InputGroupAddon: {
    schema: z
      .object({
        text: BlokPropSchemas.DynamicString.optional().describe('Addon text.'),
        icon: iconNameSchema.describe('Addon icon.'),
        children: childListSchema,
        align: z
          .enum(['inline-start', 'inline-end', 'block-start', 'block-end'])
          .optional()
          .describe('Where the addon sits relative to the input.'),
        className: classNameSchema,
      })
      .describe('A label, icon or button attached to an InputGroup.'),
  },
  FieldSet: {
    schema: z
      .object({
        children: childListSchema.describe('Field children.'),
        className: classNameSchema,
      })
      .describe('Groups related fields into one form section.'),
  },
  Field: {
    schema: z
      .object({
        label: BlokPropSchemas.DynamicString.optional().describe('Field label.'),
        description: BlokPropSchemas.DynamicString.optional().describe('Helper text.'),
        error: BlokPropSchemas.DynamicString.optional().describe(
          'Error message; shown instead of the description when set.',
        ),
        children: childListSchema.describe('The control this field wraps.'),
        orientation: z
          .enum(['vertical', 'horizontal', 'responsive'])
          .optional()
          .describe('Label placement.'),
        className: classNameSchema,
      })
      .describe('A labelled form field with description and error slots.'),
  },
  Calendar: {
    schema: z
      .object({
        bind: markBindSchema(bindSchema.describe('Data-model path holding an ISO date string (YYYY-MM-DD).')),
        value: BlokPropSchemas.DynamicString.optional().describe('Controlled ISO date.'),
        defaultValue: BlokPropSchemas.DynamicString.optional().describe('Initial ISO date.'),
        disabled: disabledSchema,
        className: classNameSchema,
        onChange: actionProp('Runs on selection. Arguments may read event.value.'),
      })
      .describe('An inline date picker.'),
  },
} satisfies BlokComponentContracts;
