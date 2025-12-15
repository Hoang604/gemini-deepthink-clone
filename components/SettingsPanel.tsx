import React from 'react';
import { Settings2, BrainCircuit, Zap, Thermometer } from 'lucide-react';
import { ModelConfig, GeminiModel, MIN_THINKING_BUDGET, MAX_THINKING_BUDGET, DEFAULT_THINKING_BUDGET } from '../types';

interface SettingsPanelProps {
  config: ModelConfig;
  onConfigChange: (newConfig: ModelConfig) => void;
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, onConfigChange, isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleThinkingToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({
      ...config,
      enableThinking: e.target.checked,
      model: e.target.checked ? GeminiModel.PRO_3_PREVIEW : config.model
    });
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({
      ...config,
      thinkingBudget: parseInt(e.target.value, 10)
    });
  };

  const handleModelChange = (model: string) => {
    onConfigChange({
      ...config,
      model: model,
      // If switching to Flash, disable thinking as it's not supported in this clone's logic context (though API might allow Lite, we restrict for clarity)
      enableThinking: model === GeminiModel.FLASH_2_5 ? false : config.enableThinking
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#1e1f20] border border-[#444746] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-[#444746]">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Settings2 size={24} className="text-[#a8c7fa]" />
            Model Configuration
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Model Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300 uppercase tracking-wide">Select Model</label>
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
                <span className="font-semibold text-sm">Gemini 3 Pro</span>
                <span className="text-xs opacity-70">Reasoning</span>
              </button>
              
              <button
                onClick={() => handleModelChange(GeminiModel.FLASH_2_5)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                  config.model === GeminiModel.FLASH_2_5
                    ? 'bg-[#004a77]/30 border-[#a8c7fa] text-[#a8c7fa]' 
                    : 'bg-[#282a2c] border-transparent text-gray-400 hover:bg-[#37393b]'
                }`}
              >
                <Zap size={24} className="mb-2" />
                <span className="font-semibold text-sm">Gemini 2.5 Flash</span>
                <span className="text-xs opacity-70">Speed</span>
              </button>
            </div>
          </div>

          {/* DeepThink Config */}
          <div className={`space-y-4 p-4 rounded-xl border transition-all duration-300 ${
            config.model === GeminiModel.PRO_3_PREVIEW ? 'border-[#444746] bg-[#282a2c]/50' : 'border-transparent opacity-50 pointer-events-none'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrainCircuit size={18} className="text-[#c2e7ff]" />
                <span className="font-medium">Enable DeepThink</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.enableThinking} 
                  onChange={handleThinkingToggle}
                  disabled={config.model !== GeminiModel.PRO_3_PREVIEW}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#a8c7fa]"></div>
              </label>
            </div>

            {config.enableThinking && (
              <div className="space-y-2 pt-2 animate-fadeIn">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Thinking Budget (Tokens)</span>
                  <span className="text-[#a8c7fa]">{config.thinkingBudget}</span>
                </div>
                <input
                  type="range"
                  min={MIN_THINKING_BUDGET}
                  max={MAX_THINKING_BUDGET}
                  step={1024}
                  value={config.thinkingBudget}
                  onChange={handleBudgetChange}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#a8c7fa]"
                />
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>{MIN_THINKING_BUDGET}</span>
                  <span>{MAX_THINKING_BUDGET}</span>
                </div>
              </div>
            )}
          </div>

          {/* Temperature */}
          <div className="space-y-2">
             <div className="flex items-center gap-2 text-sm text-gray-300">
                <Thermometer size={16} />
                <span>Creativity (Temperature): {config.temperature}</span>
             </div>
             <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature}
                onChange={(e) => onConfigChange({...config, temperature: parseFloat(e.target.value)})}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#a8c7fa]"
              />
          </div>

        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
