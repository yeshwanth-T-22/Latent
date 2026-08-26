import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Brain,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Compass,
  Edit3,
  Headphones,
  Home,
  Lightbulb,
  LogIn,
  LogOut,
  Menu,
  Mic,
  Moon,
  MoreHorizontal,
  PenLine,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Sun,
  Target,
  TrendingUp,
  User,
  X,
  Zap,
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import {
  supabase,
  signIn,
  signUp,
  signOut,
  onAuthStateChange,
  sendDoubt,
  fetchQuiz,
  submitConfidenceCheck,
  submitExplainBack,
  fetchReport,
  fetchMentor,
  transcribeAudio,
  fetchDashboardData,
  fetchProfile,
  updateProfile,
  type DashboardResponse,
  type ProfileData,
} from './api';
import type { QuizQuestion, ReportTopic, MentorResponse, ExplainBackResponse } from './types';

// ── Types ────────────────────────────────────────────────────────────────────

type Page = 'home' | 'doubt' | 'confidence' | 'explain' | 'report' | 'mentor' | 'profile';
type Theme = 'light' | 'dark';

type Topic = {
  name: string;
  subject: string;
  confidence: number;
  understanding: number;
  color: string;
  plan: string[];
};

const navItems: { id: Page; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Overview', icon: Home },
  { id: 'doubt', label: 'Doubt Solver', icon: CircleHelp },
  { id: 'confidence', label: 'Confidence Check', icon: Target },
  { id: 'explain', label: 'Explain-Back', icon: PenLine },
  { id: 'report', label: 'Weekly Report', icon: BarChart3 },
];

const TOPIC_COLORS = ['#e0926e', '#4ba59a', '#8b7eb5', '#e0b86e', '#6e9ee0', '#a5604b'];
function topicColor(index: number) { return TOPIC_COLORS[index % TOPIC_COLORS.length]; }

// DEFAULT_TOPIC removed — topics are now user-entered

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'ST';
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ── Shared hooks ─────────────────────────────────────────────────────────────

function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => {
    const saved = localStorage.getItem('latent-theme') as Theme | null;
    if (saved) setTheme(saved);
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('latent-theme', theme);
  }, [theme]);
  const toggle = () => setTheme(t => t === 'light' ? 'dark' : 'light');
  return { theme, toggle };
}

function useVoiceRecorder(onTranscript: (text: string) => void) {
  const [recording, setRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        try {
          const { transcription } = await transcribeAudio(blob);
          onTranscript(transcription);
        } catch (e: unknown) {
          setVoiceError(e instanceof Error ? e.message : 'Voice transcription failed.');
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      setVoiceError('Microphone access denied. Please allow mic access and try again.');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }

  return { recording, startRecording, stopRecording, voiceError };
}

// ── Auth Screen ───────────────────────────────────────────────────────────────

function AuthScreen({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password, displayName || 'Student');
        if (error) throw error;
        setMessage('Account created! Check your email to confirm, then sign in.');
        setMode('signin');
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        onAuth();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand-lockup" style={{ marginBottom: '2rem' }}>
          <div className="brand-mark"><img src="/assets/icons/Latent_Reveal_Icon copy.png" alt="Latent" /></div>
          <span>latent</span>
        </div>
        <h2>{mode === 'signin' ? 'Welcome back' : 'Get started'}</h2>
        <p className="lede">{mode === 'signin' ? 'Sign in to your learning space.' : 'Create your Latent account.'}</p>
        {error && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}
        {message && <p style={{ color: 'var(--accent)', fontSize: '0.875rem', marginBottom: '1rem' }}>{message}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Your name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '1rem' }}
            />
          )}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '1rem' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '1rem' }}
          />
          <button className="primary-button" type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
            <LogIn size={17} /> {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <button
          className="text-button"
          style={{ marginTop: '1.5rem', display: 'block', width: '100%', textAlign: 'center' }}
          onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(null); setMessage(null); }}
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}

// ── Shared components (unchanged visuals) ─────────────────────────────────────

function Logo() {
  return (
    <div className="brand-lockup">
      <div className="brand-mark"><img src="/assets/icons/Latent_Reveal_Icon copy.png" alt="Latent" /></div>
      <span>latent</span>
    </div>
  );
}

function Sidebar({ page, setPage, open, setOpen, onSignOut, session }: {
  page: Page; setPage: (page: Page, ctx?: string) => void; open: boolean; setOpen: (open: boolean) => void; onSignOut: () => void; session: Session;
}) {
  const displayName = session.user.user_metadata?.display_name || 'Student';
  const initials = getInitials(displayName);
  return (
    <>
      {open && <button className="mobile-scrim" onClick={() => setOpen(false)} aria-label="Close menu" />}
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="sidebar-top">
          <Logo />
          <button className="close-menu" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav className="main-nav">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => { setPage(id); setOpen(false); }}>
              <Icon size={18} strokeWidth={page === id ? 2.4 : 1.8} />
              <span>{label}</span>
              {id === 'report' && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className={`nav-item ${page === 'mentor' ? 'active' : ''}`} onClick={() => { setPage('mentor'); setOpen(false); }}>
            <Compass size={18} /><span>Mentor view</span>
          </button>
          <button className={`nav-item ${page === 'profile' ? 'active' : ''}`} onClick={() => { setPage('profile'); setOpen(false); }}>
            <Settings size={18} /><span>Profile &amp; Settings</span>
          </button>
          <div className="sidebar-divider" />
          <div className="profile-row" style={{ cursor: 'pointer' }} onClick={() => { setPage('profile'); setOpen(false); }}>
            <div className="avatar small" style={{ background: 'var(--accent)' }}>{initials}</div>
            <div><strong>{displayName}</strong><span>{session.user.email}</span></div>
            <button onClick={(e) => { e.stopPropagation(); onSignOut(); }} title="Sign out" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function Topbar({ onMenu, eyebrow, title, action, theme, toggleTheme, session, onProfileClick }: {
  onMenu: () => void; eyebrow: string; title: string; action?: React.ReactNode; theme: Theme; toggleTheme: () => void; session: Session; onProfileClick: () => void;
}) {
  const displayName = session.user.user_metadata?.display_name || 'Student';
  const initials = getInitials(displayName);
  return (
    <header className="topbar">
      <button className="menu-button" onClick={onMenu} aria-label="Open menu"><Menu size={21} /></button>
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
      </div>
      <div className="topbar-actions">
        {action}
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <button className="notification-button"><span /></button>
        <div className="avatar" onClick={onProfileClick} style={{ cursor: 'pointer', background: 'var(--accent)' }} title={displayName}>{initials}</div>
      </div>
    </header>
  );
}

function StatCard({ icon: Icon, label, value, detail, tone, progress }: {
  icon: typeof Brain; label: string; value: string; detail: string; tone: string; progress?: number;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon size={19} /></div>
      <div className="stat-meta">
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{detail}</p>
        {progress !== undefined && <div className="tiny-progress"><i style={{ width: `${progress}%` }} /></div>}
      </div>
    </div>
  );
}

function TopicCard({ topic, compact = false }: { topic: Topic; compact?: boolean }) {
  return (
    <div className={`topic-card ${compact ? 'compact' : ''}`}>
      <div className="topic-head">
        <div className="topic-title">
          <span className="topic-dot" style={{ background: topic.color, color: topic.color }} />
          <div><strong>{topic.name}</strong><span>{topic.subject}</span></div>
        </div>
        <button className="ghost-icon"><MoreHorizontal size={18} /></button>
      </div>
      <div className="confidence-bars">
        <div className="bar-label"><span>Confidence</span><strong>{topic.confidence}%</strong></div>
        <div className="bar-track"><i className="confidence-fill" style={{ width: `${topic.confidence}%` }} /></div>
        <div className="bar-label"><span>Understanding</span><strong>{topic.understanding}%</strong></div>
        <div className="bar-track"><i className="understanding-fill" style={{ width: `${topic.understanding}%` }} /></div>
      </div>
      {!compact && topic.plan.length > 0 && (
        <div className="plan">
          <span className="plan-label">REVISION PLAN</span>
          {topic.plan.map(item => <div className="plan-item" key={item}><Check size={13} />{item}</div>)}
        </div>
      )}
    </div>
  );
}

function Activity({ icon: Icon, title, subtitle, time, color }: {
  icon: typeof PenLine; title: string; subtitle: string; time: string; color: string;
}) {
  return (
    <div className="activity-item">
      <div className={`activity-icon ${color}`}><Icon size={16} /></div>
      <div><strong>{title}</strong><span>{subtitle}</span></div>
      <time>{time}</time>
    </div>
  );
}

// ── Pages ─────────────────────────────────────────────────────────────────────

function HomePage({ setPage, session, dashboard }: { setPage: (p: Page, ctx?: string) => void; session: Session; dashboard: DashboardResponse | null }) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [weakSpotsCount, setWeakSpotsCount] = useState(0);
  const [topicsCount, setTopicsCount] = useState(0);
  const [focusTopic, setFocusTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);

  const displayName = session.user.user_metadata?.display_name || 'Alex';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    fetchReport()
      .then(data => {
        const mapped: Topic[] = data.topics.map((t, i) => ({
          name: t.name,
          subject: t.subject || '',
          confidence: t.confidenceScore,
          understanding: t.trueUnderstandingScore,
          color: topicColor(i),
          plan: t.plan,
        }));
        setTopics(mapped);
        setWeakSpotsCount(data.weakSpots.length);
        setTopicsCount(data.topics.length);
        const sorted = [...data.topics].sort(
          (a, b) => (b.confidenceScore - b.trueUnderstandingScore) - (a.confidenceScore - a.trueUnderstandingScore)
        );
        if (sorted[0]) {
          const idx = data.topics.indexOf(sorted[0]);
          setFocusTopic(mapped[idx]);
        }
      })
      .catch(() => { /* silently fall back */ })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-content home-page">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">{today}</div>
          <h2>{greeting}, {displayName} <span className="wave">/</span></h2>
          <p className="lede">A little progress today goes a long way.</p>
        </div>
        <button className="primary-button" onClick={() => setPage('doubt')}><Plus size={17} /> New study session</button>
      </div>
      <div className="stats-grid">
        <StatCard icon={BookOpen} label="Topics studied" value={loading ? '…' : String(topicsCount)} detail="+3 this week" tone="peach" />
        <StatCard icon={Brain} label="Current weak spots" value={loading ? '…' : String(weakSpotsCount)} detail="A little attention needed" tone="mint" progress={weakSpotsCount > 0 ? Math.min(100, weakSpotsCount * 15) : 0} />
        <StatCard icon={Zap} label="Study streak" value={`${dashboard?.streak || 0} days`} detail={`Best: ${dashboard?.maxStreak || 0} days`} tone="lavender" />
      </div>
      <section className="section-block">
        <div className="section-heading">
          <div><div className="eyebrow">KEEP GOING</div><h3>Your learning landscape</h3></div>
          <button className="text-button" onClick={() => setPage('report')}>View weekly report <ArrowUpRight size={16} /></button>
        </div>
        <div className="landscape-grid">
          <div className="focus-card">
            <div className="focus-top">
              <div>
                <span className="card-kicker">FOCUS TOPIC</span>
                <h3>{focusTopic ? focusTopic.name : (loading ? '…' : 'No topics yet')}</h3>
                <p>{focusTopic ? "You're getting there. One more focused session could close the gap." : 'Start a study session to track your topics.'}</p>
              </div>
              <div className="focus-score">{focusTopic ? focusTopic.understanding : '–'}{focusTopic && <small>%</small>}</div>
            </div>
            {focusTopic && (
              <div className="focus-visual">
                <div className="focus-line"><span>Confidence</span><i style={{ width: `${focusTopic.confidence}%` }} /><b>{focusTopic.confidence}%</b></div>
                <div className="focus-line"><span>Understanding</span><i style={{ width: `${focusTopic.understanding}%` }} /><b>{focusTopic.understanding}%</b></div>
              </div>
            )}
            <button className="light-button" disabled={!focusTopic} onClick={() => setPage('explain', focusTopic?.name)}>Work on this topic <ChevronRight size={16} /></button>
          </div>
          <div className="activity-card">
            <div className="card-heading">
              <span className="card-kicker">RECENT ACTIVITY</span>
              <button className="ghost-icon"><MoreHorizontal size={18} /></button>
            </div>
            <div className="activity-list">
              {dashboard?.recentActivity?.length ? dashboard.recentActivity.map(act => (
                <Activity key={act.id} icon={act.type === 'doubt' ? CircleHelp : act.type === 'quiz' ? Target : PenLine} title={act.type === 'doubt' ? 'Asked a doubt' : act.type === 'quiz' ? 'Confidence check' : 'Explained back'} subtitle={act.topicName} time={new Date(act.createdAt).toLocaleDateString()} color={act.type === 'doubt' ? 'peach' : act.type === 'quiz' ? 'lavender' : 'mint'} />
              )) : <p className="lede" style={{fontSize:'0.875rem'}}>No recent activity</p>}
            </div>
            <button className="text-button small">See all activity <ChevronRight size={15} /></button>
          </div>
        </div>
      </section>
      <section className="section-block">
        <div className="section-heading">
          <div><div className="eyebrow">YOUR TOPICS</div><h3>Where to spend your energy</h3></div>
          <button className="text-button" onClick={() => setPage('report')}>See all topics <ArrowUpRight size={16} /></button>
        </div>
        <div className="topic-preview-grid">
          {loading
            ? <p className="lede">Loading your topics…</p>
            : topics.length === 0
              ? (
                <div className="onboarding-banner" style={{ gridColumn: '1 / -1', background: 'var(--surface)', padding: '2rem', borderRadius: '16px', border: '1px dashed var(--border)', textAlign: 'center' }}>
                  <div className="icon-circle" style={{ background: 'var(--accent-2)', color: 'var(--accent)', margin: '0 auto 1rem', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Brain size={24} />
                  </div>
                  <h3>Welcome to Latent!</h3>
                  <p className="lede" style={{ marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>Start your first study session to see your landscape grow. You can pick any topic you're currently learning.</p>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {['Algebra', 'Photosynthesis', 'World War II'].map(s => (
                      <button key={s} className="light-button" onClick={() => setPage('doubt', s)}>{s}</button>
                    ))}
                  </div>
                </div>
              )
              : topics.map(topic => <TopicCard key={topic.name} topic={topic} compact />)
          }
        </div>
      </section>
    </div>
  );
}

function DoubtPage({ initialTopic, session }: { initialTopic?: string; session: Session }) {
  const [topic, setTopic] = useState(initialTopic || '');
  const initials = getInitials(session.user.user_metadata?.display_name || 'Student');
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hey! What topic are you working through today? Type it above and then ask your question.', time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) },
  ]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, loading]);

  const addMessage = (role: 'ai' | 'user', text: string) => {
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role, text, time }]);
  };

  const send = async (text?: string) => {
    const question = (text ?? draft).trim();
    if (!question || loading) return;
    if (!topic.trim()) { setError('Please enter a topic first.'); return; }
    setDraft('');
    setError(null);
    addMessage('user', question);
    setLoading(true);
    try {
      const { answer } = await sendDoubt(topic, question);
      addMessage('ai', answer);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
      setError(msg);
      addMessage('ai', msg);
    } finally {
      setLoading(false);
    }
  };

  const { recording, startRecording, stopRecording, voiceError } = useVoiceRecorder((transcript) => {
    setDraft(transcript);
  });

  return (
    <div className="page-content full-height-page">
      <div className="chat-layout">
        <div className="chat-main">
          <div className="context-pill" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <BookOpen size={14} /> Learning session <span>•</span> 
            <input 
              value={topic} 
              onChange={e => setTopic(e.target.value)} 
              placeholder="Type your topic here (e.g. Photosynthesis)..."
              style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'inherit', fontWeight: 600, outline: 'none', flex: 1, minWidth: 0 }} 
            />
          </div>
          <div className="message-thread" ref={threadRef}>
            {messages.map((message, index) => (
              <div className={`message-row ${message.role}`} key={`${message.time}-${index}`}>
                <div className={`message-avatar ${message.role}`}>
                  {message.role === 'ai' ? <img src="/assets/icons/Latent_Reveal_Icon copy.png" alt="Latent" /> : initials}
                </div>
                <div className="message-content">
                  <div className="message-name">{message.role === 'ai' ? 'Latent' : (session.user.user_metadata?.display_name || 'You')} <span>{message.time}</span></div>
                  <div className="message-bubble" style={{ whiteSpace: 'pre-wrap' }}>{message.text}</div>
                  {message.role === 'ai' && index === messages.length - 1 && !loading && (
                    <div className="message-actions">
                      <button><Lightbulb size={14} /> See an example</button>
                      <button><Headphones size={14} /> Listen</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="message-row ai">
                <div className="message-avatar ai"><img src="/assets/icons/Latent_Reveal_Icon copy.png" alt="Latent" /></div>
                <div className="message-content">
                  <div className="message-name">Latent <span>…</span></div>
                  <div className="message-bubble typing-indicator"><span/><span/><span/></div>
                </div>
              </div>
            )}
          </div>
          {(error || voiceError) && (
            <div className="message-bubble" style={{ margin: '0 1rem 0.5rem', color: 'var(--text-muted)' }}>
              {voiceError || error}
            </div>
          )}
          <div className="chat-composer">
            <div className="composer-input">
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={topic ? `Ask anything about ${topic}...` : 'Enter a topic above first...'}
                rows={1}
                disabled={loading}
              />
              <button
                className={`mic-button ${recording ? 'active' : ''}`}
                onClick={recording ? stopRecording : startRecording}
                aria-label={recording ? 'Stop recording' : 'Start voice input'}
              >
                <Mic size={19} />
              </button>
              <button className="send-button" onClick={() => send()} disabled={loading || !draft.trim() || !topic.trim()}>
                <Send size={17} />
              </button>
            </div>
            <span className="composer-hint">Press Enter to send <span>•</span> Latent helps you think, not just answer.</span>
          </div>
        </div>
        <aside className="chat-aside">
          <div className="aside-kicker">SESSION INFO</div>
          <h3>{topic || 'No topic yet'}</h3>
          <p>Type your topic above and ask any question — Latent will guide you through it.</p>
          <div className="note-block">
            <span className="note-number"><Lightbulb size={13} /></span>
            <strong>Tip: Be specific</strong>
            <p>"How does photosynthesis work in low light?" gets better answers than just "photosynthesis".</p>
          </div>
          <div className="note-block">
            <span className="note-number"><Brain size={13} /></span>
            <strong>Think out loud</strong>
            <p>Share what you already know — Latent builds on your existing understanding.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ConfidencePage({ initialTopic }: { initialTopic?: string }) {
  const [topicInput, setTopicInput] = useState(initialTopic || '');
  const [confirmedTopic, setConfirmedTopic] = useState(initialTopic || '');
  const [quizStarted, setQuizStarted] = useState(!!initialTopic);
  const [quiz, setQuiz] = useState<{ questions: QuizQuestion[] } | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<{ questionText: string; chosenOption: string; correct: boolean }[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [reasoning, setReasoning] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ trueScore: number; isWeakSpot: boolean; feedback: string; gotRight: string[]; toStrengthen: string[] } | null>(null);

  const startQuiz = useCallback((topic: string) => {
    setConfirmedTopic(topic);
    setQuizStarted(true);
    setQuizLoading(true);
    setQuizError(null);
    setQuiz(null);
    fetchQuiz(topic)
      .then(data => setQuiz(data))
      .catch(e => setQuizError(e instanceof Error ? e.message : 'Failed to load quiz. Please try again.'))
      .finally(() => setQuizLoading(false));
  }, []);

  useEffect(() => {
    if (initialTopic && !quiz && !quizLoading) startQuiz(initialTopic);
  }, [initialTopic]);

  const handleSubmit = async () => {
    if (selectedOption === null || confidence === null || !quiz) return;
    const q = quiz.questions[currentQ];
    const isCorrect = selectedOption === q.correct;
    const updatedAnswers = [...answers, { questionText: q.text, chosenOption: q.options[selectedOption], correct: isCorrect }];
    setAnswers(updatedAnswers);

    if (currentQ < quiz.questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelectedOption(null);
      return;
    }

    setSubmitting(true);
    try {
      const evaluation = await submitConfidenceCheck(confirmedTopic, updatedAnswers, confidence, reasoning);
      setResult(evaluation);
      setSubmitted(true);
    } catch (e: unknown) {
      setQuizError(e instanceof Error ? e.message : 'Could not evaluate answers.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetQuiz = () => {
    setSubmitted(false); setResult(null); setAnswers([]); setCurrentQ(0);
    setSelectedOption(null); setConfidence(null); setReasoning('');
    setQuizStarted(false); setQuiz(null); setTopicInput(confirmedTopic);
  };

  const totalQ = quiz?.questions.length ?? 2;
  const progress = submitted ? 100 : quizStarted ? ((currentQ + (selectedOption !== null ? 0.5 : 0)) / totalQ) * 100 : 0;

  return (
    <div className="page-content">
      <div className="quiz-wrap">
        <div className="quiz-progress">
          <span>CONFIDENCE CHECK</span>
          <span>{submitted ? 'Complete' : quizStarted && quiz ? `${currentQ + 1} of ${totalQ} questions` : 'Choose a topic'}</span>
        </div>
        <div className="quiz-bar"><i style={{ width: `${progress}%` }} /></div>

        {/* Topic Picker — shown when no quiz started */}
        {!quizStarted && (
          <div style={{ marginTop: '2rem' }}>
            <div className="eyebrow" style={{ marginBottom: '0.5rem' }}>WHAT DO YOU WANT TO TEST?</div>
            <h2 style={{ marginBottom: '1rem' }}>Choose your topic</h2>
            <p className="lede" style={{ marginBottom: '1.5rem' }}>Latent will generate a personalised 2-question quiz to check how well you really understand it.</p>
            <input
              type="text"
              value={topicInput}
              onChange={e => setTopicInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && topicInput.trim()) startQuiz(topicInput.trim()); }}
              placeholder="e.g. The French Revolution, Photosynthesis, Algebra..."
              style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '1rem', marginBottom: '1rem', outline: 'none' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {['Quadratic equations', 'Photosynthesis', 'The French Revolution', 'Newton\'s Laws', 'DNA replication'].map(s => (
                <button key={s} className="light-button" style={{ fontSize: '0.8125rem', padding: '0.375rem 0.875rem' }} onClick={() => { setTopicInput(s); startQuiz(s); }}>{s}</button>
              ))}
            </div>
            <button className="primary-button wide" disabled={!topicInput.trim()} onClick={() => startQuiz(topicInput.trim())}>
              Start quiz <ArrowUpRight size={16} />
            </button>
          </div>
        )}

        {quizLoading && (
          <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
            <p className="lede">Generating your quiz on "{confirmedTopic}"…</p>
          </div>
        )}
        {quizError && (
          <div style={{ marginTop: '2rem' }}>
            <p className="lede" style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{quizError}</p>
            <button className="light-button" onClick={() => startQuiz(confirmedTopic)}><RefreshCw size={15} /> Try again</button>
          </div>
        )}

        {!quizLoading && !quizError && quiz && quizStarted && !submitted && (
          <>
            <div className="quiz-topic">
              <span className="topic-dot" style={{ background: '#e0926e', color: '#e0926e' }} />
              {confirmedTopic}
            </div>
            <h2>{quiz.questions[currentQ].text}</h2>
            <div className="answer-options">
              {quiz.questions[currentQ].options.map((opt, i) => (
                <button key={i} className={selectedOption === i ? 'selected' : ''} onClick={() => setSelectedOption(i)}>
                  <span>{String.fromCharCode(65 + i)}</span>{opt}
                  {selectedOption === i && <Check size={17} />}
                </button>
              ))}
            </div>
            <div className="confidence-prompt">
              <div>
                <strong>How confident are you?</strong>
                <span>There's no wrong answer here.</span>
              </div>
              <div className="confidence-scale">
                {[1, 2, 3, 4, 5].map(value => (
                  <button key={value} className={confidence === value ? 'selected' : ''} onClick={() => setConfidence(value)}>
                    {value}
                    <small>{value === 1 ? 'Not sure' : value === 5 ? 'Very sure' : ''}</small>
                  </button>
                ))}
              </div>
            </div>
            {currentQ === totalQ - 1 && (
              <div style={{ marginTop: '1rem' }}>
                <label className="field-label">Why did you choose this? (helps Latent assess your reasoning)</label>
                <textarea
                  value={reasoning}
                  onChange={e => setReasoning(e.target.value)}
                  placeholder="e.g. I remembered that adding outside the bracket shifts the graph vertically..."
                  rows={2}
                  style={{ width: '100%', marginTop: '0.5rem', resize: 'vertical' }}
                />
              </div>
            )}
            <button
              className="primary-button wide"
              disabled={selectedOption === null || confidence === null || submitting}
              onClick={handleSubmit}
            >
              {submitting ? 'Evaluating…' : currentQ < totalQ - 1 ? 'Next question' : 'Check my answer'} <ArrowUpRight size={16} />
            </button>
          </>
        )}

        {submitted && result && (
          <div className="result-card">
            <div className="result-mark"><Check size={25} /></div>
            <span className="card-kicker">{result.isWeakSpot ? 'SOMETHING TO WORK ON' : 'A THOUGHTFUL ANSWER'}</span>
            <h2>{result.isWeakSpot ? 'Worth revisiting.' : 'You understood this well.'}</h2>
            <p>{result.feedback} <em>True understanding score: {result.trueScore}/100.</em></p>
            <div className="result-insight">
              <Lightbulb size={18} />
              <div>
                <strong>What you got right</strong>
                <span>{result.gotRight.join(' · ')}</span>
              </div>
            </div>
            {result.toStrengthen.length > 0 && (
              <div className="result-insight" style={{ marginTop: '0.5rem' }}>
                <Brain size={18} />
                <div>
                  <strong>To strengthen</strong>
                  <span>{result.toStrengthen.join(' · ')}</span>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <button className="primary-button" onClick={resetQuiz}>
                Try another topic <RefreshCw size={16} />
              </button>
              <button className="light-button" onClick={() => startQuiz(confirmedTopic)}>
                Retry same topic <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="quiz-side-note">
        <Brain size={17} />
        <div>
          <strong>Confidence is data</strong>
          <p>Not a grade. It helps you see where your feeling and your understanding match up.</p>
        </div>
      </div>
    </div>
  );
}

function ExplainPage({ initialTopic }: { initialTopic?: string }) {
  const [text, setText] = useState('');
  const [topic, setTopic] = useState(initialTopic || 'General');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ExplainBackResponse | null>(null);

  const { recording, startRecording, stopRecording, voiceError } = useVoiceRecorder((transcript) => {
    setText(prev => prev ? `${prev} ${transcript}` : transcript);
  });

  const handleSubmit = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const result = await submitExplainBack(topic, text);
      setFeedback(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <div className="explain-layout">
        <div className="explain-main">
          <div className="eyebrow">EXPLAIN-BACK MODE</div>
          <h2>Teach it back to yourself.</h2>
          <p className="lede">The best way to find what you really understand is to explain it in your own words.</p>
          <label className="field-label">What do you want to explain?</label>
          <div className="topic-select">
            <span className="topic-dot" style={{ background: '#4ba59a', color: '#4ba59a' }} />
            <input 
              value={topic} 
              onChange={e => setTopic(e.target.value)} 
              placeholder="Topic..."
              style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: 'inherit', fontWeight: 600, outline: 'none', flex: 1, fontSize: 'inherit' }} 
            />
            <ChevronRight size={17} />
          </div>
          <label className="field-label">Your explanation</label>
          <div className="explain-input-wrap">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Start explaining as if you were teaching a friend..."
              disabled={loading}
            />
            <div className="explain-tools">
              <span>{text.length} characters</span>
              <button
                className={`mic-button ${recording ? 'active' : ''}`}
                onClick={recording ? stopRecording : startRecording}
                aria-label={recording ? 'Stop recording' : 'Start voice input'}
              >
                <Mic size={19} />
              </button>
            </div>
          </div>
          {(error || voiceError) && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{error || voiceError}</p>
          )}
          <button className="primary-button" disabled={!text.trim() || loading} onClick={handleSubmit}>
            <PenLine size={16} /> {loading ? 'Latent is reading…' : 'Get thoughtful feedback'}
          </button>
        </div>
        <div className="feedback-card">
          <div className="feedback-header">
            <div className="feedback-icon"><Brain size={19} /></div>
            <div>
              <span className="card-kicker">YOUR FEEDBACK</span>
              <h3>{feedback ? `Understanding score: ${feedback.trueScore}/100` : 'It will appear here'}</h3>
            </div>
          </div>
          {!feedback && (
            <div className="feedback-placeholder">
              <div className="placeholder-line long" />
              <div className="placeholder-line" />
              <div className="placeholder-line short" />
            </div>
          )}
          {feedback && <p style={{ marginBottom: '1rem', fontSize: '0.9375rem' }}>{feedback.summary}</p>}
          <div className="feedback-points">
            <div>
              <span className="point-icon right"><Check size={14} /></span>
              <span>
                <strong>What you got right</strong>
                {feedback ? <small>{feedback.gotRight.join(', ')}</small> : <small>Clear ideas and strong connections</small>}
              </span>
            </div>
            <div>
              <span className="point-icon improve"><Lightbulb size={14} /></span>
              <span>
                <strong>What to strengthen</strong>
                {feedback ? <small>{feedback.toStrengthen.join(', ')}</small> : <small>Gaps worth looking at again</small>}
              </span>
            </div>
          </div>
          {!feedback && (
            <p className="feedback-note">Write at least a few sentences and Latent will read between the lines.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [weekLabel, setWeekLabel] = useState('');
  const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | 'all'>('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReport()
      .then(data => {
        setWeekLabel(data.weekLabel);
        setTopics(
          data.topics.map((t: ReportTopic, i: number) => ({
            name: t.name,
            subject: t.subject || '',
            confidence: t.confidenceScore,
            understanding: t.trueUnderstandingScore,
            color: topicColor(i),
            plan: t.plan,
          }))
        );
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load report.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-content">
      <div className="report-intro">
        <div>
          <div className="eyebrow">{timeFilter === '7d' ? `WEEK OF ${weekLabel || '…'}` : timeFilter === '30d' ? 'LAST 30 DAYS' : 'ALL TIME'}</div>
          <h2>Your weekly weak-spot report.</h2>
          <p className="lede">A gentle nudge toward the topics that could use a little more time.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--surface)', padding: '0.25rem', borderRadius: '24px', border: '1px solid var(--border)' }}>
          <button className={`nav-item ${timeFilter === '7d' ? 'active' : ''}`} style={{ padding: '0.25rem 1rem', fontSize: '0.875rem' }} onClick={() => setTimeFilter('7d')}>7 days</button>
          <button className={`nav-item ${timeFilter === '30d' ? 'active' : ''}`} style={{ padding: '0.25rem 1rem', fontSize: '0.875rem' }} onClick={() => setTimeFilter('30d')}>30 days</button>
          <button className={`nav-item ${timeFilter === 'all' ? 'active' : ''}`} style={{ padding: '0.25rem 1rem', fontSize: '0.875rem' }} onClick={() => setTimeFilter('all')}>All time</button>
        </div>
      </div>
      <div className="report-banner">
        <div className="banner-icon"><TrendingUp size={21} /></div>
        <div>
          <strong>Your confidence is often ahead of your understanding.</strong>
          <p>That's not a bad thing. It means you're willing to try — now let's make the knowledge catch up.</p>
        </div>
        <div className="gap-legend">
          <span><i className="legend-confidence" /> Confidence</span>
          <span><i className="legend-understanding" /> Understanding</span>
        </div>
      </div>
      {loading && <p className="lede" style={{ marginTop: '2rem' }}>Loading your report…</p>}
      {error && <p className="lede" style={{ marginTop: '2rem', color: 'var(--text-muted)' }}>{error}</p>}
      <div className="report-grid">
        {topics.map(topic => <TopicCard key={topic.name} topic={topic} />)}
        {!loading && topics.length === 0 && !error && (
          <p className="lede">No topics tracked yet. Start studying to see your report here.</p>
        )}
      </div>
    </div>
  );
}

function MentorPage() {
  const [data, setData] = useState<MentorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMentor()
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load mentor view.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-content">
      <div className="report-intro">
        <div>
          <div className="eyebrow">READ-ONLY VIEW</div>
          <h2>Your learning journey.</h2>
          <p className="lede">A clear, encouraging snapshot of progress over time.</p>
        </div>
        <div className="mentor-badge">
          <div className="avatar small" style={{ background: 'var(--accent)' }}>{data?.displayName ? getInitials(data.displayName) : 'ST'}</div>
          <span>{data?.displayName || 'Student'}</span>
        </div>
      </div>
      {loading && <p className="lede">Loading mentor data…</p>}
      {error && <p className="lede" style={{ color: 'var(--text-muted)' }}>{error}</p>}
      {data && (
        <div className="mentor-grid">
          <div className="trend-card">
            <div className="card-heading">
              <div>
                <span className="card-kicker">UNDERSTANDING OVER TIME</span>
                <h3>A steady climb</h3>
              </div>
              <button className="light-button small-button">Last 4 weeks <ChevronRight size={14} /></button>
            </div>
            <div className="chart">
              <div className="chart-y">
                <span>100</span><span>75</span><span>50</span><span>25</span><span>0</span>
              </div>
              <div className="chart-area">
                <div className="grid-lines"><i /><i /><i /><i /><i /></div>
                <svg viewBox="0 0 620 220" preserveAspectRatio="none">
                  <path d="M0 190 C70 183, 76 155, 140 163 S215 128, 275 140 S350 101, 400 112 S485 65, 535 79 S588 38, 620 47" fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" />
                  <path d="M0 190 C70 183, 76 155, 140 163 S215 128, 275 140 S350 101, 400 112 S485 65, 535 79 S588 38, 620 47 L620 220 L0 220Z" fill="url(#chartFill)" opacity=".22" />
                  <defs>
                    <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                      <stop stopColor="var(--accent-2)" />
                      <stop offset="1" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="chart-x">
                  <span>22 Apr</span><span>29 Apr</span><span>06 May</span><span>13 May</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mentor-side">
            <div className="mentor-stat">
              <span className="stat-icon mint"><TrendingUp size={18} /></span>
              <div>
                <span>Average understanding</span>
                <strong>{data.averageUnderstanding}%</strong>
                <small>{data.topicsCount} topics tracked</small>
              </div>
            </div>
            <div className="mentor-stat">
              <span className="stat-icon peach"><Clock3 size={18} /></span>
              <div>
                <span>Weak spots</span>
                <strong>{data.weakSpotsCount}</strong>
                <small>Topics needing attention</small>
              </div>
            </div>
            <div className="encouragement">
              <BookOpen size={18} />
              <strong>A note from Latent</strong>
              <p>{data.mentorNote}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Profile Page ─────────────────────────────────────────────────────────────

function ProfilePage({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [yearGroup, setYearGroup] = useState('');

  useEffect(() => {
    fetchProfile()
      .then(data => {
        setProfile(data);
        setDisplayName(data.profile?.display_name || '');
        setYearGroup(data.profile?.year_group || '');
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load profile.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ display_name: displayName, year_group: yearGroup });
      // Reload profile
      const data = await fetchProfile();
      setProfile(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-content"><p className="lede">Loading profile…</p></div>;
  if (error) return <div className="page-content"><p className="lede" style={{ color: 'var(--text-muted)' }}>{error}</p></div>;
  if (!profile) return null;

  return (
    <div className="page-content">
      <div className="report-intro">
        <div>
          <div className="eyebrow">ACCOUNT SETTINGS</div>
          <h2>Your Profile.</h2>
          <p className="lede">Manage your details and view your all-time stats.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
        <section className="section-block" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>Personal Details</h3>
          <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <label className="field-label">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '1rem', marginBottom: '1.5rem', outline: 'none' }}
            />
            
            <label className="field-label">Year Group</label>
            <input
              type="text"
              value={yearGroup}
              onChange={e => setYearGroup(e.target.value)}
              placeholder="e.g. Year 11, Grade 10"
              style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '1rem', marginBottom: '1.5rem', outline: 'none' }}
            />

            <label className="field-label">Email Address (Read-only)</label>
            <input
              type="text"
              value={profile.email}
              disabled
              style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '2rem', outline: 'none', opacity: 0.7 }}
            />

            <button className="primary-button" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'} <Check size={16} />
            </button>
          </div>
        </section>

        <section className="section-block" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>All-Time Stats</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <StatCard icon={BookOpen} label="Total Sessions" value={String(profile.stats.totalSessions)} detail="Since joining" tone="peach" />
            <StatCard icon={Brain} label="Topics Tracked" value={String(profile.stats.topicsCount)} detail={`${profile.stats.weakSpotsCount} weak spots`} tone="mint" />
            <StatCard icon={Target} label="Average Score" value={profile.stats.avgScore ? `${profile.stats.avgScore}%` : '–'} detail="Across all quizzes" tone="lavender" />
            <StatCard icon={User} label="Member Since" value={new Date(profile.stats.memberSince).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} detail="Keep it up!" tone="peach" />
          </div>

          <h3 style={{ marginTop: '2.5rem', marginBottom: '1.5rem', fontSize: '1.125rem', color: 'var(--text-muted)' }}>Danger Zone</h3>
          <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>Sign out</strong>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Sign out of this device.</p>
            </div>
            <button className="light-button" onClick={onSignOut}><LogOut size={16} /> Sign out</button>
          </div>
        </section>
      </div>
    </div>
  );
}

// ── App shell ────────────────────────────────────────────────────────────────

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState<Page>('home');
  const [activeTopic, setActiveTopic] = useState('');
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggle } = useTheme();

  const handleSetPage = (p: Page, ctx?: string) => {
    if (ctx) setActiveTopic(ctx);
    setPage(p);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchDashboardData().then(setDashboardData).catch(console.error);
    }
  }, [session, page]);

  const handleSignOut = async () => {
    await signOut();
    setSession(null);
    setDashboardData(null);
    setPage('home');
  };

  const pageMeta = useMemo(() => ({
    home: ['OVERVIEW', 'Good morning'],
    doubt: ['DOUBT SOLVER', 'Let\u2019s work it through'],
    confidence: ['CONFIDENCE CHECK', 'See what you know'],
    explain: ['EXPLAIN-BACK', 'Make it make sense'],
    report: ['WEEKLY REPORT', 'A clearer picture'],
    mentor: ['MENTOR VIEW', 'Progress, in context'],
    profile: ['ACCOUNT', 'Your Profile'],
  }[page]), [page]);

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p className="lede">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen onAuth={() => { /* session update comes via onAuthStateChange */ }} />;
  }

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={handleSetPage} open={menuOpen} setOpen={setMenuOpen} onSignOut={handleSignOut} session={session} />
      <main className="main-area">
        <Topbar
          onMenu={() => setMenuOpen(true)}
          eyebrow={pageMeta[0]}
          title={pageMeta[1]}
          action={page === 'home' ? <span className="topbar-streak"><Zap size={15} /> {dashboardData?.streak || 0} day streak</span> : undefined}
          theme={theme}
          toggleTheme={toggle}
          session={session}
          onProfileClick={() => handleSetPage('profile')}
        />
        {page === 'home' && <HomePage setPage={handleSetPage} session={session} dashboard={dashboardData} />}
        {page === 'doubt' && <DoubtPage initialTopic={activeTopic} session={session} />}
        {page === 'confidence' && <ConfidencePage initialTopic={activeTopic} />}
        {page === 'explain' && <ExplainPage initialTopic={activeTopic} />}
        {page === 'report' && <ReportPage />}
        {page === 'mentor' && <MentorPage />}
        {page === 'profile' && <ProfilePage session={session} onSignOut={handleSignOut} />}
      </main>
    </div>
  );
}

export default App;
