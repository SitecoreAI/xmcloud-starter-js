type DemoProfile = {
  recordType: 'profile';
  identifiers: Array<{ provider: 'email'; id: string }>;
  contact: {
    firstName: string;
    lastName: string;
    email: string;
  };
  extensions: {
    paperless: boolean;
  };
};

const profile = (
  sequence: number,
  firstName: string,
  lastName: string,
  paperless: boolean,
): DemoProfile => {
  const email = `nwn-demo-${String(sequence).padStart(2, '0')}@example.com`;

  return {
    recordType: 'profile',
    identifiers: [{ provider: 'email', id: email }],
    contact: { firstName, lastName, email },
    extensions: { paperless },
  };
};

export const SITECOREAI_UDL_DEMO_PROFILES: readonly DemoProfile[] = [
  profile(1, 'Avery', 'Bennett', false),
  profile(2, 'Maya', 'Chen', false),
  profile(3, 'Mateo', 'Rivera', false),
  profile(4, 'Priya', 'Shah', false),
  profile(5, 'Jordan', 'Kim', false),
  profile(6, 'Sofia', 'Morales', false),
  profile(7, 'Naomi', 'Brooks', true),
  profile(8, 'Lucas', 'Reed', true),
  profile(9, 'Amara', 'Okafor', true),
  profile(10, 'Theo', 'Nguyen', true),
];

export const createSitecoreAiUdlDemoJsonl = () =>
  `${SITECOREAI_UDL_DEMO_PROFILES.map((record) => JSON.stringify(record)).join(
    '\n',
  )}\n`;

if (require.main === module) {
  process.stdout.write(createSitecoreAiUdlDemoJsonl());
}
