import React, { useState, useEffect, useRef } from 'react';

const App = () => {
  const [bulletPosition, setBulletPosition] = useState(0);
  const [currentChamber, setCurrentChamber] = useState(0);
  const [status, setStatus] = useState('idle');
  const [history, setHistory] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const audioCtxRef = useRef(null);

  const makeDistortionCurve = (amount) => {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  };

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playSound = (type) => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const time = ctx.currentTime;

    if (type === 'bang') {
      const clickOsc = ctx.createOscillator();
      clickOsc.type = 'square';
      clickOsc.frequency.setValueAtTime(800, time);
      clickOsc.frequency.exponentialRampToValueAtTime(10, time + 0.05);
      const clickGain = ctx.createGain();
      clickGain.gain.setValueAtTime(1.5, time);
      clickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      clickOsc.start(time);
      clickOsc.stop(time + 0.05);

      const thumpOsc = ctx.createOscillator();
      thumpOsc.type = 'sine';
      thumpOsc.frequency.setValueAtTime(200, time);
      thumpOsc.frequency.exponentialRampToValueAtTime(20, time + 0.4);
      const thumpGain = ctx.createGain();
      thumpGain.gain.setValueAtTime(4, time);
      thumpGain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
      thumpOsc.connect(thumpGain);
      thumpGain.connect(ctx.destination);
      thumpOsc.start(time);
      thumpOsc.stop(time + 0.5);

      const bufferSize = ctx.sampleRate * 1.0;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(4000, time);
      noiseFilter.frequency.exponentialRampToValueAtTime(100, time + 0.8);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(3, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.8);
      const distortion = ctx.createWaveShaper();
      distortion.curve = makeDistortionCurve(400);
      distortion.oversample = '4x';
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(distortion);
      distortion.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSource.start(time);

    } else if (type === 'click') {
      const clickOsc = ctx.createOscillator();
      clickOsc.type = 'square';
      clickOsc.frequency.setValueAtTime(4000, time);
      clickOsc.frequency.exponentialRampToValueAtTime(1000, time + 0.02);
      const clickGain = ctx.createGain();
      clickGain.gain.setValueAtTime(0.6, time);
      clickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.02);
      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      clickOsc.start(time);
      clickOsc.stop(time + 0.03);

      const noiseBufferSize = ctx.sampleRate * 0.03;
      const noiseBuffer = ctx.createBuffer(1, noiseBufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBufferSize; i++) { output[i] = Math.random() * 2 - 1; }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 6000;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(1.5, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.03);
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSource.start(time);

    } else if (type === 'spin') {
      const numClicks = 12;
      const duration = 0.55;
      for (let i = 0; i < numClicks; i++) {
        const progress = i / numClicks;
        const spinDelay = progress * duration + (Math.pow(progress, 3) * 0.2);
        const spinTime = time + spinDelay;
        const isLast = i === numClicks - 1;

        const noiseBufferSize = ctx.sampleRate * 0.02;
        const noiseBuffer = ctx.createBuffer(1, noiseBufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let j = 0; j < noiseBufferSize; j++) { output[j] = Math.random() * 2 - 1; }
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = noiseBuffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 800;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4, spinTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, spinTime + 0.02);
        noiseSrc.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noiseSrc.start(spinTime);

        const clickOsc = ctx.createOscillator();
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(isLast ? 600 : 300, spinTime);
        clickOsc.frequency.exponentialRampToValueAtTime(100, spinTime + 0.02);
        const clickGain = ctx.createGain();
        const volume = isLast ? 1.0 : 0.5;
        clickGain.gain.setValueAtTime(volume, spinTime);
        clickGain.gain.exponentialRampToValueAtTime(0.01, spinTime + (isLast ? 0.05 : 0.02));
        clickOsc.connect(clickGain);
        clickGain.connect(ctx.destination);
        clickOsc.start(spinTime);
        clickOsc.stop(spinTime + 0.06);

        if (isLast) {
          const lockOsc = ctx.createOscillator();
          lockOsc.type = 'square';
          lockOsc.frequency.setValueAtTime(250, spinTime);
          lockOsc.frequency.exponentialRampToValueAtTime(50, spinTime + 0.08);
          const lockGain = ctx.createGain();
          lockGain.gain.setValueAtTime(0.7, spinTime);
          lockGain.gain.exponentialRampToValueAtTime(0.01, spinTime + 0.08);
          lockOsc.connect(lockGain);
          lockGain.connect(ctx.destination);
          lockOsc.start(spinTime);
          lockOsc.stop(spinTime + 0.1);
        }
      }
    }
  };

  const spinCylinder = () => {
    initAudio();
    playSound('spin');
    setIsSpinning(true);
    setStatus('idle');
    setHistory([]);
    setTimeout(() => {
      setBulletPosition(Math.floor(Math.random() * 6));
      setCurrentChamber(0);
      setIsSpinning(false);
    }, 700);
  };

  useEffect(() => { spinCylinder(); }, []);

  const pullTrigger = () => {
    if (status === 'bang' || isSpinning) return;
    if (currentChamber === bulletPosition) {
      playSound('bang');
      setStatus('bang');
      setHistory((prev) => [...prev, 'bang']);
    } else {
      playSound('click');
      setStatus('safe');
      setHistory((prev) => [...prev, 'safe']);
      setCurrentChamber((prev) => prev + 1);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-200 text-white font-sans p-4 relative overflow-hidden ${status === 'bang' ? 'bg-red-950' : 'bg-zinc-900'}`}>
      <style>{`@keyframes screenShake { 0% { transform: translate(1px, 1px) rotate(0deg); } 10% { transform: translate(-3px, -4px) rotate(-1deg); } 100% { transform: translate(0px, 0px) rotate(0deg); } } .animate-shake { animation: screenShake 0.4s both; }`}</style>
      <div className={`flex flex-col items-center ${status === 'bang' ? 'animate-shake' : ''}`}>
        <h1 className="text-4xl font-black mb-2 tracking-widest text-red-600 drop-shadow-md">RUSSIAN ROULETTE</h1>
        <p className="text-zinc-400 text-sm mb-10">6발 중 1발. 생존을 위해 방아쇠를 당기세요.</p>
        <div className={`relative w-52 h-52 rounded-full border-8 border-zinc-700 bg-zinc-800 flex items-center justify-center mb-12 shadow-2xl ${isSpinning ? 'animate-spin' : ''}`}>
          <div className="absolute w-10 h-10 rounded-full bg-zinc-950 border-4 border-zinc-700"></div>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const angle = i * 60;
            const x = Math.sin((angle * Math.PI) / 180) * 65;
            const y = -Math.cos((angle * Math.PI) / 180) * 65;
            return (
              <div key={i} className={`absolute w-14 h-14 rounded-full border-4 border-zinc-950 ${i < currentChamber ? 'bg-zinc-600 opacity-40' : status === 'bang' && i === currentChamber ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,1)]' : 'bg-zinc-900'}`} style={{ transform: `translate(${x}px, ${y}px)` }}>
                {status === 'bang' && i === currentChamber && <div className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-yellow-400 animate-pulse"></div>}
              </div>
            );
          })}
        </div>
        <div className="text-2xl font-bold mb-8 h-8">{isSpinning ? '실린더 회전 중...' : status === 'bang' ? '💥 탕! 게임 오버' : status === 'safe' ? '찰칵. 생존!' : '준비 완료'}</div>
        <div className="flex space-x-3 mb-10">
          {history.map((r, i) => <div key={i} className={`w-4 h-4 rounded-full ${r === 'bang' ? 'bg-red-600' : 'bg-emerald-500'}`} />)}
          {Array.from({ length: 6 - history.length }).map((_, i) => <div key={i} className="w-4 h-4 rounded-full border-2 border-zinc-700" />)}
        </div>
        <div className="flex space-x-4">
          <button onClick={pullTrigger} disabled={status === 'bang' || isSpinning} className="px-8 py-4 bg-red-700 hover:bg-red-600 disabled:bg-zinc-800 rounded-2xl font-black text-xl shadow-lg active:translate-y-1 transition-all">방아쇠 당기기</button>
          <button onClick={spinCylinder} disabled={isSpinning} className="px-6 py-4 bg-zinc-900 border-2 border-zinc-700 rounded-2xl font-bold">초기화</button>
        </div>
      </div>
    </div>
  );
};

export default App;