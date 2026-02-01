'use client';

import { useMemo, useState } from 'react';

type PlaylistItem = {
  id: string;
  name: string;
  owner?: { display_name?: string | null };
  tracks?: { total?: number };
};

type TrackItem = {
  id: string;
  name: string;
  artists?: { name: string }[];
  album?: { name: string };
  duration_ms?: number;
};

type ArtistItem = {
  id: string;
  name: string;
  genres?: string[];
  popularity?: number;
};

const msToMin = (ms?: number) => {
  if (!ms && ms !== 0) return '-';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export default function MvpClient() {
  const [userKey, setUserKey] = useState('demo-user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [nowPlaying, setNowPlaying] = useState<TrackItem | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'track' | 'artist' | 'playlist'>('track');

  const headers = useMemo(
    () => ({ 'Content-Type': 'application/json' }),
    [],
  );

  const callApi = async (payload: Record<string, unknown>) => {
    const response = await fetch('/api/spotify', {
      method: 'POST',
      headers,
      body: JSON.stringify({ userKey, ...payload }),
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body?.message ?? 'Onbekende fout');
    }
    return body;
  };

  const loadPlaylists = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await callApi({ action: 'playlists' });
      setPlaylists(result.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij playlists');
    } finally {
      setLoading(false);
    }
  };

  const runSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await callApi({ action: 'search', q: searchQuery, type: searchType, limit: 20 });
      if (searchType === 'track') {
        setTracks(result.tracks ?? []);
        setArtists([]);
      }
      if (searchType === 'artist') {
        setArtists(result.artists ?? []);
        setTracks([]);
      }
      if (searchType === 'playlist') {
        setPlaylists(result.playlists ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij zoeken');
    } finally {
      setLoading(false);
    }
  };

  const loadNowPlaying = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await callApi({ action: 'now-playing' });
      setNowPlaying(result.nowPlaying?.item ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij now playing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'grid', gap: 10, maxWidth: 720 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href="/spotify/api/auth/spotify/login">Login met Spotify</a>
          <a href="/spotify/api/auth/spotify/logout">Logout</a>
        </div>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>User key</span>
          <input
            value={userKey}
            onChange={(event) => setUserKey(event.target.value)}
            placeholder="Unieke sleutel per user"
            style={{ padding: 8 }}
          />
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={loadPlaylists} disabled={loading}>
            Laad playlists
          </button>
          <button type="button" onClick={loadNowPlaying} disabled={loading}>
            Now playing
          </button>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Zoek query"
            style={{ padding: 8, minWidth: 240 }}
          />
          <select value={searchType} onChange={(event) => setSearchType(event.target.value as typeof searchType)}>
            <option value="track">Tracks</option>
            <option value="artist">Artists</option>
            <option value="playlist">Playlists</option>
          </select>
          <button type="button" onClick={runSearch} disabled={loading}>
            Zoek
          </button>
        </div>
        {error ? <div style={{ color: '#b00020' }}>{error}</div> : null}
      </div>

      <div>
        <h2 style={{ marginBottom: 8 }}>Now playing</h2>
        <div style={{ padding: 6, opacity: nowPlaying ? 1 : 0.6 }}>
          {nowPlaying
            ? `${nowPlaying.name} — ${nowPlaying.artists?.map((artist) => artist.name).join(', ') ?? '-'}`
            : 'Geen actieve track'}
        </div>
      </div>

      <div>
        <h2 style={{ marginBottom: 8 }}>Tracks</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 6 }}>Titel</th>
              <th style={{ textAlign: 'left', padding: 6 }}>Artists</th>
              <th style={{ textAlign: 'left', padding: 6 }}>Album</th>
              <th style={{ textAlign: 'left', padding: 6 }}>Duur</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((track) => (
              <tr key={track.id}>
                <td style={{ padding: 6 }}>{track.name}</td>
                <td style={{ padding: 6 }}>{track.artists?.map((artist) => artist.name).join(', ') ?? '-'}</td>
                <td style={{ padding: 6 }}>{track.album?.name ?? '-'}</td>
                <td style={{ padding: 6 }}>{msToMin(track.duration_ms)}</td>
              </tr>
            ))}
            {tracks.length === 0 ? (
              <tr>
                <td style={{ padding: 6, opacity: 0.6 }} colSpan={4}>
                  Geen tracks geladen
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div>
        <h2 style={{ marginBottom: 8 }}>Artists</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 6 }}>Naam</th>
              <th style={{ textAlign: 'left', padding: 6 }}>Genres</th>
              <th style={{ textAlign: 'left', padding: 6 }}>Populariteit</th>
            </tr>
          </thead>
          <tbody>
            {artists.map((artist) => (
              <tr key={artist.id}>
                <td style={{ padding: 6 }}>{artist.name}</td>
                <td style={{ padding: 6 }}>{artist.genres?.join(', ') ?? '-'}</td>
                <td style={{ padding: 6 }}>{artist.popularity ?? '-'}</td>
              </tr>
            ))}
            {artists.length === 0 ? (
              <tr>
                <td style={{ padding: 6, opacity: 0.6 }} colSpan={3}>
                  Geen artists geladen
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div>
        <h2 style={{ marginBottom: 8 }}>Playlists</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 6 }}>Naam</th>
              <th style={{ textAlign: 'left', padding: 6 }}>Owner</th>
              <th style={{ textAlign: 'left', padding: 6 }}>Tracks</th>
            </tr>
          </thead>
          <tbody>
            {playlists.map((playlist) => (
              <tr key={playlist.id}>
                <td style={{ padding: 6 }}>{playlist.name}</td>
                <td style={{ padding: 6 }}>{playlist.owner?.display_name ?? '-'}</td>
                <td style={{ padding: 6 }}>{playlist.tracks?.total ?? '-'}</td>
              </tr>
            ))}
            {playlists.length === 0 ? (
              <tr>
                <td style={{ padding: 6, opacity: 0.6 }} colSpan={3}>
                  Geen playlists geladen
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
