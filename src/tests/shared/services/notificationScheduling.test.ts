type Permission = { granted: boolean };

function loadNotifications(
  os: string,
  current: Permission = { granted: true },
  requested: Permission = { granted: true },
) {
  const expo = {
    AndroidImportance: { DEFAULT: 3 },
    SchedulableTriggerInputTypes: { DATE: 'date' },
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(async () => undefined),
    getPermissionsAsync: jest.fn(async () => current),
    requestPermissionsAsync: jest.fn(async () => requested),
    scheduleNotificationAsync: jest.fn(async () => 'notification-id'),
    cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  };
  jest.resetModules();
  jest.doMock('react-native', () => ({ Platform: { OS: os } }));
  jest.doMock('expo-notifications', () => expo);

  return { service: require('shared/services/notifications'), expo };
}

describe('initNotifications', () => {
  it.each([
    ['android', 1],
    ['ios', 0],
    ['web', 0],
  ])('on %s creates %i channel', async (os, channels) => {
    const { service, expo } = loadNotifications(os);

    await service.initNotifications();

    expect(expo.setNotificationChannelAsync).toHaveBeenCalledTimes(channels);
  });

  it('shows what arrives while the app is open, without a badge', async () => {
    const { expo } = loadNotifications('ios');
    const [{ handleNotification }] = expo.setNotificationHandler.mock.calls[0];

    await expect(handleNotification()).resolves.toEqual({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    });
  });
});

describe('requestNotificationPermission', () => {
  it.each([
    ['does not ask again', true, true, true, 0],
    ['asks and is granted', false, true, true, 1],
    ['asks and is denied', false, false, false, 1],
  ])('%s', async (_case, current, requested, expected, asked) => {
    const { service, expo } = loadNotifications(
      'ios',
      { granted: current },
      { granted: requested },
    );

    await expect(service.requestNotificationPermission()).resolves.toBe(
      expected,
    );
    expect(expo.requestPermissionsAsync).toHaveBeenCalledTimes(asked);
  });

  it('is never granted on the web', async () => {
    const { service } = loadNotifications('web');

    await expect(service.requestNotificationPermission()).resolves.toBe(false);
  });
});

describe('scheduling', () => {
  const date = new Date('2026-10-20T13:00:00.000Z');

  it('leaves the delivery of a date to the system', async () => {
    const { service, expo } = loadNotifications('ios');

    await expect(
      service.scheduleNotificationAt({ title: 'Vence hoje' }, date),
    ).resolves.toBe('notification-id');
    expect(expo.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: { title: 'Vence hoje', body: undefined },
      trigger: { type: 'date', date },
    });
  });

  it('schedules nothing without permission or on the web', async () => {
    const denied = loadNotifications(
      'ios',
      { granted: false },
      { granted: false },
    );
    await expect(
      denied.service.scheduleNotificationAt({ title: 'x' }, date),
    ).resolves.toBeNull();
    await expect(
      denied.service.scheduleNotification({ title: 'x' }),
    ).resolves.toBeNull();
    expect(denied.expo.scheduleNotificationAsync).not.toHaveBeenCalled();

    const web = loadNotifications('web');
    await expect(
      web.service.scheduleNotificationAt({ title: 'x' }, date),
    ).resolves.toBeNull();
  });

  it('cancels by id, except on the web', async () => {
    const native = loadNotifications('ios');
    await native.service.cancelNotification('id-1');
    expect(native.expo.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'id-1',
    );

    const web = loadNotifications('web');
    await web.service.cancelNotification('id-1');
    expect(web.expo.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
});
