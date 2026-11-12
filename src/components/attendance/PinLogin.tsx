import React, { useState, useEffect, useRef } from 'react';

interface PinLoginProps {
  teacherName: string;
  expectedPin: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export const PinLogin: React.FC<PinLoginProps> = ({
  teacherName,
  expectedPin,
  onSuccess,
  onCancel,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Focus input automatically on mount
  useEffect(() => {
    hiddenInputRef.current?.focus();
  }, [teacherName]);

  const verifyPin = (enteredPin: string) => {
    if (enteredPin === expectedPin) {
      setError(null);
      onSuccess();
    } else {
      setError('PIN incorrecto. Intenta nuevamente.');
      setPin('');
      hiddenInputRef.current?.focus();
    }
  };

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(null);
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      handleDigit(e.key);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      handleDelete();
    } else if (e.key === 'Escape') {
      handleClear();
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto my-3 sm:my-8 px-2 sm:px-4">
      {/* Hidden input for physical keyboard support */}
      <input
        ref={hiddenInputRef}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={pin}
        onChange={() => {}}
        onKeyDown={handleKeyDown}
        className="sr-only"
        aria-label="Ingresa PIN"
        autoFocus
      />

      <div
        onClick={() => hiddenInputRef.current?.focus()}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-4.5 sm:p-8 text-center transition-all"
      >
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4">
          <img
            src="/logo-team-bellas-artes.jpg"
            alt="Logo Team Bellas Artes"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-blue-500/30 shadow-md mx-auto"
          />
          <span className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 text-white text-[10px] sm:text-xs flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm">
            🔒
          </span>
        </div>

        <h2 className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
          Acceso Docente
        </h2>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4 sm:mb-6">
          Ingresa el PIN de seguridad de{' '}
          <span className="font-semibold text-blue-600 dark:text-blue-400 block sm:inline">
            {teacherName}
          </span>
        </p>

        {/* PIN Dots Visualizer */}
        <div className="flex justify-center gap-2.5 sm:gap-3.5 mb-4 sm:mb-6">
          {[0, 1, 2, 3].map((index) => {
            const hasDigit = index < pin.length;
            return (
              <div
                key={index}
                className={`w-10 h-12 sm:w-12 sm:h-14 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-bold border-2 transition-all duration-150 ${
                  hasDigit
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-sm scale-105'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-slate-300 dark:text-slate-600'
                }`}
              >
                {hasDigit ? '●' : '○'}
              </div>
            );
          })}
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 sm:mb-5 p-2.5 sm:p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 animate-bounce">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* On-screen Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 max-w-[280px] mx-auto mb-3 sm:mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDigit(d);
              }}
              className="min-h-[48px] sm:min-h-[54px] rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 active:bg-blue-100 dark:active:bg-slate-600 text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 text-lg sm:text-xl font-bold border border-slate-200 dark:border-slate-700 transition-all active:scale-95 cursor-pointer shadow-2xs touch-manipulation select-none flex items-center justify-center"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="min-h-[48px] sm:min-h-[54px] rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all active:scale-95 cursor-pointer touch-manipulation select-none flex items-center justify-center"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDigit('0');
            }}
            className="min-h-[48px] sm:min-h-[54px] rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 active:bg-blue-100 dark:active:bg-slate-600 text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 text-lg sm:text-xl font-bold border border-slate-200 dark:border-slate-700 transition-all active:scale-95 cursor-pointer shadow-2xs touch-manipulation select-none flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="min-h-[48px] sm:min-h-[54px] rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-base sm:text-lg font-semibold border border-slate-200 dark:border-slate-700 transition-all active:scale-95 cursor-pointer touch-manipulation select-none flex items-center justify-center"
            aria-label="Borrar último dígito"
          >
            ⌫
          </button>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            className="text-xs sm:text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition underline underline-offset-4 cursor-pointer mt-2 touch-manipulation min-h-[36px] inline-flex items-center"
          >
            Volver a selección de docente
          </button>
        )}
      </div>
    </div>
  );
};

export default PinLogin;
