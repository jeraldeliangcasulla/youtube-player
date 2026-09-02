export {}

declare global {
  interface Window {
    YT: typeof YT
    onYouTubeIframeAPIReady?: () => void
  }

  namespace YT {
    class Player {
      constructor(element: HTMLElement, options: PlayerOptions)
      destroy(): void
      playVideo(): void
      pauseVideo(): void
      stopVideo(): void
      setVolume(volume: number): void
      mute(): void
      unMute(): void
    }

    interface PlayerOptions {
      videoId: string
      width?: string | number
      height?: string | number
      playerVars?: Record<string, number | string>
      events?: {
        onReady?: (event: PlayerEvent) => void
        onStateChange?: (event: OnStateChangeEvent) => void
        onError?: (event: { data: number }) => void
      }
    }

    interface PlayerEvent {
      target: Player
    }

    interface OnStateChangeEvent {
      data: number
      target: Player
    }

    const PlayerState: {
      UNSTARTED: number
      ENDED: number
      PLAYING: number
      PAUSED: number
      BUFFERING: number
      CUED: number
    }
  }
}
