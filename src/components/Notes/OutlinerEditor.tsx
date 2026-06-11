'use client';

import { useRef, useCallback, KeyboardEvent } from 'react';
import { OutlinerItem } from '@/types';

function newItem(level = 0): OutlinerItem {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    text: '',
    level,
  };
}

interface Props {
  items: OutlinerItem[];
  onChange: (items: OutlinerItem[]) => void;
  readOnly?: boolean;
  placeholder?: string;
}

export function OutlinerEditor({ items, onChange, readOnly, placeholder }: Props) {
  const refs = useRef<(HTMLTextAreaElement | null)[]>([]);

  const focusAt = (index: number, pos: 'start' | 'end' | number = 'end') => {
    setTimeout(() => {
      const el = refs.current[index];
      if (!el) return;
      el.focus();
      const p = pos === 'end' ? el.value.length : pos === 'start' ? 0 : (pos as number);
      el.setSelectionRange(p, p);
    }, 0);
  };

  const update = (index: number, text: string) => {
    const next = [...items];
    next[index] = { ...next[index], text };
    onChange(next);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    const item = items[index];
    const el = e.currentTarget;
    const { selectionStart, selectionEnd } = el;
    const atStart = selectionStart === 0 && selectionEnd === 0;
    const atEnd = selectionStart === el.value.length && selectionEnd === el.value.length;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const textBefore = item.text.slice(0, selectionStart);
      const textAfter = item.text.slice(selectionStart);
      const next = [...items];
      next[index] = { ...item, text: textBefore };
      next.splice(index + 1, 0, { ...newItem(item.level), text: textAfter });
      onChange(next);
      focusAt(index + 1, 'start');
    } else if (e.key === 'Backspace' && atStart && item.text === '') {
      e.preventDefault();
      if (items.length === 1) return;
      const next = [...items];
      next.splice(index, 1);
      onChange(next);
      focusAt(Math.max(0, index - 1), 'end');
    } else if (e.key === 'Backspace' && atStart && index > 0) {
      e.preventDefault();
      const prev = items[index - 1];
      const prevLen = prev.text.length;
      const next = [...items];
      next[index - 1] = { ...prev, text: prev.text + item.text };
      next.splice(index, 1);
      onChange(next);
      focusAt(index - 1, prevLen);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const next = [...items];
      next[index] = {
        ...item,
        level: e.shiftKey ? Math.max(0, item.level - 1) : Math.min(6, item.level + 1),
      };
      onChange(next);
    } else if (e.key === 'ArrowUp' && atStart && index > 0) {
      e.preventDefault();
      focusAt(index - 1, 'end');
    } else if (e.key === 'ArrowDown' && atEnd && index < items.length - 1) {
      e.preventDefault();
      focusAt(index + 1, 'start');
    }
  }, [items, onChange]);

  const list = items.length === 0 ? [newItem()] : items;

  return (
    <div className="space-y-0.5">
      {list.map((item, index) => (
        <div
          key={item.id}
          className="flex items-start gap-1.5"
          style={{ paddingLeft: `${item.level * 18}px` }}
        >
          <span className="mt-[5px] text-slate-600 text-[10px] flex-shrink-0 select-none">●</span>
          <textarea
            ref={el => { refs.current[index] = el; }}
            value={item.text}
            onChange={e => update(index, e.target.value)}
            onKeyDown={e => !readOnly && handleKeyDown(e, index)}
            readOnly={readOnly}
            rows={1}
            placeholder={index === 0 && !item.text ? (placeholder ?? 'Start typing...') : ''}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 resize-none outline-none leading-6 py-0 min-h-[24px] overflow-hidden"
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = '0';
              el.style.height = `${el.scrollHeight}px`;
            }}
            onFocus={e => {
              const el = e.currentTarget;
              el.style.height = '0';
              el.style.height = `${el.scrollHeight}px`;
            }}
          />
        </div>
      ))}
    </div>
  );
}
