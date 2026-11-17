import { Link } from 'react-router-dom'

export function NotFound({ home = '/' }: { home?: string }) {
  return (
    <div
      data-testid="not-found"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center"
    >
      <p className="text-4xl font-bold text-slate-300 dark:text-slate-700">404</p>
      <h1 className="text-lg font-bold text-slate-900 dark:text-white">Page not found</h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        This page does not exist. It may have been removed or you may have followed an old link.
      </p>
      <Link
        to={home}
        className="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-white dark:text-slate-900"
      >
        Go back
      </Link>
    </div>
  )
}
