export default function Loading() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">🤖 모닝브리프</h1>
            <div className="h-3 w-32 bg-gray-200 rounded mt-1 animate-pulse" />
          </div>
        </div>
      </header>

      {/* 탭 스켈레톤 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 py-2">
            {[80, 60, 72, 56].map((w, i) => (
              <div key={i} className={`h-8 rounded-full bg-gray-200 animate-pulse`} style={{ width: w }} />
            ))}
          </div>
        </div>
      </div>

      {/* 카드 그리드 스켈레톤 */}
      <div className="max-w-7xl mx-auto px-4 py-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-3 w-5/6 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 w-1/3 bg-gray-100 rounded animate-pulse mt-2" />
          </div>
        ))}
      </div>
    </main>
  );
}
