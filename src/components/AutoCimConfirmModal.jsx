import { AlertTriangle, X } from 'lucide-react';

export default function AutoCimConfirmModal({ isOpen, onCancel, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              <AlertTriangle size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Enable Automatic CIM Release?
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p>
            When enabled, any buyer organization whose NDA reaches <strong>Executed</strong> status will immediately gain access to download your Confidential Information Memorandum (CIM) without a separate manual release step.
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            Note: If seller approval and/or seller countersignature are also turned off, buyers could unlock and download your CIM immediately upon signing.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Keep Manual Release
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold cursor-pointer"
          >
            Yes, Enable Auto-Release
          </button>
        </div>
      </div>
    </div>
  );
}
