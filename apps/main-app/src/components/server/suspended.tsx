import * as React from 'react';
import {Markdown} from './markdown.js';
import {wait} from './wait.js';
// import 'server-only'; // https://twitter.com/unstubbable/status/1630897868155305984

async function fetchContent(): Promise<string> {
  await wait(1500);

  return `This is a suspended server component.`;
}

export async function Suspended(): Promise<JSX.Element> {
  const content = await fetchContent();

  return <Markdown text={content} />;
}
