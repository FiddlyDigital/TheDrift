// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ChipGroup } from '../views/controls/ChipGroup.jsx';

afterEach(cleanup);

const OPTS = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
  { id: 'c', name: 'Gamma' },
];

describe('ChipGroup', () => {
  it('renders the label and one button per option', () => {
    render(<ChipGroup label="Pick" options={OPTS} getKey={(o) => o.id}
      isActive={() => false} onPick={() => {}} renderOption={(o) => o.name} />);
    expect(screen.getByText('Pick')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Alpha' })).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('marks only the active option', () => {
    render(<ChipGroup label="Pick" options={OPTS} getKey={(o) => o.id}
      isActive={(o) => o.id === 'b'} onPick={() => {}} renderOption={(o) => o.name} />);
    expect(screen.getByRole('button', { name: 'Alpha' }).className).not.toContain('active');
    expect(screen.getByRole('button', { name: 'Beta' }).className).toContain('active');
  });

  it('fires onPick with the clicked option', () => {
    const onPick = vi.fn();
    render(<ChipGroup label="Pick" options={OPTS} getKey={(o) => o.id}
      isActive={() => false} onPick={onPick} renderOption={(o) => o.name} />);
    fireEvent.click(screen.getByRole('button', { name: 'Gamma' }));
    expect(onPick).toHaveBeenCalledWith(OPTS[2]);
  });

  it('honors custom classes, titles and children', () => {
    const { container } = render(
      <ChipGroup label="Pick" options={OPTS} getKey={(o) => o.id}
        containerClass="moods tunings" buttonClass="tuning-opt" getTitle={(o) => 'tip-' + o.id}
        isActive={() => false} onPick={() => {}} renderOption={(o) => o.name}>
        <span className="bin-note">extra</span>
      </ChipGroup>
    );
    expect(container.querySelector('.moods.tunings')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Alpha' }).className).toContain('tuning-opt');
    expect(screen.getByRole('button', { name: 'Alpha' }).getAttribute('title')).toBe('tip-a');
    // children render inside the container, after the buttons
    expect(container.querySelector('.moods.tunings .bin-note')).toBeTruthy();
  });
});
