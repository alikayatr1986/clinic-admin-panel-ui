import { Button } from '@/components/ui/button';
import type { BlogGuidedNavigationProps, BlogGuidedStep } from '../../types/blogs.types';

const steps: BlogGuidedStep[] = ['Start', 'Details', 'Content', 'Cover', 'Review and publish'];

export function BlogGuidedNavigation({ current, onSelect }: BlogGuidedNavigationProps) {
  const index = steps.indexOf(current);
  return (
    <nav aria-label="Article authoring steps" className="space-y-4">
      <ol className="flex flex-wrap gap-2">
        {steps.map((step, i) => (
          <li key={step}>
            <Button
              type="button"
              variant={i === index ? 'default' : 'outline'}
              size="sm"
              aria-current={i === index ? 'step' : undefined}
              disabled={!onSelect || step === 'Start'}
              onClick={() => onSelect?.(step)}
            >
              {i + 1}. {step} · {i === index ? 'Current' : step === 'Start' && onSelect ? 'Draft created' : 'Not assessed'}
            </Button>
          </li>
        ))}
      </ol>
      {onSelect && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={index <= 1} onClick={() => onSelect(steps[index - 1])}>Back</Button>
          <Button type="button" variant="outline" disabled={index === steps.length - 1} onClick={() => onSelect(steps[index + 1])}>Next</Button>
        </div>
      )}
    </nav>
  );
}
