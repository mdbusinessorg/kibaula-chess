export type Course = {
  id: string;
  name: string;
  slug: string;
  abbreviation: string;
  icon: string | null;
  shortDescription: string | null;
  educationType: string;
  players: number;
  avgRating: number;
  wins: number;
  games: number;
  collectiveScore: number;
  rank: number | null;
};

export type Player = {
  id: string;
  fullName: string;
  username: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  puzzlesSolved: number;
  status: string;
  inpVerified: boolean;
  courseId: string | null;
  courseName: string | null;
  courseAbbr: string | null;
  classId: string | null;
  className: string | null;
  gradeLabel: string | null;
  academicYear: string | null;
};

export type ClassUnit = {
  id: string;
  name: string;
  gradeLabel: string | null;
  courseId: string;
  courseName: string;
  courseAbbr: string;
  players: number;
  avgRating: number;
  wins: number;
  games: number;
};

export type Season = {
  id: string;
  name: string;
  startsOn: string | null;
  endsOn: string | null;
  active: boolean;
};

export type Tournament = {
  id: string;
  kind: 'championship' | 'cup';
  name: string;
  status: string;
  format: { phases: string[] };
  seasonId: string | null;
};

export type RankingMethod =
  | 'avg_rating'
  | 'collective_score'
  | 'wins'
  | 'participation'
  | 'tournaments';
