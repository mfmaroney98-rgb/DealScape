import { useState } from 'react';
import { X } from 'lucide-react';

export default function TagInput({ tags = [], onChange, placeholder = "Add tag...", isInputHighlighted = false, autoFilledTags = [] }) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    // Add tag on Enter or Comma
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } 
    // Delete previous tag on backspace if input is empty
    else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handleChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleBlur = () => {
    // Optionally add the tag when input loses focus
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
        className={`form-input focus:ring-2 focus:ring-offset-0 focus:outline-none ${isInputHighlighted ? 'form-input-highlight' : 'focus:ring-indigo-500'} transition-colors`}
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          {tags.map((tag, index) => {
            const isTagHighlighted = autoFilledTags.includes(tag);
            return (
              <span 
                key={index} 
                className={`flex items-center gap-1.5 px-3 py-1 ${isTagHighlighted ? 'tag-highlight' : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'} rounded-lg text-sm font-medium border animate-fade-in transition-colors`}
              >
                {tag}
                <button
                  type="button"
                  className={`${isTagHighlighted ? 'tag-highlight-button' : 'text-indigo-400 hover:text-indigo-200 hover:bg-indigo-500/20'} transition-colors focus:outline-none rounded-full p-0.5`}
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
      )}
    </div>
  );
}
