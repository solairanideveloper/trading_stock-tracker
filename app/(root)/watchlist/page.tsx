import { headers } from 'next/headers';
import { auth } from '@/lib/better-auth/auth';
import { getWatchlistSymbolsByEmail } from '@/lib/actions/watchlist.actions';
import WatchlistView from '@/components/WatchlistView';

const Page = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email;
  const isAuth = !!session?.user;

  let serverSymbols: string[] = [];
  if (email) {
    serverSymbols = await getWatchlistSymbolsByEmail(email);
  }

  return (
    <div className="watchlist-container">
      <h1 className="watchlist-title">Your Watchlist</h1>
      <WatchlistView serverSymbols={serverSymbols} isAuthenticated={isAuth} />
    </div>
  );
};

export default Page;
