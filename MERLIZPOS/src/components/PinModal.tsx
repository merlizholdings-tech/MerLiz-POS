import React, { useState } from 'react';
import { ShieldAlert, KeyRound, X, Check } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const DEFAULT_PIN = '1234';

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() === DEFAULT_PIN) {
      setError('');
      setPin('');
      onConfirm();
    } else {
      setError('Incorrect Security PIN. Enter valid PIN to delete or reset data.');
    }
  };

  const handleClose = () => {
    setPin('');
    setError('');
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 no-print">
      <div className="bg-[#141419] border border-rose-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 text-rose-400 border-b border-[#282834] pb-3">
          <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h3 className="font-cinzel font-bold text-lg text-gray-100">{title}</h3>
            <p className="text-xs text-rose-300 font-medium">Security PIN Protection</p>
          </div>
        </div>

        <p className="text-xs text-gray-300 leading-relaxed">{description}</p>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div>
            <label className="text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Enter 4-Digit Security PIN (Default: 1234)</span>
            </label>
            <input
              type="password"
              maxLength={6}
              autoFocus
              required
              placeholder="Enter PIN..."
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError('');
              }}
              className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-center text-xl tracking-widest font-mono text-gray-100 px-4 py-2.5 rounded-xl focus:outline-none"
            />
            {error && <p className="text-xs text-rose-400 font-semibold mt-1.5">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#22222d]">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1e1e26] text-gray-300 hover:bg-[#282834]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Authorize & Delete</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
