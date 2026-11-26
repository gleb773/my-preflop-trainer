const SUIT_COLORS = { s: '#374151', h: '#dc2626', d: '#2563eb', c: '#16a34a' };
const SUIT_SYMBOLS = { s: '♠', h: '♥', d: '♦', c: '♣' };

export default function PlayingCard({ rank, suit }) {
  return (
    <div className="playing-card" style={{ backgroundColor: SUIT_COLORS[suit] }}>
      <span className="card-rank">{rank}</span>
      <span className="card-suit-bg">{SUIT_SYMBOLS[suit]}</span>
    </div>
  );
}
