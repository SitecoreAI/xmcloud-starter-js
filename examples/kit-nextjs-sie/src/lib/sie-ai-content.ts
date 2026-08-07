import { containsLegacyStarterData } from '@/lib/nwn-content-sanitizer';

export const containsLegacyStarterContent = containsLegacyStarterData;

export const SIE_FAQ_ITEMS = [
  {
    question: 'What should I do if I smell natural gas?',
    answer:
      'Leave the area immediately by foot, avoid anything that could create a spark, and call 911 and SiEnergy at 888-468-7007, Option 1, from a safe location.',
  },
  {
    question: 'How do I start, stop, or transfer natural gas service?',
    answer:
      'Visit Service Options to start, stop, or transfer service and review the information needed for your request.',
  },
  {
    question: 'Where can I find help paying my bill?',
    answer:
      'Visit Payment Options & Locations for available payment methods and assistance resources, or call 888-468-7007, Option 3, for customer service.',
  },
  {
    question: 'When should I call 811?',
    answer:
      'Contact 811 before every digging project so underground utilities can be located and marked before work begins.',
  },
] as const;

export const SIE_SERVICE_ITEMS = [
  {
    name: 'Customer service and billing support',
    description:
      'Get help with your natural gas account, billing questions, and available service options.',
    category: 'Customer service',
  },
  {
    name: 'Start, stop, or transfer service',
    description:
      'Request natural gas service changes when you move or your service needs change.',
    category: 'Customer service',
  },
  {
    name: 'Payment options',
    description:
      'Review online, telephone, mail, auto-draft, local, and assistance options.',
    category: 'Customer service',
  },
  {
    name: 'Meter and usage education',
    description:
      'Learn how meters are read, how usage appears on a bill, and ways to lower gas use.',
    category: 'Information',
  },
  {
    name: 'Developer and builder services',
    description:
      'Partner with SiEnergy on natural gas infrastructure planning and implementation.',
    category: 'Developers',
  },
  {
    name: 'Natural gas safety',
    description:
      'Learn the immediate response to a suspected gas odor, how to reach the 24-hour emergency line, and why every dig begins with 811.',
    category: 'Safety',
  },
] as const;

export const SIE_SUMMARY = {
  title: 'SiEnergy natural gas service and customer support',
  description:
    'SiEnergy provides safe, reliable natural gas service to Texas communities, with clear paths for billing and payment help, service changes, natural gas safety, regulatory information, and developer partnerships.',
} as const;
