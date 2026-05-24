import { useState } from 'react';
import { X } from 'lucide-react';

export default function TagInput({ 
  tags = [], 
  onChange, 
  placeholder = "Add tag...", 
  isInputHighlighted = false, 
  autoFilledTags = [],
  variant = "cloud" // "cloud" or "list"
}) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    // Add tag on Enter or Comma
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } 
  };

  const handleChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleBlur = () => {
    if (inputValue) {
      addTag(inputValue);
    }
  };

  const addTag = (text) => {
    const trimmedText = text.trim();
    if (trimmedText && !tags.includes(trimmedText)) {
      onChange([...tags, trimmedText]);
    }
    setInputValue('');
  };

  const removeTag = (indexToRemove) => {
    onChange(tags.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="space-y-3">
      <input
        type="text"
        className="form-input py-4 placeholder:text-xs focus:ring-2 focus:ring-offset-0 focus:ring-accent focus:outline-none transition-colors w-full"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
      />
      <div 
        className={`${variant === 'list' ? "flex flex-col gap-1" : "flex flex-wrap gap-2 items-start content-start"} min-h-[100px] p-1`}
      >
        {tags.map((tag, index) => {
          if (variant === 'list') {
            return (
              <div key={index} className="flex items-center justify-between group py-1 border-b border-slate-800/50 last:border-0 w-full">
                <span className="text-sm text-slate-700 font-medium">
                  {tag}
                </span>
                <button
                  type="button"
                  className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                  onClick={() => removeTag(index)}
                >
                  <X size={12} />
                </button>
              </div>
            );
          }

          return (
            <span 
              key={index} 
              className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-700 border border-indigo-500/20 rounded-lg text-sm font-semibold animate-fade-in transition-colors"
            >
              {tag}
              <button
                type="button"
                className="text-indigo-500 hover:text-indigo-700 hover:bg-indigo-500/20 transition-colors focus:outline-none rounded-full p-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(index);
                }}
              >
                <X size={14} />
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
