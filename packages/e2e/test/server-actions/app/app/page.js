'use client';

import { testAction } from "../lib/actions";

export default function Home() {
  
  async function callAction() {
    await testAction({
      foo: "bar"
    })
    console.log("ACTION DONE")
  }

  return (
    <main>
      <button onClick={callAction}>Send JSON</button>
    </main>
  );
}
