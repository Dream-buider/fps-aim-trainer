import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'

interface Target {
  id: number
  x: number
  y: number
  size: number
  createdAt: number
}

interface GameStats {
  score: number
  hits: number
  misses: number
  accuracy: number
}

function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'ended'>('menu')
  const [targets, setTargets] = useState<Target[]>([])
  const [stats, setStats] = useState<GameStats>({ score: 0, hits: 0, misses: 0, accuracy: 0 })
  const [timeLeft, setTimeLeft] = useState(60)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const targetIdRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 鼠标位置追踪
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (gameAreaRef.current) {
      const rect = gameAreaRef.current.getBoundingClientRect()
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }, [])

  // 生成目标
  const spawnTarget = useCallback(() => {
    if (gameAreaRef.current) {
      const rect = gameAreaRef.current.getBoundingClientRect()
      const size = Math.random() * 30 + 30 // 30-60px
      const margin = 100
      const x = Math.random() * (rect.width - size - margin * 2) + margin
      const y = Math.random() * (rect.height - size - margin * 2) + margin
      
      const newTarget: Target = {
        id: targetIdRef.current++,
        x,
        y,
        size,
        createdAt: Date.now()
      }
      
      setTargets(prev => [...prev, newTarget])
    }
  }, [])

  // 点击目标
  const hitTarget = useCallback((targetId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    
    setTargets(prev => prev.filter(t => t.id !== targetId))
    setStats(prev => {
      const newHits = prev.hits + 1
      const total = newHits + prev.misses
      const accuracy = total > 0 ? Math.round((newHits / total) * 100) : 0
      return {
        ...prev,
        score: prev.score + 100 + combo * 10,
        hits: newHits,
        accuracy
      }
    })
    setCombo(prev => {
      const newCombo = prev + 1
      if (newCombo > maxCombo) setMaxCombo(newCombo)
      return newCombo
    })
  }, [combo, maxCombo])

  // 点击空白（miss）
  const handleMiss = useCallback(() => {
    setStats(prev => {
      const newMisses = prev.misses + 1
      const total = prev.hits + newMisses
      const accuracy = total > 0 ? Math.round((prev.hits / total) * 100) : 0
      return {
        ...prev,
        misses: newMisses,
        accuracy
      }
    })
    setCombo(0)
  }, [])

  // 开始游戏
  const startGame = useCallback(() => {
    setGameState('playing')
    setStats({ score: 0, hits: 0, misses: 0, accuracy: 0 })
    setTimeLeft(60)
    setCombo(0)
    setMaxCombo(0)
    setTargets([])
    targetIdRef.current = 0
  }, [])

  // 结束游戏
  const endGame = useCallback(() => {
    setGameState('ended')
    setTargets([])
    if (timerRef.current) clearInterval(timerRef.current)
    if (spawnRef.current) clearInterval(spawnRef.current)
  }, [])

  // 游戏计时器
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            endGame()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      // 生成目标的频率随时间加快
      const spawnInterval = Math.max(400, 1000 - (60 - timeLeft) * 10)
      spawnRef.current = setInterval(spawnTarget, spawnInterval)

      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
        if (spawnRef.current) clearInterval(spawnRef.current)
      }
    }
  }, [gameState, spawnTarget, endGame, timeLeft])

  // 清理过期的目标（3秒后自动消失）
  useEffect(() => {
    if (gameState === 'playing') {
      const cleanup = setInterval(() => {
        const now = Date.now()
        setTargets(prev => prev.filter(t => now - t.createdAt < 3000))
      }, 100)
      return () => clearInterval(cleanup)
    }
  }, [gameState])

  // 初始生成一些目标
  useEffect(() => {
    if (gameState === 'playing') {
      for (let i = 0; i < 3; i++) {
        setTimeout(spawnTarget, i * 300)
      }
    }
  }, [gameState, spawnTarget])

  return (
    <div className="min-h-screen bg-slate-900 text-white overflow-hidden select-none">
      {/* 顶部状态栏 */}
      {gameState === 'playing' && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-slate-800/90 backdrop-blur-sm border-b border-slate-700">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wider">Score</div>
                <div className="text-2xl font-bold text-cyan-400">{stats.score.toLocaleString()}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wider">Time</div>
                <div className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-green-400'}`}>
                  {timeLeft}s
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wider">Accuracy</div>
                <div className="text-2xl font-bold text-yellow-400">{stats.accuracy}%</div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wider">Combo</div>
                <div className={`text-2xl font-bold ${combo > 5 ? 'text-purple-400' : 'text-slate-400'}`}>
                  x{combo}
                </div>
              </div>
              <button
                onClick={endGame}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
              >
                End
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 游戏区域 */}
      <div
        ref={gameAreaRef}
        className="relative w-screen h-screen cursor-none"
        onMouseMove={handleMouseMove}
        onClick={gameState === 'playing' ? handleMiss : undefined}
      >
        {/* 菜单界面 */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="text-center space-y-8">
              <div>
                <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  AIM TRAINER
                </h1>
                <p className="text-slate-400 text-lg">Practice your FPS aiming skills</p>
              </div>
              
              <div className="flex gap-4 justify-center">
                <button
                  onClick={startGame}
                  className="group relative px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-xl rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/25"
                >
                  <span className="relative z-10">START TRAINING</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-6 mt-12 text-center">
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <div className="text-3xl mb-2">🎯</div>
                  <div className="text-sm text-slate-400">Click targets</div>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <div className="text-3xl mb-2">⚡</div>
                  <div className="text-sm text-slate-400">Build combo</div>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <div className="text-3xl mb-2">🏆</div>
                  <div className="text-sm text-slate-400">High score</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 游戏结束界面 */}
        {gameState === 'ended' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-sm">
            <div className="text-center space-y-6 p-8 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl">
              <h2 className="text-4xl font-bold text-white">Training Complete!</h2>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-slate-700/50 rounded-xl text-center">
                  <div className="text-sm text-slate-400 uppercase">Final Score</div>
                  <div className="text-3xl font-bold text-cyan-400">{stats.score.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-xl text-center">
                  <div className="text-sm text-slate-400 uppercase">Max Combo</div>
                  <div className="text-3xl font-bold text-purple-400">x{maxCombo}</div>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-xl text-center">
                  <div className="text-sm text-slate-400 uppercase">Hits</div>
                  <div className="text-3xl font-bold text-green-400">{stats.hits}</div>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-xl text-center">
                  <div className="text-sm text-slate-400 uppercase">Accuracy</div>
                  <div className="text-3xl font-bold text-yellow-400">{stats.accuracy}%</div>
                </div>
              </div>

              <div className="flex gap-4 justify-center mt-6">
                <button
                  onClick={startGame}
                  className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl transition-all hover:scale-105"
                >
                  Play Again
                </button>
                <button
                  onClick={() => setGameState('menu')}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
                >
                  Main Menu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 目标 */}
        {gameState === 'playing' && targets.map(target => (
          <div
            key={target.id}
            className="absolute cursor-pointer animate-target-appear"
            style={{
              left: target.x,
              top: target.y,
              width: target.size,
              height: target.size,
            }}
            onClick={(e) => hitTarget(target.id, e)}
          >
            {/* 目标圆圈 */}
            <div className="relative w-full h-full">
              {/* 外圈 */}
              <div className="absolute inset-0 rounded-full border-4 border-cyan-400/50 animate-ping" />
              {/* 主体 */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/50 hover:from-cyan-300 hover:to-blue-400 transition-colors flex items-center justify-center">
                {/* 中心点 */}
                <div className="w-1/3 h-1/3 rounded-full bg-white/80" />
              </div>
            </div>
          </div>
        ))}

        {/* 自定义准星 */}
        {gameState === 'playing' && (
          <div
            className="fixed pointer-events-none z-50"
            style={{
              left: mousePos.x,
              top: mousePos.y,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {/* 十字准星 */}
            <div className="relative w-8 h-8">
              {/* 水平线 */}
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500 -translate-y-1/2" />
              {/* 垂直线 */}
              <div className="absolute left-1/2 top-0 h-full w-0.5 bg-red-500 -translate-x-1/2" />
              {/* 中心点 */}
              <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
              {/* 外圈 */}
              <div className="absolute inset-0 border-2 border-red-500/50 rounded-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
