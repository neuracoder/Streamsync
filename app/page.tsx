'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Music, Video, Youtube } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { APIService } from '@/lib/api-service'
import { toast as sonnerToast } from 'sonner'

export default function YouTubePlayer() {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [videoData, setVideoData] = useState<{
    title: string
    channel: string
    thumbnail: string
    videoId: string
  } | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isAudioMode, setIsAudioMode] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [useBackendAudio, setUseBackendAudio] = useState(true)
  const [wakeLock, setWakeLock] = useState<any>(null)

  const videoRef = useRef<HTMLIFrameElement>(null)
  const playerRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const { toast } = useToast()

  // Initialize YouTube IFrame API
  useEffect(() => {
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

    ;(window as any).onYouTubeIframeAPIReady = () => {
      console.log('[v0] YouTube IFrame API Ready')
    }
  }, [])

  // Setup MediaSession API for background playback
  useEffect(() => {
    if (!videoData || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: videoData.title,
      artist: videoData.channel,
      artwork: [
        { src: videoData.thumbnail, sizes: '512x512', type: 'image/jpeg' },
      ],
    })

    navigator.mediaSession.setActionHandler('play', () => {
      playerRef.current?.playVideo()
      setIsPlaying(true)
    })

    navigator.mediaSession.setActionHandler('pause', () => {
      playerRef.current?.pauseVideo()
      setIsPlaying(false)
    })

    navigator.mediaSession.setActionHandler('seekbackward', () => {
      const current = playerRef.current?.getCurrentTime() || 0
      playerRef.current?.seekTo(Math.max(0, current - 10), true)
    })

    navigator.mediaSession.setActionHandler('seekforward', () => {
      const current = playerRef.current?.getCurrentTime() || 0
      playerRef.current?.seekTo(current + 10, true)
    })
  }, [videoData])

  const extractVideoId = (urlString: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ]

    for (const pattern of patterns) {
      const match = urlString.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  // Wake Lock API to prevent screen sleep during playback
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        const lock = await (navigator as any).wakeLock.request('screen')
        setWakeLock(lock)
        console.log('Wake Lock activado')

        lock.addEventListener('release', () => {
          console.log('Wake Lock liberado')
        })
      }
    } catch (err) {
      console.error('Error al activar Wake Lock:', err)
    }
  }

  // Extract audio using backend API
  const handleExtractAudio = async (youtubeUrl: string) => {
    setIsLoading(true)
    sonnerToast.loading('Extrayendo audio desde backend...')

    try {
      const result = await APIService.extractStream(youtubeUrl)

      if (result.success && result.audioUrl) {
        setAudioUrl(result.audioUrl)
        setVideoData({
          title: result.title || 'Unknown Title',
          channel: result.channel || 'Unknown Channel',
          thumbnail: result.thumbnail || '',
          videoId: extractVideoId(youtubeUrl) || '',
        })
        setDuration(result.duration || 0)
        setIsLoading(false)
        sonnerToast.success('Audio listo para reproducir!')

        // Activar Wake Lock cuando empiece la reproducción
        await requestWakeLock()

        // Setup MediaSession for lockscreen controls
        if ('mediaSession' in navigator && result.title) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: result.title,
            artist: result.channel || 'YouTube',
            artwork: result.thumbnail ? [
              { src: result.thumbnail, sizes: '512x512', type: 'image/jpeg' }
            ] : []
          })

          // Setup media session handlers for audio element
          navigator.mediaSession.setActionHandler('play', () => {
            audioRef.current?.play()
            setIsPlaying(true)
          })

          navigator.mediaSession.setActionHandler('pause', () => {
            audioRef.current?.pause()
            setIsPlaying(false)
          })

          navigator.mediaSession.setActionHandler('seekbackward', () => {
            if (audioRef.current) {
              audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10)
            }
          })

          navigator.mediaSession.setActionHandler('seekforward', () => {
            if (audioRef.current) {
              audioRef.current.currentTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 10)
            }
          })
        }
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Error al extraer audio',
          variant: 'destructive',
        })
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error de conexión',
        description: 'No se pudo conectar con el servidor',
        variant: 'destructive',
      })
      setIsLoading(false)
    } finally {
      sonnerToast.dismiss()
    }
  }

  const loadVideo = async () => {
    const videoId = extractVideoId(url)

    if (!videoId && !url.includes('youtube.com') && !url.includes('youtu.be')) {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid YouTube URL or video ID',
        variant: 'destructive',
      })
      return
    }

    // Use backend API for audio extraction
    if (useBackendAudio) {
      await handleExtractAudio(url)
      return
    }

    // Fallback to YouTube IFrame API
    setIsLoading(true)

    try {
      // Create player
      if (playerRef.current) {
        playerRef.current.destroy()
      }

      playerRef.current = new (window as any).YT.Player('youtube-player', {
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => {
            const data = event.target.getVideoData()
            setVideoData({
              title: data.title,
              channel: data.author,
              thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
              videoId: videoId || '',
            })
            setDuration(event.target.getDuration())
            setIsLoading(false)
            toast({
              title: 'Video Loaded',
              description: data.title,
            })
          },
          onStateChange: (event: any) => {
            setIsPlaying(event.data === 1)
          },
        },
      })
    } catch (error) {
      console.error('[v0] Error loading video:', error)
      toast({
        title: 'Error',
        description: 'Failed to load video. Please try again.',
        variant: 'destructive',
      })
      setIsLoading(false)
    }
  }

  const togglePlayPause = () => {
    // Handle audio element controls
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      return
    }

    // Handle YouTube IFrame API controls
    if (!playerRef.current) return

    if (isPlaying) {
      playerRef.current.pauseVideo()
    } else {
      playerRef.current.playVideo()
    }
  }

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    setCurrentTime(newTime)

    // Handle audio element
    if (audioUrl && audioRef.current) {
      audioRef.current.currentTime = newTime
      return
    }

    // Handle YouTube IFrame
    playerRef.current?.seekTo(newTime, true)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    setIsMuted(newVolume === 0)

    // Handle audio element
    if (audioUrl && audioRef.current) {
      audioRef.current.volume = newVolume
      return
    }

    // Handle YouTube IFrame
    playerRef.current?.setVolume(newVolume * 100)
  }

  const toggleMute = () => {
    // Handle audio element
    if (audioUrl && audioRef.current) {
      if (isMuted) {
        audioRef.current.muted = false
        setVolume(1)
        audioRef.current.volume = 1
      } else {
        audioRef.current.muted = true
        setVolume(0)
      }
      setIsMuted(!isMuted)
      return
    }

    // Handle YouTube IFrame
    if (isMuted) {
      playerRef.current?.unMute()
      setVolume(1)
    } else {
      playerRef.current?.mute()
      setVolume(0)
    }
    setIsMuted(!isMuted)
  }

  // Update current time
  useEffect(() => {
    const interval = setInterval(() => {
      // Update from audio element
      if (audioUrl && audioRef.current) {
        setCurrentTime(audioRef.current.currentTime)
        if (!duration && audioRef.current.duration) {
          setDuration(audioRef.current.duration)
        }
      }
      // Update from YouTube IFrame
      else if (playerRef.current && isPlaying) {
        setCurrentTime(playerRef.current.getCurrentTime())
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isPlaying, audioUrl, duration])

  // Setup audio element event listeners
  useEffect(() => {
    if (!audioRef.current) return

    const audio = audioRef.current

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)

    return () => {
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [audioUrl])

  // Cleanup Wake Lock on unmount
  useEffect(() => {
    return () => {
      if (wakeLock) {
        wakeLock.release()
      }
    }
  }, [wakeLock])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-teal-900 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-teal-400 bg-clip-text text-transparent mb-2 text-balance">
            StreamSync
          </h1>
          <p className="text-teal-300/80 text-lg">Premium YouTube Streaming Experience</p>
        </div>

        {/* Input Section */}
        {!videoData && (
          <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20 shadow-2xl mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl">
                <Youtube className="w-8 h-8 text-white" />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadVideo()}
                placeholder="Paste YouTube URL or Video ID"
                className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
              />
            </div>
            <Button
              onClick={loadVideo}
              disabled={isLoading || !url}
              className="w-full bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700 text-white font-semibold py-6 rounded-xl text-lg shadow-lg shadow-purple-500/50 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  Loading Video...
                </span>
              ) : (
                'Load Video'
              )}
            </Button>
          </div>
        )}

        {/* Video Player Section */}
        {videoData && (
          <div className="space-y-6">
            {/* Video Container */}
            <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
              <div className={`relative ${isAudioMode ? 'h-0 opacity-0' : 'h-auto opacity-100'} transition-all duration-500`}>
                <div className="relative pt-[56.25%]">
                  <div id="youtube-player" className="absolute inset-0 w-full h-full" />
                </div>
              </div>

              {/* Audio Mode Thumbnail */}
              {isAudioMode && (
                <div className="relative h-64 bg-gradient-to-br from-purple-900/50 to-teal-900/50 flex items-center justify-center">
                  <img
                    src={videoData.thumbnail || "/placeholder.svg"}
                    alt={videoData.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm"
                  />
                  <div className="relative z-10 text-center">
                    <div className="p-6 bg-gradient-to-br from-purple-600 to-teal-600 rounded-full mx-auto w-24 h-24 flex items-center justify-center mb-4 animate-pulse">
                      <Music className="w-12 h-12 text-white" />
                    </div>
                    <p className="text-white/80 font-semibold">Audio Only Mode</p>
                  </div>
                </div>
              )}

              {/* Mode Toggle */}
              <div className="p-4 bg-black/20 flex justify-center">
                <button
                  onClick={() => setIsAudioMode(!isAudioMode)}
                  className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full border border-white/20 transition-all text-white font-medium"
                >
                  {isAudioMode ? (
                    <>
                      <Video className="w-5 h-5" />
                      Switch to Video Mode
                    </>
                  ) : (
                    <>
                      <Music className="w-5 h-5" />
                      Switch to Audio Mode
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Video Info */}
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-1 text-balance">{videoData.title}</h2>
              <p className="text-teal-300/80">{videoData.channel}</p>
            </div>

            {/* Playback Controls */}
            <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20 shadow-2xl">
              {/* Progress Bar */}
              <div className="mb-6">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleProgressChange}
                  className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-purple-500 [&::-webkit-slider-thumb]:to-teal-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
                />
                <div className="flex justify-between text-sm text-white/60 mt-2">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Play/Pause Button */}
              <div className="flex justify-center mb-6">
                <button
                  onClick={togglePlayPause}
                  className="p-6 bg-gradient-to-br from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700 rounded-full shadow-lg shadow-purple-500/50 transition-all transform hover:scale-105 active:scale-95"
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 text-white fill-white" />
                  ) : (
                    <Play className="w-8 h-8 text-white fill-white" />
                  )}
                </button>
              </div>

              {/* Volume Control */}
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleMute}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="flex-1 h-2 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-purple-500 [&::-webkit-slider-thumb]:to-teal-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
                />
              </div>
            </div>

            {/* Native Audio Player (Hidden) */}
            {audioUrl && (
              <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-4 border border-white/20">
                <p className="text-white/80 text-sm mb-2 text-center">Background Playback Enabled</p>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  preload="auto"
                  className="hidden"
                  onPlay={async () => {
                    await requestWakeLock()
                    if ('mediaSession' in navigator) {
                      navigator.mediaSession.playbackState = 'playing'
                    }
                  }}
                  onPause={() => {
                    if (wakeLock) {
                      wakeLock.release()
                    }
                    if ('mediaSession' in navigator) {
                      navigator.mediaSession.playbackState = 'paused'
                    }
                  }}
                  onEnded={() => {
                    if (wakeLock) {
                      wakeLock.release()
                    }
                  }}
                />
                <div className="flex items-center justify-center gap-2 text-teal-300/80 text-xs">
                  <Music className="w-4 h-4" />
                  <span>Audio stream from backend API</span>
                </div>
              </div>
            )}

            {/* Reset Button */}
            <button
              onClick={() => {
                setVideoData(null)
                setUrl('')
                setIsPlaying(false)
                setIsAudioMode(false)
                setAudioUrl(null)
                if (audioRef.current) {
                  audioRef.current.pause()
                  audioRef.current.src = ''
                }
                if (playerRef.current) {
                  playerRef.current.destroy()
                  playerRef.current = null
                }
              }}
              className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 text-white font-medium transition-all"
            >
              Load Different Video
            </button>
          </div>
        )}
      </div>

      <Toaster />
    </div>
  )
}
