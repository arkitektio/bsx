// What the port engine reads of rekuest's GraphQL: the fragments an action's ports arrive in, as
// orkestrator's codegen writes them (`graphql/rekuest-next/fragments`), and the enums they name. A
// host's generated types must stay assignable to these, so `tsc` there catches a change. Its codegen
// maps the enums here (`enumValues`), because an enum declared twice is two types.

/** The kind of assign widget. */
export const AssignWidgetKind = {
  Choice: 'CHOICE',
  Custom: 'CUSTOM',
  Proxy: 'PROXY',
  Search: 'SEARCH',
  Slider: 'SLIDER',
  StateChoice: 'STATE_CHOICE',
  String: 'STRING',
} as const;
export type AssignWidgetKind = (typeof AssignWidgetKind)[keyof typeof AssignWidgetKind];

/** The operator of a requires/provides descriptor: how a port's constraint compares the object's value at `key` with `value`. */
export const DescriptorOperator = {
  Contains: 'CONTAINS',
  Equals: 'EQUALS',
  Exists: 'EXISTS',
  Gte: 'GTE',
  In: 'IN',
  Lte: 'LTE',
  Matches: 'MATCHES',
  NotEquals: 'NOT_EQUALS',
  NotIn: 'NOT_IN',
} as const;
export type DescriptorOperator = (typeof DescriptorOperator)[keyof typeof DescriptorOperator];

/** The kind of effect. */
export const EffectKind = {
  Custom: 'CUSTOM',
  Hide: 'HIDE',
  Message: 'MESSAGE',
} as const;
export type EffectKind = (typeof EffectKind)[keyof typeof EffectKind];

export const OptionKey = {
  Description: 'DESCRIPTION',
  Label: 'LABEL',
  Logo: 'LOGO',
  Value: 'VALUE',
} as const;
export type OptionKey = (typeof OptionKey)[keyof typeof OptionKey];

/** The kind of a port: its structural type. Decides which of children, identifier and choices the port must, may or must not carry (see docs/design/ports.md). */
export const PortKind = {
  Bool: 'BOOL',
  Date: 'DATE',
  Dict: 'DICT',
  Enum: 'ENUM',
  Float: 'FLOAT',
  Int: 'INT',
  Interface: 'INTERFACE',
  List: 'LIST',
  MemoryStructure: 'MEMORY_STRUCTURE',
  Model: 'MODEL',
  Quantity: 'QUANTITY',
  String: 'STRING',
  Structure: 'STRUCTURE',
  Union: 'UNION',
} as const;
export type PortKind = (typeof PortKind)[keyof typeof PortKind];

/** The kind of return widget. */
export const ReturnWidgetKind = {
  Choice: 'CHOICE',
  Custom: 'CUSTOM',
} as const;
export type ReturnWidgetKind = (typeof ReturnWidgetKind)[keyof typeof ReturnWidgetKind];

export type ArgChildPortDeepFragment = { __typename: 'ArgPort', kind: PortKind, key: string, label?: string | null, identifier?: any | null, referenceUnit?: string | null, proposedUnits?: Array<string> | null, dimension?: string | null, description?: string | null, nullable: boolean, default?: any | null, requires?: Array<{ __typename?: 'Requires', key: string, operator: DescriptorOperator, value?: any | null }> | null, choices?: Array<{ __typename?: 'Choice', value: any, label: string, description?: string | null }> | null, widget?: (
    { __typename?: 'ChoiceAssignWidget' }
    & AssignWidget_ChoiceAssignWidget_Fragment
  ) | (
    { __typename?: 'CustomAssignWidget' }
    & AssignWidget_CustomAssignWidget_Fragment
  ) | (
    { __typename?: 'ProxyWidget' }
    & AssignWidget_ProxyWidget_Fragment
  ) | (
    { __typename?: 'SearchAssignWidget' }
    & AssignWidget_SearchAssignWidget_Fragment
  ) | (
    { __typename?: 'SliderAssignWidget' }
    & AssignWidget_SliderAssignWidget_Fragment
  ) | (
    { __typename?: 'StateChoiceAssignWidget' }
    & AssignWidget_StateChoiceAssignWidget_Fragment
  ) | (
    { __typename?: 'StringAssignWidget' }
    & AssignWidget_StringAssignWidget_Fragment
  ) | null, children?: Array<{ __typename: 'ArgPort', kind: PortKind, key: string, identifier?: any | null, nullable: boolean, requires?: Array<{ __typename?: 'Requires', key: string, operator: DescriptorOperator, value?: any | null }> | null, widget?: (
      { __typename?: 'ChoiceAssignWidget' }
      & AssignWidget_ChoiceAssignWidget_Fragment
    ) | (
      { __typename?: 'CustomAssignWidget' }
      & AssignWidget_CustomAssignWidget_Fragment
    ) | (
      { __typename?: 'ProxyWidget' }
      & AssignWidget_ProxyWidget_Fragment
    ) | (
      { __typename?: 'SearchAssignWidget' }
      & AssignWidget_SearchAssignWidget_Fragment
    ) | (
      { __typename?: 'SliderAssignWidget' }
      & AssignWidget_SliderAssignWidget_Fragment
    ) | (
      { __typename?: 'StateChoiceAssignWidget' }
      & AssignWidget_StateChoiceAssignWidget_Fragment
    ) | (
      { __typename?: 'StringAssignWidget' }
      & AssignWidget_StringAssignWidget_Fragment
    ) | null }> | null };

export type ArgChildPortFragment = { __typename: 'ArgPort', kind: PortKind, key: string, label?: string | null, identifier?: any | null, referenceUnit?: string | null, proposedUnits?: Array<string> | null, dimension?: string | null, nullable: boolean, description?: string | null, default?: any | null, requires?: Array<{ __typename?: 'Requires', key: string, operator: DescriptorOperator, value?: any | null }> | null, children?: Array<(
    { __typename?: 'ArgPort' }
    & ArgChildPortNestedFragment
  )> | null, widget?: (
    { __typename?: 'ChoiceAssignWidget' }
    & AssignWidget_ChoiceAssignWidget_Fragment
  ) | (
    { __typename?: 'CustomAssignWidget' }
    & AssignWidget_CustomAssignWidget_Fragment
  ) | (
    { __typename?: 'ProxyWidget' }
    & AssignWidget_ProxyWidget_Fragment
  ) | (
    { __typename?: 'SearchAssignWidget' }
    & AssignWidget_SearchAssignWidget_Fragment
  ) | (
    { __typename?: 'SliderAssignWidget' }
    & AssignWidget_SliderAssignWidget_Fragment
  ) | (
    { __typename?: 'StateChoiceAssignWidget' }
    & AssignWidget_StateChoiceAssignWidget_Fragment
  ) | (
    { __typename?: 'StringAssignWidget' }
    & AssignWidget_StringAssignWidget_Fragment
  ) | null, effects?: Array<(
    { __typename?: 'CustomEffect' }
    & PortEffect_CustomEffect_Fragment
  ) | (
    { __typename?: 'HideEffect' }
    & PortEffect_HideEffect_Fragment
  ) | (
    { __typename?: 'MessageEffect' }
    & PortEffect_MessageEffect_Fragment
  )> | null, validators?: Array<(
    { __typename?: 'Validator' }
    & ValidatorFragment
  )> | null, choices?: Array<{ __typename?: 'Choice', value: any, label: string, description?: string | null }> | null };

export type ArgChildPortNestedFragment = { __typename: 'ArgPort', kind: PortKind, key: string, label?: string | null, identifier?: any | null, referenceUnit?: string | null, proposedUnits?: Array<string> | null, dimension?: string | null, description?: string | null, nullable: boolean, default?: any | null, requires?: Array<{ __typename?: 'Requires', key: string, operator: DescriptorOperator, value?: any | null }> | null, children?: Array<(
    { __typename?: 'ArgPort' }
    & ArgChildPortDeepFragment
  )> | null, choices?: Array<{ __typename?: 'Choice', value: any, label: string, description?: string | null }> | null, widget?: (
    { __typename?: 'ChoiceAssignWidget' }
    & AssignWidget_ChoiceAssignWidget_Fragment
  ) | (
    { __typename?: 'CustomAssignWidget' }
    & AssignWidget_CustomAssignWidget_Fragment
  ) | (
    { __typename?: 'ProxyWidget' }
    & AssignWidget_ProxyWidget_Fragment
  ) | (
    { __typename?: 'SearchAssignWidget' }
    & AssignWidget_SearchAssignWidget_Fragment
  ) | (
    { __typename?: 'SliderAssignWidget' }
    & AssignWidget_SliderAssignWidget_Fragment
  ) | (
    { __typename?: 'StateChoiceAssignWidget' }
    & AssignWidget_StateChoiceAssignWidget_Fragment
  ) | (
    { __typename?: 'StringAssignWidget' }
    & AssignWidget_StringAssignWidget_Fragment
  ) | null, effects?: Array<(
    { __typename?: 'CustomEffect' }
    & PortEffect_CustomEffect_Fragment
  ) | (
    { __typename?: 'HideEffect' }
    & PortEffect_HideEffect_Fragment
  ) | (
    { __typename?: 'MessageEffect' }
    & PortEffect_MessageEffect_Fragment
  )> | null, validators?: Array<(
    { __typename?: 'Validator' }
    & ValidatorFragment
  )> | null };

export type ArgPortFragment = { __typename: 'ArgPort', key: string, label?: string | null, nullable: boolean, description?: string | null, kind: PortKind, identifier?: any | null, referenceUnit?: string | null, proposedUnits?: Array<string> | null, dimension?: string | null, default?: any | null, effects?: Array<(
    { __typename?: 'CustomEffect' }
    & PortEffect_CustomEffect_Fragment
  ) | (
    { __typename?: 'HideEffect' }
    & PortEffect_HideEffect_Fragment
  ) | (
    { __typename?: 'MessageEffect' }
    & PortEffect_MessageEffect_Fragment
  )> | null, widget?: (
    { __typename?: 'ChoiceAssignWidget' }
    & AssignWidget_ChoiceAssignWidget_Fragment
  ) | (
    { __typename?: 'CustomAssignWidget' }
    & AssignWidget_CustomAssignWidget_Fragment
  ) | (
    { __typename?: 'ProxyWidget' }
    & AssignWidget_ProxyWidget_Fragment
  ) | (
    { __typename?: 'SearchAssignWidget' }
    & AssignWidget_SearchAssignWidget_Fragment
  ) | (
    { __typename?: 'SliderAssignWidget' }
    & AssignWidget_SliderAssignWidget_Fragment
  ) | (
    { __typename?: 'StateChoiceAssignWidget' }
    & AssignWidget_StateChoiceAssignWidget_Fragment
  ) | (
    { __typename?: 'StringAssignWidget' }
    & AssignWidget_StringAssignWidget_Fragment
  ) | null, children?: Array<(
    { __typename?: 'ArgPort' }
    & ArgChildPortFragment
  )> | null, choices?: Array<{ __typename?: 'Choice', value: any, label: string, description?: string | null }> | null, validators?: Array<(
    { __typename?: 'Validator' }
    & ValidatorFragment
  )> | null, requires?: Array<{ __typename?: 'Requires', key: string, operator: DescriptorOperator, value?: any | null }> | null };

export type AssignWidgetFragment = AssignWidget_ChoiceAssignWidget_Fragment | AssignWidget_CustomAssignWidget_Fragment | AssignWidget_ProxyWidget_Fragment | AssignWidget_SearchAssignWidget_Fragment | AssignWidget_SliderAssignWidget_Fragment | AssignWidget_StateChoiceAssignWidget_Fragment | AssignWidget_StringAssignWidget_Fragment;

type AssignWidget_ChoiceAssignWidget_Fragment = (
  { __typename: 'ChoiceAssignWidget', kind: AssignWidgetKind }
  & ChoiceAssignWidgetFragment
);

type AssignWidget_CustomAssignWidget_Fragment = (
  { __typename: 'CustomAssignWidget', kind: AssignWidgetKind }
  & CustomAssignWidgetFragment
);

type AssignWidget_ProxyWidget_Fragment = (
  { __typename: 'ProxyWidget', kind: AssignWidgetKind }
  & ProxyWidgetFragment
);

type AssignWidget_SearchAssignWidget_Fragment = (
  { __typename: 'SearchAssignWidget', kind: AssignWidgetKind }
  & SearchAssignWidgetFragment
);

type AssignWidget_SliderAssignWidget_Fragment = (
  { __typename: 'SliderAssignWidget', kind: AssignWidgetKind }
  & SliderAssignWidgetFragment
);

type AssignWidget_StateChoiceAssignWidget_Fragment = (
  { __typename: 'StateChoiceAssignWidget', kind: AssignWidgetKind }
  & StateChoiceAssignWidgetFragment
);

type AssignWidget_StringAssignWidget_Fragment = (
  { __typename: 'StringAssignWidget', kind: AssignWidgetKind }
  & StringAssignWidgetFragment
);

type BaseEffect_CustomEffect_Fragment = { __typename: 'CustomEffect', kind: EffectKind, dependencies: Array<string>, source?: string | null, call: (
    { __typename?: 'UtilCall' }
    & PortCallFragment
  ) };

type BaseEffect_HideEffect_Fragment = { __typename: 'HideEffect', kind: EffectKind, dependencies: Array<string>, source?: string | null, call: (
    { __typename?: 'UtilCall' }
    & PortCallFragment
  ) };

type BaseEffect_MessageEffect_Fragment = { __typename: 'MessageEffect', kind: EffectKind, dependencies: Array<string>, source?: string | null, call: (
    { __typename?: 'UtilCall' }
    & PortCallFragment
  ) };

export type BlokAgentCallLeafFragment = { __typename?: 'AgentCall', dependency: string, operation: string, arguments?: Array<(
    { __typename?: 'ActionArgument' }
    & PortCallLeafArgumentFragment
  )> | null };

export type BlokArgumentFragment = (
  { __typename?: 'ActionArgument', utilCall?: { __typename?: 'UtilCall', operation: string, arguments?: Array<(
      { __typename?: 'ActionArgument' }
      & BlokArgumentInnerFragment
    )> | null } | null, agentCall?: { __typename?: 'AgentCall', dependency: string, operation: string, arguments?: Array<(
      { __typename?: 'ActionArgument' }
      & BlokArgumentInnerFragment
    )> | null } | null, valueList?: Array<(
    { __typename?: 'ActionArgument' }
    & BlokArgumentInnerFragment
  )> | null, valueDict?: Array<(
    { __typename?: 'ActionArgument' }
    & BlokArgumentInnerFragment
  )> | null }
  & PortCallLeafArgumentFragment
);

export type BlokArgumentInnerFragment = (
  { __typename?: 'ActionArgument', agentCall?: (
    { __typename?: 'AgentCall' }
    & BlokAgentCallLeafFragment
  ) | null }
  & PortCallInnerArgumentFragment
);

export type BlokComponentPropFragment = { __typename?: 'ComponentProp', key: string, staticValue?: any | null, declaresValue?: string | null, dynamicValue?: { __typename?: 'DynamicValue', path?: string | null, literal?: string | null } | null, agentCall?: { __typename?: 'AgentCall', dependency: string, operation: string, arguments?: Array<(
      { __typename?: 'ActionArgument' }
      & BlokArgumentFragment
    )> | null } | null, utilCall?: { __typename?: 'UtilCall', operation: string, arguments?: Array<(
      { __typename?: 'ActionArgument' }
      & BlokArgumentFragment
    )> | null } | null };

export type ChoiceAssignWidgetFragment = { __typename: 'ChoiceAssignWidget', kind: AssignWidgetKind, followValue?: string | null, placeholder?: string | null };

export type ChoiceReturnWidgetFragment = { __typename: 'ChoiceReturnWidget', kind: ReturnWidgetKind };

export type CustomAssignWidgetFragment = { __typename: 'CustomAssignWidget', kind: AssignWidgetKind, followValue?: string | null, component: string, children?: any | null, dependencies?: Array<string> | null, props?: Array<(
    { __typename?: 'ComponentProp' }
    & BlokComponentPropFragment
  )> | null, fallback?: (
    { __typename: 'ChoiceAssignWidget', kind: AssignWidgetKind }
    & ChoiceAssignWidgetFragment
  ) | { __typename: 'CustomAssignWidget', kind: AssignWidgetKind } | (
    { __typename: 'ProxyWidget', kind: AssignWidgetKind }
    & ProxyWidgetFragment
  ) | (
    { __typename: 'SearchAssignWidget', kind: AssignWidgetKind }
    & SearchAssignWidgetFragment
  ) | (
    { __typename: 'SliderAssignWidget', kind: AssignWidgetKind }
    & SliderAssignWidgetFragment
  ) | (
    { __typename: 'StateChoiceAssignWidget', kind: AssignWidgetKind }
    & StateChoiceAssignWidgetFragment
  ) | (
    { __typename: 'StringAssignWidget', kind: AssignWidgetKind }
    & StringAssignWidgetFragment
  ) | null };

export type CustomEffectFragment = (
  { __typename: 'CustomEffect', kind: EffectKind }
  & BaseEffect_CustomEffect_Fragment
);

export type CustomReturnWidgetFragment = { __typename: 'CustomReturnWidget', kind: ReturnWidgetKind, component: string, props?: Array<(
    { __typename?: 'ComponentProp' }
    & BlokComponentPropFragment
  )> | null };

export type FilterPortFragment = { __typename: 'ArgPort', kind: PortKind, key: string, identifier?: any | null, description?: string | null, nullable: boolean, widget?: { __typename?: 'ChoiceAssignWidget' } | { __typename?: 'CustomAssignWidget' } | { __typename?: 'ProxyWidget' } | { __typename?: 'SearchAssignWidget', query: string } | { __typename?: 'SliderAssignWidget' } | { __typename?: 'StateChoiceAssignWidget' } | { __typename?: 'StringAssignWidget' } | null };

export type HideEffectFragment = (
  { __typename: 'HideEffect', fade: boolean }
  & BaseEffect_HideEffect_Fragment
);

export type ListDependencyFragment = { __typename?: 'Dependency', id: string, key: string, description?: string | null, appFilter?: string | null, versionFilter?: string | null, autoResolvable: boolean, optional: boolean, minViableInstances?: number | null, maxViableInstances?: number | null, singular: boolean };

export type MessageEffectFragment = (
  { __typename: 'MessageEffect', kind: EffectKind, message: string }
  & BaseEffect_MessageEffect_Fragment
);

export type PortCallArgumentFragment = (
  { __typename?: 'ActionArgument', utilCall?: (
    { __typename?: 'UtilCall' }
    & PortCallInnerFragment
  ) | null, valueList?: Array<(
    { __typename?: 'ActionArgument' }
    & PortCallInnerArgumentFragment
  )> | null, valueDict?: Array<(
    { __typename?: 'ActionArgument' }
    & PortCallInnerArgumentFragment
  )> | null }
  & PortCallLeafArgumentFragment
);

export type PortCallFragment = { __typename?: 'UtilCall', operation: string, arguments?: Array<(
    { __typename?: 'ActionArgument' }
    & PortCallArgumentFragment
  )> | null };

export type PortCallInnerArgumentFragment = (
  { __typename?: 'ActionArgument', utilCall?: (
    { __typename?: 'UtilCall' }
    & PortCallLeafFragment
  ) | null, valueList?: Array<(
    { __typename?: 'ActionArgument' }
    & PortCallLeafArgumentFragment
  )> | null, valueDict?: Array<(
    { __typename?: 'ActionArgument' }
    & PortCallLeafArgumentFragment
  )> | null }
  & PortCallLeafArgumentFragment
);

export type PortCallInnerFragment = { __typename?: 'UtilCall', operation: string, arguments?: Array<(
    { __typename?: 'ActionArgument' }
    & PortCallInnerArgumentFragment
  )> | null };

export type PortCallLeafArgumentFragment = { __typename?: 'ActionArgument', key?: string | null, valueLiteral?: any | null, valuePath?: string | null };

export type PortCallLeafFragment = { __typename?: 'UtilCall', operation: string, arguments?: Array<(
    { __typename?: 'ActionArgument' }
    & PortCallLeafArgumentFragment
  )> | null };

export type PortEffectFragment = PortEffect_CustomEffect_Fragment | PortEffect_HideEffect_Fragment | PortEffect_MessageEffect_Fragment;

type PortEffect_CustomEffect_Fragment = (
  { __typename?: 'CustomEffect' }
  & CustomEffectFragment
);

type PortEffect_HideEffect_Fragment = (
  { __typename?: 'HideEffect' }
  & HideEffectFragment
);

type PortEffect_MessageEffect_Fragment = (
  { __typename?: 'MessageEffect' }
  & MessageEffectFragment
);

export type PortGroupFragment = { __typename?: 'PortGroup', key: string, title?: string | null, description?: string | null, ports: Array<string>, effects?: Array<(
    { __typename?: 'CustomEffect' }
    & PortEffect_CustomEffect_Fragment
  ) | (
    { __typename?: 'HideEffect' }
    & PortEffect_HideEffect_Fragment
  ) | (
    { __typename?: 'MessageEffect' }
    & PortEffect_MessageEffect_Fragment
  )> | null };

export type ProxyWidgetFragment = { __typename: 'ProxyWidget', kind: AssignWidgetKind, followValue?: string | null, targetPort: string, targetAction: string, targetDependency?: string | null };

export type ReturnChildPortDeepFragment = { __typename: 'ReturnPort', kind: PortKind, key: string, label?: string | null, identifier?: any | null, referenceUnit?: string | null, proposedUnits?: Array<string> | null, dimension?: string | null, description?: string | null, nullable: boolean, provides?: Array<{ __typename?: 'Provides', key: string, operator: DescriptorOperator, value?: any | null }> | null, choices?: Array<{ __typename?: 'Choice', value: any, label: string, description?: string | null }> | null, widget?: (
    { __typename?: 'ChoiceReturnWidget' }
    & ReturnWidget_ChoiceReturnWidget_Fragment
  ) | (
    { __typename?: 'CustomReturnWidget' }
    & ReturnWidget_CustomReturnWidget_Fragment
  ) | null, children?: Array<{ __typename: 'ReturnPort', kind: PortKind, key: string, identifier?: any | null, nullable: boolean, widget?: (
      { __typename?: 'ChoiceReturnWidget' }
      & ReturnWidget_ChoiceReturnWidget_Fragment
    ) | (
      { __typename?: 'CustomReturnWidget' }
      & ReturnWidget_CustomReturnWidget_Fragment
    ) | null }> | null };

export type ReturnChildPortFragment = { __typename: 'ReturnPort', kind: PortKind, key: string, label?: string | null, identifier?: any | null, referenceUnit?: string | null, proposedUnits?: Array<string> | null, dimension?: string | null, nullable: boolean, description?: string | null, provides?: Array<{ __typename?: 'Provides', key: string, operator: DescriptorOperator, value?: any | null }> | null, children?: Array<(
    { __typename?: 'ReturnPort' }
    & ReturnChildPortNestedFragment
  )> | null, widget?: (
    { __typename?: 'ChoiceReturnWidget' }
    & ReturnWidget_ChoiceReturnWidget_Fragment
  ) | (
    { __typename?: 'CustomReturnWidget' }
    & ReturnWidget_CustomReturnWidget_Fragment
  ) | null, effects?: Array<(
    { __typename?: 'CustomEffect' }
    & PortEffect_CustomEffect_Fragment
  ) | (
    { __typename?: 'HideEffect' }
    & PortEffect_HideEffect_Fragment
  ) | (
    { __typename?: 'MessageEffect' }
    & PortEffect_MessageEffect_Fragment
  )> | null, choices?: Array<{ __typename?: 'Choice', value: any, label: string, description?: string | null }> | null };

export type ReturnChildPortNestedFragment = { __typename: 'ReturnPort', kind: PortKind, key: string, label?: string | null, identifier?: any | null, referenceUnit?: string | null, proposedUnits?: Array<string> | null, dimension?: string | null, description?: string | null, nullable: boolean, provides?: Array<{ __typename?: 'Provides', key: string, operator: DescriptorOperator, value?: any | null }> | null, children?: Array<(
    { __typename?: 'ReturnPort' }
    & ReturnChildPortDeepFragment
  )> | null, choices?: Array<{ __typename?: 'Choice', value: any, label: string, description?: string | null }> | null, widget?: (
    { __typename?: 'ChoiceReturnWidget' }
    & ReturnWidget_ChoiceReturnWidget_Fragment
  ) | (
    { __typename?: 'CustomReturnWidget' }
    & ReturnWidget_CustomReturnWidget_Fragment
  ) | null, effects?: Array<(
    { __typename?: 'CustomEffect' }
    & PortEffect_CustomEffect_Fragment
  ) | (
    { __typename?: 'HideEffect' }
    & PortEffect_HideEffect_Fragment
  ) | (
    { __typename?: 'MessageEffect' }
    & PortEffect_MessageEffect_Fragment
  )> | null };

export type ReturnPortFragment = { __typename: 'ReturnPort', key: string, label?: string | null, nullable: boolean, description?: string | null, kind: PortKind, identifier?: any | null, referenceUnit?: string | null, proposedUnits?: Array<string> | null, dimension?: string | null, effects?: Array<(
    { __typename?: 'CustomEffect' }
    & PortEffect_CustomEffect_Fragment
  ) | (
    { __typename?: 'HideEffect' }
    & PortEffect_HideEffect_Fragment
  ) | (
    { __typename?: 'MessageEffect' }
    & PortEffect_MessageEffect_Fragment
  )> | null, widget?: (
    { __typename?: 'ChoiceReturnWidget' }
    & ReturnWidget_ChoiceReturnWidget_Fragment
  ) | (
    { __typename?: 'CustomReturnWidget' }
    & ReturnWidget_CustomReturnWidget_Fragment
  ) | null, children?: Array<(
    { __typename?: 'ReturnPort' }
    & ReturnChildPortFragment
  )> | null, choices?: Array<{ __typename?: 'Choice', value: any, label: string, description?: string | null }> | null, provides?: Array<{ __typename?: 'Provides', key: string, operator: DescriptorOperator, value?: any | null }> | null };

export type ReturnWidgetFragment = ReturnWidget_ChoiceReturnWidget_Fragment | ReturnWidget_CustomReturnWidget_Fragment;

type ReturnWidget_ChoiceReturnWidget_Fragment = (
  { __typename: 'ChoiceReturnWidget', kind: ReturnWidgetKind }
  & ChoiceReturnWidgetFragment
);

type ReturnWidget_CustomReturnWidget_Fragment = (
  { __typename: 'CustomReturnWidget', kind: ReturnWidgetKind }
  & CustomReturnWidgetFragment
);

export type SearchAssignWidgetFragment = { __typename: 'SearchAssignWidget', kind: AssignWidgetKind, followValue?: string | null, query: string, ward: string, dependencies?: Array<string> | null, filters?: Array<(
    { __typename?: 'ArgPort' }
    & FilterPortFragment
  )> | null };

export type SliderAssignWidgetFragment = { __typename: 'SliderAssignWidget', kind: AssignWidgetKind, followValue?: string | null, min?: number | null, max?: number | null, step?: number | null };

export type StateChoiceAssignWidgetFragment = { __typename: 'StateChoiceAssignWidget', kind: AssignWidgetKind, followValue?: string | null, statePath?: string | null, dependency?: string | null, dependencies?: Array<string> | null, stateCall?: (
    { __typename?: 'UtilCall' }
    & PortCallFragment
  ) | null, stateAccessors?: Array<{ __typename?: 'StateAccessor', optionKey: OptionKey, path?: string | null, call?: (
      { __typename?: 'UtilCall' }
      & PortCallFragment
    ) | null }> | null };

export type StringAssignWidgetFragment = { __typename: 'StringAssignWidget', kind: AssignWidgetKind, followValue?: string | null, placeholder?: string | null, asParagraph?: boolean | null };

export type ValidatorFragment = { __typename?: 'Validator', dependencies?: Array<string> | null, label?: string | null, errorMessage?: string | null, source?: string | null, call: (
    { __typename?: 'UtilCall' }
    & PortCallFragment
  ) };
