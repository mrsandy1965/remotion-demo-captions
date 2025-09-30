import React, {useCallback, useMemo, useState} from 'react';
import {Player} from '@remotion/player';
import {Captions} from '../components/Captions.jsx';
import {wordsToSrt} from '../utils/srt.js';

const BACKEND_URL = 'http://localhost:3001/transcribe';
export default function App() {
  const [fileBlob, setFileBlob] = useState(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [serverVideoUrl, setServerVideoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState({text: '', words: []});
  const [stage, setStage] = useState('idle');
  const [selectedPreset, setSelectedPreset] = useState('bottom');
  const [rendering, setRendering] = useState(false);


  const onFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileBlob(file);
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setServerVideoUrl(null);
    setResult({text: '', words: []});
    setError(null);
    setStage('idle');
  }, []);


  const onGenerate = useCallback(async () => {
    if (!fileBlob) {
      setError('Please upload a video first.');
      return;
    }
    const form = new FormData();
    form.append('video', fileBlob);
    setUploading(true);
    setStage('loading');
    setError(null);
    try{
      const res = await fetch(BACKEND_URL, {method: 'POST', body: form});
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Transcription failed: ${res.status} ${t}`);
      }
      const json = await res.json();
      setResult({text: json.text || '', words: json.words || []});
      if (json.videoUrl) {
        setServerVideoUrl(json.videoUrl);
      }
      setStage('ready');}
      catch (err) {
      setError(err?.message || 'Unknown error');
      setStage('idle');} 
      finally {
      setUploading(false);}
  }, [fileBlob]);

  const previewSrc = serverVideoUrl || videoSrc;
  const baseProps = useMemo(() => ({words: result.words, videoSrc: previewSrc}), [result.words, previewSrc]);

  const downloadSrt = useCallback(() => {
    try {
      const srt = wordsToSrt(result.words || []);
      const blob = new Blob([srt], {type: 'text/plain;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'captions.srt';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Failed to export SRT');
    }
  }, [result.words]);


  const downloadMp4 = useCallback(async () => {
    try {
      setRendering(true);
      setError(null);
      const res = await fetch('http://localhost:3001/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset: selectedPreset,
          words: result.words || [],
          videoUrl: previewSrc,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Render failed: ${res.status} ${t}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'captioned.mp4';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.message || 'Failed to render MP4');
    } finally {
      setRendering(false);
    }
  }, [selectedPreset, result.words, previewSrc]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      {stage !== 'ready' && (
        <div className="w-full max-w-2xl bg-white shadow-xl rounded-2xl p-8 text-center">
          <h1 className="text-3xl font-bold mb-2 text-indigo-600">Caption Generator</h1>
          <p className="text-gray-600 mb-6">Upload your MP4 and auto-generate Hinglish-friendly captions.</p>
  
          <label className="w-full cursor-pointer border-2 border-dashed border-indigo-400 rounded-xl p-10 hover:bg-indigo-50 transition">
            <input type="file" accept="video/mp4" onChange={onFileChange} hidden />
            <span className="text-lg text-indigo-500">Click or Drag & Drop your MP4</span>
          </label>
  
          <button
            className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50"
            onClick={onGenerate}
            disabled={!fileBlob || uploading}
          >
            {uploading || stage === 'loading' ? ' Processing…' : ' Auto-generate captions'}
          </button>
  
          {error && <div className="mt-4 text-red-500">{error}</div>}
        </div>
      )}
  
      {stage === 'ready' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mt-8">
          {/* Left panel */}
          <div className="col-span-1 bg-white rounded-xl shadow-lg p-6 space-y-4">
            <h2 className="text-xl font-bold mb-4">Controls</h2>
            <label className="block text-sm font-medium text-gray-700">Caption style</label>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-indigo-500"
            >
              <option value="bottom">Bottom</option>
              <option value="top">Top</option>
              <option value="karaoke">Karaoke</option>
            </select>
  
            <div className="space-y-3">
              <button className="w-full bg-gray-200 rounded-lg px-4 py-2 hover:bg-gray-300" onClick={downloadSrt}>
                Download SRT
              </button>
              <button
                className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 disabled:opacity-50"
                onClick={downloadMp4}
                disabled={!result.words?.length || rendering}
              >
                {rendering ? ' Rendering…' : ' Download MP4'}
              </button>
              <button className="w-full bg-gray-200 rounded-lg px-4 py-2 hover:bg-gray-300" onClick={downloadPropsJson}>
                 Export props.json
              </button>
            </div>
          </div>
  
          {/* Right panel */}
          <div className="col-span-2 bg-white rounded-xl shadow-lg p-6 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Preview</h2>
              <span className="text-sm text-gray-500">{fileBlob?.name || 'video.mp4'}</span>
            </div>
            <div className="rounded-lg overflow-hidden shadow-md">
              <Player
                component={Captions}
                inputProps={{...baseProps, preset: selectedPreset}}
                compositionWidth={1280}
                compositionHeight={720}
                fps={30}
                durationInFrames={60}
                controls
              />
            </div>
  
            <div className="mt-4">
              <h3 className="text-md font-semibold mb-2"> Transcript</h3>
              <div className="bg-gray-50 rounded-lg p-3 h-40 overflow-y-auto text-sm text-gray-700">
                {result.text || 'No transcript available'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
}
