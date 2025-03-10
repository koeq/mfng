'use client';

import {useRouter} from '@mfng/core/client';
import * as React from 'react';

export type LinkProps = React.PropsWithChildren<{
  readonly pathname: string;
}>;

export function Link({children, pathname}: LinkProps): JSX.Element {
  const {push} = useRouter();

  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
    event.preventDefault();
    push({pathname});
  };

  return (
    <a href={pathname} onClick={handleClick}>
      {children}
    </a>
  );
}
