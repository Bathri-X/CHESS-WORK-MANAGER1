import React, { useState } from 'react';
import { X, Lock, AlertTriangle } from 'lucide-react';
import { Batch } from '../types';

interface DeletePinModalProps {
  isOpen: boolean;
  batch: Batch | null;
  onClose: () => void;
  onConfirmDelete: (pin: string) => Promise<void>;
}

export const DeletePinModal: React.FC<DeletePinModalProps> = ({
  isOpen,
  batch,
  onClose,
  onConfirmDelete,
}) => {
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  if (!isOpen || !batch) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setErrorMsg('Please enter the security PIN.');
      return;
    }

    setErrorMsg('');
    setIsVerifying(true);

    try {
      // Passes PIN strictly to the backend for verification
      await onConfirmDelete(pin);
      setPin('');
      onClose();
    } catch (err: any) {
      // Backend returns: "Wrong credentials. Batch was not deleted."
      setErrorMsg(err?.message || 'Wrong credentials. Batch was not deleted.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setErrorMsg('');
    }
  };

  const handleKeypadBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  return (
    <div
      id="delete-pin-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
    >
      <div
        id="delete-pin-modal-container"
        className="w-full max-w-sm rounded-lg bg-white border border-slate-200 p-5 sm:p-6 shadow-2xl text-slate-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-red-50 text-red-600 border border-red-200">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Security PIN Required</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Batch detail preview */}
        <div className="mt-3 p-3 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
          <div className="font-bold text-slate-900 truncate">
            {batch.class_name} ({batch.start_time} – {batch.end_time})
          </div>
          <div className="text-slate-500 truncate">Topic: {batch.topic}</div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div
            id="delete-pin-error"
            className="mt-3 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-in fade-in"
          >
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">{errorMsg}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 text-center">
            Enter 4-Digit Deletion PIN
          </label>

          <input
            id="delete-pin-input"
            type="password"
            autoFocus
            maxLength={6}
            placeholder="••••"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setErrorMsg('');
            }}
            className="w-full text-center tracking-[0.6em] text-2xl font-mono py-2.5 rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white transition-colors"
          />

          {/* Quick On-Screen Touch Keypad */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num)}
                className="py-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold active:scale-95 transition-all cursor-pointer border border-slate-200"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin('')}
              className="py-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-semibold active:scale-95 transition-all cursor-pointer border border-slate-200"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="py-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold active:scale-95 transition-all cursor-pointer border border-slate-200"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleKeypadBackspace}
              className="py-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-semibold active:scale-95 transition-all cursor-pointer border border-slate-200"
            >
              ⌫
            </button>
          </div>

          {/* Buttons */}
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="confirm-delete-btn"
              type="submit"
              disabled={isVerifying || pin.length === 0}
              className="w-full py-2.5 rounded-md bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              {isVerifying ? 'Verifying...' : 'Delete Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
