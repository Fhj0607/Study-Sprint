export type SubjectColor =
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'violet'
  | 'cyan'
  | 'rose'
  | 'slate';

export const SUBJECT_COLORS: Record<
  SubjectColor,
  { soft: string; strong: string; label: string }
> = {
  blue: {
    soft: '#DCEFF5',
    strong: '#2F6F88',
    label: 'Blue',
  },
  emerald: {
    soft: '#DDEFE5',
    strong: '#2F7D55',
    label: 'Emerald',
  },
  amber: {
    soft: '#F6E8C6',
    strong: '#9A6A16',
    label: 'Amber',
  },
  violet: {
    soft: '#E9E2F5',
    strong: '#6D4BA3',
    label: 'Violet',
  },
  cyan: {
    soft: '#DDF0EF',
    strong: '#287C7A',
    label: 'Cyan',
  },
  rose: {
    soft: '#F4E1DF',
    strong: '#9B4A43',
    label: 'Rose',
  },
  slate: {
    soft: '#E8E4DA',
    strong: '#52616B',
    label: 'Slate',
  },
};

export const SUBJECT_COLOR_KEYS = Object.keys(
  SUBJECT_COLORS
) as SubjectColor[];