
import React from 'react';
import { SupportResponse } from '../types';

interface SupportViewProps {
  data: SupportResponse;
  onBookAppointment?: () => void;
}

export const SupportView: React.FC<SupportViewProps> = ({ data, onBookAppointment }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alert if crisis detected */}
      {data.crisisEscalation && (
        <div className="bg-red-50 border-2 border-red-200 p-4 rounded-3xl flex items-center space-x-4 animate-pulse">
           <div className="bg-red-500 text-white p-2 rounded-full">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
           </div>
           <div>
              <p className="text-red-900 font-black text-xs uppercase tracking-widest">Crisis Support Alert</p>
              <p className="text-red-700 text-xs font-bold">We detected signs of distress. Please reach out to emergency services or use our live call option.</p>
           </div>
        </div>
      )}

      <div className="flex items-start space-x-4">
        <div className="bg-rose-500 p-3 rounded-2xl text-white shadow-xl shrink-0 animate-float ring-4 ring-rose-100">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
        </div>
        <div className="bg-white border border-rose-100 rounded-[2.5rem] rounded-tl-none p-8 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full translate-x-8 -translate-y-8 opacity-40"></div>
           <p className="text-slate-800 text-2xl font-bold leading-relaxed tracking-tight italic relative z-10">"{data.message}"</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-[3rem] p-8 border border-rose-100/50 shadow-inner relative overflow-hidden group">
        <h4 className="text-rose-600 font-black text-xs uppercase tracking-[0.4em] mb-6 flex items-center">
          <div className="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center text-white mr-3 shadow-lg"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg></div>
          Nexus Recovery Technique
        </h4>
        
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white shadow-xl text-slate-800 text-xl font-semibold leading-relaxed">
          {data.exercise}
        </div>

        {(data.appointmentSuggested || data.crisisEscalation) && (
          <div className="mt-8 pt-6 border-t border-rose-200/30 flex flex-col sm:flex-row gap-4">
             <button 
              onClick={onBookAppointment}
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest py-5 rounded-2xl shadow-xl transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center space-x-3"
             >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span>Book Priority Consultation</span>
             </button>
             <button className="flex-1 bg-white border-2 border-rose-500 text-rose-600 font-black uppercase tracking-widest py-5 rounded-2xl hover:bg-rose-50 transition-all flex items-center justify-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                <span>Live Recovery Line</span>
             </button>
          </div>
        )}
      </div>

      {data.resourceLinks && data.resourceLinks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.resourceLinks.map((link, i) => (
            <a key={i} href={link.url} target="_blank" className="p-4 bg-white border border-rose-100 rounded-2xl flex items-center justify-between hover:shadow-lg transition-all group">
              <span className="text-sm font-bold text-rose-700">{link.title}</span>
              <svg className="w-4 h-4 text-rose-300 group-hover:text-rose-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </a>
          ))}
        </div>
      )}

      <div className="text-center py-6 opacity-30">
        <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-500">Zero Retention • Secure Vault Encryption Active</p>
      </div>
    </div>
  );
};
