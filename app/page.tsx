'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { callAIAgent, type AIAgentResponse } from '@/lib/aiAgent'
import { FiLayout, FiEdit3, FiSearch, FiImage, FiPlus, FiCopy, FiDownload, FiArrowRight, FiSend, FiTrendingUp, FiX, FiRefreshCw, FiChevronRight, FiBarChart2, FiTag, FiFileText, FiAlertCircle, FiCheckCircle, FiLoader } from 'react-icons/fi'

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const CONTENT_COORDINATOR_ID = '6995967d1ca5cd36a5c31b03'
const SEO_AGENT_ID = '699596a1f55ddf0ca0a37e8a'
const GRAPHIC_AGENT_ID = '699596a130d90c5d3d534af1'

const AGENTS = [
  { id: CONTENT_COORDINATOR_ID, name: 'Content Coordinator', purpose: 'Researches and creates polished marketing content' },
  { id: SEO_AGENT_ID, name: 'SEO Analysis Agent', purpose: 'Analyzes content for SEO optimization' },
  { id: GRAPHIC_AGENT_ID, name: 'Graphic Generator', purpose: 'Creates marketing visuals and graphics' },
]

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type TabType = 'dashboard' | 'content' | 'seo' | 'graphics'

interface ContentItem {
  title: string
  content: string
  meta_description: string
  format_type: string
  word_count: number
  key_highlights: string[]
  date: string
  seoScore?: number
}

interface SEOItem {
  overall_seo_score: number
  keyword_analysis: {
    target_keywords: { keyword: string; density: string; occurrences: number }[]
    suggestions: string[]
  }
  readability: {
    score: number
    reading_level: string
    avg_sentence_length: string
    feedback: string
  }
  meta_suggestions: {
    meta_title: string
    meta_description: string
  }
  heading_structure: {
    current_structure: string[]
    suggestions: string[]
  }
  recommendations: { priority: string; recommendation: string; impact: string }[]
  date: string
  contentPreview: string
}

interface GraphicItem {
  imageUrl: string
  image_description: string
  style_applied: string
  aspect_ratio: string
  design_notes: string
  description: string
  date: string
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function parseAgentResponse(result: AIAgentResponse): any {
  try {
    const response = result?.response
    if (!response) return null
    const data = response?.result
    if (data && typeof data === 'object' && Object.keys(data).length > 0) {
      return data
    }
    if (response?.message) {
      try {
        return JSON.parse(response.message)
      } catch {
        return null
      }
    }
    return null
  } catch {
    return null
  }
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## '))
          return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  )
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return d
  }
}

// ──────────────────────────────────────────────
// SVG Score Ring
// ──────────────────────────────────────────────

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const safeScore = typeof score === 'number' ? Math.max(0, Math.min(100, score)) : 0
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (safeScore / 100) * circumference
  const color = safeScore >= 70 ? 'hsl(142, 70%, 45%)' : safeScore >= 50 ? 'hsl(35, 85%, 55%)' : 'hsl(0, 70%, 55%)'

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(30, 30%, 90%)" strokeWidth="10" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-700" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold" style={{ color }}>{safeScore}</span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Glass Card
// ──────────────────────────────────────────────

function GlassCard({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`backdrop-blur-[16px] bg-white/75 border border-white/[0.18] rounded-[0.875rem] shadow-md ${className}`}>
      {children}
    </div>
  )
}

// ──────────────────────────────────────────────
// Skeleton Loader
// ──────────────────────────────────────────────

function SkeletonBlock({ lines = 5, label = 'Loading...' }: { lines?: number; label?: string }) {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-2 text-muted-foreground">
        <FiLoader className="h-4 w-4 animate-spin" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg h-4 bg-muted" style={{ width: `${85 - i * 10}%` }} />
        ))}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Error Banner
// ──────────────────────────────────────────────

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-[0.875rem]">
      <FiAlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
      <span className="text-sm text-destructive flex-1">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-medium text-destructive hover:underline flex items-center gap-1">
          <FiRefreshCw className="h-3 w-3" /> Retry
        </button>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Priority Badge
// ──────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  const p = (priority ?? '').toLowerCase()
  const styles = p === 'high' ? 'bg-red-100 text-red-700' : p === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles}`}>{priority ?? 'Low'}</span>
}

// ──────────────────────────────────────────────
// Sample Data
// ──────────────────────────────────────────────

const SAMPLE_CONTENT: ContentItem = {
  title: 'The Future of AI-Powered Marketing Automation',
  content: '## Introduction\n\nArtificial intelligence is transforming how marketers approach campaign planning, audience segmentation, and content creation.\n\n## Key Trends\n\n- **Predictive Analytics**: AI models can forecast customer behavior with up to 85% accuracy.\n- **Hyper-Personalization**: Content tailored to micro-segments of your audience.\n- **Automated A/B Testing**: AI runs multivariate tests 10x faster than manual methods.\n\n## Best Practices\n\n1. Start with clean data foundations\n2. Integrate AI gradually into existing workflows\n3. Measure ROI consistently across channels\n\n## Conclusion\n\nMarketers who embrace AI today will lead their industries tomorrow.',
  meta_description: 'Discover how AI-powered marketing automation is transforming campaign planning and content creation for modern marketers.',
  format_type: 'Blog Post',
  word_count: 450,
  key_highlights: ['AI-powered predictive analytics drive 85% accuracy', 'Hyper-personalization increases engagement by 40%', 'Automated A/B testing runs 10x faster'],
  date: new Date().toISOString(),
}

const SAMPLE_SEO: SEOItem = {
  overall_seo_score: 74,
  keyword_analysis: {
    target_keywords: [
      { keyword: 'AI marketing', density: '2.4%', occurrences: 8 },
      { keyword: 'marketing automation', density: '1.8%', occurrences: 6 },
      { keyword: 'predictive analytics', density: '1.2%', occurrences: 4 },
    ],
    suggestions: ['Add long-tail keywords like "AI marketing tools for small businesses"', 'Increase keyword density for "marketing automation" to 2.5%'],
  },
  readability: { score: 68, reading_level: 'Grade 10', avg_sentence_length: '18 words', feedback: 'Good readability overall. Consider shortening some complex sentences.' },
  meta_suggestions: { meta_title: 'AI Marketing Automation: The Future of Digital Marketing | 2024 Guide', meta_description: 'Learn how AI-powered marketing automation transforms campaigns with predictive analytics and hyper-personalization. Complete guide for modern marketers.' },
  heading_structure: { current_structure: ['H1: The Future of AI Marketing', 'H2: Key Trends', 'H2: Best Practices', 'H2: Conclusion'], suggestions: ['Add H3 subheadings under Key Trends', 'Include an FAQ section with H2 heading'] },
  recommendations: [
    { priority: 'High', recommendation: 'Add alt text to all images', impact: 'Improves accessibility and image search ranking' },
    { priority: 'High', recommendation: 'Include internal links to related content', impact: 'Boosts page authority and reduces bounce rate' },
    { priority: 'Medium', recommendation: 'Add schema markup for article type', impact: 'Enables rich snippets in search results' },
    { priority: 'Low', recommendation: 'Optimize page load speed', impact: 'Minor improvement to Core Web Vitals' },
  ],
  date: new Date().toISOString(),
  contentPreview: 'The Future of AI-Powered Marketing Automation...',
}

const SAMPLE_GRAPHIC: GraphicItem = {
  imageUrl: 'https://placehold.co/800x600/F97316/FFF?text=Marketing+Visual',
  image_description: 'A modern marketing infographic featuring AI analytics dashboard',
  style_applied: 'Modern',
  aspect_ratio: '16:9',
  design_notes: 'Clean layout with vibrant orange accents and data visualization elements.',
  description: 'AI Marketing Dashboard Infographic',
  date: new Date().toISOString(),
}

// ──────────────────────────────────────────────
// Dashboard Screen
// ──────────────────────────────────────────────

function DashboardScreen({
  contentHistory,
  seoHistory,
  graphicsHistory,
  onNavigate,
  showSample,
}: {
  contentHistory: ContentItem[]
  seoHistory: SEOItem[]
  graphicsHistory: GraphicItem[]
  onNavigate: (tab: TabType) => void
  showSample: boolean
}) {
  const displayContent = showSample && contentHistory.length === 0 ? [SAMPLE_CONTENT] : contentHistory
  const displaySeo = showSample && seoHistory.length === 0 ? [SAMPLE_SEO] : seoHistory
  const displayGraphics = showSample && graphicsHistory.length === 0 ? [SAMPLE_GRAPHIC] : graphicsHistory

  const avgSeo = displaySeo.length > 0
    ? Math.round(displaySeo.reduce((acc, s) => acc + (s?.overall_seo_score ?? 0), 0) / displaySeo.length)
    : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your marketing command center</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => onNavigate('content')} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-[0.875rem] font-medium text-sm hover:bg-primary/90 transition-colors">
            <FiPlus className="h-4 w-4" /> New Content
          </button>
          <button onClick={() => onNavigate('seo')} className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-[0.875rem] font-medium text-sm hover:bg-secondary/80 transition-colors">
            <FiSearch className="h-4 w-4" /> New Analysis
          </button>
          <button onClick={() => onNavigate('graphics')} className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-[0.875rem] font-medium text-sm hover:bg-secondary/80 transition-colors">
            <FiImage className="h-4 w-4" /> New Graphic
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><FiFileText className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{displayContent.length}</p>
              <p className="text-xs text-muted-foreground">Content Pieces</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><FiTrendingUp className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{avgSeo}</p>
              <p className="text-xs text-muted-foreground">Avg SEO Score</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10"><FiImage className="h-5 w-5 text-purple-600" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{displayGraphics.length}</p>
              <p className="text-xs text-muted-foreground">Graphics Created</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Content */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Recent Content</h2>
            <button onClick={() => onNavigate('content')} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              View All <FiChevronRight className="h-3 w-3" />
            </button>
          </div>
          {displayContent.length === 0 ? (
            <div className="text-center py-10">
              <FiEdit3 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No content yet. Create your first piece!</p>
              <button onClick={() => onNavigate('content')} className="mt-3 text-sm text-primary font-medium hover:underline">Get Started</button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {displayContent.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="p-1.5 rounded bg-primary/10 mt-0.5"><FiFileText className="h-4 w-4 text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item?.title ?? 'Untitled'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-secondary-foreground">{item?.format_type ?? 'Content'}</span>
                      <span className="text-xs text-muted-foreground">{item?.word_count ?? 0} words</span>
                      <span className="text-xs text-muted-foreground">{formatDate(item?.date ?? '')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Recent Graphics */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Recent Graphics</h2>
            <button onClick={() => onNavigate('graphics')} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              View All <FiChevronRight className="h-3 w-3" />
            </button>
          </div>
          {displayGraphics.length === 0 ? (
            <div className="text-center py-10">
              <FiImage className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No graphics yet. Create your first visual!</p>
              <button onClick={() => onNavigate('graphics')} className="mt-3 text-sm text-primary font-medium hover:underline">Get Started</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
              {displayGraphics.slice(0, 6).map((item, idx) => (
                <div key={idx} className="rounded-lg overflow-hidden border border-border group relative">
                  <img src={item?.imageUrl ?? ''} alt={item?.description ?? 'Marketing graphic'} className="w-full h-32 object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <p className="text-xs text-white truncate">{item?.description ?? ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Content Studio Screen
// ──────────────────────────────────────────────

function ContentStudioScreen({
  onAddContent,
  onSendToSeo,
}: {
  onAddContent: (item: ContentItem) => void
  onSendToSeo: (content: string) => void
}) {
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('Marketing Professionals')
  const [tone, setTone] = useState('Professional')
  const [format, setFormat] = useState('Blog Post')
  const [wordCount, setWordCount] = useState(800)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ContentItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const audiences = ['Marketing Professionals', 'Small Business Owners', 'Tech Enthusiasts', 'General Consumers', 'Enterprise Decision Makers']
  const tones = ['Professional', 'Casual', 'Persuasive', 'Witty']
  const formats = ['Blog Post', 'Social Copy', 'Email', 'Ad Copy']

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    const message = `Create ${format} content about: ${topic}\n\nTarget Audience: ${audience}\nTone: ${tone}\nWord Count: ${wordCount}\n\nPlease research the topic thoroughly and produce a polished, publish-ready piece.`
    const res = await callAIAgent(message, CONTENT_COORDINATOR_ID)

    if (res.success) {
      const data = parseAgentResponse(res)
      if (data) {
        const item: ContentItem = {
          title: data?.title ?? topic,
          content: data?.content ?? '',
          meta_description: data?.meta_description ?? '',
          format_type: data?.format_type ?? format,
          word_count: typeof data?.word_count === 'number' ? data.word_count : wordCount,
          key_highlights: Array.isArray(data?.key_highlights) ? data.key_highlights : [],
          date: new Date().toISOString(),
        }
        setResult(item)
        onAddContent(item)
      } else {
        setError('Could not parse the agent response. Please try again.')
      }
    } else {
      setError(res?.error ?? 'An error occurred while generating content.')
    }

    setLoading(false)
  }, [topic, audience, tone, format, wordCount, onAddContent])

  const handleCopy = useCallback(async () => {
    if (!result?.content) return
    try {
      await navigator.clipboard.writeText(result.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* silent */
    }
  }, [result])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Content Studio</h1>
        <p className="text-sm text-muted-foreground mt-1">Create publish-ready marketing content with AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input Form */}
        <GlassCard className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Topic</label>
            <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., The Future of AI in Marketing" className="w-full border border-input bg-background rounded-[0.875rem] px-4 py-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Target Audience</label>
            <select value={audience} onChange={(e) => setAudience(e.target.value)} className="w-full border border-input bg-background rounded-[0.875rem] px-4 py-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none">
              {audiences.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Tone</label>
            <div className="flex flex-wrap gap-2">
              {tones.map((t) => (
                <button key={t} onClick={() => setTone(t)} className={`px-4 py-2 rounded-[0.875rem] text-sm font-medium transition-colors ${tone === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Format</label>
            <div className="flex flex-wrap gap-2">
              {formats.map((f) => (
                <button key={f} onClick={() => setFormat(f)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${format === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Word Count: {wordCount}</label>
            <input type="range" min={200} max={2000} step={100} value={wordCount} onChange={(e) => setWordCount(Number(e.target.value))} className="w-full accent-primary" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>200</span><span>2000</span>
            </div>
          </div>

          <button onClick={handleGenerate} disabled={loading || !topic.trim()} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-[0.875rem] font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <><FiLoader className="h-4 w-4 animate-spin" /> Researching & Writing...</> : <><FiEdit3 className="h-4 w-4" /> Generate Content</>}
          </button>
        </GlassCard>

        {/* Right: Output */}
        <GlassCard className="p-6 overflow-hidden">
          {loading ? (
            <SkeletonBlock lines={8} label="Researching & Writing..." />
          ) : error ? (
            <ErrorBanner message={error} onRetry={handleGenerate} />
          ) : result ? (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold text-foreground">{result?.title ?? 'Generated Content'}</h2>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{result?.format_type ?? format}</span>
                  <span className="text-xs text-muted-foreground">{result?.word_count ?? 0}w</span>
                </div>
              </div>
              {result?.meta_description && (
                <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-3">{result.meta_description}</p>
              )}
              <div className="text-foreground">{renderMarkdown(result?.content ?? '')}</div>
              {Array.isArray(result?.key_highlights) && result.key_highlights.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs font-semibold text-foreground mb-2">Key Highlights</p>
                  <ul className="space-y-1">
                    {result.key_highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <FiCheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex gap-2 pt-3 border-t border-border">
                <button onClick={handleCopy} className="inline-flex items-center gap-1.5 px-3 py-2 bg-secondary text-secondary-foreground rounded-[0.875rem] text-xs font-medium hover:bg-secondary/80 transition-colors">
                  {copied ? <><FiCheckCircle className="h-3 w-3" /> Copied!</> : <><FiCopy className="h-3 w-3" /> Copy</>}
                </button>
                <button onClick={() => { onSendToSeo(result?.content ?? ''); }} className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-[0.875rem] text-xs font-medium hover:bg-primary/90 transition-colors">
                  <FiArrowRight className="h-3 w-3" /> Send to SEO
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <FiEdit3 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Configure your content settings and click Generate to create marketing content.</p>
              <p className="text-xs text-muted-foreground mt-2">The Content Coordinator will research your topic and produce polished copy.</p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// SEO Analyzer Screen
// ──────────────────────────────────────────────

function SEOAnalyzerScreen({
  initialContent,
  onAddSeo,
}: {
  initialContent: string
  onAddSeo: (item: SEOItem) => void
}) {
  const [content, setContent] = useState(initialContent)
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SEOItem | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Sync initialContent changes
  useEffect(() => {
    if (initialContent) setContent(initialContent)
  }, [initialContent])

  const addKeyword = useCallback(() => {
    const kw = keywordInput.trim()
    if (kw && !keywords.includes(kw)) {
      setKeywords((prev) => [...prev, kw])
      setKeywordInput('')
    }
  }, [keywordInput, keywords])

  const removeKeyword = useCallback((kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw))
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); addKeyword() }
  }, [addKeyword])

  const handleAnalyze = useCallback(async () => {
    if (!content.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    const message = `Analyze the following content for SEO optimization:\n\n${content}\n\n${keywords.length > 0 ? `Target Keywords: ${keywords.join(', ')}` : 'No specific target keywords provided - identify the most relevant ones.'}`
    const res = await callAIAgent(message, SEO_AGENT_ID)

    if (res.success) {
      const data = parseAgentResponse(res)
      if (data) {
        const item: SEOItem = {
          overall_seo_score: typeof data?.overall_seo_score === 'number' ? data.overall_seo_score : 0,
          keyword_analysis: {
            target_keywords: Array.isArray(data?.keyword_analysis?.target_keywords) ? data.keyword_analysis.target_keywords : [],
            suggestions: Array.isArray(data?.keyword_analysis?.suggestions) ? data.keyword_analysis.suggestions : [],
          },
          readability: {
            score: typeof data?.readability?.score === 'number' ? data.readability.score : 0,
            reading_level: data?.readability?.reading_level ?? '',
            avg_sentence_length: data?.readability?.avg_sentence_length ?? '',
            feedback: data?.readability?.feedback ?? '',
          },
          meta_suggestions: {
            meta_title: data?.meta_suggestions?.meta_title ?? '',
            meta_description: data?.meta_suggestions?.meta_description ?? '',
          },
          heading_structure: {
            current_structure: Array.isArray(data?.heading_structure?.current_structure) ? data.heading_structure.current_structure : [],
            suggestions: Array.isArray(data?.heading_structure?.suggestions) ? data.heading_structure.suggestions : [],
          },
          recommendations: Array.isArray(data?.recommendations) ? data.recommendations : [],
          date: new Date().toISOString(),
          contentPreview: content.slice(0, 100) + '...',
        }
        setResult(item)
        onAddSeo(item)
      } else {
        setError('Could not parse SEO analysis response. Please try again.')
      }
    } else {
      setError(res?.error ?? 'An error occurred during SEO analysis.')
    }

    setLoading(false)
  }, [content, keywords, onAddSeo])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">SEO Analyzer</h1>
        <p className="text-sm text-muted-foreground mt-1">Optimize your content for search engines</p>
      </div>

      {/* Input Section */}
      <GlassCard className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Content to Analyze</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste your content here for SEO analysis..." rows={6} className="w-full border border-input bg-background rounded-[0.875rem] px-4 py-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none resize-y" />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Target Keywords</label>
          <div className="flex gap-2">
            <input type="text" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type keyword and press Enter" className="flex-1 border border-input bg-background rounded-[0.875rem] px-4 py-2.5 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            <button onClick={addKeyword} disabled={!keywordInput.trim()} className="px-4 py-2.5 bg-secondary text-secondary-foreground rounded-[0.875rem] text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50">
              <FiPlus className="h-4 w-4" />
            </button>
          </div>
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {keywords.map((kw) => (
                <span key={kw} className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                  <FiTag className="h-3 w-3" /> {kw}
                  <button onClick={() => removeKeyword(kw)} className="ml-0.5 hover:text-destructive transition-colors"><FiX className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        <button onClick={handleAnalyze} disabled={loading || !content.trim()} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-[0.875rem] font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <><FiLoader className="h-4 w-4 animate-spin" /> Analyzing...</> : <><FiSearch className="h-4 w-4" /> Analyze SEO</>}
        </button>
      </GlassCard>

      {/* Results Section */}
      {loading && (
        <GlassCard className="p-0">
          <SkeletonBlock lines={6} label="Running SEO analysis..." />
        </GlassCard>
      )}

      {error && <ErrorBanner message={error} onRetry={handleAnalyze} />}

      {result && !loading && (
        <div className="space-y-6">
          {/* Score + Readability */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="p-6 flex flex-col items-center justify-center">
              <p className="text-sm font-semibold text-foreground mb-4">Overall SEO Score</p>
              <ScoreRing score={result?.overall_seo_score ?? 0} size={140} />
            </GlassCard>

            <GlassCard className="p-6 space-y-3">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2"><FiBarChart2 className="h-4 w-4 text-primary" /> Readability</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Score</p>
                  <p className="text-lg font-bold text-foreground">{result?.readability?.score ?? 0}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Reading Level</p>
                  <p className="text-sm font-semibold text-foreground">{result?.readability?.reading_level ?? 'N/A'}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Avg Sentence</p>
                  <p className="text-sm font-semibold text-foreground">{result?.readability?.avg_sentence_length ?? 'N/A'}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg col-span-2">
                  <p className="text-xs text-muted-foreground">Feedback</p>
                  <p className="text-sm text-foreground mt-1">{result?.readability?.feedback ?? 'No feedback available.'}</p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Keyword Analysis */}
          <GlassCard className="p-6 space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2"><FiTag className="h-4 w-4 text-primary" /> Keyword Analysis</p>
            {Array.isArray(result?.keyword_analysis?.target_keywords) && result.keyword_analysis.target_keywords.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Keyword</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Density</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Occurrences</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.keyword_analysis.target_keywords.map((kw, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 px-3 font-medium">{kw?.keyword ?? ''}</td>
                        <td className="py-2 px-3 text-muted-foreground">{kw?.density ?? ''}</td>
                        <td className="py-2 px-3 text-muted-foreground">{kw?.occurrences ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No keyword data available.</p>
            )}
            {Array.isArray(result?.keyword_analysis?.suggestions) && result.keyword_analysis.suggestions.length > 0 && (
              <div className="pt-3 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Suggestions</p>
                <ul className="space-y-1">
                  {result.keyword_analysis.suggestions.map((s, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2"><FiChevronRight className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </GlassCard>

          {/* Meta Suggestions */}
          <GlassCard className="p-6 space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2"><FiFileText className="h-4 w-4 text-primary" /> Meta Tag Suggestions</p>
            <div className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Suggested Title</p>
                <p className="text-sm font-medium text-foreground">{result?.meta_suggestions?.meta_title ?? 'No suggestion'}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Suggested Meta Description</p>
                <p className="text-sm text-foreground">{result?.meta_suggestions?.meta_description ?? 'No suggestion'}</p>
              </div>
            </div>
          </GlassCard>

          {/* Heading Structure */}
          <GlassCard className="p-6 space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2"><FiLayout className="h-4 w-4 text-primary" /> Heading Structure</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Current Structure</p>
                {Array.isArray(result?.heading_structure?.current_structure) && result.heading_structure.current_structure.length > 0 ? (
                  <ul className="space-y-1">
                    {result.heading_structure.current_structure.map((h, i) => (
                      <li key={i} className="text-xs text-foreground pl-2 border-l-2 border-primary/30 py-0.5">{h}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No headings detected.</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Suggestions</p>
                {Array.isArray(result?.heading_structure?.suggestions) && result.heading_structure.suggestions.length > 0 ? (
                  <ul className="space-y-1">
                    {result.heading_structure.suggestions.map((s, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2"><FiChevronRight className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />{s}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No suggestions.</p>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Recommendations */}
          <GlassCard className="p-6 space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2"><FiTrendingUp className="h-4 w-4 text-primary" /> Recommendations</p>
            {Array.isArray(result?.recommendations) && result.recommendations.length > 0 ? (
              <div className="space-y-3">
                {result.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <PriorityBadge priority={rec?.priority ?? 'Low'} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{rec?.recommendation ?? ''}</p>
                      {rec?.impact && <p className="text-xs text-muted-foreground mt-1">{rec.impact}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recommendations available.</p>
            )}
          </GlassCard>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <GlassCard className="p-6">
          <div className="text-center py-12">
            <FiSearch className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Paste your content above and click Analyze to get SEO insights.</p>
            <p className="text-xs text-muted-foreground mt-2">The SEO Agent evaluates keyword density, readability, meta tags, and more.</p>
          </div>
        </GlassCard>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Graphics Studio Screen
// ──────────────────────────────────────────────

function GraphicsStudioScreen({
  onAddGraphic,
}: {
  onAddGraphic: (item: GraphicItem) => void
}) {
  const [description, setDescription] = useState('')
  const [style, setStyle] = useState('Modern')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GraphicItem | null>(null)
  const [error, setError] = useState<string | null>(null)

  const styles = ['Modern', 'Minimalist', 'Bold', 'Playful']
  const ratios = ['1:1', '16:9', '9:16', '4:3']

  const handleGenerate = useCallback(async () => {
    if (!description.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const message = `Create a ${style} marketing visual with ${aspectRatio} aspect ratio.\n\nDescription: ${description}\n\nStyle: ${style}\nPlease generate a professional, high-quality marketing graphic.`
      const res = await callAIAgent(message, GRAPHIC_AGENT_ID)

      if (res.success) {
        const data = parseAgentResponse(res)

        // Extract image URL from multiple possible locations
        let imageUrl = ''

        // 1. Top-level module_outputs (standard path)
        const topModuleFiles = res?.module_outputs?.artifact_files
        if (Array.isArray(topModuleFiles) && topModuleFiles.length > 0) {
          imageUrl = topModuleFiles[0]?.file_url ?? ''
        }

        // 2. Check inside response.result for module_outputs or image URLs
        if (!imageUrl && data) {
          // Some agents return image_url or url directly in the result
          if (typeof data?.image_url === 'string' && data.image_url) {
            imageUrl = data.image_url
          } else if (typeof data?.url === 'string' && data.url) {
            imageUrl = data.url
          } else if (typeof data?.file_url === 'string' && data.file_url) {
            imageUrl = data.file_url
          }
          // Check if module_outputs is nested inside the parsed data
          const nestedFiles = data?.module_outputs?.artifact_files
          if (!imageUrl && Array.isArray(nestedFiles) && nestedFiles.length > 0) {
            imageUrl = nestedFiles[0]?.file_url ?? ''
          }
        }

        // 3. Check raw_response for module_outputs as fallback
        if (!imageUrl && res?.raw_response) {
          try {
            const rawParsed = typeof res.raw_response === 'string' ? JSON.parse(res.raw_response) : res.raw_response
            const rawFiles = rawParsed?.module_outputs?.artifact_files
              ?? rawParsed?.response?.module_outputs?.artifact_files
            if (Array.isArray(rawFiles) && rawFiles.length > 0) {
              imageUrl = rawFiles[0]?.file_url ?? ''
            }
          } catch {
            // ignore parse failures on raw_response
          }
        }

        const item: GraphicItem = {
          imageUrl,
          image_description: data?.image_description ?? description,
          style_applied: data?.style_applied ?? style,
          aspect_ratio: data?.aspect_ratio ?? aspectRatio,
          design_notes: data?.design_notes ?? '',
          description,
          date: new Date().toISOString(),
        }
        setResult(item)
        if (imageUrl) {
          onAddGraphic(item)
        } else {
          setError('The graphic was processed but no image was returned. This can happen with certain prompts. Please try rephrasing your description or try again.')
        }
      } else {
        setError(res?.error ?? 'An error occurred while generating the graphic. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.')
    }

    setLoading(false)
  }, [description, style, aspectRatio, onAddGraphic])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Graphics Studio</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate marketing visuals with AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <GlassCard className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the marketing visual you want to create..." rows={4} className="w-full border border-input bg-background rounded-[0.875rem] px-4 py-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none resize-y" />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Style</label>
            <div className="flex flex-wrap gap-2">
              {styles.map((s) => (
                <button key={s} onClick={() => setStyle(s)} className={`px-4 py-2 rounded-[0.875rem] text-sm font-medium transition-colors ${style === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Aspect Ratio</label>
            <div className="flex flex-wrap gap-2">
              {ratios.map((r) => (
                <button key={r} onClick={() => setAspectRatio(r)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${aspectRatio === r ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleGenerate} disabled={loading || !description.trim()} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-[0.875rem] font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <><FiLoader className="h-4 w-4 animate-spin" /> Creating your graphic...</> : <><FiImage className="h-4 w-4" /> Generate Graphic</>}
          </button>
        </GlassCard>

        {/* Right: Output */}
        <GlassCard className="p-6 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-48 h-48 rounded-[0.875rem] bg-muted animate-pulse" />
              <p className="text-sm text-muted-foreground flex items-center gap-2"><FiLoader className="h-4 w-4 animate-spin" /> Creating your graphic...</p>
              <p className="text-xs text-muted-foreground">Image generation may take 15-30 seconds</p>
            </div>
          ) : error && !result ? (
            <ErrorBanner message={error} onRetry={handleGenerate} />
          ) : result ? (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {error && <ErrorBanner message={error} onRetry={handleGenerate} />}
              {result?.imageUrl ? (
                <div className="rounded-[0.875rem] overflow-hidden border border-border">
                  <img src={result.imageUrl} alt={result?.image_description ?? 'Generated graphic'} className="w-full object-contain max-h-[400px]" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </div>
              ) : !error ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No image generated. Try again with a different description.</div>
              ) : null}

              {/* Metadata */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{result?.style_applied ?? style}</span>
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{result?.aspect_ratio ?? aspectRatio}</span>
                </div>
                {result?.image_description && (
                  <p className="text-sm text-foreground">{result.image_description}</p>
                )}
                {result?.design_notes && (
                  <p className="text-xs text-muted-foreground italic">{result.design_notes}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-border">
                {result?.imageUrl && (
                  <a href={result.imageUrl} download="marketing-graphic" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 bg-secondary text-secondary-foreground rounded-[0.875rem] text-xs font-medium hover:bg-secondary/80 transition-colors">
                    <FiDownload className="h-3 w-3" /> Download
                  </a>
                )}
                <button onClick={handleGenerate} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-[0.875rem] text-xs font-medium hover:bg-primary/90 transition-colors">
                  <FiRefreshCw className="h-3 w-3" /> Regenerate
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <FiImage className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Describe your marketing visual and click Generate to create it.</p>
              <p className="text-xs text-muted-foreground mt-2">The Graphic Generator will create professional marketing graphics.</p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Agent Info Panel
// ──────────────────────────────────────────────

function AgentInfoPanel({ activeAgentId }: { activeAgentId: string | null }) {
  return (
    <GlassCard className="p-4 mt-6">
      <p className="text-xs font-semibold text-foreground mb-3">Powering this app</p>
      <div className="space-y-2">
        {AGENTS.map((agent) => (
          <div key={agent.id} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeAgentId === agent.id ? 'bg-primary animate-pulse' : 'bg-green-400'}`} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{agent.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{agent.purpose}</p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────

export default function Page() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showSample, setShowSample] = useState(false)

  // History
  const [contentHistory, setContentHistory] = useState<ContentItem[]>([])
  const [seoHistory, setSeoHistory] = useState<SEOItem[]>([])
  const [graphicsHistory, setGraphicsHistory] = useState<GraphicItem[]>([])

  // Cross-tab state
  const [seoContent, setSeoContent] = useState('')
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  const navItems: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <FiLayout className="h-5 w-5" /> },
    { key: 'content', label: 'Content Studio', icon: <FiEdit3 className="h-5 w-5" /> },
    { key: 'seo', label: 'SEO Analyzer', icon: <FiSearch className="h-5 w-5" /> },
    { key: 'graphics', label: 'Graphics Studio', icon: <FiImage className="h-5 w-5" /> },
  ]

  const handleAddContent = useCallback((item: ContentItem) => {
    setContentHistory((prev) => [item, ...prev])
    setActiveAgentId(null)
  }, [])

  const handleAddSeo = useCallback((item: SEOItem) => {
    setSeoHistory((prev) => [item, ...prev])
    setActiveAgentId(null)
  }, [])

  const handleAddGraphic = useCallback((item: GraphicItem) => {
    setGraphicsHistory((prev) => [item, ...prev])
    setActiveAgentId(null)
  }, [])

  const handleSendToSeo = useCallback((content: string) => {
    setSeoContent(content)
    setActiveTab('seo')
  }, [])

  const handleNavigate = useCallback((tab: TabType) => {
    setActiveTab(tab)
    setSidebarOpen(false)
  }, [])

  return (
    <div className="min-h-screen bg-background flex">
      {/* Subtle background gradient */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-orange-50/60 via-background to-amber-50/40" />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-border bg-background/95 backdrop-blur-md transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground tracking-tight">Marketing Command</h2>
          <p className="text-xs text-muted-foreground mt-0.5">AI-Powered Creative Suite</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <button key={item.key} onClick={() => handleNavigate(item.key)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[0.875rem] text-sm font-medium transition-colors ${activeTab === item.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground hover:bg-muted'}`}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <AgentInfoPanel activeAgentId={activeAgentId} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 relative">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-[0.875rem] hover:bg-muted transition-colors">
            <FiLayout className="h-5 w-5" />
          </button>
          <div className="lg:hidden text-sm font-semibold text-foreground">{navItems.find((n) => n.key === activeTab)?.label ?? ''}</div>
          <div className="flex items-center gap-3 ml-auto">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-muted-foreground font-medium">Sample Data</span>
              <button onClick={() => setShowSample((p) => !p)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showSample ? 'bg-primary' : 'bg-muted'}`}>
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${showSample ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
              </button>
            </label>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto relative z-10">
          {activeTab === 'dashboard' && (
            <DashboardScreen
              contentHistory={showSample && contentHistory.length === 0 ? [SAMPLE_CONTENT] : contentHistory}
              seoHistory={showSample && seoHistory.length === 0 ? [SAMPLE_SEO] : seoHistory}
              graphicsHistory={showSample && graphicsHistory.length === 0 ? [SAMPLE_GRAPHIC] : graphicsHistory}
              onNavigate={handleNavigate}
              showSample={showSample}
            />
          )}
          {activeTab === 'content' && (
            <ContentStudioScreen onAddContent={handleAddContent} onSendToSeo={handleSendToSeo} />
          )}
          {activeTab === 'seo' && (
            <SEOAnalyzerScreen initialContent={seoContent} onAddSeo={handleAddSeo} />
          )}
          {activeTab === 'graphics' && (
            <GraphicsStudioScreen onAddGraphic={handleAddGraphic} />
          )}
        </div>
      </main>
    </div>
  )
}
