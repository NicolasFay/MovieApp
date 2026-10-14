export type Movie = {
  id: string;
  title: string;
  year: number;
  genre: string;
  description: string;
  color: string;
};

export const MOVIES: Movie[] = [
  {
    id: '1',
    title: 'Neon Horizon',
    year: 2021,
    genre: 'Sci-Fi',
    description: 'A pilot chases a signal across a dying city.',
    color: '#3b5bdb',
  },
  {
    id: '2',
    title: 'The Last Orchard',
    year: 2018,
    genre: 'Drama',
    description: 'Three generations fight to save the family farm.',
    color: '#2f9e44',
  },
  {
    id: '3',
    title: 'Midnight Ledger',
    year: 2023,
    genre: 'Thriller',
    description: 'An accountant finds numbers that should not exist.',
    color: '#c92a2a',
  },
  {
    id: '4',
    title: 'Paper Moons',
    year: 2015,
    genre: 'Romance',
    description: 'Two strangers keep missing each other across Europe.',
    color: '#9c36b5',
  },
  {
    id: '5',
    title: 'Dust & Thunder',
    year: 2020,
    genre: 'Western',
    description: 'A retired sheriff takes one last job.',
    color: '#e67700',
  },
];