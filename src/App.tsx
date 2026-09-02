// Type checking remains available once npm installs the standard React type packages.
// This source also builds in the minimal preloaded Vite environment used by the preview runner.
// @ts-nocheck
import { FormEvent, type CSSProperties, useEffect, useRef, useState } from 'react'

type TrackState = 'loading' | 'ready' | 'playing' | 'paused' | 'error'

type Track = {
  id: string
  videoId: string
  title: string
  artist: string
  accent: string
  volume: number
  state: TrackState
}

const ACCENTS = ['#a4d49b', '#f2b86b', '#8bc5d2', '#db9ac4', '#c6adf2']
const PLAYLIST_STORAGE_KEY = 'sonic-room-playlist'

function parsePlaylist(value: string | null): Track[] | null {
  if (value === null) return null

  try {
    const sharedTracks = JSON.parse(value) as Array<Partial<Track>>
    if (!Array.isArray(sharedTracks)) return []

    return sharedTracks
      .filter((track) => typeof track.videoId === 'string' && typeof track.title === 'string')
      .map((track, index) => ({
        id: `${track.videoId}-${index}`,
        videoId: track.videoId!,
        title: track.title!,
        artist: track.artist || 'YouTube channel · ready to mix',
        accent: track.accent || ACCENTS[index % ACCENTS.length],
        volume: typeof track.volume === 'number' ? Math.max(0, Math.min(100, track.volume)) : 100,
        state: 'loading' as TrackState,
      }))
  } catch {
    return null
  }
}

function loadInitialPlaylist(): Track[] {
  const sharedPlaylist = parsePlaylist(new URLSearchParams(window.location.hash.slice(1)).get('playlist'))
  if (sharedPlaylist !== null) return sharedPlaylist

  try {
    return parsePlaylist(localStorage.getItem(PLAYLIST_STORAGE_KEY)) ?? []
  } catch {
    return []
  }
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const input = document.createElement('textarea')
  input.value = value
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.select()
  document.execCommand('copy')
  input.remove()
}

let youtubeApiPromise: Promise<typeof YT> | undefined

function loadYouTubeApi(): Promise<typeof YT> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (youtubeApiPromise) return youtubeApiPromise

  youtubeApiPromise = new Promise((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.()
      resolve(window.YT)
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    )
    if (!existingScript) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      document.body.appendChild(script)
    }
  })
  return youtubeApiPromise
}

function parseVideoId(value: string) {
  const trimmed = value.trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed

  try {
    const url = new URL(trimmed)
    if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('/')[0]
    if (url.hostname.includes('youtube.com')) {
      return (
        url.searchParams.get('v') ??
        url.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)?.[1]
      )
    }
  } catch {
    return undefined
  }
  return undefined
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  if (name === 'play') return <svg {...common}><path d="m8 5 11 7-11 7V5Z" fill="currentColor" stroke="none" /></svg>
  if (name === 'pause') return <svg {...common}><path d="M7 5v14M17 5v14" strokeWidth="2.5" /></svg>
  if (name === 'plus') return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>
  if (name === 'volume') return <svg {...common}><path d="M4 10v4h3l4 3V7l-4 3H4Z" /><path d="M15 9.5a4 4 0 0 1 0 5M17.5 7a7.5 7.5 0 0 1 0 10" /></svg>
  if (name === 'mute') return <svg {...common}><path d="M4 10v4h3l4 3V7l-4 3H4Z" /><path d="m16 9 5 6m0-6-5 6" /></svg>
  if (name === 'trash') return <svg {...common}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7l1-3h4l1 3" /></svg>
  if (name === 'sun') return <svg {...common}><circle cx="12" cy="12" r="3.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
  if (name === 'moon') return <svg {...common}><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z" /></svg>
  if (name === 'sliders') return <svg {...common}><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h10M18 18h2" /><circle cx="16" cy="6" r="2" /><circle cx="8" cy="12" r="2" /><circle cx="16" cy="18" r="2" /></svg>
  if (name === 'share') return <svg {...common}><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" /></svg>
  if (name === 'check') return <svg {...common}><path d="m5 12 4.5 4.5L19 7" /></svg>
  return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>
}

function YouTubeEngine({
  track,
  isPlaying,
  volume,
  muted,
  onReady,
  onStateChange,
  onError,
}: {
  track: Track
  isPlaying: boolean
  volume: number
  muted: boolean
  onReady: (player: YT.Player) => void
  onStateChange: (state: number) => void
  onError: () => void
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YT.Player | null>(null)
  const handlersRef = useRef({ onReady, onStateChange, onError })
  handlersRef.current = { onReady, onStateChange, onError }

  useEffect(() => {
    let cancelled = false
    loadYouTubeApi().then(() => {
      if (cancelled || !mountRef.current) return
      playerRef.current = new window.YT.Player(mountRef.current, {
        videoId: track.videoId,
        width: 1,
        height: 1,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: (event) => {
            event.target.setVolume(muted ? 0 : volume)
            handlersRef.current.onReady(event.target)
          },
          onStateChange: (event) => handlersRef.current.onStateChange(event.data),
          onError: () => handlersRef.current.onError(),
        },
      })
    })

    return () => {
      cancelled = true
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [track.videoId])

  useEffect(() => {
    if (!playerRef.current) return
    playerRef.current.setVolume(muted ? 0 : volume)
  }, [muted, volume])

  useEffect(() => {
    if (!playerRef.current) return
    if (isPlaying) playerRef.current.playVideo()
    else playerRef.current.pauseVideo()
  }, [isPlaying])

  return <div ref={mountRef} className="youtube-engine" aria-hidden="true" />
}

function App() {
  const [tracks, setTracks] = useState<Track[]>(loadInitialPlaylist)
  const [playingIds, setPlayingIds] = useState<Set<string>>(new Set())
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set())
  const [masterVolume, setMasterVolume] = useState(68)
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [formError, setFormError] = useState('')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    try {
      const playlist = tracks.map(({ videoId, title, artist, accent, volume }) => ({ videoId, title, artist, accent, volume }))
      localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(playlist))
    } catch {
      // Storage can be unavailable in private browsing; playback still works.
    }
  }, [tracks])

  const allPlaying = tracks.length > 0 && playingIds.size === tracks.length

  const updateTrack = (trackId: string, update: Partial<Track>) => {
    setTracks((current) => current.map((track) => (track.id === trackId ? { ...track, ...update } : track)))
  }

  const toggleTrack = (trackId: string) => {
    setPlayingIds((current) => {
      const next = new Set(current)
      if (next.has(trackId)) next.delete(trackId)
      else next.add(trackId)
      return next
    })
  }

  const toggleMute = (trackId: string) => {
    setMutedIds((current) => {
      const next = new Set(current)
      if (next.has(trackId)) next.delete(trackId)
      else next.add(trackId)
      return next
    })
  }

  const removeTrack = (trackId: string) => {
    setTracks((current) => current.filter((track) => track.id !== trackId))
    setPlayingIds((current) => {
      const next = new Set(current)
      next.delete(trackId)
      return next
    })
  }

  const addTrack = (event: FormEvent) => {
    event.preventDefault()
    const videoId = parseVideoId(url)
    if (!videoId) {
      setFormError('Paste a YouTube URL or an 11-character video ID.')
      return
    }

    const newTrack: Track = {
      id: `${videoId}-${Date.now()}`,
      videoId,
      title: name.trim() || `New sound ${tracks.length + 1}`,
      artist: 'YouTube channel · ready to mix',
      accent: ACCENTS[tracks.length % ACCENTS.length],
      volume: 100,
      state: 'loading',
    }
    setTracks((current) => [...current, newTrack])
    setUrl('')
    setName('')
    setFormError('')
    setIsAddOpen(false)
  }

  const playAll = () => {
    setPlayingIds(allPlaying ? new Set() : new Set(tracks.map((track) => track.id)))
  }

  const sharePlaylist = async () => {
    const playlist = tracks.map(({ videoId, title, artist, accent, volume }) => ({ videoId, title, artist, accent, volume }))
    const shareUrl = new URL(window.location.href)
    shareUrl.hash = playlist.length ? `playlist=${encodeURIComponent(JSON.stringify(playlist))}` : ''

    try {
      await copyToClipboard(shareUrl.toString())
      setIsCopied(true)
      window.setTimeout(() => setIsCopied(false), 1800)
    } catch {
      setIsCopied(false)
    }
  }

  return (
    <div className={`app-shell ${darkMode ? 'dark' : 'light'}`}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <a className="brand" href="/" aria-label="Sonic Room home">
          <span className="brand-mark"><span /><span /><span /></span>
          <span>sonic<span className="brand-accent">room</span></span>
        </a>
        <div className="topbar-actions">
          <button className={`icon-button share-button ${isCopied ? 'copied' : ''}`} aria-label="Copy playlist share link" title={isCopied ? 'Copied' : 'Share playlist'} onClick={sharePlaylist}>
            <Icon name={isCopied ? 'check' : 'share'} size={18} />
          </button>
          <button className="icon-button theme-toggle" aria-label="Toggle color theme" onClick={() => setDarkMode((mode) => !mode)}>
            <Icon name={darkMode ? 'sun' : 'moon'} size={18} />
          </button>
        </div>
      </header>

      <main className="main-content">
        <section className="mixer-panel player-landing">
          <div className="section-heading">
            <div>
              <div className="title-row"><h2>Sound mix</h2><span className="count-pill">{tracks.length}</span></div>
            </div>
            <button className="add-button" onClick={() => setIsAddOpen((open) => !open)}><Icon name="plus" size={18} /> Add sound</button>
          </div>

          {isAddOpen && (
            <form className="add-form" onSubmit={addTrack}>
              <div className="form-inputs">
                <label><span>YouTube URL or video ID</span><input autoFocus value={url} onChange={(event) => setUrl(event.target.value)} placeholder="youtube.com/watch?v=..." /></label>
                <label><span>Name it <small>optional</small></span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Morning birds" /></label>
              </div>
              <button className="form-submit" type="submit">Add to room <Icon name="plus" size={16} /></button>
              {formError && <p className="form-error">{formError}</p>}
            </form>
          )}

          <div className="track-list">
            {tracks.map((track, index) => (
              <article className={`track-card ${playingIds.has(track.id) ? 'is-playing' : ''}`} key={track.id} style={{ '--track-accent': track.accent } as CSSProperties}>
                <div className="track-number">0{index + 1}</div>
                <div className="track-art" style={{ '--art-accent': track.accent } as CSSProperties}>
                  <span className="art-orbit orbit-one" /><span className="art-orbit orbit-two" /><span className="art-core" />
                  {playingIds.has(track.id) && <span className="wave-bars"><i /><i /><i /><i /></span>}
                </div>
                <div className="track-info">
                  <div className="track-title-row"><h3>{track.title}</h3>{track.state === 'error' ? <span className="error-label">Unavailable</span> : <span className="loaded-label"><span /> {track.state === 'loading' ? 'Loading' : 'Ready'}</span>}</div>
                  <p>{track.artist}</p>
                </div>
                <div className="track-controls">
                  <button className={`play-button ${playingIds.has(track.id) ? 'playing' : ''}`} onClick={() => toggleTrack(track.id)} aria-label={`${playingIds.has(track.id) ? 'Pause' : 'Play'} ${track.title}`}><Icon name={playingIds.has(track.id) ? 'pause' : 'play'} size={18} /></button>
                  <label className="track-volume" aria-label={`${track.title} volume`}>
                    <Icon name={track.volume === 0 ? 'mute' : 'volume'} size={16} />
                    <input type="range" min="0" max="100" value={track.volume} onChange={(event) => updateTrack(track.id, { volume: Number(event.target.value) })} style={{ '--track-range': `${track.volume}%` } as CSSProperties} />
                  </label>
                  <button className={`mute-button ${mutedIds.has(track.id) ? 'muted' : ''}`} onClick={() => toggleMute(track.id)} aria-label={`${mutedIds.has(track.id) ? 'Unmute' : 'Mute'} ${track.title}`}><Icon name={mutedIds.has(track.id) ? 'mute' : 'volume'} size={18} /></button>
                  <button className="delete-button" onClick={() => removeTrack(track.id)} aria-label={`Remove ${track.title}`}><Icon name="trash" size={17} /></button>
                </div>
                <YouTubeEngine track={track} isPlaying={playingIds.has(track.id)} volume={Math.round(masterVolume * track.volume / 100)} muted={mutedIds.has(track.id)} onReady={() => updateTrack(track.id, { state: 'ready' })} onStateChange={(state) => {
                  if (state === window.YT?.PlayerState.PLAYING) updateTrack(track.id, { state: 'playing' })
                  if (state === window.YT?.PlayerState.PAUSED) updateTrack(track.id, { state: 'paused' })
                  if (state === window.YT?.PlayerState.ENDED) {
                    updateTrack(track.id, { state: 'paused' })
                    setPlayingIds((current) => {
                      const next = new Set(current)
                      next.delete(track.id)
                      return next
                    })
                  }
                }} onError={() => {
                  updateTrack(track.id, { state: 'error' })
                  setPlayingIds((current) => {
                    const next = new Set(current)
                    next.delete(track.id)
                    return next
                  })
                }} />
              </article>
            ))}
            {tracks.length === 0 && <div className="empty-state"><button className="add-button" onClick={() => setIsAddOpen(true)}><Icon name="plus" size={18} /> Add sound</button></div>}
          </div>

          <div className="mixer-footer">
            <button className={`play-all ${allPlaying ? 'active' : ''}`} onClick={playAll}><span className="play-all-icon"><Icon name={allPlaying ? 'pause' : 'play'} size={14} /></span>{allPlaying ? 'Pause all sounds' : 'Play all sounds'}</button>
            <div className="master-control"><span className="master-label">MASTER</span><button className="master-volume-icon" onClick={() => setMasterVolume(masterVolume === 0 ? 68 : 0)} aria-label="Toggle master mute"><Icon name={masterVolume === 0 ? 'mute' : 'volume'} size={18} /></button><input type="range" min="0" max="100" value={masterVolume} onChange={(event) => setMasterVolume(Number(event.target.value))} style={{ '--range': `${masterVolume}%` } as CSSProperties} aria-label="Master volume" /><span className="volume-value">{masterVolume}%</span></div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
