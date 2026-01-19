export interface SincRep {
  id: string;
  name: string;
}

export const SINC_REPS: SincRep[] = [
  { id: '680535117', name: 'Trevor' },
  { id: '254155041', name: 'Jillian' },
  { id: '1268435101', name: 'Raven' },
  { id: '76699261', name: 'Julia' },
  { id: '246749077', name: 'Kim' },
  { id: '465765582', name: 'Dante' },
  { id: '75919879', name: 'Tucker' },
  { id: '1562201038', name: 'Elisabeth' },
  { id: '83333527', name: 'Kaylee' },
  { id: '859404638', name: 'Katherine' },
  { id: '1112781027', name: 'Joe' },
  { id: '1740878928', name: 'Mariana' },
  { id: '477103320', name: 'Samara' },
  { id: '80655731', name: 'Beau' },
  { id: '1267850482', name: 'Ross' },
  { id: '752490040', name: 'Amir' },
];

export const getSincRepById = (name: string): SincRep | undefined => {
  return SINC_REPS.find(rep => rep.name === name);
};

export const getSincRepNameById = (id: string): string => {
  const rep = SINC_REPS.find(rep => rep.id === id);
  return rep ? rep.name : 'Unknown';
};
