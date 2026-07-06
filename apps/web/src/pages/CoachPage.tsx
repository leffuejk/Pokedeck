import { useEffect, useRef, useState } from 'react';
import { useDecks } from '../hooks/useDecks';
import { useCoach } from '../hooks/useCoach';
import { PageHeader } from '../components/AppShell';
import { Mascot } from '../components/Mascot';
import { Spinner } from '../components/Spinner';
import { cn } from '../lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'coach';
  text: string;
}

const SUGGESTIONS = [
  'How do I make my deck more consistent?',
  'What’s a good energy count for my deck?',
  'Suggest a tech card against Water decks.',
];

export function CoachPage() {
  const { data: decks } = useDecks();
  const coach = useCoach();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadId, setThreadId] = useState<string | undefined>();
  const [deckId, setDeckId] = useState<string>('');
  const [input, setInput] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, coach.isPending]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || coach.isPending) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    coach.mutate(
      { message: trimmed, threadId, deckId: deckId || undefined },
      {
        onSuccess: (res) => {
          setThreadId(res.threadId);
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: 'coach', text: res.reply },
          ]);
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'coach',
              text: 'Hmm, I tripped over a Poké Ball. Please try asking again.',
            },
          ]);
        },
      },
    );
  };

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col md:h-[calc(100vh-7rem)]">
      <PageHeader
        title="Deck Coach"
        subtitle="Chat with the AI Professor about strategy and tuning."
        actions={
          <select
            aria-label="Deck context"
            className="pd-input w-48"
            value={deckId}
            onChange={(e) => setDeckId(e.target.value)}
          >
            <option value="">No deck context</option>
            {(decks ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        }
      />

      <div
        ref={scrollRef}
        className="pd-card flex-1 space-y-4 overflow-y-auto p-4 sm:p-6"
      >
        {messages.length === 0 && !coach.isPending ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Mascot size={140} />
            <div>
              <h2 className="text-xl font-black">Ask me anything about your deck!</h2>
              <p className="mt-1 text-muted">Pick a starter question or type your own below.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="pd-btn-ghost text-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <Bubble key={m.id} message={m} />
            ))}
            {coach.isPending && <TypingBubble />}
          </>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex items-center gap-2"
      >
        <input
          className="pd-input"
          placeholder="Message the Professor…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="pd-btn-primary shrink-0" disabled={coach.isPending || !input.trim()}>
          {coach.isPending ? <Spinner size={18} /> : 'Send'}
        </button>
      </form>
    </div>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex animate-spring-in gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-lg">
          🎓
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-soft',
          isUser
            ? 'rounded-br-md bg-brand text-white'
            : 'rounded-bl-md border border-border bg-surface',
        )}
      >
        {message.text}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex gap-2">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-lg">
        🎓
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-border bg-surface px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-muted"
            style={{ animation: `float 1s ${i * 0.15}s ease-in-out infinite` }}
          />
        ))}
      </div>
    </div>
  );
}
