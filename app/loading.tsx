export default function Loading() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-orange-100 gap-8">

      {/* 훌라후프 씬 */}
      <div className="relative w-32 h-32 flex items-center justify-center">
        <span className="text-5xl z-10 select-none">🕺</span>
        {/* 바깥 후프 */}
        <div
          className="absolute inset-0 rounded-full border-[6px] border-orange-400 animate-spin"
          style={{ animationDuration: '0.75s', borderTopColor: 'transparent' }}
        />
        {/* 안쪽 후프 (역방향) */}
        <div
          className="absolute inset-2 rounded-full border-[4px] border-yellow-300 animate-spin"
          style={{ animationDuration: '0.75s', animationDirection: 'reverse', borderBottomColor: 'transparent' }}
        />
      </div>

      {/* 메시지 */}
      <div className="text-center">
        <p className="text-2xl font-bold text-amber-900 tracking-wide">아침을 여는 중 ☀️</p>
        <p className="text-sm text-amber-500 mt-1">오늘의 소식을 모아오고 있어요</p>
        <div className="flex justify-center gap-1 mt-4">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>

    </main>
  );
}
