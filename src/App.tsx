import { useEffect, useMemo, useState } from 'react';
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
  Headphones,
  Home,
  Lightbulb,
  Menu,
  Mic,
  Moon,
  MoreHorizontal,
  PenLine,
  Plus,
  Send,
  Sun,
  Target,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';

type Page = 'home' | 'doubt' | 'confidence' | 'explain' | 'report' | 'mentor';
type Theme = 'light' | 'dark';

type Topic = {
  name: string;
  subject: string;
  confidence: number;
  understanding: number;
  color: string;
  plan: string[];
};

const topics: Topic[] = [
  { name: 'Quadratic equations', subject: 'Mathematics', confidence: 78, understanding: 54, color: '#e0926e', plan: ['Review factoring patterns', 'Try 3 mixed examples', 'Explain the discriminant'] },
  { name: 'Cellular respiration', subject: 'Biology', confidence: 62, understanding: 43, color: '#4ba59a', plan: ['Sketch the energy cycle', 'Connect ATP to glucose', 'Self-test key vocabulary'] },
  { name: 'The French Revolution', subject: 'History', confidence: 71, understanding: 48, color: '#8b7eb5', plan: ['Build a cause-and-effect map', 'Order the key events', 'Summarise the outcome'] },
];

const navItems: { id: Page; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Overview', icon: Home },
  { id: 'doubt', label: 'Doubt Solver', icon: CircleHelp },
  { id: 'confidence', label: 'Confidence Check', icon: Target },
  { id: 'explain', label: 'Explain-Back', icon: PenLine },
  { id: 'report', label: 'Weekly Report', icon: BarChart3 },
];

function Logo() {
  return (
    <div className="brand-lockup">
      <div className="brand-mark"><img src="/assets/icons/Latent_Reveal_Icon copy.png" alt="Latent" /></div>
      <span>latent</span>
    </div>
  );
}

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

function Sidebar({ page, setPage, open, setOpen }: { page: Page; setPage: (page: Page) => void; open: boolean; setOpen: (open: boolean) => void }) {
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
          <button className={`nav-item ${page === 'mentor' ? 'active' : ''}`} onClick={() => { setPage('mentor'); setOpen(false); }}><Compass size={18} /><span>Mentor view</span></button>
          <div className="sidebar-divider" />
          <div className="profile-row"><div className="avatar small">AK</div><div><strong>Alex Kim</strong><span>Year 11 · Student</span></div><MoreHorizontal size={18} className="muted-icon" /></div>
        </div>
      </aside>
    </>
  );
}

function Topbar({ onMenu, eyebrow, title, action, theme, toggleTheme }: { onMenu: () => void; eyebrow: string; title: string; action?: React.ReactNode; theme: Theme; toggleTheme: () => void }) {
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
        <div className="avatar">AK</div>
      </div>
    </header>
  );
}

function StatCard({ icon: Icon, label, value, detail, tone, progress }: { icon: typeof Brain; label: string; value: string; detail: string; tone: string; progress?: number }) {
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
      {!compact && (
        <div className="plan">
          <span className="plan-label">REVISION PLAN</span>
          {topic.plan.map(item => <div className="plan-item" key={item}><Check size={13} />{item}</div>)}
        </div>
      )}
    </div>
  );
}

function Activity({ icon: Icon, title, subtitle, time, color }: { icon: typeof PenLine; title: string; subtitle: string; time: string; color: string }) {
  return (
    <div className="activity-item">
      <div className={`activity-icon ${color}`}><Icon size={16} /></div>
      <div><strong>{title}</strong><span>{subtitle}</span></div>
      <time>{time}</time>
    </div>
  );
}

function HomePage({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <div className="page-content home-page">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">TUESDAY, 14 MAY 2024</div>
          <h2>Good morning, Alex <span className="wave">/</span></h2>
          <p className="lede">A little progress today goes a long way.</p>
        </div>
        <button className="primary-button" onClick={() => setPage('doubt')}><Plus size={17} /> New study session</button>
      </div>
      <div className="stats-grid">
        <StatCard icon={BookOpen} label="Topics studied" value="12" detail="+3 this week" tone="peach" />
        <StatCard icon={Brain} label="Current weak spots" value="3" detail="A little attention needed" tone="mint" progress={43} />
        <StatCard icon={Zap} label="Study streak" value="7 days" detail="Best: 14 days" tone="lavender" />
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
                <h3>Quadratic equations</h3>
                <p>You're getting there. One more focused session could close the gap.</p>
              </div>
              <div className="focus-score">54<small>%</small></div>
            </div>
            <div className="focus-visual">
              <div className="focus-line"><span>Confidence</span><i style={{ width: '78%' }} /><b>78%</b></div>
              <div className="focus-line"><span>Understanding</span><i style={{ width: '54%' }} /><b>54%</b></div>
            </div>
            <button className="light-button" onClick={() => setPage('explain')}>Work on this topic <ChevronRight size={16} /></button>
          </div>
          <div className="activity-card">
            <div className="card-heading">
              <span className="card-kicker">RECENT ACTIVITY</span>
              <button className="ghost-icon"><MoreHorizontal size={18} /></button>
            </div>
            <div className="activity-list">
              <Activity icon={PenLine} title="Explained back" subtitle="Cellular respiration" time="Yesterday" color="mint" />
              <Activity icon={Target} title="Confidence check" subtitle="The French Revolution" time="Mon" color="lavender" />
              <Activity icon={CircleHelp} title="Asked a doubt" subtitle="Quadratic equations" time="Sun" color="peach" />
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
          {topics.map(topic => <TopicCard key={topic.name} topic={topic} compact />)}
        </div>
      </section>
    </div>
  );
}

function DoubtPage() {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hey Alex. What are you working through today?', time: '10:42 AM' },
    { role: 'user', text: 'I\u2019m stuck on why the quadratic formula works, not just how to use it.', time: '10:43 AM' },
    { role: 'ai', text: 'That\u2019s a really useful question to ask. The formula comes from completing the square on a general quadratic — so it\u2019s not a trick to memorise, it\u2019s a shortcut for a process you already know.', time: '10:43 AM' },
  ]);
  const [draft, setDraft] = useState('');
  const send = () => {
    if (!draft.trim()) return;
    setMessages([...messages, { role: 'user', text: draft, time: 'Now' }]);
    setDraft('');
  };
  return (
    <div className="page-content full-height-page">
      <div className="chat-layout">
        <div className="chat-main">
          <div className="context-pill">
            <BookOpen size={14} /> Learning with Alex <span>•</span> Quadratic equations <ChevronRight size={14} />
          </div>
          <div className="message-thread">
            {messages.map((message, index) => (
              <div className={`message-row ${message.role}`} key={`${message.time}-${index}`}>
                <div className={`message-avatar ${message.role}`}>
                  {message.role === 'ai' ? <img src="/assets/icons/Latent_Reveal_Icon copy.png" alt="Latent" /> : 'AK'}
                </div>
                <div className="message-content">
                  <div className="message-name">{message.role === 'ai' ? 'Latent' : 'You'} <span>{message.time}</span></div>
                  <div className="message-bubble">{message.text}</div>
                  {message.role === 'ai' && index === 2 && (
                    <div className="message-actions">
                      <button><Lightbulb size={14} /> See an example</button>
                      <button><Headphones size={14} /> Listen</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="chat-composer">
            <div className="composer-input">
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask anything about your topic..."
                rows={1}
              />
              <button className="mic-button"><Mic size={19} /></button>
              <button className="send-button" onClick={send}><Send size={17} /></button>
            </div>
            <span className="composer-hint">Press Enter to send <span>•</span> Latent helps you think, not just answer.</span>
          </div>
        </div>
        <aside className="chat-aside">
          <div className="aside-kicker">SESSION NOTES</div>
          <h3>Quadratic equations</h3>
          <p>Keep these ideas close while you work through the topic.</p>
          <div className="note-block">
            <span className="note-number">01</span>
            <strong>Complete the square</strong>
            <p>Rewrite an expression so one side becomes a perfect square.</p>
          </div>
          <div className="note-block">
            <span className="note-number">02</span>
            <strong>Look for the pattern</strong>
            <p>Every quadratic can be reshaped into this same form.</p>
          </div>
          <button className="light-button">Save a note <Plus size={16} /></button>
        </aside>
      </div>
    </div>
  );
}

function ConfidencePage() {
  const [confidence, setConfidence] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [answer, setAnswer] = useState('');

  return (
    <div className="page-content">
      <div className="quiz-wrap">
        <div className="quiz-progress">
          <span>CONFIDENCE CHECK</span>
          <span>1 of 2 questions</span>
        </div>
        <div className="quiz-bar"><i style={{ width: submitted ? '100%' : '50%' }} /></div>
        {!submitted ? (
          <>
            <div className="quiz-topic">
              <span className="topic-dot" style={{ background: '#e0926e', color: '#e0926e' }} />
              Mathematics <span>•</span> Quadratic equations
            </div>
            <h2>What happens to the graph of<br /> <em>y = x²</em> when we add 3?</h2>
            <div className="answer-options">
              <button className={answer === 'up' ? 'selected' : ''} onClick={() => setAnswer('up')}><span>A</span>It shifts 3 units up {answer === 'up' && <Check size={17} />}</button>
              <button className={answer === 'down' ? 'selected' : ''} onClick={() => setAnswer('down')}><span>B</span>It shifts 3 units down {answer === 'down' && <Check size={17} />}</button>
              <button className={answer === 'wide' ? 'selected' : ''} onClick={() => setAnswer('wide')}><span>C</span>It becomes wider {answer === 'wide' && <Check size={17} />}</button>
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
            <button className="primary-button wide" disabled={!answer || !confidence} onClick={() => setSubmitted(true)}>
              Check my answer <ArrowUpRight size={16} />
            </button>
          </>
        ) : (
          <div className="result-card">
            <div className="result-mark"><Check size={25} /></div>
            <span className="card-kicker">A THOUGHTFUL ANSWER</span>
            <h2>You were confident <em>and</em> correct.</h2>
            <p>You chose the right answer and your confidence was {confidence}/5. Nice — your intuition is catching up with your knowledge.</p>
            <div className="result-insight">
              <Lightbulb size={18} />
              <div>
                <strong>Keep building the connection</strong>
                <span>Adding a positive number outside the square moves the entire graph up.</span>
              </div>
            </div>
            <button className="primary-button" onClick={() => { setSubmitted(false); setAnswer(''); setConfidence(null); }}>
              Try another question <ChevronRight size={16} />
            </button>
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

function ExplainPage() {
  const [text, setText] = useState('');
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
            Cellular respiration
            <ChevronRight size={17} />
          </div>
          <label className="field-label">Your explanation</label>
          <div className="explain-input-wrap">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Start explaining as if you were teaching a friend..."
            />
            <div className="explain-tools">
              <span>{text.length} characters</span>
              <button className="mic-button"><Mic size={19} /></button>
            </div>
          </div>
          <button className="primary-button" disabled={!text.trim()}><PenLine size={16} /> Get thoughtful feedback</button>
        </div>
        <div className="feedback-card">
          <div className="feedback-header">
            <div className="feedback-icon"><Brain size={19} /></div>
            <div>
              <span className="card-kicker">YOUR FEEDBACK</span>
              <h3>It will appear here</h3>
            </div>
          </div>
          <div className="feedback-placeholder">
            <div className="placeholder-line long" />
            <div className="placeholder-line" />
            <div className="placeholder-line short" />
          </div>
          <div className="feedback-points">
            <div>
              <span className="point-icon right"><Check size={14} /></span>
              <span><strong>What you got right</strong><small>Clear ideas and strong connections</small></span>
            </div>
            <div>
              <span className="point-icon improve"><Lightbulb size={14} /></span>
              <span><strong>What to strengthen</strong><small>Gaps worth looking at again</small></span>
            </div>
          </div>
          <p className="feedback-note">Write at least a few sentences and Latent will read between the lines.</p>
        </div>
      </div>
    </div>
  );
}

function ReportPage() {
  return (
    <div className="page-content">
      <div className="report-intro">
        <div>
          <div className="eyebrow">WEEK OF 13–19 MAY</div>
          <h2>Your weekly weak-spot report.</h2>
          <p className="lede">A gentle nudge toward the topics that could use a little more time.</p>
        </div>
        <button className="light-button"><Clock3 size={16} /> Last 7 days <ChevronRight size={15} /></button>
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
      <div className="report-grid">
        {topics.map(topic => <TopicCard key={topic.name} topic={topic} />)}
      </div>
    </div>
  );
}

function MentorPage() {
  return (
    <div className="page-content">
      <div className="report-intro">
        <div>
          <div className="eyebrow">READ-ONLY VIEW</div>
          <h2>Alex's learning journey.</h2>
          <p className="lede">A clear, encouraging snapshot of progress over time.</p>
        </div>
        <div className="mentor-badge">
          <div className="avatar small">AK</div>
          <span>Alex Kim</span>
        </div>
      </div>
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
            <div><span>Average understanding</span><strong>68%</strong><small>+12% this month</small></div>
          </div>
          <div className="mentor-stat">
            <span className="stat-icon peach"><Clock3 size={18} /></span>
            <div><span>Time learning</span><strong>4h 20m</strong><small>Across 6 sessions</small></div>
          </div>
          <div className="encouragement">
            <BookOpen size={18} />
            <strong>A note from Latent</strong>
            <p>Alex is showing up consistently and asking deeper questions. The confidence–understanding gap is narrowing.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [page, setPage] = useState<Page>('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggle } = useTheme();

  const pageMeta = useMemo(() => ({
    home: ['OVERVIEW', 'Good morning, Alex'],
    doubt: ['DOUBT SOLVER', 'Let\u2019s work it through'],
    confidence: ['CONFIDENCE CHECK', 'See what you know'],
    explain: ['EXPLAIN-BACK', 'Make it make sense'],
    report: ['WEEKLY REPORT', 'A clearer picture'],
    mentor: ['MENTOR VIEW', 'Progress, in context'],
  }[page]), [page]);

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={setPage} open={menuOpen} setOpen={setMenuOpen} />
      <main className="main-area">
        <Topbar
          onMenu={() => setMenuOpen(true)}
          eyebrow={pageMeta[0]}
          title={pageMeta[1]}
          action={page === 'home' ? <span className="topbar-streak"><Zap size={15} /> 7 day streak</span> : undefined}
          theme={theme}
          toggleTheme={toggle}
        />
        {page === 'home' && <HomePage setPage={setPage} />}
        {page === 'doubt' && <DoubtPage />}
        {page === 'confidence' && <ConfidencePage />}
        {page === 'explain' && <ExplainPage />}
        {page === 'report' && <ReportPage />}
        {page === 'mentor' && <MentorPage />}
      </main>
    </div>
  );
}

export default App;
