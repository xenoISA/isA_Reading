// Client-side audio conversion: webm → wav
// Used before uploading to pronunciation API (GPT-4o needs wav format)

export async function convertBlobToWav(blob: Blob): Promise<Blob> {
  const audioContext = new AudioContext({ sampleRate: 16000 })

  const arrayBuffer = await blob.arrayBuffer()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

  // Convert to mono 16kHz WAV
  const numberOfChannels = 1
  const sampleRate = 16000
  const length = audioBuffer.length
  const channelData = audioBuffer.getChannelData(0)

  // Resample if needed
  let samples: Float32Array
  if (audioBuffer.sampleRate !== sampleRate) {
    const ratio = audioBuffer.sampleRate / sampleRate
    const newLength = Math.floor(length / ratio)
    samples = new Float32Array(newLength)
    for (let i = 0; i < newLength; i++) {
      samples[i] = channelData[Math.floor(i * ratio)]
    }
  } else {
    samples = channelData
  }

  // Encode WAV
  const wavBuffer = encodeWav(samples, sampleRate, numberOfChannels)
  await audioContext.close()

  return new Blob([wavBuffer], { type: 'audio/wav' })
}

function encodeWav(samples: Float32Array, sampleRate: number, channels: number): ArrayBuffer {
  const bitsPerSample = 16
  const bytesPerSample = bitsPerSample / 8
  const blockAlign = channels * bytesPerSample
  const dataSize = samples.length * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  // WAV header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // chunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  // Write samples
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    offset += 2
  }

  return buffer
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}
