export const containsLegacyStarterContent = (value: unknown): boolean =>
  /\b(?:alaris|aero|nexa|terra|automotive|vehicles?|dealerships?)\b|test[-\s]?drive|electric future|drivesense/i.test(
    JSON.stringify(value ?? ''),
  );

export const NWN_FAQ_ITEMS = [
  {
    question: 'What should I do if I smell natural gas?',
    answer:
      'Leave the area immediately, avoid anything that could create a spark, and call NW Natural at 800-882-3377 from a safe location.',
  },
  {
    question: 'How do I start, stop, or transfer natural gas service?',
    answer:
      'Use the Start, Stop or Transfer page to choose the service action you need and gather the address and preferred service date before you begin.',
  },
  {
    question: 'Where can I find help paying my bill?',
    answer:
      'Visit Payment Assistance for an overview of available support paths, or call customer service at 800-422-4012 for personal help.',
  },
  {
    question: 'When should I call 811?',
    answer:
      'Contact 811 before every digging project so underground utilities can be located and marked before work begins.',
  },
] as const;

export const NWN_SERVICE_ITEMS = [
  {
    name: 'Account and billing support',
    description:
      'Pay a bill, review account tasks, and find the right support path for your household.',
    category: 'Account',
  },
  {
    name: 'Start, stop, or transfer service',
    description:
      'Prepare for a move or service change with a clear, guided checklist.',
    category: 'Account',
  },
  {
    name: 'Payment assistance',
    description:
      'Explore assistance categories and learn how to ask for help early.',
    category: 'Account',
  },
  {
    name: 'Equipment inspections and tune-ups',
    description:
      'Understand routine equipment care and when professional service may be appropriate.',
    category: 'Home energy',
  },
  {
    name: 'Rebates and offers',
    description:
      'Plan efficient home-comfort upgrades and review current program details before purchase.',
    category: 'Ways to save',
  },
  {
    name: 'Natural gas safety',
    description:
      'Learn the immediate response to a suspected gas odor and why every dig begins with 811.',
    category: 'Safety',
  },
] as const;

export const NWN_SUMMARY = {
  title: 'NW Natural residential energy and customer support',
  description:
    'A demo residential experience for NW Natural customers across Oregon and southwest Washington, with clear paths for account and billing help, service changes, rebates, home-energy services, natural gas safety, and the company’s lower-carbon transition.',
} as const;
