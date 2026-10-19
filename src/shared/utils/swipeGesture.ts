/** Where a card should settle once the user lets go of a horizontal swipe. */
export type SwipeRelease = 'closed' | 'open' | 'delete';

/** Width of the delete action revealed behind the card, in points. */
export const ACTION_WIDTH = 88;

// Travel past which the action counts as revealed…
const OPEN_THRESHOLD = 40;
// …and past which the intent is unmistakably "delete".
const DELETE_THRESHOLD = 180;
// A quick flick settles the card without needing the full travel.
const FLICK_VELOCITY = 0.6;

/**
 * Decides what a swipe means from where the card ended up and how fast it was
 * moving. Kept separate from the view so the thresholds can be exercised
 * without simulating touches.
 *
 * @param translateX how far the card is offset; negative means swiped left.
 * @param velocityX horizontal velocity at release; negative means still moving left.
 */
export function resolveSwipeRelease(
  translateX: number,
  velocityX: number,
): SwipeRelease {
  // Flicked back towards the right: the user is putting the card away.
  if (velocityX >= FLICK_VELOCITY) {
    return 'closed';
  }

  const travel = -translateX;

  if (travel < OPEN_THRESHOLD) {
    return 'closed';
  }

  if (travel >= DELETE_THRESHOLD || velocityX <= -FLICK_VELOCITY) {
    return 'delete';
  }

  return 'open';
}
