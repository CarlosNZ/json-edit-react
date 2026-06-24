export const initialData = {
  Agent: {
    codename: 'Phoenix',
    dob: '1985-04-12',
    bp: '120/80',
    eyeColor: 'green',
    M: 'Mansfield',
    Q: 'Major Boothroyd',
    REDACTED_passportId: '00X-VL-1985',
    REDACTED_phoneNumber: '+44 20 7946 0958',
    _safeHouseAddress: '221B Baker Street, London',
    _emergencyContact: {
      name: 'Eve Moneypenny',
      relation: 'colleague',
      phone: '+44 20 1234 5678',
    },
  },
  'Active Mission': {
    'codename!': 'Operation Nightfall',
    'extractionDeadline!': '2026-06-01T18:00:00Z',
    targets: ['Le Chiffre', 'Mr. White'],
    location: 'Monte Carlo',
    _operationalAssets: ['Aston Martin DB5', 'Walther PPK', 'Q-Branch tracker'],
  },
  'Past Missions': [
    { name: 'Skyfall', outcome: 'success', year: 2012 },
    { name: 'Goldeneye', outcome: 'success', year: 1995 },
    { name: 'Spectre', outcome: 'partial', year: 2015 },
  ],
  'Field Reports': {
    'Dossier PDF': 'https://example.com/dossier/phoenix.pdf',
    'Photo Archive': 'https://example.com/photos/phoenix',
    'Encrypted Comms': 'https://comms.example.com/phoenix',
  },
}
