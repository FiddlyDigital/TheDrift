/* The Drift — minimal Web MIDI manager.
   Requests MIDI access, listens to every input, and forwards parsed
   Control-Change / Note-On messages to a single callback. Used by Atelier's
   MIDI-mapping UI so external controllers can drive the dials and transport. */

// parse a raw MIDI message into { type, number, value, channel } or null
export function parseMidi(data) {
  if (!data || data.length < 2) return null;
  const status = data[0] & 0xf0;
  const channel = data[0] & 0x0f;
  if (status === 0xb0) return { type: "cc", number: data[1], value: data[2] || 0, channel };
  if (status === 0x90 && (data[2] || 0) > 0) return { type: "note", number: data[1], value: data[2], channel };
  return null;
}

export function isMidiSupported() {
  return typeof navigator !== "undefined" && typeof navigator.requestMIDIAccess === "function";
}

export function createMidiManager(onMessage) {
  let access = null;
  let inputs = [];

  function handle(e) { onMessage(e.data); }

  function bindInputs() {
    if (!access) return;
    const list = [];
    access.inputs.forEach((inp) => {
      inp.onmidimessage = handle;
      list.push({ id: inp.id, name: inp.name || "MIDI input" });
    });
    inputs = list;
  }

  return {
    async enable() {
      if (!isMidiSupported()) throw new Error("Web MIDI unsupported");
      access = await navigator.requestMIDIAccess({ sysex: false });
      bindInputs();
      access.onstatechange = bindInputs;
      return inputs.slice();
    },
    inputs() { return inputs.slice(); },
    disable() {
      if (access) {
        access.inputs.forEach((inp) => { inp.onmidimessage = null; });
        access.onstatechange = null;
        access = null;
      }
      inputs = [];
    },
  };
}
