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
  const presets = [
    { value: 'bottom', label: 'Bottom' },
    { value: 'top', label: 'Top' }
  ];

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
    try {
      const res = await fetch(BACKEND_URL, { method: 'POST', body: form });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Transcription failed: ${res.status} ${t}`);
      }
      const json = await res.json();
      setResult({ text: json.text || '', words: json.words || [] });
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
          return (
            <div className="app-root">
              <div className="hero">
                <div className="hero-card">
                  <h1 className="brand">Remotion Demo: Captions</h1>
                  <p className="subtitle">Upload a video and generate captions using AI.</p>
                  <div className="form-group">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={onFileChange}
                      className="input-file"
                    />
                    <button
                      className="accent-btn"
                      onClick={onGenerate}
                      disabled={uploading || !fileBlob}
                    >
                      {uploading ? 'Transcribing...' : 'Generate Captions'}
                    </button>
                  </div>
                  {error && (
                    <div className="error-msg">{error}</div>
                  )}
                  {result.text && (
                    <div className="success-msg">Captions generated!</div>
                  )}
                  <div className="form-group">
                    <label className="preset-label">Preset:</label>
                    <select
                      value={selectedPreset}
                      onChange={e => setSelectedPreset(e.target.value)}
                      className="preset-select"
                    >
                      {presets.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  {videoSrc && (
                    <div className="video-preview">
                      <video src={videoSrc} controls className="video-player" />
                    </div>
                  )}
                  {result.words.length > 0 && (
                    <div className="player-preview">
                      <Player
                        component={Captions}
                        durationInFrames={300}
                        fps={30}
                        compositionWidth={720}
                        compositionHeight={480}
                        style={{width: 720, height: 480, borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.4)'}}
                        props={{words: result.words, preset: selectedPreset, videoSrc}}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
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
