import * as React from 'react';
import {Link} from '../client/link.js';
import {LocationServerContext} from './location-server-context.js';

export type NavigationItemProps = React.PropsWithChildren<{
  readonly pathname: string;
}>;

export function NavigationItem({
  children,
  pathname,
}: NavigationItemProps): JSX.Element {
  const location = React.useContext(LocationServerContext);

  if (pathname === new URL(location).pathname) {
    return (
      <span className="inline-block rounded-md bg-zinc-800 py-1 px-3 text-zinc-50">
        {children}
      </span>
    );
  }

  return (
    <Link pathname={pathname}>
      <span className="inline-block rounded-md py-1 px-3 text-zinc-200 hover:bg-zinc-600">
        {children}
      </span>
    </Link>
  );
}
