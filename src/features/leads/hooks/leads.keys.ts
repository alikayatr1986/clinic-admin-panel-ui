export const leadsKeys = {
  all: ['leads'] as const,
  lists: ['leads', 'list'] as const,
  list: (identity: number) => ['leads', 'list', identity] as const,
  options: ['leads', 'options'] as const,
  detail: (id: string) => ['leads', 'detail', id] as const,
};
