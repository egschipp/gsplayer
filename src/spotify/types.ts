export interface SpotifyImage {
  url: string;
  height?: number | null;
  width?: number | null;
}

export interface SpotifyUser {
  id: string;
  display_name?: string | null;
  email?: string | null;
  href?: string;
  images?: SpotifyImage[];
}

export interface SpotifyArtist {
  id: string;
  name: string;
  href?: string;
  genres?: string[];
  images?: SpotifyImage[];
  popularity?: number;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  href?: string;
  images?: SpotifyImage[];
  release_date?: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  href?: string;
  duration_ms?: number;
  popularity?: number;
  preview_url?: string | null;
  artists?: SpotifyArtist[];
  album?: SpotifyAlbum;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description?: string | null;
  href?: string;
  images?: SpotifyImage[];
  owner?: SpotifyUser;
  tracks?: {
    href?: string;
    total?: number;
  };
}

export interface Paging<T> {
  items: T[];
  limit: number;
  offset: number;
  total: number;
  next: string | null;
  previous: string | null;
}

export type SearchType = 'track' | 'artist' | 'album' | 'playlist' | 'show' | 'episode';

export interface SearchResponse {
  tracks?: Paging<SpotifyTrack>;
  artists?: Paging<SpotifyArtist>;
  albums?: Paging<SpotifyAlbum>;
  playlists?: Paging<SpotifyPlaylist>;
}
