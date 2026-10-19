import { resolveSwipeRelease } from 'shared/utils/swipeGesture';

const STILL = 0;

describe('resolveSwipeRelease', () => {
  it('stays closed when the card barely moved', () => {
    expect(resolveSwipeRelease(-10, STILL)).toBe('closed');
  });

  it('opens once the action is revealed', () => {
    expect(resolveSwipeRelease(-88, STILL)).toBe('open');
  });

  it('deletes when dragged well past the action', () => {
    expect(resolveSwipeRelease(-200, STILL)).toBe('delete');
  });

  it('deletes on a quick flick to the left, without the full travel', () => {
    expect(resolveSwipeRelease(-60, -1.4)).toBe('delete');
  });

  it('closes on a flick back to the right, even while still open', () => {
    expect(resolveSwipeRelease(-88, 1.4)).toBe('closed');
  });

  it('ignores a swipe to the right', () => {
    expect(resolveSwipeRelease(40, STILL)).toBe('closed');
  });

  it('does not delete on a slow drag that only reveals the action', () => {
    expect(resolveSwipeRelease(-90, -0.2)).toBe('open');
  });
});
