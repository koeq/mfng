import * as React from 'react';
import ReactServerDOMClient from 'react-server-dom-webpack/client.browser';
import {callServer} from './call-server.js';

export function createFetchElementStream(
  initialUrlPath: string,
): (urlPath: string) => React.Thenable<JSX.Element> {
  return React.cache(function fetchElementStream(
    urlPath: string,
  ): React.Thenable<JSX.Element> {
    if (urlPath === initialUrlPath) {
      return ReactServerDOMClient.createFromReadableStream<JSX.Element>(
        self.initialRscResponseStream,
        {callServer},
      );
    }

    return ReactServerDOMClient.createFromFetch(
      fetch(urlPath, {headers: {accept: `text/x-component`}}),
      {callServer},
    );
  });
}
