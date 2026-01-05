import { Zap, Link2, MessageCircle, Shield } from 'lucide-react';

const items = [
  {
    icon: <Zap className="h-4 w-4 text-emerald-500" />,
    title: 'Instant Answers',
    description:
      'Upload any PDF. Ask a question. Get the answer in seconds — with the exact page number.'
  },
  {
    icon: <Link2 className="h-4 w-4 text-emerald-500" />,
    title: 'Source Citations',
    description:
      'Every answer links to where it came from. One click to verify. No guessing.'
  },
  {
    icon: <MessageCircle className="h-4 w-4 text-emerald-500" />,
    title: 'Natural Language',
    description:
      'Ask "what\'s the penalty for late payment?" — not "CTRL+F penalty clause."'
  },
  {
    icon: <Shield className="h-4 w-4 text-emerald-500" />,
    title: 'Private & Secure',
    description:
      'Your documents are yours. Never used for training. Never shared.'
  }
];

export default function Content() {
  return (
    <div className="flex flex-col self-center gap-5 max-w-[380px]">
      {items.map((item, index) => (
        <div key={index} className="flex gap-3">
          <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
          <div>
            <h3 className="font-medium text-sm mb-1">{item.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
