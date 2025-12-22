
import React from 'react';
import { Settings2, BrainCircuit, Zap, Thermometer, Activity, Gauge } from 'lucide-react';
import { ModelConfig, GeminiModel, AppStats } from '../types';

interface SettingsPanelProps {
  config: ModelConfig;
  onConfigChange: (newConfig: ModelConfig) => void;
  isOpen: boolean;
  onClose: () => void;
  stats: AppStats;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, onConfigChange, isOpen, onClose, stats }) => {
  if (!isOpen) return null;

  const handleLevelChange = (level: 'low' | 'medium' | 'high') => {
    onConfigChange({ ...config, thinkingLevel: level });
  };

  const handleModelChange = (model: string) => {
    onConfigChange({ ...config, model });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#1e1f20] border border-[#444746] rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-[#444746] flex-none">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Settings2 size={24} className="text-[#a8c7fa]" />
            System Control
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Model Selection</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleModelChange(GeminiModel.PRO_3_PREVIEW)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                  config.model === GeminiModel.PRO_3_PREVIEW 
                    ? 'bg-[#004a77]/30 border-[#a8c7fa] text-[#a8c7fa]' 
                    : 'bg-[#282a2c] border-transparent text-gray-400 hover:bg-[#37393b]'
                }`}
              >
                <BrainCircuit size={24} className="mb-2" />
                <span className="font-semibold text-sm">3 Pro</span>
                <span className="text-[10px] opacity-70">DeepThink Preview</span>
              </button>
              
              <button
                onClick={() => handleModelChange(GeminiModel.FLASH_3_PREVIEW)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                  config.model === GeminiModel.FLASH_3_PREVIEW
                    ? 'bg-[#004a77]/30 border-[#a8c7fa] text-[#a8c7fa]' 
                    : 'bg-[#282a2c] border-transparent text-gray-400 hover:bg-[#37393b]'
                }`}
              >
                <Zap size={24} className="mb-2" />
                <span className="font-semibold text-sm">3 Flash</span>
                <span className="text-[10px] opacity-70">Fast Reasoning</span>
              </button>
            </div>

            <div className="space-y-4 p-4 rounded-xl border border-[#444746] bg-[#282a2c]/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BrainCircuit size={18} className="text-[#c2e7ff]" />
                  <span className="font-medium text-[#c2e7ff]">Thinking Configuration</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Gauge size={14} />
                  <span>Reasoning Depth (Level)</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => handleLevelChange(level)}
                      className={`px-2 py-2 rounded-lg text-xs font-medium uppercase tracking-wide border transition-all ${
                        config.thinkingLevel === level
                          ? 'bg-[#a8c7fa] text-[#0b0c0c] border-[#a8c7fa]'
                          : 'bg-[#1e1f20] text-gray-400 border-[#444746] hover:border-gray-500'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Thermometer size={16} />
                  <span>Creativity: {config.temperature}</span>
              </div>
              <input
                  type="range" min="0" max="2" step="0.1"
                  value={config.temperature}
                  onChange={(e) => onConfigChange({...config, temperature: parseFloat(e.target.value)})}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#a8c7fa]"
                />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-[#444746]">
             <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
               <Activity size={14} />
               Trace History
             </h3>
             <div className="bg-[#131314] rounded-xl border border-[#444746] overflow-hidden">
               {stats.traces.length === 0 ? (
                 <div className="p-4 text-center text-xs text-gray-500">No telemetry recorded.</div>
               ) : (
                 <div className="max-h-40 overflow-y-auto">
                   <table className="w-full text-left text-[10px]">
                     <thead className="bg-[#282a2c] text-gray-400 sticky top-0">
                       <tr>
                         <th className="p-2">Time</th>
                         <th className="p-2">Model</th>
                         <th className="p-2 text-right">Latency</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-[#444746]">
                       {stats.traces.map((trace) => (
                         <tr key={trace.id} className="hover:bg-[#1e1f20]">
                           <td className="p-2 text-gray-400">{new Date(trace.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit' })}</td>
                           <td className="p-2">
                             <span className={`px-1.5 py-0.5 rounded ${trace.model.includes('pro') ? 'bg-blue-900/30 text-blue-300' : 'bg-teal-900/30 text-teal-300'}`}>
                               {trace.model.includes('pro') ? '3 Pro' : '3 Flash'}
                             </span>
                           </td>
                           <td className="p-2 text-right font-mono">{trace.durationMs}ms</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
