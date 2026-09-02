const scheduleNotificationAsync = jest.fn(async () => 'notification-id');

function loadService(os: string) {
  jest.resetModules();
  jest.doMock('react-native', () => ({ Platform: { OS: os } }));
  jest.doMock('expo-notifications', () => ({
    AndroidImportance: { DEFAULT: 3 },
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(async () => undefined),
    getPermissionsAsync: jest.fn(async () => ({ granted: true })),
    requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
    scheduleNotificationAsync,
    cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  }));

  return require('./notifications');
}

beforeEach(() => {
  scheduleNotificationAsync.mockClear();
});

it('schedules a notification on native platforms', async () => {
  const { scheduleNotification } = loadService('ios');

  await expect(scheduleNotification({ title: 'Hi' })).resolves.toBe(
    'notification-id',
  );
  expect(scheduleNotificationAsync).toHaveBeenCalled();
});

it('is a no-op on web', async () => {
  const { scheduleNotification } = loadService('web');

  await expect(scheduleNotification({ title: 'Hi' })).resolves.toBeNull();
  expect(scheduleNotificationAsync).not.toHaveBeenCalled();
});
