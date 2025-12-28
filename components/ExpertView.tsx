
import React from 'react';
import { ExpertResponse } from '../types';

interface ExpertViewProps {
  data: ExpertResponse;
  onSaveNote?: (data: ExpertResponse) => void;
}

export const ExpertView: React.FC<ExpertViewProps> = ({ data, onSaveNote }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-indigo-900 font-black text-xs uppercase tracking-widest">Clinical Synthesis</h3>
        {onSaveNote && (
          <button 
            onClick={() => onSaveNote(data)}
            className="text-[10px] font-black uppercase tracking-tighter text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
          >
            Save to Session History
          </button>
        )}
      </div>

      <section className="bg-indigo-50 border-l-4 border-indigo-500 p-6 rounded-r-3xl shadow-inner">
        <h4 className="text-indigo-900 font-bold text-xs uppercase tracking-wider mb-2 opacity-60">Differential Insight</h4>
        <p className="text-indigo-900 leading-relaxed font-semibold text-lg">{data.differentialInsight}</p>
      </section>

      {data.nlpAnalysis && (
        <section className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl border border-indigo-500/30 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L14.293 11H3a1 1 0 100 2h11.293l-7.994 7.994a1 1 0 001.414 1.414l9.707-9.707a1 1 0 000-1.414l-9.707-9.707A1 1 0 007 2z" clipRule="evenodd" /></svg>
          </div>
          <h4 className="text-indigo-400 font-black text-xs uppercase tracking-[0.3em] mb-4">Deep NLP Tone Analysis</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold text-slate-400">Vocal Tone & Sentiment</p>
              <div className="flex items-center space-x-3">
                <span className="text-sm font-bold bg-indigo-500/20 px-3 py-1 rounded-lg text-indigo-300">{data.nlpAnalysis.tone}</span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: `${(data.nlpAnalysis.sentimentScore + 1) * 50}%` }}></div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold text-slate-400">Lexical Clinical Markers</p>
              <div className="flex flex-wrap gap-2">
                {data.nlpAnalysis.lexicalMarkers.map((m, i) => (
                  <span key={i} className="text-[10px] bg-white/10 px-2 py-0.5 rounded border border-white/5">{m}</span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section>
        <h4 className="text-slate-900 font-bold text-xs uppercase tracking-wider mb-3">Therapeutic Evidence</h4>
        <div className="overflow-x-auto border border-slate-200 rounded-3xl shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocol</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Efficiency</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Citation</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {data.evidenceTable.map((item, idx) => (
                <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-800 font-bold">{item.treatment}</td>
                  <td className="px-6 py-4 text-sm text-indigo-600 font-black">{item.successRate}</td>
                  <td className="px-6 py-4 text-xs text-slate-400 italic">{item.citation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h4 className="text-slate-900 font-bold text-xs uppercase tracking-wider mb-3">Professional Growth Path</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.growthPath.map((item, idx) => (
            <a
              key={idx}
              href={item.link.startsWith('http') ? item.link : `https://${item.link}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start p-4 border border-slate-100 rounded-2xl bg-white hover:shadow-xl hover:border-indigo-200 transition-all group"
            >
              <div className="mr-4 mt-1 p-2 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
              <div>
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{item.type}</span>
                <p className="text-md font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">{item.title}</p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
};
