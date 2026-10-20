import { type Movie } from '@/api/tmdb';
import { type Movie as DbMovie } from '@/db/dbFunctions';

export function toDbMovie(m: Movie): DbMovie {
  return {
    movie_id: Number(m.id),
    title: m.title,
    movie_desc: m.overview || null,
    release_date: m.release_date || null, // an empty string would fail on a DATE column
    genre: m.genre_ids,
    poster_path: m.poster_path,
    rating: m.vote_average,
  };
}