'use client';

import { testAction } from "../lib/actions";

export default function Home() {
  
  async function callAction() {
    await testAction({
      foo: "bar"
    })
  }

  return (
    <main>
      <button onClick={callAction}>Send JSON</button>
    </main>
  );
}
