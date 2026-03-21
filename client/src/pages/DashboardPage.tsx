export default function DashboardPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-zinc-400">Welcome to your Content Repurposing Engine.</p>
        </div>
      </div>

      <div className="text-center py-20 bg-zinc-900/20 border-2 border-dashed border-zinc-800 rounded-xl">
        <h3 className="text-xl font-medium text-zinc-300 mb-2">Dashboard widgets coming soon</h3>
        <p className="text-zinc-500 max-w-sm mx-auto">
          Please navigate to the Projects tab to view your video pipeline data.
        </p>
      </div>
    </div>
  );
}
